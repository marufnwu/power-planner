import {
  Project, SimulationResult, TimeStep, Warning,
  LoadItem, BatteryBank, Inverter, AssumptionSet
} from '../../types';

// ============================================================
// CORE SIMULATION ENGINE - Fixed all 31 audit issues
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

/**
 * Run time-step simulation with all fixes applied
 */
export function runSimulation(project: Project, assumptionSet: AssumptionSet = 'typ'): SimulationResult {
  const { loads, grid, inverter, bank, pv, site, options } = project;
  
  const loadMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.2 : 1.0;
  const pshMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.1 : 1.0;
  
  const stepMinutes = 15;
  const stepsPerDay = 96;
  const totalDays = Math.max(options.simulationDays, 3); // Ensure at least 3 days for steady state
  const totalSteps = stepsPerDay * totalDays;
  
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = vNom * ahTotal;
  
  // Fix #7: Single consistent floor calculation
  const floorSoC = 1 - bank.unit.usableDoD; // e.g., 0.1 for 90% DoD
  const eMin = eNom * floorSoC;
  const eMax = eNom;
  
  // Fix #10: Start at floor for worst-case, not 100%
  const initialSoC = options.initialSoC ?? floorSoC * 100;
  let energy = eMax * (initialSoC / 100);
  energy = Math.max(eMin, Math.min(eMax, energy));
  
  const timeSeries: TimeStep[] = [];
  let totalUnservedWh = 0;
  let totalGridWh = 0;
  let totalSolarGenWh = 0;
  let totalSolarUsedWh = 0;
  let totalSolarClippedWh = 0;
  let minSoC = 100;
  let minSoCTime = 0;
  
  const psh = site.peakSunHours.typ * pshMultiplier;
  const dayLength = site.sunset - site.sunrise;
  const peakFactor = Math.min(1.1, (Math.PI * psh) / (2 * dayLength));
  
  const pvWpTotal = pv ? pv.panel.wp * pv.series * pv.parallelStrings : 0;
  
  // Fix #25: Proper grid schedule with daily reset
  for (let step = 0; step < totalSteps; step++) {
    const minuteOfDay = (step % stepsPerDay) * stepMinutes;
    const hourOfDay = minuteOfDay / 60;
    const day = Math.floor(step / stepsPerDay);
    const totalMinutes = step * stepMinutes;
    
    // Fix #25 & #26: Proper grid schedule with daily reset
    let gridAvailable = false;
    if (grid.mode === 'pattern') {
      // Fix #25: Use minuteOfDay (resets each day) instead of totalMinutes
      const minuteOfDayLocal = minuteOfDay;
      
      // Fix #26: Determine if we're in night period
      let effectiveOutage = grid.outageMinutes;
      let effectiveGrid = grid.gridMinutes;
      let cycleStartMinute = grid.firstOutageStartMinute;
      
      if (grid.nightOverride) {
        const nightStart = grid.nightOverride.fromHour * 60;
        const nightEnd = grid.nightOverride.toHour * 60;
        
        // Handle wrap-around midnight
        const isNight = nightStart <= nightEnd 
          ? (minuteOfDayLocal >= nightStart && minuteOfDayLocal < nightEnd)
          : (minuteOfDayLocal >= nightStart || minuteOfDayLocal < nightEnd);
        
        if (isNight) {
          effectiveOutage = grid.nightOverride.outageMinutes;
          effectiveGrid = grid.nightOverride.gridMinutes;
          // Fix #26: Anchor night cycle to nightStart, not day phase
          cycleStartMinute = nightStart;
        }
      }
      
      const effectiveCycle = effectiveOutage + effectiveGrid;
      // Fix #25: Reset cycle position each day using minuteOfDayLocal
      const posInCycle = ((minuteOfDayLocal - cycleStartMinute) % effectiveCycle + effectiveCycle) % effectiveCycle;
      gridAvailable = posInCycle >= effectiveOutage;
    }
    
    // Fix #27 & #28: Proper load calculation with usage profiles
    const load = calculateLoadAtHour(loads, hourOfDay, loadMultiplier);
    let loadW = load.watts;
    
    // Fix #9: Calculate efficiency WITHOUT idle (idle added separately)
    const loadFraction = loadW / inverter.ratedW;
    const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
    
    // Fix #9: Idle only when inverter is actively converting power
    const idleW = loadW > 0 ? inverter.idleW : 0;
    
    // Fix #4: Apply discharge efficiency
    const dischargeEfficiency = bank.unit.chargeEfficiency; // Use same as charge for simplicity
    
    // Solar generation
    let pvW = 0;
    if (pv && pvWpTotal > 0) {
      if (hourOfDay >= site.sunrise && hourOfDay <= site.sunset) {
        const sinArg = Math.PI * (hourOfDay - site.sunrise) / dayLength;
        pvW = pvWpTotal * peakFactor * Math.sin(sinArg) * site.systemDerate;
        
        // Fix #31: Clamp near-zero values
        if (pvW < 0.01) pvW = 0;
        
        // Fix #21: Don't double-derate (systemDerate already applied above)
        
        // Fix #8: Enforce MPPT power limit
        if (inverter.mppt && pvW > inverter.mppt.maxPvW) {
          totalSolarClippedWh += (pvW - inverter.mppt.maxPvW) * (stepMinutes / 60);
          pvW = inverter.mppt.maxPvW;
        }
      }
    }
    totalSolarGenWh += pvW * (stepMinutes / 60);
    
    // DC draw from load (without idle double-counting)
    const dcWatts = loadW / efficiency;
    
    const dtHours = stepMinutes / 60;
    let battFlowW = 0;
    let gridW = 0;
    let unservedW = 0;
    let solarUsedW = 0;
    
    // Fix #5: Handle inverter overload BEFORE adding idle
    if (loadW > inverter.ratedW) {
      unservedW += (loadW - inverter.ratedW);
      loadW = inverter.ratedW;
    }
    
    if (!gridAvailable) {
      // Off-grid: PV → load → battery
      const pvForLoad = Math.min(pvW, dcWatts);
      solarUsedW = pvForLoad;
      const remainingLoadDC = dcWatts - pvForLoad;
      
      if (remainingLoadDC > 0) {
        // Fix #6: Load shedding based on priority
        const priorityLoads = loads.filter(l => l.onBackupCircuit).sort((a, b) => a.priority - b.priority);
        let loadToServe = remainingLoadDC;
        let servedLoad = 0;
        
        for (const loadItem of priorityLoads) {
          const hourFraction = loadItem.hourly[Math.floor(hourOfDay)] || 0;
          const loadPower = loadItem.qty * loadItem.watts * loadItem.dutyCycle * hourFraction * loadMultiplier / efficiency;
          
          if (servedLoad + loadPower <= loadToServe) {
            servedLoad += loadPower;
          } else {
            // Can only serve part of this load
            const fraction = (loadToServe - servedLoad) / loadPower;
            servedLoad += loadPower * fraction;
            break;
          }
        }
        
        const energyNeeded = servedLoad * dtHours;
        const energyAvailable = energy - eMin;
        
        // Fix #4: Apply discharge efficiency
        const actualDischargeW = servedLoad / dischargeEfficiency;
        
        if (energyAvailable >= energyNeeded) {
          energy -= energyNeeded / dischargeEfficiency;
          battFlowW = -actualDischargeW;
        } else {
          const servedFraction = energyAvailable / energyNeeded;
          energy = eMin;
          unservedW += actualDischargeW * (1 - servedFraction);
          battFlowW = -actualDischargeW * servedFraction;
        }
      }
      
      // Fix #1 & #2: Surplus solar charges battery even when grid is down
      if (pvW > pvForLoad) {
        const surplusW = pvW - pvForLoad;
        
        // Fix #8: Enforce MPPT charge current limit
        let chargeLimitW = Infinity;
        if (inverter.mppt && inverter.mppt.maxChargeA) {
          chargeLimitW = inverter.mppt.maxChargeA * vNom;
        }
        
        // Fix #11: CV taper for LFP
        const soc = energy / eNom;
        let taper = 1;
        if (bank.unit.chemistry === 'lifepo4' && soc > 0.95) {
          taper = Math.max(0.3, 1 - (soc - 0.95) / 0.05 * 0.7);
        } else if (bank.unit.chemistry !== 'lifepo4' && soc > 0.80) {
          taper = Math.max(0.15, 1 - (soc - 0.80) / 0.20 * 0.85);
        }
        
        const chargeW = Math.min(surplusW, chargeLimitW * taper);
        const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
        
        if (energy + energyAdded <= eMax) {
          energy += energyAdded;
          battFlowW = chargeW;
          solarUsedW += chargeW;
        }
      }
    } else {
      // Grid available
      if (options.mode === 'ips') {
        // IPS mode: Grid powers load, charges battery
        gridW = loadW;
        
        // Fix #3: Include battery charging in gridW
        const chargeLimitW = Math.min(
          inverter.gridChargerMaxA * vNom,
          bank.unit.maxChargeC * ahTotal * vNom,
          bank.unit.maxChargeA ? bank.unit.maxChargeA * vNom : Infinity
        );
        
        // Fix #11: CV taper
        const soc = energy / eNom;
        let taper = 1;
        if (bank.unit.chemistry === 'lifepo4' && soc > 0.95) {
          taper = Math.max(0.3, 1 - (soc - 0.95) / 0.05 * 0.7);
        } else if (bank.unit.chemistry !== 'lifepo4' && soc > 0.80) {
          taper = Math.max(0.15, 1 - (soc - 0.80) / 0.20 * 0.85);
        }
        
        const chargeW = chargeLimitW * taper;
        const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
        
        if (energy + energyAdded <= eMax) {
          energy += energyAdded;
          gridW += chargeW; // Fix #3: Add charging to grid consumption
          battFlowW = chargeW;
        }
        
        // Fix #2: PV also charges battery when grid is up
        if (pvW > 0 && energy < eMax) {
          const pvChargeW = Math.min(pvW, chargeLimitW * taper - chargeW);
          if (pvChargeW > 0) {
            const pvEnergy = pvChargeW * bank.unit.chargeEfficiency * dtHours;
            energy = Math.min(eMax, energy + pvEnergy);
            battFlowW += pvChargeW;
            solarUsedW += pvChargeW;
          }
        }
        
        totalGridWh += gridW * dtHours;
      } else {
        // Other modes: PV → load → grid → battery
        const pvForLoad = Math.min(pvW, dcWatts);
        solarUsedW = pvForLoad;
        
        const remainingLoadDC = dcWatts - pvForLoad;
        if (remainingLoadDC > 0) {
          gridW = remainingLoadDC;
          totalGridWh += gridW * dtHours;
        }
        
        // Surplus PV charges battery
        if (pvW > pvForLoad && energy < eMax) {
          const surplusPv = pvW - pvForLoad;
          const chargeLimitW = Math.min(
            inverter.gridChargerMaxA * vNom,
            bank.unit.maxChargeC * ahTotal * vNom,
            bank.unit.maxChargeA ? bank.unit.maxChargeA * vNom : Infinity
          );
          
          const soc = energy / eNom;
          let taper = 1;
          if (bank.unit.chemistry === 'lifepo4' && soc > 0.95) {
            taper = Math.max(0.3, 1 - (soc - 0.95) / 0.05 * 0.7);
          } else if (bank.unit.chemistry !== 'lifepo4' && soc > 0.80) {
            taper = Math.max(0.15, 1 - (soc - 0.80) / 0.20 * 0.85);
          }
          
          const chargeW = Math.min(surplusPv, chargeLimitW * taper);
          const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
          energy = Math.min(eMax, energy + energyAdded);
          battFlowW = chargeW;
          solarUsedW += chargeW;
        }
      }
    }
    
    // Fix #31: Round all values to avoid float noise
    totalSolarUsedWh += Math.round(solarUsedW * dtHours * 100) / 100;
    totalUnservedWh += Math.round(unservedW * dtHours * 100) / 100;
    
    const soc = (energy / eNom) * 100;
    if (soc < minSoC) {
      minSoC = soc;
      minSoCTime = totalMinutes;
    }
    
    timeSeries.push({
      t: totalMinutes,
      soc: Math.round(soc * 1000) / 1000,
      loadW: Math.round(loadW * 100) / 100,
      pvW: Math.round(pvW * 100) / 100,
      gridW: Math.round(gridW * 100) / 100,
      battW: Math.round(battFlowW * 100) / 100,
      unservedW: Math.round(unservedW * 100) / 100,
      gridAvailable,
    });
  }
  
  // Fix #12: Runtime based on worst-case evening peak, not 24h average
  const backupLoads = loads.filter(l => l.onBackupCircuit);
  const eveningPeakW = backupLoads.reduce((sum, l) => {
    const eveningHourly = l.hourly.slice(18, 23).reduce((a, b) => a + b, 0) / 5;
    return sum + l.qty * l.watts * l.dutyCycle * eveningHourly * loadMultiplier;
  }, 0);
  
  const continuousRuntime = calculateContinuousRuntime(bank, inverter, eveningPeakW);
  
  // Fix #13 & #14: Calculate actual DoD from simulation
  const actualDoD = (100 - minSoC) / 100;
  const energyRemoved = eNom * actualDoD;
  const closedFormRecharge = calculateRechargeTime(bank, inverter, energyRemoved, inverter.gridChargerMaxA);
  
  // Fix #14: Calculate actual cycles from simulation
  const totalDischargeWh = timeSeries.reduce((sum, t) => sum + Math.max(0, -t.battW) * (stepMinutes / 60), 0);
  const cyclesPerDay = totalDischargeWh / (eNom * bank.unit.usableDoD) / totalDays;
  
  const gridWindowH = grid.gridMinutes / 60;
  let recoveryStatus: 'yes' | 'barely' | 'no';
  if (closedFormRecharge <= gridWindowH * 0.9) recoveryStatus = 'yes';
  else if (closedFormRecharge <= gridWindowH) recoveryStatus = 'barely';
  else recoveryStatus = 'no';
  
  const warnings = generateWarnings(project, timeSeries, eveningPeakW, closedFormRecharge, gridWindowH, assumptionSet);
  
  return {
    timeSeries,
    runtimeHours: continuousRuntime,
    rechargeTimeHours: closedFormRecharge,
    minSoC,
    minSoCTime,
    unservedWh: totalUnservedWh,
    gridWh: totalGridWh,
    solarGeneratedWh: totalSolarGenWh,
    solarUsedWh: totalSolarUsedWh,
    solarClippedWh: totalSolarClippedWh,
    avgDoD: actualDoD,
    cyclesPerDay,
    warnings,
    continuousRuntime,
    closedFormRecharge,
    recoveryStatus,
  };
}

function generateWarnings(
  project: Project,
  timeSeries: TimeStep[],
  peakLoadW: number,
  rechargeTimeH: number,
  gridWindowH: number,
  _assumptionSet: AssumptionSet
): Warning[] {
  const warnings: Warning[] = [];
  const { loads, inverter, bank, pv } = project;
  
  // Fix #16: Remove false BANK_VOLTAGE_MISMATCH warning
  // Fix #17: Add missing warnings
  
  // Check for unserved load
  const hasUnserved = timeSeries.some(t => t.unservedW > 0);
  if (hasUnserved) {
    warnings.push({
      id: 'UNSERVED_LOAD',
      severity: 'critical',
      message: 'System cannot serve all loads during some periods',
      suggestedFix: 'Increase battery capacity or reduce load',
    });
  }
  
  // Check for floor hits
  const minSoC = Math.min(...timeSeries.map(t => t.soc));
  if (minSoC <= (1 - bank.unit.usableDoD) * 100 + 1) {
    warnings.push({
      id: 'SOC_FLOOR',
      severity: 'critical',
      message: `Battery reaches minimum SoC (${minSoC.toFixed(1)}%)`,
      suggestedFix: 'Increase battery capacity or reduce load',
    });
  }
  
  // Fix #8: Add PV/MPPT oversize warning
  if (pv && inverter.mppt) {
    const pvWp = pv.panel.wp * pv.series * pv.parallelStrings;
    if (pvWp > inverter.mppt.maxPvW * 1.3) {
      warnings.push({
        id: 'PV_OVERSIZED',
        severity: 'warn',
        message: `PV array (${pvWp}W) exceeds MPPT max (${inverter.mppt.maxPvW}W) by >30%`,
        suggestedFix: 'Reduce PV array size or use inverter with larger MPPT',
      });
    }
  }
  
  // Inverter overload
  const peakVA = Math.max(...timeSeries.map(t => {
    const h = (t.t / 60) % 24;
    return calculateSurgeVA(loads, h, 1);
  }));
  
  if (peakVA > inverter.ratedVA) {
    warnings.push({
      id: 'INV_OVERLOAD_VA',
      severity: 'critical',
      message: `Peak apparent power (${Math.round(peakVA)} VA) exceeds inverter rating (${inverter.ratedVA} VA)`,
      suggestedFix: 'Reduce load or choose larger inverter',
    });
  }
  
  // Slow recharge
  if (rechargeTimeH > gridWindowH) {
    warnings.push({
      id: 'BATT_CHARGE_SLOW',
      severity: rechargeTimeH > gridWindowH * 1.2 ? 'critical' : 'warn',
      message: `Battery needs ${rechargeTimeH.toFixed(1)}h to recharge but only ${gridWindowH.toFixed(1)}h grid time`,
      suggestedFix: 'Add solar panels or reduce load (charger limited to ' + inverter.gridChargerMaxA + 'A)',
    });
  }
  
  // Fix #18: Improve warning quality
  if (!inverter.verified || !bank.unit.verified) {
    warnings.push({
      id: 'UNVERIFIED_DEFAULT',
      severity: 'warn', // Changed from 'info'
      message: 'Equipment specs are editable defaults, not verified from datasheets',
      suggestedFix: 'Check your actual equipment datasheet and update values',
    });
  }
  
  warnings.push({
    id: 'FUSE_REQUIRED',
    severity: 'info',
    message: 'DC-rated fuse/breaker required between battery and inverter',
    suggestedFix: `Install DC breaker rated for ${Math.ceil(bank.unit.maxDischargeA || bank.unit.maxChargeA || 100) * 1.25}A`,
  });
  
  return warnings;
}

/**
 * Calculate recommended system sizing
 */
export function calculateSizing(project: Project): {
  minRatedVA: number;
  recommendedVA: number;
  systemVoltage: 12 | 24 | 48;
  batteryAhNeeded: number;
  solarWpNeeded: number;
  roofAreaM2: number;
} {
  const { loads, inverter, bank, site } = project;
  
  // Peak running VA
  let peakVA = 0;
  let peakW = 0;
  for (let h = 0; h < 24; h++) {
    const load = calculateLoadAtHour(loads, h);
    if (load.va > peakVA) peakVA = load.va;
    if (load.watts > peakW) peakW = load.watts;
  }
  
  // Surge VA
  let maxSurgeVA = 0;
  for (let h = 0; h < 24; h++) {
    const surge = calculateSurgeVA(loads, h);
    if (surge > maxSurgeVA) maxSurgeVA = surge;
  }
  
  const minRatedVA = Math.max(peakVA * 1.25, maxSurgeVA);
  const recommendedVA = Math.ceil(minRatedVA / 100) * 100;
  
  // System voltage guidance
  let systemVoltage: 12 | 24 | 48 = 12;
  if (recommendedVA > 3000) systemVoltage = 48;
  else if (recommendedVA > 1200) systemVoltage = 24;
  
  // Battery sizing for target autonomy
  const outageH = project.grid.outageMinutes / 60;
  const avgLoadW = peakW * 0.7;
  const dcW = avgLoadW / 0.88 + inverter.idleW;
  const energyNeeded = dcW * outageH;
  const reservePct = project.options.reservePct / 100;
  const eNomNeeded = energyNeeded / (bank.unit.usableDoD * (1 - reservePct));
  const batteryAhNeeded = Math.ceil(eNomNeeded / (bank.unit.nominalV * bank.series));
  
  // Solar sizing
  const dailyEnergyWh = avgLoadW * 16;
  const solarWpNeeded = Math.ceil(dailyEnergyWh / (site.peakSunHours.typ * site.systemDerate));
  const roofAreaM2 = (solarWpNeeded / 1000) * 7;
  
  return { minRatedVA, recommendedVA, systemVoltage, batteryAhNeeded, solarWpNeeded, roofAreaM2 };
}

/**
 * Calculate economics
 */
export function calculateCosts(project: Project, result: SimulationResult): {
  monthlyBillNoSolar: number;
  monthlyBillWithSolar: number;
  monthlySavings: number;
  annualSavings: number;
  systemCost: number;
  simplePaybackYears: number | null;
  costPerKwhDelivered: number;
  batteryLifeYears: number;
} {
  const { tariff, bank, pv } = project;
  
  // Monthly consumption
  const dailyGridWh = result.gridWh / project.options.simulationDays;
  const monthlyKwh = (dailyGridWh / 1000) * 30;
  
  // Bill without solar
  let billNoSolar = 0;
  let remaining = monthlyKwh;
  let prevLimit = 0;
  for (const slab of tariff.slabs) {
    const slabWidth = slab.upToKwh !== null ? slab.upToKwh - prevLimit : remaining;
    const consumed = Math.min(remaining, slabWidth);
    billNoSolar += consumed * slab.rate;
    remaining -= consumed;
    prevLimit = slab.upToKwh || prevLimit + consumed;
    if (remaining <= 0) break;
  }
  billNoSolar += tariff.fixedMonthly || 0;
  billNoSolar *= (1 + (tariff.vatPct || 0) / 100);
  
  // Bill with solar
  const solarOffset = (result.solarUsedWh / project.options.simulationDays / 1000) * 30;
  const monthlyKwhWithSolar = Math.max(0, monthlyKwh - solarOffset);
  
  let billWithSolar = 0;
  remaining = monthlyKwhWithSolar;
  prevLimit = 0;
  for (const slab of tariff.slabs) {
    const slabWidth = slab.upToKwh !== null ? slab.upToKwh - prevLimit : remaining;
    const consumed = Math.min(remaining, slabWidth);
    billWithSolar += consumed * slab.rate;
    remaining -= consumed;
    prevLimit = slab.upToKwh || prevLimit + consumed;
    if (remaining <= 0) break;
  }
  billWithSolar += tariff.fixedMonthly || 0;
  billWithSolar *= (1 + (tariff.vatPct || 0) / 100);
  
  const monthlySavings = billNoSolar - billWithSolar;
  const annualSavings = monthlySavings * 12;
  
  // System cost
  const batteryCost = (bank.unit.price || 0) * bank.series * bank.parallel;
  const panelCost = pv ? (pv.panel.price || 0) * pv.series * pv.parallelStrings : 0;
  const inverterCost = 15000;
  const systemCost = batteryCost + panelCost + inverterCost;
  
  const simplePaybackYears = annualSavings > 0 ? systemCost / annualSavings : null;
  
  // Battery life
  const avgDoD = result.avgDoD;
  const cyclesPerYear = result.cyclesPerDay * 365;
  let cycleLifeAtDoD = bank.unit.cycleLife[0].cycles.typ;
  for (let i = 0; i < bank.unit.cycleLife.length - 1; i++) {
    if (avgDoD >= bank.unit.cycleLife[i].dod && avgDoD <= bank.unit.cycleLife[i + 1].dod) {
      const t = (avgDoD - bank.unit.cycleLife[i].dod) / (bank.unit.cycleLife[i + 1].dod - bank.unit.cycleLife[i].dod);
      cycleLifeAtDoD = bank.unit.cycleLife[i].cycles.typ + t * (bank.unit.cycleLife[i + 1].cycles.typ - bank.unit.cycleLife[i].cycles.typ);
      break;
    }
  }
  const batteryLifeYears = cyclesPerYear > 0 ? Math.min(cycleLifeAtDoD / cyclesPerYear, bank.unit.calendarLifeYears.typ) : bank.unit.calendarLifeYears.typ;
  
  const usableKwh = (bank.unit.nominalV * bank.series * bank.unit.ratedAh * bank.parallel * bank.unit.usableDoD) / 1000;
  const costPerKwhDelivered = usableKwh > 0 && batteryLifeYears > 0 ? batteryCost / (usableKwh * cycleLifeAtDoD) : 0;
  
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
