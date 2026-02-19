import fs from 'fs/promises'
import path from 'path'
import shapefile from 'shapefile'
import { simplify } from '@turf/turf'

const inputRoot = path.resolve('..', 'maps')
const outputRoot = path.resolve('..', 'maps_geojson')

const adminLevels = {
  'Country level boundary': 'country',
  'Province level boundary': 'province',
  'District level boundary': 'district',
  'Sector level boundary': 'sector',
  'Cell level boundary': 'cell',
  'Village level boundary': 'village'
}

const args = process.argv.slice(2)
const options = {
  upload: args.includes('--upload'),
  projectId: valueFor('--project-id'),
  api: valueFor('--api') || process.env.GEO_SMART_API || 'http://localhost:8080',
  token: valueFor('--token') || process.env.GEO_SMART_TOKEN || '',
  simplify: !args.includes('--no-simplify'),
  tolerance: Number(valueFor('--tolerance') || process.env.GEO_SMART_TOLERANCE || 0.0005),
  highQuality: args.includes('--high-quality')
}

function valueFor(flag) {
  const index = args.indexOf(flag)
  if (index === -1 || index === args.length - 1) return ''
  return args[index + 1]
}

async function findShapefiles(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      return findShapefiles(fullPath)
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.shp')) {
      return [fullPath]
    }
    return []
  }))
  return files.flat()
}

function tagFeature(feature, adminLevel) {
  const properties = feature.properties || {}
  return {
    ...feature,
    properties: {
      ...properties,
      type: properties.type || 'admin_boundary',
      admin_level: properties.admin_level || adminLevel
    }
  }
}

function simplifyCollection(collection) {
  if (!options.simplify) {
    return collection
  }
  return simplify(collection, {
    tolerance: options.tolerance,
    highQuality: options.highQuality,
    mutate: false
  })
}

async function writeGeoJson(collection, outDir, fileName) {
  await fs.mkdir(outDir, { recursive: true })
  const outPath = path.join(outDir, fileName)
  await fs.writeFile(outPath, JSON.stringify(collection))
  return outPath
}

async function convertShapefile(shpPath) {
  const folderName = path.basename(path.dirname(shpPath))
  const adminLevel = adminLevels[folderName] || 'admin'
  const outDir = path.join(outputRoot, folderName)
  const rawDir = path.join(outDir, 'raw')
  const simplifiedDir = path.join(outDir, 'simplified')

  const collection = await shapefile.read(shpPath)
  const features = collection.features.map((feature) => tagFeature(feature, adminLevel))
  const tagged = { ...collection, features }

  const outName = `${path.basename(shpPath, '.shp')}.geojson`
  const rawPath = await writeGeoJson(tagged, rawDir, outName)
  let simplifiedPath = null

  if (options.simplify) {
    const simplified = simplifyCollection(tagged)
    simplifiedPath = await writeGeoJson(simplified, simplifiedDir, outName)
  }

  return { rawPath, simplifiedPath, adminLevel }
}

async function uploadDataset(filePath, adminLevel) {
  if (!options.upload) return
  if (!options.projectId || !options.token) {
    console.warn('Upload skipped: missing --project-id or token. Set GEO_SMART_TOKEN or use --token.')
    return
  }
  if (!globalThis.fetch) {
    console.warn('Upload skipped: fetch is not available. Use Node 18+.')
    return
  }

  const body = await fs.readFile(filePath, 'utf8')
  const datasetName = `${path.basename(filePath, '.geojson')} (${adminLevel})`
  const response = await fetch(`${options.api}/api/projects/${options.projectId}/datasets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${options.token}`
    },
    body: JSON.stringify({
      name: datasetName,
      type: 'ADMIN_BOUNDARY',
      geoJson: body
    })
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Upload failed: ${response.status} ${text}`)
  }
  console.log(`Uploaded: ${datasetName}`)
}

async function main() {
  try {
    await fs.access(inputRoot)
  } catch {
    console.error(`Input folder not found: ${inputRoot}`)
    process.exit(1)
  }

  const shapefiles = await findShapefiles(inputRoot)
  if (!shapefiles.length) {
    console.error('No .shp files found under maps/')
    process.exit(1)
  }

  console.log(`Found ${shapefiles.length} shapefiles. Converting...`)
  console.log(`Simplify: ${options.simplify ? 'yes' : 'no'} (tolerance=${options.tolerance})`)
  for (const shp of shapefiles) {
    try {
      const result = await convertShapefile(shp)
      console.log(`Converted: ${shp} -> ${result.rawPath}`)
      if (result.simplifiedPath) {
        console.log(`Simplified: ${result.simplifiedPath}`)
        await uploadDataset(result.simplifiedPath, result.adminLevel)
      } else {
        await uploadDataset(result.rawPath, result.adminLevel)
      }
    } catch (error) {
      console.error(`Failed to convert ${shp}: ${error.message}`)
    }
  }
  console.log('Conversion complete.')
}

main()
