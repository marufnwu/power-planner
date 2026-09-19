import { useState } from 'react';
import { Settings, Thermometer, Battery, Zap, Shield, Sun, ChevronDown, ChevronUp, Info, RotateCcw, Sparkles, AlertCircle } from 'lucide-react';

interface AdvancedSettingsProps {
  settings: CalculationSettings;
  onChange: (settings: CalculationSettings) => void;
}

export interface CalculationSettings {
  ambientTempC: number;
  batteryRoomTempC: number;
  batteryAgeYears: number;
  batteryHealthPct: number;
  inverterEfficiencyPct: number;
  batteryChargeEfficiencyPct: number;
  batteryDischargeEfficiencyPct: number;
  wiringLossPct: number;
  soilingLossPct: number;
  mismatchLossPct: number;
  inverterSafetyMarginPct: number;
  batterySafetyMarginPct: number;
  solarSafetyMarginPct: number;
  diversityFactor: number;
  powerFactor: number;
  panelDegradationPctPerYear: number;
  noctC: number;
}

export const defaultSettings: CalculationSettings = {
  ambientTempC: 30,
  batteryRoomTempC: 30,
  batteryAgeYears: 0,
  batteryHealthPct: 100,
  inverterEfficiencyPct: 90,
  batteryChargeEfficiencyPct: 95,
  batteryDischargeEfficiencyPct: 95,
  wiringLossPct: 2,
  soilingLossPct: 5,
  mismatchLossPct: 3,
  inverterSafetyMarginPct: 25,
  batterySafetyMarginPct: 20,
  solarSafetyMarginPct: 15,
  diversityFactor: 0.8,
  powerFactor: 0.85,
  panelDegradationPctPerYear: 0.5,
  noctC: 45,
};

type ImpactLevel = 'high' | 'medium' | 'low';

interface SettingConfig {
  key: keyof CalculationSettings;
  label: string;
  description: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  recommended: number;
  impact: ImpactLevel;
  example?: string;
}

const settingGroups = [
  {
    id: 'environment',
    title: 'Environment',
    icon: Thermometer,
    color: '#f59e0b',
    description: 'Temperature and conditions',
    settings: [
      {
        key: 'ambientTempC',
        label: 'Outdoor temperature',
        description: 'Affects solar panel output',
        unit: '°C',
        min: 0,
        max: 50,
        step: 1,
        recommended: 30,
        impact: 'medium' as ImpactLevel,
        example: 'Hot summer day: 40°C'
      },
      {
        key: 'batteryRoomTempC',
        label: 'Battery room temperature',
        description: 'Affects battery capacity and life',
        unit: '°C',
        min: 0,
        max: 50,
        step: 1,
        recommended: 25,
        impact: 'high' as ImpactLevel,
        example: 'Well-ventilated room: 25-30°C'
      },
    ] as SettingConfig[]
  },
  {
    id: 'battery',
    title: 'Battery',
    icon: Battery,
    color: '#10b981',
    description: 'Age and condition',
    settings: [
      {
        key: 'batteryAgeYears',
        label: 'Battery age',
        description: 'Older batteries have less capacity',
        unit: 'years',
        min: 0,
        max: 15,
        step: 0.5,
        recommended: 0,
        impact: 'high' as ImpactLevel,
        example: 'New battery: 0 years'
      },
      {
        key: 'batteryHealthPct',
        label: 'Battery health',
        description: 'Current capacity vs new',
        unit: '%',
        min: 50,
        max: 100,
        step: 5,
        recommended: 100,
        impact: 'high' as ImpactLevel,
        example: 'End of life: 80%'
      },
    ] as SettingConfig[]
  },
  {
    id: 'efficiency',
    title: 'Efficiency',
    icon: Zap,
    color: '#3b82f6',
    description: 'Energy conversion losses',
    settings: [
      {
        key: 'inverterEfficiencyPct',
        label: 'Inverter efficiency',
        description: 'DC to AC conversion',
        unit: '%',
        min: 70,
        max: 98,
        step: 1,
        recommended: 90,
        impact: 'high' as ImpactLevel,
        example: 'Good quality: 90-95%'
      },
      {
        key: 'batteryChargeEfficiencyPct',
        label: 'Charging efficiency',
        description: 'Energy lost while charging',
        unit: '%',
        min: 80,
        max: 99,
        step: 1,
        recommended: 95,
        impact: 'medium' as ImpactLevel,
        example: 'LiFePO4: 95-98%'
      },
      {
        key: 'batteryDischargeEfficiencyPct',
        label: 'Discharge efficiency',
        description: 'Energy lost while discharging',
        unit: '%',
        min: 80,
        max: 99,
        step: 1,
        recommended: 95,
        impact: 'medium' as ImpactLevel,
        example: 'LiFePO4: 95-98%'
      },
    ] as SettingConfig[]
  },
  {
    id: 'losses',
    title: 'System Losses',
    icon: AlertCircle,
    color: '#ef4444',
    description: 'Energy lost in the system',
    settings: [
      {
        key: 'wiringLossPct',
        label: 'Wiring losses',
        description: 'Voltage drop in cables',
        unit: '%',
        min: 0,
        max: 10,
        step: 0.5,
        recommended: 2,
        impact: 'low' as ImpactLevel,
        example: 'Proper cables: 1-3%'
      },
      {
        key: 'soilingLossPct',
        label: 'Panel soiling',
        description: 'Dust and dirt on panels',
        unit: '%',
        min: 0,
        max: 20,
        step: 1,
        recommended: 5,
        impact: 'medium' as ImpactLevel,
        example: 'Dusty area: 8-10%'
      },
      {
        key: 'mismatchLossPct',
        label: 'Panel mismatch',
        description: 'Variations between panels',
        unit: '%',
        min: 0,
        max: 10,
        step: 0.5,
        recommended: 3,
        impact: 'low' as ImpactLevel,
        example: 'Same brand/model: 2-3%'
      },
    ] as SettingConfig[]
  },
  {
    id: 'safety',
    title: 'Safety Margins',
    icon: Shield,
    color: '#8b5cf6',
    description: 'Extra capacity for reliability',
    settings: [
      {
        key: 'inverterSafetyMarginPct',
        label: 'Inverter margin',
        description: 'Extra capacity above peak load',
        unit: '%',
        min: 10,
        max: 50,
        step: 5,
        recommended: 25,
        impact: 'medium' as ImpactLevel,
        example: 'Conservative: 30-40%'
      },
      {
        key: 'batterySafetyMarginPct',
        label: 'Battery margin',
        description: 'Extra capacity for unexpected loads',
        unit: '%',
        min: 10,
        max: 50,
        step: 5,
        recommended: 20,
        impact: 'medium' as ImpactLevel,
        example: 'Critical loads: 30%'
      },
      {
        key: 'solarSafetyMarginPct',
        label: 'Solar margin',
        description: 'Extra capacity for cloudy days',
        unit: '%',
        min: 10,
        max: 30,
        step: 5,
        recommended: 15,
        impact: 'low' as ImpactLevel,
        example: 'Reliable weather: 10-15%'
      },
    ] as SettingConfig[]
  },
  {
    id: 'load',
    title: 'Load Behavior',
    icon: Zap,
    color: '#06b6d4',
    description: 'How your loads actually behave',
    settings: [
      {
        key: 'diversityFactor',
        label: 'Diversity factor',
        description: 'Not all loads run at once',
        unit: '',
        min: 0.5,
        max: 1.0,
        step: 0.05,
        recommended: 0.8,
        impact: 'high' as ImpactLevel,
        example: 'Typical home: 0.7-0.8'
      },
      {
        key: 'powerFactor',
        label: 'Power factor',
        description: 'Real power vs apparent power',
        unit: '',
        min: 0.6,
        max: 1.0,
        step: 0.05,
        recommended: 0.85,
        impact: 'medium' as ImpactLevel,
        example: 'Mixed loads: 0.8-0.9'
      },
    ] as SettingConfig[]
  },
  {
    id: 'solar',
    title: 'Solar Panels',
    icon: Sun,
    color: '#f59e0b',
    description: 'Panel characteristics',
    settings: [
      {
        key: 'panelDegradationPctPerYear',
        label: 'Annual degradation',
        description: 'Output reduction per year',
        unit: '%/year',
        min: 0,
        max: 2,
        step: 0.1,
        recommended: 0.5,
        impact: 'low' as ImpactLevel,
        example: 'Quality panels: 0.5-0.7%'
      },
      {
        key: 'noctC',
        label: 'Cell temperature (NOCT)',
        description: 'Panel temp at standard conditions',
        unit: '°C',
        min: 40,
        max: 50,
        step: 1,
        recommended: 45,
        impact: 'low' as ImpactLevel,
        example: 'Typical: 45-48°C'
      },
    ] as SettingConfig[]
  },
];

export function AdvancedSettings({ settings, onChange }: AdvancedSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['environment', 'battery']));
  
  const updateSetting = (key: keyof CalculationSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  };
  
  const toggleGroup = (groupId: string) => {
    const newGroups = new Set(expandedGroups);
    if (newGroups.has(groupId)) {
      newGroups.delete(groupId);
    } else {
      newGroups.add(groupId);
    }
    setExpandedGroups(newGroups);
  };
  
  const isDefault = (key: keyof CalculationSettings) => {
    return settings[key] === defaultSettings[key];
  };
  
  const resetAll = () => {
    onChange(defaultSettings);
  };
  
  const getImpactColor = (impact: ImpactLevel) => {
    switch (impact) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
    }
  };
  
  const getImpactLabel = (impact: ImpactLevel) => {
    switch (impact) {
      case 'high': return 'High impact';
      case 'medium': return 'Medium impact';
      case 'low': return 'Low impact';
    }
  };
  
  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-5 flex items-center justify-between hover:bg-[var(--paper-warm)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'var(--paper-warm)' }}>
            <Settings className="w-5 h-5" style={{ color: 'var(--muted)' }} />
          </div>
          <div className="text-left">
            <div className="font-semibold text-sm">Advanced calculation settings</div>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>Fine-tune for your exact conditions</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-outline text-[10px] flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Optional
          </span>
          {expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>
      
      {/* Content */}
      {expanded && (
        <div className="border-t" style={{ borderColor: 'var(--border)' }}>
          {/* Intro */}
          <div className="p-5 bg-[var(--paper-warm)] border-b" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Adjust these parameters to match your actual conditions. Changes affect all calculations in real-time. 
              <span className="font-medium" style={{ color: 'var(--ink)' }}> High impact</span> settings have the biggest effect on results.
            </p>
          </div>
          
          {/* Setting Groups */}
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {settingGroups.map(group => {
              const Icon = group.icon;
              const isGroupExpanded = expandedGroups.has(group.id);
              
              return (
                <div key={group.id}>
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--paper-warm)] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${group.color}15` }}>
                        <Icon className="w-4 h-4" style={{ color: group.color }} />
                      </div>
                      <div className="text-left">
                        <div className="font-medium text-sm">{group.title}</div>
                        <div className="text-xs" style={{ color: 'var(--muted)' }}>{group.description}</div>
                      </div>
                    </div>
                    {isGroupExpanded ? <ChevronUp className="w-4 h-4" style={{ color: 'var(--muted)' }} /> : <ChevronDown className="w-4 h-4" style={{ color: 'var(--muted)' }} />}
                  </button>
                  
                  {/* Group Settings */}
                  {isGroupExpanded && (
                    <div className="px-5 pb-5 space-y-4">
                      {group.settings.map(setting => {
                        const value = settings[setting.key];
                        const isRecommended = value === setting.recommended;
                        
                        return (
                          <div key={setting.key} className="group">
                            {/* Label and Impact */}
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <label className="text-sm font-medium">{setting.label}</label>
                                  {!isDefault(setting.key) && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent)', color: 'white' }}>
                                      Modified
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--muted)' }}>
                                  {setting.description}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3">
                                <div 
                                  className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                                  style={{ 
                                    background: `${getImpactColor(setting.impact)}15`,
                                    color: getImpactColor(setting.impact)
                                  }}
                                >
                                  {getImpactLabel(setting.impact)}
                                </div>
                              </div>
                            </div>
                            
                            {/* Slider and Value */}
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <input
                                  type="range"
                                  min={setting.min}
                                  max={setting.max}
                                  step={setting.step}
                                  value={value}
                                  onChange={(e) => updateSetting(setting.key, +e.target.value)}
                                  className="w-full"
                                  style={{
                                    background: `linear-gradient(to right, ${group.color} 0%, ${group.color} ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) ${((value - setting.min) / (setting.max - setting.min)) * 100}%, var(--border) 100%)`
                                  }}
                                />
                              </div>
                              <div className="flex items-baseline gap-1 min-w-[80px] justify-end">
                                <span className="text-lg font-semibold num" style={{ color: 'var(--ink)' }}>
                                  {typeof value === 'number' && value % 1 !== 0 ? value.toFixed(2) : value}
                                </span>
                                <span className="text-xs" style={{ color: 'var(--muted)' }}>{setting.unit}</span>
                              </div>
                            </div>
                            
                            {/* Example and Recommended */}
                            <div className="flex items-center justify-between mt-2">
                              {setting.example && (
                                <div className="text-[10px] flex items-center gap-1" style={{ color: 'var(--muted)' }}>
                                  <Info className="w-3 h-3" />
                                  {setting.example}
                                </div>
                              )}
                              {!isRecommended && (
                                <button
                                  onClick={() => updateSetting(setting.key, setting.recommended)}
                                  className="text-[10px] px-2 py-0.5 rounded hover:bg-[var(--paper-warm)] transition-colors flex items-center gap-1"
                                  style={{ color: group.color }}
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  Use recommended ({setting.recommended}{setting.unit})
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Footer */}
          <div className="p-5 bg-[var(--paper-warm)] border-t flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
            <div className="text-xs" style={{ color: 'var(--muted)' }}>
              Defaults are conservative estimates. Adjust based on your actual equipment and conditions.
            </div>
            <button
              onClick={resetAll}
              className="btn-ghost text-xs flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
