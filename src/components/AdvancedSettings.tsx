import { useState } from 'react';
import { Settings, Thermometer, Calendar, Gauge, Shield, ChevronDown, ChevronUp } from 'lucide-react';

interface AdvancedSettingsProps {
  settings: CalculationSettings;
  onChange: (settings: CalculationSettings) => void;
}

export interface CalculationSettings {
  // Temperature
  ambientTempC: number;
  batteryRoomTempC: number;
  
  // Battery
  batteryAgeYears: number;
  batteryHealthPct: number; // 100 = new, 80 = end of life
  
  // Efficiency
  inverterEfficiencyPct: number;
  batteryChargeEfficiencyPct: number;
  batteryDischargeEfficiencyPct: number;
  
  // Losses
  wiringLossPct: number;
  soilingLossPct: number;
  mismatchLossPct: number;
  
  // Safety
  inverterSafetyMarginPct: number;
  batterySafetyMarginPct: number;
  solarSafetyMarginPct: number;
  
  // Load
  diversityFactor: number; // 0.6-1.0
  powerFactor: number; // 0.6-1.0
  
  // Solar
  panelDegradationPctPerYear: number;
  noctC: number; // Nominal Operating Cell Temperature
}

export const defaultSettings: CalculationSettings = {
  // Temperature
  ambientTempC: 30,
  batteryRoomTempC: 30,
  
  // Battery
  batteryAgeYears: 0,
  batteryHealthPct: 100,
  
  // Efficiency
  inverterEfficiencyPct: 90,
  batteryChargeEfficiencyPct: 95,
  batteryDischargeEfficiencyPct: 95,
  
  // Losses
  wiringLossPct: 2,
  soilingLossPct: 5,
  mismatchLossPct: 3,
  
  // Safety
  inverterSafetyMarginPct: 25,
  batterySafetyMarginPct: 20,
  solarSafetyMarginPct: 15,
  
  // Load
  diversityFactor: 0.8,
  powerFactor: 0.85,
  
  // Solar
  panelDegradationPctPerYear: 0.5,
  noctC: 45,
};

export function AdvancedSettings({ settings, onChange }: AdvancedSettingsProps) {
  const [expanded, setExpanded] = useState(false);
  
  const updateSetting = (key: keyof CalculationSettings, value: number) => {
    onChange({ ...settings, [key]: value });
  };
  
  return (
    <div className="rounded-2xl" style={{ border: '1px solid var(--border)', background: 'var(--surface)' }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--paper-warm)] transition-colors rounded-2xl"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <span className="text-sm font-medium">Advanced calculation settings</span>
          <span className="badge badge-outline text-[10px]">Optional</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 space-y-6 border-t" style={{ borderColor: 'var(--border)' }}>
          <p className="text-xs pt-4" style={{ color: 'var(--muted)' }}>
            Adjust these parameters to match your actual conditions. Changes affect all calculations in real-time.
          </p>
          
          {/* Temperature */}
          <SettingSection
            icon={<Thermometer className="w-4 h-4" />}
            title="Temperature"
            description="Affects battery capacity and solar output"
          >
            <SettingRow
              label="Ambient temperature"
              value={settings.ambientTempC}
              unit="°C"
              min={0}
              max={50}
              step={1}
              onChange={(v) => updateSetting('ambientTempC', v)}
              description="Outdoor temperature (affects solar panel output)"
            />
            <SettingRow
              label="Battery room temperature"
              value={settings.batteryRoomTempC}
              unit="°C"
              min={0}
              max={50}
              step={1}
              onChange={(v) => updateSetting('batteryRoomTempC', v)}
              description="Indoor temperature where battery is installed"
            />
          </SettingSection>
          
          {/* Battery */}
          <SettingSection
            icon={<Calendar className="w-4 h-4" />}
            title="Battery condition"
            description="Age and health affect available capacity"
          >
            <SettingRow
              label="Battery age"
              value={settings.batteryAgeYears}
              unit="years"
              min={0}
              max={15}
              step={0.5}
              onChange={(v) => updateSetting('batteryAgeYears', v)}
              description="How old is the battery? (affects capacity)"
            />
            <SettingRow
              label="Battery health"
              value={settings.batteryHealthPct}
              unit="%"
              min={50}
              max={100}
              step={5}
              onChange={(v) => updateSetting('batteryHealthPct', v)}
              description="Current health (100% = new, 80% = end of life)"
            />
          </SettingSection>
          
          {/* Efficiency */}
          <SettingSection
            icon={<Gauge className="w-4 h-4" />}
            title="Efficiency"
            description="Energy losses in conversion and storage"
          >
            <SettingRow
              label="Inverter efficiency"
              value={settings.inverterEfficiencyPct}
              unit="%"
              min={70}
              max={98}
              step={1}
              onChange={(v) => updateSetting('inverterEfficiencyPct', v)}
              description="DC to AC conversion efficiency"
            />
            <SettingRow
              label="Battery charge efficiency"
              value={settings.batteryChargeEfficiencyPct}
              unit="%"
              min={80}
              max={99}
              step={1}
              onChange={(v) => updateSetting('batteryChargeEfficiencyPct', v)}
              description="Energy lost during charging"
            />
            <SettingRow
              label="Battery discharge efficiency"
              value={settings.batteryDischargeEfficiencyPct}
              unit="%"
              min={80}
              max={99}
              step={1}
              onChange={(v) => updateSetting('batteryDischargeEfficiencyPct', v)}
              description="Energy lost during discharging"
            />
          </SettingSection>
          
          {/* Losses */}
          <SettingSection
            icon={<Shield className="w-4 h-4" />}
            title="System losses"
            description="Energy lost in wiring and connections"
          >
            <SettingRow
              label="Wiring losses"
              value={settings.wiringLossPct}
              unit="%"
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateSetting('wiringLossPct', v)}
              description="Voltage drop in cables"
            />
            <SettingRow
              label="Solar panel soiling"
              value={settings.soilingLossPct}
              unit="%"
              min={0}
              max={20}
              step={1}
              onChange={(v) => updateSetting('soilingLossPct', v)}
              description="Dust, dirt, bird droppings"
            />
            <SettingRow
              label="Panel mismatch"
              value={settings.mismatchLossPct}
              unit="%"
              min={0}
              max={10}
              step={0.5}
              onChange={(v) => updateSetting('mismatchLossPct', v)}
              description="Variations between panels"
            />
          </SettingSection>
          
          {/* Safety margins */}
          <SettingSection
            icon={<Shield className="w-4 h-4" />}
            title="Safety margins"
            description="Extra capacity for reliability"
          >
            <SettingRow
              label="Inverter margin"
              value={settings.inverterSafetyMarginPct}
              unit="%"
              min={10}
              max={50}
              step={5}
              onChange={(v) => updateSetting('inverterSafetyMarginPct', v)}
              description="Extra capacity above peak load"
            />
            <SettingRow
              label="Battery margin"
              value={settings.batterySafetyMarginPct}
              unit="%"
              min={10}
              max={50}
              step={5}
              onChange={(v) => updateSetting('batterySafetyMarginPct', v)}
              description="Extra capacity for unexpected loads"
            />
            <SettingRow
              label="Solar margin"
              value={settings.solarSafetyMarginPct}
              unit="%"
              min={10}
              max={30}
              step={5}
              onChange={(v) => updateSetting('solarSafetyMarginPct', v)}
              description="Extra capacity for cloudy days"
            />
          </SettingSection>
          
          {/* Load characteristics */}
          <SettingSection
            icon={<Gauge className="w-4 h-4" />}
            title="Load characteristics"
            description="How your loads actually behave"
          >
            <SettingRow
              label="Diversity factor"
              value={settings.diversityFactor}
              unit=""
              min={0.5}
              max={1.0}
              step={0.05}
              onChange={(v) => updateSetting('diversityFactor', v)}
              description="Not all loads run at once (0.6-0.8 typical)"
              decimals={2}
            />
            <SettingRow
              label="Power factor"
              value={settings.powerFactor}
              unit=""
              min={0.6}
              max={1.0}
              step={0.05}
              onChange={(v) => updateSetting('powerFactor', v)}
              description="Real power vs apparent power (0.8-0.95 typical)"
              decimals={2}
            />
          </SettingSection>
          
          {/* Solar specifics */}
          <SettingSection
            icon={<Thermometer className="w-4 h-4" />}
            title="Solar panel specifics"
            description="Panel characteristics and degradation"
          >
            <SettingRow
              label="Panel degradation"
              value={settings.panelDegradationPctPerYear}
              unit="%/year"
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => updateSetting('panelDegradationPctPerYear', v)}
              description="Annual output reduction"
              decimals={1}
            />
            <SettingRow
              label="NOCT (Nominal Operating Cell Temp)"
              value={settings.noctC}
              unit="°C"
              min={40}
              max={50}
              step={1}
              onChange={(v) => updateSetting('noctC', v)}
              description="Panel temperature at standard conditions"
            />
          </SettingSection>
          
          {/* Reset button */}
          <div className="pt-4 border-t" style={{ borderColor: 'var(--border)' }}>
            <button
              onClick={() => onChange(defaultSettings)}
              className="btn-ghost text-xs"
            >
              Reset to defaults
            </button>
            <p className="text-[10px] mt-2" style={{ color: 'var(--muted)' }}>
              Defaults are conservative estimates. Adjust based on your actual equipment datasheets and site conditions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingSection({ icon, title, description, children }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <span style={{ color: 'var(--muted)' }}>{icon}</span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{description}</div>
        </div>
      </div>
      <div className="space-y-3 pl-6">
        {children}
      </div>
    </div>
  );
}

function SettingRow({ label, value, unit, min, max, step, onChange, description, decimals = 0 }: {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description: string;
  decimals?: number;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="text-xs font-medium">{label}</label>
        <div className="flex items-baseline gap-1">
          <span className="num text-sm font-medium">{value.toFixed(decimals)}</span>
          <span className="text-xs" style={{ color: 'var(--muted)' }}>{unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full"
      />
      <div className="text-[10px] mt-1" style={{ color: 'var(--muted)' }}>
        {description}
      </div>
    </div>
  );
}
