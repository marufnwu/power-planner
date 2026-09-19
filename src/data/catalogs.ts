import { ApplianceTemplate, Inverter, BatteryUnit, PvPanel, SolarSite, Tariff, GridSchedule } from '../types';

// All defaults are clearly labeled as unverified - users must check their own datasheets
const UNVERIFIED_DATE = '2024-01-01';

export const applianceTemplates: ApplianceTemplate[] = [
  { id: 'ceiling-fan', name: 'Ceiling Fan', category: 'cooling', watts: 70, powerFactor: 0.85, surgeMultiplier: 1.5, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'bldc-fan', name: 'BLDC / Energy-Saving Fan', category: 'cooling', watts: 28, powerFactor: 0.95, surgeMultiplier: 1.2, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'led-bulb', name: 'LED Bulb (9-12W)', category: 'lighting', watts: 10, powerFactor: 0.9, surgeMultiplier: 1, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'led-tube', name: 'LED Tube Light (20W)', category: 'lighting', watts: 20, powerFactor: 0.9, surgeMultiplier: 1, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'led-tv', name: 'LED TV (32-43")', category: 'entertainment', watts: 60, powerFactor: 0.95, surgeMultiplier: 1, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'refrigerator', name: 'Refrigerator', category: 'kitchen', watts: 150, powerFactor: 0.8, surgeMultiplier: 5, dutyCycle: 0.35, inverterFriendly: 'caution', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'wifi-router', name: 'Wi-Fi Router / ONU', category: 'office', watts: 12, powerFactor: 0.9, surgeMultiplier: 1, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'laptop', name: 'Laptop Charger', category: 'office', watts: 65, powerFactor: 0.95, surgeMultiplier: 1, dutyCycle: 0.8, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'phone-charger', name: 'Phone Charger', category: 'other', watts: 10, powerFactor: 0.9, surgeMultiplier: 1, dutyCycle: 0.5, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'desktop-pc', name: 'Desktop PC + Monitor', category: 'office', watts: 200, powerFactor: 0.85, surgeMultiplier: 1.5, dutyCycle: 0.9, inverterFriendly: 'caution', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'water-pump', name: 'Water Pump (0.5HP)', category: 'water', watts: 375, powerFactor: 0.75, surgeMultiplier: 5, dutyCycle: 0.2, inverterFriendly: 'caution', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'washing-machine', name: 'Washing Machine', category: 'kitchen', watts: 500, powerFactor: 0.8, surgeMultiplier: 4, dutyCycle: 0.3, inverterFriendly: 'caution', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'rice-cooker', name: 'Rice Cooker', category: 'kitchen', watts: 700, powerFactor: 1.0, surgeMultiplier: 1, dutyCycle: 0.3, inverterFriendly: 'avoid', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'iron', name: 'Electric Iron', category: 'other', watts: 1000, powerFactor: 1.0, surgeMultiplier: 1, dutyCycle: 0.2, inverterFriendly: 'avoid', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'geyser', name: 'Water Heater / Geyser', category: 'water', watts: 2000, powerFactor: 1.0, surgeMultiplier: 1, dutyCycle: 0.3, inverterFriendly: 'avoid', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'air-conditioner', name: 'Air Conditioner (1 ton)', category: 'cooling', watts: 1200, powerFactor: 0.85, surgeMultiplier: 5, dutyCycle: 0.7, inverterFriendly: 'avoid', verified: false, updatedAt: UNVERIFIED_DATE },
  { id: 'medical-device', name: 'Medical Device (CPAP/O2)', category: 'medical', watts: 100, powerFactor: 0.9, surgeMultiplier: 1, dutyCycle: 1, inverterFriendly: 'ok', verified: false, updatedAt: UNVERIFIED_DATE },
];

export const defaultInverter: Inverter = {
  id: 'sako-esun-1200',
  brand: 'SAKO',
  model: 'E-SUN 1.2KVA',
  ratedVA: 1200,
  ratedW: 720,
  surgeW: null,
  systemVoltage: 12,
  idleW: 30,
  efficiencyCurve: [
    { loadFraction: 0.1, eff: 0.80 },
    { loadFraction: 0.25, eff: 0.88 },
    { loadFraction: 0.5, eff: 0.91 },
    { loadFraction: 0.75, eff: 0.90 },
    { loadFraction: 1.0, eff: 0.88 },
  ],
  modes: ['ips', 'utility_first', 'solar_first', 'sbu'],
  gridChargerMaxA: 20,
  maxTotalChargeA: 30,
  mppt: {
    maxPvVoc: 145,
    vMin: 60,
    vMax: 130,
    maxPvW: 1200,
    maxPvCurrentA: 25,
    maxChargeA: 20,
  },
  verified: false,
  source: 'Check your datasheet for exact specs',
  updatedAt: UNVERIFIED_DATE,
};

export const batteryCatalog: BatteryUnit[] = [
  {
    id: 'lifepo4-12v-100ah',
    chemistry: 'lifepo4',
    nominalV: 12.8,
    ratedAh: 100,
    ratedHours: null,
    usableDoD: 0.90,
    peukertK: 1.0,
    maxChargeC: 1.0,
    maxChargeA: 100,
    maxDischargeA: 100,
    chargeEfficiency: 0.95,
    cycleLife: [
      { dod: 0.2, cycles: { low: 4000, typ: 5000, high: 6000 } },
      { dod: 0.5, cycles: { low: 3000, typ: 4000, high: 5000 } },
      { dod: 0.8, cycles: { low: 2000, typ: 3000, high: 4000 } },
      { dod: 1.0, cycles: { low: 1500, typ: 2000, high: 3000 } },
    ],
    calendarLifeYears: { low: 8, typ: 10, high: 15 },
    weightKg: 12,
    price: 32000,
    verified: false,
    source: 'Editable default - verify with your battery datasheet',
    updatedAt: UNVERIFIED_DATE,
  },
  {
    id: 'lifepo4-12v-150ah',
    chemistry: 'lifepo4',
    nominalV: 12.8,
    ratedAh: 150,
    ratedHours: null,
    usableDoD: 0.90,
    peukertK: 1.0,
    maxChargeC: 1.0,
    maxChargeA: 150,
    maxDischargeA: 150,
    chargeEfficiency: 0.95,
    cycleLife: [
      { dod: 0.2, cycles: { low: 4000, typ: 5000, high: 6000 } },
      { dod: 0.5, cycles: { low: 3000, typ: 4000, high: 5000 } },
      { dod: 0.8, cycles: { low: 2000, typ: 3000, high: 4000 } },
      { dod: 1.0, cycles: { low: 1500, typ: 2000, high: 3000 } },
    ],
    calendarLifeYears: { low: 8, typ: 10, high: 15 },
    weightKg: 17,
    price: 48000,
    verified: false,
    source: 'Editable default - verify with your battery datasheet',
    updatedAt: UNVERIFIED_DATE,
  },
  {
    id: 'lifepo4-12v-200ah',
    chemistry: 'lifepo4',
    nominalV: 12.8,
    ratedAh: 200,
    ratedHours: null,
    usableDoD: 0.90,
    peukertK: 1.0,
    maxChargeC: 1.0,
    maxChargeA: 200,
    maxDischargeA: 200,
    chargeEfficiency: 0.95,
    cycleLife: [
      { dod: 0.2, cycles: { low: 4000, typ: 5000, high: 6000 } },
      { dod: 0.5, cycles: { low: 3000, typ: 4000, high: 5000 } },
      { dod: 0.8, cycles: { low: 2000, typ: 3000, high: 4000 } },
      { dod: 1.0, cycles: { low: 1500, typ: 2000, high: 3000 } },
    ],
    calendarLifeYears: { low: 8, typ: 10, high: 15 },
    weightKg: 23,
    price: 62000,
    verified: false,
    source: 'Editable default - verify with your battery datasheet',
    updatedAt: UNVERIFIED_DATE,
  },
  {
    id: 'tubular-12v-200ah',
    chemistry: 'tubular',
    nominalV: 12,
    ratedAh: 200,
    ratedHours: 10,
    usableDoD: 0.50,
    peukertK: 1.2,
    maxChargeC: 0.2,
    maxChargeA: 40,
    maxDischargeA: null,
    chargeEfficiency: 0.85,
    cycleLife: [
      { dod: 0.2, cycles: { low: 1200, typ: 1500, high: 1800 } },
      { dod: 0.5, cycles: { low: 700, typ: 1000, high: 1200 } },
      { dod: 0.8, cycles: { low: 350, typ: 500, high: 700 } },
      { dod: 1.0, cycles: { low: 200, typ: 300, high: 400 } },
    ],
    calendarLifeYears: { low: 3, typ: 5, high: 7 },
    weightKg: 55,
    price: 18000,
    verified: false,
    source: 'Editable default - verify with your battery datasheet',
    updatedAt: UNVERIFIED_DATE,
  },
];

export const defaultPvPanel: PvPanel = {
  id: 'mono-550wp',
  wp: 550,
  voc: 49.5,
  vmp: 41.0,
  isc: 13.5,
  imp: 13.0,
  tempCoeffVocPctPerC: -0.28,
  tempCoeffPmaxPctPerC: -0.35,
  price: 12000,
  verified: false,
  source: 'Editable default - verify with panel datasheet',
  updatedAt: UNVERIFIED_DATE,
};

export const defaultSolarSite: SolarSite = {
  peakSunHours: { low: 3.5, typ: 4.5, high: 5.5 },
  sunrise: 6,
  sunset: 18,
  systemDerate: 0.75,
  tMinC: 10,
  tCellMaxC: 65,
  cloudyDayFactor: 0.25,
  worstCaseCloudyDays: 2,
};

export const defaultTariff: Tariff = {
  currency: 'BDT',
  slabs: [
    { upToKwh: 75, rate: 4.00 },
    { upToKwh: 200, rate: 5.45 },
    { upToKwh: 300, rate: 5.80 },
    { upToKwh: 400, rate: 6.15 },
    { upToKwh: 600, rate: 9.10 },
    { upToKwh: null, rate: 11.25 },
  ],
  fixedMonthly: 30,
  vatPct: 5,
};

export const defaultGridSchedule: GridSchedule = {
  mode: 'pattern',
  outageMinutes: 90,
  gridMinutes: 180,
  firstOutageStartMinute: 360, // 6 AM
  nightOverride: { fromHour: 20, toHour: 6, outageMinutes: 120, gridMinutes: 120 },
};

export function getDefaultHourly(category: string): number[] {
  const h = new Array(24).fill(0.5);
  switch (category) {
    case 'cooling':
      return [0.3, 0.3, 0.3, 0.3, 0.3, 0.3, 0.5, 0.7, 0.8, 0.6, 0.5, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.0, 1.0, 0.9, 0.8, 0.6, 0.4];
    case 'lighting':
      return [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.3, 0.8, 1.0, 1.0, 0.9, 0.5, 0.2];
    case 'entertainment':
      return [0.1, 0.1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.1, 0.2, 0.1, 0.1, 0.1, 0.2, 0.4, 0.8, 1.0, 1.0, 0.8, 0.5, 0.2];
    case 'kitchen':
      return [0.0, 0.0, 0.0, 0.0, 0.0, 0.1, 0.3, 0.5, 0.2, 0.1, 0.1, 0.3, 0.5, 0.3, 0.1, 0.1, 0.2, 0.4, 0.6, 0.5, 0.3, 0.1, 0.0, 0.0];
    case 'water':
      return [0.0, 0.0, 0.0, 0.0, 0.0, 0.5, 0.8, 0.3, 0.0, 0.0, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0, 0.3, 0.5, 0.3, 0.0, 0.0, 0.0, 0.0];
    case 'office':
      return [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.2, 0.8, 1.0, 1.0, 0.9, 0.8, 0.5, 0.8, 1.0, 1.0, 0.9, 0.7, 0.5, 0.4, 0.3, 0.2, 0.1, 0.1];
    case 'medical':
      return new Array(24).fill(1.0);
    default:
      return h;
  }
}
