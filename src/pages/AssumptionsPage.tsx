import { Info } from 'lucide-react';

const assumptions = [
  { param: 'Inverter efficiency curve', default: '10%: 0.80 · 25%: 0.88 · 50%: 0.91 · 75%: 0.90 · 100%: 0.88', note: 'Interpolated by load fraction', verified: false },
  { param: 'Inverter idle draw', default: '30 W', note: 'Constant drain while inverting', verified: false },
  { param: 'LiFePO4 usable DoD', default: '90%', note: 'Editable', verified: false },
  { param: 'Tubular usable DoD', default: '50%', note: 'Editable up to 80% with life penalty', verified: false },
  { param: 'Peukert k (LiFePO4)', default: '1.0', note: 'No rate capacity effect', verified: false },
  { param: 'Peukert k (tubular)', default: '1.2', note: 'Capacity referenced to C10', verified: false },
  { param: 'Charge efficiency (LiFePO4)', default: '0.95', note: '', verified: false },
  { param: 'Charge efficiency (lead-acid)', default: '0.85', note: '', verified: false },
  { param: 'PV system derate', default: '0.75', note: 'Temperature, dirt, wiring, MPPT losses', verified: false },
  { param: 'Peak sun hours (Bangladesh)', default: '3.5 / 4.5 / 5.5 (low/typ/high)', note: 'Verify for your region', verified: false },
  { param: 'Copper resistivity', default: '0.0175 Ω·mm²/m', note: 'Standard value', verified: true },
  { param: 'Cell temp extremes', default: 'tMin 10°C, tCellMax 65°C', note: 'Editable', verified: false },
  { param: 'Reserve margin', default: '10%', note: 'Added on top when sizing', verified: false },
  { param: 'Area per kWp of panels', default: '7 m²', note: 'Includes spacing', verified: false },
  { param: 'Lead-acid charge taper', default: '100% up to 80% SoC, linear to 15% at 100%', note: 'Simplified model', verified: false },
  { param: 'LiFePO4 charge taper', default: '100% up to 95% SoC, linear to 30% at 100%', note: 'Simplified model', verified: false },
  { param: 'Simulation step', default: '15 minutes', note: '96 steps per day', verified: true },
  { param: 'Cable voltage drop limit', default: '2% battery, 3% PV', note: 'Critical: >5% is unsafe', verified: false },
];

export function AssumptionsPage() {
  return (
    <div className="pt-24 pb-16">
      <div className="container-narrow">
        <div className="eyebrow mb-3">Reference</div>
        <h1 className="display-lg mb-4">All assumptions</h1>
        <p className="text-base mb-10" style={{ color: 'var(--muted)', maxWidth: '52ch' }}>
          Every number in this tool comes from one of these defaults. All are editable in the planner. Items marked "default, check" are not verified from datasheets.
        </p>

        <div className="p-5 rounded-2xl mb-8 flex items-start gap-3" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
          <Info className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--info)' }} />
          <div className="text-sm" style={{ color: 'var(--ink)' }}>
            <p className="font-medium mb-1">Every number is editable</p>
            <p style={{ color: 'var(--muted)' }}>These defaults are used when you start a new project. In the planner, you can override any value. Items marked "default, check" are editable placeholders — please verify with your actual equipment datasheets.</p>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--paper-warm)' }}>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--muted)' }}>Parameter</th>
                <th className="text-left py-3 px-4 font-medium" style={{ color: 'var(--muted)' }}>Default</th>
                <th className="text-center py-3 px-4 font-medium" style={{ color: 'var(--muted)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {assumptions.map((a, i) => (
                <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-3 px-4 font-medium">{a.param}</td>
                  <td className="py-3 px-4 num" style={{ color: 'var(--muted)' }}>{a.default}</td>
                  <td className="py-3 px-4 text-center">
                    {a.verified ? (
                      <span className="badge badge-success">Verified</span>
                    ) : (
                      <span className="badge badge-warning">Default, check</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-8 p-5 rounded-2xl" style={{ background: 'var(--warning-soft)', border: '1px solid #fde68a' }}>
          <div className="eyebrow mb-2" style={{ color: 'var(--warning)' }}>Must be verified by a human</div>
          <ul className="text-sm space-y-1" style={{ color: 'var(--ink)' }}>
            <li>• Real datasheet values for inverters (SAKO E-SUN and others)</li>
            <li>• Cable ampacity table (from cited standard/local code)</li>
            <li>• Residential tariff slabs per region</li>
            <li>• Battery cycle-life tables per chemistry and manufacturer</li>
            <li>• Typical appliance wattages and surge multipliers</li>
            <li>• Peak sun hours by region/month</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
