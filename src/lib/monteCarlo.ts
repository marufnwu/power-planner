/**
 * Monte Carlo Simulation for Uncertainty Analysis
 * 
 * Runs multiple simulations with varied inputs to show min/typical/max ranges
 */

import { Project, SimulationResult } from '../types';
import { runSimulation } from './engine/calculator';

export interface MonteCarloResult {
  min: SimulationResult;
  typical: SimulationResult;
  max: SimulationResult;
  confidence: number; // 0-100
  samples: number;
}

interface Variation {
  loadMultiplier: number;
  efficiencyMultiplier: number;
  pshMultiplier: number;
  temperatureOffset: number;
}

/**
 * Generate random variations within bounds
 */
function generateVariation(
  loadRange: [number, number],
  efficiencyRange: [number, number],
  pshRange: [number, number],
  tempRange: [number, number]
): Variation {
  return {
    loadMultiplier: loadRange[0] + Math.random() * (loadRange[1] - loadRange[0]),
    efficiencyMultiplier: efficiencyRange[0] + Math.random() * (efficiencyRange[1] - efficiencyRange[0]),
    pshMultiplier: pshRange[0] + Math.random() * (pshRange[1] - pshRange[0]),
    temperatureOffset: tempRange[0] + Math.random() * (tempRange[1] - tempRange[0]),
  };
}

/**
 * Apply variation to project
 */
function applyVariation(project: Project, variation: Variation): Project {
  const varied = JSON.parse(JSON.stringify(project)) as Project;
  
  // Vary loads
  varied.loads = varied.loads.map(load => ({
    ...load,
    watts: load.watts * variation.loadMultiplier,
  }));
  
  // Vary inverter efficiency
  varied.inverter = {
    ...varied.inverter,
    efficiencyCurve: varied.inverter.efficiencyCurve.map(point => ({
      ...point,
      eff: point.eff * variation.efficiencyMultiplier,
    })),
  };
  
  // Vary solar PSH
  varied.site = {
    ...varied.site,
    peakSunHours: {
      low: varied.site.peakSunHours.low * variation.pshMultiplier,
      typ: varied.site.peakSunHours.typ * variation.pshMultiplier,
      high: varied.site.peakSunHours.high * variation.pshMultiplier,
    },
  };
  
  return varied;
}

/**
 * Run Monte Carlo simulation
 * 
 * @param project Base project configuration
 * @param samples Number of simulations to run (default: 100)
 * @param confidence Confidence level (default: 95%)
 */
export function runMonteCarlo(
  project: Project,
  samples: number = 100,
  confidence: number = 95
): MonteCarloResult {
  // Define variation ranges (±10-20% typical)
  const loadRange: [number, number] = [0.85, 1.15]; // ±15%
  const efficiencyRange: [number, number] = [0.95, 1.05]; // ±5%
  const pshRange: [number, number] = [0.85, 1.15]; // ±15%
  const tempRange: [number, number] = [-5, 5]; // ±5°C
  
  // Run simulations
  const results: SimulationResult[] = [];
  
  for (let i = 0; i < samples; i++) {
    const variation = generateVariation(loadRange, efficiencyRange, pshRange, tempRange);
    const variedProject = applyVariation(project, variation);
    const result = runSimulation(variedProject);
    results.push(result);
  }
  
  // Sort by runtime
  results.sort((a, b) => a.continuousRuntime - b.continuousRuntime);
  
  // Calculate percentiles
  const minIndex = Math.floor((100 - confidence) / 2 / 100 * samples);
  const maxIndex = Math.floor((100 - (100 - confidence) / 2) / 100 * samples) - 1;
  const typicalIndex = Math.floor(samples / 2);
  
  return {
    min: results[minIndex],
    typical: results[typicalIndex],
    max: results[maxIndex],
    confidence,
    samples,
  };
}

/**
 * Calculate uncertainty range for a metric
 */
export function calculateUncertaintyRange(
  monteCarlo: MonteCarloResult,
  metric: keyof SimulationResult
): { min: number; typ: number; max: number } {
  return {
    min: monteCarlo.min[metric] as number,
    typ: monteCarlo.typical[metric] as number,
    max: monteCarlo.max[metric] as number,
  };
}

/**
 * Format uncertainty range for display
 */
export function formatUncertaintyRange(
  min: number,
  typ: number,
  max: number,
  unit: string = '',
  decimals: number = 1
): string {
  return `${min.toFixed(decimals)}–${max.toFixed(decimals)}${unit} (typical: ${typ.toFixed(decimals)}${unit})`;
}
