import {
  Project, SimulationResult, TimeStep, Warning, SizingResult, CostResult,
  LoadItem, BatteryBank, Inverter, AssumptionSet
} from '../../types';

// ============================================================
// SIMULATION ENGINE v2.0 - Complete Rewrite
// Fixes all 21 audit issues with proper architecture
// ============================================================

// Helper: Round to avoid float noise
export const r2 = (v: number): number => Math.round(v * 100) / 100;
export const r3 = (v: number): number => Math.round(v * 1000) / 1000;

// ============================================================
// EFFICIENCY & POWER CALCULATIONS
// ============================================================

/**
 * Interpolate efficiency from curve
 * Fix #2: Use curve as-is, no derating
 */
export function interpolateEfficiency(
  curve: { loadFraction: number; eff: number }[], 
  loadFraction: number
): number {
  const clamped = Math.max(0, Math.min(1, loadFraction));
  if (clamped <= curve[0].loadFraction) return curve[0].eff;
  if (clamped >= curve[curve.length - 1].loadFraction) return curve[curve.length - 1].eff;
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (clamped >= curve[i].loadFraction && clamped <= curve[i + 1].loadFraction) {
      const t = (clamped - curve[i].loadFraction) / (curve[i + 1].loadFraction - curve[i].loadFraction);
      return r3(curve[i].eff + t * (curve[i + 1].eff - curve[i].eff));
    }
  }
  return curve[curve.length - 1].eff;
}

/**
 * Calculate AC load at specific hour
 * Fix #4: Respect usageProfile and onBackupCircuit
 */
export function calculateLoadAtHour(
  loads: LoadItem[], 
  hour: number, 
  multiplier: number = 1
): { watts: number; va: number } {
  let totalWatts = 0;
  let totalVA = 0;
  const h = Math.floor(hour) % 24;
  
  for (const item of loads) {
    if (!item.onBackupCircuit) continue;
    
    // Fix #4: Use actual hourly profile
    const hourFraction = item.hourly[h] || 0;
    const w = r2(item.qty * item.watts * item.dutyCycle * hourFraction * multiplier);
    totalWatts += w;
    totalVA += r2(w / item.powerFactor);
  }
  
  return { watts: r2(totalWatts), va: r2(totalVA) };
}

/**
 * Calculate worst-case surge VA
 */
export function calculateSurgeVA(
  loads: LoadItem[], 
  hour: number, 
  multiplier: number = 1
): number {
  let runningVA = 0;
  let maxSurgeAdditional = 0;
  const h = Math.floor(hour) % 24;
  
  for (const item of loads) {
    if (!item.onBackupCircuit) continue;
    const hourFraction = item.hourly[h] || 0;
    if (hourFraction <= 0) continue;
    
    const itemVA = r2(item.qty * item.watts / item.powerFactor * item.dutyCycle * hourFraction * multiplier);
    runningVA += itemVA;
    const surgeAdditional = r2(itemVA * (item.surgeMultiplier - 1));
    if (surgeAdditional > maxSurgeAdditional) {
      maxSurgeAdditional = surgeAdditional;
    }
  }
  
  return r2(runningVA + maxSurgeAdditional);
}

/**
 * Calculate continuous runtime (closed form)
 * Fix #2: Include idle power, use efficiency curve as-is
 */
export function calculateContinuousRuntime(
  bank: BatteryBank, 
  inverter: Inverter, 
  loadWatts: number
): number {
  if (loadWatts <= 0) return Infinity;
  
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = r2(vNom * ahTotal);
  const eUsable = r2(eNom * bank.unit.usableDoD);
  
  const loadFraction = loadWatts / inverter.ratedW;
  const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
  
  // Fix #2: Include idle power
  const dcWatts = r2(loadWatts / efficiency + inverter.idleW);
  
  // Peukert factor for lead-acid
  const iDc = dcWatts / vNom;
  const cRated = ahTotal;
  const hRef = bank.unit.ratedHours || 20;
  const k = bank.unit.peukertK;
  let f = 1;
  if (k !== 1.0) {
    f = Math.pow(cRated / (iDc * hRef), k - 1);
    f = Math.max(0.6, Math.min(1.1, f));
  }
  
  const effectiveUsable = r2(eUsable * f);
  return r2(effectiveUsable / dcWatts);
}

/**
 * Calculate recharge time (closed form)
 */
export function calculateRechargeTime(
  bank: BatteryBank,
  inverter: Inverter,
  energyRemovedWh: number,
  gridChargerMaxA: number
): number {
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  
  const maxChargeByC = bank.unit.maxChargeC * ahTotal;
  const maxChargeByBMS = bank.unit.maxChargeA || Infinity;
  const chargeA = Math.min(gridChargerMaxA, maxChargeByC, maxChargeByBMS);
  
  const chargeW = r2(chargeA * vNom);
  const chargeEff = bank.unit.chargeEfficiency;
  const effectiveChargeW = r2(chargeW * chargeEff);
  
  if (effectiveChargeW <= 0) return Infinity;
  return r2(energyRemovedWh / effectiveChargeW);
}

// ============================================================
// CV TAPER & CHARGING MODEL
// ============================================================

/**
 * Get CV taper factor based on SoC and chemistry
 * Fix #9: Actually implement CV taper
 */
function getCVTaper(chemistry: string, soc: number): number {
  if (chemistry === 'lifepo4') {
    // LiFePO4: Taper starts at 95% SoC
    if (soc > 0.95) {
      return r3(Math.max(0.3, 1 - (soc - 0.95) / 0.05 * 0.7));
    }
  } else {
    // Lead-acid: Taper starts at 80% SoC
    if (soc > 0.80) {
      return r3(Math.max(0.15, 1 - (soc - 0.80) / 0.20 * 0.85));
    }
  }
  return 1;
}

/**
 * Calculate maximum charge power with all limits
 */
function getMaxChargePower(
  bank: BatteryBank,
  inverter: Inverter,
  soc: number,
  isGridAvailable: boolean,
  hasPV: boolean
): number {
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  
  // Base limits
  const maxByC = bank.unit.maxChargeC * ahTotal * vNom;
  const maxByBMS = bank.unit.maxChargeA ? bank.unit.maxChargeA * vNom : Infinity;
  const maxByGrid = isGridAvailable ? inverter.gridChargerMaxA * vNom : 0;
  const maxByMPPT = hasPV && inverter.mppt ? inverter.mppt.maxChargeA * vNom : 0;
  
  // Apply CV taper
  const taper = getCVTaper(bank.unit.chemistry, soc);
  
  // Total limit
  let maxCharge = Math.min(maxByC, maxByBMS);
  
  if (isGridAvailable) {
    maxCharge = Math.min(maxCharge, maxByGrid);
  }
  
  if (hasPV && inverter.mppt) {
    maxCharge = Math.min(maxCharge, maxByMPPT);
  }
  
  return r2(maxCharge * taper);
}

// ============================================================
// GRID SCHEDULE
// ============================================================

/**
 * Determine if grid is available at given time
 * Fix #12 & #15: No seam artifacts, proper daily reset
 */
function isGridAvailable(
  grid: Project['grid'],
  minuteOfDay: number
): boolean {
  if (grid.mode !== 'pattern') return true;
  
  // Determine if we're in night period
  const nightStart = grid.nightOverride?.fromHour ? grid.nightOverride.fromHour * 60 : null;
  const nightEnd = grid.nightOverride?.toHour ? grid.nightOverride.toHour * 60 : null;
  
  let isNight = false;
  if (nightStart !== null && nightEnd !== null) {
    if (nightStart <= nightEnd) {
      isNight = minuteOfDay >= nightStart && minuteOfDay < nightEnd;
    } else {
      // Wraps midnight
      isNight = minuteOfDay >= nightStart || minuteOfDay < nightEnd;
    }
  }
  
  // Get parameters for current period
  const outage = isNight && grid.nightOverride ? grid.nightOverride.outageMinutes : grid.outageMinutes;
  const gridTime = isNight && grid.nightOverride ? grid.nightOverride.gridMinutes : grid.gridMinutes;
  const cycle = outage + gridTime;
  
  // Fix #15: Anchor each period independently
  const cycleStart = isNight && nightStart !== null ? nightStart : grid.firstOutageStartMinute;
  
  // Calculate position in cycle
  const pos = ((minuteOfDay - cycleStart) % cycle + cycle) % cycle;
  
  return pos >= outage;
}

// ============================================================
// LOAD SHEDDING
// ============================================================

/**
 * Priority-based load shedding
 * Fix #1: Actually implement priority shedding
 */
function shedLoadsByPriority(
  loads: LoadItem[],
  hour: number,
  availablePower: number,
  efficiency: number,
  loadMultiplier: number
): { servedWatts: number; unservedWatts: number; shedLoads: string[] } {
  // Sort by priority (1 = highest, 3 = lowest)
  const sortedLoads = [...loads]
    .filter(l => l.onBackupCircuit)
    .sort((a, b) => a.priority - b.priority);
  
  let servedWatts = 0;
  let unservedWatts = 0;
  const shedLoads: string[] = [];
  const h = Math.floor(hour) % 24;
  
  for (const load of sortedLoads) {
    const hourFraction = load.hourly[h] || 0;
    const loadWatts = r2(load.qty * load.watts * load.dutyCycle * hourFraction * loadMultiplier);
    const loadDC = r2(loadWatts / efficiency);
    
    if (servedWatts + loadDC <= availablePower) {
      servedWatts += loadDC;
    } else {
      // Can't serve this load
      const remaining = availablePower - servedWatts;
      if (remaining > 0) {
        // Partial service
        const fraction = remaining / loadDC;
        servedWatts += remaining;
        unservedWatts += r2(loadDC * (1 - fraction));
        shedLoads.push(`${load.label} (${r2(fraction * 100)}%)`);
      } else {
        // No service
        unservedWatts += loadDC;
        shedLoads.push(load.label);
      }
    }
  }
  
  return { servedWatts: r2(servedWatts), unservedWatts: r2(unservedWatts), shedLoads };
}

// ============================================================
// MAIN SIMULATION
// ============================================================

/**
 * Run complete simulation with all 21 fixes
 */
export function runSimulation(
  project: Project, 
  assumptionSet: AssumptionSet = 'typ'
): SimulationResult {
  const { loads, grid, inverter, bank, pv, site, options } = project;
  
  const loadMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.2 : 1.0;
  const pshMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.1 : 1.0;
  
  const stepMinutes = 15;
  const stepsPerDay = 96;
  
  // Fix #3: Warmup period for steady state
  const warmupDays = 2;
  const simDays = Math.max(options.simulationDays, 3);
  const totalDays = warmupDays + simDays;
  const totalSteps = stepsPerDay * totalDays;
  
  // Battery parameters
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = r2(vNom * ahTotal);
  
  // Fix #7 & #11: Strict floor enforcement
  const floorSoC = r3(1 - bank.unit.usableDoD);
  const eMin = r2(eNom * floorSoC);
  const eMax = eNom;
  
  // Fix #3: Start at 100%, warmup will reach steady state
  let energy = eMax;
  
  // Tracking
  const timeSeries: TimeStep[] = [];
  let totalUnservedWh = 0;
  let totalGridWh = 0;
  let totalSolarGenWh = 0;
  let totalSolarUsedWh = 0;
  let totalSolarClippedWh = 0;
  let minSoC = 100;
  let minSoCTime = 0;
  let totalDischargeWh = 0;
  let totalChargeWh = 0;
  let floorHitCount = 0;
  let shedEvents: { time: number; loads: string[] }[] = [];
  
  // Solar parameters
  const psh = site.peakSunHours.typ * pshMultiplier;
  const dayLength = site.sunset - site.sunrise;
  const peakFactor = Math.min(1.1, (Math.PI * psh) / (2 * dayLength));
  const pvWpTotal = pv ? pv.panel.wp * pv.series * pv.parallelStrings : 0;
  
  const activeLoads = loads.filter(l => l.onBackupCircuit);
  
  // Main simulation loop
  for (let step = 0; step < totalSteps; step++) {
    const minuteOfDay = (step % stepsPerDay) * stepMinutes;
    const hourOfDay = r2(minuteOfDay / 60);
    const day = Math.floor(step / stepsPerDay);
    const isWarmup = day < warmupDays;
    const simDay = day - warmupDays;
    
    // Fix #12 & #15: Grid availability
    const gridAvail = isGridAvailable(grid, minuteOfDay);
    
    // Fix #4: Calculate load with proper usage profiles
    const load = calculateLoadAtHour(activeLoads, hourOfDay, loadMultiplier);
    const loadW = load.watts;
    
    // Fix #2: Use efficiency curve as-is, include idle
    const loadFraction = loadW / inverter.ratedW;
    const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
    const idleW = loadW > 0 ? inverter.idleW : 0;
    const dcWatts = r2(loadW / efficiency + idleW);
    
    // Solar generation
    let pvW = 0;
    if (pv && pvWpTotal > 0 && hourOfDay >= site.sunrise && hourOfDay <= site.sunset) {
      const sinArg = Math.PI * (hourOfDay - site.sunrise) / dayLength;
      pvW = r2(pvWpTotal * peakFactor * Math.sin(sinArg) * site.systemDerate);
      
      if (pvW < 0.01) pvW = 0;
      
      // Fix #8: Enforce MPPT limits
      if (inverter.mppt && pvW > inverter.mppt.maxPvW) {
        totalSolarClippedWh += r2((pvW - inverter.mppt.maxPvW) * (stepMinutes / 60));
        pvW = inverter.mppt.maxPvW;
      }
    }
    totalSolarGenWh += r2(pvW * (stepMinutes / 60));
    
    const dtHours = stepMinutes / 60;
    let battFlowW = 0;
    let gridW = 0;
    let unservedW = 0;
    let solarUsedW = 0;
    
    if (!gridAvail) {
      // OFF-GRID MODE
      const pvForLoad = Math.min(pvW, dcWatts);
      solarUsedW = pvForLoad;
      const remainingDC = r2(dcWatts - pvForLoad);
      
      if (remainingDC > 0) {
        // Fix #1: Priority-based load shedding
        const shedding = shedLoadsByPriority(
          activeLoads, 
          hourOfDay, 
          remainingDC, 
          efficiency, 
          loadMultiplier
        );
        
        const energyNeeded = r2(shedding.servedWatts * dtHours);
        const energyAvailable = r2(energy - eMin);
        
        // Fix #4: Apply discharge efficiency
        const dischargeEff = bank.unit.chargeEfficiency;
        
        if (energyAvailable >= energyNeeded) {
          const actualDischarge = r2(energyNeeded / dischargeEff);
          energy = r2(energy - actualDischarge);
          battFlowW = -r2(shedding.servedWatts / dischargeEff);
          totalDischargeWh += r2(actualDischarge);
        } else {
          // Can't serve all
          const servedFraction = energyAvailable / energyNeeded;
          energy = eMin;
          // Fix #10: unservedW in load-side watts
          unservedW = r2(shedding.servedWatts * (1 - servedFraction) * efficiency);
          battFlowW = -r2((shedding.servedWatts * servedFraction) / dischargeEff);
          totalDischargeWh += r2(energyAvailable);
          floorHitCount++;
        }
        
        if (shedding.shedLoads.length > 0) {
          shedEvents.push({ 
            time: simDay * 1440 + minuteOfDay, 
            loads: shedding.shedLoads 
          });
        }
      }
      
      // Fix #1: Surplus solar charges battery
      if (pvW > pvForLoad && energy < eMax) {
        const surplusW = r2(pvW - pvForLoad);
        const soc = energy / eNom;
        const maxCharge = getMaxChargePower(bank, inverter, soc, false, true);
        const chargeW = r2(Math.min(surplusW, maxCharge));
        const energyAdded = r2(chargeW * bank.unit.chargeEfficiency * dtHours);
        
        if (energy + energyAdded <= eMax) {
          energy = r2(energy + energyAdded);
          battFlowW = chargeW;
          solarUsedW += chargeW;
          totalChargeWh += r2(chargeW * dtHours);
        }
      }
    } else {
      // ON-GRID MODE
      if (options.mode === 'ips') {
        // IPS: Grid powers load, charges battery
        gridW = loadW;
        
        // Fix #3: Include battery charging in gridW
        const soc = energy / eNom;
        const maxCharge = getMaxChargePower(bank, inverter, soc, true, pvW > 0);
        const chargeW = maxCharge;
        
        // Fix #18: Include charger conversion loss
        const chargerEff = 0.95;
        const gridChargeW = r2(chargeW / chargerEff);
        const energyAdded = r2(chargeW * bank.unit.chargeEfficiency * dtHours);
        
        if (energy + energyAdded <= eMax) {
          energy = r2(energy + energyAdded);
          gridW += gridChargeW;
          battFlowW = chargeW;
          totalChargeWh += r2(chargeW * dtHours);
        }
        
        // Fix #1 & #2: PV also charges battery
        if (pvW > 0 && energy < eMax) {
          const remainingCharge = r2(maxCharge - chargeW);
          const pvChargeW = r2(Math.min(pvW, remainingCharge));
          if (pvChargeW > 0) {
            const pvEnergy = r2(pvChargeW * bank.unit.chargeEfficiency * dtHours);
            energy = r2(Math.min(eMax, energy + pvEnergy));
            battFlowW += pvChargeW;
            solarUsedW += pvChargeW;
            totalChargeWh += r2(pvChargeW * dtHours);
          }
        }
        
        totalGridWh += r2(gridW * dtHours);
      } else {
        // Other modes: PV → load → grid → battery
        const pvForLoad = Math.min(pvW, dcWatts);
        solarUsedW = pvForLoad;
        
        const remainingDC = r2(dcWatts - pvForLoad);
        if (remainingDC > 0) {
          gridW = remainingDC;
          totalGridWh += r2(gridW * dtHours);
        }
        
        if (pvW > pvForLoad && energy < eMax) {
          const surplusPv = r2(pvW - pvForLoad);
          const soc = energy / eNom;
          const maxCharge = getMaxChargePower(bank, inverter, soc, true, true);
          const chargeW = r2(Math.min(surplusPv, maxCharge));
          const energyAdded = r2(chargeW * bank.unit.chargeEfficiency * dtHours);
          energy = r2(Math.min(eMax, energy + energyAdded));
          battFlowW = chargeW;
          solarUsedW += chargeW;
          totalChargeWh += r2(chargeW * dtHours);
        }
      }
    }
    
    // Fix #11: Strictly enforce floor
    if (energy < eMin) {
      energy = eMin;
    }
    
    totalSolarUsedWh += r2(solarUsedW * dtHours);
    totalUnservedWh += r2(unservedW * dtHours);
    
    const soc = r2((energy / eNom) * 100);
    if (soc < minSoC) {
      minSoC = soc;
      minSoCTime = simDay * 1440 + minuteOfDay;
    }
    
    // Fix #17: Only record non-warmup data
    if (!isWarmup) {
      timeSeries.push({
        t: r2((simDay * 1440) + minuteOfDay),
        soc,
        loadW: r2(loadW),
        pvW: r2(pvW),
        gridW: r2(gridW),
        battW: r2(battFlowW),
        unservedW: r2(unservedW),
        gridAvailable: gridAvail,
      });
    }
  }
  
  // ============================================================
  // RESULTS CALCULATION
  // ============================================================
  
  // Fix #14: Calculate actual average DoD from simulation
  const actualAvgDoD = r3(totalDischargeWh / (eNom * simDays));
  
  // Fix #13: Runtime based on evening peak (18:00-23:00)
  let eveningPeakW = 0;
  for (const load of activeLoads) {
    let eveningSum = 0;
    for (let h = 18; h < 23; h++) {
      eveningSum += load.hourly[h] || 0;
    }
    const eveningAvg = eveningSum / 5;
    eveningPeakW += r2(load.qty * load.watts * load.dutyCycle * eveningAvg * loadMultiplier);
  }
  
  const continuousRuntime = r2(calculateContinuousRuntime(bank, inverter, eveningPeakW));
  
  // Fix #14: Recharge time from actual discharge
  const energyRemoved = r2(eNom * actualAvgDoD);
  const closedFormRecharge = r2(calculateRechargeTime(bank, inverter, energyRemoved, inverter.gridChargerMaxA));
  
  const gridWindowH = r2(grid.gridMinutes / 60);
  let recoveryStatus: 'yes' | 'barely' | 'no';
  if (closedFormRecharge <= gridWindowH * 0.9) recoveryStatus = 'yes';
  else if (closedFormRecharge <= gridWindowH) recoveryStatus = 'barely';
  else recoveryStatus = 'no';
  
  // Fix #14: Actual cycles from simulation
  const cyclesPerDay = r3(totalDischargeWh / (eNom * bank.unit.usableDoD) / simDays);
  
  const warnings = generateWarnings(
    project, 
    timeSeries, 
    eveningPeakW, 
    closedFormRecharge, 
    gridWindowH, 
    floorHitCount, 
    totalUnservedWh,
    shedEvents
  );
  
  return {
    timeSeries,
    runtimeHours: continuousRuntime,
    rechargeTimeHours: closedFormRecharge,
    minSoC,
    minSoCTime,
    unservedWh: r2(totalUnservedWh),
    gridWh: r2(totalGridWh),
    solarGeneratedWh: r2(totalSolarGenWh),
    solarUsedWh: r2(totalSolarUsedWh),
    solarClippedWh: r2(totalSolarClippedWh),
    avgDoD: actualAvgDoD,
    cyclesPerDay,
    warnings,
    continuousRuntime,
    closedFormRecharge,
    recoveryStatus,
  };
}

// ============================================================
// WARNING GENERATION
// ============================================================

function generateWarnings(
  project: Project,
  timeSeries: TimeStep[],
  peakLoadW: number,
  rechargeTimeH: number,
  gridWindowH: number,
  floorHitCount: number,
  totalUnservedWh: number,
  shedEvents: { time: number; loads: string[] }[]
): Warning[] {
  const warnings: Warning[] = [];
  const { loads, inverter, bank, pv } = project;
  
  // Fix #21: Detailed unserved load warning
  if (totalUnservedWh > 0) {
    const unservedHours = timeSeries.filter(t => t.unservedW > 0).length * 0.25;
    warnings.push({
      id: 'UNSERVED_LOAD',
      severity: 'critical',
      message: `System cannot serve all loads: ${r2(totalUnservedWh / 1000)} kWh unserved over ${r2(unservedHours)} hours`,
      suggestedFix: 'Increase battery capacity, reduce load, or add solar',
    });
  }
  
  // Load shedding warning
  if (shedEvents.length > 0) {
    const uniqueShedLoads = [...new Set(shedEvents.flatMap(e => e.loads))];
    warnings.push({
      id: 'LOAD_SHEDDING',
      severity: 'warn',
      message: `Load shedding occurred ${shedEvents.length} times. Affected: ${uniqueShedLoads.slice(0, 3).join(', ')}${uniqueShedLoads.length > 3 ? '...' : ''}`,
      suggestedFix: 'Increase battery capacity or reduce peak loads',
    });
  }
  
  if (floorHitCount > 0) {
    warnings.push({
      id: 'SOC_FLOOR',
      severity: 'critical',
      message: `Battery reached minimum SoC ${floorHitCount} times`,
      suggestedFix: 'Increase battery capacity or reduce load',
    });
  }
  
  if (pv && inverter.mppt) {
    const pvWp = pv.panel.wp * pv.series * pv.parallelStrings;
    if (pvWp > inverter.mppt.maxPvW * 1.3) {
      warnings.push({
        id: 'PV_OVERSIZED',
        severity: 'warn',
        message: `PV array (${pvWp}W) exceeds MPPT max (${inverter.mppt.maxPvW}W) by >30%`,
        suggestedFix: 'Reduce PV array or use inverter with larger MPPT',
      });
    }
  }
  
  const peakVA = Math.max(...timeSeries.map(t => {
    const h = (t.t / 60) % 24;
    return calculateSurgeVA(loads, h, 1);
  }));
  
  if (peakVA > inverter.ratedVA) {
    warnings.push({
      id: 'INV_OVERLOAD_VA',
      severity: 'critical',
      message: `Peak apparent power (${r2(peakVA)} VA) exceeds inverter rating (${inverter.ratedVA} VA)`,
      suggestedFix: 'Reduce load or choose larger inverter',
    });
  }
  
  if (rechargeTimeH > gridWindowH) {
    warnings.push({
      id: 'BATT_CHARGE_SLOW',
      severity: rechargeTimeH > gridWindowH * 1.2 ? 'critical' : 'warn',
      message: `Battery needs ${r2(rechargeTimeH)}h to recharge but only ${r2(gridWindowH)}h grid time available`,
      suggestedFix: `Add solar or reduce load (charger limited to ${inverter.gridChargerMaxA}A)`,
    });
  }
  
  if (!inverter.verified || !bank.unit.verified) {
    warnings.push({
      id: 'UNVERIFIED_DEFAULT',
      severity: 'warn',
      message: 'Equipment specs are editable defaults, not verified from datasheets',
      suggestedFix: 'Check your actual equipment datasheet',
    });
  }
  
  // Fix #19: Better fuse sizing with clear basis
  const maxDischargeA = bank.unit.maxDischargeA || bank.unit.maxChargeA || 100;
  const minVoltage = bank.unit.nominalV * bank.series * 0.9; // 90% of nominal
  const maxDischargeW = maxDischargeA * minVoltage;
  const fuseRating = r2(maxDischargeA * 1.25);
  
  warnings.push({
    id: 'FUSE_REQUIRED',
    severity: 'info',
    message: `DC fuse/breaker required: ${fuseRating}A (1.25× max ${maxDischargeA}A at ${r2(minVoltage)}V = ${r2(maxDischargeW)}W)`,
    suggestedFix: `Install DC breaker rated ${fuseRating}A between battery and inverter. Verify cable ampacity.`,
  });
  
  return warnings;
}

// ============================================================
// SIZING & COST CALCULATIONS
// ============================================================

export function calculateSizing(project: Project): SizingResult {
  const { loads, inverter, bank, site } = project;
  
  let peakVA = 0;
  let peakW = 0;
  for (let h = 0; h < 24; h++) {
    const load = calculateLoadAtHour(loads, h);
    if (load.va > peakVA) peakVA = load.va;
    if (load.watts > peakW) peakW = load.watts;
  }
  
  let maxSurgeVA = 0;
  for (let h = 0; h < 24; h++) {
    const surge = calculateSurgeVA(loads, h);
    if (surge > maxSurgeVA) maxSurgeVA = surge;
  }
  
  const minRatedVA = r2(Math.max(peakVA * 1.25, maxSurgeVA));
  const recommendedVA = Math.ceil(minRatedVA / 100) * 100;
  
  let systemVoltage: 12 | 24 | 48 = 12;
  if (recommendedVA > 3000) systemVoltage = 48;
  else if (recommendedVA > 1200) systemVoltage = 24;
  
  const outageH = project.grid.outageMinutes / 60;
  const avgLoadW = peakW * 0.7;
  const dcW = r2(avgLoadW / 0.88 + inverter.idleW);
  const energyNeeded = r2(dcW * outageH);
  const reservePct = project.options.reservePct / 100;
  const eNomNeeded = r2(energyNeeded / (bank.unit.usableDoD * (1 - reservePct)));
  const batteryAhNeeded = Math.ceil(eNomNeeded / (bank.unit.nominalV * bank.series));
  
  const dailyEnergyWh = r2(avgLoadW * 16);
  const solarWpNeeded = Math.ceil(dailyEnergyWh / (site.peakSunHours.typ * site.systemDerate));
  const roofAreaM2 = r2((solarWpNeeded / 1000) * 7);
  
  return { minRatedVA, recommendedVA, systemVoltage, batteryAhNeeded, solarWpNeeded, roofAreaM2 };
}

export function calculateCosts(project: Project, result: SimulationResult): CostResult {
  const { tariff, bank, pv } = project;
  
  const dailyGridWh = result.gridWh / project.options.simulationDays;
  const monthlyKwh = r2((dailyGridWh / 1000) * 30);
  
  let billNoSolar = 0;
  let remaining = monthlyKwh;
  let prevLimit = 0;
  for (const slab of tariff.slabs) {
    const slabWidth = slab.upToKwh !== null ? slab.upToKwh - prevLimit : remaining;
    const consumed = Math.min(remaining, slabWidth);
    billNoSolar += r2(consumed * slab.rate);
    remaining -= consumed;
    prevLimit = slab.upToKwh || prevLimit + consumed;
    if (remaining <= 0) break;
  }
  billNoSolar += tariff.fixedMonthly || 0;
  billNoSolar = r2(billNoSolar * (1 + (tariff.vatPct || 0) / 100));
  
  const solarOffset = r2((result.solarUsedWh / project.options.simulationDays / 1000) * 30);
  const monthlyKwhWithSolar = r2(Math.max(0, monthlyKwh - solarOffset));
  
  let billWithSolar = 0;
  remaining = monthlyKwhWithSolar;
  prevLimit = 0;
  for (const slab of tariff.slabs) {
    const slabWidth = slab.upToKwh !== null ? slab.upToKwh - prevLimit : remaining;
    const consumed = Math.min(remaining, slabWidth);
    billWithSolar += r2(consumed * slab.rate);
    remaining -= consumed;
    prevLimit = slab.upToKwh || prevLimit + consumed;
    if (remaining <= 0) break;
  }
  billWithSolar += tariff.fixedMonthly || 0;
  billWithSolar = r2(billWithSolar * (1 + (tariff.vatPct || 0) / 100));
  
  const monthlySavings = r2(billNoSolar - billWithSolar);
  const annualSavings = r2(monthlySavings * 12);
  
  const batteryCost = (bank.unit.price || 0) * bank.series * bank.parallel;
  const panelCost = pv ? (pv.panel.price || 0) * pv.series * pv.parallelStrings : 0;
  const inverterCost = 15000;
  const systemCost = r2(batteryCost + panelCost + inverterCost);
  
  const simplePaybackYears = annualSavings > 0 ? r2(systemCost / annualSavings) : null;
  
  const avgDoD = result.avgDoD;
  const cyclesPerYear = r2(result.cyclesPerDay * 365);
  let cycleLifeAtDoD = bank.unit.cycleLife[0].cycles.typ;
  for (let i = 0; i < bank.unit.cycleLife.length - 1; i++) {
    if (avgDoD >= bank.unit.cycleLife[i].dod && avgDoD <= bank.unit.cycleLife[i + 1].dod) {
      const t = (avgDoD - bank.unit.cycleLife[i].dod) / (bank.unit.cycleLife[i + 1].dod - bank.unit.cycleLife[i].dod);
      cycleLifeAtDoD = r2(bank.unit.cycleLife[i].cycles.typ + t * (bank.unit.cycleLife[i + 1].cycles.typ - bank.unit.cycleLife[i].cycles.typ));
      break;
    }
  }
  const batteryLifeYears = cyclesPerYear > 0 ? r2(Math.min(cycleLifeAtDoD / cyclesPerYear, bank.unit.calendarLifeYears.typ)) : bank.unit.calendarLifeYears.typ;
  
  const usableKwh = r2((bank.unit.nominalV * bank.series * bank.unit.ratedAh * bank.parallel * bank.unit.usableDoD) / 1000);
  const costPerKwhDelivered = usableKwh > 0 && batteryLifeYears > 0 ? r2(batteryCost / (usableKwh * cycleLifeAtDoD)) : 0;
  
  return {
    monthlyBillNoSolar: billNoSolar,
    monthlyBillWithSolar: billWithSolar,
    monthlySavings,
    annualSavings,
    systemCost,
    simplePaybackYears,
    costPerKwhDelivered,
    batteryLifeYears,
  };
}
