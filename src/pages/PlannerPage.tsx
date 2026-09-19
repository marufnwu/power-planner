import { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Zap, Sun, Battery, AlertTriangle, Share2, Printer, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Project, LoadItem, SimulationResult, Warning, BatteryUnit } from '../types';
import { createDefaultProject, decodeProject, encodeProject, getShareUrl } from '../lib/state';
import { runSimulation, calculateContinuousRuntime, calculateSizing, calculateCosts, calculateLoadAtHour } from '../lib/engine/calculator';
import { applianceTemplates, batteryCatalog, defaultPvPanel } from '../data/catalogs';

type PlannerStep = 'loads' | 'grid' | 'system' | 'results' | 'costs';

export function PlannerPage() {
  const [searchParams] = useSearchParams();
  const [project, setProject] = useState<Project>(() => {
    const encoded = searchParams.get('s');
    if (encoded) {
      const decoded = decodeProject(encoded);
      if (decoded) return decoded;
    }
    return createDefaultProject();
  });
  const [step, setStep] = useState<PlannerStep>('loads');
  const [showMath, setShowMath] = useState(false);
  const [detailLevel, setDetailLevel] = useState<'simple' | 'detailed'>('simple');
  const [showShareToast, setShowShareToast] = useState(false);

  // Run simulation
  const result = useMemo(() => runSimulation(project, project.options.assumptionSet), [project]);
  const sizing = useMemo(() => calculateSizing(project), [project]);
  const costs = useMemo(() => calculateCosts(project, result), [project, result]);

  // Update URL when project changes
  const updateUrl = useCallback(() => {
    const encoded = encodeProject(project);
    const newUrl = `${window.location.pathname}?s=${encoded}&v=1`;
    window.history.replaceState(null, '', newUrl);
  }, [project]);

  useEffect(() => {
    const timer = setTimeout(updateUrl, 500);
    return () => clearTimeout(timer);
  }, [project, updateUrl]);

  const shareUrl = () => {
    const url = getShareUrl(project);
    navigator.clipboard.writeText(url).then(() => {
      setShowShareToast(true);
      setTimeout(() => setShowShareToast(false), 2000);
    });
  };

  const updateLoad = (id: string, updates: Partial<LoadItem>) => {
    setProject(p => ({
      ...p,
      loads: p.loads.map(l => l.id === id ? { ...l, ...updates } : l),
    }));
  };

  const addLoad = (templateId: string) => {
    const tmpl = applianceTemplates.find(t => t.id === templateId);
    if (!tmpl) return;
    const newLoad: LoadItem = {
      id: `load-${Date.now()}`,
      templateId: tmpl.id,
      label: tmpl.name,
      qty: 1,
      watts: tmpl.watts,
      powerFactor: tmpl.powerFactor,
      surgeMultiplier: tmpl.surgeMultiplier,
      dutyCycle: tmpl.dutyCycle,
      hourly: new Array(24).fill(0.5),
      onBackupCircuit: true,
      priority: 2,
    };
    setProject(p => ({ ...p, loads: [...p.loads, newLoad] }));
  };

  const removeLoad = (id: string) => {
    setProject(p => ({ ...p, loads: p.loads.filter(l => l.id !== id) }));
  };

  const steps: PlannerStep[] = ['loads', 'grid', 'system', 'results', 'costs'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm hidden sm:inline">Home</span>
          </Link>
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            <span className="font-bold">Power Planner</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareUrl} className="p-2 text-gray-500 hover:text-gray-700" title="Share">
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={() => window.print()} className="p-2 text-gray-500 hover:text-gray-700" title="Print">
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>
        {/* Step tabs */}
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div className="flex gap-1 overflow-x-auto">
            {steps.map((s, i) => (
              <button
                key={s}
                onClick={() => setStep(s)}
                className={`px-3 py-1.5 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                  step === s ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {s === 'loads' ? '① Loads' : s === 'grid' ? '② Grid' : s === 'system' ? '③ System' : s === 'results' ? '④ Results' : '⑤ Costs'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Sticky summary bar on mobile */}
      <div className="md:hidden sticky top-[104px] z-40 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between text-xs">
        <span className="font-medium">{project.inverter.ratedVA}VA · {project.bank.unit.ratedAh}Ah {project.bank.unit.chemistry}</span>
        <span className="text-amber-600 font-bold">{result.continuousRuntime.toFixed(1)}h runtime</span>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Simple/Detailed toggle */}
        <div className="flex justify-end mb-4">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setDetailLevel('simple')}
              className={`px-3 py-1 text-xs rounded-md ${detailLevel === 'simple' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Simple
            </button>
            <button
              onClick={() => setDetailLevel('detailed')}
              className={`px-3 py-1 text-xs rounded-md ${detailLevel === 'detailed' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
            >
              Detailed
            </button>
          </div>
        </div>

        {/* Step content */}
        {step === 'loads' && (
          <LoadsStep
            project={project}
            setProject={setProject}
            updateLoad={updateLoad}
            addLoad={addLoad}
            removeLoad={removeLoad}
            onNext={() => setStep('grid')}
          />
        )}
        {step === 'grid' && (
          <GridStep project={project} setProject={setProject} onNext={() => setStep('system')} onPrev={() => setStep('loads')} />
        )}
        {step === 'system' && (
          <SystemStep project={project} setProject={setProject} sizing={sizing} onNext={() => setStep('results')} onPrev={() => setStep('grid')} />
        )}
        {step === 'results' && (
          <ResultsStep
            project={project}
            result={result}
            sizing={sizing}
            detailLevel={detailLevel}
            showMath={showMath}
            setShowMath={setShowMath}
            onNext={() => setStep('costs')}
            onPrev={() => setStep('system')}
          />
        )}
        {step === 'costs' && (
          <CostsStep
            project={project}
            result={result}
            costs={costs}
            onPrev={() => setStep('results')}
          />
        )}

        {/* Navigation */}
        {step !== 'costs' && (
          <div className="flex justify-between mt-6">
            {currentIdx > 0 && (
              <button
                onClick={() => setStep(steps[currentIdx - 1])}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                ← Back
              </button>
            )}
            <div className="flex-1" />
            <button
              onClick={() => setStep(steps[currentIdx + 1])}
              className="px-6 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600"
            >
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Share toast */}
      {showShareToast && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg z-50 text-sm">
          Link copied to clipboard!
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOADS STEP
// ============================================================
function LoadsStep({ project, updateLoad, addLoad, removeLoad, onNext }: {
  project: Project;
  setProject: (fn: (p: Project) => Project) => void;
  updateLoad: (id: string, updates: Partial<LoadItem>) => void;
  addLoad: (templateId: string) => void;
  removeLoad: (id: string) => void;
  onNext: () => void;
}) {
  const totalW = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + l.qty * l.watts * l.dutyCycle, 0);
  const totalVA = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + (l.qty * l.watts * l.dutyCycle) / l.powerFactor, 0);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-1">Your loads</h2>
        <p className="text-sm text-gray-500 mb-4">Add appliances that need backup power. All values are editable defaults — check your actual equipment.</p>
        
        {/* Summary bar */}
        <div className="flex flex-wrap gap-4 mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div><span className="text-gray-500">Total:</span> <span className="font-bold">{totalW.toFixed(0)} W</span></div>
          <div><span className="text-gray-500">Apparent:</span> <span className="font-bold">{totalVA.toFixed(0)} VA</span></div>
          <div><span className="text-gray-500">Items:</span> <span className="font-bold">{project.loads.length}</span></div>
        </div>

        {/* Load list */}
        <div className="space-y-3">
          {project.loads.map(load => (
            <LoadRow key={load.id} load={load} onUpdate={(updates) => updateLoad(load.id, updates)} onRemove={() => removeLoad(load.id)} />
          ))}
        </div>

        {/* Add load */}
        <div className="mt-4">
          <details className="group">
            <summary className="cursor-pointer text-sm text-amber-600 font-medium flex items-center gap-1">
              <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
              Add an appliance
            </summary>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {applianceTemplates.map(tmpl => (
                <button
                  key={tmpl.id}
                  onClick={() => addLoad(tmpl.id)}
                  className={`p-2 text-xs rounded-lg border text-left transition-colors hover:border-amber-400 ${
                    tmpl.inverterFriendly === 'avoid' ? 'border-red-200 bg-red-50' :
                    tmpl.inverterFriendly === 'caution' ? 'border-yellow-200 bg-yellow-50' :
                    'border-gray-200'
                  }`}
                >
                  <div className="font-medium">{tmpl.name}</div>
                  <div className="text-gray-500">{tmpl.watts}W</div>
                </button>
              ))}
            </div>
          </details>
        </div>
      </div>

      <UnverifiedBadge />
    </div>
  );
}

function LoadRow({ load, onUpdate, onRemove }: { load: LoadItem; onUpdate: (u: Partial<LoadItem>) => void; onRemove: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-50 rounded-lg">
      <div className="flex-1 min-w-[120px]">
        <input
          value={load.label}
          onChange={e => onUpdate({ label: e.target.value })}
          className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-amber-400 outline-none w-full"
        />
        {load.templateId && (
          <div className="text-xs text-gray-400">
            {applianceTemplates.find(t => t.id === load.templateId)?.inverterFriendly === 'avoid' && (
              <span className="text-red-500 font-medium">⚠ Not inverter-friendly</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-500 text-xs">Qty</label>
        <input
          type="number" min={1} max={20} value={load.qty}
          onChange={e => onUpdate({ qty: Math.max(1, +e.target.value) })}
          className="w-12 px-1 py-0.5 border border-gray-300 rounded text-center"
        />
        <label className="text-gray-500 text-xs">W</label>
        <input
          type="number" min={1} value={load.watts}
          onChange={e => onUpdate({ watts: Math.max(1, +e.target.value) })}
          className="w-16 px-1 py-0.5 border border-gray-300 rounded text-center"
        />
      </div>
      <label className="flex items-center gap-1 text-xs cursor-pointer">
        <input
          type="checkbox" checked={load.onBackupCircuit}
          onChange={e => onUpdate({ onBackupCircuit: e.target.checked })}
          className="w-3.5 h-3.5 rounded"
        />
        <span className="text-gray-600">Backup</span>
      </label>
      <button onClick={onRemove} className="text-gray-400 hover:text-red-500 text-sm px-1" title="Remove">×</button>
    </div>
  );
}

// ============================================================
// GRID STEP
// ============================================================
function GridStep({ project, setProject, onNext, onPrev }: {
  project: Project;
  setProject: (fn: (p: Project) => Project) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-1">Grid & load-shedding pattern</h2>
        <p className="text-sm text-gray-500 mb-4">How often is power cut, and for how long?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Outage duration (minutes)</label>
            <input
              type="range" min={15} max={300} step={15}
              value={project.grid.outageMinutes}
              onChange={e => setProject(p => ({ ...p, grid: { ...p.grid, outageMinutes: +e.target.value } }))}
              className="w-full"
            />
            <div className="text-center text-lg font-bold text-amber-600">{project.grid.outageMinutes} min</div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Grid time between outages (minutes)</label>
            <input
              type="range" min={30} max={480} step={15}
              value={project.grid.gridMinutes}
              onChange={e => setProject(p => ({ ...p, grid: { ...p.grid, gridMinutes: +e.target.value } }))}
              className="w-full"
            />
            <div className="text-center text-lg font-bold text-green-600">{project.grid.gridMinutes} min</div>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium mb-2">Operating mode</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {[
              { value: 'ips', label: 'IPS', desc: 'Grid charges battery' },
              { value: 'utility_first', label: 'Utility First', desc: 'Grid powers load, PV charges' },
              { value: 'solar_first', label: 'Solar First', desc: 'PV → load → grid' },
              { value: 'sbu', label: 'SBU', desc: 'Solar → Battery → Utility' },
            ].map(mode => (
              <button
                key={mode.value}
                onClick={() => setProject(p => ({ ...p, options: { ...p.options, mode: mode.value as any } }))}
                className={`p-3 rounded-lg border text-left text-xs ${
                  project.options.mode === mode.value ? 'border-amber-400 bg-amber-50' : 'border-gray-200'
                }`}
              >
                <div className="font-semibold">{mode.label}</div>
                <div className="text-gray-500">{mode.desc}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <UnverifiedBadge />
    </div>
  );
}

// ============================================================
// SYSTEM STEP
// ============================================================
function SystemStep({ project, setProject, sizing, onNext, onPrev }: {
  project: Project;
  setProject: (fn: (p: Project) => Project) => void;
  sizing: ReturnType<typeof calculateSizing>;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Inverter */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-1">Inverter</h2>
        <p className="text-sm text-gray-500 mb-4">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
            <Info className="w-3 h-3" /> Default, please check your datasheet
          </span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-gray-500">Rated VA</label>
            <input
              type="number" value={project.inverter.ratedVA}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, ratedVA: +e.target.value } }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Rated W</label>
            <input
              type="number" value={project.inverter.ratedW}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, ratedW: +e.target.value } }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">System Voltage</label>
            <select
              value={project.inverter.systemVoltage}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, systemVoltage: +e.target.value as 12|24|48 } }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            >
              <option value={12}>12V</option>
              <option value={24}>24V</option>
              <option value={48}>48V</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500">Idle draw (W)</label>
            <input
              type="number" value={project.inverter.idleW}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, idleW: +e.target.value } }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Sizing suggests: <strong>{sizing.recommendedVA} VA</strong> minimum, {sizing.systemVoltage}V system
        </div>
      </div>

      {/* Battery */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-1">Battery</h2>
        <p className="text-sm text-gray-500 mb-4">Select battery type and configuration</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {batteryCatalog.map(batt => (
            <button
              key={batt.id}
              onClick={() => setProject(p => ({ ...p, bank: { ...p.bank, unit: batt, series: Math.ceil(p.inverter.systemVoltage / batt.nominalV) } }))}
              className={`p-4 rounded-lg border text-left transition-colors ${
                project.bank.unit.id === batt.id ? 'border-amber-400 bg-amber-50' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Battery className="w-4 h-4 text-gray-500" />
                <span className="font-semibold text-sm">{batt.ratedAh}Ah {batt.chemistry.toUpperCase()}</span>
              </div>
              <div className="text-xs text-gray-500">
                {batt.nominalV}V · DoD {(batt.usableDoD * 100).toFixed(0)}% · {(batt.nominalV * batt.ratedAh * batt.usableDoD).toFixed(0)} Wh usable
              </div>
              {batt.price && <div className="text-xs text-amber-600 mt-1">~৳{batt.price.toLocaleString()}</div>}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-500">Series (for system voltage)</label>
            <input
              type="number" min={1} max={4} value={project.bank.series}
              onChange={e => setProject(p => ({ ...p, bank: { ...p.bank, series: Math.max(1, +e.target.value) } }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500">Parallel strings</label>
            <input
              type="number" min={1} max={6} value={project.bank.parallel}
              onChange={e => setProject(p => ({ ...p, bank: { ...p.bank, parallel: Math.max(1, +e.target.value) } }))}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
            />
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Bank: {project.bank.unit.nominalV * project.bank.series}V × {project.bank.unit.ratedAh * project.bank.parallel}Ah = {(project.bank.unit.nominalV * project.bank.series * project.bank.unit.ratedAh * project.bank.parallel / 1000).toFixed(2)} kWh total
        </div>
      </div>

      {/* Solar (optional) */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Solar panels (optional)</h2>
            <p className="text-sm text-gray-500">Add panels for backup recharge or bill savings</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!project.pv}
              onChange={e => {
                if (e.target.checked) {
                  setProject(p => ({ ...p, pv: { panel: defaultPvPanel, series: 2, parallelStrings: 1 } }));
                } else {
                  setProject(p => { const { pv, ...rest } = p; return rest as Project; });
                }
              }}
              className="w-5 h-5 rounded border-gray-300 text-amber-500"
            />
            <span className="text-sm font-medium">Enable solar</span>
          </label>
        </div>
        
        {project.pv && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-gray-500">Panel Wp</label>
                <input
                  type="number" value={project.pv.panel.wp}
                  onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, panel: { ...p.pv.panel, wp: +e.target.value } } : p.pv }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Panels in series</label>
                <input
                  type="number" min={1} max={6} value={project.pv.series}
                  onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, series: Math.max(1, +e.target.value) } : p.pv }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Parallel strings</label>
                <input
                  type="number" min={1} max={4} value={project.pv.parallelStrings}
                  onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, parallelStrings: Math.max(1, +e.target.value) } : p.pv }))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">Total Wp</label>
                <div className="px-2 py-1 bg-gray-50 rounded text-sm font-medium">
                  {project.pv.panel.wp * project.pv.series * project.pv.parallelStrings} Wp
                </div>
              </div>
            </div>
            <div className="text-xs text-gray-500">
              Peak sun hours: {project.site.peakSunHours.low}–{project.site.peakSunHours.high} (typical: {project.site.peakSunHours.typ}h) · Derate: {(project.site.systemDerate * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      <UnverifiedBadge />
    </div>
  );
}

// ============================================================
// RESULTS STEP
// ============================================================
function ResultsStep({ project, result, sizing, detailLevel, showMath, setShowMath, onNext, onPrev }: {
  project: Project;
  result: SimulationResult;
  sizing: ReturnType<typeof calculateSizing>;
  detailLevel: 'simple' | 'detailed';
  showMath: boolean;
  setShowMath: (v: boolean) => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  const totalLoadW = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + l.qty * l.watts * l.dutyCycle * 0.5, 0);
  
  // Chart data
  const chartData = result.timeSeries.filter((_, i) => i % 4 === 0).map(t => ({
    time: `${Math.floor(t.t / 60)}:${(t.t % 60).toString().padStart(2, '0')}`,
    soc: Math.round(t.soc * 10) / 10,
    load: Math.round(t.loadW),
    pv: Math.round(t.pvW),
    grid: t.gridAvailable ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      {/* Summary card */}
      <div className="bg-gradient-to-r from-amber-50 to-blue-50 rounded-xl border border-amber-200 p-6">
        <h2 className="text-lg font-bold mb-2">Summary</h2>
        <p className="text-sm text-gray-700">
          Your <strong>{project.inverter.ratedVA}VA</strong> system with <strong>{project.bank.unit.ratedAh}Ah {project.bank.unit.chemistry}</strong> battery
          runs your <strong>{totalLoadW.toFixed(0)}W</strong> average load for about{' '}
          <strong className="text-amber-700">{result.continuousRuntime.toFixed(1)} hours</strong>.
          {result.recoveryStatus === 'yes' && ' It recovers fully between outages.'}
          {result.recoveryStatus === 'barely' && ' It barely recovers between outages — consider more battery or solar.'}
          {result.recoveryStatus === 'no' && ' It does NOT recover between outages — battery will deplete over time.'}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Runtime" value={`${result.continuousRuntime.toFixed(1)}h`} sub="continuous at avg load" color="amber" />
        <KpiCard label="Recharge time" value={`${result.closedFormRecharge.toFixed(1)}h`} sub={`grid window: ${project.grid.gridMinutes / 60}h`} color={result.recoveryStatus === 'no' ? 'red' : 'green'} />
        <KpiCard label="Min SoC" value={`${result.minSoC.toFixed(0)}%`} sub={`at ${Math.floor(result.minSoCTime / 60)}h${result.minSoCTime % 60}m`} color={result.minSoC < 20 ? 'red' : 'blue'} />
        <KpiCard label="Unserved" value={`${(result.unservedWh / 1000).toFixed(2)} kWh`} sub="per day" color={result.unservedWh > 0 ? 'red' : 'green'} />
      </div>

      {/* SoC Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-sm mb-3">Battery State of Charge</h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="time" tick={{ fontSize: 10 }} interval={Math.floor(chartData.length / 6)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
              <Tooltip formatter={(value: number, name: string) => [`${value}%`, 'SoC']} />
              <ReferenceLine y={20} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min', position: 'right', fontSize: 10 }} />
              <Area type="monotone" dataKey="soc" stroke="#f59e0b" fill="#fef3c7" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {detailLevel === 'detailed' && `Simulation: ${project.options.simulationDays} days · 15-min steps · ${project.options.assumptionSet} assumptions`}
        </p>
      </div>

      {/* Battery comparison table */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="font-bold text-sm mb-3">Battery comparison</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 pr-2">Battery</th>
                <th className="text-right py-2 px-2">Usable Wh</th>
                <th className="text-right py-2 px-2">Runtime</th>
                <th className="text-right py-2 px-2">Recharge</th>
                {detailLevel === 'detailed' && (
                  <>
                    <th className="text-right py-2 px-2">Weight</th>
                    <th className="text-right py-2 px-2">Price</th>
                    <th className="text-right py-2 px-2">৳/kWh</th>
                  </>
                )}
                <th className="text-right py-2 pl-2">Life</th>
              </tr>
            </thead>
            <tbody>
              {batteryCatalog.map(batt => {
                const bank = { unit: batt, series: Math.ceil(project.inverter.systemVoltage / batt.nominalV), parallel: 1 };
                const runtime = calculateContinuousRuntime(bank, project.inverter, totalLoadW);
                const eNom = batt.nominalV * batt.ratedAh * batt.usableDoD;
                const energyRemoved = eNom * result.avgDoD;
                const recharge = energyRemoved > 0 ? energyRemoved / (Math.min(project.inverter.gridChargerMaxA, batt.maxChargeC * batt.ratedAh) * batt.nominalV * batt.chargeEfficiency) : 0;
                const cycleAtDoD = interpolateCycleLife(batt, result.avgDoD);
                const cyclesPerYear = result.cyclesPerDay * 365;
                const lifeYears = cyclesPerYear > 0 ? Math.min(cycleAtDoD / cyclesPerYear, batt.calendarLifeYears.typ) : batt.calendarLifeYears.typ;
                const costPerKwh = batt.price && cycleAtDoD > 0 ? batt.price / ((eNom / 1000) * cycleAtDoD) : 0;
                
                return (
                  <tr key={batt.id} className={`border-b border-gray-100 ${batt.id === project.bank.unit.id ? 'bg-amber-50' : ''}`}>
                    <td className="py-2 pr-2 font-medium">{batt.ratedAh}Ah {batt.chemistry}</td>
                    <td className="text-right py-2 px-2">{eNom.toFixed(0)}</td>
                    <td className="text-right py-2 px-2 font-medium">{runtime.toFixed(1)}h</td>
                    <td className="text-right py-2 px-2">{recharge.toFixed(1)}h</td>
                    {detailLevel === 'detailed' && (
                      <>
                        <td className="text-right py-2 px-2">{batt.weightKg || '–'}kg</td>
                        <td className="text-right py-2 px-2">৳{(batt.price || 0).toLocaleString()}</td>
                        <td className="text-right py-2 px-2">৳{costPerKwh.toFixed(1)}</td>
                      </>
                    )}
                    <td className="text-right py-2 pl-2">{lifeYears.toFixed(1)}y</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            What to watch out for
          </h3>
          <div className="space-y-2">
            {result.warnings.sort((a, b) => {
              const order = { critical: 0, warn: 1, info: 2 };
              return order[a.severity] - order[b.severity];
            }).map((w, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm ${
                w.severity === 'critical' ? 'bg-red-50 border border-red-200' :
                w.severity === 'warn' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-blue-50 border border-blue-200'
              }`}>
                <div className="flex items-start gap-2">
                  <span className={`font-bold text-xs px-1.5 py-0.5 rounded ${
                    w.severity === 'critical' ? 'bg-red-200 text-red-800' :
                    w.severity === 'warn' ? 'bg-yellow-200 text-yellow-800' :
                    'bg-blue-200 text-blue-800'
                  }`}>{w.severity}</span>
                  <div>
                    <p className="font-medium">{w.message}</p>
                    <p className="text-xs text-gray-600 mt-0.5">→ {w.suggestedFix}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show the math */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <button
          onClick={() => setShowMath(!showMath)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          {showMath ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          Show the math
        </button>
        {showMath && (
          <div className="mt-3 text-xs text-gray-600 space-y-2 bg-gray-50 p-3 rounded-lg">
            <p><strong>Continuous runtime (closed form):</strong></p>
            <p>E_usable = V_nom × Ah × DoD = {project.bank.unit.nominalV}V × {project.bank.unit.ratedAh * project.bank.parallel}Ah × {project.bank.unit.usableDoD} = <strong>{(project.bank.unit.nominalV * project.bank.unit.ratedAh * project.bank.parallel * project.bank.unit.usableDoD).toFixed(0)} Wh</strong></p>
            <p>P_dc = P_ac / η + P_idle = {totalLoadW.toFixed(0)}W / 0.88 + {project.inverter.idleW}W = <strong>{(totalLoadW / 0.88 + project.inverter.idleW).toFixed(0)} W</strong></p>
            <p>Runtime = E_usable / P_dc = {(project.bank.unit.nominalV * project.bank.unit.ratedAh * project.bank.parallel * project.bank.unit.usableDoD).toFixed(0)} / {(totalLoadW / 0.88 + project.inverter.idleW).toFixed(0)} = <strong>{result.continuousRuntime.toFixed(2)} hours</strong></p>
            <p className="text-gray-400 mt-2">Assumptions: efficiency 0.88 at this load, idle draw {project.inverter.idleW}W, Peukert k={project.bank.unit.peukertK}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// COSTS STEP
// ============================================================
function CostsStep({ project, result, costs, onPrev }: {
  project: Project;
  result: SimulationResult;
  costs: ReturnType<typeof calculateCosts>;
  onPrev: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-xl font-bold mb-4">Cost analysis</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-xs text-gray-500">Monthly bill (no solar)</div>
            <div className="text-xl font-bold">৳{costs.monthlyBillNoSolar.toFixed(0)}</div>
          </div>
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="text-xs text-gray-500">Monthly savings</div>
            <div className="text-xl font-bold text-green-700">৳{costs.monthlySavings.toFixed(0)}</div>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-xs text-gray-500">System cost</div>
            <div className="text-xl font-bold">৳{costs.systemCost.toLocaleString()}</div>
          </div>
        </div>

        {costs.simplePaybackYears !== null && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
            <div className="text-sm">
              <strong>Simple payback:</strong> {costs.simplePaybackYears.toFixed(1)} years
              {costs.simplePaybackYears > 10 && ' (long payback — verify assumptions)'}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p>• Battery life: {costs.batteryLifeYears.toFixed(1)} years at current usage pattern</p>
          <p>• Cost per kWh delivered: ৳{costs.costPerKwhDelivered.toFixed(2)}</p>
          <p>• Annual savings: ৳{costs.annualSavings.toFixed(0)}</p>
          {project.pv && (
            <p>• Solar generated: {(result.solarGeneratedWh / 1000).toFixed(1)} kWh/day · Used: {(result.solarUsedWh / 1000).toFixed(1)} kWh/day</p>
          )}
        </div>
      </div>

      {/* Questions to ask your installer */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-bold mb-3">Questions to ask your installer</h3>
        <ul className="text-sm text-gray-700 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">✓</span>
            What is the inverter's actual efficiency curve at my load levels?
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">✓</span>
            What charge profile does the battery need? Is the inverter compatible?
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">✓</span>
            What cable size and DC breaker do you recommend for this setup?
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">✓</span>
            Is the battery room ventilated? (especially for tubular/flooded)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">✓</span>
            What warranty do you offer on installation and components?
          </li>
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// HELPER COMPONENTS
// ============================================================
function KpiCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const colors: Record<string, string> = {
    amber: 'bg-amber-50 border-amber-200 text-amber-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    red: 'bg-red-50 border-red-200 text-red-700',
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
  };
  return (
    <div className={`p-3 rounded-lg border ${colors[color] || colors.amber}`}>
      <div className="text-xs opacity-70">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs opacity-60">{sub}</div>
    </div>
  );
}

function UnverifiedBadge() {
  return (
    <div className="flex items-center gap-2 text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
      <Info className="w-4 h-4 flex-shrink-0" />
      <span>All equipment specs shown are editable defaults, not verified from datasheets. Check your actual equipment and update values accordingly.</span>
    </div>
  );
}

function interpolateCycleLife(batt: BatteryUnit, dod: number): number {
  for (let i = 0; i < batt.cycleLife.length - 1; i++) {
    if (dod >= batt.cycleLife[i].dod && dod <= batt.cycleLife[i + 1].dod) {
      const t = (dod - batt.cycleLife[i].dod) / (batt.cycleLife[i + 1].dod - batt.cycleLife[i].dod);
      return batt.cycleLife[i].cycles.typ + t * (batt.cycleLife[i + 1].cycles.typ - batt.cycleLife[i].cycles.typ);
    }
  }
  return batt.cycleLife[batt.cycleLife.length - 1].cycles.typ;
}
