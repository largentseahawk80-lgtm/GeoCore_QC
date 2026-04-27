// =====================================================
// LINERSYNC SUPER APP
// CHUNK 5B — AUTO-FILL MEMORY LOGIC
// =====================================================
// Purpose:
// Keep constant field values filled in until the QC tech changes them.
// This is the field memory layer for Project, Material, Roll, Panel,
// Seam, Welder, Machine, Tester, and common QC settings.

import type { ProjectProfile } from './LinerSyncDataModel'

export const AUTOFILL_MEMORY_KEY = 'linersync_autofill_memory_v5b'

export type AutoFillMemory = {
  // Project constants
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

  // Roll / panel placement memory
  lastRollNumber: string
  lastManufacturer: string
  lastPanelWidth: string
  lastPanelLength: string
  lastPanelZone: string
  lastPanelOrientation: string

  // Seam / weld production memory
  lastSeamNumber: string
  lastSeamerInitials: string
  lastWelderInitials: string
  lastMachineNumber: string
  lastWedgeTempSetting: string
  lastWedgeSpeedSetting: string
  lastExtrusionPreheatTemp: string
  lastExtrusionExtrudateTemp: string

  // Air test memory
  minimumStartingPressurePsig: number
  maximumPressureDropPsig: number
  requiredTestMinutes: number
  lastTester: string

  // Destructive / repair memory
  lastDtNumber: string
  lastRepairNumber: string
  lastRepairLocation: string
  lastRepairedBy: string
  lastTypeOfRepair: string

  // System
  updatedAt: string
}

export const DEFAULT_AUTOFILL_MEMORY: AutoFillMemory = {
  company: 'Southwest Liner Systems Inc.',
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

  lastRollNumber: '',
  lastManufacturer: '',
  lastPanelWidth: '',
  lastPanelLength: '',
  lastPanelZone: '',
  lastPanelOrientation: '',

  lastSeamNumber: '',
  lastSeamerInitials: '',
  lastWelderInitials: '',
  lastMachineNumber: '',
  lastWedgeTempSetting: '',
  lastWedgeSpeedSetting: '',
  lastExtrusionPreheatTemp: '',
  lastExtrusionExtrudateTemp: '',

  minimumStartingPressurePsig: 30,
  maximumPressureDropPsig: 4,
  requiredTestMinutes: 5,
  lastTester: '',

  lastDtNumber: '',
  lastRepairNumber: '',
  lastRepairLocation: '',
  lastRepairedBy: '',
  lastTypeOfRepair: '',

  updatedAt: '',
}

function nowIso() {
  return new Date().toISOString()
}

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function loadAutoFillMemory(): AutoFillMemory {
  if (!canUseLocalStorage()) return { ...DEFAULT_AUTOFILL_MEMORY }

  try {
    const raw = window.localStorage.getItem(AUTOFILL_MEMORY_KEY)
    if (!raw) return { ...DEFAULT_AUTOFILL_MEMORY }
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_AUTOFILL_MEMORY,
      ...parsed,
      minimumStartingPressurePsig: Number(parsed.minimumStartingPressurePsig || DEFAULT_AUTOFILL_MEMORY.minimumStartingPressurePsig),
      maximumPressureDropPsig: Number(parsed.maximumPressureDropPsig || DEFAULT_AUTOFILL_MEMORY.maximumPressureDropPsig),
      requiredTestMinutes: Number(parsed.requiredTestMinutes || DEFAULT_AUTOFILL_MEMORY.requiredTestMinutes),
    }
  } catch {
    return { ...DEFAULT_AUTOFILL_MEMORY }
  }
}

export function saveAutoFillMemory(memory: AutoFillMemory): AutoFillMemory {
  const next = { ...DEFAULT_AUTOFILL_MEMORY, ...memory, updatedAt: nowIso() }
  if (canUseLocalStorage()) {
    window.localStorage.setItem(AUTOFILL_MEMORY_KEY, JSON.stringify(next))
  }
  return next
}

export function resetAutoFillMemory(): AutoFillMemory {
  if (canUseLocalStorage()) window.localStorage.removeItem(AUTOFILL_MEMORY_KEY)
  return { ...DEFAULT_AUTOFILL_MEMORY }
}

export function updateAutoFillMemory(patch: Partial<AutoFillMemory>): AutoFillMemory {
  const current = loadAutoFillMemory()
  return saveAutoFillMemory({ ...current, ...patch })
}

export function projectProfileFromMemory(memory: AutoFillMemory = loadAutoFillMemory()): ProjectProfile {
  return {
    company: memory.company,
    projectName: memory.projectName,
    siteName: memory.siteName,
    pondCellArea: memory.pondCellArea,
    clientOwner: memory.clientOwner,
    contractorInstaller: memory.contractorInstaller,
    qcTech: memory.qcTech,
    superintendent: memory.superintendent,
    projectAddress: memory.projectAddress,
    projectPhone: memory.projectPhone,
    material: memory.material,
    thickness: memory.thickness,
    surfaceType: memory.surfaceType,
    weather: memory.weather,
    notes: '',
    createdAt: '',
    updatedAt: memory.updatedAt,
  }
}

export function rememberProjectProfile(project: Partial<ProjectProfile>) {
  return updateAutoFillMemory({
    company: project.company || DEFAULT_AUTOFILL_MEMORY.company,
    projectName: project.projectName || '',
    siteName: project.siteName || '',
    pondCellArea: project.pondCellArea || '',
    clientOwner: project.clientOwner || '',
    contractorInstaller: project.contractorInstaller || '',
    qcTech: project.qcTech || '',
    superintendent: project.superintendent || '',
    projectAddress: project.projectAddress || '',
    projectPhone: project.projectPhone || '',
    material: project.material || '',
    thickness: project.thickness || '',
    surfaceType: project.surfaceType || '',
    weather: project.weather || '',
  })
}

// Apply memory to a new blank record before the user starts typing.
export function applyAutoFillToRecord<T extends Record<string, any>>(recordType: string, record: T): T {
  const memory = loadAutoFillMemory()
  const next: T = { ...record }

  // All records get project/material constants if blank.
  next.company ||= memory.company
  next.projectName ||= memory.projectName
  next.siteName ||= memory.siteName
  next.pondCellArea ||= memory.pondCellArea
  next.clientOwner ||= memory.clientOwner
  next.contractorInstaller ||= memory.contractorInstaller
  next.qcTech ||= memory.qcTech
  next.material ||= memory.material
  next.thickness ||= memory.thickness
  next.surfaceType ||= memory.surfaceType

  if (recordType === 'ROLL_INVENTORY') {
    next.manufacturer ||= memory.lastManufacturer
    next.materialType ||= memory.material
    next.thicknessValue ||= memory.thickness
    next.surfaceTypeValue ||= memory.surfaceType
  }

  if (recordType === 'PANEL_PLACEMENT') {
    next.rollNumber ||= memory.lastRollNumber
    next.panelWidth ||= memory.lastPanelWidth
    next.panelLength ||= memory.lastPanelLength
  }

  if (recordType === 'WEDGE_WELDING') {
    next.seamNumber ||= memory.lastSeamNumber
    next.seamerInitials ||= memory.lastSeamerInitials
    next.machineNumber ||= memory.lastMachineNumber
    next.temperatureSetting ||= memory.lastWedgeTempSetting
    next.speedSetting ||= memory.lastWedgeSpeedSetting
  }

  if (recordType === 'WELD_TEST') {
    next.qcInitials ||= memory.qcTech
    next.welderInitials ||= memory.lastWelderInitials
    next.seamNumber ||= memory.lastSeamNumber
    next.wedgeTempSetting ||= memory.lastWedgeTempSetting
    next.wedgeSpeedSetting ||= memory.lastWedgeSpeedSetting
    next.extrusionPreheatTemp ||= memory.lastExtrusionPreheatTemp
    next.extrusionExtrudateTemp ||= memory.lastExtrusionExtrudateTemp
  }

  if (recordType === 'AIR_TEST') {
    next.seamNumber ||= memory.lastSeamNumber
    next.minimumStartingPressurePsig ||= memory.minimumStartingPressurePsig
    next.maximumPressureDropPsig ||= memory.maximumPressureDropPsig
    next.requiredTestMinutes ||= memory.requiredTestMinutes
    next.tester ||= memory.lastTester || memory.qcTech
  }

  if (recordType === 'DESTRUCTIVE_TEST') {
    next.dtNumber ||= memory.lastDtNumber
    next.welderInitials ||= memory.lastWelderInitials
    next.machineNumber ||= memory.lastMachineNumber
    next.welderTempSetting ||= memory.lastWedgeTempSetting
    next.welderSpeedSetting ||= memory.lastWedgeSpeedSetting
    next.seamNumber ||= memory.lastSeamNumber
    next.repairLocation ||= memory.lastRepairLocation
  }

  if (recordType === 'VACUUM_TEST') {
    next.repairNumber ||= memory.lastRepairNumber
    next.seamLocation ||= memory.lastSeamNumber
    next.repairedBy ||= memory.lastRepairedBy || memory.lastWelderInitials
    next.typeOfRepair ||= memory.lastTypeOfRepair
    next.tester ||= memory.lastTester || memory.qcTech
  }

  return next
}

// Remember what the user saved so the next form starts with the same repeated field values.
export function rememberFromRecord(recordType: string, record: Record<string, any>): AutoFillMemory {
  const patch: Partial<AutoFillMemory> = {}

  // Universal project/material memory.
  if (record.company) patch.company = record.company
  if (record.projectName) patch.projectName = record.projectName
  if (record.siteName) patch.siteName = record.siteName
  if (record.pondCellArea) patch.pondCellArea = record.pondCellArea
  if (record.clientOwner) patch.clientOwner = record.clientOwner
  if (record.contractorInstaller) patch.contractorInstaller = record.contractorInstaller
  if (record.qcTech) patch.qcTech = record.qcTech
  if (record.material) patch.material = record.material
  if (record.thickness) patch.thickness = record.thickness
  if (record.surfaceType) patch.surfaceType = record.surfaceType

  if (recordType === 'ROLL_INVENTORY') {
    if (record.rollNumber) patch.lastRollNumber = record.rollNumber
    if (record.manufacturer) patch.lastManufacturer = record.manufacturer
    if (record.materialType) patch.material = record.materialType
    if (record.thicknessValue) patch.thickness = record.thicknessValue
    if (record.surfaceTypeValue) patch.surfaceType = record.surfaceTypeValue
  }

  if (recordType === 'PANEL_PLACEMENT') {
    if (record.rollNumber) patch.lastRollNumber = record.rollNumber
    if (record.panelWidth) patch.lastPanelWidth = record.panelWidth
    if (record.panelLength) patch.lastPanelLength = record.panelLength
  }

  if (recordType === 'WEDGE_WELDING') {
    if (record.seamNumber) patch.lastSeamNumber = record.seamNumber
    if (record.seamerInitials) patch.lastSeamerInitials = record.seamerInitials
    if (record.machineNumber) patch.lastMachineNumber = record.machineNumber
    if (record.temperatureSetting) patch.lastWedgeTempSetting = record.temperatureSetting
    if (record.speedSetting) patch.lastWedgeSpeedSetting = record.speedSetting
  }

  if (recordType === 'WELD_TEST') {
    if (record.qcInitials) patch.qcTech = record.qcInitials
    if (record.welderInitials) patch.lastWelderInitials = record.welderInitials
    if (record.seamNumber) patch.lastSeamNumber = record.seamNumber
    if (record.wedgeTempSetting) patch.lastWedgeTempSetting = record.wedgeTempSetting
    if (record.wedgeSpeedSetting) patch.lastWedgeSpeedSetting = record.wedgeSpeedSetting
    if (record.extrusionPreheatTemp) patch.lastExtrusionPreheatTemp = record.extrusionPreheatTemp
    if (record.extrusionExtrudateTemp) patch.lastExtrusionExtrudateTemp = record.extrusionExtrudateTemp
  }

  if (recordType === 'AIR_TEST') {
    if (record.seamNumber) patch.lastSeamNumber = record.seamNumber
    if (record.minimumStartingPressurePsig) patch.minimumStartingPressurePsig = Number(record.minimumStartingPressurePsig)
    if (record.maximumPressureDropPsig) patch.maximumPressureDropPsig = Number(record.maximumPressureDropPsig)
    if (record.requiredTestMinutes) patch.requiredTestMinutes = Number(record.requiredTestMinutes)
    if (record.tester) patch.lastTester = record.tester
  }

  if (recordType === 'DESTRUCTIVE_TEST') {
    if (record.dtNumber) patch.lastDtNumber = record.dtNumber
    if (record.welderInitials) patch.lastWelderInitials = record.welderInitials
    if (record.machineNumber) patch.lastMachineNumber = record.machineNumber
    if (record.welderTempSetting) patch.lastWedgeTempSetting = record.welderTempSetting
    if (record.welderSpeedSetting) patch.lastWedgeSpeedSetting = record.welderSpeedSetting
    if (record.seamNumber) patch.lastSeamNumber = record.seamNumber
    if (record.repairLocation) patch.lastRepairLocation = record.repairLocation
  }

  if (recordType === 'VACUUM_TEST') {
    if (record.repairNumber) patch.lastRepairNumber = record.repairNumber
    if (record.seamLocation) patch.lastSeamNumber = record.seamLocation
    if (record.repairedBy) patch.lastRepairedBy = record.repairedBy
    if (record.typeOfRepair) patch.lastTypeOfRepair = record.typeOfRepair
    if (record.tester) patch.lastTester = record.tester
  }

  return updateAutoFillMemory(patch)
}

const AutoFillMemoryLogic = {
  AUTOFILL_MEMORY_KEY,
  DEFAULT_AUTOFILL_MEMORY,
  loadAutoFillMemory,
  saveAutoFillMemory,
  resetAutoFillMemory,
  updateAutoFillMemory,
  projectProfileFromMemory,
  rememberProjectProfile,
  applyAutoFillToRecord,
  rememberFromRecord,
}

export default AutoFillMemoryLogic
