import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Project, LoadItem, SimulationResult, BatteryUnit } from '../types';
import { createDefaultProject, decodeProject, encodeProject, getShareUrl } from '../lib/state';
import { runSimulation, calculateContinuousRuntime, calculateSizing, calculateCosts, interpolateEfficiency } from '../lib/engine/calculator';
import { applianceTemplates, batteryCatalog, defaultPvPanel } from '../data/catalogs';
import { generateHourlyProfile, getUsageLabel, getUsageDescription, getScenarioLoad } from '../lib/usageProfiles';
import { ResultHero } from '../components/ResultHero';
import { SystemTopology } from '../components/SystemTopology';
import { BatteryVisual } from '../components/BatteryVisual';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { HourlyUsageEditor } from '../components/HourlyUsageEditor';
import { AdvancedSettings, CalculationSettings, defaultSettings } from '../components/AdvancedSettings';
import { BatteryCustomizer } from '../components/BatteryCustomizer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Share2, Printer, ChevronDown, ChevronUp, Info, AlertTriangle, Check, Zap, Sun, Moon, Battery as BatteryIcon, Settings2, Plug, RefreshCw, X, Plus, ArrowRight } from 'lucide-react';

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
  const [showShareToast, setShowShareToast] = useState(false);
  const [calcSettings, setCalcSettings] = useState<CalculationSettings>(defaultSettings);

  // Run simulation
  const result = useMemo(() => runSimulation(project, project.options.assumptionSet), [project]);
  const sizing = useMemo(() => calculateSizing(project), [project]);
  const costs = useMemo(() => calculateCosts(project, result), [project, result]);

  // Derived values for topology
  const totalLoadW = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => {
    const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
    return s + l.qty * l.watts * l.dutyCycle * avgHourly;
  }, 0);
  const solarW = project.pv ? project.pv.panel.wp * project.pv.series * project.pv.parallelStrings * 0.5 : 0;
  const batterySoC = result.timeSeries.length > 0 ? result.timeSeries[result.timeSeries.length - 1].soc : 100;
  const batteryCharging = result.timeSeries.length > 0 ? result.timeSeries[result.timeSeries.length - 1].battW > 0 : false;

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
    setProject(p => ({ ...p, loads: p.loads.map(l => l.id === id ? { ...l, ...updates } : l) }));
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
      hourly: generateHourlyProfile(tmpl.defaultUsage, tmpl.category),
      onBackupCircuit: true,
      priority: 2,
      usageProfile: tmpl.defaultUsage,
    };
    setProject(p => ({ ...p, loads: [...p.loads, newLoad] }));
  };

  const removeLoad = (id: string) => {
    setProject(p => ({ ...p, loads: p.loads.filter(l => l.id !== id) }));
  };

  const steps: PlannerStep[] = ['loads', 'grid', 'system', 'results', 'costs'];
  const currentIdx = steps.indexOf(step);

  return (
    <div className="pt-20 pb-16">
      <div className="container-ultra">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8 pt-4">
          <div>
            <div className="eyebrow mb-1">Planner</div>
            <h1 className="text-2xl font-medium tracking-tight">Size your system</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={shareUrl} className="btn-ghost" title="Share">
              <Share2 className="w-4 h-4" />
              <span className="hidden md:inline">Share</span>
            </button>
            <button onClick={() => window.print()} className="btn-ghost" title="Print">
              <Printer className="w-4 h-4" />
              <span className="hidden md:inline">Print</span>
            </button>
          </div>
        </div>

        {/* Step tabs */}
        <div className="flex gap-1 mb-8 overflow-x-auto pb-2">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className="px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all"
              style={{
                background: step === s ? 'var(--ink)' : 'transparent',
                color: step === s ? 'var(--paper)' : 'var(--muted)',
                border: step === s ? 'none' : '1px solid var(--border)',
              }}
            >
              <span className="num mr-2 opacity-50">{String(i + 1).padStart(2, '0')}</span>
              {s === 'loads' ? 'Loads' : s === 'grid' ? 'Grid' : s === 'system' ? 'System' : s === 'results' ? 'Results' : 'Costs'}
            </button>
          ))}
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left column — inputs */}
          <div className="lg:col-span-7 space-y-6">
            {step === 'loads' && (
              <LoadsStep
                project={project}
                updateLoad={updateLoad}
                addLoad={addLoad}
                removeLoad={removeLoad}
              />
            )}
            {step === 'grid' && (
              <GridStep project={project} setProject={setProject} />
            )}
            {step === 'system' && (
              <SystemStep 
                project={project} 
                setProject={setProject} 
                sizing={sizing} 
                result={result}
                calcSettings={calcSettings}
                setCalcSettings={setCalcSettings}
              />
            )}
            {step === 'results' && (
              <ResultsDetail result={result} project={project} />
            )}
            {step === 'costs' && (
              <CostsStep costs={costs} result={result} project={project} />
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              {currentIdx > 0 ? (
                <button onClick={() => setStep(steps[currentIdx - 1])} className="btn-ghost">
                  ← Back
                </button>
              ) : <div />}
            {currentIdx < steps.length - 1 && (
              <button onClick={() => setStep(steps[currentIdx + 1])} className="btn-primary">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            )}            </div>
          </div>

          {/* Right column — live results (sticky on desktop) */}
          <div className="lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              {/* Result Hero */}
              <div className="p-6 md:p-8 rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <ResultHero project={project} result={result} totalLoadW={totalLoadW} />
              </div>

              {/* System Topology */}
              <div className="p-4 rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-2 pt-2 pb-3 flex items-center justify-between">
                  <div className="eyebrow">System topology</div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--success)' }} />
                    Live
                  </div>
                </div>
                <SystemTopology
                  gridAvailable={result.timeSeries.length > 0 ? result.timeSeries[result.timeSeries.length - 1].gridAvailable : true}
                  solarW={solarW}
                  batterySoC={batterySoC}
                  loadW={totalLoadW}
                  batteryCharging={batteryCharging}
                  inverterOn={totalLoadW > 0}
                  hasSolar={!!project.pv}
                  batteryAh={project.bank.unit.ratedAh * project.bank.parallel}
                  inverterVA={project.inverter.ratedVA}
                />
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-2 gap-3">
                <QuickStat label="Runtime" value={`${result.continuousRuntime.toFixed(1)}h`} />
                <QuickStat label="Recharge" value={`${result.closedFormRecharge.toFixed(1)}h`} />
                <QuickStat label="Min SoC" value={`${result.minSoC.toFixed(0)}%`} />
                <QuickStat label="Unserved" value={`${(result.unservedWh / 1000).toFixed(2)}kWh`} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share toast */}
      {showShareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm animate-fade-up" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
          Link copied to clipboard
        </div>
      )}
    </div>
  );
}

// ============================================================
// LOADS STEP
// ============================================================
function LoadsStep({ project, updateLoad, addLoad, removeLoad }: {
  project: Project;
  updateLoad: (id: string, updates: Partial<LoadItem>) => void;
  addLoad: (templateId: string) => void;
  removeLoad: (id: string) => void;
}) {
  const totalW = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + l.qty * l.watts * l.dutyCycle, 0);
  const totalVA = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + (l.qty * l.watts * l.dutyCycle) / l.powerFactor, 0);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-xl font-medium tracking-tight">Your loads</h2>
          <div className="flex items-baseline gap-4 num text-sm" style={{ color: 'var(--muted)' }}>
            <span><span style={{ color: 'var(--ink)' }} className="font-medium">{totalW.toFixed(0)}</span> W</span>
            <span><span style={{ color: 'var(--ink)' }} className="font-medium">{totalVA.toFixed(0)}</span> VA</span>
          </div>
        </div>
        <p className="text-sm mb-6" style={{ color: 'var(--muted)' }}>
          Add appliances that need backup. All values are editable defaults — check your actual equipment.
        </p>
      </div>

      {/* Load list */}
      <div className="space-y-2">
        {project.loads.map(load => (
          <LoadRow key={load.id} load={load} onUpdate={(u) => updateLoad(load.id, u)} onRemove={() => removeLoad(load.id)} />
        ))}
      </div>

      {/* Add load */}
      <details className="group">
        <summary className="cursor-pointer text-sm font-medium flex items-center gap-2 py-3" style={{ color: 'var(--ink)' }}>
          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs transition-transform group-open:rotate-45" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <Plus className="w-3 h-3" />
          </span>
          Add an appliance
        </summary>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {applianceTemplates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => addLoad(tmpl.id)}
              className="p-3 text-left rounded-xl border transition-all hover:scale-[1.02]"
              style={{
                borderColor: tmpl.inverterFriendly === 'avoid' ? '#fecaca' : tmpl.inverterFriendly === 'caution' ? '#fde68a' : 'var(--border)',
                background: tmpl.inverterFriendly === 'avoid' ? '#fef2f2' : tmpl.inverterFriendly === 'caution' ? '#fffbeb' : 'var(--surface)',
              }}
            >
              <div className="text-sm font-medium">{tmpl.name}</div>
              <div className="text-xs mt-0.5 num" style={{ color: 'var(--muted)' }}>{tmpl.watts}W · PF {tmpl.powerFactor}</div>
            </button>
          ))}
        </div>
      </details>

      <div className="flex items-start gap-2 p-3 rounded-xl text-xs" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
        <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
        <span>All equipment specs shown are editable defaults, not verified from datasheets. Check your actual equipment and update values accordingly.</span>
      </div>
    </div>
  );
}

function LoadRow({ load, onUpdate, onRemove }: { load: LoadItem; onUpdate: (u: Partial<LoadItem>) => void; onRemove: () => void }) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="rounded-xl border transition-colors hover:border-[var(--border-strong)]" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <div className="group flex flex-wrap items-center gap-3 p-3">
        <input
          value={load.label}
          onChange={e => onUpdate({ label: e.target.value })}
          className="flex-1 text-sm font-medium bg-transparent outline-none min-w-[100px]"
          style={{ color: 'var(--ink)' }}
        />
        <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>qty</span>
          <input
            type="number" min={1} max={20} value={load.qty}
            onChange={e => onUpdate({ qty: Math.max(1, +e.target.value) })}
            className="input input-mono w-12 text-center py-1 text-sm"
          />
        </div>          <div className="flex items-center gap-1">
            <input
              type="number" min={1} value={load.watts}
              onChange={e => onUpdate({ watts: Math.max(1, +e.target.value) })}
              className="input input-mono w-16 text-center py-1 text-sm"
            />
            <span className="text-xs num" style={{ color: 'var(--muted)' }}>W</span>
          </div>
        </div>
        {/* Quick usage profile selector */}
        <select
          value={load.usageProfile}
          onChange={e => {
            const newProfile = e.target.value as any;
            const tmpl = load.templateId ? applianceTemplates.find(t => t.id === load.templateId) : undefined;
            onUpdate({
              usageProfile: newProfile,
              hourly: generateHourlyProfile(newProfile, tmpl?.category),
            });
          }}
          className="input text-xs py-1 px-2 w-auto"
          title="Quick preset - click 'Customize' below for full control"
        >
          <option value="both">☀🌙 All day</option>
          <option value="day">☀ Daytime</option>
          <option value="night">🌙 Nighttime</option>
          <option value="occasional">◌ Occasional</option>
        </select>
        <label className="flex items-center gap-1.5 cursor-pointer text-xs">
          <input
            type="checkbox" checked={load.onBackupCircuit}
            onChange={e => onUpdate({ onBackupCircuit: e.target.checked })}
          />
          <span style={{ color: 'var(--muted)' }}>Backup</span>
        </label>
        <button 
          onClick={() => setExpanded(!expanded)}
          className="text-xs px-2 py-1 rounded-lg transition-colors flex items-center gap-1"
          style={{ 
            background: expanded ? 'var(--ink)' : 'transparent',
            color: expanded ? 'var(--paper)' : 'var(--muted)',
            border: `1px solid ${expanded ? 'var(--ink)' : 'var(--border)'}`
          }}
        >
          {expanded ? (
            <>
              <Check className="w-3 h-3" />
              <span>Done</span>
            </>
          ) : (
            <>
              <Settings2 className="w-3 h-3" />
              <span>Customize</span>
            </>
          )}
        </button>
        <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 transition-opacity p-1" style={{ color: 'var(--muted)' }}>
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Expanded hourly editor */}
      {expanded && (
        <div className="px-3 pb-3 pt-1" style={{ borderTop: '1px solid var(--border)' }}>
          <HourlyUsageEditor
            hourly={load.hourly}
            usageProfile={load.usageProfile}
            onChange={(hourly, profile) => onUpdate({ hourly, usageProfile: profile })}
            label={load.label}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// GRID STEP
// ============================================================
function GridStep({ project, setProject }: { project: Project; setProject: (fn: (p: Project) => Project) => void }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-medium tracking-tight mb-2">Grid & load-shedding</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>How often is the power cut, and for how long?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-3">Outage duration</div>
          <div className="display-md num mb-4" style={{ color: 'var(--ink)' }}>
            {project.grid.outageMinutes}
            <span className="text-lg ml-1" style={{ color: 'var(--muted)' }}>min</span>
          </div>
          <input
            type="range" min={15} max={300} step={15}
            value={project.grid.outageMinutes}
            onChange={e => setProject(p => ({ ...p, grid: { ...p.grid, outageMinutes: +e.target.value } }))}
          />
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-3">Grid between outages</div>
          <div className="display-md num mb-4" style={{ color: 'var(--ink)' }}>
            {project.grid.gridMinutes}
            <span className="text-lg ml-1" style={{ color: 'var(--muted)' }}>min</span>
          </div>
          <input
            type="range" min={30} max={480} step={15}
            value={project.grid.gridMinutes}
            onChange={e => setProject(p => ({ ...p, grid: { ...p.grid, gridMinutes: +e.target.value } }))}
          />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-3">Operating mode</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { value: 'ips', label: 'IPS', desc: 'Grid charges battery' },
            { value: 'utility_first', label: 'Utility', desc: 'Grid + PV charges' },
            { value: 'solar_first', label: 'Solar', desc: 'PV → load → grid' },
            { value: 'sbu', label: 'SBU', desc: 'Solar → Batt → Util' },
          ].map(mode => (
            <button
              key={mode.value}
              onClick={() => setProject(p => ({ ...p, options: { ...p.options, mode: mode.value as any } }))}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: project.options.mode === mode.value ? 'var(--ink)' : 'var(--surface)',
                color: project.options.mode === mode.value ? 'var(--paper)' : 'var(--ink)',
                border: project.options.mode === mode.value ? '1px solid var(--ink)' : '1px solid var(--border)',
              }}
            >
              <div className="font-medium text-sm">{mode.label}</div>
              <div className="text-xs mt-1 opacity-60">{mode.desc}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SYSTEM STEP
// ============================================================
function SystemStep({ project, setProject, sizing, result, calcSettings, setCalcSettings }: {
  project: Project;
  setProject: (fn: (p: Project) => Project) => void;
  sizing: ReturnType<typeof calculateSizing>;
  result: SimulationResult;
  calcSettings: CalculationSettings;
  setCalcSettings: (settings: CalculationSettings) => void;
}) {
  return (
    <div className="space-y-8">
      {/* Inverter */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h2 className="text-xl font-medium tracking-tight">Inverter</h2>
          <span className="badge badge-warning text-[10px]">Default · check datasheet</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Rated VA</label>
            <input
              type="number" value={project.inverter.ratedVA}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, ratedVA: +e.target.value } }))}
              className="input input-mono"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Rated W</label>
            <input
              type="number" value={project.inverter.ratedW}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, ratedW: +e.target.value } }))}
              className="input input-mono"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>System V</label>
            <select
              value={project.inverter.systemVoltage}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, systemVoltage: +e.target.value as 12|24|48 } }))}
              className="input"
            >
              <option value={12}>12V</option>
              <option value={24}>24V</option>
              <option value={48}>48V</option>
            </select>
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Idle W</label>
            <input
              type="number" value={project.inverter.idleW}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, idleW: +e.target.value } }))}
              className="input input-mono"
            />
          </div>
        </div>
        <p className="text-xs mt-3 num" style={{ color: 'var(--muted)' }}>
          Sizing suggests: {sizing.recommendedVA} VA · {sizing.systemVoltage}V system
        </p>
      </div>

      {/* Battery */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <BatteryIcon className="w-4 h-4" style={{ color: 'var(--success)' }} />
          <h2 className="text-xl font-medium tracking-tight">Battery</h2>
        </div>
        <BatteryCustomizer
          selectedBattery={project.bank.unit}
          onSelect={(battery) => {
            setProject(p => ({ ...p, bank: { ...p.bank, unit: battery, series: Math.ceil(p.inverter.systemVoltage / battery.nominalV) } }));
          }}
          series={project.bank.series}
          parallel={project.bank.parallel}
          onConfigChange={(series, parallel) => {
            setProject(p => ({ ...p, bank: { ...p.bank, series, parallel } }));
          }}
        />
      </div>

      {/* Solar */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4" style={{ color: '#f59e0b' }} />
            <h2 className="text-xl font-medium tracking-tight">Solar panels</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm">
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
            />
            <span>Enable</span>
          </label>
        </div>
        {project.pv && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Panel Wp</label>
              <input
                type="number" value={project.pv.panel.wp}
                onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, panel: { ...p.pv.panel, wp: +e.target.value } } : p.pv }))}
                className="input input-mono"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Series</label>
              <input
                type="number" min={1} max={6} value={project.pv.series}
                onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, series: Math.max(1, +e.target.value) } : p.pv }))}
                className="input input-mono"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Parallel</label>
              <input
                type="number" min={1} max={4} value={project.pv.parallelStrings}
                onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, parallelStrings: Math.max(1, +e.target.value) } : p.pv }))}
                className="input input-mono"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Total Wp</label>
              <div className="input input-mono flex items-center" style={{ background: 'var(--paper-warm)' }}>
                {project.pv.panel.wp * project.pv.series * project.pv.parallelStrings}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Calculation Settings */}
      <AdvancedSettings settings={calcSettings} onChange={setCalcSettings} />
    </div>
  );
}

// ============================================================
// RESULTS DETAIL
// ============================================================
function ResultsDetail({ result, project }: { result: SimulationResult; project: Project }) {
  const [showMath, setShowMath] = useState(false);
  const [scenario, setScenario] = useState<'day_outage' | 'night_outage' | 'worst_case'>('worst_case');
  
  // Calculate scenario-specific runtimes
  const scenarioRuntimes = useMemo(() => {
    const scenarios = ['day_outage', 'night_outage', 'worst_case'] as const;
    return scenarios.map(s => {
      // Filter loads based on scenario
      const scenarioLoads = project.loads.map(l => {
        const adjustedHourly = getScenarioLoad(l.hourly, s);
        return { ...l, hourly: adjustedHourly };
      });
      
      // Calculate average load for this scenario
      const backupLoads = scenarioLoads.filter(l => l.onBackupCircuit);
      const avgLoadW = backupLoads.reduce((sum, l) => {
        const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
        return sum + l.qty * l.watts * l.dutyCycle * avgHourly;
      }, 0);
      
      const runtime = calculateContinuousRuntime(project.bank, project.inverter, avgLoadW);
      return { scenario: s, runtime, avgLoadW };
    });
  }, [project]);

  // Outage cycle analysis
  const cycleAnalysis = useMemo(() => {
    const outageH = project.grid.outageMinutes / 60;
    const gridH = project.grid.gridMinutes / 60;
    
    // Energy used during outage (at average load)
    const backupLoads = project.loads.filter(l => l.onBackupCircuit);
    const avgLoadW = backupLoads.reduce((sum, l) => {
      const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
      return sum + l.qty * l.watts * l.dutyCycle * avgHourly;
    }, 0);
    
    const loadFraction = avgLoadW / project.inverter.ratedW;
    const efficiency = interpolateEfficiency(project.inverter.efficiencyCurve, loadFraction);
    const dcW = avgLoadW / efficiency + project.inverter.idleW;
    const energyUsedWh = dcW * outageH;
    
    // Energy available for recharge
    const vNom = project.bank.unit.nominalV * project.bank.series;
    const ahTotal = project.bank.unit.ratedAh * project.bank.parallel;
    const maxChargeByC = project.bank.unit.maxChargeC * ahTotal;
    const maxChargeByBMS = project.bank.unit.maxChargeA || Infinity;
    const chargeA = Math.min(project.inverter.gridChargerMaxA, maxChargeByC, maxChargeByBMS);
    const chargeW = chargeA * vNom * project.bank.unit.chargeEfficiency;
    
    // Time to recharge
    const rechargeTimeH = chargeW > 0 ? energyUsedWh / chargeW : Infinity;
    const gridUtilization = gridH > 0 ? (rechargeTimeH / gridH) * 100 : 0;
    
    // Solar contribution (if present)
    let solarRechargeWh = 0;
    if (project.pv) {
      const pvWp = project.pv.panel.wp * project.pv.series * project.pv.parallelStrings;
      const psh = project.site.peakSunHours.typ;
      // Assume solar charges during grid time (simplified)
      solarRechargeWh = pvWp * psh * project.site.systemDerate * (gridH / 24);
    }
    
    const totalRechargeWh = energyUsedWh - solarRechargeWh;
    const netRechargeTimeH = totalRechargeWh > 0 && chargeW > 0 ? totalRechargeWh / chargeW : 0;
    
    return {
      outageH,
      gridH,
      avgLoadW,
      energyUsedWh,
      chargeA,
      chargeW,
      rechargeTimeH,
      gridUtilization,
      solarRechargeWh,
      totalRechargeWh,
      netRechargeTimeH,
      recovers: rechargeTimeH <= gridH,
    };
  }, [project]);
  
  const chartData = result.timeSeries.filter((_, i) => i % 4 === 0).map(t => ({
    time: `${Math.floor(t.t / 60)}h`,
    soc: Math.round(t.soc * 10) / 10,
    load: Math.round(t.loadW),
    pv: Math.round(t.pvW),
  }));

  return (
    <div className="space-y-6">
      {/* Scenario Comparison */}
      <div>
        <div className="eyebrow mb-3">Runtime by scenario</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
          {scenarioRuntimes.map(({ scenario: s, runtime, avgLoadW }) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className="p-4 rounded-xl text-left transition-all"
              style={{
                background: scenario === s ? 'var(--ink)' : 'var(--surface)',
                color: scenario === s ? 'var(--paper)' : 'var(--ink)',
                border: scenario === s ? '1px solid var(--ink)' : '1px solid var(--border)',
              }}
            >
              <div className="text-xs mb-1 opacity-60 flex items-center gap-1">
                {s === 'day_outage' && (
                  <>
                    <Sun className="w-3 h-3" />
                    <span>Day outage (6am–6pm)</span>
                  </>
                )}
                {s === 'night_outage' && (
                  <>
                    <Moon className="w-3 h-3" />
                    <span>Night outage (6pm–6am)</span>
                  </>
                )}
                {s === 'worst_case' && (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>Worst case (all day)</span>
                  </>
                )}
              </div>
              <div className="text-2xl font-medium num">
                {isFinite(runtime) ? runtime.toFixed(1) : '∞'}
                <span className="text-sm ml-1 opacity-60">h</span>
              </div>
              <div className="text-xs mt-1 opacity-60 num">
                avg {avgLoadW.toFixed(0)}W
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>
          {scenario === 'day_outage' && 'Day outages: lights not needed, fans critical. Runtime is usually longer.'}
          {scenario === 'night_outage' && 'Night outages: lights essential, fans + TV on. Runtime is usually shorter.'}
          {scenario === 'worst_case' && 'Worst case: all loads running. Use this for conservative sizing.'}
        </p>
      </div>

      {/* Outage Cycle Analysis */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="eyebrow">Outage cycle balance</div>
            <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              Does the battery recover between outages?
            </p>
          </div>
          <div className={`badge ${cycleAnalysis.recovers ? 'badge-success' : 'badge-danger'} flex items-center gap-1`}>
            {cycleAnalysis.recovers ? (
              <>
                <Check className="w-3 h-3" />
                <span>Recovers</span>
              </>
            ) : (
              <>
                <X className="w-3 h-3" />
                <span>Does not recover</span>
              </>
            )}
          </div>
        </div>

        {/* Visual cycle representation */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-8 rounded-lg overflow-hidden flex" style={{ border: '1px solid var(--border)' }}>
              {/* Outage phase */}
              <div
                className="flex items-center justify-center text-xs font-medium"
                style={{
                  width: `${(cycleAnalysis.outageH / (cycleAnalysis.outageH + cycleAnalysis.gridH)) * 100}%`,
                  background: 'var(--danger-soft)',
                  color: 'var(--danger)',
                }}
              >
                <span className="num">{cycleAnalysis.outageH.toFixed(1)}h</span>
              </div>
              {/* Grid phase */}
              <div
                className="flex items-center justify-center text-xs font-medium"
                style={{
                  width: `${(cycleAnalysis.gridH / (cycleAnalysis.outageH + cycleAnalysis.gridH)) * 100}%`,
                  background: 'var(--success-soft)',
                  color: 'var(--success)',
                }}
              >
                <span className="num">{cycleAnalysis.gridH.toFixed(1)}h</span>
              </div>
            </div>
          </div>
          <div className="flex justify-between text-xs" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Outage (discharge)
            </span>
            <span className="flex items-center gap-1">
              <Plug className="w-3 h-3" />
              Grid (recharge)
            </span>
          </div>
        </div>

        {/* Energy balance */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg" style={{ background: 'var(--danger-soft)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--danger)' }}>Energy used during outage</div>
            <div className="text-lg font-medium num" style={{ color: 'var(--danger)' }}>
              {(cycleAnalysis.energyUsedWh / 1000).toFixed(2)} kWh
            </div>
            <div className="text-xs mt-1 num" style={{ color: 'var(--muted)' }}>
              {cycleAnalysis.avgLoadW.toFixed(0)}W × {cycleAnalysis.outageH.toFixed(1)}h
            </div>
          </div>
          <div className="p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
            <div className="text-xs mb-1" style={{ color: 'var(--success)' }}>Recharge capacity</div>
            <div className="text-lg font-medium num" style={{ color: 'var(--success)' }}>
              {cycleAnalysis.chargeA.toFixed(0)}A · {cycleAnalysis.chargeW.toFixed(0)}W
            </div>
            <div className="text-xs mt-1 num" style={{ color: 'var(--muted)' }}>
              Grid charger + {project.pv ? 'solar' : 'no solar'}
            </div>
          </div>
        </div>

        {/* Recharge time */}
        <div className="p-3 rounded-lg mb-3" style={{ background: cycleAnalysis.recovers ? 'var(--success-soft)' : 'var(--danger-soft)' }}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-medium" style={{ color: cycleAnalysis.recovers ? 'var(--success)' : 'var(--danger)' }}>
              Time to recharge
            </div>
            <div className="text-xs num" style={{ color: 'var(--muted)' }}>
              {cycleAnalysis.gridUtilization.toFixed(0)}% of grid window used
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <div className="text-2xl font-medium num" style={{ color: cycleAnalysis.recovers ? 'var(--success)' : 'var(--danger)' }}>
              {cycleAnalysis.rechargeTimeH.toFixed(1)}h
            </div>
            <div className="text-sm" style={{ color: 'var(--muted)' }}>
              needed / {cycleAnalysis.gridH.toFixed(1)}h available
            </div>
          </div>
          {project.pv && cycleAnalysis.solarRechargeWh > 0 && (
            <div className="text-xs mt-2 num" style={{ color: 'var(--muted)' }}>
              Solar contributes {(cycleAnalysis.solarRechargeWh / 1000).toFixed(2)} kWh during grid time
            </div>
          )}
        </div>

        {/* Recommendation */}
        {!cycleAnalysis.recovers && (
          <div className="p-3 rounded-lg text-sm" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <strong>Problem:</strong> Battery needs {cycleAnalysis.rechargeTimeH.toFixed(1)}h to recharge but only has {cycleAnalysis.gridH.toFixed(1)}h grid time. It will gradually drain over multiple outages.
            <div className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>
              Solutions: Add solar panels · Increase grid charger current · Reduce load · Increase battery capacity
            </div>
          </div>
        )}
      </div>

      {/* SoC Chart */}
      <div>
        <div className="eyebrow mb-3">Battery state of charge</div>
        <div className="p-4 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--ink)', border: 'none', borderRadius: '8px', color: 'var(--paper)', fontSize: '12px' }}
                  formatter={(value: number) => [`${value}%`, 'SoC']}
                />
                <ReferenceLine y={20} stroke="var(--danger)" strokeDasharray="3 3" />
                <Area type="monotone" dataKey="soc" stroke="var(--accent)" fill="url(#socGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Warnings */}
      {result.warnings.filter(w => w.severity !== 'info').length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <div className="eyebrow">What to watch out for</div>
          </div>
          <div className="space-y-2">
            {result.warnings.filter(w => w.severity !== 'info').sort((a, b) => {
              const order = { critical: 0, warn: 1, info: 2 };
              return order[a.severity] - order[b.severity];
            }).map((w, i) => (
              <div
                key={i}
                className="p-4 rounded-xl flex items-start gap-3"
                style={{
                  background: w.severity === 'critical' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                  border: `1px solid ${w.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                }}
              >
                <span className={`badge ${w.severity === 'critical' ? 'badge-danger' : 'badge-warning'}`}>
                  {w.severity}
                </span>
                <div className="flex-1 text-sm">
                  <p className="font-medium">{w.message}</p>
                  <p className="text-xs mt-1 flex items-start gap-1" style={{ color: 'var(--muted)' }}>
                    <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <span>{w.suggestedFix}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Show the math */}
      <button
        onClick={() => setShowMath(!showMath)}
        className="w-full flex items-center justify-between p-4 rounded-xl text-left transition-colors"
        style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <span className="text-sm font-medium">Show the math</span>
        </div>
        {showMath ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {showMath && (
        <div className="p-5 rounded-xl text-xs leading-relaxed space-y-2 num" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--muted)' }}>
          <p><strong style={{ color: 'var(--ink)' }}>Continuous runtime (closed form):</strong></p>
          <p>E_usable = V × Ah × DoD = {project.bank.unit.nominalV}V × {project.bank.unit.ratedAh * project.bank.parallel}Ah × {project.bank.unit.usableDoD} = <strong style={{ color: 'var(--ink)' }}>{(project.bank.unit.nominalV * project.bank.unit.ratedAh * project.bank.parallel * project.bank.unit.usableDoD).toFixed(0)} Wh</strong></p>
          <p>P_dc = P_ac / η + P_idle · Runtime = E_usable / P_dc</p>
          <p>= <strong style={{ color: 'var(--ink)' }}>{result.continuousRuntime.toFixed(2)} hours</strong></p>
        </div>
      )}
    </div>
  );
}

// ============================================================
// COSTS STEP
// ============================================================
function CostsStep({ costs, result, project }: {
  costs: ReturnType<typeof calculateCosts>;
  result: SimulationResult;
  project: Project;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-medium tracking-tight mb-2">Cost analysis</h2>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Monthly savings and payback based on your tariff and solar generation.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-2">Monthly bill (no solar)</div>
          <div className="display-md num">৳{costs.monthlyBillNoSolar.toFixed(0)}</div>
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'var(--success-soft)', border: '1px solid #bbf7d0' }}>
          <div className="eyebrow mb-2" style={{ color: 'var(--success)' }}>Monthly savings</div>
          <div className="display-md num" style={{ color: 'var(--success)' }}>৳{costs.monthlySavings.toFixed(0)}</div>
        </div>
        <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-2">System cost</div>
          <div className="display-md num">৳{costs.systemCost.toLocaleString()}</div>
        </div>
      </div>

      {costs.simplePaybackYears !== null && (
        <div className="p-5 rounded-2xl flex items-center justify-between" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
          <div>
            <div className="eyebrow mb-1">Simple payback</div>
            <div className="display-md num">{costs.simplePaybackYears.toFixed(1)} years</div>
          </div>
          <div className="text-right text-xs" style={{ color: 'var(--muted)' }}>
            {costs.simplePaybackYears > 10 ? 'Long payback — verify assumptions' : 'Reasonable payback period'}
          </div>
        </div>
      )}

      <div className="p-5 rounded-2xl space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="eyebrow">Details</div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>Battery life</span>
            <span className="num font-medium">{costs.batteryLifeYears.toFixed(1)} years</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>৳/kWh delivered</span>
            <span className="num font-medium">৳{costs.costPerKwhDelivered.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span style={{ color: 'var(--muted)' }}>Annual savings</span>
            <span className="num font-medium">৳{costs.annualSavings.toFixed(0)}</span>
          </div>
          {project.pv && (
            <div className="flex justify-between">
              <span style={{ color: 'var(--muted)' }}>Solar/day</span>
              <span className="num font-medium">{(result.solarGeneratedWh / 1000).toFixed(1)} kWh</span>
            </div>
          )}
        </div>
      </div>

      {/* Questions for installer */}
      <div className="p-5 rounded-2xl" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
        <div className="eyebrow mb-3">Questions to ask your installer</div>
        <ul className="space-y-2 text-sm">
          {[
            'What is the inverter\'s actual efficiency curve at my load levels?',
            'What charge profile does the battery need? Is the inverter compatible?',
            'What cable size and DC breaker do you recommend?',
            'Is the battery room ventilated? (for tubular/flooded)',
            'What warranty on installation and components?',
          ].map((q, i) => (
            <li key={i} className="flex items-start gap-2">
              <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
              <span>{q}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ============================================================
// HELPERS
// ============================================================
function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="eyebrow mb-1">{label}</div>
      <div className="text-lg num font-medium">{value}</div>
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
