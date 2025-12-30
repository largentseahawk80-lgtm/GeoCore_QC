

export type ViewState = 'dashboard' | 'gatekeeper' | 'panel' | 'repair' | 'dt' | 'tools' | 'airTest' | 'welder' | 'trial' | 'vacuum' | 'drone';

export type MaterialCategory = 'Liner' | 'GCL' | 'Composite';

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface SubgradeInspection {
  id: string;
  date: string;
  inspector: string;
  temperature: number;
  windSpeed: number;
  subgradeCondition: 'Dry/Smooth' | 'Wet/Rutted' | 'Needs Grading';
  passed: boolean;
  notes: string;
}

export interface PanelLog {
  id: string;
  panelNumber: string;
  rollNumber: string; // Simulated barcode
  category: MaterialCategory;
  startTime: string;
  startGeo: GeoLocation;
  endGeo?: GeoLocation;
  calculatedLengthFt?: number;
  widthFt: number; // usually 23 or similar
  materialType: string;
  timestamp: number;
  photo?: string; // New: Photo of panel/subgrade
}

export interface RepairLog {
  id: string;
  repairNumber: string;
  type: 'Patch' | 'Bead' | 'Grind' | 'Extrusion';
  locationGeo: GeoLocation;
  nearestPanelId: string; // "Smart Seam Detection"
  distanceFromStart: number;
  size: string;
  technician: string;
  photo?: string; // Base64 photo string
  timestamp: number;
}

export interface DTLog {
  id: string;
  sampleId: string;
  locationGeo: GeoLocation;
  machineId: string;
  peelResults: [number, number, number, number, number];
  shearResults: [number, number, number, number, number];
  passed: boolean;
  timestamp: number;
}

export interface AirTestLog {
  id: string;
  seamId: string;
  technician: string;
  date: string;
  startTime: string;
  endTime: string;
  startPressure: number;
  endPressure: number;
  passed: boolean;
  timestamp: number;
  locationGeo: GeoLocation;
}

export interface VacuumLog {
  id: string;
  logNumber: string; // e.g., V-100
  technician: string;
  date: string;
  locationGeo: GeoLocation;
  passed: boolean;
  notes?: string;
  photo?: string;
  timestamp: number;
}

export interface WelderLog {
  id: string;
  seamId: string;
  type: 'Wedge' | 'Extrusion';
  machineId: string;
  technician: string;
  date: string;
  startTime: string;
  endTime: string;
  temperature: number;
  speed?: number; // Wedge only
  startGeo: GeoLocation;
  endGeo?: GeoLocation;
  calculatedLengthFt?: number;
  timestamp: number;
  photo?: string; // New: Photo of seam
}

export interface TrialWeldLog {
  id: string;
  trialId: string;
  type: 'Wedge' | 'Extrusion';
  machineId: string;
  technician: string; // Welder Initials
  inspector?: string; // QC Initials
  material?: string; // e.g. "60 mil"
  time?: string; // e.g. "10:24 AM"
  temperature: number; // Wedge Temp or Barrel Temp
  preHeatTemp?: number; // Specific to Extrusion
  speed?: number; // Specific to Wedge
  peelResults: number[]; // Flexible array (target 3)
  shearResults: number[]; // Flexible array (target 3)
  passed: boolean;
  timestamp: number;
}

export interface DroneMedia {
  id: string;
  fileName: string;
  thumbnail: string; // Compressed Base64
  locationGeo?: GeoLocation; // Extracted from DJI EXIF
  timestamp: number;
  linkedLogId?: string; // If used to create a repair/panel
}

export interface AppData {
  projectName?: string;
  inspection: SubgradeInspection | null;
  panels: PanelLog[];
  repairs: RepairLog[];
  dts: DTLog[];
  airTests: AirTestLog[];
  welderLogs: WelderLog[];
  trialLogs: TrialWeldLog[];
  vacuumLogs: VacuumLog[];
  droneMedia: DroneMedia[];
}