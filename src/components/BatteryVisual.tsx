import { BatteryUnit } from '../types';
import { AnimatedNumber } from './AnimatedNumber';

interface BatteryVisualProps {
  batteries: {
    unit: BatteryUnit;
    runtime: number;
    recharge: number;
    lifeYears: number;
    usableWh: number;
    costPerKwh: number;
    selected: boolean;
  }[];
  onSelect: (id: string) => void;
}

export function BatteryVisual({ batteries, onSelect }: BatteryVisualProps) {
  const maxRuntime = Math.max(...batteries.map(b => b.runtime));
  
  return (
    <div className="space-y-3">
      {batteries.map((batt, i) => {
        const barWidth = (batt.runtime / maxRuntime) * 100;
        return (
          <button
            key={batt.unit.id}
            onClick={() => onSelect(batt.unit.id)}
            className={`w-full text-left p-5 rounded-2xl transition-all ${
              batt.selected
                ? 'bg-[var(--ink)] text-[var(--paper)]'
                : 'bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--border-strong)]'
            }`}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className={`text-xs uppercase tracking-wider mb-1 ${batt.selected ? 'opacity-60' : 'text-[var(--muted)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                  {batt.unit.chemistry.toUpperCase()}
                </div>
                <div className="text-2xl font-medium num">
                  {batt.unit.ratedAh}
                  <span className={`text-sm ml-1 ${batt.selected ? 'opacity-60' : 'text-[var(--muted)]'}`}>Ah</span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xs uppercase tracking-wider mb-1 ${batt.selected ? 'opacity-60' : 'text-[var(--muted)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                  Runtime
                </div>
                <div className="text-2xl font-medium num">
                  <AnimatedNumber value={batt.runtime} decimals={1} duration={400} />
                  <span className={`text-sm ml-1 ${batt.selected ? 'opacity-60' : 'text-[var(--muted)]'}`}>h</span>
                </div>
              </div>
            </div>
            
            {/* Runtime bar */}
            <div className={`h-1.5 rounded-full overflow-hidden mb-4 ${batt.selected ? 'bg-white/10' : 'bg-[var(--border)]'}`}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${barWidth}%`,
                  background: batt.selected ? 'var(--accent)' : 'var(--ink)',
                }}
              />
            </div>
            
            {/* Stats grid */}
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <div className={`${batt.selected ? 'opacity-50' : 'text-[var(--muted)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>USABLE</div>
                <div className="num font-medium mt-0.5">{(batt.usableWh / 1000).toFixed(2)} kWh</div>
              </div>
              <div>
                <div className={`${batt.selected ? 'opacity-50' : 'text-[var(--muted)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>RECHARGE</div>
                <div className="num font-medium mt-0.5">{batt.recharge.toFixed(1)}h</div>
              </div>
              <div>
                <div className={`${batt.selected ? 'opacity-50' : 'text-[var(--muted)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>LIFE</div>
                <div className="num font-medium mt-0.5">{batt.lifeYears.toFixed(1)}y</div>
              </div>
              <div>
                <div className={`${batt.selected ? 'opacity-50' : 'text-[var(--muted)]'}`} style={{ fontFamily: 'var(--font-mono)' }}>৳/kWh</div>
                <div className="num font-medium mt-0.5">
                  {batt.costPerKwh > 0 ? batt.costPerKwh.toFixed(1) : '—'}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
