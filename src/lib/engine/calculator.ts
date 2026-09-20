import {
  Project, SimulationResult, TimeStep, Warning, SizingResult, CostResult,
  LoadItem, BatteryBank, Inverter, AssumptionSet
} from '../../types';

// ============================================================
// CORE CALCULATION ENGINE - Pure functions, no UI imports
// ============================================================

/**
 * Interpolate efficiency from the inverter's efficiency curve
 */
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

/**
 * Calculate total AC load at a given hour
 */
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

/**
 * Calculate worst-case surge VA
 */
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

/**
 * Calculate DC draw from inverter given AC load
 */
export function calculateDCDraw(acWatts: number, inverter: Inverter): { dcWatts: number; dcAmps: number; efficiency: number } {
  const loadFraction = acWatts / inverter.ratedW;
  const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
  const dcWatts = acWatts / efficiency + (acWatts > 0 ? inverter.idleW : 0);
  const dcAmps = dcWatts / inverter.systemVoltage;
  return { dcWatts, dcAmps, efficiency };
}

/**
 * Calculate continuous runtime from full battery (closed form)
 */
export function calculateContinuousRuntime(bank: BatteryBank, inverter: Inverter, loadWatts: number): number {
  if (loadWatts <= 0) return Infinity;
  
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = vNom * ahTotal; // Wh
  const eUsable = eNom * bank.unit.usableDoD;
  
  // DC draw
  const loadFraction = loadWatts / inverter.ratedW;
  const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
  const dcWatts = loadWatts / efficiency + inverter.idleW;
  
  // Peukert factor
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
  return effectiveUsable / dcWatts; // hours
}

/**
 * Calculate recharge time (closed form estimate)
 */
export function calculateRechargeTime(
  bank: BatteryBank,
  inverter: Inverter,
  energyRemovedWh: number,
  gridChargerMaxA: number
): number {
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  
  // Max charge current (limited by charger, battery C-rate, and BMS)
  const maxChargeByC = bank.unit.maxChargeC * ahTotal;
  const maxChargeByBMS = bank.unit.maxChargeA || Infinity;
  const chargeA = Math.min(gridChargerMaxA, maxChargeByC, maxChargeByBMS);
  
  // Average charge power
  const chargeW = chargeA * vNom;
  const chargeEff = bank.unit.chargeEfficiency;
  const effectiveChargeW = chargeW * chargeEff;
  
  if (effectiveChargeW <= 0) return Infinity;
  return energyRemovedWh / effectiveChargeW;
}

/**
 * Run time-step simulation
 */
export function runSimulation(project: Project, assumptionSet: AssumptionSet = 'typ'): SimulationResult {
  const { loads, grid, inverter, bank, pv, site, options } = project;
  
  const loadMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.2 : 1.0;
  const pshMultiplier = assumptionSet === 'low' ? 0.85 : assumptionSet === 'high' ? 1.1 : 1.0;
  
  const stepMinutes = 15;
  const stepsPerDay = 96;
  const totalDays = options.simulationDays;
  const totalSteps = stepsPerDay * totalDays;
  
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const eNom = vNom * ahTotal;
  
  // Apply reserve capacity to minimum energy
  const reservePct = options.reservePct / 100;
  const eMin = eNom * (1 - bank.unit.usableDoD) + eNom * reservePct;
  const eMax = eNom;
  
  // Fix initial SoC default (Bug #9)
  const initialSoC = options.initialSoC ?? 100;
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
  
  // Total PV watts
  const pvWpTotal = pv ? pv.panel.wp * pv.series * pv.parallelStrings : 0;
  
  for (let step = 0; step < totalSteps; step++) {
    const minuteOfDay = (step % stepsPerDay) * stepMinutes;
    const hourOfDay = minuteOfDay / 60;
    const day = Math.floor(step / stepsPerDay);
    const totalMinutes = step * stepMinutes;
    
    // Grid availability
    let gridAvailable = false;
    if (grid.mode === 'pattern') {
      const cycleLength = grid.outageMinutes + grid.gridMinutes;
      let effectiveOutage = grid.outageMinutes;
      let effectiveGrid = grid.gridMinutes;
      
      if (grid.nightOverride && (hourOfDay >= grid.nightOverride.fromHour || hourOfDay < grid.nightOverride.toHour)) {
        effectiveOutage = grid.nightOverride.outageMinutes;
        effectiveGrid = grid.nightOverride.gridMinutes;
      }
      
      const effectiveCycle = effectiveOutage + effectiveGrid;
      const posInCycle = (totalMinutes - grid.firstOutageStartMinute + effectiveCycle * 1000) % effectiveCycle;
      gridAvailable = posInCycle >= effectiveOutage;
    }
    
    // Load
    const load = calculateLoadAtHour(loads, hourOfDay, loadMultiplier);
    let loadW = load.watts;
    
    // Solar generation
    let pvW = 0;
    if (pv && pvWpTotal > 0) {
      if (hourOfDay >= site.sunrise && hourOfDay <= site.sunset) {
        const sinArg = Math.PI * (hourOfDay - site.sunrise) / dayLength;
        pvW = Math.min(pvWpTotal * peakFactor * Math.sin(sinArg) * site.systemDerate, pv.panel.wp * pv.series * pv.parallelStrings);
        
        // Apply cloudy day factor for worst-case days
        if (site.worstCaseCloudyDays > 0 && day < site.worstCaseCloudyDays) {
          pvW *= site.cloudyDayFactor;
        }
        
        // Enforce MPPT limits
        if (inverter.mppt) {
          if (pvW > inverter.mppt.maxPvW) {
            totalSolarClippedWh += (pvW - inverter.mppt.maxPvW) * (stepMinutes / 60);
            pvW = inverter.mppt.maxPvW;
          }
        }
      }
    }
    totalSolarGenWh += pvW * (stepMinutes / 60);
    
    // DC draw from load
    const loadFraction = loadW / inverter.ratedW;
    const efficiency = interpolateEfficiency(inverter.efficiencyCurve, loadFraction);
    const idleW = loadW > 0 ? inverter.idleW : 0;
    const dcWatts = loadW / efficiency + idleW;
    
    // Energy balance
    const dtHours = stepMinutes / 60;
    let battFlowW = 0; // positive = charging
    let gridW = 0;
    let unservedW = 0;
    let solarUsedW = 0;
    
    // Bug #7: Handle inverter overload
    if (loadW > inverter.ratedW) {
      unservedW += (loadW - inverter.ratedW);
      loadW = inverter.ratedW;
    }
    
    if (!gridAvailable) {
      // Off-grid: PV → load, then battery
      const pvForLoad = Math.min(pvW, loadW > 0 ? dcWatts : 0);
      solarUsedW = pvForLoad;
      const remainingLoad = dcWatts - pvForLoad;
      
      if (remainingLoad > 0) {
        // Discharge battery
        const energyNeeded = remainingLoad * dtHours;
        const energyAvailable = energy - eMin;
        
        // Apply battery discharge current limit
        let dischargeW = remainingLoad;
        if (bank.unit.maxDischargeA) {
          const maxDischargeW = bank.unit.maxDischargeA * vNom;
          if (dischargeW > maxDischargeW) {
            unservedW += (dischargeW - maxDischargeW) * efficiency;
            dischargeW = maxDischargeW;
          }
        }
        
        if (energyAvailable >= energyNeeded && dischargeW > 0) {
          energy -= energyNeeded;
          battFlowW = -dischargeW;
        } else if (dischargeW > 0) {
          // Can't serve all load
          const servedFraction = energyAvailable / energyNeeded;
          energy = eMin;
          unservedW += dischargeW * (1 - servedFraction) * efficiency;
          battFlowW = -dischargeW * servedFraction;
        }
      } else {
        // Surplus solar → charge battery
        const surplusW = Math.abs(remainingLoad);
        const chargeLimitW = getChargeLimitW(bank, inverter, energy, eMax, gridAvailable, pvW > 0);
        
        // Enforce MPPT charge current limit
        let chargeW = Math.min(surplusW, chargeLimitW);
        if (inverter.mppt && inverter.mppt.maxChargeA) {
          const mpptLimitW = inverter.mppt.maxChargeA * vNom;
          chargeW = Math.min(chargeW, mpptLimitW);
        }
        
        const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
        energy = Math.min(eMax, energy + energyAdded);
        battFlowW = chargeW;
        solarUsedW += chargeW;
      }
    } else {
      // Grid available - implement proper operating modes
      if (options.mode === 'ips') {
        // IPS mode: Grid powers load directly (bypass), charges battery
        gridW = loadW;
        totalGridWh += loadW * dtHours;
        
        // Charge battery at max rate
        const chargeLimitW = getChargeLimitW(bank, inverter, energy, eMax, true, pvW > 0);
        let chargeW = chargeLimitW;
        
        // Enforce total charge current limit (grid + solar)
        if (inverter.maxTotalChargeA) {
          const maxTotalChargeW = inverter.maxTotalChargeA * vNom;
          if (chargeW > maxTotalChargeW) {
            chargeW = maxTotalChargeW;
          }
        }
        
        const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
        energy = Math.min(eMax, energy + energyAdded);
        battFlowW = chargeW;
        
        // Also use PV if available
        if (pvW > 0) {
          const remainingChargeCapacity = Math.max(0, (inverter.maxTotalChargeA ? inverter.maxTotalChargeA * vNom : Infinity) - battFlowW);
          const pvChargeW = Math.min(pvW, chargeLimitW - battFlowW, remainingChargeCapacity);
          if (pvChargeW > 0) {
            const pvEnergy = pvChargeW * bank.unit.chargeEfficiency * dtHours;
            energy = Math.min(eMax, energy + pvEnergy);
            battFlowW += pvChargeW;
            solarUsedW += pvChargeW;
          }
        }
      } else if (options.mode === 'utility_first') {
        // Utility first: Grid powers load, solar charges battery
        gridW = loadW;
        totalGridWh += loadW * dtHours;
        
        // Solar charges battery
        if (pvW > 0) {
          const chargeLimitW = getChargeLimitW(bank, inverter, energy, eMax, true, true);
          let chargeW = Math.min(pvW, chargeLimitW);
          
          // Enforce MPPT limit
          if (inverter.mppt && inverter.mppt.maxChargeA) {
            const mpptLimitW = inverter.mppt.maxChargeA * vNom;
            chargeW = Math.min(chargeW, mpptLimitW);
          }
          
          const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
          energy = Math.min(eMax, energy + energyAdded);
          battFlowW = chargeW;
          solarUsedW += chargeW;
        }
      } else if (options.mode === 'solar_first') {
        // Solar first: Solar → load → grid → battery
        const pvForLoad = Math.min(pvW, dcWatts);
        solarUsedW = pvForLoad;
        
        // Grid supplies remaining load (AC power)
        const remainingLoadDC = dcWatts - pvForLoad;
        if (remainingLoadDC > 0) {
          gridW = remainingLoadDC / efficiency; // Grid AC power needed
          totalGridWh += gridW * dtHours;
        }
        
        // Surplus PV charges battery
        const surplusPv = pvW - pvForLoad;
        if (surplusPv > 0) {
          const chargeLimitW = getChargeLimitW(bank, inverter, energy, eMax, true, true);
          let chargeW = Math.min(surplusPv, chargeLimitW);
          
          // Enforce MPPT limit
          if (inverter.mppt && inverter.mppt.maxChargeA) {
            const mpptLimitW = inverter.mppt.maxChargeA * vNom;
            chargeW = Math.min(chargeW, mpptLimitW);
          }
          
          const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
          energy = Math.min(eMax, energy + energyAdded);
          battFlowW = chargeW;
          solarUsedW += chargeW;
        }
      } else if (options.mode === 'sbu') {
        // SBU (Solar-Battery-Utility): Solar → Battery → Utility
        const soc = energy / eNom;
        const sbuSwitchToGridSoC = 0.20; // Switch to grid at 20% SoC
        const sbuReturnSoC = 0.80; // Return to battery at 80% SoC
        
        // Solar powers load first
        const pvForLoad = Math.min(pvW, dcWatts);
        solarUsedW = pvForLoad;
        const remainingLoadDC = dcWatts - pvForLoad;
        
        if (remainingLoadDC > 0) {
          // Check if we should use battery or grid
          if (soc > sbuSwitchToGridSoC) {
            // Use battery
            const energyNeeded = remainingLoadDC * dtHours;
            const energyAvailable = energy - eMin;
            
            if (energyAvailable >= energyNeeded) {
              energy -= energyNeeded;
              battFlowW = -remainingLoadDC;
            } else {
              const servedFraction = energyAvailable / energyNeeded;
              energy = eMin;
              unservedW += remainingLoadDC * (1 - servedFraction) * efficiency;
              battFlowW = -remainingLoadDC * servedFraction;
            }
          } else {
            // Use grid and charge battery
            gridW = remainingLoadDC / efficiency;
            totalGridWh += gridW * dtHours;
            
            // Charge battery if below return SoC
            if (soc < sbuReturnSoC && pvW > pvForLoad) {
              const surplusPv = pvW - pvForLoad;
              const chargeLimitW = getChargeLimitW(bank, inverter, energy, eMax, true, true);
              let chargeW = Math.min(surplusPv, chargeLimitW);
              
              if (inverter.mppt && inverter.mppt.maxChargeA) {
                const mpptLimitW = inverter.mppt.maxChargeA * vNom;
                chargeW = Math.min(chargeW, mpptLimitW);
              }
              
              const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
              energy = Math.min(eMax, energy + energyAdded);
              battFlowW = chargeW;
              solarUsedW += chargeW;
            }
          }
        } else {
          // Surplus solar charges battery
          const surplusPv = Math.abs(remainingLoadDC);
          const chargeLimitW = getChargeLimitW(bank, inverter, energy, eMax, true, true);
          let chargeW = Math.min(surplusPv, chargeLimitW);
          
          if (inverter.mppt && inverter.mppt.maxChargeA) {
            const mpptLimitW = inverter.mppt.maxChargeA * vNom;
            chargeW = Math.min(chargeW, mpptLimitW);
          }
          
          const energyAdded = chargeW * bank.unit.chargeEfficiency * dtHours;
          energy = Math.min(eMax, energy + energyAdded);
          battFlowW = chargeW;
          solarUsedW += chargeW;
        }
      }
    }
    
    totalSolarUsedWh += solarUsedW * dtHours;
    totalUnservedWh += unservedW * dtHours;
    
    const soc = (energy / eNom) * 100;
    if (soc < minSoC) {
      minSoC = soc;
      minSoCTime = totalMinutes;
    }
    
    timeSeries.push({
      t: totalMinutes,
      soc,
      loadW,
      pvW,
      gridW,
      battW: battFlowW,
      unservedW,
      gridAvailable,
    });
  }
  
  // Calculate continuous runtime
  const backupLoads = loads.filter(l => l.onBackupCircuit);
  const avgLoadW = backupLoads.reduce((sum, l) => {
    const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
    return sum + l.qty * l.watts * l.dutyCycle * avgHourly * loadMultiplier;
  }, 0);
  
  const continuousRuntime = calculateContinuousRuntime(bank, inverter, avgLoadW);
  
  // Recharge time estimate
  const avgDoD = Math.max(0, (100 - minSoC) / 100 * bank.unit.usableDoD);
  const energyRemoved = eNom * avgDoD;
  const closedFormRecharge = calculateRechargeTime(bank, inverter, energyRemoved, inverter.gridChargerMaxA);
  
  // Recovery status
  const gridWindowH = grid.gridMinutes / 60;
  let recoveryStatus: 'yes' | 'barely' | 'no';
  if (closedFormRecharge <= gridWindowH * 0.9) recoveryStatus = 'yes';
  else if (closedFormRecharge <= gridWindowH) recoveryStatus = 'barely';
  else recoveryStatus = 'no';
  
  // Cycles per day
  const cyclesPerDay = avgDoD; // one cycle = full DoD
  
  // Generate warnings
  const warnings = generateWarnings(project, timeSeries, avgLoadW, closedFormRecharge, gridWindowH, assumptionSet);
  
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
    avgDoD,
    cyclesPerDay,
    warnings,
    continuousRuntime,
    closedFormRecharge,
    recoveryStatus,
  };
}

function getChargeLimitW(bank: BatteryBank, inverter: Inverter, currentEnergy: number, eMax: number, gridAvailable: boolean, pvAvailable: boolean = false): number {
  const vNom = bank.unit.nominalV * bank.series;
  const ahTotal = bank.unit.ratedAh * bank.parallel;
  const soc = currentEnergy / (vNom * ahTotal);
  
  // Stop charging when battery is full
  if (soc >= 0.99) return 0;
  
  // Taper
  let taper = 1;
  if (bank.unit.chemistry === 'lifepo4') {
    if (soc > 0.95) taper = Math.max(0.3, 1 - (soc - 0.95) / 0.05 * 0.7);
  } else {
    if (soc > 0.80) taper = Math.max(0.15, 1 - (soc - 0.80) / 0.20 * 0.85);
  }
  
  const maxChargeByC = bank.unit.maxChargeC * ahTotal * taper;
  const maxChargeByBMS = bank.unit.maxChargeA ? bank.unit.maxChargeA * taper : Infinity;
  
  // Allow solar to charge battery even when grid is down
  const chargerLimit = gridAvailable 
    ? inverter.gridChargerMaxA 
    : (pvAvailable && inverter.mppt ? inverter.mppt.maxChargeA : 0);
  
  const chargeA = Math.min(chargerLimit, maxChargeByC, maxChargeByBMS);
  return chargeA * vNom;
}

/**
 * Generate warnings based on current configuration
 */
export function generateWarnings(
  project: Project,
  timeSeries: TimeStep[],
  avgLoadW: number,
  rechargeTimeH: number,
  gridWindowH: number,
  _assumptionSet: AssumptionSet
): Warning[] {
  const warnings: Warning[] = [];
  const { loads, inverter, bank } = project;
  
  // Check for non-inverter-friendly loads on backup circuit
  for (const load of loads) {
    if (!load.onBackupCircuit) continue;
    const template = load.templateId;
    if (template && ['rice-cooker', 'iron', 'geyser', 'air-conditioner'].includes(template)) {
      warnings.push({
        id: 'NON_INVERTER_FRIENDLY',
        severity: 'critical',
        message: `${load.label} is not suitable for inverter backup. It draws too much power.`,
        suggestedFix: 'Move this load to a separate grid-only circuit.',
      });
    }
  }
  
  // Inverter overload check
  const peakVA = Math.max(...timeSeries.map(t => {
    const h = (t.t / 60) % 24;
    return calculateSurgeVA(loads, h, 1);
  }));
  
  if (peakVA > inverter.ratedVA) {
    warnings.push({
      id: 'INV_OVERLOAD_VA',
      severity: 'critical',
      message: `Peak apparent power (${Math.round(peakVA)} VA) exceeds inverter rating (${inverter.ratedVA} VA).`,
      suggestedFix: 'Reduce load or choose a larger inverter.',
    });
  } else if (peakVA > inverter.ratedVA * 0.9) {
    warnings.push({
      id: 'INV_OVERLOAD_VA',
      severity: 'warn',
      message: `Peak apparent power (${Math.round(peakVA)} VA) is close to inverter limit (${inverter.ratedVA} VA).`,
      suggestedFix: 'Consider a larger inverter for headroom.',
    });
  }
  
  // Battery voltage mismatch
  const bankVoltage = bank.unit.nominalV * bank.series;
  if (bankVoltage !== inverter.systemVoltage) {
    warnings.push({
      id: 'BANK_VOLTAGE_MISMATCH',
      severity: 'critical',
      message: `Battery bank voltage (${bankVoltage}V) doesn't match inverter system voltage (${inverter.systemVoltage}V).`,
      suggestedFix: `Adjust series count: need ${inverter.systemVoltage / bank.unit.nominalV} batteries in series.`,
    });
  }
  
  // Slow recharge
  if (rechargeTimeH > gridWindowH) {
    warnings.push({
      id: 'BATT_CHARGE_SLOW',
      severity: rechargeTimeH > gridWindowH * 1.2 ? 'critical' : 'warn',
      message: `Battery needs ${rechargeTimeH.toFixed(1)}h to recharge but only ${gridWindowH.toFixed(1)}h grid time available.`,
      suggestedFix: 'Add solar panels, reduce load, or increase battery charge current.',
    });
  }
  
  // SoC floor reached
  const minSoC = Math.min(...timeSeries.map(t => t.soc));
  if (minSoC <= (1 - bank.unit.usableDoD) * 100 + 1) {
    warnings.push({
      id: 'SOC_FLOOR',
      severity: 'critical',
      message: `Battery reaches minimum SoC (${minSoC.toFixed(1)}%). Load will be cut off.`,
      suggestedFix: 'Increase battery capacity or reduce load.',
    });
  }
  
  // Deep daily DoD for lead-acid
  if (bank.unit.chemistry === 'tubular' || bank.unit.chemistry === 'flooded') {
    const avgDoD = (100 - minSoC) / 100;
    if (avgDoD > 0.5) {
      warnings.push({
        id: 'DEEP_DAILY_DOD',
        severity: 'warn',
        message: `Daily DoD of ${(avgDoD * 100).toFixed(0)}% exceeds recommended 50% for ${bank.unit.chemistry} batteries.`,
        suggestedFix: 'Increase battery capacity or reduce daily discharge depth.',
      });
    }
  }
  
  // Parallel strings warning for lead-acid
  if ((bank.unit.chemistry === 'tubular' || bank.unit.chemistry === 'flooded') && bank.parallel > 3) {
    warnings.push({
      id: 'BANK_PARALLEL_LEAD',
      severity: 'warn',
      message: `${bank.parallel} parallel strings of lead-acid batteries may cause uneven charging.`,
      suggestedFix: 'Use larger individual batteries to reduce parallel count.',
    });
  }
  
  // Ventilation note for lead-acid
  if (bank.unit.chemistry === 'tubular' || bank.unit.chemistry === 'flooded') {
    warnings.push({
      id: 'VENTILATION_LEAD',
      severity: 'info',
      message: 'Lead-acid/tubular batteries produce hydrogen gas during charging.',
      suggestedFix: 'Ensure adequate ventilation in the battery room.',
    });
  }
  
  // Unverified defaults
  if (!inverter.verified || !bank.unit.verified) {
    warnings.push({
      id: 'UNVERIFIED_DEFAULT',
      severity: 'info',
      message: 'Some equipment specs are editable defaults, not verified from datasheets.',
      suggestedFix: 'Check your actual equipment datasheet and update the values.',
    });
  }
  
  // Fuse reminder
  warnings.push({
    id: 'FUSE_REQUIRED',
    severity: 'info',
    message: 'A DC-rated fuse/breaker is required between battery and inverter.',
    suggestedFix: 'Install a DC breaker rated 1.25× max continuous current.',
  });
  
  return warnings;
}

/**
 * Sizing helper - recommend inverter, battery, solar
 */
export function calculateSizing(project: Project): SizingResult {
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
  const recommendedVA = Math.ceil(minRatedVA / 100) * 100; // round up to nearest 100
  
  // System voltage guidance
  let systemVoltage: 12 | 24 | 48 = 12;
  if (recommendedVA > 3000) systemVoltage = 48;
  else if (recommendedVA > 1200) systemVoltage = 24;
  
  // Battery sizing for target autonomy (use grid outage duration)
  const outageH = project.grid.outageMinutes / 60;
  const avgLoadW = peakW * 0.7; // estimate average during outage
  const dcW = avgLoadW / 0.88 + inverter.idleW;
  const energyNeeded = dcW * outageH;
  const reservePct = project.options.reservePct / 100;
  const eNomNeeded = energyNeeded / (bank.unit.usableDoD * (1 - reservePct));
  const batteryAhNeeded = Math.ceil(eNomNeeded / (bank.unit.nominalV * bank.series));
  
  // Solar sizing
  const dailyEnergyWh = avgLoadW * 16; // assume 16h of mixed usage
  const solarWpNeeded = Math.ceil(dailyEnergyWh / (site.peakSunHours.typ * site.systemDerate));
  const roofAreaM2 = (solarWpNeeded / 1000) * 7; // 7 m² per kWp
  
  return { minRatedVA, recommendedVA, systemVoltage, batteryAhNeeded, solarWpNeeded, roofAreaM2 };
}

/**
 * Calculate economics
 */
export function calculateCosts(project: Project, result: SimulationResult): CostResult {
  const { tariff, bank, pv } = project;
  
  // Monthly consumption (kWh)
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
  
  // Bill with solar (reduced grid consumption)
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
  const inverterCost = 15000; // editable default
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
  
  // Cost per kWh delivered
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
