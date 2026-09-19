import { useState } from 'react';
import { Battery, Plus, Edit2, Trash2, Check, X, Info, Zap, Thermometer, Calendar, TrendingDown, DollarSign, ChevronDown, ChevronUp, Save, Copy } from 'lucide-react';
import { BatteryUnit, Chemistry } from '../types';

interface BatteryCustomizerProps {
  selectedBattery: BatteryUnit;
  onSelect: (battery: BatteryUnit) => void;
  series: number;
  parallel: number;
  onConfigChange: (series: number, parallel: number) => void;
}

export interface CustomBattery extends BatteryUnit {
  isCustom?: boolean;
  notes?: string;
}

export function BatteryCustomizer({ 
  selectedBattery, 
  onSelect, 
  series, 
  parallel, 
  onConfigChange 
}: BatteryCustomizerProps) {
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [showBankConfig, setShowBankConfig] = useState(false);
  const [customBattery, setCustomBattery] = useState<Partial<CustomBattery>>({
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
    verified: true,
    isCustom: true,
    updatedAt: new Date().toISOString().split('T')[0],
  });

  const handleSaveCustom = () => {
    const newBattery: BatteryUnit = {
      id: `custom-${Date.now()}`,
      chemistry: customBattery.chemistry as Chemistry,
      nominalV: customBattery.nominalV || 12.8,
      ratedAh: customBattery.ratedAh || 100,
      ratedHours: customBattery.ratedHours || null,
      usableDoD: customBattery.usableDoD || 0.90,
      peukertK: customBattery.peukertK || 1.0,
      maxChargeC: customBattery.maxChargeC || 1.0,
      maxChargeA: customBattery.maxChargeA || null,
      maxDischargeA: customBattery.maxDischargeA || null,
      chargeEfficiency: customBattery.chargeEfficiency || 0.95,
      cycleLife: customBattery.cycleLife || [],
      calendarLifeYears: customBattery.calendarLifeYears || { low: 8, typ: 10, high: 15 },
      weightKg: customBattery.weightKg,
      price: customBattery.price,
      verified: true,
      source: 'User-defined from datasheet',
      updatedAt: new Date().toISOString().split('T')[0],
    };
    onSelect(newBattery);
    setShowCustomForm(false);
  };

  const totalVoltage = selectedBattery.nominalV * series;
  const totalCapacity = selectedBattery.ratedAh * parallel;
  const totalEnergy = totalVoltage * totalCapacity;
  const usableEnergy = totalEnergy * selectedBattery.usableDoD;

  return (
    <div className="space-y-4">
      {/* Battery Selection */}
      <div className="rounded-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Battery className="w-5 h-5" style={{ color: 'var(--success)' }} />
              <h3 className="font-semibold">Select Battery</h3>
            </div>
            <button
              onClick={() => setShowCustomForm(!showCustomForm)}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Custom battery
            </button>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>
            Choose from presets or enter exact specs from your datasheet
          </p>
        </div>

        {/* Preset Batteries */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { id: 'lifepo4-12v-100ah', label: 'LiFePO4 100Ah', v: 12.8, ah: 100, price: 32000, color: '#10b981' },
            { id: 'lifepo4-12v-150ah', label: 'LiFePO4 150Ah', v: 12.8, ah: 150, price: 48000, color: '#10b981' },
            { id: 'lifepo4-12v-200ah', label: 'LiFePO4 200Ah', v: 12.8, ah: 200, price: 62000, color: '#10b981' },
            { id: 'tubular-12v-200ah', label: 'Tubular 200Ah', v: 12, ah: 200, price: 18000, color: '#3b82f6' },
          ].map(batt => (
            <button
              key={batt.id}
              onClick={() => {
                const found = [
                  { id: 'lifepo4-12v-100ah', chemistry: 'lifepo4' as Chemistry, nominalV: 12.8, ratedAh: 100, usableDoD: 0.90, peukertK: 1.0, maxChargeC: 1.0, maxChargeA: 100, maxDischargeA: 100, chargeEfficiency: 0.95, cycleLife: [{ dod: 0.2, cycles: { low: 4000, typ: 5000, high: 6000 } }, { dod: 0.5, cycles: { low: 3000, typ: 4000, high: 5000 } }, { dod: 0.8, cycles: { low: 2000, typ: 3000, high: 4000 } }, { dod: 1.0, cycles: { low: 1500, typ: 2000, high: 3000 } }], calendarLifeYears: { low: 8, typ: 10, high: 15 }, weightKg: 12, price: 32000, verified: false, updatedAt: '2024-01-01' },
                  { id: 'lifepo4-12v-150ah', chemistry: 'lifepo4' as Chemistry, nominalV: 12.8, ratedAh: 150, usableDoD: 0.90, peukertK: 1.0, maxChargeC: 1.0, maxChargeA: 150, maxDischargeA: 150, chargeEfficiency: 0.95, cycleLife: [{ dod: 0.2, cycles: { low: 4000, typ: 5000, high: 6000 } }, { dod: 0.5, cycles: { low: 3000, typ: 4000, high: 5000 } }, { dod: 0.8, cycles: { low: 2000, typ: 3000, high: 4000 } }, { dod: 1.0, cycles: { low: 1500, typ: 2000, high: 3000 } }], calendarLifeYears: { low: 8, typ: 10, high: 15 }, weightKg: 17, price: 48000, verified: false, updatedAt: '2024-01-01' },
                  { id: 'lifepo4-12v-200ah', chemistry: 'lifepo4' as Chemistry, nominalV: 12.8, ratedAh: 200, usableDoD: 0.90, peukertK: 1.0, maxChargeC: 1.0, maxChargeA: 200, maxDischargeA: 200, chargeEfficiency: 0.95, cycleLife: [{ dod: 0.2, cycles: { low: 4000, typ: 5000, high: 6000 } }, { dod: 0.5, cycles: { low: 3000, typ: 4000, high: 5000 } }, { dod: 0.8, cycles: { low: 2000, typ: 3000, high: 4000 } }, { dod: 1.0, cycles: { low: 1500, typ: 2000, high: 3000 } }], calendarLifeYears: { low: 8, typ: 10, high: 15 }, weightKg: 23, price: 62000, verified: false, updatedAt: '2024-01-01' },
                  { id: 'tubular-12v-200ah', chemistry: 'tubular' as Chemistry, nominalV: 12, ratedAh: 200, ratedHours: 10 as const, usableDoD: 0.50, peukertK: 1.2, maxChargeC: 0.2, maxChargeA: 40, maxDischargeA: null, chargeEfficiency: 0.85, cycleLife: [{ dod: 0.2, cycles: { low: 1200, typ: 1500, high: 1800 } }, { dod: 0.5, cycles: { low: 700, typ: 1000, high: 1200 } }, { dod: 0.8, cycles: { low: 350, typ: 500, high: 700 } }, { dod: 1.0, cycles: { low: 200, typ: 300, high: 400 } }], calendarLifeYears: { low: 3, typ: 5, high: 7 }, weightKg: 55, price: 18000, verified: false, updatedAt: '2024-01-01' },
                ].find(b => b.id === batt.id);
                if (found) onSelect(found as BatteryUnit);
              }}
              className={`p-4 rounded-xl text-left transition-all ${
                selectedBattery.id === batt.id 
                  ? 'ring-2' 
                  : 'hover:shadow-md'
              }`}
              style={{
                border: `2px solid ${selectedBattery.id === batt.id ? batt.color : 'var(--border)'}`,
                background: selectedBattery.id === batt.id ? `${batt.color}10` : 'var(--surface)',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold text-sm">{batt.label}</div>
                {selectedBattery.id === batt.id && (
                  <Check className="w-4 h-4" style={{ color: batt.color }} />
                )}
              </div>
              <div className="text-xs space-y-1" style={{ color: 'var(--muted)' }}>
                <div className="flex justify-between">
                  <span>Voltage:</span>
                  <span className="num font-medium" style={{ color: 'var(--ink)' }}>{batt.v}V</span>
                </div>
                <div className="flex justify-between">
                  <span>Capacity:</span>
                  <span className="num font-medium" style={{ color: 'var(--ink)' }}>{batt.ah}Ah</span>
                </div>
                <div className="flex justify-between">
                  <span>Energy:</span>
                  <span className="num font-medium" style={{ color: 'var(--ink)' }}>{((batt.v * batt.ah) / 1000).toFixed(2)} kWh</span>
                </div>
              </div>
              <div className="mt-2 text-xs num font-semibold" style={{ color: batt.color }}>
                ৳{batt.price.toLocaleString()}
              </div>
            </button>
          ))}
        </div>

        {/* Custom Battery Form */}
        {showCustomForm && (
          <div className="p-5 border-t bg-[var(--paper-warm)]" style={{ borderColor: 'var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4" />
                Custom Battery from Datasheet
              </h4>
              <button onClick={() => setShowCustomForm(false)} className="btn-ghost text-xs">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Chemistry</label>
                <select
                  value={customBattery.chemistry}
                  onChange={e => setCustomBattery({ ...customBattery, chemistry: e.target.value as Chemistry })}
                  className="input text-sm"
                >
                  <option value="lifepo4">LiFePO4</option>
                  <option value="tubular">Tubular Lead-Acid</option>
                  <option value="flooded">Flooded Lead-Acid</option>
                  <option value="agm_gel">AGM/Gel</option>
                  <option value="nmc">NMC Lithium</option>
                  <option value="lto">LTO Lithium</option>
                </select>
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Nominal Voltage (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customBattery.nominalV}
                  onChange={e => setCustomBattery({ ...customBattery, nominalV: +e.target.value })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Rated Capacity (Ah)</label>
                <input
                  type="number"
                  value={customBattery.ratedAh}
                  onChange={e => setCustomBattery({ ...customBattery, ratedAh: +e.target.value })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Usable DoD (%)</label>
                <input
                  type="number"
                  min={10}
                  max={100}
                  value={(customBattery.usableDoD || 0.9) * 100}
                  onChange={e => setCustomBattery({ ...customBattery, usableDoD: +e.target.value / 100 })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Max Charge Current (A)</label>
                <input
                  type="number"
                  value={customBattery.maxChargeA || ''}
                  onChange={e => setCustomBattery({ ...customBattery, maxChargeA: +e.target.value })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Max Discharge Current (A)</label>
                <input
                  type="number"
                  value={customBattery.maxDischargeA || ''}
                  onChange={e => setCustomBattery({ ...customBattery, maxDischargeA: +e.target.value })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Charge Efficiency (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={(customBattery.chargeEfficiency || 0.95) * 100}
                  onChange={e => setCustomBattery({ ...customBattery, chargeEfficiency: +e.target.value / 100 })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  value={customBattery.weightKg}
                  onChange={e => setCustomBattery({ ...customBattery, weightKg: +e.target.value })}
                  className="input input-mono text-sm"
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Price (৳)</label>
                <input
                  type="number"
                  value={customBattery.price}
                  onChange={e => setCustomBattery({ ...customBattery, price: +e.target.value })}
                  className="input input-mono text-sm"
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                <Info className="w-3 h-3 inline mr-1" />
                Enter exact values from your battery datasheet
              </div>
              <button onClick={handleSaveCustom} className="btn-primary text-xs">
                <Save className="w-3 h-3" />
                Save custom battery
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Battery Bank Configuration */}
      <div className="rounded-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
        <button
          onClick={() => setShowBankConfig(!showBankConfig)}
          className="w-full p-5 flex items-center justify-between hover:bg-[var(--paper-warm)] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--success-soft)' }}>
              <Zap className="w-5 h-5" style={{ color: 'var(--success)' }} />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Battery bank configuration</div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>
                {series}S{parallel}P · {totalVoltage}V · {totalCapacity}Ah · {(totalEnergy / 1000).toFixed(2)} kWh
              </div>
            </div>
          </div>
          {showBankConfig ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>

        {showBankConfig && (
          <div className="p-5 border-t space-y-4" style={{ borderColor: 'var(--border)' }}>
            {/* Series/Parallel Controls */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium mb-2 block">Series count</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onConfigChange(Math.max(1, series - 1), parallel)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--paper-warm)]"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold num">{series}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>batteries in series</div>
                  </div>
                  <button
                    onClick={() => onConfigChange(series + 1, parallel)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--paper-warm)]"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 text-xs text-center" style={{ color: 'var(--muted)' }}>
                  Total voltage: <span className="num font-semibold" style={{ color: 'var(--ink)' }}>{totalVoltage}V</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium mb-2 block">Parallel strings</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onConfigChange(series, Math.max(1, parallel - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--paper-warm)]"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <div className="text-2xl font-bold num">{parallel}</div>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>parallel strings</div>
                  </div>
                  <button
                    onClick={() => onConfigChange(series, parallel + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--paper-warm)]"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    +
                  </button>
                </div>
                <div className="mt-2 text-xs text-center" style={{ color: 'var(--muted)' }}>
                  Total capacity: <span className="num font-semibold" style={{ color: 'var(--ink)' }}>{totalCapacity}Ah</span>
                </div>
              </div>
            </div>

            {/* Visual Bank Diagram */}
            <div className="p-4 rounded-xl" style={{ background: 'var(--paper-warm)' }}>
              <div className="text-xs font-medium mb-3">Battery bank layout</div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: parallel }).map((_, p) => (
                  <div key={p} className="flex flex-col gap-1">
                    <div className="text-[10px] text-center" style={{ color: 'var(--muted)' }}>String {p + 1}</div>
                    {Array.from({ length: series }).map((_, s) => (
                      <div
                        key={s}
                        className="w-12 h-8 rounded flex items-center justify-center text-[10px] num font-medium"
                        style={{
                          background: 'var(--surface)',
                          border: '1px solid var(--border)',
                          color: 'var(--ink)',
                        }}
                      >
                        {selectedBattery.nominalV}V
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Total Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Voltage</div>
                <div className="text-lg font-bold num">{totalVoltage}V</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Capacity</div>
                <div className="text-lg font-bold num">{totalCapacity}Ah</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
                <div className="text-xs" style={{ color: 'var(--muted)' }}>Total Energy</div>
                <div className="text-lg font-bold num">{(totalEnergy / 1000).toFixed(2)} kWh</div>
              </div>
              <div className="p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
                <div className="text-xs" style={{ color: 'var(--success)' }}>Usable Energy</div>
                <div className="text-lg font-bold num" style={{ color: 'var(--success)' }}>{(usableEnergy / 1000).toFixed(2)} kWh</div>
              </div>
            </div>

            {/* Cost Summary */}
            {selectedBattery.price && (
              <div className="p-4 rounded-xl flex items-center justify-between" style={{ background: 'var(--paper-warm)' }}>
                <div>
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Total battery cost</div>
                  <div className="text-xl font-bold num">৳{(selectedBattery.price * series * parallel).toLocaleString()}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs" style={{ color: 'var(--muted)' }}>Total weight</div>
                  <div className="text-lg font-bold num">{((selectedBattery.weightKg || 0) * series * parallel).toFixed(1)} kg</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
