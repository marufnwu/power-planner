import { UsageProfile } from '../types';
import { generateHourlyProfile, getUsageLabel } from '../lib/usageProfiles';
import { Sun, Moon, Sunrise, Circle } from 'lucide-react';

interface HourlyUsageEditorProps {
  hourly: number[];
  usageProfile: UsageProfile;
  onChange: (hourly: number[], profile: UsageProfile) => void;
  label: string;
  compact?: boolean;
}

export function HourlyUsageEditor({ hourly, usageProfile, onChange, label, compact = false }: HourlyUsageEditorProps) {
  // Detect if current hourly pattern matches any preset
  const isCustom = !['both', 'day', 'night', 'occasional'].some(profile => {
    const presetHourly = generateHourlyProfile(profile as UsageProfile);
    return hourly.every((val, i) => Math.abs(val - presetHourly[i]) < 0.01);
  });
  
  const handlePresetChange = (newProfile: UsageProfile) => {
    const newHourly = generateHourlyProfile(newProfile);
    onChange(newHourly, newProfile);
  };
  
  const handleHourClick = (hour: number) => {
    const newHourly = [...hourly];
    // Toggle between 0 and 1 (or cycle through 0, 0.5, 1)
    if (newHourly[hour] === 0) newHourly[hour] = 0.5;
    else if (newHourly[hour] === 0.5) newHourly[hour] = 1;
    else newHourly[hour] = 0;
    onChange(newHourly, 'both'); // Mark as custom
  };
  
  // Calculate stats
  const avgUsage = hourly.reduce((a, b) => a + b, 0) / 24;
  const dayUsage = hourly.slice(6, 18).reduce((a, b) => a + b, 0) / 12;
  const nightUsage = [...hourly.slice(0, 6), ...hourly.slice(18)].reduce((a, b) => a + b, 0) / 12;
  
  return (
    <div className={compact ? "space-y-1.5" : "space-y-3"}>
      {!compact && (
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
            Usage pattern for {label}
          </label>
          {isCustom && (
            <span className="badge badge-outline text-[10px]">Custom</span>
          )}
        </div>
      )}
      
      {/* Preset buttons - only in non-compact mode */}
      {!compact && (
        <div className="flex gap-1">
          <button
            onClick={() => handlePresetChange('both')}
            className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
            style={{
              background: usageProfile === 'both' && !isCustom ? 'var(--ink)' : 'var(--surface)',
              color: usageProfile === 'both' && !isCustom ? 'var(--paper)' : 'var(--ink)',
              border: `1px solid ${usageProfile === 'both' && !isCustom ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            <Sunrise className="w-3 h-3" />
            <span>All day</span>
          </button>
          <button
            onClick={() => handlePresetChange('day')}
            className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
            style={{
              background: usageProfile === 'day' && !isCustom ? 'var(--ink)' : 'var(--surface)',
              color: usageProfile === 'day' && !isCustom ? 'var(--paper)' : 'var(--ink)',
              border: `1px solid ${usageProfile === 'day' && !isCustom ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            <Sun className="w-3 h-3" />
            <span>Day</span>
          </button>
          <button
            onClick={() => handlePresetChange('night')}
            className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
            style={{
              background: usageProfile === 'night' && !isCustom ? 'var(--ink)' : 'var(--surface)',
              color: usageProfile === 'night' && !isCustom ? 'var(--paper)' : 'var(--ink)',
              border: `1px solid ${usageProfile === 'night' && !isCustom ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            <Moon className="w-3 h-3" />
            <span>Night</span>
          </button>
          <button
            onClick={() => handlePresetChange('occasional')}
            className="flex-1 px-2 py-1.5 text-xs rounded-lg transition-all flex items-center justify-center gap-1"
            style={{
              background: usageProfile === 'occasional' && !isCustom ? 'var(--ink)' : 'var(--surface)',
              color: usageProfile === 'occasional' && !isCustom ? 'var(--paper)' : 'var(--ink)',
              border: `1px solid ${usageProfile === 'occasional' && !isCustom ? 'var(--ink)' : 'var(--border)'}`,
            }}
          >
            <Circle className="w-3 h-3" />
            <span>Occasional</span>
          </button>
        </div>
      )}
      
      {/* 24-hour timeline */}
      <div className="relative">
        <div className={`flex gap-px ${compact ? 'mb-0.5' : 'mb-1'}`}>
          {hourly.map((value, hour) => (
            <div
              key={hour}
              className={`flex-1 rounded-sm cursor-pointer transition-all hover:scale-y-110 ${compact ? 'h-5' : 'h-8'}`}
              style={{
                background: value === 0 
                  ? 'var(--border)' 
                  : value === 0.5 
                  ? 'var(--accent)'
                  : 'var(--ink)',
                opacity: value === 0 ? 0.3 : value === 0.5 ? 0.6 : 1,
              }}
              onClick={() => handleHourClick(hour)}
              title={`${hour}:00 - ${value === 0 ? 'Off' : value === 0.5 ? 'Sometimes' : 'On'}`}
            />
          ))}
        </div>
        
        {/* Hour labels - only in non-compact mode */}
        {!compact && (
          <div className="flex gap-px text-[9px] num" style={{ color: 'var(--muted)' }}>
            {Array.from({ length: 24 }, (_, i) => (
              <div key={i} className="flex-1 text-center">
                {i % 3 === 0 ? `${i}` : ''}
              </div>
            ))}
          </div>
        )}
        
        {/* Day/night indicators - only in non-compact mode */}
        {!compact && (
          <div className="flex gap-px mt-1 text-[9px]" style={{ color: 'var(--muted)' }}>
            <div className="flex-1 text-center" style={{ gridColumn: '6 / span 12' }}>
              ☀ Day
            </div>
          </div>
        )}
      </div>
      
      {/* Stats - only in non-compact mode */}
      {!compact && (
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
            <div style={{ color: 'var(--muted)' }}>Average</div>
            <div className="num font-medium">{(avgUsage * 100).toFixed(0)}%</div>
          </div>
          <div className="p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
            <div style={{ color: 'var(--muted)' }}>Day</div>
            <div className="num font-medium">{(dayUsage * 100).toFixed(0)}%</div>
          </div>
          <div className="p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
            <div style={{ color: 'var(--muted)' }}>Night</div>
            <div className="num font-medium">{(nightUsage * 100).toFixed(0)}%</div>
          </div>
        </div>
      )}
      
      {/* Help text - only in non-compact mode */}
      {!compact && (
        <p className="text-[10px]" style={{ color: 'var(--muted)' }}>
          Click hours to toggle: off → sometimes → on. Or use presets above.
        </p>
      )}
    </div>
  );
}
