// =====================================================
// LINERSYNC SUPER APP
// CHUNK 5A — MASTER QC DATA MODEL
// =====================================================
// Raw QC data fields only. No personal/company preset values.

export type RecordStatus = 'Draft' | 'Open' | 'Complete' | 'Pass' | 'Fail' | 'Rejected' | 'Accepted' | 'Locked'
export type PassFailTrial = '' | 'Pass' | 'Fail' | 'Trial'

export type ProjectProfile = {
  company: string
  projectName: string
  siteName: string
  pondCellArea: string
  clientOwner: string
  contractorInstaller: string
  qcTech: string
  superintendent: string
  projectAddress: string
  projectPhone: string
  material: string
  thickness: string
  surfaceType: string
  weather: string
  notes: string
  createdAt: string
  updatedAt: string
}

export const DEFAULT_PROJECT_PROFILE: ProjectProfile = {
  company: '',
  projectName: '',
  siteName: '',
  pondCellArea: '',
  clientOwner: '',
  contractorInstaller: '',
  qcTech: '',
  superintendent: '',
  projectAddress: '',
  projectPhone: '',
  material: '',
  thickness: '',
  surfaceType: '',
  weather: '',
  notes: '',
  createdAt: '',
  updatedAt: '',
}

export const MATERIAL_OPTIONS = [
  'HDPE',
  'LLDPE',
  'PVC',
  'GCL',
  'Geotextile',
  'Geocomposite',
  'Drainage Net',
  'Other / Custom',
] as const

export const THICKNESS_OPTIONS = [
  '30 mil',
  '40 mil',
  '45 mil',
  '60 mil',
  '80 mil',
  '100 mil',
  'Custom',
] as const

export const SURFACE_TYPE_OPTIONS = [
  'Smooth',
  'Textured One Side',
  'Textured Both Sides',
  'Reinforced / Scrim',
  'Conductive',
  'Other',
] as const

export const RECORD_TYPES = {
  PROJECT_PROFILE: 'PROJECT_PROFILE',
  ROLL_INVENTORY: 'ROLL_INVENTORY',
  PANEL_PLACEMENT: 'PANEL_PLACEMENT',
  WEDGE_WELDING: 'WEDGE_WELDING',
  WELD_TEST: 'WELD_TEST',
  AIR_TEST: 'AIR_TEST',
  DESTRUCTIVE_TEST: 'DESTRUCTIVE_TEST',
  VACUUM_TEST: 'VACUUM_TEST',
  DAILY_AS_BUILT: 'DAILY_AS_BUILT',
} as const

function id() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function nowIso() {
  return new Date().toISOString()
}

function today12HourParts() {
  const date = new Date()
  return {
    timestamp: date.toISOString(),
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }),
  }
}

export function createBaseRecord(recordType: string, projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  const captured = today12HourParts()

  return {
    id: id(),
    recordType,

    company: projectProfile.company || '',
    projectName: projectProfile.projectName || '',
    siteName: projectProfile.siteName || '',
    pondCellArea: projectProfile.pondCellArea || '',
    clientOwner: projectProfile.clientOwner || '',
    contractorInstaller: projectProfile.contractorInstaller || '',
    qcTech: projectProfile.qcTech || '',
    material: projectProfile.material || '',
    thickness: projectProfile.thickness || '',
    surfaceType: projectProfile.surfaceType || '',

    gpsLatitude: null as number | null,
    gpsLongitude: null as number | null,
    gpsAccuracyFt: null as number | null,
    timestamp: captured.timestamp,
    date: captured.date,
    time: captured.time,

    photos: [] as string[],
    comments: '',

    status: 'Draft' as RecordStatus,
    approved: false,
    locked: false,
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

export function createRollInventoryRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.ROLL_INVENTORY, projectProfile),
    rollNumber: '',
    manufacturer: '',
    materialType: projectProfile.material || '',
    thicknessValue: projectProfile.thickness || '',
    surfaceTypeValue: projectProfile.surfaceType || '',
    rollWidth: '',
    rollLength: '',
    rollSquareFootage: '',
    deliveryDate: '',
    rollStatus: 'Unused',
    assignedPanels: [] as string[],
    rollTagPhoto: null as string | null,
    notes: '',
  }
}

export function createPanelPlacementRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.PANEL_PLACEMENT, projectProfile),
    panelNumber: '',
    rollNumber: '',
    panelWidth: '',
    panelLength: '',
    panelSquareFootage: '',
    placementDate: '',
    comments: '',
  }
}

export function createWedgeWeldingRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.WEDGE_WELDING, projectProfile),
    weldDate: '',
    weldTime: '',
    seamNumber: '',
    seamerInitials: '',
    machineNumber: '',
    temperatureSetting: '',
    speedSetting: '',
    seamStartLocation: '',
    seamEndLocation: '',
    passFail: '' as PassFailTrial,
    comments: '',
  }
}

export function createWeldTestRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.WELD_TEST, projectProfile),
    testDate: '',
    testTime: '',
    qcInitials: '',
    welderInitials: '',
    seamNumber: '',
    wedgeTempSetting: '',
    wedgeSpeedSetting: '',
    extrusionPreheatTemp: '',
    extrusionExtrudateTemp: '',
    testPressurePsi: '',
    test1: '',
    test2: '',
    test3: '',
    test4: '',
    test5: '',
    testResult: '' as PassFailTrial,
    comments: '',
  }
}

export function createAirTestRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.AIR_TEST, projectProfile),
    seamNumber: '',
    minimumStartingPressurePsig: 30,
    maximumPressureDropPsig: 4,
    requiredTestMinutes: 5,
    startingTime: '',
    startingPressure: '',
    endingTime: '',
    endingPressure: '',
    pressureDrop: '',
    actualTestMinutes: '',
    tester: '',
    passFail: '' as PassFailTrial,
    comments: '',
  }
}

export function calculateAirTestResult<T extends ReturnType<typeof createAirTestRecord>>(record: T): T {
  const start = Number(record.startingPressure)
  const end = Number(record.endingPressure)
  const maxDrop = Number(record.maximumPressureDropPsig)
  const minStart = Number(record.minimumStartingPressurePsig)
  const requiredMinutes = Number(record.requiredTestMinutes)
  const actualMinutes = Number(record.actualTestMinutes)
  const drop = start - end

  record.pressureDrop = Number.isNaN(drop) ? '' : String(drop)

  if (Number.isNaN(start) || Number.isNaN(end)) {
    record.passFail = ''
    return record
  }

  if (start < minStart) {
    record.passFail = 'Fail'
    record.comments = 'Failed: starting pressure below minimum.'
    return record
  }

  if (drop > maxDrop) {
    record.passFail = 'Fail'
    record.comments = 'Failed: pressure drop exceeds maximum allowed.'
    return record
  }

  if (!Number.isNaN(actualMinutes) && actualMinutes < requiredMinutes) {
    record.passFail = 'Fail'
    record.comments = 'Failed: test time below required hold time.'
    return record
  }

  record.passFail = 'Pass'
  return record
}

export function createDestructiveTestRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.DESTRUCTIVE_TEST, projectProfile),
    destructiveDate: '',
    dtNumber: '',
    welderInitials: '',
    machineNumber: '',
    welderTempSetting: '',
    welderSpeedSetting: '',
    seamNumber: '',
    repairLocation: '',
    testType: '',
    test1: '',
    test2: '',
    test3: '',
    test4: '',
    test5: '',
    labSent: false,
    labResult: '',
    repairCompleted: false,
    repairAcceptedDate: '',
    passFail: '' as PassFailTrial,
    comments: '',
  }
}

export function createVacuumTestRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.VACUUM_TEST, projectProfile),
    repairNumber: '',
    seamLocation: '',
    dateRepaired: '',
    repairedBy: '',
    typeOfRepair: '',
    numberOfLeaks: '',
    retest: '',
    dateAccepted: '',
    tester: '',
    photoBefore: null as string | null,
    photoAfter: null as string | null,
    passFail: '' as PassFailTrial,
    comments: '',
  }
}

export function createDailyAsBuiltRecord(projectProfile: ProjectProfile = DEFAULT_PROJECT_PROFILE) {
  return {
    ...createBaseRecord(RECORD_TYPES.DAILY_AS_BUILT, projectProfile),
    reportDate: '',
    panelsPlacedToday: [] as string[],
    seamsWeldedToday: [] as string[],
    weldTestsToday: [] as string[],
    airTestsToday: [] as string[],
    destructiveTestsToday: [] as string[],
    vacuumRepairsToday: [] as string[],
    openFailedItems: [] as string[],
    photosToday: [] as string[],
    gpsPointsToday: [] as string[],
    dailySummary: '',
    readyForExport: false,
  }
}

const LinerSyncDataModel = {
  DEFAULT_PROJECT_PROFILE,
  MATERIAL_OPTIONS,
  THICKNESS_OPTIONS,
  SURFACE_TYPE_OPTIONS,
  RECORD_TYPES,
  createBaseRecord,
  createRollInventoryRecord,
  createPanelPlacementRecord,
  createWedgeWeldingRecord,
  createWeldTestRecord,
  createAirTestRecord,
  calculateAirTestResult,
  createDestructiveTestRecord,
  createVacuumTestRecord,
  createDailyAsBuiltRecord,
}

export default LinerSyncDataModel
