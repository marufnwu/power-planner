/**
 * Enhanced calculation engine with real-world factors
 * 
 * This module implements comprehensive power system calculations
 * accounting for temperature, aging, efficiency curves, and other
 * real-world variables.
 */

import { BatteryUnit, Inverter, PvPanel, LoadItem, GridSchedule } from '../types';

// ============================================================
// TEMPERATURE CORRECTIONS
// ============================================================

/**
 * Battery capacity temperature correction
 * Lead-acid: -0.5% per °C below 25°C
 * LiFePO4: -0.2% per °C below 25°C (less sensitive)
 */
export function batteryCapacityTempCorrection(
  chemistry: string,
  tempC: number,
  ratedCapacity: number
): number {
  const refTemp = 25;
  const tempDiff = refTemp - tempC;
  
  let correctionFactor = 1.0;
  
  if (chemistry === 'tubular' || chemistry === 'flooded' || chemistry === 'agm_gel') {
    // Lead-acid: more sensitive to temperature
    correctionFactor = 1 - (0.005 * tempDiff);
  } else if (chemistry === 'lifepo4') {
    // LiFePO4: less sensitive
    correctionFactor = 1 - (0.002 * tempDiff);
  }
  
  // Clamp to reasonable range
  correctionFactor = Math.max(0.7, Math.min(1.1, correctionFactor));
  
  return ratedCapacity * correctionFactor;
}

/**
 * Solar panel temperature correction
 * Power output decreases with temperature
 * Typical coefficient: -0.3% to -0.5% per °C above 25°C
 */
export function solarPanelTempCorrection(
  tempCoeffPct: number, // e.g., -0.35 for -0.35%/°C
  cellTempC: number,
  ratedPower: number
): number {
  const refTemp = 25;
  const tempDiff = cellTempC - refTemp;
  
  const correctionFactor = 1 + (tempCoeffPct / 100) * tempDiff;
  
  return ratedPower * correctionFactor;
}

/**
 * Estimate solar cell temperature from ambient
 * Cell temp ≈ Ambient + (NOCT - 20) × (Irradiance / 800)
 * NOCT = Nominal Operating Cell Temperature (typically 45-48°C)
 */
export function estimateCellTemperature(
  ambientTempC: number,
  irradiance: number, // W/m²
  noct: number = 45 // Nominal Operating Cell Temperature
): number {
  return ambientTempC + (noct - 20) * (irradiance / 800);
}

// ============================================================
// BATTERY AGING & DEGRADATION
// ============================================================

/**
 * Battery capacity degradation over time
 * Calendar aging: ~2% per year for LiFePO4, ~5% for lead-acid
 */
export function batteryCalendarAging(
  chemistry: string,
  ageYears: number,
  ratedCapacity: number
): number {
  let annualDegradation = 0.02; // 2% per year
  
  if (chemistry === 'tubular' || chemistry === 'flooded') {
    annualDegradation = 0.05; // 5% per year for lead-acid
  } else if (chemistry === 'agm_gel') {
    annualDegradation = 0.03;
  }
  
  const degradationFactor = 1 - (annualDegradation * ageYears);
  
  // Battery is considered end-of-life at 80% capacity
  return ratedCapacity * Math.max(0.8, degradationFactor);
}

/**
 * Battery cycle life calculation with DoD impact
 * Cycle life decreases exponentially with deeper discharge
 */
export function batteryCycleLife(
  chemistry: string,
  dod: number, // Depth of discharge (0-1)
  ratedCycles: number, // Cycles at 100% DoD
  ratedDod: number = 1.0 // DoD at which rated cycles apply
): number {
  // Exponential relationship: Cycles ∝ DoD^-1.5
  const dodRatio = ratedDod / dod;
  const cycleMultiplier = Math.pow(dodRatio, 1.5);
  
  return ratedCycles * cycleMultiplier;
}

/**
 * Peukert effect for lead-acid batteries
 * Capacity reduces at high discharge rates
 * Peukert exponent: 1.1-1.3 for lead-acid, 1.0 for LiFePO4
 */
export function peukertCorrection(
  chemistry: string,
  dischargeCurrent: number,
  ratedCapacity: number,
  ratedHours: number = 20, // Capacity rated at 20-hour rate
  peukertExponent: number = 1.2
): number {
  if (chemistry === 'lifepo4') {
    // LiFePO4: minimal Peukert effect
    return ratedCapacity;
  }
  
  // Peukert equation: C = I^k × t
  // Actual capacity = Rated capacity × (Rated hours / Actual hours)^(k-1)
  const actualHours = ratedCapacity / dischargeCurrent;
  const correctionFactor = Math.pow(ratedHours / actualHours, peukertExponent - 1);
  
  return ratedCapacity * correctionFactor;
}

// ============================================================
// INVERTER EFFICIENCY
// ============================================================

/**
 * Inverter efficiency at given load
 * Efficiency is typically highest at 30-50% load
 */
export function inverterEfficiency(
  inverter: Inverter,
  loadPower: number
): number {
  const loadRatio = loadPower / inverter.ratedW;
  
  // If we have an efficiency curve, interpolate
  if (inverter.efficiencyCurve && inverter.efficiencyCurve.length > 0) {
    return interpolateEfficiencyCurve(inverter.efficiencyCurve, loadRatio);
  }
  
  // Default efficiency model
  let efficiency = 0.90; // Base efficiency
  
  // Low load penalty
  if (loadRatio < 0.2) {
    efficiency = 0.75 + (loadRatio / 0.2) * 0.15; // 75-90% for 0-20% load
  } else if (loadRatio < 0.5) {
    efficiency = 0.90 + ((loadRatio - 0.2) / 0.3) * 0.05; // 90-95% for 20-50% load
  } else if (loadRatio < 0.8) {
    efficiency = 0.95; // Peak efficiency 30-80% load
  } else {
    efficiency = 0.95 - ((loadRatio - 0.8) / 0.2) * 0.05; // 95-90% for 80-100% load
  }
  
  return efficiency;
}

/**
 * Interpolate efficiency from curve data
 */
function interpolateEfficiencyCurve(
  curve: Array<{ loadFraction: number; eff: number }>,
  loadRatio: number
): number {
  if (curve.length === 0) return 0.90;
  if (loadRatio <= curve[0].loadFraction) return curve[0].eff;
  if (loadRatio >= curve[curve.length - 1].loadFraction) {
    return curve[curve.length - 1].eff;
  }
  
  // Find the two points to interpolate between
  for (let i = 0; i < curve.length - 1; i++) {
    if (loadRatio >= curve[i].loadFraction && loadRatio <= curve[i + 1].loadFraction) {
      const t = (loadRatio - curve[i].loadFraction) / 
                (curve[i + 1].loadFraction - curve[i].loadFraction);
      return curve[i].eff + t * (curve[i + 1].eff - curve[i].eff);
    }
  }
  
  return 0.90;
}

/**
 * Inverter no-load consumption
 * Typically 10-50W for modern inverters
 */
export function inverterNoLoadConsumption(inverter: Inverter): number {
  return inverter.idleW || (inverter.ratedW * 0.02); // 2% of rated power if not specified
}

// ============================================================
// LOAD CALCULATIONS
// ============================================================

/**
 * Calculate peak load with diversity factor
 * Not all loads run simultaneously
 */
export function calculatePeakLoad(
  loads: LoadItem[],
  diversityFactor: number = 0.8
): number {
  const totalConnected = loads.reduce((sum, load) => sum + load.watts, 0);
  return totalConnected * diversityFactor;
}

/**
 * Calculate apparent power (VA) from real power (W)
 * Accounts for power factor
 */
export function calculateApparentPower(
  realPower: number,
  powerFactor: number = 0.85
): number {
  return realPower / powerFactor;
}

/**
 * Calculate starting surge for motor loads
 * Motors draw 5-7× rated current during startup
 */
export function calculateStartingSurge(
  load: LoadItem,
  surgeMultiplier: number = 6
): number {
  // Use surgeMultiplier from load if available, otherwise use default
  const multiplier = load.surgeMultiplier || surgeMultiplier;
  
  // If surge multiplier > 1.5, likely a motor load
  if (multiplier > 1.5) {
    return load.watts * multiplier;
  }
  return load.watts;
}

/**
 * Calculate daily energy consumption
 */
export function calculateDailyEnergy(
  loads: LoadItem[],
  usageHours: number = 24
): number {
  return loads.reduce((sum, load) => {
    // Estimate daily hours based on usage profile
    let dailyHours = usageHours;
    if (load.usageProfile === 'night') {
      dailyHours = usageHours * 0.5; // Night usage is roughly half
    } else if (load.usageProfile === 'day') {
      dailyHours = usageHours * 0.5; // Day usage is roughly half
    } else if (load.usageProfile === 'occasional') {
      dailyHours = usageHours * 0.25; // Occasional usage is roughly quarter
    }
    
    // Apply duty cycle if available
    const effectiveHours = dailyHours * (load.dutyCycle || 1);
    
    return sum + (load.watts * effectiveHours);
  }, 0);
}

// ============================================================
// SOLAR CALCULATIONS
// ============================================================

/**
 * Calculate daily solar energy production
 * Accounts for system losses, temperature, soiling
 */
export function calculateDailySolarProduction(
  panelPower: number, // Watts
  peakSunHours: number,
  systemEfficiency: number = 0.80, // 80% typical
  temperatureCorrection: number = 1.0,
  soilingLoss: number = 0.05 // 5% soiling loss
): number {
  const production = panelPower * peakSunHours * systemEfficiency;
  const tempAdjusted = production * temperatureCorrection;
  const soilingAdjusted = tempAdjusted * (1 - soilingLoss);
  
  return soilingAdjusted;
}

/**
 * Calculate required solar array size
 * Accounts for all losses and safety margins
 */
export function calculateRequiredSolarSize(
  dailyEnergy: number, // Wh
  peakSunHours: number,
  systemEfficiency: number = 0.80,
  safetyMargin: number = 1.15 // 15% safety margin
): number {
  const required = (dailyEnergy * safetyMargin) / (peakSunHours * systemEfficiency);
  return Math.ceil(required / 50) * 50; // Round up to nearest 50W
}

/**
 * Calculate solar system losses
 */
export function calculateSolarSystemLosses(): {
  wiring: number;
  mismatch: number;
  inverter: number;
  soiling: number;
  degradation: number;
  total: number;
} {
  const losses = {
    wiring: 0.02, // 2%
    mismatch: 0.03, // 3%
    inverter: 0.05, // 5%
    soiling: 0.05, // 5%
    degradation: 0.01, // 1% first year
  };
  
  // Total system efficiency = product of (1 - each loss)
  const totalEfficiency = Object.values(losses).reduce(
    (eff, loss) => eff * (1 - loss),
    1
  );
  
  return {
    ...losses,
    total: 1 - totalEfficiency,
  };
}

// ============================================================
// SYSTEM SIZING
// ============================================================

/**
 * Calculate required battery capacity
 * Accounts for DoD, efficiency, temperature, aging, safety margin
 */
export function calculateRequiredBatteryCapacity(
  dailyEnergy: number, // Wh
  autonomyDays: number,
  dod: number, // Depth of discharge (0-1)
  inverterEfficiency: number,
  batteryEfficiency: number = 0.95,
  temperatureCorrection: number = 1.0,
  agingCorrection: number = 1.0,
  safetyMargin: number = 1.20, // 20% safety margin
  systemVoltage: number = 48
): {
  capacityWh: number;
  capacityAh: number;
  usableWh: number;
} {
  // Energy needed from battery
  const energyNeeded = dailyEnergy * autonomyDays;
  
  // Account for inverter efficiency
  const energyFromBattery = energyNeeded / inverterEfficiency;
  
  // Account for battery efficiency (round-trip)
  const energyStored = energyFromBattery / batteryEfficiency;
  
  // Account for temperature and aging
  const energyAdjusted = energyStored / (temperatureCorrection * agingCorrection);
  
  // Account for DoD
  const totalCapacity = energyAdjusted / dod;
  
  // Add safety margin
  const capacityWithMargin = totalCapacity * safetyMargin;
  
  // Convert to Ah
  const capacityAh = capacityWithMargin / systemVoltage;
  
  return {
    capacityWh: Math.ceil(capacityWithMargin / 100) * 100, // Round to nearest 100Wh
    capacityAh: Math.ceil(capacityAh / 10) * 10, // Round to nearest 10Ah
    usableWh: capacityWithMargin * dod,
  };
}

/**
 * Calculate required inverter size
 * Accounts for peak load, surge, power factor, safety margin
 */
export function calculateRequiredInverterSize(
  loads: LoadItem[],
  diversityFactor: number = 0.8,
  powerFactor: number = 0.85,
  safetyMargin: number = 1.25 // 25% safety margin
): {
  continuousW: number;
  surgeW: number;
  ratedVA: number;
} {
  // Calculate peak continuous load with diversity
  const peakContinuous = calculatePeakLoad(loads, diversityFactor);
  
  // Calculate maximum surge (largest motor starting)
  const maxSurge = Math.max(
    ...loads.map(load => calculateStartingSurge(load))
  );
  
  // Account for power factor
  const apparentPower = calculateApparentPower(peakContinuous, powerFactor);
  
  // Add safety margin
  const continuousWithMargin = peakContinuous * safetyMargin;
  const surgeWithMargin = maxSurge * 1.1; // 10% margin on surge
  
  // Round up to standard sizes
  const ratedW = Math.ceil(continuousWithMargin / 100) * 100;
  const ratedVA = Math.ceil(apparentPower * safetyMargin / 100) * 100;
  
  return {
    continuousW: ratedW,
    surgeW: Math.ceil(surgeWithMargin / 100) * 100,
    ratedVA,
  };
}

// ============================================================
// RUNTIME CALCULATIONS
// ============================================================

/**
 * Calculate battery runtime at given load
 * Comprehensive calculation with all corrections
 */
export function calculateBatteryRuntime(
  batteryCapacity: number, // Ah
  systemVoltage: number, // V
  loadPower: number, // W
  dod: number, // Depth of discharge (0-1)
  inverterEfficiency: number,
  batteryEfficiency: number = 0.95,
  temperatureCorrection: number = 1.0,
  agingCorrection: number = 1.0,
  dischargeRate: number = 1.0 // C-rate
): number {
  // Usable capacity
  const usableCapacity = batteryCapacity * dod;
  
  // Energy available
  const energyAvailable = usableCapacity * systemVoltage * 
                          batteryEfficiency * temperatureCorrection * agingCorrection;
  
  // Power from battery (accounting for inverter efficiency)
  const powerFromBattery = loadPower / inverterEfficiency;
  
  // Runtime in hours
  const runtime = energyAvailable / powerFromBattery;
  
  return runtime;
}

/**
 * Calculate recharge time
 * Accounts for charging efficiency and current limits
 */
export function calculateRechargeTime(
  energyUsed: number, // Wh
  chargePower: number, // W
  chargingEfficiency: number = 0.90
): number {
  const energyNeeded = energyUsed / chargingEfficiency;
  return energyNeeded / chargePower;
}

// ============================================================
// COST CALCULATIONS
// ============================================================

/**
 * Calculate levelized cost of energy (LCOE)
 * Total cost over system life divided by total energy delivered
 */
export function calculateLCOE(
  systemCost: number,
  annualMaintenance: number,
  systemLifeYears: number,
  annualEnergy: number, // kWh/year
  discountRate: number = 0.05
): number {
  // Total cost over lifetime (with discounting)
  let totalCost = systemCost;
  for (let year = 1; year <= systemLifeYears; year++) {
    totalCost += annualMaintenance / Math.pow(1 + discountRate, year);
  }
  
  // Total energy over lifetime (with discounting)
  let totalEnergy = 0;
  for (let year = 1; year <= systemLifeYears; year++) {
    totalEnergy += annualEnergy / Math.pow(1 + discountRate, year);
  }
  
  return totalCost / totalEnergy;
}

/**
 * Calculate simple payback period
 */
export function calculatePaybackPeriod(
  systemCost: number,
  annualSavings: number
): number {
  return systemCost / annualSavings;
}

/**
 * Calculate return on investment (ROI)
 */
export function calculateROI(
  systemCost: number,
  annualSavings: number,
  years: number
): number {
  const totalSavings = annualSavings * years;
  return ((totalSavings - systemCost) / systemCost) * 100;
}

// ============================================================
// SENSITIVITY ANALYSIS
// ============================================================

/**
 * Perform sensitivity analysis on key parameters
 */
export function sensitivityAnalysis(
  baseCalculation: () => number,
  parameters: Array<{
    name: string;
    baseValue: number;
    variation: number; // ± percentage
    setter: (value: number) => void;
  }>
): Array<{
  parameter: string;
  baseResult: number;
  lowResult: number;
  highResult: number;
  sensitivity: number; // % change in result per % change in parameter
}> {
  const baseResult = baseCalculation();
  
  return parameters.map(param => {
    // Low value
    param.setter(param.baseValue * (1 - param.variation / 100));
    const lowResult = baseCalculation();
    
    // High value
    param.setter(param.baseValue * (1 + param.variation / 100));
    const highResult = baseCalculation();
    
    // Reset to base
    param.setter(param.baseValue);
    
    // Calculate sensitivity
    const avgChange = (highResult - lowResult) / 2;
    const sensitivity = (avgChange / baseResult) / (param.variation / 100);
    
    return {
      parameter: param.name,
      baseResult,
      lowResult,
      highResult,
      sensitivity,
    };
  });
}

// ============================================================
// EXPORTS
// ============================================================

export const EnhancedCalculator = {
  // Temperature
  batteryCapacityTempCorrection,
  solarPanelTempCorrection,
  estimateCellTemperature,
  
  // Battery
  batteryCalendarAging,
  batteryCycleLife,
  peukertCorrection,
  
  // Inverter
  inverterEfficiency,
  inverterNoLoadConsumption,
  
  // Load
  calculatePeakLoad,
  calculateApparentPower,
  calculateStartingSurge,
  calculateDailyEnergy,
  
  // Solar
  calculateDailySolarProduction,
  calculateRequiredSolarSize,
  calculateSolarSystemLosses,
  
  // Sizing
  calculateRequiredBatteryCapacity,
  calculateRequiredInverterSize,
  
  // Runtime
  calculateBatteryRuntime,
  calculateRechargeTime,
  
  // Cost
  calculateLCOE,
  calculatePaybackPeriod,
  calculateROI,
  
  // Analysis
  sensitivityAnalysis,
};
