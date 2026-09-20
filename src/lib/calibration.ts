import { BackupTest, CalibrationProfile, Project, SimulationResult } from '../types';
import { runSimulation, r2 } from './engine/calculator';

/**
 * M1: Calibration Engine
 * Implements Mode A (systemLoss), Mode B (lossModel), and Mode C (capacity)
 */

// ============================================================
// VALIDATION RULES (Section 5.6b)
// ============================================================

export interface ValidationResult {
  valid: boolean;
  blocked: boolean;
  warnings: string[];
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Validate a backup test before fitting
 */
export function validateTest(test: BackupTest, project: Project): ValidationResult {
  const warnings: string[] = [];
  let blocked = false;
  
  const deltaSoC = test.startSoC - test.endSoC;
  
  // Block conditions
  if (deltaSoC < 5) {
    return { valid: false, blocked: true, warnings: ['ΔSoC < 5%'], confidence: 'low' };
  }
  if (test.endSoC >= test.startSoC) {
    return { valid: false, blocked: true, warnings: ['endSoC ≥ startSoC'], confidence: 'low' };
  }
  if (test.durationMin < 15) {
    return { valid: false, blocked: true, warnings: ['Duration < 15 min'], confidence: 'low' };
  }
  
  // Check hardware match
  if (test.hardwareSnapshot.inverterId !== project.inverter.id ||
      test.hardwareSnapshot.bankUnitId !== project.bank.unit.id) {
    return { valid: false, blocked: true, warnings: ['Hardware mismatch'], confidence: 'low' };
  }
  
  // Determine confidence
  let confidence: 'high' | 'medium' | 'low' = 'medium';
  
  // Start with high confidence for good sources
  if (test.socSource === 'bms' || test.socSource === 'inverter_display') {
    confidence = 'high';
  }
  
  // Warn conditions - downgrade confidence
  if (deltaSoC < 15) {
    warnings.push('Small ΔSoC (<15%) → wide range. Aim for 20–40%.');
    confidence = 'low';
  }
  
  if (test.startSoC < 50) {
    warnings.push('Battery near low end; readings less reliable.');
    if (confidence === 'high') confidence = 'medium';
  }
  
  if (test.socSource === 'voltage_estimate' && project.bank.unit.chemistry === 'lifepo4') {
    warnings.push('Voltage is poor SoC guide on LFP (flat curve).');
    confidence = 'low';
  }
  
  if (!test.loadStayedConstant) {
    warnings.push('Load changed mid-test; result is approximate.');
    if (confidence === 'high') confidence = 'medium';
  }
  
  if (test.batteryTempC !== undefined && (test.batteryTempC < 15 || test.batteryTempC > 40)) {
    warnings.push('Battery temperature outside 15–40°C range.');
    if (confidence === 'high') confidence = 'medium';
  }
  
  // Final confidence adjustment
  if (confidence === 'high' && !(deltaSoC >= 15 && warnings.length === 0)) {
    confidence = 'medium';
  }
  
  return {
    valid: true,
    blocked: false,
    warnings,
    confidence
  };
}

// ============================================================
// MODE A: systemLoss (MVP)
// ============================================================

/**
 * Calculate system loss factor k from a single test
 * k = E_batt_observed / E_batt_predicted
 */
export function fitModeA(test: BackupTest, project: Project): {
  k: number;
  interval: { low: number; high: number };
  eff_sys: number;
} | null {
  // Calculate observed battery energy
  const C_Wh = project.bank.unit.nominalV * project.bank.unit.ratedAh * 
               project.bank.series * project.bank.parallel;
  const deltaSoC = test.startSoC - test.endSoC;
  const E_batt = (deltaSoC / 100) * C_Wh;
  const T_h = test.durationMin / 60;
  const P_batt_obs = E_batt / T_h;
  
  // Calculate load energy
  let P_load: number;
  if (test.load.kind === 'measured') {
    P_load = test.load.watts;
  } else {
    // Modeled load - calculate average over test duration
    const modeledLoad = test.load;
    const loadItems = project.loads.filter(l => modeledLoad.loadIds.includes(l.id));
    let totalLoad = 0;
    for (const load of loadItems) {
      const hour = Math.floor((modeledLoad.clockStartMinute + test.durationMin / 2) / 60) % 24;
      const hourFraction = load.hourly[hour] || 0;
      totalLoad += load.qty * load.watts * load.dutyCycle * hourFraction;
    }
    P_load = totalLoad * (modeledLoad.multiplierOverride || 1);
  }
  
  const E_ac = P_load * T_h;
  const eff_sys = E_ac / E_batt;
  
  // Run uncalibrated simulation to get predicted battery draw
  const uncalibratedProject: Project = { ...project, calibration: null };
  const result = runSimulation(uncalibratedProject);
  
  // Calculate predicted battery energy over test duration
  // We need to simulate just the test period
  const testProject: Project = {
    ...project,
    calibration: null,
    grid: {
      ...project.grid,
      outageMinutes: test.durationMin,
      gridMinutes: 0,
      firstOutageStartMinute: 0
    },
    options: {
      ...project.options,
      initialSoC: test.startSoC,
      simulationDays: 1
    }
  };
  
  // Override loads if modeled
  if (test.load.kind === 'modeled') {
    const modeledLoad = test.load;
    testProject.loads = project.loads.filter(l => modeledLoad.loadIds.includes(l.id));
  } else {
    // Create a constant load for measured
    testProject.loads = [{
      id: 'test-load',
      label: 'Test Load',
      qty: 1,
      watts: P_load,
      powerFactor: 1,
      surgeMultiplier: 1,
      dutyCycle: 1,
      hourly: new Array(24).fill(1),
      onBackupCircuit: true,
      priority: 2,
      usageProfile: 'both'
    }];
  }
  
  const testResult = runSimulation(testProject);
  
  // Calculate E_model from simulation
  const E_model = testResult.timeSeries.reduce((sum, step) => {
    if (step.battW < 0) {
      return sum + Math.abs(step.battW) * 0.25; // 15-min steps
    }
    return sum;
  }, 0);
  
  if (E_model === 0) return null;
  
  const k = E_batt / E_model;
  
  // Check if k is reasonable
  if (k < 0.6 || k > 1.8) {
    return null; // Reject fit
  }
  
  // Calculate uncertainty interval
  const sigmaSoC = getSoCUncertainty(test.socSource);
  const sigmaDelta = sigmaSoC * Math.sqrt(2);
  const deltaSoC_low = deltaSoC - sigmaDelta;
  const deltaSoC_high = deltaSoC + sigmaDelta;
  
  const E_batt_low = (deltaSoC_low / 100) * C_Wh;
  const E_batt_high = (deltaSoC_high / 100) * C_Wh;
  
  const k_low = E_batt_low / E_model;
  const k_high = E_batt_high / E_model;
  
  return {
    k: r2(k),
    interval: { low: r2(k_low), high: r2(k_high) },
    eff_sys: r2(eff_sys)
  };
}

// ============================================================
// MODE B: lossModel (v2)
// ============================================================

/**
 * Fit linear loss model: P_batt = a * P_load + b
 * Requires at least 2 tests with different load levels
 */
export function fitModeB(tests: BackupTest[], project: Project): {
  a: number;
  b: number;
  rSquared: number;
  interval: { a: { low: number; high: number }; b: { low: number; high: number } };
} | null {
  if (tests.length < 2) return null;
  
  // Only use measured load tests
  const measuredTests = tests.filter(t => t.load.kind === 'measured');
  if (measuredTests.length < 2) return null;
  
  // Check load ratio >= 2x
  const loads = measuredTests.map(t => t.load.kind === 'measured' ? t.load.watts : 0);
  const minLoad = Math.min(...loads);
  const maxLoad = Math.max(...loads);
  if (maxLoad / minLoad < 2) return null;
  
  // Calculate data points
  const C_Wh = project.bank.unit.nominalV * project.bank.unit.ratedAh * 
               project.bank.series * project.bank.parallel;
  
  const dataPoints = measuredTests.map(test => {
    const deltaSoC = test.startSoC - test.endSoC;
    const E_batt = (deltaSoC / 100) * C_Wh;
    const T_h = test.durationMin / 60;
    const P_batt_obs = E_batt / T_h;
    const P_load = test.load.kind === 'measured' ? test.load.watts : 0;
    
    return { x: P_load, y: P_batt_obs };
  });
  
  // Weighted least squares
  const sigmaSoC = getSoCUncertainty(measuredTests[0].socSource);
  
  let sumWx = 0, sumWy = 0, sumWxx = 0, sumWxy = 0, sumW = 0;
  
  for (const test of measuredTests) {
    const deltaSoC = test.startSoC - test.endSoC;
    const T_h = test.durationMin / 60;
    const sigma_y = (sigmaSoC * Math.sqrt(2) / 100) * C_Wh / T_h;
    const w = 1 / (sigma_y * sigma_y);
    
    const P_load = test.load.kind === 'measured' ? test.load.watts : 0;
    const E_batt = (deltaSoC / 100) * C_Wh;
    const P_batt_obs = E_batt / T_h;
    
    sumW += w;
    sumWx += w * P_load;
    sumWy += w * P_batt_obs;
    sumWxx += w * P_load * P_load;
    sumWxy += w * P_load * P_batt_obs;
  }
  
  const det = sumW * sumWxx - sumWx * sumWx;
  if (Math.abs(det) < 1e-10) return null;
  
  let a = (sumW * sumWxy - sumWx * sumWy) / det;
  let b = (sumWxx * sumWy - sumWx * sumWxy) / det;
  
  // Clamp to bounds
  a = Math.max(1.03, Math.min(1.45, a));
  b = Math.max(0, Math.min(80, b));
  
  // Calculate R²
  const yMean = sumWy / sumW;
  let ssTot = 0, ssRes = 0;
  
  for (const test of measuredTests) {
    const deltaSoC = test.startSoC - test.endSoC;
    const T_h = test.durationMin / 60;
    const P_batt_obs = (deltaSoC / 100) * C_Wh / T_h;
    const P_load = test.load.kind === 'measured' ? test.load.watts : 0;
    const P_batt_pred = a * P_load + b;
    
    ssTot += (P_batt_obs - yMean) ** 2;
    ssRes += (P_batt_obs - P_batt_pred) ** 2;
  }
  
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  
  return {
    a: r2(a),
    b: r2(b),
    rSquared: r2(rSquared),
    interval: {
      a: { low: r2(a * 0.95), high: r2(a * 1.05) },
      b: { low: r2(b * 0.9), high: r2(b * 1.1) }
    }
  };
}

// ============================================================
// MODE C: capacity (v2)
// ============================================================

/**
 * Fit capacity scale from run_to_cutoff test
 */
export function fitModeC(test: BackupTest, project: Project): {
  capacityScale: number;
  interval: { low: number; high: number };
} | null {
  if (test.type !== 'run_to_cutoff') return null;
  if (test.load.kind !== 'measured') return null;
  
  const C_Wh = project.bank.unit.nominalV * project.bank.unit.ratedAh * 
               project.bank.series * project.bank.parallel;
  
  const P_load = test.load.watts;
  const T_h = test.durationMin / 60;
  
  // Calculate E_model_cut from uncalibrated simulation
  const testProject: Project = {
    ...project,
    calibration: null,
    grid: {
      ...project.grid,
      outageMinutes: test.durationMin,
      gridMinutes: 0,
      firstOutageStartMinute: 0
    },
    options: {
      ...project.options,
      initialSoC: test.startSoC,
      simulationDays: 1
    },
    loads: [{
      id: 'test-load',
      label: 'Test Load',
      qty: 1,
      watts: P_load,
      powerFactor: 1,
      surgeMultiplier: 1,
      dutyCycle: 1,
      hourly: new Array(24).fill(1),
      onBackupCircuit: true,
      priority: 2,
      usageProfile: 'both'
    }]
  };
  
  const testResult = runSimulation(testProject);
  
  const E_model_cut = testResult.timeSeries.reduce((sum, step) => {
    if (step.battW < 0) {
      return sum + Math.abs(step.battW) * 0.25;
    }
    return sum;
  }, 0);
  
  const cutoffSoC = test.endSoC;
  const deltaSoC = test.startSoC - cutoffSoC;
  
  if (deltaSoC <= 0) return null;
  
  const capacityScale = E_model_cut / (C_Wh * deltaSoC / 100);
  
  // Calculate uncertainty
  const sigmaSoC = getSoCUncertainty(test.socSource);
  const sigmaDelta = sigmaSoC * Math.sqrt(2);
  
  const deltaSoC_low = deltaSoC - sigmaDelta;
  const deltaSoC_high = deltaSoC + sigmaDelta;
  
  const scale_low = E_model_cut / (C_Wh * deltaSoC_high / 100);
  const scale_high = E_model_cut / (C_Wh * deltaSoC_low / 100);
  
  return {
    capacityScale: r2(capacityScale),
    interval: { low: r2(scale_low), high: r2(scale_high) }
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getSoCUncertainty(source: string): number {
  switch (source) {
    case 'bms': return 2;
    case 'inverter_display': return 2;
    case 'other': return 3;
    case 'voltage_estimate': return 4;
    default: return 3;
  }
}

/**
 * Generate a hash of load configuration for staleness detection
 */
export function hashLoads(loads: Project['loads']): string {
  const relevant = loads.map(l => ({
    id: l.id,
    qty: l.qty,
    watts: l.watts,
    hourly: l.hourly,
    usageProfile: l.usageProfile
  }));
  return JSON.stringify(relevant);
}
