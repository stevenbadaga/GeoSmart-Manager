import React, { useEffect, useMemo, useState } from 'react'
import * as turf from '@turf/turf'
import Card from '../components/Card'
import Button from '../components/Button'
import Input from '../components/Input'
import GeoJsonMap from '../components/GeoJsonMap'
import TopNavTabs from '../components/TopNavTabs'
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
  return id.replace(/^suggested-(\d+)$/i, 's$1')
}

function buildSuggestedPlots(parcel, count = 3, context = null, zoning = []) {
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
        id: `s${features.length + 1}`,
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
      : '',
    collection: featureCollection(features)
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
  const [error, setError] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [mapResetKey, setMapResetKey] = useState(1)

  useEffect(() => {
    api.get('/api/layers/status')
      .then(setLayerStatus)
      .catch((err) => setError(err.message || 'Unable to load GIS layer status.'))
  }, [])

  const activeProposal = useMemo(() => {
    const drawn = proposalSource === 'draw'
      ? { type: 'FeatureCollection', features: sketchFeatures }
      : uploadedGeoJsonText
    return classifyProposal(drawn)
  }, [proposalSource, sketchFeatures, uploadedGeoJsonText])

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

    if (proposalSource === 'upload' && activeProposal.proposal) {
      items.push({
        id: 'proposal_preview',
        data: activeProposal.proposal,
        style: LAYER_STYLE.proposal_preview,
        showLabels: true,
        labelFn: proposalLabel
      })
    }
    return items
  }, [context, layerState, proposalSource, activeProposal])

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

  const loadParcelContext = async (parcelId) => {
    setSelectedParcelId(parcelId)
    setLoadingContext(true)
    setError('')
    setInfoMessage('')
    setCheckResult(null)
    setSavedReport(null)
    setMapResetKey((value) => value + 1)
    setSketchFeatures([])
    try {
      const parcelContext = await api.get(`/api/parcels/${parcelId}/context`)
      const recommendedUse = recommendedLandUseForZoning(parcelContext.zoning || [])
      setContext(parcelContext)
      setProposedLandUse(recommendedUse)
      setInfoMessage(
        recommendedUse
          ? `Loaded parcel ${parcelContext.parcel.upi}. Suggested land use was set automatically from the primary zoning.`
          : `Loaded parcel ${parcelContext.parcel.upi}. No safe automatic land-use suggestion was found for this zoning.`
      )
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
      const result = await api.post('/api/subdivision/check', {
        parcelId: selectedParcelId,
        proposalGeoJson: JSON.stringify(activeProposal.proposal),
        proposedLandUse: proposedLandUse || null
      })
      setCheckResult(result)
      setSavedReport(null)
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
      const report = await api.post('/api/subdivision/report', {
        parcelId: selectedParcelId,
        proposalGeoJson: JSON.stringify(activeProposal.proposal),
        proposedLandUse: proposedLandUse || null
      })
      setSavedReport(report)
      setCheckResult(report.report)
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
      const response = await fetch(`${API_URL}/api/subdivision/report/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          parcelId: selectedParcelId,
          proposalGeoJson: JSON.stringify(activeProposal.proposal),
          proposedLandUse: proposedLandUse || null
        })
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || 'Unable to download PDF report.')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `GeoSmart-Subdivision-${selectedParcel?.upi?.replaceAll('/', '-') || 'Report'}.pdf`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setInfoMessage('PDF compliance report downloaded.')
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
    setError('')
    setInfoMessage('Cleared the current drawn, uploaded, or generated proposal.')
    setMapResetKey((value) => value + 1)
  }

  const generateSuggestedPlots = () => {
    if (!selectedParcel) {
      setError('Select a parcel before generating suggested plots.')
      return
    }
    const result = buildSuggestedPlots(selectedParcel, Number(suggestedPlotCount), context, zoning)
    if (result.error) {
      setError(result.error)
      return
    }
    if (!proposedLandUse && zoning.some((zone) => ['R1', 'R1A', 'R1B', 'R2', 'R3'].includes(zone.zoneCode))) {
      setProposedLandUse('Row housing')
    }
    setSketchFeatures([])
    setMapResetKey((value) => value + 1)
    setProposalSource('upload')
    setUploadedGeoJsonText(JSON.stringify(result.collection, null, 2))
    setCheckResult(null)
    setSavedReport(null)
    setError('')
    setInfoMessage(
      result.warning
        ? `${result.warning} Run the compliance check to evaluate the generated layout.`
        : `Generated exactly ${result.collection.features.length} clean suggested plot(s) that avoid loaded buildings and constraint zones. Run the compliance check to evaluate them.`
    )
  }

  const layerNotes = layerStatus
    .filter((layer) => layer.notes)
    .map((layer) => `${layer.layerKey}: ${layer.notes}`)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-ink/40">Subdivision Planner</p>
        <h1 className="text-2xl font-semibold text-ink mt-2">GeoSmart Manager Real Parcel Planner</h1>
        <p className="text-sm text-ink/60 mt-2">
          This planner uses the real Kigali parcels, masterplan, administrative boundaries, building footprints,
          DEM metadata, and zoning-regulations PDF inspected from the local Requested Data folder.
        </p>
      </div>

      <TopNavTabs className="mt-1" size="sm" />

      <div className="grid md:grid-cols-3 gap-4">
        <Card className="p-4">
          <p className="text-xs text-ink/50">Selected Parcel</p>
          <p className="text-lg font-semibold text-ink mt-2">{selectedParcel?.upi || '--'}</p>
          <p className="text-xs text-ink/60 mt-2">{selectedParcel ? formatArea(selectedParcel.officialAreaSqm) : 'Search and select a Kigali parcel.'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Intersecting Zones</p>
          <p className="text-lg font-semibold text-ink mt-2">{zoning.length || 0}</p>
          <p className="text-xs text-ink/60 mt-2">{zoning[0]?.zoneCode ? `Primary zone ${zoning[0].zoneCode}` : 'No zoning loaded yet.'}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-ink/50">Latest Recommendation</p>
          <p className="text-lg font-semibold text-ink mt-2">{latestStatus}</p>
          <p className="text-xs text-ink/60 mt-2">
            {checkResult ? `${checkResult.checks.length} checks evaluated | Score ${checkResult.complianceScore}/100` : 'No compliance check yet.'}
          </p>
        </Card>
      </div>

      <Card title="Parcel Search">
        <div className="grid lg:grid-cols-[1fr_auto] gap-3">
          <Input
            label="Search parent parcel by UPI"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Example: 1/01/05/04/3041"
          />
          <div className="flex items-end">
            <Button type="button" className="w-full lg:w-auto" onClick={runSearch} disabled={searching}>
              {searching ? 'Searching...' : 'Search Parcel'}
            </Button>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {searchResults.map((parcel) => (
            <div key={parcel.id} className="rounded-xl border border-clay/60 bg-white/70 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">{parcel.upi}</p>
                  <p className="text-xs text-ink/60 mt-1">
                    {parcel.province}, {parcel.district}, {parcel.sector}, {parcel.cell}, {parcel.village}
                  </p>
                  <p className="text-xs text-ink/60 mt-1">
                    Area {formatArea(parcel.officialAreaSqm)} | Status {parcel.status || 'N/A'} | Accuracy {parcel.accuracy || 'N/A'}
                    {parcel.duplicateUpiCount > 1 ? ` | Duplicate UPI entries ${parcel.duplicateUpiCount}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={selectedParcelId === parcel.id ? 'primary' : 'secondary'}
                  onClick={() => loadParcelContext(parcel.id)}
                  disabled={loadingContext && selectedParcelId === parcel.id}
                >
                  {selectedParcelId === parcel.id ? 'Selected' : 'Use Parcel'}
                </Button>
              </div>
            </div>
          ))}
          {!searchResults.length && !searching && (
            <p className="text-sm text-ink/60">Search results will appear here.</p>
          )}
        </div>
      </Card>

      {selectedParcel && (
        <Card title="Parcel And Zoning Summary">
          <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
            <div className="rounded-xl border border-clay/60 bg-white/70 p-4 text-sm text-ink/70">
              <p className="font-semibold text-ink">Parent Parcel</p>
              <p className="mt-2">UPI: {selectedParcel.upi}</p>
              <p>Area: {formatArea(selectedParcel.officialAreaSqm)}</p>
              <p>Province: {selectedParcel.province}</p>
              <p>District: {selectedParcel.district}</p>
              <p>Sector: {selectedParcel.sector}</p>
              <p>Cell: {selectedParcel.cell}</p>
              <p>Village: {selectedParcel.village}</p>
              <p>Status / Accuracy: {selectedParcel.status || 'N/A'} / {selectedParcel.accuracy || 'N/A'}</p>
            </div>

            <div className="space-y-3">
              {zoning.map((zone) => (
                <div key={`${zone.zoneId}-${zone.zoneCode}`} className="rounded-xl border border-clay/60 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{zone.zoneCode} - {zone.rule?.displayName || zone.zoning}</p>
                      <p className="text-xs text-ink/60 mt-1">{zone.genLu} | {formatArea(zone.overlapAreaSqm)} overlap</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${ruleStatusTone(zone.rule?.subdivisionStatus)}`}>
                      {zone.rule?.subdivisionStatus || 'NEEDS_REVIEW'}
                    </span>
                  </div>
                  <p className="text-sm text-ink/70 mt-3">{zone.rule?.subdivisionGuidance || zone.zoning}</p>
                  <p className="text-xs text-ink/60 mt-2">
                    Lot-size rule:
                    {' '}
                    {zone.rule?.minimumLotSizeSqm ? `min ${formatArea(zone.rule.minimumLotSizeSqm)}` : 'no explicit minimum'}
                    {' / '}
                    {zone.rule?.maximumLotSizeSqm ? `max ${formatArea(zone.rule.maximumLotSizeSqm)}` : 'no explicit maximum'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      <Card title="Planner Workspace">
        <div className="grid xl:grid-cols-[1.25fr_0.75fr] gap-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="proposalSource"
                  checked={proposalSource === 'draw'}
                  onChange={() => setProposalSource('draw')}
                />
                Draw proposed plots
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="radio"
                  name="proposalSource"
                  checked={proposalSource === 'upload'}
                  onChange={() => setProposalSource('upload')}
                />
                Upload or paste GeoJSON
              </label>
            </div>

            <GeoJsonMap
              key={`planner-map-${mapResetKey}-${selectedParcelId || 'none'}`}
              geoJson={layerState.PARCELS ? selectedParcel?.geometryGeoJson : null}
              overlays={overlays}
              onSketchChange={setSketchFeatures}
            />

            <div className="grid md:grid-cols-5 gap-3 text-xs text-ink/70">
              {Object.keys(DEFAULT_LAYER_STATE).map((key) => (
                <label key={key} className="inline-flex items-center gap-2 rounded-lg border border-clay/60 bg-white/70 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={layerState[key]}
                    onChange={(event) => setLayerState((current) => ({ ...current, [key]: event.target.checked }))}
                  />
                  {layerLabel(key)}
                </label>
              ))}
            </div>

            <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-ink">Map Legend</p>
                  <p className="text-xs text-ink/60 mt-1">Visible layer meanings for subdivision review.</p>
                </div>
                <span className="rounded-full border border-clay/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-ink/50">
                  GIS Layers
                </span>
              </div>
              <div className="mt-4 grid sm:grid-cols-2 gap-3">
                {LEGEND_ITEMS.map((item) => (
                  <div key={item.label} className="flex gap-3 rounded-lg border border-clay/50 bg-clay/10 p-3">
                    <span className={`mt-1 h-4 w-7 shrink-0 rounded-sm border-2 ${item.className}`} />
                    <div>
                      <p className="text-xs font-semibold text-ink">{item.label}</p>
                      <p className="text-[11px] leading-5 text-ink/60 mt-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 grid sm:grid-cols-3 gap-2">
                {RESULT_LEGEND.map((item) => (
                  <div key={item.label} className="rounded-lg border border-clay/50 bg-white/70 p-3">
                    <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-semibold ${item.className}`}>
                      {item.label}
                    </span>
                    <p className="text-[11px] leading-5 text-ink/60 mt-2">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-clay/60 bg-white/70 p-4 text-sm text-ink/70">
              <p className="font-semibold text-ink">How To Use The Planner</p>
              <p className="mt-2">1. Search a parent parcel by UPI and click Use Parcel.</p>
              <p>2. The system loads the parcel, zoning, buildings, constraints, and suggested land use automatically.</p>
              <p>3. Draw plots, upload GeoJSON, or generate suggested plots from the selected parcel.</p>
              <p>4. Run the compliance check and review pass, warning, and fail results.</p>
              <p>5. Use the improvement tips and download the report for presentation or review.</p>
              <p className="mt-2 text-xs">
                This is a preliminary planner. Road access and official approval still need surveyor or authority confirmation.
              </p>
            </div>

            <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
              <label className="block mb-4">
                <span className="text-sm font-medium text-ink/80">Proposed land use</span>
                <select
                  className="input mt-2"
                  value={proposedLandUse}
                  onChange={(event) => setProposedLandUse(event.target.value)}
                >
                  {LAND_USE_OPTIONS.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-xs text-ink/55">
                  Automatically suggested from the selected parcel zoning. You can change it before running the check.
                </span>
              </label>

              <div className="mb-4 rounded-xl border border-clay/60 bg-clay/10 p-3">
                <p className="text-sm font-medium text-ink/80">Suggested subdivision</p>
                <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                  <select
                    className="input"
                    value={suggestedPlotCount}
                    onChange={(event) => setSuggestedPlotCount(Number(event.target.value))}
                  >
                    {SUGGESTED_PLOT_COUNTS.map((count) => (
                      <option key={count} value={count}>
                        {count} suggested {count === 1 ? 'plot' : 'plots'}
                      </option>
                    ))}
                  </select>
                  <Button type="button" variant="secondary" onClick={generateSuggestedPlots} disabled={!selectedParcel}>
                    Generate
                  </Button>
                </div>
                <p className="mt-2 text-xs text-ink/55">
                  Creates draft GeoJSON plots that stay inside the parcel and avoid loaded buildings and constraint zones.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={clearSketch}>Reset Sketch</Button>
                <Button type="button" onClick={runComplianceCheck} disabled={runningCheck || !selectedParcelId}>
                  {runningCheck ? 'Running Check...' : 'Run Compliance Check'}
                </Button>
              </div>

              <label className="block mt-4">
                <span className="text-sm font-medium text-ink/80">Upload proposal GeoJSON</span>
                <input className="input mt-2" type="file" accept=".geojson,.json" onChange={handleUploadFile} />
              </label>

              <label className="block mt-4">
                <span className="text-sm font-medium text-ink/80">Paste proposal GeoJSON</span>
                <textarea
                  className="input mt-2 min-h-[220px] font-mono text-xs"
                  value={uploadedGeoJsonText}
                  onChange={(event) => setUploadedGeoJsonText(event.target.value)}
                  placeholder='{"type":"FeatureCollection","features":[...]}'
                />
              </label>

              <div className="mt-4 rounded-xl border border-clay/60 bg-clay/10 p-3 text-xs text-ink/70">
                <p>Proposal source: {proposalSource === 'draw' ? 'Map drawing' : 'Uploaded or pasted GeoJSON'}</p>
                <p>Polygon plots detected: {activeProposal.plots.length}</p>
                {activeProposal.error && <p className="text-danger mt-2">{activeProposal.error}</p>}
              </div>

              <Button type="button" className="w-full mt-4" onClick={generateReport} disabled={savingReport || !selectedParcelId}>
                {savingReport ? 'Generating Report...' : 'Generate Report'}
              </Button>
              <Button type="button" variant="secondary" className="w-full mt-3" onClick={downloadPdfReport} disabled={downloadingPdf || !selectedParcelId}>
                {downloadingPdf ? 'Downloading PDF...' : 'Download PDF Report'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {(error || infoMessage) && (
        <Card className={error ? 'border border-danger/30 bg-danger/5' : 'border border-success/20 bg-success/5'}>
          {error && <p className="text-sm text-danger">{error}</p>}
          {!error && infoMessage && <p className="text-sm text-success">{infoMessage}</p>}
        </Card>
      )}

      {(contextWarnings.length > 0 || layerNotes.length > 0) && (
        <Card title="Layer Notes">
          <div className="space-y-2 text-sm text-ink/70">
            {contextWarnings.map((warning) => (
              <p key={warning}>- {warning}</p>
            ))}
            {layerNotes.map((note) => (
              <p key={note}>- {note}</p>
            ))}
          </div>
        </Card>
      )}

      {checkResult && (
        <>
          <Card title="Compliance Summary">
            <div className="grid md:grid-cols-5 gap-4">
              <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Recommendation</p>
                <p className="text-lg font-semibold text-ink mt-2">{checkResult.recommendation}</p>
              </div>
              <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Compliance Score</p>
                <p className={`text-lg font-semibold mt-2 ${scoreTone(checkResult.complianceScore)}`}>
                  {checkResult.complianceScore}/100
                </p>
              </div>
              <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Parent Area</p>
                <p className="text-lg font-semibold text-ink mt-2">{formatArea(checkResult.parentAreaSqm)}</p>
              </div>
              <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Proposed Area</p>
                <p className="text-lg font-semibold text-ink mt-2">{formatArea(checkResult.proposedAreaSqm)}</p>
              </div>
              <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
                <p className="text-xs text-ink/50">Area Delta</p>
                <p className="text-lg font-semibold text-ink mt-2">{formatArea(checkResult.areaDeltaSqm)}</p>
              </div>
            </div>
            <p className="text-xs text-ink/60 mt-4">{checkResult.disclaimer}</p>
          </Card>

          <Card title="How To Improve This Result">
            <div className="grid md:grid-cols-2 gap-3">
              {improvementTips(checkResult).map((tip) => (
                <div key={tip.title} className="rounded-xl border border-clay/60 bg-white/70 p-4">
                  <p className="font-semibold text-ink">{tip.title}</p>
                  <p className="text-sm text-ink/70 mt-2">{tip.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Checks">
            <div className="space-y-3">
              {checkResult.checks.map((check) => (
                <div key={check.code} className="rounded-xl border border-clay/60 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">{check.label}</p>
                      <p className="text-xs text-ink/50 mt-1">{check.code}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusPill(check.status)}`}>
                      {check.status}
                    </span>
                  </div>
                  <p className="text-sm text-ink/70 mt-3">{check.detail}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Plot Results">
            <div className="space-y-3">
              {checkResult.plots.map((plot) => (
                <div key={`${plot.plotNumber}-${plot.featureId}`} className="rounded-xl border border-clay/60 bg-white/70 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-ink">Plot {plot.plotNumber}</p>
                      <p className="text-xs text-ink/50 mt-1">{plot.featureId}</p>
                    </div>
                    <span className={`rounded-full px-2 py-1 text-xs ${statusPill(plot.status)}`}>
                      {plot.status}
                    </span>
                  </div>
                  <div className="grid md:grid-cols-3 gap-3 mt-3 text-sm text-ink/70">
                    <p>Area: {formatArea(plot.areaSqm)}</p>
                    <p>Inside parent: {plot.insideParent ? 'Yes' : 'No'}</p>
                    <p>Road access: {plot.roadAccessPass ? 'Detected' : 'Needs review'}</p>
                    <p>Lot size: {plot.lotSizePass ? 'Pass' : 'Review / fail'}</p>
                    <p>Building split: {plot.buildingSplit ? 'Yes' : 'No'}</p>
                    <p>Slope overlap: {plot.slopeRestricted ? 'Yes' : 'No'}</p>
                  </div>
                  <p className="text-sm text-ink/70 mt-2">Zones: {plot.zoneCodes.join(', ') || 'None detected'}</p>
                  <p className="text-sm text-ink/70 mt-1">
                    Restricted overlaps: {plot.restrictedOverlaps.length ? plot.restrictedOverlaps.join(', ') : 'None'}
                  </p>
                  {!!plot.notes.length && (
                    <div className="mt-3 space-y-1 text-sm text-ink/70">
                      {plot.notes.map((note) => <p key={note}>- {note}</p>)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {savedReport && (
        <Card title="Generated Report">
          <div className="rounded-xl border border-clay/60 bg-white/70 p-4">
            <p className="text-sm text-ink/70">
              Proposal #{savedReport.proposalId} | Report #{savedReport.reportId} | {savedReport.createdAt}
            </p>
            <textarea
              className="input mt-4 min-h-[360px] font-mono text-xs"
              value={savedReport.reportMarkdown}
              readOnly
            />
          </div>
        </Card>
      )}
    </div>
  )
}
