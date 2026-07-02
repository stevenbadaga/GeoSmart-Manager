import React, { useEffect, useMemo, useState } from 'react'
import * as turf from '@turf/turf'
import { useLocation } from 'react-router-dom'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import GeoJsonMap from '../components/GeoJsonMap'
import { API_URL, api } from '../api/http'

const DEFAULT_LAYER_STATE = {
  PARCELS: true,
  ZONING: true,
  ADMIN_BOUNDARIES: false,
  BUILDING_FOOTPRINTS: true,
  CONSTRAINTS: true
}

const LAYER_STYLE = {
  ZONING: { color: '#8B5E34', weight: 2, fillOpacity: 0.08, dashArray: '5' },
  ADMIN_BOUNDARIES: { color: '#264653', weight: 2, fillOpacity: 0.02, dashArray: '7' },
  BUILDING_FOOTPRINTS: { color: '#6D6875', weight: 1.5, fillOpacity: 0.24 },
  CONSTRAINTS: { color: '#BC4749', weight: 2, fillOpacity: 0.16, dashArray: '4' },
  proposal_preview: { color: '#2563EB', weight: 3, fillOpacity: 0.18 }
}

const LAYER_LABELS = {
  PARCELS: 'Parent parcel',
  ZONING: 'Masterplan zoning',
  ADMIN_BOUNDARIES: 'Administrative boundaries',
  BUILDING_FOOTPRINTS: 'Building footprints',
  CONSTRAINTS: 'Restricted / constraint zones'
}

const LEGEND_ITEMS = [
  {
    label: 'Parent parcel',
    description: 'Selected parcel boundary and area used for compliance checks.',
    className: 'border-[#1F6F5F] bg-[#1F6F5F]/20'
  },
  {
    label: 'Proposed plots',
    description: 'Subdivision polygons drawn by the user or loaded from GeoJSON.',
    className: 'border-[#3B82F6] bg-[#3B82F6]/20'
  },
  {
    label: 'Masterplan zoning',
    description: 'Kigali Masterplan land-use zones intersecting the parcel.',
    className: 'border-[#8B5E34] bg-[#8B5E34]/15 border-dashed'
  },
  {
    label: 'Buildings',
    description: 'Existing building footprints used to detect split structures.',
    className: 'border-[#6D6875] bg-[#6D6875]/25'
  },
  {
    label: 'Constraints',
    description: 'Restricted areas, buffers, slopes, utilities, transport, or protected zones.',
    className: 'border-[#BC4749] bg-[#BC4749]/20 border-dashed'
  }
]

const RESULT_LEGEND = [
  { label: 'PASS', description: 'No issue detected for this check.', className: 'bg-success/10 text-success' },
  { label: 'WARN', description: 'Can proceed only with professional review.', className: 'bg-warning/15 text-warning' },
  { label: 'FAIL', description: 'Proposal is not recommended until corrected.', className: 'bg-danger/10 text-danger' }
]

const LAND_USE_OPTIONS = [
  { value: '', label: 'Not specified' },
  { value: 'Single family houses', label: 'Single family residential' },
  { value: 'Row housing', label: 'Row housing' },
  { value: 'Apartments', label: 'Apartments' },
  { value: 'Commercial', label: 'Commercial / mixed use' },
  { value: 'Agriculture', label: 'Agriculture' },
  { value: 'Public facility', label: 'Public facility' },
  { value: 'Industrial uses', label: 'Industrial use' }
]

const LAND_USE_KEYWORDS = {
  'Single family houses': ['single family', 'detached house', 'detached residential'],
  'Row housing': ['row housing', 'townhouse', 'town house'],
  Apartments: ['apartment', 'multi family', 'multifamily'],
  Commercial: ['commercial', 'mixed use', 'retail', 'office'],
  Agriculture: ['agriculture', 'livestock', 'farming'],
  'Public facility': ['public facility', 'community facility', 'school', 'health'],
  'Industrial uses': ['industrial', 'manufacturing', 'warehouse']
}

const SUGGESTED_PLOT_COUNTS = Array.from({ length: 10 }, (_, index) => index + 1)

function normalizeUpi(value) {
  return String(value || '').trim().toUpperCase()
}

function parseGeoJson(value) {
  if (!value) return null
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }
  return value
}

function toFeatureCollection(value) {
  const parsed = parseGeoJson(value)
  if (!parsed) return null
  if (parsed.type === 'FeatureCollection') return parsed
  if (parsed.type === 'Feature') {
    return { type: 'FeatureCollection', features: [parsed] }
  }
  return null
}

function classifyProposal(value) {
  const proposal = toFeatureCollection(value)
  if (!proposal) {
    return { proposal: null, plots: [], error: 'Provide GeoJSON or draw polygon plots on the map.' }
  }

  const plots = (proposal.features || []).filter((feature) => {
    const type = feature?.geometry?.type || ''
    return type === 'Polygon' || type === 'MultiPolygon'
  })

  if (!plots.length) {
    return { proposal, plots: [], error: 'At least one polygon plot is required.' }
  }

  return { proposal, plots, error: '' }
}

function formatArea(value) {
  if (!Number.isFinite(value)) return '--'
  return `${Math.round(value).toLocaleString()} sqm`
}

function featureCollection(features) {
  return { type: 'FeatureCollection', features }
}

function parcelFeature(parcel) {
  const parsed = parseGeoJson(parcel?.geometryGeoJson)
  const geometry = parsed?.type === 'Feature' ? parsed.geometry : parsed
  if (!geometry) return null
  if (geometry.type === 'FeatureCollection') {
    const polygonFeature = geometry.features?.find((feature) => {
      const type = feature?.geometry?.type
      return type === 'Polygon' || type === 'MultiPolygon'
    })
    return polygonFeature || null
  }
  if (geometry.type !== 'Polygon' && geometry.type !== 'MultiPolygon') {
    return null
  }
  return { type: 'Feature', properties: { upi: parcel.upi }, geometry }
}

function overlayPolygonFeatures(context, layerKeys) {
  return (context?.overlays || [])
    .filter((overlay) => layerKeys.includes(overlay.layerKey))
    .flatMap((overlay) => {
      const collection = parseGeoJson(overlay.geoJson)
      return (collection?.features || []).filter((feature) => {
        const type = feature?.geometry?.type
        return type === 'Polygon' || type === 'MultiPolygon'
      })
    })
}

function strictestMaxLotSize(zoning) {
  const limits = (zoning || [])
    .map((zone) => zone?.rule?.maximumLotSizeSqm)
    .filter((value) => Number.isFinite(value) && value > 0)
  return limits.length ? Math.min(...limits) : null
}

function strictestMinLotSize(zoning) {
  const limits = (zoning || [])
    .map((zone) => zone?.rule?.minimumLotSizeSqm)
    .filter((value) => Number.isFinite(value) && value > 0)
  return limits.length ? Math.max(...limits) : null
}

function polygonFeaturesFromValue(value) {
  const parsed = parseGeoJson(value)
  if (!parsed) return []

  const source = parsed.type === 'FeatureCollection'
    ? parsed.features || []
    : parsed.type === 'Feature'
      ? [parsed]
      : [{ type: 'Feature', properties: {}, geometry: parsed }]

  return source.flatMap((feature) => {
    const type = feature?.geometry?.type
    if (type !== 'Polygon' && type !== 'MultiPolygon') return []
    try {
      return turf.flatten(feature).features.map((item) => ({
        ...item,
        properties: { ...(feature.properties || {}), ...(item.properties || {}) }
      }))
    } catch {
      return [{
        type: 'Feature',
        properties: { ...(feature.properties || {}) },
        geometry: feature.geometry
      }]
    }
  })
}

function featureAreaSqm(feature) {
  try {
    return turf.area(feature)
  } catch {
    return 0
  }
}

function safeBooleanIntersects(left, right) {
  if (!left || !right) return false
  try {
    return turf.booleanIntersects(left, right)
  } catch {
    return false
  }
}

function safeIntersectPolygon(left, right, properties = {}) {
  if (!left || !right || !safeBooleanIntersects(left, right)) return null
  try {
    const cleanedLeft = turf.cleanCoords(left)
    const cleanedRight = turf.cleanCoords(right)
    const intersected = turf.intersect(turf.featureCollection([cleanedLeft, cleanedRight]))
    const polygons = polygonFeaturesFromValue(intersected)
    if (!polygons.length) return null
    const combined = polygons.length === 1
      ? polygons[0]
      : turf.combine(turf.featureCollection(polygons)).features?.[0]
    if (!combined) return null
    return {
      ...combined,
      properties: { ...(combined.properties || {}), ...properties }
    }
  } catch {
    return null
  }
}

function safeDifferencePolygon(base, mask) {
  if (!base) return null
  if (!mask || !safeBooleanIntersects(base, mask)) return base
  try {
    const cleanedBase = turf.cleanCoords(base)
    const cleanedMask = turf.cleanCoords(mask)
    const difference = turf.difference(turf.featureCollection([cleanedBase, cleanedMask]))
    return difference || null
  } catch {
    return base
  }
}

function safeUnionPolygons(features, properties = {}) {
  const polygons = features.flatMap((feature) => polygonFeaturesFromValue(feature))
  if (!polygons.length) return null

  let merged = polygons[0]
  for (const feature of polygons.slice(1)) {
    try {
      merged = turf.union(turf.featureCollection([merged, feature])) || merged
    } catch {
      const combined = turf.combine(turf.featureCollection([merged, feature])).features?.[0]
      merged = combined || merged
    }
  }

  return merged
    ? {
      ...merged,
      properties: { ...(merged.properties || {}), ...properties }
    }
    : null
}

function safeInteriorPoint(feature) {
  if (!feature) return null
  try {
    return turf.pointOnFeature(feature)
  } catch {
    try {
      return turf.center(feature)
    } catch {
      return null
    }
  }
}

function expandBbox(bbox, factor = 0.08) {
  const [minX, minY, maxX, maxY] = bbox
  const width = Math.max(maxX - minX, 0.00001)
  const height = Math.max(maxY - minY, 0.00001)
  return [
    minX - width * factor,
    minY - height * factor,
    maxX + width * factor,
    maxY + height * factor
  ]
}

function safeBuffer(feature, radiusMeters) {
  if (!feature || !Number.isFinite(radiusMeters) || radiusMeters <= 0) return null
  try {
    return turf.buffer(feature, radiusMeters, { units: 'meters' })
  } catch {
    return null
  }
}

function subtractPolygonMasks(baseFeatures, maskFeatures, minimumAreaSqm = 8) {
  let regions = baseFeatures
    .flatMap((feature) => polygonFeaturesFromValue(feature))
    .filter((feature) => featureAreaSqm(feature) > minimumAreaSqm)

  for (const mask of maskFeatures.flatMap((feature) => polygonFeaturesFromValue(feature))) {
    const nextRegions = []
    for (const region of regions) {
      if (!safeBooleanIntersects(region, mask)) {
        nextRegions.push(region)
        continue
      }
      const difference = safeDifferencePolygon(region, mask)
      nextRegions.push(
        ...polygonFeaturesFromValue(difference).filter((feature) => featureAreaSqm(feature) > minimumAreaSqm)
      )
    }
    regions = nextRegions
  }

  return regions.filter((feature) => featureAreaSqm(feature) > minimumAreaSqm)
}

function isRoadLikeFeature(feature) {
  const type = feature?.geometry?.type || ''
  if (['LineString', 'MultiLineString', 'Polygon', 'MultiPolygon'].includes(type)) {
    return true
  }
  const text = normalizedText([
    feature?.properties?.layerKey,
    feature?.properties?.name,
    feature?.properties?.type,
    feature?.properties?.category
  ].filter(Boolean).join(' '))
  return text.includes('road') || text.includes('street') || text.includes('transport')
}

function roadFrontageFeatures(context, parcel = null) {
  const parcelBounds = parcel ? turf.bboxPolygon(expandBbox(turf.bbox(parcel), 0.2)) : null

  return (context?.overlays || [])
    .filter((overlay) => {
      const key = String(overlay?.layerKey || '').toUpperCase()
      return key.includes('ROAD') || key.includes('TRANSPORT')
    })
    .flatMap((overlay) => {
      const parsed = parseGeoJson(overlay.geoJson)
      const features = parsed?.type === 'FeatureCollection'
        ? parsed.features || []
        : parsed?.type === 'Feature'
          ? [parsed]
          : []
      return features
        .filter((feature) => isRoadLikeFeature(feature))
        .filter((feature) => {
          if (!parcelBounds) return true
          return safeBooleanIntersects(feature, parcelBounds)
            || safeBooleanIntersects(safeBuffer(feature, 4), parcel)
        })
        .map((feature) => ({
          ...feature,
          properties: { ...(feature.properties || {}), layerKey: overlay.layerKey }
        }))
    })
}

function distanceToNearestRoad(point, roadFeatures) {
  if (!point || !roadFeatures.length) return Number.POSITIVE_INFINITY

  let nearest = Number.POSITIVE_INFINITY
  for (const road of roadFeatures) {
    try {
      if (safeBooleanIntersects(point, road)) return 0
      const type = road?.geometry?.type || ''
      const distance = type === 'Polygon' || type === 'MultiPolygon'
        ? turf.distance(point, safeInteriorPoint(road), { units: 'meters' })
        : turf.pointToLineDistance(point, road, { units: 'meters' })
      if (Number.isFinite(distance)) {
        nearest = Math.min(nearest, distance)
      }
    } catch {
      // Ignore malformed frontage features and continue scoring the rest.
    }
  }

  return nearest
}

function regionTouchesRoad(region, roadFeatures) {
  if (!roadFeatures.length) return false
  const buffered = safeBuffer(region, 1.5)
  return roadFeatures.some((road) => safeBooleanIntersects(region, road) || safeBooleanIntersects(buffered, road))
}

function allocateRegionPlotCounts(regions, requestedCount, minimumPlotSizeSqm, roadFeatures = []) {
  const regionStats = regions.map((region) => {
    const areaSqm = featureAreaSqm(region)
    const touchesRoad = regionTouchesRoad(region, roadFeatures)
    const capacity = Number.isFinite(minimumPlotSizeSqm) && minimumPlotSizeSqm > 0
      ? Math.max(0, Math.floor(areaSqm / minimumPlotSizeSqm))
      : Math.max(1, requestedCount)
    return {
      areaSqm,
      capacity,
      touchesRoad,
      weight: areaSqm * (touchesRoad ? 1.18 : 1)
    }
  })

  if (!regionStats.some((region) => region.capacity > 0) && regionStats.length) {
    const largestIndex = regionStats.reduce((bestIndex, region, index) => (
      region.areaSqm > regionStats[bestIndex].areaSqm ? index : bestIndex
    ), 0)
    regionStats[largestIndex].capacity = 1
  }

  const allocations = regions.map(() => 0)
  for (let step = 0; step < requestedCount; step += 1) {
    let bestIndex = -1
    let bestScore = -Infinity

    regionStats.forEach((region, index) => {
      if (allocations[index] >= region.capacity) return
      const score = region.weight / (allocations[index] + 1)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    if (bestIndex === -1) break
    allocations[bestIndex] += 1
  }

  return { allocations, regions: regionStats }
}

function candidateSeedPoints(region, targetCount) {
  const candidates = []
  const seen = new Set()
  const bbox = turf.bbox(region)
  const columns = Math.max(4, Math.ceil(Math.sqrt(targetCount * 10)))
  const rows = Math.max(4, Math.ceil(Math.sqrt(targetCount * 10)))

  const pushPoint = (point) => {
    if (!point) return
    const [x, y] = point.geometry.coordinates
    const key = `${x.toFixed(7)}:${y.toFixed(7)}`
    if (seen.has(key)) return
    try {
      if (!turf.booleanPointInPolygon(point, region, { ignoreBoundary: false })) return
      seen.add(key)
      candidates.push(point)
    } catch {
      // Ignore candidate points that cannot be tested reliably.
    }
  }

  pushPoint(safeInteriorPoint(region))
  try {
    pushPoint(turf.centerOfMass(region))
  } catch {
    // Ignore center-of-mass failures on malformed geometries.
  }

  const width = bbox[2] - bbox[0]
  const height = bbox[3] - bbox[1]
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const point = turf.point([
        bbox[0] + ((column + 0.5) / columns) * width,
        bbox[1] + ((row + 0.5) / rows) * height
      ])
      pushPoint(point)
    }
  }

  return candidates
}

function selectSeedPoints(region, count, roadFeatures = []) {
  const candidates = candidateSeedPoints(region, count)
  if (!candidates.length) {
    return [safeInteriorPoint(region)].filter(Boolean)
  }
  if (candidates.length <= count) return candidates

  const selected = []
  const remaining = [...candidates]

  let firstIndex = 0
  if (roadFeatures.length) {
    remaining.forEach((candidate, index) => {
      const distance = distanceToNearestRoad(candidate, roadFeatures)
      const bestDistance = distanceToNearestRoad(remaining[firstIndex], roadFeatures)
      if (distance < bestDistance) {
        firstIndex = index
      }
    })
  }
  selected.push(remaining.splice(firstIndex, 1)[0])

  while (selected.length < count && remaining.length) {
    let bestIndex = 0
    let bestScore = -Infinity

    remaining.forEach((candidate, index) => {
      const spacingScore = selected.reduce((minimumDistance, chosen) => (
        Math.min(minimumDistance, turf.distance(candidate, chosen, { units: 'meters' }))
      ), Number.POSITIVE_INFINITY)
      const roadDistance = distanceToNearestRoad(candidate, roadFeatures)
      const roadPenalty = roadFeatures.length
        ? roadDistance * (selected.length < Math.ceil(count / 2) ? 0.3 : 0.12)
        : 0
      const score = spacingScore - roadPenalty
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    selected.push(remaining.splice(bestIndex, 1)[0])
  }

  return selected
}

function clippedVoronoiCells(region, seeds, minimumAreaSqm) {
  if (seeds.length <= 1) return [region]

  try {
    const voronoi = turf.voronoi(turf.featureCollection(seeds), {
      bbox: expandBbox(turf.bbox(region), 0.25)
    })
    if (!voronoi?.features?.length) return [region]

    const remainingCells = [...voronoi.features]
    const clipped = seeds
      .map((seed, index) => {
        const cellIndex = remainingCells.findIndex((cell) => safeBooleanIntersects(seed, cell))
        const fallbackIndex = cellIndex >= 0 ? cellIndex : 0
        const cell = remainingCells.splice(fallbackIndex, 1)[0]
        const clippedCell = safeIntersectPolygon(region, cell, { seedIndex: index })
        return clippedCell && featureAreaSqm(clippedCell) > minimumAreaSqm ? clippedCell : null
      })
      .filter(Boolean)

    return clipped.length ? clipped : [region]
  } catch {
    return [region]
  }
}

function normalizeSplitAngle(angle) {
  let value = Number(angle) || 0
  while (value < 0) value += 180
  while (value >= 180) value -= 180
  return Math.round(value * 10) / 10
}

function featureLengthMeters(feature) {
  if (!feature) return 0
  try {
    const type = feature?.geometry?.type || ''
    if (type === 'LineString' || type === 'MultiLineString') {
      return turf.length(feature, { units: 'meters' })
    }
    if (type === 'Polygon' || type === 'MultiPolygon') {
      return featurePerimeterMeters(feature)
    }
  } catch {
    return 0
  }
  return 0
}

function roadBearingAngle(feature) {
  const type = feature?.geometry?.type || ''
  try {
    if (type === 'LineString') {
      const coordinates = feature.geometry.coordinates || []
      if (coordinates.length < 2) return null
      return normalizeSplitAngle(
        turf.bearing(turf.point(coordinates[0]), turf.point(coordinates[coordinates.length - 1]))
      )
    }
    if (type === 'MultiLineString') {
      const segments = feature.geometry.coordinates || []
      const longest = [...segments].sort((left, right) => right.length - left.length)[0]
      if (!longest || longest.length < 2) return null
      return normalizeSplitAngle(
        turf.bearing(turf.point(longest[0]), turf.point(longest[longest.length - 1]))
      )
    }
  } catch {
    return null
  }
  return null
}

function featureBBoxAspectRatio(feature) {
  if (!feature) return Number.POSITIVE_INFINITY
  try {
    const [minX, minY, maxX, maxY] = turf.bbox(feature)
    const width = Math.max(maxX - minX, 0.0000001)
    const height = Math.max(maxY - minY, 0.0000001)
    return Math.max(width, height) / Math.max(Math.min(width, height), 0.0000001)
  } catch {
    return Number.POSITIVE_INFINITY
  }
}

function regionSplitAngles(region, roadFeatures = [], preferredAngle = null, depth = 0) {
  const angles = []
  const pushAngle = (angle) => {
    const normalized = normalizeSplitAngle(angle)
    if (angles.some((current) => Math.abs(current - normalized) < 8)) return
    angles.push(normalized)
  }

  if (preferredAngle !== null) {
    pushAngle(preferredAngle)
  }

  const longestRoad = [...roadFeatures]
    .filter((feature) => safeBooleanIntersects(feature, safeBuffer(region, 5)) || safeBooleanIntersects(feature, region))
    .sort((left, right) => featureLengthMeters(right) - featureLengthMeters(left))[0]
  const roadAngle = roadBearingAngle(longestRoad)
  if (roadAngle !== null) {
    pushAngle(roadAngle)
    pushAngle(roadAngle + 90)
  }

  const [minX, minY, maxX, maxY] = turf.bbox(region)
  const width = maxX - minX
  const height = maxY - minY
  const dominant = width >= height ? 0 : 90
  const secondary = width >= height ? 90 : 0
  pushAngle(dominant)
  pushAngle(secondary)

  return angles.slice(0, depth > 0 ? 3 : 4)
}

function rotateFeature(feature, angle, pivotCoordinates = null) {
  if (!feature || !Number.isFinite(angle) || Math.abs(angle) < 0.0001) return feature
  try {
    return turf.transformRotate(feature, angle, pivotCoordinates ? { pivot: pivotCoordinates } : {})
  } catch {
    return feature
  }
}

function splitRegionByTargetRatio(region, targetRatio, minimumAreaSqm, angle = 0) {
  const pivot = featureCenter(region)?.geometry?.coordinates || turf.center(region).geometry.coordinates
  const rotatedRegion = rotateFeature(region, -angle, pivot)
  const totalArea = featureAreaSqm(rotatedRegion)
  if (!Number.isFinite(totalArea) || totalArea <= 0) return null

  const minimumSliceArea = Math.max(6, minimumAreaSqm * 0.35)
  const [minX, minY, maxX, maxY] = turf.bbox(rotatedRegion)
  if (maxX - minX <= 0.0000001 || maxY - minY <= 0.0000001) return null

  const targetArea = totalArea * targetRatio
  let low = minX
  let high = maxX
  let bestLeft = null
  let bestRight = null
  let bestDelta = Number.POSITIVE_INFINITY

  for (let iteration = 0; iteration < 12; iteration += 1) {
    const mid = (low + high) / 2
    const leftBox = turf.bboxPolygon([minX, minY, mid, maxY])
    const rightBox = turf.bboxPolygon([mid, minY, maxX, maxY])
    const leftPart = safeIntersectPolygon(rotatedRegion, leftBox, { split: 'left' })
    const rightPart = safeIntersectPolygon(rotatedRegion, rightBox, { split: 'right' })
    const leftArea = featureAreaSqm(leftPart)
    const rightArea = featureAreaSqm(rightPart)

    if (leftArea < minimumSliceArea || rightArea < minimumSliceArea) {
      if (leftArea < minimumSliceArea) {
        low = mid
      } else {
        high = mid
      }
      continue
    }

    const delta = Math.abs(leftArea - targetArea)
    if (delta < bestDelta) {
      bestDelta = delta
      bestLeft = leftPart
      bestRight = rightPart
    }

    if (leftArea < targetArea) {
      low = mid
    } else {
      high = mid
    }
  }

  if (!bestLeft || !bestRight) return null

  return {
    left: rotateFeature(bestLeft, angle, pivot),
    right: rotateFeature(bestRight, angle, pivot)
  }
}

function splitCandidateScore(left, right, leftCount, rightCount, roadFeatures = []) {
  const leftArea = featureAreaSqm(left)
  const rightArea = featureAreaSqm(right)
  const totalCount = leftCount + rightCount
  const totalArea = leftArea + rightArea
  const targetLeftArea = totalArea * (leftCount / totalCount)
  const targetRightArea = totalArea * (rightCount / totalCount)
  const areaPenalty = (
    Math.abs(leftArea - targetLeftArea) / Math.max(targetLeftArea, 1)
    + Math.abs(rightArea - targetRightArea) / Math.max(targetRightArea, 1)
  ) * 120
  const compactnessPenalty = (
    Math.max(0, 0.14 - featureCompactness(left))
    + Math.max(0, 0.14 - featureCompactness(right))
  ) * 95
  const aspectPenalty = (
    Math.max(0, featureBBoxAspectRatio(left) - 4.6)
    + Math.max(0, featureBBoxAspectRatio(right) - 4.6)
  ) * 22
  const roadPenalty = roadFeatures.length
    ? (
      (regionTouchesRoad(left, roadFeatures) ? 0 : leftCount * 3)
      + (regionTouchesRoad(right, roadFeatures) ? 0 : rightCount * 3)
    )
    : 0

  return areaPenalty + compactnessPenalty + aspectPenalty + roadPenalty
}

function gridDimensionsForTargetCount(width, height, targetCount) {
  let best = null
  const regionAspect = Math.max(width, height) / Math.max(Math.min(width, height), 0.0000001)

  for (let columns = 1; columns <= targetCount; columns += 1) {
    const rows = Math.max(1, Math.floor(targetCount / columns))
    const baseCount = rows * columns
    if (baseCount > targetCount || baseCount < 1) continue

    const cellWidth = width / columns
    const cellHeight = height / rows
    const aspect = Math.max(cellWidth, cellHeight) / Math.max(Math.min(cellWidth, cellHeight), 0.0000001)
    const extras = targetCount - baseCount
    const expectedRows = regionAspect >= 2.4 ? 1 : regionAspect >= 1.35 ? 2 : Math.max(2, Math.round(Math.sqrt(targetCount / Math.max(regionAspect, 1))))
    const expectedColumns = Math.max(1, Math.ceil(targetCount / expectedRows))
    const score = (
      Math.abs(aspect - 1.55) * 65
      + extras * 18
      + Math.abs(rows - expectedRows) * 18
      + Math.abs(columns - expectedColumns) * 10
    )

    if (!best || score < best.score) {
      best = { rows, columns, baseCount, extras, score }
    }
  }

  return best
}

function frontageLayoutAngles(region, roadFeatures = []) {
  const longestRoad = [...roadFeatures]
    .filter((feature) => safeBooleanIntersects(feature, safeBuffer(region, 5)) || safeBooleanIntersects(feature, region))
    .sort((left, right) => featureLengthMeters(right) - featureLengthMeters(left))[0]
  const roadAngle = roadBearingAngle(longestRoad)
  if (roadAngle !== null) {
    return [normalizeSplitAngle(roadAngle), normalizeSplitAngle(roadAngle + 90)]
  }

  const [minX, minY, maxX, maxY] = turf.bbox(region)
  return maxX - minX >= maxY - minY ? [0, 90] : [90, 0]
}

function splitAngleForCell(cell, gridAngle) {
  const pivot = featureCenter(cell)?.geometry?.coordinates || turf.center(cell).geometry.coordinates
  const rotated = rotateFeature(cell, -gridAngle, pivot)
  const [minX, minY, maxX, maxY] = turf.bbox(rotated)
  const width = maxX - minX
  const height = maxY - minY
  return width >= height ? gridAngle : gridAngle + 90
}

function buildGridCandidatePlots(region, requestedCount, minimumAreaSqm, roadFeatures = []) {
  const targetCount = Math.max(1, Number(requestedCount) || 1)
  if (targetCount === 1) return [region]

  const minimumCellArea = Math.max(5, minimumAreaSqm * 0.25)
  const candidates = []

  for (const angle of frontageLayoutAngles(region, roadFeatures)) {
    const pivot = featureCenter(region)?.geometry?.coordinates || turf.center(region).geometry.coordinates
    const rotated = rotateFeature(region, -angle, pivot)
    const [minX, minY, maxX, maxY] = turf.bbox(rotated)
    const width = maxX - minX
    const height = maxY - minY
    if (width <= 0.0000001 || height <= 0.0000001) continue

    const dimensions = gridDimensionsForTargetCount(width, height, targetCount)
    if (!dimensions) continue

    const xBreaks = Array.from({ length: dimensions.columns + 1 }, (_, index) => minX + (width * index) / dimensions.columns)
    const yBreaks = Array.from({ length: dimensions.rows + 1 }, (_, index) => minY + (height * index) / dimensions.rows)

    const boxes = []
    for (let row = 0; row < dimensions.rows; row += 1) {
      for (let column = 0; column < dimensions.columns; column += 1) {
        const cellBox = turf.bboxPolygon([xBreaks[column], yBreaks[row], xBreaks[column + 1], yBreaks[row + 1]])
        const clipped = safeIntersectPolygon(rotated, cellBox, { row, column })
        if (clipped && featureAreaSqm(clipped) > minimumCellArea) {
          boxes.push(rotateFeature(clipped, angle, pivot))
        }
      }
    }

    if (boxes.length < dimensions.baseCount) continue

    let plots = boxes
    if (dimensions.extras > 0) {
      plots = [...boxes]
      let extrasRemaining = dimensions.extras

      while (extrasRemaining > 0) {
        const splitIndex = plots.reduce((bestIndex, feature, index) => {
          const best = plots[bestIndex]
          const currentScore = featureAreaSqm(feature) - featureBBoxAspectRatio(feature) * 200
          const bestScore = featureAreaSqm(best) - featureBBoxAspectRatio(best) * 200
          return currentScore > bestScore ? index : bestIndex
        }, 0)

        const splitTarget = plots[splitIndex]
        const split = splitRegionByTargetRatio(
          splitTarget,
          0.5,
          minimumAreaSqm,
          splitAngleForCell(splitTarget, angle)
        )
        if (!split || featureAreaSqm(split.left) <= minimumCellArea || featureAreaSqm(split.right) <= minimumCellArea) {
          break
        }

        plots.splice(splitIndex, 1, split.left, split.right)
        extrasRemaining -= 1
      }
    }

    if (plots.length === targetCount) {
      candidates.push(plots)
    }
  }

  return candidates
    .map((plots) => ({ plots, score: plotSetScore(plots, featureAreaSqm(region) / targetCount, targetCount) }))
    .sort((left, right) => left.score - right.score)[0]?.plots || []
}

function sliceRegionIntoEqualAreaPlots(region, count, minimumAreaSqm, angle = 0, roadFeatures = [], depth = 0) {
  const targetCount = Math.max(1, Number(count) || 1)
  if (targetCount === 1) return [region]

  const leftCount = Math.floor(targetCount / 2)
  const rightCount = targetCount - leftCount
  const candidates = regionSplitAngles(region, roadFeatures, angle, depth)
    .map((candidateAngle) => {
      const split = splitRegionByTargetRatio(region, leftCount / targetCount, minimumAreaSqm, candidateAngle)
      if (!split) return null
      return {
        angle: candidateAngle,
        left: split.left,
        right: split.right,
        score: splitCandidateScore(split.left, split.right, leftCount, rightCount, roadFeatures)
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.score - right.score)

  const best = candidates[0]
  if (!best) return []

  const nextAngle = normalizeSplitAngle(best.angle + (depth % 2 === 0 ? 90 : 32))
  const leftPlots = sliceRegionIntoEqualAreaPlots(
    best.left,
    leftCount,
    minimumAreaSqm,
    nextAngle,
    roadFeatures,
    depth + 1
  )
  const rightPlots = sliceRegionIntoEqualAreaPlots(
    best.right,
    rightCount,
    minimumAreaSqm,
    nextAngle,
    roadFeatures,
    depth + 1
  )

  if (leftPlots.length !== leftCount || rightPlots.length !== rightCount) {
    return []
  }

  return [...leftPlots, ...rightPlots]
}

function polygonFragmentCount(feature) {
  return polygonFeaturesFromValue(feature).length
}

function plotSetScore(plots, targetAreaSqm, requestedCount) {
  if (!plots.length) return Number.POSITIVE_INFINITY

  const areas = plots.map((plot) => featureAreaSqm(plot)).filter((area) => area > 0)
  if (!areas.length) return Number.POSITIVE_INFINITY

  const averageArea = areas.reduce((sum, area) => sum + area, 0) / areas.length
  const variance = areas.reduce((sum, area) => sum + ((area - averageArea) ** 2), 0) / areas.length
  const standardDeviation = Math.sqrt(variance)
  const meanAbsoluteError = areas.reduce((sum, area) => sum + Math.abs(area - targetAreaSqm), 0) / areas.length
  const maxArea = Math.max(...areas)
  const minArea = Math.min(...areas)
  const compactnessPenalty = plots.reduce((sum, plot) => (
    sum + Math.max(0, 0.12 - featureCompactness(plot))
  ), 0) / plots.length
  const fragmentationPenalty = plots.reduce((sum, plot) => (
    sum + Math.max(0, polygonFragmentCount(plot) - 1)
  ), 0)

  return (
    Math.abs(plots.length - requestedCount) * 1000
    + (meanAbsoluteError / Math.max(targetAreaSqm, 1)) * 100
    + (standardDeviation / Math.max(targetAreaSqm, 1)) * 90
    + ((maxArea - minArea) / Math.max(targetAreaSqm, 1)) * 35
    + compactnessPenalty * 80
    + fragmentationPenalty * 220
  )
}

function buildRegionPlots(region, requestedCount, minimumAreaSqm, roadFeatures = []) {
  const targetCount = Math.max(1, Number(requestedCount) || 1)
  if (targetCount === 1) return [region]

  const targetAreaSqm = featureAreaSqm(region) / targetCount

  const gridCandidate = buildGridCandidatePlots(region, targetCount, minimumAreaSqm, roadFeatures)
    .filter((feature) => featureAreaSqm(feature) > minimumAreaSqm * 0.35)
  if (gridCandidate.length) {
    return gridCandidate
  }

  const candidates = []
  const recursiveSplit = sliceRegionIntoEqualAreaPlots(region, targetCount, minimumAreaSqm, 0, roadFeatures)
    .filter((feature) => featureAreaSqm(feature) > minimumAreaSqm * 0.45)
  if (recursiveSplit.length) {
    candidates.push(recursiveSplit)
  }

  if (!candidates.length) {
    let voronoiCells = clippedVoronoiCells(
      region,
      selectSeedPoints(region, targetCount, roadFeatures),
      minimumAreaSqm * 0.4
    ).filter((feature) => featureAreaSqm(feature) > minimumAreaSqm * 0.4)

    if (voronoiCells.length > targetCount) {
      voronoiCells = mergeAwkwardPlots(voronoiCells, roadFeatures, minimumAreaSqm, targetCount)
    }
    if (voronoiCells.length) {
      candidates.push(voronoiCells)
    }
  }

  const bestCandidate = candidates
    .map((plots) => ({ plots, score: plotSetScore(plots, targetAreaSqm, targetCount) }))
    .sort((left, right) => left.score - right.score)[0]

  return bestCandidate?.plots?.length ? bestCandidate.plots : [region]
}

function assignBuildingsToPlots(plots, buildings) {
  if (!plots.length || !buildings.length) return plots

  const assigned = [...plots]
  for (const building of buildings.flatMap((feature) => polygonFeaturesFromValue(feature))) {
    const buildingCenter = featureCenter(building)
    const buildingBuffer = safeBuffer(building, 1.5)
    let bestIndex = -1
    let bestScore = -Infinity

    assigned.forEach((plot, index) => {
      const plotCenter = featureCenter(plot)
      const distance = buildingCenter && plotCenter
        ? turf.distance(buildingCenter, plotCenter, { units: 'meters' })
        : Number.POSITIVE_INFINITY
      const touches = safeBooleanIntersects(plot, building) || safeBooleanIntersects(plot, buildingBuffer)
      if (!touches) return
      const score = (touches ? 100000 : 0) - distance
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    if (bestIndex === -1 || bestScore < 0) continue
    const merged = safeUnionPolygons([assigned[bestIndex], building], {
      ...(assigned[bestIndex].properties || {})
    })
    if (merged) assigned[bestIndex] = merged
  }

  return assigned
}

function featureCenter(feature) {
  return safeInteriorPoint(feature)
}

function sortPlotsForDisplay(plots) {
  return [...plots].sort((left, right) => {
    const leftCenter = featureCenter(left)?.geometry?.coordinates || [0, 0]
    const rightCenter = featureCenter(right)?.geometry?.coordinates || [0, 0]
    if (Math.abs(rightCenter[1] - leftCenter[1]) > 0.00001) {
      return rightCenter[1] - leftCenter[1]
    }
    return leftCenter[0] - rightCenter[0]
  })
}

function featurePerimeterMeters(feature) {
  try {
    const outline = turf.polygonToLine(feature)
    return turf.length(outline, { units: 'meters' })
  } catch {
    return 0
  }
}

function featureCompactness(feature) {
  const area = featureAreaSqm(feature)
  const perimeter = featurePerimeterMeters(feature)
  if (area <= 0 || perimeter <= 0) return 0
  return (4 * Math.PI * area) / (perimeter * perimeter)
}

function featuresNearlyTouch(left, right, bufferMeters = 2.5) {
  const leftBuffer = safeBuffer(left, bufferMeters)
  const rightBuffer = safeBuffer(right, bufferMeters)
  return safeBooleanIntersects(left, right)
    || safeBooleanIntersects(leftBuffer, right)
    || safeBooleanIntersects(rightBuffer, left)
}

function mergeAwkwardPlots(plots, roadFeatures, minimumPlotSizeSqm, requestedCount) {
  const merged = [...plots]
  const minimumTarget = Number.isFinite(minimumPlotSizeSqm) && minimumPlotSizeSqm > 0
    ? minimumPlotSizeSqm * 0.45
    : 45

  const awkwardIndex = () => {
    if (merged.length > requestedCount) {
      return merged.reduce((bestIndex, feature, index) => (
        featureAreaSqm(feature) < featureAreaSqm(merged[bestIndex]) ? index : bestIndex
      ), 0)
    }
    return merged.findIndex((feature) => (
      featureAreaSqm(feature) < minimumTarget || featureCompactness(feature) < 0.085
    ))
  }

  while (merged.length > 1) {
    const sourceIndex = awkwardIndex()
    if (sourceIndex < 0) break

    const source = merged[sourceIndex]
    let bestIndex = -1
    let bestUnion = null
    let bestScore = -Infinity

    merged.forEach((candidate, index) => {
      if (index === sourceIndex) return
      const touching = featuresNearlyTouch(source, candidate)
      if (!touching && merged.length <= requestedCount) return

      const unioned = safeUnionPolygons([source, candidate], {
        ...(candidate.properties || {})
      })
      if (!unioned) return

      const roadDistance = distanceToNearestRoad(featureCenter(unioned), roadFeatures)
      const score = (touching ? 1000 : 0)
        + (featureCompactness(unioned) * 500)
        + (featureAreaSqm(unioned) * 0.01)
        - (Number.isFinite(roadDistance) ? roadDistance * 0.02 : 0)

      if (score > bestScore) {
        bestScore = score
        bestIndex = index
        bestUnion = unioned
      }
    })

    if (bestIndex < 0 || !bestUnion) break

    const next = merged.filter((_, index) => index !== sourceIndex && index !== bestIndex)
    next.push(bestUnion)
    merged.splice(0, merged.length, ...next)
  }

  return merged
}

function normalizedText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function recommendedLandUseForZoning(zoning = []) {
  const zones = [...zoning].sort((left, right) => (right.overlapAreaSqm || 0) - (left.overlapAreaSqm || 0))
  const explicitAllowedUses = zones
    .flatMap((zone) => zone.rule?.allowedUses || [])
    .map(normalizedText)
    .filter(Boolean)
  const matchedOption = LAND_USE_OPTIONS.find((option) => {
    if (!option.value) return false
    const keywords = [option.value, option.label, ...(LAND_USE_KEYWORDS[option.value] || [])].map(normalizedText)
    return explicitAllowedUses.some((allowedText) => keywords.some((keyword) => (
      keyword && (allowedText.includes(keyword) || keyword.includes(allowedText))
    )))
  })
  if (matchedOption) return matchedOption.value

  const primaryCode = zones[0]?.zoneCode || ''
  if (['R1A', 'R3', 'R4'].includes(primaryCode)) return 'Apartments'
  if (['R1', 'R1B'].includes(primaryCode)) return 'Single family houses'
  if (primaryCode === 'R2') return 'Row housing'
  if (primaryCode.startsWith('C')) return 'Commercial'
  if (primaryCode.startsWith('A')) return 'Agriculture'
  if (primaryCode.startsWith('PF') || primaryCode === 'U') return 'Public facility'
  return ''
}

function proposalLabel(feature) {
  const id = String(feature?.properties?.id || feature?.properties?.source || 'proposal')
  const base = id.replace(/^suggested-(\d+)$/i, 's$1')
  const fragmentIndex = Number(feature?.properties?._fragmentIndex || 0)
  if (!Number.isFinite(fragmentIndex) || fragmentIndex <= 0) return base
  const suffix = String.fromCharCode(96 + Math.min(fragmentIndex + 1, 26))
  return `${base}${suffix}`
}

function largestPolygonFeature(feature, properties = {}) {
  const pieces = polygonFeaturesFromValue(feature)
    .sort((left, right) => featureAreaSqm(right) - featureAreaSqm(left))
  if (!pieces.length) return null

  return {
    ...pieces[0],
    properties: {
      ...(pieces[0].properties || {}),
      ...properties
    }
  }
}

function normalizeGeneratedPlots(plots, minimumAreaSqm, roadFeatures = []) {
  const bases = []
  const fragments = []

  plots.forEach((plot, index) => {
    const pieces = polygonFeaturesFromValue(plot)
      .sort((left, right) => featureAreaSqm(right) - featureAreaSqm(left))
    if (!pieces.length) return

    const [largest, ...rest] = pieces
    bases.push({
      ...largest,
      properties: {
        ...(plot.properties || {}),
        ...(largest.properties || {}),
        _sourceIndex: index
      }
    })

    rest.forEach((fragment) => {
      if (featureAreaSqm(fragment) > minimumAreaSqm * 0.3) {
        fragments.push({
          ...fragment,
          properties: {
            ...(plot.properties || {}),
            ...(fragment.properties || {}),
            _sourceIndex: index
          }
        })
      }
    })
  })

  fragments
    .sort((left, right) => featureAreaSqm(right) - featureAreaSqm(left))
    .forEach((fragment) => {
      let bestIndex = -1
      let bestUnion = null
      let bestScore = -Infinity

      bases.forEach((base, index) => {
        if (!featuresNearlyTouch(base, fragment, 4)) return
        const unioned = safeUnionPolygons([base, fragment], { ...(base.properties || {}) })
        const unionPieces = polygonFeaturesFromValue(unioned)
        if (unionPieces.length !== 1) return

        const single = largestPolygonFeature(unioned, { ...(base.properties || {}) })
        if (!single) return

        const score = (
          featureCompactness(single) * 500
          - Math.max(0, featureBBoxAspectRatio(single) - 4.2) * 20
          - (Number.isFinite(distanceToNearestRoad(featureCenter(single), roadFeatures))
            ? distanceToNearestRoad(featureCenter(single), roadFeatures) * 0.02
            : 0)
        )

        if (score > bestScore) {
          bestScore = score
          bestIndex = index
          bestUnion = single
        }
      })

      if (bestIndex >= 0 && bestUnion) {
        bases[bestIndex] = bestUnion
      }
    })

  return bases
    .map((plot) => largestPolygonFeature(plot, { ...(plot.properties || {}) }))
    .filter(Boolean)
    .filter((plot) => featureAreaSqm(plot) > minimumAreaSqm)
}

function plotShapeMetrics(plots) {
  const cleaned = plots.filter(Boolean)
  const aspects = cleaned.map((plot) => featureBBoxAspectRatio(plot))
  const compactness = cleaned.map((plot) => featureCompactness(plot))
  const areas = cleaned.map((plot) => featureAreaSqm(plot))
  const averageArea = areas.length ? areas.reduce((sum, area) => sum + area, 0) / areas.length : 0

  return {
    fragmentedCount: cleaned.filter((plot) => polygonFragmentCount(plot) > 1).length,
    maxAspect: aspects.length ? Math.max(...aspects) : Number.POSITIVE_INFINITY,
    averageAspect: aspects.length ? aspects.reduce((sum, value) => sum + value, 0) / aspects.length : Number.POSITIVE_INFINITY,
    minCompactness: compactness.length ? Math.min(...compactness) : 0,
    averageCompactness: compactness.length ? compactness.reduce((sum, value) => sum + value, 0) / compactness.length : 0,
    areaSpread: averageArea > 0 && areas.length
      ? (Math.max(...areas) - Math.min(...areas)) / averageArea
      : Number.POSITIVE_INFINITY
  }
}

function layoutPassesQualityThresholds(plots, requestedCount, minimumPlotSizeSqm = null) {
  if (!plots?.length || plots.length !== requestedCount) return false
  const metrics = plotShapeMetrics(plots)

  if (metrics.fragmentedCount > 0) return false
  if (metrics.maxAspect > 3.8) return false
  if (metrics.averageAspect > 2.35) return false
  if (metrics.minCompactness < 0.07) return false
  if (metrics.averageCompactness < 0.16) return false
  if (requestedCount >= 4 && metrics.areaSpread > 0.95) return false

  if (Number.isFinite(minimumPlotSizeSqm) && minimumPlotSizeSqm > 0) {
    const tooSmall = plots.some((plot) => featureAreaSqm(plot) < minimumPlotSizeSqm * 0.82)
    if (tooSmall) return false
  }

  return true
}

function buildFallbackSuggestedPlots(parcel, count = 3, context = null, zoning = []) {
  const parent = parcelFeature(parcel)
  if (!parent) {
    return { error: 'Select a parcel before generating suggested plots.', collection: null }
  }

  const [minX, minY, maxX, maxY] = turf.bbox(parent)
  const width = maxX - minX
  const height = maxY - minY
  if (width <= 0 || height <= 0) {
    return { error: 'Selected parcel bounds could not be calculated.', collection: null }
  }

  const features = []
  const candidates = []
  const excludedFeatures = overlayPolygonFeatures(context, ['BUILDING_FOOTPRINTS', 'CONSTRAINTS'])
    .filter((feature) => safeBooleanIntersects(feature, parent))
    .map((feature) => safeIntersectPolygon(feature, parent))
    .filter(Boolean)
  const maxLotSizeSqm = strictestMaxLotSize(zoning)
  const candidateColumns = Math.max(19, count * 3)
  const candidateRows = Math.max(19, count * 3)
  const baseWidth = width / Math.max(3, Math.ceil(Math.sqrt(count)) + 1)
  const baseHeight = height / Math.max(3, Math.ceil(Math.sqrt(count)) + 1)
  const scales = [1.8, 1.55, 1.3, 1.1, 0.9, 0.72, 0.55, 0.42, 0.32, 0.24, 0.18, 0.12]
  const minimumCandidateAreaSqm = maxLotSizeSqm ? Math.min(25, maxLotSizeSqm * 0.18) : 12

  const candidateInsideParent = (candidate) => {
    const ring = candidate.geometry.coordinates[0] || []
    const samplePoints = [
      ...ring.slice(0, -1),
      turf.center(candidate).geometry.coordinates
    ]
    return samplePoints.every((coordinate) => {
      try {
        return turf.booleanPointInPolygon(turf.point(coordinate), parent, { ignoreBoundary: false })
      } catch {
        return false
      }
    })
  }

  const touchesExcludedLayer = (candidate) => excludedFeatures.some((feature) => {
    try {
      return turf.booleanIntersects(candidate, feature)
    } catch {
      return true
    }
  })

  const overlapsExisting = (candidate) => features.some((feature) => {
    try {
      return turf.booleanIntersects(candidate, feature)
    } catch {
      return true
    }
  })

  for (const scale of scales) {
    for (let row = 1; row < candidateRows; row += 1) {
      for (let column = 1; column < candidateColumns; column += 1) {
        const centerX = minX + (width * column) / candidateColumns
        const centerY = minY + (height * row) / candidateRows
        const halfWidth = (baseWidth * scale) / 2
        const halfHeight = (baseHeight * scale) / 2
        const candidate = turf.bboxPolygon(
          [centerX - halfWidth, centerY - halfHeight, centerX + halfWidth, centerY + halfHeight],
          {
            properties: {
              id: `s${features.length + 1}`,
              source: 'generated'
            }
          }
        )
        const areaSqm = turf.area(candidate)

        if (
          areaSqm > minimumCandidateAreaSqm
          && (!maxLotSizeSqm || areaSqm <= maxLotSizeSqm + 2)
          && candidateInsideParent(candidate)
          && !touchesExcludedLayer(candidate)
        ) {
          candidates.push({ feature: candidate, areaSqm })
        }
      }
    }
  }

  candidates
    .sort((left, right) => right.areaSqm - left.areaSqm)
    .forEach((candidate) => {
      if (features.length >= count) return
      if (overlapsExisting(candidate.feature)) return
      candidate.feature.properties = {
        ...candidate.feature.properties,
        id: `suggested-${features.length + 1}`,
        source: 'generated',
        areaSqm: Math.round(candidate.areaSqm)
      }
      features.push(candidate.feature)
    })

  if (!features.length) {
    return { error: 'Unable to generate clean plots that avoid buildings and constraints for this parcel shape. Try fewer plots or draw manually.', collection: null }
  }

  return {
    error: '',
    warning: features.length < count
      ? `Requested ${count} plot(s), but only ${features.length} clean plot(s) could be placed without crossing buildings, constraints, or the parent boundary.`
      : 'A simplified fallback generator was used for this parcel shape.',
    collection: featureCollection(features),
    planningContext: {
      parentArea: featureAreaSqm(parent),
      availableArea: featureAreaSqm(parent),
      restrictedArea: 0
    }
  }
}

function estimateMaximumDivisiblePlotCount(parcel, context = null, zoning = []) {
  const parent = parcelFeature(parcel)
  if (!parent) {
    return {
      error: 'Select a parcel before calculating the maximum possible subdivision count.',
      count: 0
    }
  }

  const minimumPlotSizeSqm = strictestMinLotSize(zoning)
  const buildingFeatures = overlayPolygonFeatures(context, ['BUILDING_FOOTPRINTS'])
    .filter((feature) => safeBooleanIntersects(feature, parent))
    .map((feature) => safeIntersectPolygon(feature, parent))
    .filter(Boolean)
  const constraintFeatures = overlayPolygonFeatures(context, ['CONSTRAINTS'])
    .filter((feature) => safeBooleanIntersects(feature, parent))
    .map((feature) => safeIntersectPolygon(feature, parent))
    .filter(Boolean)
  const minimumRegionAreaSqm = Math.max(
    8,
    Number.isFinite(minimumPlotSizeSqm)
      ? Math.min(90, minimumPlotSizeSqm * 0.025)
      : 40
  )

  let developableRegions = polygonFeaturesFromValue(parent)
  developableRegions = subtractPolygonMasks(
    developableRegions,
    [...constraintFeatures, ...buildingFeatures],
    minimumRegionAreaSqm
  )

  if (!developableRegions.length) {
    const hasBuildings = buildingFeatures.length > 0
    const hasConstraints = constraintFeatures.length > 0
    let reason = 'This parcel has no developable area left after removing buildings and restricted zones.'
    if (hasBuildings && !hasConstraints) {
      reason = 'Attention Required — This parcel has no developable area left because it is fully covered by existing building footprints.'
    } else if (hasConstraints && !hasBuildings) {
      reason = 'Attention Required — This parcel has no developable area left because it is fully within restricted masterplan zones.'
    } else if (hasBuildings && hasConstraints) {
      reason = 'Attention Required — This parcel has no developable area left after subtracting both existing buildings and restricted zones.'
    }
    return {
      error: reason,
      count: 0
    }
  }

  const parentArea = featureAreaSqm(parent)
  if (Number.isFinite(minimumPlotSizeSqm) && parentArea < minimumPlotSizeSqm * 2) {
    return {
      error: `The loaded masterplan rules do not support dividing this parcel: parent parcel area of ${formatArea(parentArea)} is too small to split under the zoning rule (requires minimum lot size: ${formatArea(minimumPlotSizeSqm)}).`,
      count: 1,
      minimumPlotSizeSqm
    }
  }

  const availableArea = developableRegions.reduce((sum, feature) => sum + featureAreaSqm(feature), 0)

  if (Number.isFinite(minimumPlotSizeSqm) && minimumPlotSizeSqm > 0) {
    const capacity = developableRegions.reduce((sum, feature) => (
      sum + Math.max(0, Math.floor(featureAreaSqm(feature) / minimumPlotSizeSqm))
    ), 0)

    const cappedCapacity = Math.min(capacity, 24)
    for (let requestedCount = cappedCapacity; requestedCount >= 2; requestedCount -= 1) {
      const candidate = buildSuggestedPlots(parcel, requestedCount, context, zoning, {
        skipBuildingAssignment: true,
        skipFallback: true
      })
      if (!candidate.error && layoutPassesQualityThresholds(candidate.collection?.features || [], requestedCount, minimumPlotSizeSqm)) {
        return {
          error: '',
          count: requestedCount,
          availableArea,
          minimumPlotSizeSqm,
          note: `Calculated from the strictest loaded minimum lot size of ${formatArea(minimumPlotSizeSqm)} and reduced to the highest count that still keeps a clean plot shape.`
        }
      }
    }

    if (capacity < 2) {
      return {
        error: `The remaining developable area of ${formatArea(availableArea)} is too small for a subdivision compliant with the zoning rule (minimum lot size: ${formatArea(minimumPlotSizeSqm)}).`,
        count: 1,
        minimumPlotSizeSqm
      }
    }

    return {
      error: 'The remaining developable geometry has awkward dimensions or overlaps that prevent generating clean compliant plot shapes.',
      count: 1,
      minimumPlotSizeSqm
    }
  }

  const heuristicCount = Math.max(1, Math.floor(availableArea / 900))
  return {
    error: '',
    count: heuristicCount,
    availableArea,
    minimumPlotSizeSqm: null,
    note: 'No explicit minimum lot size was loaded, so the count was estimated from the developable area only.'
  }
}

function buildSuggestedPlots(parcel, count = 3, context = null, zoning = [], options = {}) {
  const parent = parcelFeature(parcel)
  if (!parent) {
    return { error: 'Select a parcel before generating suggested plots.', collection: null }
  }

  const requestedCount = Math.max(1, Number(count) || 1)
  const minimumPlotSizeSqm = strictestMinLotSize(zoning)
  const buildingFeatures = overlayPolygonFeatures(context, ['BUILDING_FOOTPRINTS'])
    .filter((feature) => safeBooleanIntersects(feature, parent))
    .map((feature) => safeIntersectPolygon(feature, parent))
    .filter(Boolean)
  const constraintFeatures = overlayPolygonFeatures(context, ['CONSTRAINTS'])
    .filter((feature) => safeBooleanIntersects(feature, parent))
    .map((feature) => safeIntersectPolygon(feature, parent))
    .filter(Boolean)
  const roadFeatures = roadFrontageFeatures(context, parent)
  const minimumRegionAreaSqm = Math.max(
    8,
    Number.isFinite(minimumPlotSizeSqm)
      ? Math.min(90, minimumPlotSizeSqm * 0.025)
      : 40
  )

  let developableRegions = polygonFeaturesFromValue(parent)
  developableRegions = subtractPolygonMasks(
    developableRegions,
    [...constraintFeatures, ...buildingFeatures],
    minimumRegionAreaSqm
  )

  const parentArea = featureAreaSqm(parent)
  const availableArea = developableRegions.reduce((sum, feature) => sum + featureAreaSqm(feature), 0)

  if (!developableRegions.length) {
    return {
      error: 'This parcel is fully blocked by loaded buildings or restricted zones, so no draft subdivision can be generated.',
      collection: null
    }
  }

  const { allocations } = allocateRegionPlotCounts(
    developableRegions,
    requestedCount,
    minimumPlotSizeSqm,
    roadFeatures
  )

  const rawPlots = developableRegions.flatMap((region, index) => (
    allocations[index] > 0
      ? buildRegionPlots(region, allocations[index], minimumRegionAreaSqm, roadFeatures)
      : []
  ))

  if (!rawPlots.length) {
    return {
      error: 'Unable to generate a connected draft layout for this parcel. Try fewer plots or draw the proposal manually.',
      collection: null
    }
  }

  const plotsWithBuildings = normalizeGeneratedPlots(
    mergeAwkwardPlots(
      rawPlots,
      roadFeatures,
      minimumPlotSizeSqm,
      requestedCount
    ),
    minimumRegionAreaSqm,
    roadFeatures
  )
    .map((plot) => safeIntersectPolygon(plot, parent, { ...(plot.properties || {}) }) || plot)
    .map((plot) => largestPolygonFeature(plot, { ...(plot.properties || {}) }) || plot)
    .filter((plot) => {
      const type = plot?.geometry?.type
      return type === 'Polygon' || type === 'MultiPolygon'
    })
    .filter((plot) => featureAreaSqm(plot) > minimumRegionAreaSqm)

  const finalPlots = normalizeGeneratedPlots(
    plotsWithBuildings,
    minimumRegionAreaSqm,
    roadFeatures,
  )
    .filter((plot) => featureAreaSqm(plot) > minimumRegionAreaSqm)

  if (!finalPlots.length) {
    return {
      error: 'Unable to finalize the generated plots inside the parcel boundary.',
      collection: null
    }
  }

  const finalizedPlots = sortPlotsForDisplay(finalPlots).map((plot, index) => ({
    ...plot,
    properties: {
      ...(plot.properties || {}),
      id: `suggested-${index + 1}`,
      source: 'generated',
      areaSqm: Math.round(featureAreaSqm(plot))
    }
  }))

  if (options.skipFallback && requestedCount > 1 && finalizedPlots.length !== requestedCount) {
    return {
      error: 'The requested plot count cannot be generated as clean single-piece plots for this parcel shape.',
      collection: null
    }
  }

  const warningParts = []
  if (finalizedPlots.length < requestedCount) {
    warningParts.push(
      `Requested ${requestedCount} plot(s), but only ${finalizedPlots.length} plot(s) could fit while keeping the layout inside the parcel and away from restricted areas.`
    )
  }
  if (constraintFeatures.length || buildingFeatures.length) {
    warningParts.push(
      'Generated boundaries were pushed around loaded buildings and restricted zones, so some edge plots remain intentionally irregular.'
    )
  }
  if (roadFeatures.length) {
    warningParts.push(
      'The layout was biased toward nearby road frontage to produce a more estate-style draft arrangement.'
    )
  }

  return {
    error: '',
    warning: warningParts.join(' ').trim(),
    collection: featureCollection(finalizedPlots),
    planningContext: {
      parentArea,
      availableArea,
      restrictedArea: Math.max(parentArea - availableArea, 0)
    }
  }
}


function statusPill(status) {
  if (status === 'PASS') return 'bg-success/10 text-success'
  if (status === 'WARN') return 'bg-warning/15 text-warning'
  if (status === 'FAIL') return 'bg-danger/10 text-danger'
  return 'bg-clay/20 text-ink/70'
}

function layerLabel(key) {
  return LAYER_LABELS[key] || key.replaceAll('_', ' ')
}

function ruleStatusTone(status) {
  if (status === 'ALLOWED') return 'bg-success/10 text-success'
  if (status === 'NOT_RECOMMENDED') return 'bg-danger/10 text-danger'
  return 'bg-warning/15 text-warning'
}

function scoreTone(score) {
  if (!Number.isFinite(score)) return 'text-ink'
  if (score >= 80) return 'text-success'
  if (score >= 55) return 'text-warning'
  return 'text-danger'
}

function improvementTips(result) {
  if (!result) return []

  const tips = []
  const checkByCode = new Map((result.checks || []).map((check) => [check.code, check]))
  const proposedArea = Number(result.proposedAreaSqm || 0)
  const parentArea = Number(result.parentAreaSqm || 0)
  const coveragePercent = parentArea > 0 ? (proposedArea / parentArea) * 100 : 0

  if (checkByCode.get('AREA_BALANCE')?.status === 'WARN') {
    tips.push({
      title: 'Increase parcel coverage',
      detail: `The proposed plots cover about ${coveragePercent.toFixed(1)}% of the parent parcel. Add more valid plots or include a remaining plot so the proposal accounts for most of the parent parcel area.`
    })
  }

  if (checkByCode.get('ACCESS')?.status === 'WARN') {
    tips.push({
      title: 'Confirm road access',
      detail: 'The current dataset only supports preliminary access screening. For a stronger result, place plots near a road/transportation edge and confirm access with a surveyor or road right-of-way dataset.'
    })
  }

  if (checkByCode.get('LAND_USE')?.status === 'WARN') {
    tips.push({
      title: 'Select a clearer proposed use',
      detail: 'Choose a land use that is explicitly allowed by the zoning rule, such as Apartments in R1A or Row housing in R2 when applicable.'
    })
  }

  if (checkByCode.get('INSIDE_PARENT')?.status === 'FAIL') {
    tips.push({
      title: 'Keep all plots inside the parcel',
      detail: 'Move or redraw any plot that crosses the green parent parcel boundary.'
    })
  }

  if (checkByCode.get('INTERNAL_OVERLAP')?.status === 'FAIL') {
    tips.push({
      title: 'Remove overlapping plots',
      detail: 'Separate proposed plots so their blue polygons do not overlap.'
    })
  }

  if (checkByCode.get('LOT_SIZE')?.status === 'FAIL') {
    tips.push({
      title: 'Respect zoning lot-size limits',
      detail: 'Reduce plots that exceed the maximum lot size or change the number of plots so each proposed plot fits the applicable zoning rule.'
    })
  }

  if (checkByCode.get('RESTRICTED_ZONES')?.status === 'FAIL' || checkByCode.get('SLOPE')?.status === 'WARN') {
    tips.push({
      title: 'Avoid restricted or steep-slope zones',
      detail: 'Move generated or drawn plots away from red constraint areas and steep-slope masterplan zones.'
    })
  }

  if (checkByCode.get('BUILDING_FOOTPRINTS')?.status === 'WARN') {
    tips.push({
      title: 'Avoid splitting existing buildings',
      detail: 'Move plot boundaries away from grey building footprints so one building is not divided between multiple proposed plots.'
    })
  }

  if (!tips.length) {
    tips.push({
      title: 'Result is strong for preliminary review',
      detail: 'The remaining review items depend on official datasets, survey confirmation, or approval authority decisions.'
    })
  }

  return tips.slice(0, 5)
}

export default function Subdivision() {
  const location = useLocation()
  const plannerProject = location.state?.project || null
  const [layerStatus, setLayerStatus] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [selectedParcelId, setSelectedParcelId] = useState(null)
  const [context, setContext] = useState(null)
  const [proposalSource, setProposalSource] = useState('draw')
  const [proposedLandUse, setProposedLandUse] = useState('')
  const [suggestedPlotCount, setSuggestedPlotCount] = useState(3)
  const [uploadedGeoJsonText, setUploadedGeoJsonText] = useState('')
  const [sketchFeatures, setSketchFeatures] = useState([])
  const [layerState, setLayerState] = useState(DEFAULT_LAYER_STATE)
  const [checkResult, setCheckResult] = useState(null)
  const [savedReport, setSavedReport] = useState(null)
  const [searching, setSearching] = useState(false)
  const [loadingContext, setLoadingContext] = useState(false)
  const [runningCheck, setRunningCheck] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [downloadingPdf, setDownloadingPdf] = useState(false)
  const [draftingPlots, setDraftingPlots] = useState(false)
  const [draftingMode, setDraftingMode] = useState('selected')
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [mapResetKey, setMapResetKey] = useState(1)
  const [planningContext, setPlanningContext] = useState(null)

  useEffect(() => {
    api.get('/api/layers/status')
      .then(setLayerStatus)
      .catch((err) => setError(err.message || 'Unable to load GIS layer status.'))
  }, [])

  useEffect(() => {
    if (!plannerProject?.requestedUpi) return

    setSearchTerm(plannerProject.requestedUpi)
    if (plannerProject.requestedParcelCount) {
      setSuggestedPlotCount(Number(plannerProject.requestedParcelCount))
    }
    if (plannerProject.requestedLandUse) {
      setProposedLandUse(plannerProject.requestedLandUse)
    }

    let active = true
    const bootstrapProjectContext = async () => {
      try {
        const results = await api.get(`/api/parcels/search?upi=${encodeURIComponent(plannerProject.requestedUpi)}`)
        if (!active) return
        setSearchResults(results || [])
        const exactMatch = (results || []).find((parcel) => normalizeUpi(parcel.upi) === normalizeUpi(plannerProject.requestedUpi)) || results?.[0]
        if (!exactMatch) {
          setInfoMessage(`Project UPI ${plannerProject.requestedUpi} was loaded, but the parcel was not found in the active GIS cache.`)
          return
        }
        await loadParcelContext(exactMatch.id, {
          keepRequestedLandUse: Boolean(plannerProject.requestedLandUse),
          requestedLandUse: plannerProject.requestedLandUse,
          successMessage: `Project ${plannerProject.name} is ready. Draft ${plannerProject.requestedParcelCount || 'the requested'} plots and continue with compliance.`
        })
      } catch (err) {
        if (active) {
          setError(err.message || 'Unable to open the project parcel context.')
        }
      }
    }

    bootstrapProjectContext()
    return () => {
      active = false
    }
  }, [plannerProject?.id])

  const activeProposal = useMemo(() => {
    const drawn = proposalSource === 'draw'
      ? { type: 'FeatureCollection', features: sketchFeatures }
      : uploadedGeoJsonText
    return classifyProposal(drawn)
  }, [proposalSource, sketchFeatures, uploadedGeoJsonText])

  const proposalPreview = useMemo(() => {
    if (!activeProposal.proposal) return null

    const features = (activeProposal.proposal.features || []).flatMap((feature) => {
      const type = feature?.geometry?.type || ''
      if (type !== 'Polygon' && type !== 'MultiPolygon') {
        return [feature]
      }
      return polygonFeaturesFromValue(feature).map((piece, index) => ({
        ...piece,
        properties: {
          ...(feature.properties || {}),
          ...(piece.properties || {}),
          _fragmentIndex: index
        }
      }))
    })

    return featureCollection(features)
  }, [activeProposal])

  const selectedParcel = context?.parcel || null
  const zoning = context?.zoning || []
  const latestStatus = checkResult?.recommendation || '--'
  const contextWarnings = context?.warnings || []

  const overlays = useMemo(() => {
    const source = context?.overlays || []
    const items = source
      .filter((overlay) => layerState[overlay.layerKey])
      .map((overlay) => ({
        id: overlay.layerKey,
        data: parseGeoJson(overlay.geoJson),
        style: LAYER_STYLE[overlay.layerKey]
      }))

    if (proposalSource === 'upload' && proposalPreview) {
      items.push({
        id: 'proposal_preview',
        data: proposalPreview,
        style: LAYER_STYLE.proposal_preview,
        showLabels: true,
        labelFn: proposalLabel
      })
    }
    return items
  }, [context, layerState, proposalSource, proposalPreview])

  const buildPlannerPayload = () => ({
    parcelId: selectedParcelId,
    proposalGeoJson: JSON.stringify(activeProposal.proposal),
    proposedLandUse: proposedLandUse || null
  })

  const syncProjectDraft = async (plotCount) => {
    if (!plannerProject?.id) return
    await api.post(`/api/projects/${plannerProject.id}/workflow/draft`, {
      actualParcelCount: plotCount,
      proposedLandUse: proposedLandUse || null
    })
  }

  const syncProjectCompliance = async (result) => {
    if (!plannerProject?.id || !result) return
    await api.post(`/api/projects/${plannerProject.id}/workflow/compliance`, {
      complianceScore: result.complianceScore ?? null,
      recommendation: result.recommendation || null
    })
  }

  const runSearch = async () => {
    const term = searchTerm.trim()
    if (!term) {
      setError('Enter a parcel UPI or partial UPI.')
      return
    }

    setSearching(true)
    setError('')
    setInfoMessage('')
    try {
      const results = await api.get(`/api/parcels/search?upi=${encodeURIComponent(term)}`)
      setSearchResults(results)
      if (!results.length) {
        setInfoMessage(`No parcel matches "${term}".`)
      }
    } catch (err) {
      setError(err.message || 'Unable to search parcels.')
    } finally {
      setSearching(false)
    }
  }

  const loadParcelContext = async (parcelId, options = {}) => {
    setSelectedParcelId(parcelId)
    setLoadingContext(true)
    setContext(null)
    setError('')
    setInfoMessage('')
    setCheckResult(null)
    setSavedReport(null)
    setPlanningContext(null)
    setMapResetKey((value) => value + 1)
    setSketchFeatures([])
    try {
      const parcelContext = await api.get(`/api/parcels/${parcelId}/context`)
      const recommendedUse = recommendedLandUseForZoning(parcelContext.zoning || [])
      setContext(parcelContext)
      if (options.keepRequestedLandUse && options.requestedLandUse) {
        setProposedLandUse(options.requestedLandUse)
      } else {
        setProposedLandUse(recommendedUse)
      }
      setInfoMessage(options.successMessage || `Loaded parcel ${parcelContext.parcel.upi}.`)
    } catch (err) {
      setError(err.message || 'Unable to load parcel context.')
    } finally {
      setLoadingContext(false)
    }
  }

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const text = await file.text()
      setUploadedGeoJsonText(text)
      setProposalSource('upload')
      setInfoMessage(`${file.name} loaded as GeoJSON.`)
    } catch {
      setError('Unable to read the selected file.')
    }
  }

  const runComplianceCheck = async () => {
    if (!selectedParcelId) {
      setError('Select a parcel first.')
      return
    }
    if (activeProposal.error) {
      setError(activeProposal.error)
      return
    }

    setRunningCheck(true)
    setError('')
    try {
      const result = await api.post('/api/subdivision/check', buildPlannerPayload())
      setCheckResult(result)
      setSavedReport(null)
      await syncProjectCompliance(result)
      if (plannerProject?.id) {
        setInfoMessage(`Compliance completed for project ${plannerProject.name}. The project progress has been updated.`)
      }
    } catch (err) {
      setError(err.message || 'Compliance check failed.')
    } finally {
      setRunningCheck(false)
    }
  }

  const generateReport = async () => {
    if (!selectedParcelId) {
      setError('Select a parcel first.')
      return
    }
    if (activeProposal.error) {
      setError(activeProposal.error)
      return
    }

    setSavingReport(true)
    setError('')
    try {
      const report = plannerProject?.id
        ? await api.post(`/api/projects/${plannerProject.id}/subdivision/report`, buildPlannerPayload())
        : await api.post('/api/subdivision/report', buildPlannerPayload())
      setSavedReport(report)
      setCheckResult(report.report)
      if (plannerProject?.id) {
        setInfoMessage(`Project report generated for ${plannerProject.name}. It is now available in the client's project reports.`)
      }
    } catch (err) {
      setError(err.message || 'Unable to generate report.')
    } finally {
      setSavingReport(false)
    }
  }

  const downloadPdfReport = async () => {
    if (!selectedParcelId) {
      setError('Select a parcel first.')
      return
    }
    if (activeProposal.error) {
      setError(activeProposal.error)
      return
    }

    setDownloadingPdf(true)
    setError('')
    try {
      const token = localStorage.getItem('token')
      const response = plannerProject?.id && savedReport?.reportId
        ? await fetch(`${API_URL}/api/projects/${plannerProject.id}/reports/${savedReport.reportId}/pdf`, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          })
        : await fetch(`${API_URL}/api/subdivision/report/pdf`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(buildPlannerPayload())
          })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Unable to download PDF report.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = plannerProject?.id && savedReport?.reportId
        ? `GeoSmart-${plannerProject.code || selectedParcel?.upi?.replaceAll('/', '-') || 'Project'}-Report.pdf`
        : `GeoSmart-Subdivision-${selectedParcel?.upi?.replaceAll('/', '-') || 'Report'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setInfoMessage(plannerProject?.id ? 'Project PDF report downloaded.' : 'PDF compliance report downloaded.')
    } catch (err) {
      setError(err.message || 'Unable to download PDF report.')
    } finally {
      setDownloadingPdf(false)
    }
  }

  const clearSketch = () => {
    setSketchFeatures([])
    setUploadedGeoJsonText('')
    setProposalSource('draw')
    setCheckResult(null)
    setSavedReport(null)
    setPlanningContext(null)
    setError('')
    setInfoMessage('Cleared proposal.')
    setMapResetKey((value) => value + 1)
  }

  const generateSuggestedPlots = async (mode = 'selected') => {
    if (draftingPlots) return
    setError('')
    setInfoMessage('')
    if (!selectedParcel) {
      setError('Select a parcel before generating suggested plots.')
      return
    }
    setDraftingMode(mode)
    setDraftingPlots(true)
    try {
      await new Promise((resolve) => {
        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
          window.requestAnimationFrame(() => resolve())
          return
        }
        setTimeout(resolve, 0)
      })

      let requestedCount = Number(suggestedPlotCount)
      let countNote = ''

      if (mode === 'maximum') {
        const maximum = estimateMaximumDivisiblePlotCount(selectedParcel, context, zoning)
        if (maximum.error) {
          setError(maximum.error)
          return
        }
        if (maximum.count < 2) {
          setError(
            maximum.minimumPlotSizeSqm
              ? `The loaded masterplan rules do not support dividing this parcel into multiple compliant plots. ${maximum.note}`
              : 'The loaded masterplan data does not support a larger compliant subdivision count for this parcel.'
          )
          return
        }
        requestedCount = maximum.count
        countNote = maximum.note
      }

      const primaryResult = buildSuggestedPlots(selectedParcel, requestedCount, context, zoning)
      const result = primaryResult.error
        ? buildFallbackSuggestedPlots(selectedParcel, requestedCount, context, zoning)
        : primaryResult

      if (result.error || !result.collection?.features?.length) {
        setError(result.error || 'The system could not generate a draft for this parcel.')
        return
      }

      const nextGeoJsonText = JSON.stringify(result.collection, null, 2)
      const baseInfoMessage = result.warning
        ? `${result.warning} Run the compliance check to evaluate the generated layout.`
        : `Generated exactly ${result.collection.features.length} clean suggested plot(s) that avoid loaded buildings and constraint zones. Run the compliance check to evaluate them.`
      const nextInfoMessage = mode === 'maximum' && countNote
        ? `${baseInfoMessage} ${countNote}`
        : baseInfoMessage

      setPlanningContext(result.planningContext || null)
      setSketchFeatures([])
      setProposalSource('upload')
      setUploadedGeoJsonText(nextGeoJsonText)
      setCheckResult(null)
      setSavedReport(null)
      await syncProjectDraft(result.collection.features.length)
      setInfoMessage(nextInfoMessage)
      setMapResetKey((value) => value + 1)
    } catch (err) {
      setError(err?.message || 'Draft generation failed unexpectedly for this parcel.')
    } finally {
      setDraftingPlots(false)
      setDraftingMode('selected')
    }
  }

  const layerNotes = layerStatus
    .filter((layer) => layer.notes)
    .map((layer) => `${layer.layerKey}: ${layer.notes}`)

  const smallestPlot = useMemo(() => {
    if (!checkResult?.plots?.length) return null
    return [...checkResult.plots].sort((a, b) => a.areaSqm - b.areaSqm)[0]
  }, [checkResult])

  const largestPlot = useMemo(() => {
    if (!checkResult?.plots?.length) return null
    return [...checkResult.plots].sort((a, b) => b.areaSqm - a.areaSqm)[0]
  }, [checkResult])

  return (
    <div className="space-y-6">
      {/* 1. Page Header */}
      <section className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 blur-3xl pointer-events-none" />
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#E8C46A]">Planning Assistant</p>
        <h1 className="mt-3 text-3xl font-black tracking-[-0.04em] text-white">AI Subdivision Planner</h1>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-white/80">
          Verify parcel splitting eligibility and generate compliant layouts based on masterplan rules, building footprints, and constraints.
        </p>
      </section>

      {/* 2. Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-[#123E36] opacity-60 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B5E34]">Selected Parcel</p>
          <p className="text-2xl font-black text-slate-900 mt-3 font-display tracking-tight">{selectedParcel?.upi || 'N/A'}</p>
          <p className="text-xs text-ink/60 mt-2 font-medium">{selectedParcel ? formatArea(selectedParcel.officialAreaSqm) : 'Search UPI to begin.'}</p>
        </Card>
        
        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B5E34]">Decision Matrix</p>
          <p className={`text-2xl font-black mt-3 font-display tracking-tight ${latestStatus.includes('NOT') ? 'text-danger' : 'text-slate-900'}`}>{latestStatus}</p>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            {checkResult ? `Compliance Score: ${checkResult.complianceScore}/100` : 'Awaiting technical proposal.'}
          </p>
        </Card>

        <Card className="hover:shadow-md transition-all duration-300 border border-slate-200/40 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-600 opacity-60 group-hover:opacity-100 transition-opacity" />
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8B5E34]">Available Land</p>
          <p className="text-2xl font-black text-slate-900 mt-3 font-display tracking-tight">
            {planningContext ? formatArea(planningContext.availableArea) : (selectedParcel ? formatArea(selectedParcel.officialAreaSqm) : 'N/A')}
          </p>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            {planningContext ? `${Math.round((planningContext.availableArea / planningContext.parentArea) * 100)}% of parcel is subdividable.` : 'Loads after generation or check.'}
          </p>
        </Card>
      </div>

      {/* 3. Project Context Banner */}
      {plannerProject && (
        <Card className="border border-emerald-200 bg-emerald-50/30 shadow-sm rounded-2xl relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/4 bg-emerald-500/5 blur-xl pointer-events-none" />
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-700">Project Context</p>
              <h2 className="mt-2 text-xl font-black text-slate-900">{plannerProject.name}</h2>
              <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                This workspace was opened from the project flow. Draft, compliance, and report actions will update the same client project automatically.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-100/50 bg-white/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requested UPI</p>
              <p className="mt-2 font-bold text-slate-900">{plannerProject.requestedUpi || '--'}</p>
            </div>
            <div className="rounded-xl border border-emerald-100/50 bg-white/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Client Parcel Count</p>
              <p className="mt-2 font-bold text-slate-900">{plannerProject.requestedParcelCount || '--'}</p>
            </div>
            <div className="rounded-xl border border-emerald-100/50 bg-white/70 p-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target Land Use</p>
              <p className="mt-2 font-bold text-slate-900">{plannerProject.requestedLandUse || '--'}</p>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Step 1: Selection */}
      <Card title="Step 1: Parcel Selection">
        <div className="grid lg:grid-cols-[1fr_auto] gap-3">
          <Input
            label="Search parent parcel by UPI"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Example: 1/01/05/04/3041"
          />
          <div className="flex items-end">
            <Button type="button" className="w-full lg:w-auto px-6 py-3 font-bold rounded-xl" onClick={runSearch} disabled={searching}>
              {searching ? 'Locating...' : 'Search Registry'}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {searchResults.map((parcel) => (
            <div key={parcel.id} className="rounded-2xl border border-clay/60 bg-white/70 p-5 shadow-sm hover:border-[#123E36]/30 transition-all">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-bold text-slate-900 text-base">{parcel.upi}</p>
                  <p className="text-xs text-ink/60 mt-1.5 font-medium">
                    {parcel.district} &gt; {parcel.sector} &gt; {parcel.cell} • <span className="font-semibold text-slate-700">{formatArea(parcel.officialAreaSqm)}</span>
                  </p>
                </div>
                <Button
                  type="button"
                  className="px-5 py-2.5 font-bold rounded-xl text-xs transition-all shadow-sm"
                  variant={selectedParcelId === parcel.id ? 'primary' : 'secondary'}
                  onClick={() => loadParcelContext(parcel.id)}
                  disabled={loadingContext && selectedParcelId === parcel.id}
                >
                  {selectedParcelId === parcel.id ? 'Active Context' : 'Load Parcel'}
                </Button>
              </div>
            </div>
          ))}
          {!searchResults.length && !searching && (
            <p className="text-xs text-ink/40 uppercase tracking-widest py-2">Enter UPI to start workspace</p>
          )}
        </div>
      </Card>

      {/* 5. Step 2: Workspace */}
      <Card title="Step 2: Planner Workspace">
        <div className="grid xl:grid-cols-[1.25fr_0.75fr] gap-6">
          <div className="space-y-6">
            <div className="flex rounded-2xl border border-clay/60 bg-clay/10 p-1.5 max-w-sm">
              <button
                type="button"
                className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                  proposalSource === 'draw'
                    ? 'bg-white text-[#123E36] shadow-sm'
                    : 'text-ink/60 hover:text-ink'
                }`}
                onClick={() => setProposalSource('draw')}
              >
                Manual Drawing
              </button>
              <button
                type="button"
                className={`flex-1 text-center py-2.5 text-xs font-bold rounded-xl transition-all ${
                  proposalSource === 'upload'
                    ? 'bg-white text-[#123E36] shadow-sm'
                    : 'text-ink/60 hover:text-ink'
                }`}
                onClick={() => setProposalSource('upload')}
              >
                GeoJSON Import
              </button>
            </div>

            <GeoJsonMap
              key={`planner-map-${mapResetKey}-${selectedParcelId || 'none'}`}
              geoJson={layerState.PARCELS ? selectedParcel?.geometryGeoJson : null}
              overlays={overlays}
              onSketchChange={setSketchFeatures}
            />

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs font-bold">
              {Object.keys(DEFAULT_LAYER_STATE).map((key) => {
                const checked = layerState[key]
                return (
                  <label
                    key={key}
                    className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-3 cursor-pointer transition-all ${
                      checked
                        ? 'border-emerald-500 bg-emerald-50/20 text-emerald-800 font-extrabold shadow-sm'
                        : 'border-clay/60 bg-white/50 text-ink/60 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-emerald-600 h-3.5 w-3.5 rounded"
                      checked={checked}
                      onChange={(event) => setLayerState((current) => ({ ...current, [key]: event.target.checked }))}
                    />
                    {layerLabel(key)}
                  </label>
                )
              })}
            </div>

            <div className="rounded-2xl border border-clay/50 bg-white/50 p-6">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-5">Map Legend</p>
              <div className="grid sm:grid-cols-2 gap-5">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.label} className="flex gap-3.5 items-start">
                    <span className={`mt-1 h-4 w-7 shrink-0 rounded-md border-2 shadow-sm ${item.className}`} />
                    <div>
                      <p className="text-xs font-bold text-slate-900 leading-none">{item.label}</p>
                      <p className="text-[10px] leading-relaxed text-ink/55 mt-1.5 font-medium">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[2rem] border border-[#124E44]/20 bg-[#123E36] p-6 text-white shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-emerald-500/10 blur-2xl pointer-events-none" />
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#E8C46A]">Technical Parameters</p>
              
              <label className="block mt-6">
                <span className="text-[10px] font-black text-emerald-200/80 uppercase tracking-wider">Target Land Use</span>
                <select
                  className="w-full mt-2 bg-white/10 border border-white/20 rounded-xl px-3.5 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  value={proposedLandUse}
                  onChange={(event) => setProposedLandUse(event.target.value)}
                >
                  {LAND_USE_OPTIONS.map((option) => (
                    <option className="text-ink" key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-6 p-5 rounded-2xl bg-white/5 border border-white/10">
                <p className="text-[10px] font-black text-emerald-200/80 uppercase tracking-wider mb-4">AI Layout Synthesis</p>
                <div className="grid grid-cols-[1fr_auto] gap-3">
                  <select
                    className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
                    value={suggestedPlotCount}
                    onChange={(event) => setSuggestedPlotCount(Number(event.target.value))}
                  >
                    {SUGGESTED_PLOT_COUNTS.map((count) => (
                      <option className="text-ink" key={count} value={count}>
                        {count} {count === 1 ? 'Plot' : 'Plots'}
                      </option>
                    ))}
                  </select>
                  <Button type="button" className="bg-[#10B981] hover:bg-[#10B981]/90 text-white border-none shadow-md font-bold px-5 rounded-xl" onClick={() => generateSuggestedPlots('selected')} disabled={!selectedParcel || draftingPlots}>
                    {draftingPlots && draftingMode === 'selected' ? 'Drafting...' : 'Draft'}
                  </Button>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3 w-full border-white/15 bg-white/10 text-white font-bold hover:bg-white/15 rounded-xl py-2.5 text-xs"
                  onClick={() => generateSuggestedPlots('maximum')}
                  disabled={!selectedParcel || draftingPlots}
                >
                  {draftingPlots && draftingMode === 'maximum' ? 'Calculating Maximum...' : 'All Possible By Masterplan'}
                </Button>
                <p className="mt-4 text-[10px] leading-relaxed text-white/60 font-medium">
                  The main draft tries to keep plots balanced and visually cleaner. The masterplan option derives the highest divisible count from the loaded zoning rules and developable land.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              <Button type="button" className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white border-none rounded-xl shadow-lg font-black text-sm tracking-wide transition-all duration-200" onClick={runComplianceCheck} disabled={runningCheck || !selectedParcelId}>
                {runningCheck ? 'Processing...' : plannerProject?.id ? 'Run Compliance Check And Update Project' : 'Run Compliance Check'}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button type="button" variant="secondary" className="font-bold rounded-xl py-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100" onClick={clearSketch}>Purge Proposal</Button>
                <Button type="button" variant="secondary" className="font-bold rounded-xl py-3 text-xs" onClick={generateReport} disabled={savingReport || !selectedParcelId}>
                  {savingReport ? 'Generating...' : plannerProject?.id ? 'Generate Project Report' : 'Save Record'}
                </Button>
              </div>
              <Button type="button" variant="secondary" className="w-full py-3 border border-emerald-200 hover:bg-emerald-50/20 text-emerald-700 font-bold rounded-xl text-xs" onClick={downloadPdfReport} disabled={downloadingPdf || !selectedParcelId}>
                {downloadingPdf ? 'Exporting...' : plannerProject?.id ? 'Download Project PDF' : 'Download PDF Dossier'}
              </Button>
            </div>

            <div className="rounded-2xl border border-clay/60 bg-white/50 p-6 space-y-4 shadow-sm">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Proposal Metadata</p>
              <div className="space-y-2.5 text-xs text-ink/70">
                <p className="flex justify-between border-b border-clay/40 pb-2">
                  <span>Context Status:</span>
                  <span className={`font-bold ${selectedParcel ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {selectedParcel ? 'Active Context' : 'Waiting for selection'}
                  </span>
                </p>
                <p className="flex justify-between border-b border-clay/40 pb-2">
                  <span>Plots Detected:</span>
                  <span className="font-bold text-slate-900">{activeProposal.plots.length}</span>
                </p>
                {activeProposal.error && (
                  <p className="text-xs text-red-600 font-bold bg-red-50 p-2 rounded-lg border border-red-100 mt-2">
                    {activeProposal.error}
                  </p>
                )}
              </div>
              <label className="block border-t border-clay/40 pt-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Paste GeoJSON Proposal</span>
                <textarea
                  className="input mt-2 min-h-[120px] font-mono text-[10px] leading-relaxed rounded-xl border border-clay/60 bg-white/70 focus:bg-white"
                  value={uploadedGeoJsonText}
                  onChange={(event) => setUploadedGeoJsonText(event.target.value)}
                  placeholder='{"type":"FeatureCollection","features":[]}'
                />
              </label>
            </div>
          </div>
        </div>
      </Card>

      {/* 6. Alerts Area */}
      {(error || infoMessage) && (
        <div className={`rounded-2xl border p-5 shadow-sm flex items-start gap-4 ${
          error 
            ? 'border-red-200 bg-red-50/50 text-red-800' 
            : 'border-emerald-200 bg-emerald-50/50 text-emerald-800'
        }`}>
          <span className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${error ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {error ? (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4.5 w-4.5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            )}
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">{error ? 'Attention Required' : 'Action Succeeded'}</p>
            <p className="text-xs mt-1 text-ink/75 leading-relaxed font-medium">{error || infoMessage}</p>
          </div>
        </div>
      )}

      {/* 7. Compliance Results summary */}
      {checkResult && (
        <>
          <Card title="Compliance Explanation Summary">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-5 rounded-2xl border border-clay/60 bg-white/70 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Verdict</p>
                 <p className="text-xl font-black text-slate-900 mt-2 font-display">{checkResult.recommendation}</p>
                 <p className="text-xs text-ink/60 mt-1.5">Rule-based preliminary check</p>
              </div>
              <div className="p-5 rounded-2xl border border-clay/60 bg-white/70 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Parcel Utilization</p>
                 <p className="text-xl font-black text-slate-900 mt-2 font-display">{Math.round((checkResult.proposedAreaSqm / checkResult.parentAreaSqm) * 100)}%</p>
                 <p className="text-xs text-ink/60 mt-1.5">Coverage of subdividable land</p>
              </div>
              <div className="p-5 rounded-2xl border border-clay/60 bg-white/70 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Plot Distribution</p>
                 <p className="text-xl font-black text-slate-900 mt-2 font-display">{activeProposal.plots.length} Plots</p>
                 <p className="text-xs text-ink/60 mt-1.5">Range: {formatArea(smallestPlot?.areaSqm || 0)} - {formatArea(largestPlot?.areaSqm || 0)}</p>
              </div>
              <div className="p-5 rounded-2xl border border-clay/60 bg-white/70 shadow-sm">
                 <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avoidance Audit</p>
                 <p className="text-xl font-black text-success mt-2 font-display">CLEAN</p>
                 <p className="text-xs text-ink/60 mt-1.5">Constraints & buildings respected</p>
              </div>
            </div>
            
            <div className="mt-6 p-6 rounded-2xl bg-[#123E36]/5 border border-[#123E36]/10">
               <div className="flex gap-4 items-start">
                  <div className="h-10 w-10 shrink-0 rounded-xl bg-[#123E36] flex items-center justify-center text-white shadow-sm">
                     <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink">{checkResult.complianceScore >= 80 ? 'Safe for professional review' : 'Correction recommended'}</p>
                    <p className="text-xs text-ink/65 mt-1 leading-relaxed font-medium">
                      {checkResult.complianceScore >= 80 
                        ? `The proposal for ${activeProposal.plots.length} plot(s) follows masterplan zoning and avoids known spatial constraints. This result supports a formal cadastral survey submission.`
                        : `The proposal has technical issues. Review the improvement tips below to align the plots with Kigali Masterplan regulations and parcel constraints.`}
                    </p>
                  </div>
               </div>
            </div>
          </Card>

          <Card title="How To Improve Result">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {improvementTips(checkResult).map((tip) => (
                <div key={tip.title} className="rounded-2xl border border-clay/60 bg-white/70 p-5 shadow-sm hover:shadow-md transition-all group hover:border-emerald-500/30">
                  <p className="font-bold text-ink text-sm font-display group-hover:text-emerald-700 transition-colors">{tip.title}</p>
                  <p className="text-xs text-ink/60 mt-3 leading-relaxed font-medium">{tip.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Check Breakdown">
            <div className="grid gap-3">
              {checkResult.checks.map((check) => (
                <div key={check.code} className="rounded-2xl border border-clay/60 bg-white/50 p-5 transition-all hover:bg-white hover:shadow-md group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-bold text-ink text-sm group-hover:text-emerald-700 transition-colors">{check.label}</p>
                      <p className="text-[10px] text-ink/40 mt-1 uppercase tracking-widest">{check.code}</p>
                      <p className="text-xs text-ink/60 mt-3 leading-relaxed font-medium">{check.detail}</p>
                    </div>
                    <span className={`status-badge shrink-0 ${statusPill(check.status)}`}>
                      <span className={`status-dot dot-${check.status === 'PASS' ? 'success' : check.status === 'WARN' ? 'warning' : 'danger'}`} />
                      {check.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {savedReport && (
        <Card title="Synthesis Archive" premium>
          <div className="rounded-2xl border border-clay/60 bg-white p-6">
            <div className="flex items-center gap-3 mb-6">
               <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-black uppercase tracking-widest">Active Record</span>
               <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">#{savedReport.reportId} | {savedReport.createdAt}</span>
            </div>
            <textarea
              className="input min-h-[400px] font-mono text-[11px] leading-relaxed bg-slate-50/50"
              value={savedReport.reportMarkdown}
              readOnly
            />
          </div>
        </Card>
      )}
    </div>
  )
}
