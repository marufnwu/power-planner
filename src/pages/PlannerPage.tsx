import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Project, LoadItem, SimulationResult, BatteryUnit } from '../types';
import { createDefaultProject, decodeProject, encodeProject, getShareUrl } from '../lib/state';
import { runSimulation, calculateContinuousRuntime, calculateSizing, calculateCosts, interpolateEfficiency } from '../lib/engine/calculator';
import { EnhancedCalculator } from '../lib/enhanced-calculator';
import { applianceTemplates, batteryCatalog, defaultPvPanel } from '../data/catalogs';
import { generateHourlyProfile, getUsageLabel, getUsageDescription, getScenarioLoad } from '../lib/usageProfiles';
import { ResultHero } from '../components/ResultHero';
import { AdvancedTopology } from '../components/AdvancedTopology';
import { BatteryVisual } from '../components/BatteryVisual';
import { AnimatedNumber } from '../components/AnimatedNumber';
import { HourlyUsageEditor } from '../components/HourlyUsageEditor';
import { AdvancedSettings, CalculationSettings, defaultSettings } from '../components/AdvancedSettings';
import { BatteryCustomizer } from '../components/BatteryCustomizer';
import { useI18n } from '../lib/i18n';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart, ReferenceLine } from 'recharts';
import { Share2, Printer, ChevronDown, ChevronUp, Info, AlertTriangle, Check, Zap, Sun, Moon, Battery as BatteryIcon, Settings2, Plug, RefreshCw, X, Plus, ArrowRight, Trash2 } from 'lucide-react';

type PlannerStep = 'loads' | 'grid' | 'system' | 'results' | 'costs';

export function PlannerPage() {
  const { t } = useI18n();
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

  // Apply calcSettings to project before simulation
  const enhancedProject = useMemo(() => {
    const p = JSON.parse(JSON.stringify(project)) as Project;
    
    // Apply temperature corrections
    const batteryTempCorrection = EnhancedCalculator.batteryCapacityTempCorrection(
      p.bank.unit.chemistry,
      calcSettings.batteryRoomTempC,
      p.bank.unit.ratedAh
    );
    const tempFactor = batteryTempCorrection / p.bank.unit.ratedAh;
    
    // Apply battery aging
    const agedCapacity = EnhancedCalculator.batteryCalendarAging(
      p.bank.unit.chemistry,
      calcSettings.batteryAgeYears,
      p.bank.unit.ratedAh
    );
    const agingFactor = agedCapacity / p.bank.unit.ratedAh;
    
    // Apply battery health
    const healthFactor = calcSettings.batteryHealthPct / 100;
    
    // Apply combined battery capacity correction
    p.bank.unit = {
      ...p.bank.unit,
      ratedAh: p.bank.unit.ratedAh * tempFactor * agingFactor * healthFactor,
    };
    
    // Apply inverter efficiency adjustment
    const effFactor = calcSettings.inverterEfficiencyPct / 100;
    p.inverter = {
      ...p.inverter,
      efficiencyCurve: p.inverter.efficiencyCurve.map(point => ({
        ...point,
        eff: Math.min(0.99, point.eff * effFactor),
      })),
    };
    
    // Apply charge/discharge efficiency
    p.bank.unit = {
      ...p.bank.unit,
      chargeEfficiency: calcSettings.batteryChargeEfficiencyPct / 100,
    };
    
    // Apply solar temperature correction if solar exists
    if (p.pv) {
      const cellTemp = EnhancedCalculator.estimateCellTemperature(
        calcSettings.ambientTempC,
        800, // Standard irradiance
        calcSettings.noctC
      );
      const solarTempCorrection = EnhancedCalculator.solarPanelTempCorrection(
        p.pv.panel.tempCoeffPmaxPctPerC,
        cellTemp,
        p.pv.panel.wp
      );
      const solarTempFactor = solarTempCorrection / p.pv.panel.wp;
      
      p.pv = {
        ...p.pv,
        panel: {
          ...p.pv.panel,
          wp: p.pv.panel.wp * solarTempFactor,
        },
      };
      
      // Apply panel degradation
      const yearsOld = 0; // Could track installation date
      const degradationFactor = 1 - (calcSettings.panelDegradationPctPerYear / 100 * yearsOld);
      p.pv.panel.wp = p.pv.panel.wp * degradationFactor;
    }
    
    // Apply system losses to load calculation
    const totalLossFactor = (
      (1 - calcSettings.wiringLossPct / 100) *
      (1 - calcSettings.soilingLossPct / 100) *
      (1 - calcSettings.mismatchLossPct / 100)
    );
    
    // Apply diversity factor to loads
    p.loads = p.loads.map(load => ({
      ...load,
      watts: load.watts * calcSettings.diversityFactor,
    }));
    
    // Apply safety margins to inverter sizing
    p.inverter = {
      ...p.inverter,
      ratedVA: p.inverter.ratedVA * (1 + calcSettings.inverterSafetyMarginPct / 100),
      ratedW: p.inverter.ratedW * (1 + calcSettings.inverterSafetyMarginPct / 100),
    };
    
    return p;
  }, [project, calcSettings]);
  
  // Run simulation with enhanced project
  const result = useMemo(() => runSimulation(enhancedProject, enhancedProject.options.assumptionSet), [enhancedProject]);
  const sizing = useMemo(() => calculateSizing(enhancedProject), [enhancedProject]);
  const costs = useMemo(() => calculateCosts(enhancedProject, result), [enhancedProject, result]);

  // Derived values for topology (using enhanced project)
  const totalLoadW = enhancedProject.loads.filter(l => l.onBackupCircuit).reduce((s, l) => {
    const avgHourly = l.hourly.reduce((a, b) => a + b, 0) / 24;
    return s + l.qty * l.watts * l.dutyCycle * avgHourly;
  }, 0);
  const solarW = enhancedProject.pv ? enhancedProject.pv.panel.wp * enhancedProject.pv.series * enhancedProject.pv.parallelStrings * 0.5 : 0;
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
    <div className="pt-16 md:pt-20 pb-20 md:pb-16">
      <div className="px-4 md:px-6 lg:px-8 max-w-[1520px] mx-auto">
        {/* Top bar - mobile-first */}
        <div className="flex items-center justify-between mb-4 md:mb-8 pt-2 md:pt-4">
          <div className="min-w-0 flex-1">
            <div className="eyebrow mb-0.5 md:mb-1 text-[10px] md:text-xs">{t('planner.title')}</div>
            <h1 className="text-lg md:text-2xl font-medium tracking-tight truncate">{t('planner.title')}</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2 flex-shrink-0 ml-2">
            <Link to="/compare" className="p-2 md:p-2.5 rounded-lg" style={{ color: 'var(--muted)' }} title="Compare">
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
            </Link>
            <button onClick={shareUrl} className="p-2 md:p-2.5 rounded-lg" style={{ color: 'var(--muted)' }} title="Share">
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
            </button>
            <button onClick={() => window.print()} className="p-2 md:p-2.5 rounded-lg hidden md:block" style={{ color: 'var(--muted)' }} title="Print">
              <Printer className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>
        </div>

        {/* Step tabs - mobile scrollable */}
        <div className="flex gap-1.5 md:gap-2 mb-4 md:mb-8 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
          {steps.map((s, i) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className="px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm font-medium rounded-full whitespace-nowrap transition-all flex-shrink-0"
              style={{
                background: step === s ? 'var(--ink)' : 'transparent',
                color: step === s ? 'var(--paper)' : 'var(--muted)',
                border: step === s ? 'none' : '1px solid var(--border)',
                minHeight: '40px',
              }}
            >
              <span className="num mr-1 md:mr-2 opacity-50">{String(i + 1).padStart(2, '0')}</span>
              {s === 'loads' ? t('planner.loads') : s === 'grid' ? t('planner.grid') : s === 'system' ? t('planner.system') : s === 'results' ? t('planner.results') : t('planner.costs')}
            </button>
          ))}
        </div>

        {/* Mobile: Results on top, then inputs */}
        {/* Desktop: Inputs left, results right */}
        
        {/* Mobile results summary - always visible at top */}
        <div className="lg:hidden mb-4 md:mb-6">
          <MobileResultSummary 
            result={result} 
            project={enhancedProject} 
            totalLoadW={totalLoadW}
            solarW={solarW}
            batteryCharging={batteryCharging}
          />
        </div>

        {/* Main content area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 lg:gap-8">
          {/* Left column — inputs */}
          <div className="lg:col-span-7 space-y-4 md:space-y-6">
            {step === 'loads' && (
              <LoadsStep project={project} updateLoad={updateLoad} addLoad={addLoad} removeLoad={removeLoad} />
            )}
            {step === 'grid' && (
              <GridStep project={project} setProject={setProject} />
            )}
            {step === 'system' && (
              <SystemStep project={project} setProject={setProject} sizing={sizing} result={result} calcSettings={calcSettings} setCalcSettings={setCalcSettings} />
            )}
            {step === 'results' && (
              <ResultsDetail result={result} project={project} />
            )}
            {step === 'costs' && (
              <CostsStep costs={costs} result={result} project={project} />
            )}

            {/* Navigation - mobile-first */}
            <div className="flex justify-between gap-3 pt-2 md:pt-4 sticky bottom-0 py-3 -mx-4 px-4 md:mx-0 md:px-0" style={{ background: 'var(--paper)' }}>
              {currentIdx > 0 ? (
                <button onClick={() => setStep(steps[currentIdx - 1])} className="btn-ghost flex-1 md:flex-none">
                  ← Back
                </button>
              ) : <div className="flex-1 md:flex-none" />}
              {currentIdx < steps.length - 1 && (
                <button onClick={() => setStep(steps[currentIdx + 1])} className="btn-primary flex-1 md:flex-none">
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Right column — live results (desktop only, mobile uses summary above) */}
          <div className="hidden lg:block lg:col-span-5">
            <div className="lg:sticky lg:top-24 space-y-6">
              <div className="p-8 rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <ResultHero project={enhancedProject} result={result} totalLoadW={totalLoadW} calcSettings={calcSettings} />
              </div>
              <div className="p-4 rounded-3xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <div className="px-2 pt-2 pb-3 flex items-center justify-between">
                  <div className="eyebrow">System topology</div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
                    <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--success)' }} />
                    Live
                  </div>
                </div>
                <AdvancedTopology
                  gridAvailable={result.timeSeries.length > 0 ? result.timeSeries[result.timeSeries.length - 1].gridAvailable : true}
                  solarW={solarW}
                  batterySoC={batterySoC}
                  loadW={totalLoadW}
                  batteryCharging={batteryCharging}
                  inverterOn={totalLoadW > 0}
                  hasSolar={!!enhancedProject.pv}
                  batteryAh={enhancedProject.bank.unit.ratedAh * enhancedProject.bank.parallel}
                  inverterVA={enhancedProject.inverter.ratedVA}
                  inverterEfficiency={calcSettings.inverterEfficiencyPct}
                  batteryVoltage={enhancedProject.bank.unit.nominalV * enhancedProject.bank.series}
                  gridPower={result.gridWh / (enhancedProject.options.simulationDays * 24)}
                />
              </div>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm animate-fade-up z-50" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
          Link copied to clipboard
        </div>
      )}
    </div>
  );
}

// ============================================================
// MOBILE RESULT SUMMARY - Compact results for mobile top
// ============================================================
function MobileResultSummary({ result, project, totalLoadW, solarW, batteryCharging }: {
  result: SimulationResult;
  project: Project;
  totalLoadW: number;
  solarW: number;
  batteryCharging: boolean;
}) {
  const runtime = result.continuousRuntime;
  const finiteRuntime = Number.isFinite(runtime) && runtime < 100;
  
  return (
    <div className="rounded-2xl p-4" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {/* Big number */}
      <div className="flex items-baseline gap-2 mb-2">
        <span className="text-3xl font-medium num" style={{ color: 'var(--ink)' }}>
          {finiteRuntime ? runtime.toFixed(1) : '∞'}
        </span>
        <span className="text-sm" style={{ color: 'var(--muted)' }}>hours runtime</span>
      </div>
      
      {/* Context */}
      <p className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
        {project.inverter.ratedVA}VA · {project.bank.unit.ratedAh}Ah {project.bank.unit.chemistry} · {totalLoadW.toFixed(0)}W load
      </p>
      
      {/* Recovery status */}
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        result.recoveryStatus === 'yes' ? '' : result.recoveryStatus === 'barely' ? '' : ''
      }`} style={{
        background: result.recoveryStatus === 'yes' ? 'var(--success-soft)' : result.recoveryStatus === 'barely' ? 'var(--warning-soft)' : 'var(--danger-soft)',
        color: result.recoveryStatus === 'yes' ? 'var(--success)' : result.recoveryStatus === 'barely' ? 'var(--warning)' : 'var(--danger)',
      }}>
        <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{
          background: result.recoveryStatus === 'yes' ? 'var(--success)' : result.recoveryStatus === 'barely' ? 'var(--warning)' : 'var(--danger)',
        }} />
        {result.recoveryStatus === 'yes' ? 'Recovers' : result.recoveryStatus === 'barely' ? 'Barely recovers' : "Doesn't recover"}
      </div>
      
      {/* Mini stats */}
      <div className="grid grid-cols-3 gap-2 mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="text-center">
          <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Recharge</div>
          <div className="text-sm font-semibold num">{result.closedFormRecharge.toFixed(1)}h</div>
        </div>
        <div className="text-center">
          <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Min SoC</div>
          <div className="text-sm font-semibold num">{result.minSoC.toFixed(0)}%</div>
        </div>
        <div className="text-center">
          <div className="text-[10px]" style={{ color: 'var(--muted)' }}>Battery</div>
          <div className="text-sm font-semibold num" style={{ color: batteryCharging ? 'var(--success)' : 'var(--warning)' }}>
            {batteryCharging ? '↻' : '↯'}
          </div>
        </div>
      </div>
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
  const { t } = useI18n();
  const totalW = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + l.qty * l.watts * l.dutyCycle, 0);
  const totalVA = project.loads.filter(l => l.onBackupCircuit).reduce((s, l) => s + (l.qty * l.watts * l.dutyCycle) / l.powerFactor, 0);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">{t('load.yourLoads')}</h2>
          <div className="flex items-center gap-3 num text-xs" style={{ color: 'var(--muted)' }}>
            <span><span style={{ color: 'var(--ink)' }} className="font-semibold">{totalW.toFixed(0)}</span> {t('unit.watts')}</span>
            <span className="w-px h-3" style={{ background: 'var(--border)' }} />
            <span><span style={{ color: 'var(--ink)' }} className="font-semibold">{totalVA.toFixed(0)}</span> VA</span>
          </div>
        </div>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          {t('load.addLoadsBackup')}
        </p>
      </div>

      {/* Load list */}
      <div className="space-y-1.5">
        {project.loads.map(load => (
          <LoadRow key={load.id} load={load} onUpdate={(u) => updateLoad(load.id, u)} onRemove={() => removeLoad(load.id)} />
        ))}
      </div>

      {/* Add load */}
      <details className="group">
        <summary className="cursor-pointer text-xs font-medium flex items-center gap-2 py-2" style={{ color: 'var(--ink)' }}>
          <span className="w-5 h-5 rounded-full flex items-center justify-center transition-transform group-open:rotate-45" style={{ background: 'var(--ink)', color: 'var(--paper)' }}>
            <Plus className="w-2.5 h-2.5" />
          </span>
          {t('load.addAppliance')}
        </summary>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
          {applianceTemplates.map(tmpl => (
            <button
              key={tmpl.id}
              onClick={() => addLoad(tmpl.id)}
              className="p-2 text-left rounded-lg border transition-all hover:scale-[1.02]"
              style={{
                borderColor: tmpl.inverterFriendly === 'avoid' ? '#fecaca' : tmpl.inverterFriendly === 'caution' ? '#fde68a' : 'var(--border)',
                background: tmpl.inverterFriendly === 'avoid' ? '#fef2f2' : tmpl.inverterFriendly === 'caution' ? '#fffbeb' : 'var(--surface)',
              }}
            >
              <div className="text-xs font-medium">{tmpl.name}</div>
              <div className="text-[10px] mt-0.5 num" style={{ color: 'var(--muted)' }}>{tmpl.watts}W · PF {tmpl.powerFactor}</div>
            </button>
          ))}
        </div>
      </details>

      <div className="flex items-start gap-1.5 p-2 rounded-lg text-[10px]" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>{t('load.editableDefaults')}</span>
      </div>
    </div>
  );
}

function LoadRow({ load, onUpdate, onRemove }: { load: LoadItem; onUpdate: (u: Partial<LoadItem>) => void; onRemove: () => void }) {
  const { t } = useI18n();
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div 
      className="rounded-lg border transition-all hover:shadow-sm group" 
      style={{ 
        borderColor: expanded ? 'var(--accent)' : 'var(--border)', 
        background: 'var(--surface)',
        boxShadow: expanded ? '0 2px 8px rgba(255, 77, 28, 0.08)' : 'none'
      }}
    >
      {/* Compact main row - mobile optimized */}
      <div className="p-3 md:px-3 md:py-2.5">
        {/* Mobile: Stacked layout */}
        <div className="md:hidden space-y-2">
          {/* Top row: Name + badges + actions */}
          <div className="flex items-center gap-2">
            <input
              value={load.label}
              onChange={e => onUpdate({ label: e.target.value })}
              className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent focus:border-[var(--accent)] transition-colors min-w-0"
              style={{ color: 'var(--ink)' }}
              placeholder="Load name"
            />
            <div className="flex items-center gap-1 flex-shrink-0">
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded font-medium" 
                style={{ 
                  background: load.onBackupCircuit ? 'var(--success-soft)' : 'var(--border)',
                  color: load.onBackupCircuit ? 'var(--success)' : 'var(--muted)'
                }}
              >
                {load.onBackupCircuit ? '⚡' : '🔌'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {load.usageProfile === 'day' ? '☀️' : load.usageProfile === 'night' ? '🌙' : load.usageProfile === 'both' ? '⚡' : '◌'}
              </span>
            </div>
            {/* Mobile: Larger action buttons */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-[var(--paper-warm)] transition-colors"
              aria-label="Toggle details"
            >
              {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            <button
              onClick={onRemove}
              className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors"
              aria-label="Remove load"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          {/* Bottom row: Stats */}
          <div className="flex items-center gap-2">
            <div className="flex-1 flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>×</span>
              <input
                type="number" min={1} max={20} value={load.qty}
                onChange={e => onUpdate({ qty: Math.max(1, +e.target.value) })}
                className="flex-1 h-10 text-center text-sm font-semibold bg-[var(--paper-warm)] rounded outline-none num"
                style={{ color: 'var(--ink)' }}
              />
            </div>
            <div className="flex-1 flex items-center gap-1">
              <input
                type="number" min={1} value={load.watts}
                onChange={e => onUpdate({ watts: Math.max(1, +e.target.value) })}
                className="flex-1 h-10 text-center text-sm font-semibold bg-[var(--paper-warm)] rounded outline-none num"
                style={{ color: 'var(--ink)' }}
              />
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>W</span>
            </div>
            <div className="text-sm font-bold num px-2" style={{ color: 'var(--accent)' }}>
              {(load.qty * load.watts).toFixed(0)}W
            </div>
          </div>
        </div>
        
        {/* Desktop: Horizontal layout */}
        <div className="hidden md:flex items-center gap-3">
          {/* Name and badges */}
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <input
              value={load.label}
              onChange={e => onUpdate({ label: e.target.value })}
              className="flex-1 text-sm font-medium bg-transparent outline-none border-b border-transparent hover:border-[var(--border)] focus:border-[var(--accent)] transition-colors min-w-0"
              style={{ color: 'var(--ink)' }}
              placeholder="Load name"
            />
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span 
                className="text-[10px] px-1.5 py-0.5 rounded font-medium" 
                style={{ 
                  background: load.onBackupCircuit ? 'var(--success-soft)' : 'var(--border)',
                  color: load.onBackupCircuit ? 'var(--success)' : 'var(--muted)'
                }}
              >
                {load.onBackupCircuit ? '⚡' : '🔌'}
              </span>
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
                {load.usageProfile === 'day' ? '☀️' : load.usageProfile === 'night' ? '🌙' : load.usageProfile === 'both' ? '⚡' : '◌'}
              </span>
            </div>
          </div>

          {/* Compact stats */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex items-center gap-1">
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>×</span>
              <input
                type="number" min={1} max={20} value={load.qty}
                onChange={e => onUpdate({ qty: Math.max(1, +e.target.value) })}
                className="w-12 text-center text-sm font-semibold bg-transparent outline-none num"
                style={{ color: 'var(--ink)' }}
              />
            </div>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <div className="flex items-center gap-1">
              <input
                type="number" min={1} value={load.watts}
                onChange={e => onUpdate({ watts: Math.max(1, +e.target.value) })}
                className="w-14 text-center text-sm font-semibold bg-transparent outline-none num"
                style={{ color: 'var(--ink)' }}
              />
              <span className="text-[10px]" style={{ color: 'var(--muted)' }}>W</span>
            </div>
            <div className="w-px h-4" style={{ background: 'var(--border)' }} />
            <div className="text-sm font-bold num" style={{ color: 'var(--accent)' }}>
              {(load.qty * load.watts).toFixed(0)}W
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 rounded hover:bg-[var(--paper-warm)] transition-colors"
              aria-label="Toggle details"
            >
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <button
              onClick={onRemove}
              className="p-2 rounded hover:bg-red-50 text-[var(--muted)] hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove load"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Compact expanded section */}
      {expanded && (
        <div className="border-t p-3 md:px-3 md:py-2.5 space-y-3" style={{ borderColor: 'var(--border)', background: 'var(--paper-warm)' }}>
          {/* Usage pattern - mobile: vertical, desktop: horizontal */}
          <div className="space-y-2">
            <span className="text-xs font-medium block" style={{ color: 'var(--muted)' }}>{t('load.usagePattern')}:</span>
            <div className="grid grid-cols-4 gap-1.5">
              {(['day', 'night', 'both', 'occasional'] as const).map(profile => (
                <button
                  key={profile}
                  onClick={() => onUpdate({ usageProfile: profile })}
                  className="h-10 rounded text-xs font-medium transition-all"
                  style={{
                    background: load.usageProfile === profile ? 'var(--ink)' : 'var(--surface)',
                    color: load.usageProfile === profile ? 'var(--paper)' : 'var(--muted)',
                    border: `1px solid ${load.usageProfile === profile ? 'var(--ink)' : 'var(--border)'}`
                  }}
                >
                  {profile === 'day' && '☀️ Day'}
                  {profile === 'night' && '🌙 Night'}
                  {profile === 'both' && '⚡ Both'}
                  {profile === 'occasional' && '◌ Occ'}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced settings - mobile: stacked, desktop: 3-column */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                Power Factor
              </label>
              <input
                type="number" min={0.1} max={1} step={0.01} value={load.powerFactor}
                onChange={e => onUpdate({ powerFactor: +e.target.value })}
                className="input input-mono text-sm h-10"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                Duty Cycle
              </label>
              <input
                type="number" min={0} max={1} step={0.01} value={load.dutyCycle}
                onChange={e => onUpdate({ dutyCycle: +e.target.value })}
                className="input input-mono text-sm h-10"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--muted)' }}>
                Circuit
              </label>
              <button
                onClick={() => onUpdate({ onBackupCircuit: !load.onBackupCircuit })}
                className="w-full h-10 rounded text-sm font-medium transition-all"
                style={{
                  background: load.onBackupCircuit ? 'var(--success)' : 'var(--muted)',
                  color: 'var(--paper)'
                }}
              >
                {load.onBackupCircuit ? '⚡ Backup' : '🔌 Grid'}
              </button>
            </div>
          </div>

          {/* Hourly editor */}
          <HourlyUsageEditor
            hourly={load.hourly}
            usageProfile={load.usageProfile}
            onChange={(hourly, profile) => onUpdate({ hourly, usageProfile: profile })}
            label={load.label}
            compact={true}
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
    <div className="space-y-4 md:space-y-8">
      <div>
        <h2 className="text-lg md:text-xl font-medium tracking-tight mb-1 md:mb-2">Grid & load-shedding</h2>
        <p className="text-xs md:text-sm" style={{ color: 'var(--muted)' }}>How often is the power cut, and for how long?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-6">
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-2 md:mb-3 text-[10px] md:text-xs">Outage duration</div>
          <div className="text-2xl md:text-3xl font-medium num mb-3 md:mb-4" style={{ color: 'var(--ink)' }}>
            {project.grid.outageMinutes}
            <span className="text-sm md:text-lg ml-1" style={{ color: 'var(--muted)' }}>min</span>
          </div>
          <input
            type="range" min={15} max={300} step={15}
            value={project.grid.outageMinutes}
            onChange={e => setProject(p => ({ ...p, grid: { ...p.grid, outageMinutes: +e.target.value } }))}
            className="w-full"
          />
        </div>
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-2 md:mb-3 text-[10px] md:text-xs">Grid between outages</div>
          <div className="text-2xl md:text-3xl font-medium num mb-3 md:mb-4" style={{ color: 'var(--ink)' }}>
            {project.grid.gridMinutes}
            <span className="text-sm md:text-lg ml-1" style={{ color: 'var(--muted)' }}>min</span>
          </div>
          <input
            type="range" min={30} max={480} step={15}
            value={project.grid.gridMinutes}
            onChange={e => setProject(p => ({ ...p, grid: { ...p.grid, gridMinutes: +e.target.value } }))}
            className="w-full"
          />
        </div>
      </div>

      <div>
        <div className="eyebrow mb-2 md:mb-3 text-[10px] md:text-xs">Operating mode</div>
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          {[
            { value: 'ips', label: 'IPS', desc: 'Grid charges battery' },
            { value: 'utility_first', label: 'Utility', desc: 'Grid + PV charges' },
            { value: 'solar_first', label: 'Solar', desc: 'PV → load → grid' },
            { value: 'sbu', label: 'SBU', desc: 'Solar → Batt → Util' },
          ].map(mode => (
            <button
              key={mode.value}
              onClick={() => setProject(p => ({ ...p, options: { ...p.options, mode: mode.value as any } }))}
              className="p-3 md:p-4 rounded-lg md:rounded-xl text-left transition-all min-h-[64px] md:min-h-[80px]"
              style={{
                background: project.options.mode === mode.value ? 'var(--ink)' : 'var(--surface)',
                color: project.options.mode === mode.value ? 'var(--paper)' : 'var(--ink)',
                border: project.options.mode === mode.value ? '1px solid var(--ink)' : '1px solid var(--border)',
              }}
            >
              <div className="font-medium text-xs md:text-sm">{mode.label}</div>
              <div className="text-[10px] md:text-xs mt-0.5 md:mt-1 opacity-60">{mode.desc}</div>
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
    <div className="space-y-4 md:space-y-8">
      {/* Inverter */}
      <div>
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg md:text-xl font-medium tracking-tight">Inverter</h2>
          <span className="badge badge-warning text-[10px] ml-auto">Default · check datasheet</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Rated VA</label>
            <input
              type="number" value={project.inverter.ratedVA}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, ratedVA: +e.target.value } }))}
              className="input input-mono h-11"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Rated W</label>
            <input
              type="number" value={project.inverter.ratedW}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, ratedW: +e.target.value } }))}
              className="input input-mono h-11"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>System V</label>
            <select
              value={project.inverter.systemVoltage}
              onChange={e => setProject(p => ({ ...p, inverter: { ...p.inverter, systemVoltage: +e.target.value as 12|24|48 } }))}
              className="input h-11"
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
              className="input input-mono h-11"
            />
          </div>
        </div>
        <p className="text-xs mt-2 md:mt-3 num" style={{ color: 'var(--muted)' }}>
          Sizing suggests: {sizing.recommendedVA} VA · {sizing.systemVoltage}V system
        </p>
      </div>

      {/* Battery */}
      <div>
        <div className="flex items-center gap-2 mb-3 md:mb-4">
          <BatteryIcon className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--success)' }} />
          <h2 className="text-lg md:text-xl font-medium tracking-tight">Battery</h2>
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
        <div className="flex items-center justify-between mb-3 md:mb-4 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Sun className="w-4 h-4 flex-shrink-0" style={{ color: '#f59e0b' }} />
            <h2 className="text-lg md:text-xl font-medium tracking-tight truncate">Solar panels</h2>
          </div>
          <label className="flex items-center gap-2 cursor-pointer text-sm flex-shrink-0">
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
              className="w-5 h-5"
            />
            <span>Enable</span>
          </label>
        </div>
        {project.pv && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Panel Wp</label>
              <input
                type="number" value={project.pv.panel.wp}
                onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, panel: { ...p.pv.panel, wp: +e.target.value } } : p.pv }))}
                className="input input-mono h-11"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Series</label>
              <input
                type="number" min={1} max={6} value={project.pv.series}
                onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, series: Math.max(1, +e.target.value) } : p.pv }))}
                className="input input-mono h-11"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Parallel</label>
              <input
                type="number" min={1} max={4} value={project.pv.parallelStrings}
                onChange={e => setProject(p => ({ ...p, pv: p.pv ? { ...p.pv, parallelStrings: Math.max(1, +e.target.value) } : p.pv }))}
                className="input input-mono h-11"
              />
            </div>
            <div>
              <label className="text-xs mb-1 block" style={{ color: 'var(--muted)' }}>Total Wp</label>
              <div className="input input-mono flex items-center h-11" style={{ background: 'var(--paper-warm)' }}>
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
    <div className="space-y-4 md:space-y-6">
      {/* Scenario Comparison */}
      <div>
        <div className="eyebrow mb-2 md:mb-3 text-[10px] md:text-xs">Runtime by scenario</div>
        <div className="grid grid-cols-1 gap-2 md:gap-3 md:grid-cols-3 mb-3 md:mb-4">
          {scenarioRuntimes.map(({ scenario: s, runtime, avgLoadW }) => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className="p-3 md:p-4 rounded-lg md:rounded-xl text-left transition-all min-h-[80px] md:min-h-[100px]"
              style={{
                background: scenario === s ? 'var(--ink)' : 'var(--surface)',
                color: scenario === s ? 'var(--paper)' : 'var(--ink)',
                border: scenario === s ? '1px solid var(--ink)' : '1px solid var(--border)',
              }}
            >
              <div className="text-[10px] md:text-xs mb-1 opacity-60 flex items-center gap-1">
                {s === 'day_outage' && (
                  <>
                    <Sun className="w-3 h-3" />
                    <span>Day (6am–6pm)</span>
                  </>
                )}
                {s === 'night_outage' && (
                  <>
                    <Moon className="w-3 h-3" />
                    <span>Night (6pm–6am)</span>
                  </>
                )}
                {s === 'worst_case' && (
                  <>
                    <Zap className="w-3 h-3" />
                    <span>Worst case</span>
                  </>
                )}
              </div>
              <div className="text-xl md:text-2xl font-medium num">
                {isFinite(runtime) ? runtime.toFixed(1) : '∞'}
                <span className="text-xs md:text-sm ml-1 opacity-60">h</span>
              </div>
              <div className="text-[10px] md:text-xs mt-1 opacity-60 num">
                avg {avgLoadW.toFixed(0)}W
              </div>
            </button>
          ))}
        </div>
        <p className="text-[10px] md:text-xs" style={{ color: 'var(--muted)' }}>
          {scenario === 'day_outage' && 'Day outages: lights not needed, fans critical. Runtime is usually longer.'}
          {scenario === 'night_outage' && 'Night outages: lights essential, fans + TV on. Runtime is usually shorter.'}
          {scenario === 'worst_case' && 'Worst case: all loads running. Use this for conservative sizing.'}
        </p>
      </div>

      {/* Outage Cycle Analysis */}
      <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3 md:mb-4">
          <div>
            <div className="eyebrow text-[10px] md:text-xs">Outage cycle balance</div>
            <p className="text-[10px] md:text-xs mt-0.5 md:mt-1" style={{ color: 'var(--muted)' }}>
              Does the battery recover between outages?
            </p>
          </div>
          <div className={`badge ${cycleAnalysis.recovers ? 'badge-success' : 'badge-danger'} flex items-center gap-1 text-[10px] md:text-xs`}>
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
        <div className="mb-3 md:mb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-7 md:h-8 rounded-lg overflow-hidden flex" style={{ border: '1px solid var(--border)' }}>
              {/* Outage phase */}
              <div
                className="flex items-center justify-center text-[10px] md:text-xs font-medium"
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
                className="flex items-center justify-center text-[10px] md:text-xs font-medium"
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
          <div className="flex justify-between text-[10px] md:text-xs" style={{ color: 'var(--muted)' }}>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Outage
            </span>
            <span className="flex items-center gap-1">
              <Plug className="w-3 h-3" />
              Grid
            </span>
          </div>
        </div>

        {/* Energy balance - stack on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 mb-3 md:mb-4">
          <div className="p-2 md:p-3 rounded-lg" style={{ background: 'var(--danger-soft)' }}>
            <div className="text-[10px] md:text-xs mb-0.5 md:mb-1" style={{ color: 'var(--danger)' }}>Energy used</div>
            <div className="text-base md:text-lg font-medium num" style={{ color: 'var(--danger)' }}>
              {(cycleAnalysis.energyUsedWh / 1000).toFixed(2)} kWh
            </div>
            <div className="text-[10px] md:text-xs mt-0.5 md:mt-1 num" style={{ color: 'var(--muted)' }}>
              {cycleAnalysis.avgLoadW.toFixed(0)}W × {cycleAnalysis.outageH.toFixed(1)}h
            </div>
          </div>
          <div className="p-2 md:p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
            <div className="text-[10px] md:text-xs mb-0.5 md:mb-1" style={{ color: 'var(--success)' }}>Recharge capacity</div>
            <div className="text-base md:text-lg font-medium num" style={{ color: 'var(--success)' }}>
              {cycleAnalysis.chargeA.toFixed(0)}A · {cycleAnalysis.chargeW.toFixed(0)}W
            </div>
            <div className="text-[10px] md:text-xs mt-0.5 md:mt-1 num" style={{ color: 'var(--muted)' }}>
              Grid charger + {project.pv ? 'solar' : 'no solar'}
            </div>
          </div>
        </div>

        {/* Recharge time */}
        <div className="p-2 md:p-3 rounded-lg mb-2 md:mb-3" style={{ background: cycleAnalysis.recovers ? 'var(--success-soft)' : 'var(--danger-soft)' }}>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-1 md:gap-2 mb-1 md:mb-2">
            <div className="text-[10px] md:text-xs font-medium" style={{ color: cycleAnalysis.recovers ? 'var(--success)' : 'var(--danger)' }}>
              Time to recharge
            </div>
            <div className="text-[10px] md:text-xs num" style={{ color: 'var(--muted)' }}>
              {cycleAnalysis.gridUtilization.toFixed(0)}% of grid window
            </div>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className="text-xl md:text-2xl font-medium num" style={{ color: cycleAnalysis.recovers ? 'var(--success)' : 'var(--danger)' }}>
              {cycleAnalysis.rechargeTimeH.toFixed(1)}h
            </div>
            <div className="text-xs md:text-sm" style={{ color: 'var(--muted)' }}>
              needed / {cycleAnalysis.gridH.toFixed(1)}h available
            </div>
          </div>
          {project.pv && cycleAnalysis.solarRechargeWh > 0 && (
            <div className="text-[10px] md:text-xs mt-1 md:mt-2 num" style={{ color: 'var(--muted)' }}>
              Solar contributes {(cycleAnalysis.solarRechargeWh / 1000).toFixed(2)} kWh during grid time
            </div>
          )}
        </div>

        {/* Recommendation */}
        {!cycleAnalysis.recovers && (
          <div className="p-2 md:p-3 rounded-lg text-xs md:text-sm" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}>
            <strong>Problem:</strong> Battery needs {cycleAnalysis.rechargeTimeH.toFixed(1)}h to recharge but only has {cycleAnalysis.gridH.toFixed(1)}h grid time.
            <div className="mt-1 md:mt-2 text-[10px] md:text-xs" style={{ color: 'var(--muted)' }}>
              Solutions: Add solar · Increase charge current · Reduce load · Larger battery
            </div>
          </div>
        )}
      </div>

      {/* SoC Chart */}
      <div>
        <div className="eyebrow mb-2 md:mb-3 text-[10px] md:text-xs">Battery state of charge</div>
        <div className="p-2 md:p-4 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="h-40 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="socGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="time" tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: 'var(--muted)' }} axisLine={false} tickLine={false} width={30} />
                <Tooltip
                  contentStyle={{ background: 'var(--ink)', border: 'none', borderRadius: '8px', color: 'var(--paper)', fontSize: '11px' }}
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
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
            <div className="eyebrow text-[10px] md:text-xs">What to watch out for</div>
          </div>
          <div className="space-y-2">
            {result.warnings.filter(w => w.severity !== 'info').sort((a, b) => {
              const order = { critical: 0, warn: 1, info: 2 };
              return order[a.severity] - order[b.severity];
            }).map((w, i) => (
              <div
                key={i}
                className="p-2 md:p-4 rounded-lg md:rounded-xl flex items-start gap-2 md:gap-3"
                style={{
                  background: w.severity === 'critical' ? 'var(--danger-soft)' : 'var(--warning-soft)',
                  border: `1px solid ${w.severity === 'critical' ? '#fecaca' : '#fde68a'}`,
                }}
              >
                <span className={`badge ${w.severity === 'critical' ? 'badge-danger' : 'badge-warning'} text-[9px] md:text-xs flex-shrink-0`}>
                  {w.severity}
                </span>
                <div className="flex-1 min-w-0 text-xs md:text-sm">
                  <p className="font-medium leading-snug">{w.message}</p>
                  <p className="text-[10px] md:text-xs mt-1 flex items-start gap-1" style={{ color: 'var(--muted)' }}>
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
        className="w-full flex items-center justify-between p-3 md:p-4 rounded-lg md:rounded-xl text-left transition-colors min-h-[48px]"
        style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <span className="text-xs md:text-sm font-medium">Show the math</span>
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
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-lg md:text-xl font-medium tracking-tight mb-1 md:mb-2">Cost analysis</h2>
        <p className="text-xs md:text-sm" style={{ color: 'var(--muted)' }}>Monthly savings and payback based on your tariff and solar generation.</p>
      </div>

      <div className="grid grid-cols-1 gap-2 md:gap-3 md:grid-cols-3">
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-1 md:mb-2 text-[10px] md:text-xs">Monthly bill (no solar)</div>
          <div className="text-xl md:text-2xl font-medium num">৳{costs.monthlyBillNoSolar.toFixed(0)}</div>
        </div>
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--success-soft)', border: '1px solid #bbf7d0' }}>
          <div className="eyebrow mb-1 md:mb-2 text-[10px] md:text-xs" style={{ color: 'var(--success)' }}>Monthly savings</div>
          <div className="text-xl md:text-2xl font-medium num" style={{ color: 'var(--success)' }}>৳{costs.monthlySavings.toFixed(0)}</div>
        </div>
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="eyebrow mb-1 md:mb-2 text-[10px] md:text-xs">System cost</div>
          <div className="text-xl md:text-2xl font-medium num break-all">৳{costs.systemCost.toLocaleString()}</div>
        </div>
      </div>

      {costs.simplePaybackYears !== null && (
        <div className="p-3 md:p-5 rounded-xl md:rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-2" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
          <div>
            <div className="eyebrow mb-1 text-[10px] md:text-xs">Simple payback</div>
            <div className="text-xl md:text-2xl font-medium num">{costs.simplePaybackYears.toFixed(1)} years</div>
          </div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>
            {costs.simplePaybackYears > 10 ? 'Long payback — verify assumptions' : 'Reasonable payback period'}
          </div>
        </div>
      )}

      <div className="p-3 md:p-5 rounded-xl md:rounded-2xl space-y-2 md:space-y-3" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
        <div className="eyebrow text-[10px] md:text-xs">Details</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3 text-xs md:text-sm">
          <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Battery life</span>
            <span className="num font-medium">{costs.batteryLifeYears.toFixed(1)} years</span>
          </div>
          <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>৳/kWh delivered</span>
            <span className="num font-medium">৳{costs.costPerKwhDelivered.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <span style={{ color: 'var(--muted)' }}>Annual savings</span>
            <span className="num font-medium">৳{costs.annualSavings.toFixed(0)}</span>
          </div>
          {project.pv && (
            <div className="flex justify-between py-1.5" style={{ borderBottom: '1px solid var(--border)' }}>
              <span style={{ color: 'var(--muted)' }}>Solar/day</span>
              <span className="num font-medium">{(result.solarGeneratedWh / 1000).toFixed(1)} kWh</span>
            </div>
          )}
        </div>
      </div>

      {/* Questions for installer */}
      <div className="p-3 md:p-5 rounded-xl md:rounded-2xl" style={{ background: 'var(--paper-warm)', border: '1px solid var(--border)' }}>
        <div className="eyebrow mb-2 md:mb-3 text-[10px] md:text-xs">Questions to ask your installer</div>
        <ul className="space-y-2 md:space-y-3 text-xs md:text-sm">
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
    <div className="p-2 md:p-3 rounded-lg md:rounded-xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <div className="eyebrow mb-0.5 md:mb-1 text-[10px] md:text-xs">{label}</div>
      <div className="text-base md:text-lg num font-medium">{value}</div>
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
