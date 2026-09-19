export type Chemistry = 'lifepo4' | 'tubular' | 'flooded' | 'agm_gel';
export type OperatingMode = 'ips' | 'utility_first' | 'solar_first' | 'sbu';
export type AssumptionSet = 'low' | 'typ' | 'high';

export interface Range3 {
  low: number;
  typ: number;
  high: number;
}

export interface ApplianceTemplate {
  id: string;
  name: string;
  category: 'cooling' | 'lighting' | 'entertainment' | 'kitchen' | 'water' | 'office' | 'medical' | 'other';
  watts: number;
  powerFactor: number;
  surgeMultiplier: number;
  dutyCycle: number;
  inverterFriendly: 'ok' | 'caution' | 'avoid';
  verified: boolean;
  source?: string;
  updatedAt: string;
}

export interface LoadItem {
  id: string;
  templateId?: string;
  label: string;
  qty: number;
  watts: number;
  powerFactor: number;
  surgeMultiplier: number;
  dutyCycle: number;
  hourly: number[]; // 24 values 0-1
  onBackupCircuit: boolean;
  priority: 1 | 2 | 3;
}

export interface Inverter {
  id: string;
  brand: string;
  model: string;
  ratedVA: number;
  ratedW: number;
  surgeW: number | null;
  systemVoltage: 12 | 24 | 48;
  idleW: number;
  efficiencyCurve: { loadFraction: number; eff: number }[];
  modes: OperatingMode[];
  gridChargerMaxA: number;
  maxTotalChargeA: number;
  mppt?: {
    maxPvVoc: number;
    vMin: number;
    vMax: number;
    maxPvW: number;
    maxPvCurrentA: number;
    maxChargeA: number;
  };
  verified: boolean;
  source?: string;
  updatedAt: string;
}

export interface BatteryUnit {
  id: string;
  chemistry: Chemistry;
  nominalV: number;
  ratedAh: number;
  ratedHours: 10 | 20 | null;
  usableDoD: number;
  peukertK: number;
  maxChargeC: number;
  maxChargeA: number | null;
  maxDischargeA: number | null;
  chargeEfficiency: number;
  cycleLife: { dod: number; cycles: Range3 }[];
  calendarLifeYears: Range3;
  weightKg?: number;
  price?: number;
  verified: boolean;
  source?: string;
  updatedAt: string;
}

export interface BatteryBank {
  unit: BatteryUnit;
  series: number;
  parallel: number;
}

export interface PvPanel {
  id: string;
  wp: number;
  voc: number;
  vmp: number;
  isc: number;
  imp: number;
  tempCoeffVocPctPerC: number;
  tempCoeffPmaxPctPerC: number;
  price?: number;
  verified: boolean;
  source?: string;
  updatedAt: string;
}

export interface PvArray {
  panel: PvPanel;
  series: number;
  parallelStrings: number;
}

export interface SolarSite {
  peakSunHours: Range3;
  sunrise: number;
  sunset: number;
  systemDerate: number;
  tMinC: number;
  tCellMaxC: number;
  cloudyDayFactor: number;
  worstCaseCloudyDays: number;
}

export interface Tariff {
  currency: string;
  slabs: { upToKwh: number | null; rate: number }[];
  fixedMonthly?: number;
  vatPct?: number;
}

export interface GridSchedule {
  mode: 'pattern' | 'custom';
  outageMinutes: number;
  gridMinutes: number;
  firstOutageStartMinute: number;
  nightOverride?: { fromHour: number; toHour: number; outageMinutes: number; gridMinutes: number };
}

export interface ProjectOptions {
  mode: OperatingMode;
  assumptionSet: AssumptionSet;
  initialSoC: number;
  reservePct: number;
  simulationDays: number;
}

export interface Project {
  v: 1;
  locale: 'en' | 'bn';
  currency: string;
  loads: LoadItem[];
  grid: GridSchedule;
  inverter: Inverter;
  bank: BatteryBank;
  pv?: PvArray;
  site: SolarSite;
  tariff: Tariff;
  options: ProjectOptions;
}

export interface Warning {
  id: string;
  severity: 'info' | 'warn' | 'critical';
  message: string;
  suggestedFix: string;
}

export interface SimulationResult {
  timeSeries: TimeStep[];
  runtimeHours: number;
  rechargeTimeHours: number;
  minSoC: number;
  minSoCTime: number;
  unservedWh: number;
  gridWh: number;
  solarGeneratedWh: number;
  solarUsedWh: number;
  solarClippedWh: number;
  avgDoD: number;
  cyclesPerDay: number;
  warnings: Warning[];
  continuousRuntime: number;
  closedFormRecharge: number;
  recoveryStatus: 'yes' | 'barely' | 'no';
}

export interface TimeStep {
  t: number; // minutes from start
  soc: number;
  loadW: number;
  pvW: number;
  gridW: number;
  battW: number; // positive = charging, negative = discharging
  unservedW: number;
  gridAvailable: boolean;
}

export interface SizingResult {
  minRatedVA: number;
  recommendedVA: number;
  systemVoltage: 12 | 24 | 48;
  batteryAhNeeded: number;
  solarWpNeeded: number;
  roofAreaM2: number;
}

export interface CostResult {
  monthlyBillNoSolar: number;
  monthlyBillWithSolar: number;
  monthlySavings: number;
  annualSavings: number;
  systemCost: number;
  simplePaybackYears: number | null;
  costPerKwhDelivered: number;
  batteryLifeYears: number;
}
