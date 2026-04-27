// =====================================================
// LINERSYNC SUPER APP
// CHUNK 5C / 5E — QC FORM REGISTRY
// =====================================================
// Purpose:
// One locked list of every active QC form and every visible field.
// The app UI renders forms from this registry so fields do not get lost.

import {
  RECORD_TYPES,
  MATERIAL_OPTIONS,
  THICKNESS_OPTIONS,
  SURFACE_TYPE_OPTIONS,
} from './LinerSyncDataModel'

export type FieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'time'
  | 'textarea'
  | 'select'
  | 'checkbox'
  | 'photo'
  | 'gps'
  | 'readonly'

export type QCField = {
  key: string
  label: string
  type: FieldType
  required?: boolean
  autoFill?: boolean
  options?: readonly string[]
  placeholder?: string
  helper?: string
}

export type QCFormDefinition = {
  recordType: string
  title: string
  actionLabel: string
  primaryField: string
  summaryFields: string[]
  fields: QCField[]
}

export const PASS_FAIL_OPTIONS = ['Pass', 'Fail'] as const
export const PASS_FAIL_TRIAL_OPTIONS = ['Pass', 'Fail', 'Trial'] as const
export const ROLL_STATUS_OPTIONS = ['Unused', 'Active', 'Used', 'Rejected'] as const
export const REPAIR_TYPE_OPTIONS = ['Patch', 'Bead', 'Cap Strip', 'Extrusion Repair', 'Other'] as const
export const RETEST_OPTIONS = ['No', 'Yes'] as const

export const PROJECT_SETUP_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.PROJECT_PROFILE,
  title: 'Project Setup',
  actionLabel: 'Save Project Setup',
  primaryField: 'projectName',
  summaryFields: ['projectName', 'siteName', 'pondCellArea', 'material', 'thickness', 'surfaceType'],
  fields: [
    { key: 'company', label: 'Company', type: 'text', required: true, autoFill: true },
    { key: 'projectName', label: 'Project Name', type: 'text', required: true, autoFill: true },
    { key: 'siteName', label: 'Site / Location', type: 'text', required: true, autoFill: true },
    { key: 'pondCellArea', label: 'Pond / Cell / Area', type: 'text', autoFill: true },
    { key: 'clientOwner', label: 'Client / Owner', type: 'text', autoFill: true },
    { key: 'contractorInstaller', label: 'Contractor / Installer', type: 'text', autoFill: true },
    { key: 'qcTech', label: 'QC Tech', type: 'text', autoFill: true },
    { key: 'superintendent', label: 'Superintendent', type: 'text', autoFill: true },
    { key: 'projectAddress', label: 'Project Address', type: 'text', autoFill: true },
    { key: 'projectPhone', label: 'Project Phone', type: 'text', autoFill: true },
    { key: 'material', label: 'Material', type: 'select', required: true, autoFill: true, options: MATERIAL_OPTIONS },
    { key: 'thickness', label: 'Thickness', type: 'select', required: true, autoFill: true, options: THICKNESS_OPTIONS },
    { key: 'surfaceType', label: 'Surface Type', type: 'select', autoFill: true, options: SURFACE_TYPE_OPTIONS },
    { key: 'weather', label: 'Weather', type: 'text', autoFill: true },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

export const ROLL_INVENTORY_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.ROLL_INVENTORY,
  title: 'Roll Inventory',
  actionLabel: 'Add Roll',
  primaryField: 'rollNumber',
  summaryFields: ['rollNumber', 'manufacturer', 'materialType', 'thicknessValue', 'rollStatus'],
  fields: [
    { key: 'rollNumber', label: 'Roll Number', type: 'text', required: true, autoFill: true },
    { key: 'manufacturer', label: 'Manufacturer', type: 'text', autoFill: true },
    { key: 'materialType', label: 'Material', type: 'select', required: true, autoFill: true, options: MATERIAL_OPTIONS },
    { key: 'thicknessValue', label: 'Thickness', type: 'select', required: true, autoFill: true, options: THICKNESS_OPTIONS },
    { key: 'surfaceTypeValue', label: 'Surface Type', type: 'select', autoFill: true, options: SURFACE_TYPE_OPTIONS },
    { key: 'rollWidth', label: 'Roll Width', type: 'number', autoFill: true },
    { key: 'rollLength', label: 'Roll Length', type: 'number' },
    { key: 'rollSquareFootage', label: 'Roll Square Footage', type: 'readonly' },
    { key: 'deliveryDate', label: 'Delivery Date', type: 'date' },
    { key: 'rollStatus', label: 'Roll Status', type: 'select', required: true, options: ROLL_STATUS_OPTIONS },
    { key: 'rollTagPhoto', label: 'Roll Tag Photo', type: 'photo' },
    { key: 'notes', label: 'Notes', type: 'textarea' },
  ],
}

export const PANEL_PLACEMENT_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.PANEL_PLACEMENT,
  title: 'Panel Placement',
  actionLabel: 'Add Panel Placement',
  primaryField: 'panelNumber',
  summaryFields: ['panelNumber', 'rollNumber', 'panelWidth', 'panelLength', 'panelSquareFootage'],
  fields: [
    { key: 'placementDate', label: 'Date', type: 'date', required: true },
    { key: 'panelNumber', label: 'Panel Number', type: 'text', required: true },
    { key: 'rollNumber', label: 'Roll Number', type: 'text', required: true, autoFill: true },
    { key: 'panelWidth', label: 'Panel Width', type: 'number', required: true, autoFill: true },
    { key: 'panelLength', label: 'Panel Length', type: 'number', required: true },
    { key: 'panelSquareFootage', label: 'Panel Square Footage', type: 'readonly' },
    { key: 'gps', label: 'GPS Capture', type: 'gps' },
    { key: 'photos', label: 'Photos', type: 'photo' },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
}

export const WEDGE_WELDING_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.WEDGE_WELDING,
  title: 'Wedge Welding Record',
  actionLabel: 'Add Wedge Weld',
  primaryField: 'seamNumber',
  summaryFields: ['seamNumber', 'seamerInitials', 'machineNumber', 'temperatureSetting', 'speedSetting'],
  fields: [
    { key: 'weldDate', label: 'Date', type: 'date', required: true },
    { key: 'weldTime', label: 'Time', type: 'time', required: true },
    { key: 'seamNumber', label: 'Seam Number', type: 'text', required: true, autoFill: true },
    { key: 'seamerInitials', label: 'Seamer Initials', type: 'text', required: true, autoFill: true },
    { key: 'machineNumber', label: 'Machine Number', type: 'text', autoFill: true },
    { key: 'temperatureSetting', label: 'Temperature Setting', type: 'number', autoFill: true },
    { key: 'speedSetting', label: 'Speed Setting', type: 'number', autoFill: true },
    { key: 'seamStartLocation', label: 'Seam Start Location', type: 'gps' },
    { key: 'seamEndLocation', label: 'Seam End Location', type: 'gps' },
    { key: 'passFail', label: 'Pass / Fail', type: 'select', options: PASS_FAIL_OPTIONS },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
}

export const WELD_TEST_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.WELD_TEST,
  title: 'Weld Test Record',
  actionLabel: 'Add Weld Test',
  primaryField: 'seamNumber',
  summaryFields: ['seamNumber', 'welderInitials', 'wedgeTempSetting', 'wedgeSpeedSetting', 'testResult'],
  fields: [
    { key: 'testDate', label: 'Date', type: 'date', required: true },
    { key: 'testTime', label: 'Time', type: 'time', required: true },
    { key: 'qcInitials', label: 'QC Initials', type: 'text', autoFill: true },
    { key: 'welderInitials', label: 'Welder Initials', type: 'text', required: true, autoFill: true },
    { key: 'seamNumber', label: 'Seam Number', type: 'text', required: true, autoFill: true },
    { key: 'wedgeTempSetting', label: 'Wedge Temp Setting', type: 'number', autoFill: true },
    { key: 'wedgeSpeedSetting', label: 'Wedge Speed Setting', type: 'number', autoFill: true },
    { key: 'extrusionPreheatTemp', label: 'Extrusion Preheat Temp', type: 'number', autoFill: true },
    { key: 'extrusionExtrudateTemp', label: 'Extrusion Extrudate Temp', type: 'number', autoFill: true },
    { key: 'testPressurePsi', label: 'Test Pressure / PSI', type: 'number' },
    { key: 'test1', label: 'Test #1', type: 'text' },
    { key: 'test2', label: 'Test #2', type: 'text' },
    { key: 'test3', label: 'Test #3', type: 'text' },
    { key: 'test4', label: 'Test #4', type: 'text' },
    { key: 'test5', label: 'Test #5', type: 'text' },
    { key: 'testResult', label: 'Pass / Fail / Trial', type: 'select', required: true, options: PASS_FAIL_TRIAL_OPTIONS },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
}

export const AIR_TEST_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.AIR_TEST,
  title: 'Air Test Log',
  actionLabel: 'Add Air Test',
  primaryField: 'seamNumber',
  summaryFields: ['seamNumber', 'startingPressure', 'endingPressure', 'pressureDrop', 'passFail'],
  fields: [
    { key: 'seamNumber', label: 'Seam Number', type: 'text', required: true, autoFill: true },
    { key: 'minimumStartingPressurePsig', label: 'Minimum Starting Pressure PSIG', type: 'number', required: true, autoFill: true },
    { key: 'maximumPressureDropPsig', label: 'Maximum Pressure Drop PSIG', type: 'number', required: true, autoFill: true },
    { key: 'requiredTestMinutes', label: 'Required Test Minutes', type: 'number', required: true, autoFill: true },
    { key: 'startingTime', label: 'Starting Time', type: 'time', required: true },
    { key: 'startingPressure', label: 'Starting Pressure', type: 'number', required: true },
    { key: 'endingTime', label: 'Ending Time', type: 'time', required: true },
    { key: 'endingPressure', label: 'Ending Pressure', type: 'number', required: true },
    { key: 'pressureDrop', label: 'Pressure Drop', type: 'readonly' },
    { key: 'actualTestMinutes', label: 'Actual Test Minutes', type: 'number' },
    { key: 'tester', label: 'Tester', type: 'text', required: true, autoFill: true },
    { key: 'passFail', label: 'Pass / Fail', type: 'readonly' },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
}

export const DESTRUCTIVE_TEST_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.DESTRUCTIVE_TEST,
  title: 'Destructive Test Record',
  actionLabel: 'Add Destructive Test',
  primaryField: 'dtNumber',
  summaryFields: ['dtNumber', 'seamNumber', 'welderInitials', 'testType', 'passFail'],
  fields: [
    { key: 'destructiveDate', label: 'Date', type: 'date', required: true },
    { key: 'dtNumber', label: 'DT Number', type: 'text', required: true, autoFill: true },
    { key: 'welderInitials', label: 'Welder Initials', type: 'text', required: true, autoFill: true },
    { key: 'machineNumber', label: 'Machine Number', type: 'text', autoFill: true },
    { key: 'welderTempSetting', label: 'Welder Temp Setting', type: 'number', autoFill: true },
    { key: 'welderSpeedSetting', label: 'Welder Speed Setting', type: 'number', autoFill: true },
    { key: 'seamNumber', label: 'Seam Number', type: 'text', required: true, autoFill: true },
    { key: 'repairLocation', label: 'Repair Location', type: 'text', autoFill: true },
    { key: 'testType', label: 'Test Type', type: 'text' },
    { key: 'test1', label: 'Test #1', type: 'text' },
    { key: 'test2', label: 'Test #2', type: 'text' },
    { key: 'test3', label: 'Test #3', type: 'text' },
    { key: 'test4', label: 'Test #4', type: 'text' },
    { key: 'test5', label: 'Test #5', type: 'text' },
    { key: 'labSent', label: 'Sent To Lab', type: 'checkbox' },
    { key: 'labResult', label: 'Lab Result', type: 'select', options: PASS_FAIL_OPTIONS },
    { key: 'repairCompleted', label: 'Repair Completed', type: 'checkbox' },
    { key: 'repairAcceptedDate', label: 'Repair Accepted Date', type: 'date' },
    { key: 'passFail', label: 'Pass / Fail', type: 'select', options: PASS_FAIL_OPTIONS },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
}

export const VACUUM_TEST_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.VACUUM_TEST,
  title: 'Vacuum Test / Repair Record',
  actionLabel: 'Add Vacuum Test',
  primaryField: 'repairNumber',
  summaryFields: ['repairNumber', 'seamLocation', 'typeOfRepair', 'tester', 'passFail'],
  fields: [
    { key: 'repairNumber', label: 'Repair Number', type: 'text', required: true, autoFill: true },
    { key: 'seamLocation', label: 'Seam Location', type: 'text', required: true, autoFill: true },
    { key: 'dateRepaired', label: 'Date Repaired', type: 'date', required: true },
    { key: 'repairedBy', label: 'Repaired By', type: 'text', autoFill: true },
    { key: 'typeOfRepair', label: 'Type Of Repair', type: 'select', autoFill: true, options: REPAIR_TYPE_OPTIONS },
    { key: 'numberOfLeaks', label: 'Number Of Leaks', type: 'number' },
    { key: 'retest', label: 'Retest', type: 'select', options: RETEST_OPTIONS },
    { key: 'dateAccepted', label: 'Date Accepted', type: 'date' },
    { key: 'tester', label: 'Tester', type: 'text', required: true, autoFill: true },
    { key: 'photoBefore', label: 'Photo Before', type: 'photo' },
    { key: 'photoAfter', label: 'Photo After', type: 'photo' },
    { key: 'passFail', label: 'Pass / Fail', type: 'select', options: PASS_FAIL_OPTIONS },
    { key: 'comments', label: 'Comments', type: 'textarea' },
  ],
}

export const DAILY_AS_BUILT_FORM: QCFormDefinition = {
  recordType: RECORD_TYPES.DAILY_AS_BUILT,
  title: 'Daily As-Built Log',
  actionLabel: 'Build Daily As-Built',
  primaryField: 'reportDate',
  summaryFields: ['reportDate', 'dailySummary', 'readyForExport'],
  fields: [
    { key: 'reportDate', label: 'Report Date', type: 'date', required: true },
    { key: 'panelsPlacedToday', label: 'Panels Placed Today', type: 'readonly' },
    { key: 'seamsWeldedToday', label: 'Seams Welded Today', type: 'readonly' },
    { key: 'weldTestsToday', label: 'Weld Tests Today', type: 'readonly' },
    { key: 'airTestsToday', label: 'Air Tests Today', type: 'readonly' },
    { key: 'destructiveTestsToday', label: 'Destructive Tests Today', type: 'readonly' },
    { key: 'vacuumRepairsToday', label: 'Vacuum Repairs Today', type: 'readonly' },
    { key: 'openFailedItems', label: 'Open / Failed Items', type: 'readonly' },
    { key: 'photosToday', label: 'Photos Today', type: 'readonly' },
    { key: 'gpsPointsToday', label: 'GPS Points Today', type: 'readonly' },
    { key: 'dailySummary', label: 'Daily Summary', type: 'textarea' },
    { key: 'readyForExport', label: 'Ready For Export', type: 'checkbox' },
  ],
}

export const QC_FORM_REGISTRY: Record<string, QCFormDefinition> = {
  [RECORD_TYPES.PROJECT_PROFILE]: PROJECT_SETUP_FORM,
  [RECORD_TYPES.ROLL_INVENTORY]: ROLL_INVENTORY_FORM,
  [RECORD_TYPES.PANEL_PLACEMENT]: PANEL_PLACEMENT_FORM,
  [RECORD_TYPES.WEDGE_WELDING]: WEDGE_WELDING_FORM,
  [RECORD_TYPES.WELD_TEST]: WELD_TEST_FORM,
  [RECORD_TYPES.AIR_TEST]: AIR_TEST_FORM,
  [RECORD_TYPES.DESTRUCTIVE_TEST]: DESTRUCTIVE_TEST_FORM,
  [RECORD_TYPES.VACUUM_TEST]: VACUUM_TEST_FORM,
  [RECORD_TYPES.DAILY_AS_BUILT]: DAILY_AS_BUILT_FORM,
}

export const ACTIVE_QC_FORMS = [
  PROJECT_SETUP_FORM,
  ROLL_INVENTORY_FORM,
  PANEL_PLACEMENT_FORM,
  WEDGE_WELDING_FORM,
  WELD_TEST_FORM,
  AIR_TEST_FORM,
  DESTRUCTIVE_TEST_FORM,
  VACUUM_TEST_FORM,
  DAILY_AS_BUILT_FORM,
]

export function getQCForm(recordType: string) {
  return QC_FORM_REGISTRY[recordType]
}

export function getRequiredFields(recordType: string) {
  return getQCForm(recordType)?.fields.filter((field) => field.required).map((field) => field.key) || []
}

export function getAutoFillFields(recordType: string) {
  return getQCForm(recordType)?.fields.filter((field) => field.autoFill).map((field) => field.key) || []
}

export function validateRequiredFields(recordType: string, record: Record<string, any>) {
  const missing = getRequiredFields(recordType).filter((fieldKey) => {
    const value = record[fieldKey]
    return value === undefined || value === null || String(value).trim() === ''
  })

  return {
    ok: missing.length === 0,
    missing,
  }
}

const QCFormRegistry = {
  PROJECT_SETUP_FORM,
  ROLL_INVENTORY_FORM,
  PANEL_PLACEMENT_FORM,
  WEDGE_WELDING_FORM,
  WELD_TEST_FORM,
  AIR_TEST_FORM,
  DESTRUCTIVE_TEST_FORM,
  VACUUM_TEST_FORM,
  DAILY_AS_BUILT_FORM,
  QC_FORM_REGISTRY,
  ACTIVE_QC_FORMS,
  getQCForm,
  getRequiredFields,
  getAutoFillFields,
  validateRequiredFields,
}

export default QCFormRegistry
