/**
 * Unit Tests for Calculation Engine
 * 
 * Run with: npm test
 */

import { describe, it, expect } from 'vitest';
import {
  interpolateEfficiency,
  calculateContinuousRuntime,
  calculateRechargeTime,
  calculateLoadAtHour,
  calculateSurgeVA,
} from '../lib/engine/calculator';
import { batteryCatalog, defaultInverter } from '../data/catalogs';
import type { LoadItem, BatteryBank } from '../types';

describe('Calculation Engine', () => {
  describe('interpolateEfficiency', () => {
    it('should return correct efficiency at exact points', () => {
      const curve = [
        { loadFraction: 0.25, eff: 0.85 },
        { loadFraction: 0.5, eff: 0.92 },
        { loadFraction: 0.75, eff: 0.90 },
        { loadFraction: 1.0, eff: 0.88 },
      ];

      expect(interpolateEfficiency(curve, 0.25)).toBe(0.85);
      expect(interpolateEfficiency(curve, 0.5)).toBe(0.92);
      expect(interpolateEfficiency(curve, 1.0)).toBe(0.88);
    });

    it('should interpolate between points', () => {
      const curve = [
        { loadFraction: 0.25, eff: 0.85 },
        { loadFraction: 0.5, eff: 0.92 },
      ];

      const mid = interpolateEfficiency(curve, 0.375);
      expect(mid).toBeCloseTo(0.885, 3);
    });

    it('should handle edge cases', () => {
      const curve = [
        { loadFraction: 0.25, eff: 0.85 },
        { loadFraction: 1.0, eff: 0.88 },
      ];

      // Below range
      expect(interpolateEfficiency(curve, 0.1)).toBe(0.85);
      // Above range
      expect(interpolateEfficiency(curve, 1.2)).toBe(0.88);
    });
  });

  describe('calculateContinuousRuntime', () => {
    it('should calculate runtime for LiFePO4 battery', () => {
      const battery = batteryCatalog.find((b: any) => b.id === 'lifepo4-12v-100ah')!;
      const bank: BatteryBank = { unit: battery, series: 1, parallel: 1 };
      const inverter = defaultInverter;
      const loadWatts = 200;

      const runtime = calculateContinuousRuntime(bank, inverter, loadWatts);

      // Expected: ~4-5 hours for 100Ah LiFePO4 at 200W
      expect(runtime).toBeGreaterThan(3);
      expect(runtime).toBeLessThan(6);
    });

    it('should calculate runtime for tubular battery', () => {
      const battery = batteryCatalog.find((b: any) => b.id === 'tubular-12v-200ah')!;
      const bank: BatteryBank = { unit: battery, series: 1, parallel: 1 };
      const inverter = defaultInverter;
      const loadWatts = 200;

      const runtime = calculateContinuousRuntime(bank, inverter, loadWatts);

      // Expected: ~5-7 hours for 200Ah tubular at 200W
      expect(runtime).toBeGreaterThan(4);
      expect(runtime).toBeLessThan(8);
    });

    it('should return lower runtime for higher loads', () => {
      const battery = batteryCatalog.find((b: any) => b.id === 'lifepo4-12v-100ah')!;
      const bank: BatteryBank = { unit: battery, series: 1, parallel: 1 };
      const inverter = defaultInverter;

      const runtime100W = calculateContinuousRuntime(bank, inverter, 100);
      const runtime200W = calculateContinuousRuntime(bank, inverter, 200);
      const runtime400W = calculateContinuousRuntime(bank, inverter, 400);

      expect(runtime100W).toBeGreaterThan(runtime200W);
      expect(runtime200W).toBeGreaterThan(runtime400W);
    });

    it('should handle zero load', () => {
      const battery = batteryCatalog[0];
      const bank: BatteryBank = { unit: battery, series: 1, parallel: 1 };
      const inverter = defaultInverter;

      const runtime = calculateContinuousRuntime(bank, inverter, 0);

      expect(runtime).toBe(Infinity);
    });
  });

  describe('calculateRechargeTime', () => {
    it('should calculate recharge time correctly', () => {
      const battery = batteryCatalog.find((b: any) => b.id === 'lifepo4-12v-100ah')!;
      const bank: BatteryBank = { unit: battery, series: 1, parallel: 1 };
      const inverter = defaultInverter;
      const energyRemoved = 500; // Wh

      const rechargeTime = calculateRechargeTime(bank, inverter, energyRemoved, inverter.gridChargerMaxA);

      // Expected: ~1 hour for 500Wh at typical charge power
      expect(rechargeTime).toBeGreaterThan(0.5);
      expect(rechargeTime).toBeLessThan(3);
    });

    it('should account for charge efficiency', () => {
      const lifepo4 = batteryCatalog.find((b: any) => b.id === 'lifepo4-12v-100ah')!;
      const tubular = batteryCatalog.find((b: any) => b.id === 'tubular-12v-200ah')!;
      
      const bankLiFePO4: BatteryBank = { unit: lifepo4, series: 1, parallel: 1 };
      const bankTubular: BatteryBank = { unit: tubular, series: 1, parallel: 1 };
      const inverter = defaultInverter;
      const energyRemoved = 500;

      const rechargeLiFePO4 = calculateRechargeTime(bankLiFePO4, inverter, energyRemoved, inverter.gridChargerMaxA);
      const rechargeTubular = calculateRechargeTime(bankTubular, inverter, energyRemoved, inverter.gridChargerMaxA);

      // LiFePO4 (95% eff) should recharge faster than tubular (85% eff)
      expect(rechargeLiFePO4).toBeLessThan(rechargeTubular);
    });
  });

  describe('calculateLoadAtHour', () => {
    it('should calculate load at specific hour', () => {
      const loads: LoadItem[] = [
        {
          id: 'fan-1',
          label: 'Fan',
          qty: 2,
          watts: 75,
          powerFactor: 0.9,
          surgeMultiplier: 1.5,
          dutyCycle: 1,
          hourly: new Array(24).fill(1), // Always on
          onBackupCircuit: true,
          priority: 2,
          usageProfile: 'both',
        },
      ];

      const load = calculateLoadAtHour(loads, 12);

      expect(load.watts).toBe(150); // 2 × 75W
      expect(load.va).toBeCloseTo(166.67, 2); // 150 / 0.9
    });

    it('should respect hourly profile', () => {
      const loads: LoadItem[] = [
        {
          id: 'light-1',
          label: 'Light',
          qty: 1,
          watts: 10,
          powerFactor: 0.9,
          surgeMultiplier: 1,
          dutyCycle: 1,
          hourly: [
            0, 0, 0, 0, 0, 0, // 0-5: off
            0, 0, 0, 0, 0, 0, // 6-11: off
            0, 0, 0, 0, 0, 0, // 12-17: off
            1, 1, 1, 1, 1, 1, // 18-23: on
          ],
          onBackupCircuit: true,
          priority: 2,
          usageProfile: 'night',
        },
      ];

      const dayLoad = calculateLoadAtHour(loads, 12);
      const nightLoad = calculateLoadAtHour(loads, 20);

      expect(dayLoad.watts).toBe(0);
      expect(nightLoad.watts).toBe(10);
    });

    it('should exclude non-backup loads', () => {
      const loads: LoadItem[] = [
        {
          id: 'backup-1',
          label: 'Backup Load',
          qty: 1,
          watts: 100,
          powerFactor: 0.9,
          surgeMultiplier: 1,
          dutyCycle: 1,
          hourly: new Array(24).fill(1),
          onBackupCircuit: true,
          priority: 2,
          usageProfile: 'both',
        },
        {
          id: 'grid-1',
          label: 'Grid Only Load',
          qty: 1,
          watts: 200,
          powerFactor: 0.9,
          surgeMultiplier: 1,
          dutyCycle: 1,
          hourly: new Array(24).fill(1),
          onBackupCircuit: false,
          priority: 2,
          usageProfile: 'both',
        },
      ];

      const load = calculateLoadAtHour(loads, 12);

      expect(load.watts).toBe(100); // Only backup load
    });
  });

  describe('calculateSurgeVA', () => {
    it('should calculate surge VA correctly', () => {
      const loads: LoadItem[] = [
        {
          id: 'fan-1',
          label: 'Fan',
          qty: 1,
          watts: 75,
          powerFactor: 0.9,
          surgeMultiplier: 1.5,
          dutyCycle: 1,
          hourly: new Array(24).fill(1),
          onBackupCircuit: true,
          priority: 2,
          usageProfile: 'both',
        },
      ];

      const surge = calculateSurgeVA(loads, 12);

      // Running: 75W / 0.9 = 83.33 VA
      // Surge: 83.33 × 1.5 = 125 VA
      expect(surge).toBeCloseTo(125, 1);
    });

    it('should handle multiple loads with different surge multipliers', () => {
      const loads: LoadItem[] = [
        {
          id: 'fan-1',
          label: 'Fan',
          qty: 1,
          watts: 75,
          powerFactor: 0.9,
          surgeMultiplier: 1.5,
          dutyCycle: 1,
          hourly: new Array(24).fill(1),
          onBackupCircuit: true,
          priority: 2,
          usageProfile: 'both',
        },
        {
          id: 'fridge-1',
          label: 'Fridge',
          qty: 1,
          watts: 150,
          powerFactor: 0.8,
          surgeMultiplier: 5,
          dutyCycle: 1,
          hourly: new Array(24).fill(1),
          onBackupCircuit: true,
          priority: 2,
          usageProfile: 'both',
        },
      ];

      const surge = calculateSurgeVA(loads, 12);

      // Fan: 75W / 0.9 = 83.33 VA
      // Fridge: 150W / 0.8 = 187.5 VA
      // Total running: 270.83 VA
      // Fridge surge: 187.5 × 5 = 937.5 VA
      // Total surge: 270.83 + (937.5 - 187.5) = 1020.83 VA
      expect(surge).toBeCloseTo(1020.83, 1);
    });
  });
});
