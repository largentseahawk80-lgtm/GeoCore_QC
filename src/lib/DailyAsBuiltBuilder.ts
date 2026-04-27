// =====================================================
// LINERSYNC SUPER APP
// CHUNK 5F — DAILY AS-BUILT BUILDER
// =====================================================
// Purpose:
// Build a daily summary from saved QC records without the field tech
// manually copying the same data into another sheet.

import { RECORD_TYPES } from './LinerSyncDataModel'

export type QCRecordsByType = Record<string, Record<string, any>[]>

function dateOnly(value: any) {
  if (!value) return ''
  const raw = String(value)
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  const parsed = new Date(raw)
  if (Number.isNaN(parsed.getTime())) return raw
  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function recordDate(record: Record<string, any>) {
  return dateOnly(
    record.placementDate ||
      record.weldDate ||
      record.testDate ||
      record.destructiveDate ||
      record.dateRepaired ||
      record.reportDate ||
      record.date ||
      record._savedAt ||
      record.createdAt,
  )
}

function matchesDate(record: Record<string, any>, reportDate: string) {
  return recordDate(record) === dateOnly(reportDate)
}

function label(record: Record<string, any>, keys: string[], fallback: string) {
  const parts = keys.map((key) => record[key]).filter(Boolean)
  return parts.length ? parts.join(' | ') : fallback
}

function hasFailure(record: Record<string, any>) {
  const values = [record.passFail, record.testResult, record.labResult, record.status, record.rollStatus]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())

  return values.some((value) => value.includes('fail') || value.includes('reject') || value.includes('open'))
}

function gpsLabel(record: Record<string, any>) {
  if (record.gpsLatitude && record.gpsLongitude) return `${record.gpsLatitude}, ${record.gpsLongitude}`
  if (record.gps) return String(record.gps)
  if (record.seamStartLocation) return String(record.seamStartLocation)
  if (record.seamEndLocation) return String(record.seamEndLocation)
  return ''
}

function photosFor(record: Record<string, any>) {
  const found: string[] = []
  if (Array.isArray(record.photos)) found.push(...record.photos.filter(Boolean))
  if (record.rollTagPhoto) found.push(String(record.rollTagPhoto))
  if (record.photoBefore) found.push(String(record.photoBefore))
  if (record.photoAfter) found.push(String(record.photoAfter))
  return found
}

export function buildDailyAsBuilt(records: QCRecordsByType, reportDate: string, existing: Record<string, any> = {}) {
  const panelRows = (records[RECORD_TYPES.PANEL_PLACEMENT] || []).filter((row) => matchesDate(row, reportDate))
  const wedgeRows = (records[RECORD_TYPES.WEDGE_WELDING] || []).filter((row) => matchesDate(row, reportDate))
  const weldTestRows = (records[RECORD_TYPES.WELD_TEST] || []).filter((row) => matchesDate(row, reportDate))
  const airRows = (records[RECORD_TYPES.AIR_TEST] || []).filter((row) => matchesDate(row, reportDate))
  const destructiveRows = (records[RECORD_TYPES.DESTRUCTIVE_TEST] || []).filter((row) => matchesDate(row, reportDate))
  const vacuumRows = (records[RECORD_TYPES.VACUUM_TEST] || []).filter((row) => matchesDate(row, reportDate))

  const allRows = [...panelRows, ...wedgeRows, ...weldTestRows, ...airRows, ...destructiveRows, ...vacuumRows]

  const panelsPlacedToday = panelRows.map((row) => label(row, ['panelNumber', 'rollNumber', 'panelWidth', 'panelLength'], 'Panel'))
  const seamsWeldedToday = wedgeRows.map((row) => label(row, ['seamNumber', 'seamerInitials', 'machineNumber', 'temperatureSetting', 'speedSetting'], 'Wedge weld'))
  const weldTestsToday = weldTestRows.map((row) => label(row, ['seamNumber', 'welderInitials', 'testResult'], 'Weld test'))
  const airTestsToday = airRows.map((row) => label(row, ['seamNumber', 'startingPressure', 'endingPressure', 'pressureDrop', 'passFail'], 'Air test'))
  const destructiveTestsToday = destructiveRows.map((row) => label(row, ['dtNumber', 'seamNumber', 'welderInitials', 'passFail'], 'Destructive test'))
  const vacuumRepairsToday = vacuumRows.map((row) => label(row, ['repairNumber', 'seamLocation', 'typeOfRepair', 'passFail'], 'Vacuum repair'))
  const openFailedItems = allRows.filter(hasFailure).map((row) => label(row, ['recordType', 'seamNumber', 'panelNumber', 'repairNumber', 'dtNumber', 'passFail', 'testResult', 'status'], 'Open item'))
  const photosToday = allRows.flatMap(photosFor)
  const gpsPointsToday = allRows.map(gpsLabel).filter(Boolean)

  const dailySummary = [
    `${panelsPlacedToday.length} panels placed`,
    `${seamsWeldedToday.length} seams welded`,
    `${weldTestsToday.length} weld tests`,
    `${airTestsToday.length} air tests`,
    `${destructiveTestsToday.length} destructive tests`,
    `${vacuumRepairsToday.length} vacuum repairs`,
    `${openFailedItems.length} open/failed items`,
  ].join(' | ')

  return {
    ...existing,
    reportDate: dateOnly(reportDate),
    panelsPlacedToday,
    seamsWeldedToday,
    weldTestsToday,
    airTestsToday,
    destructiveTestsToday,
    vacuumRepairsToday,
    openFailedItems,
    photosToday,
    gpsPointsToday,
    dailySummary,
    readyForExport: openFailedItems.length === 0,
    updatedAt: new Date().toISOString(),
  }
}

export default buildDailyAsBuilt
