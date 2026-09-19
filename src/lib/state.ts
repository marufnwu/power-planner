import LZString from 'lz-string';
import { Project } from '../types';
import { defaultInverter, batteryCatalog, defaultSolarSite, defaultTariff, defaultGridSchedule } from '../data/catalogs';
import { getDefaultHourly } from '../data/catalogs';
import { generateHourlyProfile } from './usageProfiles';

/**
 * Encode project to URL-safe compressed string
 */
export function encodeProject(project: Project): string {
  const json = JSON.stringify(project);
  return LZString.compressToEncodedURIComponent(json);
}

/**
 * Decode project from URL string
 */
export function decodeProject(encoded: string): Project | null {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const parsed = JSON.parse(json);
    return migrateProject(parsed);
  } catch {
    return null;
  }
}

/**
 * Schema migration - add defaults for missing fields
 */
function migrateProject(data: Record<string, unknown>): Project {
  // Ensure all required fields exist with defaults
  const project = data as unknown as Project;
  if (!project.v) project.v = 1;
  if (!project.locale) project.locale = 'en';
  if (!project.currency) project.currency = 'BDT';
  if (!project.grid) project.grid = { ...defaultGridSchedule };
  if (!project.site) project.site = { ...defaultSolarSite };
  if (!project.tariff) project.tariff = { ...defaultTariff };
  if (!project.options) {
    project.options = {
      mode: 'ips',
      assumptionSet: 'typ',
      initialSoC: 100,
      reservePct: 10,
      simulationDays: 3,
    };
  }
  return project;
}

/**
 * Create a default project with the standard scenario
 */
export function createDefaultProject(): Project {
  const defaultBattery = batteryCatalog[0]; // LiFePO4 100Ah
  
  return {
    v: 1,
    locale: 'en',
    currency: 'BDT',
    loads: [
      {
        id: 'load-fan',
        templateId: 'ceiling-fan',
        label: 'Ceiling Fan',
        qty: 3,
        watts: 70,
        powerFactor: 0.85,
        surgeMultiplier: 1.5,
        dutyCycle: 1,
        hourly: generateHourlyProfile('both', 'cooling'),
        onBackupCircuit: true,
        priority: 2,
        usageProfile: 'both',
      },
      {
        id: 'load-light',
        templateId: 'led-bulb',
        label: 'LED Light',
        qty: 3,
        watts: 10,
        powerFactor: 0.9,
        surgeMultiplier: 1,
        dutyCycle: 1,
        hourly: generateHourlyProfile('night', 'lighting'),
        onBackupCircuit: true,
        priority: 2,
        usageProfile: 'night',
      },
      {
        id: 'load-router',
        templateId: 'wifi-router',
        label: 'Wi-Fi Router',
        qty: 1,
        watts: 12,
        powerFactor: 0.9,
        surgeMultiplier: 1,
        dutyCycle: 1,
        hourly: generateHourlyProfile('both', 'office'),
        onBackupCircuit: true,
        priority: 1,
        usageProfile: 'both',
      },
    ],
    grid: { ...defaultGridSchedule },
    inverter: { ...defaultInverter },
    bank: { unit: defaultBattery, series: 1, parallel: 1 },
    site: { ...defaultSolarSite },
    tariff: { ...defaultTariff },
    options: {
      mode: 'ips',
      assumptionSet: 'typ',
      initialSoC: 100,
      reservePct: 10,
      simulationDays: 3,
    },
  };
}

/**
 * Get shareable URL for a project
 */
export function getShareUrl(project: Project): string {
  const encoded = encodeProject(project);
  const base = window.location.origin + window.location.pathname;
  return `${base}?s=${encoded}&v=1`;
}
