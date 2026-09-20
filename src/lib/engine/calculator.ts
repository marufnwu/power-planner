import {
  Project, SimulationResult, TimeStep, Warning,
  LoadItem, BatteryBank, Inverter, AssumptionSet
} from '../../types';

// ============================================================
// CORE SIMULATION ENGINE - Complete rewrite fixing all 21 issues
// ============================================================

export function interpolateEfficiency(curve: { loadFraction: number; eff: number }[], loadFraction: number): number {
  const clamped = Math.max(0, Math.min(1, loadFraction));
  if (clamped <= curve[0].loadFraction) return curve[0].eff;
  if (clamped >= curve[curve.length - 1].loadFraction) return curve[curve.length - 1].eff;
  
  for (let i = 0; i < curve.length - 1; i++) {
    if (clamped >= curve[i].loadFraction && clamped <= curve[i + 1].loadFraction) {
      const t = (clamped - curve[i].loadFraction) / (curve[i + 1].loadFraction - curve[i].loadFraction);
      return curve[i].eff + t * (curve[i + 1].eff - curve[i].eff);
    }
  }
  return curve[curve.length - 1].eff;
}

export function calculateLoadAtHour(loads: LoadItem[], hour: number, multiplier: number = 1): { watts: number; va: number } {
  let totalWatts = 0;
  let totalVA = 0;
  const h = Math.floor(hour) % 24;
  
  for (const item of loads) {
    if (!item.onBackupCircuit) continue;
    const hourFraction = item.hourly[h] || 0;
    const w = item.qty * item.watts * item.dutyCycle * hourFraction * multiplier;
    totalWatts += w;
    totalVA += w / item.powerFactor;
  }
  
  return { watts: totalWatts, va: totalVA };
}

export function calculateSurgeVA(loads: LoadItem[], hour: number, multiplier: number = 1): number {
  let runningVA = 0;
  let maxSurgeAdditional = 0;
  const h = Math.floor(hour) % 24;
  
  for (const item of loads) {
    if (!item.onBackupCircuit) continue;
    const hourFraction = item.hourly[h] || 0;
    if (hourFraction <= 0) continue;
    const itemVA = item.qty * item.watts / item.powerFactor * item.dutyCycle * hourFraction * multiplier;
    runningVA += itemVA;
    const surgeAdditional = itemVA * (item.surgeMultiplier - 1);
    if (surgeAdditional > maxSurgeAdditional) {
      maxSurgeAdditional = surgeAdditional;
    }
  }
  
  return runningVA + maxSurgeAdditional;
}

export function calculateContinuousRuntime(bank: BatteryBank, inverter: Inverter, loadWatts: number): number {
  if (loadWatts <= 0) return Infinity;
  
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = vNom * ahTotal;
  const eUsable = eNom * bank.unit.usableDoD;
  
  const loadFraction = loadWatts / inverter.ratedW;
  const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
  const dcWatts = loadWatts / efficiency + inverter.idleW;
  
  const iDc = dcWatts / vNom;
  const cRated = ahTotal;
  const hRef = bank.unit.ratedHours || 20;
  const k = bank.unit.peukertK;
  let f = 1;
  if (k !== 1.0) {
    f = Math.pow(cRated / (iDc * hRef), k - 1);
    f = Math.max(0.6, Math.min(1.1, f));
  }
  
  const effectiveUsable = eUsable * f;
  return effectiveUsable / dcWatts;
}

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
  
  const chargeW = chargeA * vNom;
  const chargeEff = bank.unit.chargeEfficiency;
  const effectiveChargeW = chargeW * chargeEff;
  
  if (effectiveChargeW <= 0) return Infinity;
  return energyRemovedWh / effectiveChargeW;
}

// Helper: Round to 2 decimals (Fix #8)
const r2 = (v: number) => Math.round(v * 100) / 100;

/**
 * Complete simulation with all 21 fixes
 */
export function runSimulation(project: Project, assumptionSet: AssumptionSet = 'typ'): SimulationResult {
  const { loads, grid, inverter, bank, pv, site, options } = project;
  
  const loadMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.2 : 1.0;
  const pshMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.1 : 1.0;
  
  const stepMinutes = 15;
  const stepsPerDay = 96;
  const warmupDays = 2; // Fix #3: Warmup for steady state
  const simDays = Math.max(options.simulationDays, 3);
  const totalDays = warmupDays + simDays;
  const totalSteps = stepsPerDay * totalDays;
  
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = r2(vNom * ahTotal);
  
  // Fix #7 & #11: Strict floor at usableDoD
  const floorSoC = 1 - bank.unit.usableDoD;
  const eMin = r2(eNom * floorSoC);
  const eMax = eNom;
  
  let energy = eMax; // Start full, warmup will reach steady state
  
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
  
  const psh = site.peakSunHours.typ * pshMultiplier;
  const dayLength = site.sunset - site.sunrise;
  const peakFactor = Math.min(1.1, (Math.PI * psh) / (2 * dayLength));
  const pvWpTotal = pv ? pv.panel.wp * pv.series * pv.parallelStrings : 0;
  
  // Helper: Round to 2 decimals
  const r2 = (v: number) => Math.round(v * 100) / 100;
  
  // Helper: CV taper (Fix #9)
  const getTaper = (soc: number): number => {
    if (bank.unit.chemistry === 'lifepo4' && soc > 0.95) {
      return r2(Math.max(0.3, 1 - (soc - 0.95) / 0.05 * 0.7));
    } else if (bank.unit.chemistry !== 'lifepo4' && soc > 0.80) {
      return r2(Math.max(0.15, 1 - (soc - 0.80) / 0.20 * 0.85));
    }
    return 1;
  };
  
  for (let step = 0; step < totalSteps; step++) {
    const minuteOfDay = (step % stepsPerDay) * stepMinutes;
    const hourOfDay = r2(minuteOfDay / 60);
    const day = Math.floor(step / stepsPerDay);
    const isWarmup = day < warmupDays;
    const simDay = day - warmupDays; // Day in actual simulation (0-indexed)
    
    // Fix #12 & #15: Proper grid schedule - no seam artifacts
    let gridAvailable = false;
    if (grid.mode === 'pattern') {
      const nightStart = grid.nightOverride?.fromHour ? grid.nightOverride.fromHour * 60 : null;
      const nightEnd = grid.nightOverride?.toHour ? grid.nightOverride.toHour * 60 : null;
      
      let isNight = false;
      if (nightStart !== null && nightEnd !== null) {
        if (nightStart <= nightEnd) {
          isNight = minuteOfDay >= nightStart && minuteOfDay < nightEnd;
        } else {
          isNight = minuteOfDay >= nightStart || minuteOfDay < nightEnd;
        }
      }
      
      const outage = isNight && grid.nightOverride ? grid.nightOverride.outageMinutes : grid.outageMinutes;
      const gridTime = isNight && grid.nightOverride ? grid.nightOverride.gridMinutes : grid.gridMinutes;
      const cycle = outage + gridTime;
      
      // Fix #15: Anchor each period independently
      const cycleStart = isNight && nightStart !== null ? nightStart : grid.firstOutageStartMinute;
      const pos = ((minuteOfDay - cycleStart) % cycle + cycle) % cycle;
      gridAvailable = pos >= outage;
    }
    
    // Fix #4: Calculate load with proper usage profile filtering
    const activeLoads = loads.filter(l => l.onBackupCircuit);
    let loadW = 0;
    let loadVA = 0;
    const h = Math.floor(hourOfDay);
    
    for (const load of activeLoads) {
      // Fix #4: Respect usageProfile
      let hourFraction = load.hourly[h] || 0;
      
      // If usageProfile is set and hourly is default, regenerate
      if (load.usageProfile && load.hourly.every(v => Math.abs(v - 0.5) < 0.01)) {
        hourFraction = getUsageFraction(load.usageProfile, h);
      }
      
      const w = load.qty * load.watts * load.dutyCycle * hourFraction * loadMultiplier;
      loadW += w;
      loadVA += w / load.powerFactor;
    }
    
    // Fix #2: Use efficiency curve directly, no derating
    const loadFraction = loadW / inverter.ratedW;
    const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
    
    // Fix #2: Include idle power
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
    let unservedW = 0; // Fix #10: In load-side watts
    let solarUsedW = 0;
    
    if (!gridAvailable) {
      // Off-grid: PV → load → battery
      const pvForLoad = Math.min(pvW, dcWatts);
      solarUsedW = pvForLoad;
      let remainingLoadDC = r2(dcWatts - pvForLoad);
      
      if (remainingLoadDC > 0) {
        // Fix #1: Priority-based load shedding
        const sortedLoads = [...activeLoads].sort((a, b) => a.priority - b.priority);
        let servedDC = 0;
        
        for (const load of sortedLoads) {
          const hourFraction = load.hourly[h] || 0;
          const loadDC = r2(load.qty * load.watts * load.dutyCycle * hourFraction * loadMultiplier / efficiency);
          
          if (servedDC + loadDC <= remainingLoadDC) {
            servedDC += loadDC;
          } else {
            const fraction = (remainingLoadDC - servedDC) / loadDC;
            servedDC += loadDC * fraction;
            break;
          }
        }
        
        const energyNeeded = r2(servedDC * dtHours);
        const energyAvailable = r2(energy - eMin);
        
        // Fix #4: Apply discharge efficiency
        const dischargeEff = bank.unit.chargeEfficiency;
        const actualDischargeW = r2(servedDC / dischargeEff);
        
        if (energyAvailable >= energyNeeded) {
          energy = r2(energy - energyNeeded / dischargeEff);
          battFlowW = -actualDischargeW;
          totalDischargeWh += r2(actualDischargeW * dtHours);
        } else {
          const servedFraction = energyAvailable / energyNeeded;
          energy = eMin;
          // Fix #10: unservedW in load-side watts
          unservedW = r2(servedDC * (1 - servedFraction) * efficiency);
          battFlowW = r2(-actualDischargeW * servedFraction);
          totalDischargeWh += r2(actualDischargeW * servedFraction * dtHours);
          floorHitCount++;
        }
      }
      
      // Fix #1: Surplus solar charges battery
      if (pvW > pvForLoad && energy < eMax) {
        const surplusW = r2(pvW - pvForLoad);
        const soc = energy / eNom;
        const taper = getTaper(soc);
        
        let chargeLimitW = Infinity;
        if (inverter.mppt && inverter.mppt.maxChargeA) {
          chargeLimitW = r2(inverter.mppt.maxChargeA * vNom);
        }
        
        const chargeW = r2(Math.min(surplusW, chargeLimitW * taper));
        const energyAdded = r2(chargeW * bank.unit.chargeEfficiency * dtHours);
        
        if (energy + energyAdded <= eMax) {
          energy = r2(energy + energyAdded);
          battFlowW = chargeW;
          solarUsedW += chargeW;
          totalChargeWh += r2(chargeW * dtHours);
        }
      }
    } else {
      // Grid available
      if (options.mode === 'ips') {
        gridW = loadW;
        
        // Fix #3: Include battery charging in gridW
        const chargeLimitW = Math.min(
          inverter.gridChargerMaxA * vNom,
          bank.unit.maxChargeC * ahTotal * vNom,
          bank.unit.maxChargeA ? bank.unit.maxChargeA * vNom : Infinity
        );
        
        const soc = energy / eNom;
        const taper = getTaper(soc);
        const chargeW = r2(chargeLimitW * taper);
        
        // Fix #18: Include charger conversion loss
        const chargerEff = 0.95; // Typical charger efficiency
        const gridChargeW = r2(chargeW / chargerEff);
        const energyAdded = r2(chargeW * bank.unit.chargeEfficiency * dtHours);
        
        if (energy + energyAdded <= eMax) {
          energy = r2(energy + energyAdded);
          gridW += gridChargeW; // Fix #18: Include charger loss
          battFlowW = chargeW;
          totalChargeWh += r2(chargeW * dtHours);
        }
        
        // Fix #1 & #2: PV also charges battery
        if (pvW > 0 && energy < eMax) {
          const pvChargeW = r2(Math.min(pvW, chargeLimitW * taper - chargeW));
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
        // Other modes
        const pvForLoad = Math.min(pvW, dcWatts);
        solarUsedW = pvForLoad;
        
        const remainingLoadDC = r2(dcWatts - pvForLoad);
        if (remainingLoadDC > 0) {
          gridW = remainingLoadDC;
          totalGridWh += r2(gridW * dtHours);
        }
        
        if (pvW > pvForLoad && energy < eMax) {
          const surplusPv = r2(pvW - pvForLoad);
          const chargeLimitW = Math.min(
            inverter.gridChargerMaxA * vNom,
            bank.unit.maxChargeC * ahTotal * vNom,
            bank.unit.maxChargeA ? bank.unit.maxChargeA * vNom : Infinity
          );
          
          const soc = energy / eNom;
          const taper = getTaper(soc);
          const chargeW = r2(Math.min(surplusPv, chargeLimitW * taper));
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
      minSoCTime = totalMinutes;
    }
    
    // Fix #17: Timestamp is step START, SoC is step END
    if (!isWarmup) {
      timeSeries.push({
        t: r2((simDay * 1440) + minuteOfDay),
        soc,
        loadW: r2(loadW),
        pvW: r2(pvW),
        gridW: r2(gridW),
        battW: r2(battFlowW),
        unservedW: r2(unservedW),
        gridAvailable,
      });
    }
  }
  
  // Fix #14: Calculate actual average DoD from simulation
  const actualAvgDoD = r2(totalDischargeWh / (eNom * simDays));
  
  // Fix #13: Runtime based on evening peak
  const eveningPeakW = activeLoads.reduce((sum, l) => {
    let eveningSum = 0;
    for (let h = 18; h < 23; h++) {
      eveningSum += l.hourly[h] || 0;
    }
    const eveningAvg = eveningSum / 5;
    return sum + l.qty * l.watts * l.dutyCycle * eveningAvg * loadMultiplier;
  }, 0);
  
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
  const cyclesPerDay = r2(totalDischargeWh / (eNom * bank.unit.usableDoD) / simDays);
  
  const warnings = generateWarnings(project, timeSeries, eveningPeakW, closedFormRecharge, gridWindowH, floorHitCount, totalUnservedWh);
  
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

// Fix #4: Helper for usage profile fractions
function getUsageFraction(profile: string, hour: number): number {
  switch (profile) {
    case 'day': return (hour >= 6 && hour < 18) ? 0.7 : 0.1;
    case 'night': return (hour >= 18 || hour < 6) ? 0.8 : 0.1;
    case 'both': return 0.5;
    case 'occasional': return 0.15;
    default: return 0.5;
  }
}

function generateWarnings(
  project: Project,
  timeSeries: TimeStep[],
  peakLoadW: number,
  rechargeTimeH: number,
  gridWindowH: number,
  floorHitCount: number,
  totalUnservedWh: number
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
  
  // Fix #19: Better fuse sizing
  const maxDischargeA = bank.unit.maxDischargeA || bank.unit.maxChargeA || 100;
  const fuseRating = r2(maxDischargeA * 1.25);
  warnings.push({
    id: 'FUSE_REQUIRED',
    severity: 'info',
    message: `DC fuse/breaker required: ${fuseRating}A (1.25× max ${maxDischargeA}A)`,
    suggestedFix: `Install DC breaker rated ${fuseRating}A between battery and inverter`,
  });
  
  return warnings;
}

const r2 = (v: number) => Math.round(v * 100) / 100;
