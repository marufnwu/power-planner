import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Project, LoadItem } from '../types';
import { createDefaultProject, encodeProject } from '../lib/state';
import { runSimulation } from '../lib/engine/calculator';
import { applianceTemplates } from '../data/catalogs';
import { generateHourlyProfile } from '../lib/usageProfiles';
import { Building2, AlertTriangle, CheckCircle, XCircle, Zap, Battery, Sun } from 'lucide-react';

type BusinessType = 'clinic' | 'shop' | 'office' | 'restaurant' | 'custom';

interface BusinessPreset {
  type: BusinessType;
  name: string;
  criticalLoads: string[];
  importantLoads: string[];
  sheddableLoads: string[];
}

const businessPresets: Record<BusinessType, BusinessPreset> = {
  clinic: {
    type: 'clinic',
    name: 'Medical Clinic',
    criticalLoads: ['medical-device', 'refrigerator'], // Vaccine fridge, medical equipment
    importantLoads: ['led-bulb', 'wifi-router', 'laptop'],
    sheddableLoads: ['air-conditioner', 'led-tv'],
  },
  shop: {
    type: 'shop',
    name: 'Retail Shop',
    criticalLoads: ['led-bulb', 'wifi-router'], // Lighting, POS system
    importantLoads: ['air-conditioner', 'led-tv'],
    sheddableLoads: ['ceiling-fan'],
  },
  office: {
    type: 'office',
    name: 'Office',
    criticalLoads: ['desktop-pc', 'wifi-router', 'laptop'],
    importantLoads: ['led-bulb', 'air-conditioner'],
    sheddableLoads: ['led-tv', 'water-pump'],
  },
  restaurant: {
    type: 'restaurant',
    name: 'Restaurant',
    criticalLoads: ['refrigerator', 'led-bulb'],
    importantLoads: ['air-conditioner', 'wifi-router'],
    sheddableLoads: ['led-tv', 'ceiling-fan'],
  },
  custom: {
    type: 'custom',
    name: 'Custom Business',
    criticalLoads: [],
    importantLoads: [],
    sheddableLoads: [],
  },
};

export function BusinessModePage() {
  const navigate = useNavigate();
  const [businessType, setBusinessType] = useState<BusinessType>('clinic');
  const [criticalLoads, setCriticalLoads] = useState<LoadItem[]>([]);
  const [importantLoads, setImportantLoads] = useState<LoadItem[]>([]);
  const [sheddableLoads, setSheddableLoads] = useState<LoadItem[]>([]);
  const [outageMinutes, setOutageMinutes] = useState(120);
  const [gridMinutes, setGridMinutes] = useState(180);

  // Load preset when business type changes
  const loadPreset = (type: BusinessType) => {
    setBusinessType(type);
    const preset = businessPresets[type];
    
    const createLoads = (templateIds: string[], priority: 1 | 2 | 3): LoadItem[] => {
      return templateIds.map((id, idx) => {
        const tmpl = applianceTemplates.find(t => t.id === id);
        if (!tmpl) return null;
        return {
          id: `business-${priority}-${idx}`,
          templateId: tmpl.id,
          label: tmpl.name,
          qty: 1,
          watts: tmpl.watts,
          powerFactor: tmpl.powerFactor,
          surgeMultiplier: tmpl.surgeMultiplier,
          dutyCycle: tmpl.dutyCycle,
          hourly: generateHourlyProfile(tmpl.defaultUsage, tmpl.category),
          onBackupCircuit: true,
          priority,
          usageProfile: tmpl.defaultUsage,
        };
      }).filter(Boolean) as LoadItem[];
    };

    setCriticalLoads(createLoads(preset.criticalLoads, 1));
    setImportantLoads(createLoads(preset.importantLoads, 2));
    setSheddableLoads(createLoads(preset.sheddableLoads, 3));
  };

  // Initialize with clinic preset
  useState(() => {
    loadPreset('clinic');
  });

  const addLoad = (tier: 'critical' | 'important' | 'sheddable', templateId: string) => {
    const tmpl = applianceTemplates.find(t => t.id === templateId);
    if (!tmpl) return;

    const priority = tier === 'critical' ? 1 : tier === 'important' ? 2 : 3;
    const newLoad: LoadItem = {
      id: `business-${tier}-${Date.now()}`,
      templateId: tmpl.id,
      label: tmpl.name,
      qty: 1,
      watts: tmpl.watts,
      powerFactor: tmpl.powerFactor,
      surgeMultiplier: tmpl.surgeMultiplier,
      dutyCycle: tmpl.dutyCycle,
      hourly: generateHourlyProfile(tmpl.defaultUsage, tmpl.category),
      onBackupCircuit: true,
      priority,
      usageProfile: tmpl.defaultUsage,
    };

    if (tier === 'critical') setCriticalLoads([...criticalLoads, newLoad]);
    else if (tier === 'important') setImportantLoads([...importantLoads, newLoad]);
    else setSheddableLoads([...sheddableLoads, newLoad]);
  };

  const removeLoad = (tier: 'critical' | 'important' | 'sheddable', id: string) => {
    if (tier === 'critical') setCriticalLoads(criticalLoads.filter(l => l.id !== id));
    else if (tier === 'important') setImportantLoads(importantLoads.filter(l => l.id !== id));
    else setSheddableLoads(sheddableLoads.filter(l => l.id !== id));
  };

  const generateProject = () => {
    const project = createDefaultProject();
    project.loads = [...criticalLoads, ...importantLoads, ...sheddableLoads];
    project.grid = {
      ...project.grid,
      outageMinutes,
      gridMinutes,
    };
    return project;
  };

  const previewResults = () => {
    const project = generateProject();
    const result = runSimulation(project);
    const encoded = encodeProject(project);
    navigate(`/plan?s=${encoded}&v=1`);
  };

  const totalCriticalW = criticalLoads.reduce((sum, l) => sum + l.qty * l.watts, 0);
  const totalImportantW = importantLoads.reduce((sum, l) => sum + l.qty * l.watts, 0);
  const totalSheddableW = sheddableLoads.reduce((sum, l) => sum + l.qty * l.watts, 0);

  return (
    <div className="pt-24 pb-16">
      <div className="container-ultra">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8" style={{ color: 'var(--accent)' }} />
            <h1 className="display-lg">Business Mode</h1>
          </div>
          <p className="text-base" style={{ color: 'var(--muted)' }}>
            Configure critical equipment with priority-based load shedding for businesses, clinics, and offices.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Configuration */}
          <div className="lg:col-span-7 space-y-6">
            {/* Business Type Selection */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-4">Business Type</h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {(Object.keys(businessPresets) as BusinessType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => loadPreset(type)}
                    className="p-3 rounded-lg text-sm font-medium transition-all"
                    style={{
                      background: businessType === type ? 'var(--ink)' : 'var(--paper-warm)',
                      color: businessType === type ? 'var(--paper)' : 'var(--ink)',
                      border: `1px solid ${businessType === type ? 'var(--ink)' : 'var(--border)'}`,
                    }}
                  >
                    {businessPresets[type].name}
                  </button>
                ))}
              </div>
            </div>

            {/* Critical Loads - Priority 1 */}
            <LoadTierSection
              title="Critical Equipment (Priority 1)"
              description="These loads will NEVER be shed. Must stay on during outages."
              icon={<XCircle className="w-5 h-5" style={{ color: 'var(--danger)' }} />}
              loads={criticalLoads}
              tier="critical"
              onAdd={addLoad}
              onRemove={removeLoad}
              totalW={totalCriticalW}
              color="var(--danger)"
            />

            {/* Important Loads - Priority 2 */}
            <LoadTierSection
              title="Important Equipment (Priority 2)"
              description="These loads will be shed only if critical loads need power."
              icon={<AlertTriangle className="w-5 h-5" style={{ color: 'var(--warning)' }} />}
              loads={importantLoads}
              tier="important"
              onAdd={addLoad}
              onRemove={removeLoad}
              totalW={totalImportantW}
              color="var(--warning)"
            />

            {/* Sheddable Loads - Priority 3 */}
            <LoadTierSection
              title="Sheddable Equipment (Priority 3)"
              description="These loads will be shed first to preserve battery for critical equipment."
              icon={<CheckCircle className="w-5 h-5" style={{ color: 'var(--success)' }} />}
              loads={sheddableLoads}
              tier="sheddable"
              onAdd={addLoad}
              onRemove={removeLoad}
              totalW={totalSheddableW}
              color="var(--success)"
            />
          </div>

          {/* Right: Summary & Actions */}
          <div className="lg:col-span-5 space-y-6">
            {/* Outage Pattern */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-4">Outage Pattern</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Outage Duration</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={30}
                      max={480}
                      step={30}
                      value={outageMinutes}
                      onChange={e => setOutageMinutes(+e.target.value)}
                      className="flex-1"
                    />
                    <span className="num font-semibold text-lg w-20 text-right">{outageMinutes} min</span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Grid Time Between Outages</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={60}
                      max={480}
                      step={30}
                      value={gridMinutes}
                      onChange={e => setGridMinutes(+e.target.value)}
                      className="flex-1"
                    />
                    <span className="num font-semibold text-lg w-20 text-right">{gridMinutes} min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Power Summary */}
            <div className="p-5 rounded-2xl" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <h2 className="font-semibold mb-4">Power Summary</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--danger-soft)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--danger)' }}>Critical Loads</span>
                  <span className="num font-bold text-lg" style={{ color: 'var(--danger)' }}>{totalCriticalW}W</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--warning-soft)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--warning)' }}>Important Loads</span>
                  <span className="num font-bold text-lg" style={{ color: 'var(--warning)' }}>{totalImportantW}W</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg" style={{ background: 'var(--success-soft)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--success)' }}>Sheddable Loads</span>
                  <span className="num font-bold text-lg" style={{ color: 'var(--success)' }}>{totalSheddableW}W</span>
                </div>
                <div className="pt-3 mt-3" style={{ borderTop: '2px solid var(--border)' }}>
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total Connected</span>
                    <span className="num font-bold text-xl">{totalCriticalW + totalImportantW + totalSheddableW}W</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <button onClick={previewResults} className="btn-primary w-full py-3">
                Preview Results →
              </button>
              <button
                onClick={() => {
                  const project = generateProject();
                  const encoded = encodeProject(project);
                  navigate(`/plan?s=${encoded}&v=1`);
                }}
                className="btn-secondary w-full py-3"
              >
                Open in Planner
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LoadTierSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  loads: LoadItem[];
  tier: 'critical' | 'important' | 'sheddable';
  onAdd: (tier: 'critical' | 'important' | 'sheddable', templateId: string) => void;
  onRemove: (tier: 'critical' | 'important' | 'sheddable', id: string) => void;
  totalW: number;
  color: string;
}

function LoadTierSection({ title, description, icon, loads, tier, onAdd, onRemove, totalW, color }: LoadTierSectionProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: `2px solid ${color}` }}>
      <div className="p-4" style={{ background: `${color}15` }}>
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <h2 className="font-semibold">{title}</h2>
        </div>
        <p className="text-xs" style={{ color: 'var(--muted)' }}>{description}</p>
      </div>

      <div className="p-4 space-y-2">
        {loads.map(load => (
          <div key={load.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
            <div className="flex-1">
              <div className="font-medium text-sm">{load.label}</div>
              <div className="text-xs num" style={{ color: 'var(--muted)' }}>
                {load.qty}× {load.watts}W = {load.qty * load.watts}W
              </div>
            </div>
            <button
              onClick={() => onRemove(tier, load.id)}
              className="p-2 rounded hover:bg-red-100 transition-colors"
              style={{ color: 'var(--danger)' }}
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        ))}

        <button
          onClick={() => setShowAddMenu(!showAddMenu)}
          className="w-full p-3 rounded-lg border-2 border-dashed text-sm font-medium transition-colors hover:bg-[var(--paper-warm)]"
          style={{ borderColor: color, color }}
        >
          + Add Equipment
        </button>

        {showAddMenu && (
          <div className="mt-2 p-3 rounded-lg space-y-2 max-h-48 overflow-y-auto" style={{ background: 'var(--paper-warm)' }}>
            {applianceTemplates.filter(t => t.inverterFriendly !== 'avoid').map(tmpl => (
              <button
                key={tmpl.id}
                onClick={() => {
                  onAdd(tier, tmpl.id);
                  setShowAddMenu(false);
                }}
                className="w-full p-2 rounded text-left text-sm hover:bg-[var(--surface)] transition-colors"
              >
                <div className="font-medium">{tmpl.name}</div>
                <div className="text-xs num" style={{ color: 'var(--muted)' }}>{tmpl.watts}W</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
