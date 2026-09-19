import { Link } from 'react-router-dom';
import { ArrowLeft, Info } from 'lucide-react';

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
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="font-bold text-lg">All assumptions</h1>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">Every number is editable</p>
              <p>These are the defaults used when you start a new project. In the planner, you can override any of these values. Items marked "not verified" are editable defaults — please check your actual equipment datasheets.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold">Parameter</th>
                <th className="text-left py-3 px-4 font-semibold">Default</th>
                <th className="text-left py-3 px-4 font-semibold hidden md:table-cell">Note</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {assumptions.map((a, i) => (
                <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{a.param}</td>
                  <td className="py-3 px-4 text-gray-600">{a.default}</td>
                  <td className="py-3 px-4 text-gray-500 hidden md:table-cell">{a.note}</td>
                  <td className="py-3 px-4 text-center">
                    {a.verified ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">Verified</span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-700">Default, check</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Items that must be verified by a human</h3>
          <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
            <li>Real datasheet values for inverters (SAKO E-SUN and others)</li>
            <li>Cable ampacity table (from cited standard/local code)</li>
            <li>Residential tariff slabs per region</li>
            <li>Battery cycle-life tables per chemistry and manufacturer</li>
            <li>Typical appliance wattages and surge multipliers</li>
            <li>Peak sun hours by region/month</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
