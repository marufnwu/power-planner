import { useMemo } from 'react';
import { Zap, Sun, Battery, Home, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';

interface AdvancedTopologyProps {
  gridAvailable: boolean;
  solarW: number;
  batterySoC: number;
  loadW: number;
  batteryCharging: boolean;
  inverterOn: boolean;
  hasSolar?: boolean;
  batteryAh?: number;
  inverterVA?: number;
  inverterEfficiency?: number;
  batteryVoltage?: number;
  gridPower?: number;
}

export function AdvancedTopology({
  gridAvailable,
  solarW,
  batterySoC,
  loadW,
  batteryCharging,
  inverterOn,
  hasSolar = false,
  batteryAh = 100,
  inverterVA = 1200,
  inverterEfficiency = 90,
  batteryVoltage = 12.8,
  gridPower = 0,
}: AdvancedTopologyProps) {
  // Calculate power flows
  const batteryPower = batteryCharging ? Math.abs(loadW * 0.3) : loadW;
  const batteryCurrent = batteryPower / batteryVoltage;
  const solarEfficiency = hasSolar && solarW > 0 ? (solarW / (loadW + (batteryCharging ? batteryPower : 0))) * 100 : 0;
  
  return (
    <div className="relative">
      {/* Main SVG Diagram */}
      <svg viewBox="0 0 800 400" className="w-full h-auto" style={{ maxHeight: '400px' }}>
        <defs>
          {/* Gradients */}
          <linearGradient id="solarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="batteryGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gridGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>
          <linearGradient id="inverterGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="100%" stopColor="#0a0a0a" />
          </linearGradient>
          
          {/* Glow filters */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Power flow animation */}
          <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#ff4d1c" />
          </marker>
        </defs>
        
        {/* Background grid */}
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e5e2db" strokeWidth="0.5" opacity="0.3"/>
        </pattern>
        <rect width="800" height="400" fill="url(#grid)" />
        
        {/* ===== GRID (Top Left) ===== */}
        <g transform="translate(100, 80)">
          {/* Grid tower */}
          <rect x="-3" y="-50" width="6" height="100" fill="#4f46e5" opacity="0.3" rx="2" />
          <rect x="-30" y="-50" width="60" height="4" fill="#4f46e5" opacity="0.3" rx="2" />
          <rect x="-30" y="-40" width="60" height="4" fill="#4f46e5" opacity="0.3" rx="2" />
          
          {/* Status indicator */}
          <circle cx="0" cy="0" r="8" fill={gridAvailable ? '#10b981' : '#ef4444'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="2s" repeatCount="indefinite" />
          </circle>
          
          {/* Label */}
          <text x="0" y="30" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)" fontWeight="500">
            GRID
          </text>
          <text x="0" y="45" textAnchor="middle" fontSize="10" fill={gridAvailable ? '#10b981' : '#ef4444'} fontFamily="var(--font-mono)" fontWeight="600">
            {gridAvailable ? '● LIVE' : '○ OUT'}
          </text>
          {gridPower > 0 && (
            <text x="0" y="60" textAnchor="middle" fontSize="9" fill="#6b6b6b" fontFamily="var(--font-mono)">
              {gridPower.toFixed(0)}W
            </text>
          )}
        </g>
        
        {/* ===== SOLAR (Top Right) ===== */}
        {hasSolar && (
          <g transform="translate(700, 80)">
            {/* Sun with rays */}
            <circle cx="0" cy="-30" r="18" fill="url(#solarGradient)" filter="url(#glow)">
              <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite" />
            </circle>
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={Math.cos((angle * Math.PI) / 180) * 22}
                y1={-30 + Math.sin((angle * Math.PI) / 180) * 22}
                x2={Math.cos((angle * Math.PI) / 180) * 28}
                y2={-30 + Math.sin((angle * Math.PI) / 180) * 28}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              >
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              </line>
            ))}
            
            {/* Solar panel */}
            <rect x="-35" y="10" width="70" height="45" rx="3" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="1.5" />
            <line x1="-35" y1="25" x2="35" y2="25" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="-35" y1="40" x2="35" y2="40" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="-12" y1="10" x2="-12" y2="55" stroke="#3b82f6" strokeWidth="0.8" />
            <line x1="12" y1="10" x2="12" y2="55" stroke="#3b82f6" strokeWidth="0.8" />
            
            {/* Label */}
            <text x="0" y="75" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)" fontWeight="500">
              SOLAR
            </text>
            <text x="0" y="90" textAnchor="middle" fontSize="11" fill="#f59e0b" fontFamily="var(--font-mono)" fontWeight="600">
              {solarW > 0 ? `${solarW.toFixed(0)}W` : '—'}
            </text>
            {solarEfficiency > 0 && (
              <text x="0" y="105" textAnchor="middle" fontSize="9" fill="#10b981" fontFamily="var(--font-mono)">
                η {solarEfficiency.toFixed(0)}%
              </text>
            )}
          </g>
        )}
        
        {/* ===== INVERTER (Center) ===== */}
        <g transform="translate(400, 200)">
          {/* Inverter body */}
          <rect x="-80" y="-60" width="160" height="120" rx="10" fill="url(#inverterGradient)" stroke="#333" strokeWidth="2" />
          <rect x="-75" y="-55" width="150" height="110" rx="8" fill="#1a1a1a" />
          
          {/* Display screen */}
          <rect x="-55" y="-35" width="110" height="40" rx="4" fill="#0f172a" stroke="#333" strokeWidth="1" />
          <text x="0" y="-15" textAnchor="middle" fontSize="16" fill={inverterOn ? '#10b981' : '#6b6b6b'} fontFamily="var(--font-mono)" fontWeight="700">
            {inverterOn ? 'ON' : 'OFF'}
          </text>
          <text x="0" y="0" textAnchor="middle" fontSize="10" fill="#6b6b6b" fontFamily="var(--font-mono)">
            {inverterVA}VA · {inverterEfficiency}%
          </text>
          
          {/* Status LEDs */}
          <circle cx="-40" cy="25" r="4" fill={inverterOn ? '#10b981' : '#6b6b6b'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="-20" cy="25" r="4" fill={batteryCharging ? '#fbbf24' : '#6b6b6b'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="25" r="4" fill={loadW > 0 ? '#ff4d1c' : '#6b6b6b'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.6;1" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
          </circle>
          
          {/* Vents */}
          {[-30, -10, 10, 30].map((x, i) => (
            <rect key={i} x={x - 3} y="40" width="6" height="3" fill="#333" rx="1" />
          ))}
          
          {/* Label */}
          <text x="0" y="85" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)" fontWeight="500">
            INVERTER
          </text>
        </g>
        
        {/* ===== BATTERY (Bottom Left) ===== */}
        <g transform="translate(200, 320)">
          {/* Battery body */}
          <rect x="-60" y="-40" width="120" height="80" rx="6" fill="#1a1a1a" stroke="#333" strokeWidth="2" />
          
          {/* Terminal */}
          <rect x="-20" y="-48" width="40" height="10" rx="3" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
          
          {/* Fill level with gradient */}
          <rect
            x="-55"
            y={35 - (batterySoC / 100) * 70}
            width="110"
            height={(batterySoC / 100) * 70}
            rx="3"
            fill="url(#batteryGradient)"
            opacity="0.9"
          >
            <animate attributeName="opacity" values="0.9;0.7;0.9" dur="3s" repeatCount="indefinite" />
          </rect>
          
          {/* SoC text */}
          <text x="0" y="5" textAnchor="middle" fontSize="20" fill="white" fontFamily="var(--font-mono)" fontWeight="700">
            {Math.round(batterySoC)}%
          </text>
          
          {/* Status indicator */}
          <circle cx="40" cy="-25" r="5" fill={batteryCharging ? '#10b981' : '#f59e0b'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
          </circle>
          
          {/* Label */}
          <text x="0" y="65" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)" fontWeight="500">
            BATTERY
          </text>
          <text x="0" y="80" textAnchor="middle" fontSize="10" fill="#0a0a0a" fontFamily="var(--font-mono)" fontWeight="600">
            {batteryAh}Ah · {batteryVoltage}V
          </text>
          <text x="0" y="95" textAnchor="middle" fontSize="9" fill={batteryCharging ? '#10b981' : '#f59e0b'} fontFamily="var(--font-mono)" fontWeight="500">
            {batteryCharging ? '↻ CHARGING' : '↯ DISCHARGING'}
          </text>
          <text x="0" y="110" textAnchor="middle" fontSize="9" fill="#6b6b6b" fontFamily="var(--font-mono)">
            {batteryCurrent.toFixed(1)}A
          </text>
        </g>
        
        {/* ===== LOADS (Bottom Right) ===== */}
        <g transform="translate(600, 320)">
          {/* House icon */}
          <path d="M -40 -15 L 0 -45 L 40 -15 L 40 30 L -40 30 Z" fill="#fafaf7" stroke="#0a0a0a" strokeWidth="2" />
          <rect x="-10" y="5" width="20" height="25" fill="#0a0a0a" />
          
          {/* Light bulb */}
          <circle cx="0" cy="-10" r="6" fill={loadW > 0 ? '#fbbf24' : '#e5e2db'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite" />
          </circle>
          
          {/* Label */}
          <text x="0" y="55" textAnchor="middle" fontSize="11" fill="#6b6b6b" fontFamily="var(--font-mono)" fontWeight="500">
            LOADS
          </text>
          <text x="0" y="70" textAnchor="middle" fontSize="11" fill="#0a0a0a" fontFamily="var(--font-mono)" fontWeight="600">
            {loadW > 0 ? `${loadW.toFixed(0)}W` : '—'}
          </text>
        </g>
        
        {/* ===== POWER FLOW LINES ===== */}
        {/* Grid → Inverter */}
        <path
          d="M 160 110 Q 250 150 320 180"
          fill="none"
          stroke={gridAvailable ? '#4f46e5' : '#e5e2db'}
          strokeWidth={gridAvailable ? 3 : 1.5}
          strokeDasharray={gridAvailable ? '8 4' : '0'}
          opacity={gridAvailable ? 0.8 : 0.3}
          markerEnd={gridAvailable ? 'url(#arrowhead)' : ''}
        >
          {gridAvailable && (
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
          )}
        </path>
        
        {/* Solar → Inverter */}
        {hasSolar && (
          <path
            d="M 640 130 Q 550 160 480 180"
            fill="none"
            stroke={solarW > 0 ? '#f59e0b' : '#e5e2db'}
            strokeWidth={solarW > 0 ? 2 + (solarW / 1000) * 2 : 1.5}
            strokeDasharray={solarW > 0 ? '8 4' : '0'}
            opacity={solarW > 0 ? 0.8 : 0.3}
            markerEnd={solarW > 0 ? 'url(#arrowhead)' : ''}
          >
            {solarW > 0 && (
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
            )}
          </path>
        )}
        
        {/* Inverter → Battery */}
        <path
          d="M 340 240 Q 280 270 240 290"
          fill="none"
          stroke={batteryCharging ? '#10b981' : '#f59e0b'}
          strokeWidth={2 + (batteryPower / 500) * 2}
          strokeDasharray="8 4"
          opacity="0.8"
          markerEnd="url(#arrowhead)"
        >
          <animate attributeName="stroke-dashoffset" from="0" to={batteryCharging ? "-24" : "24"} dur="1s" repeatCount="indefinite" />
        </path>
        
        {/* Inverter → Loads */}
        <path
          d="M 460 240 Q 520 270 560 290"
          fill="none"
          stroke={loadW > 0 ? '#ff4d1c' : '#e5e2db'}
          strokeWidth={loadW > 0 ? 2 + (loadW / 500) * 2 : 1.5}
          strokeDasharray={loadW > 0 ? '8 4' : '0'}
          opacity={loadW > 0 ? 0.8 : 0.3}
          markerEnd={loadW > 0 ? 'url(#arrowhead)' : ''}
        >
          {loadW > 0 && (
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
          )}
        </path>
      </svg>
      
      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#4f46e5' }} />
          <span style={{ color: 'var(--muted)' }}>Grid Power</span>
        </div>
        {hasSolar && (
          <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
            <span style={{ color: 'var(--muted)' }}>Solar Power</span>
          </div>
        )}
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: batteryCharging ? '#10b981' : '#f59e0b' }} />
          <span style={{ color: 'var(--muted)' }}>{batteryCharging ? 'Charging' : 'Discharging'}</span>
        </div>
        <div className="flex items-center gap-2 p-2 rounded-lg" style={{ background: 'var(--paper-warm)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff4d1c' }} />
          <span style={{ color: 'var(--muted)' }}>Load Power</span>
        </div>
      </div>
    </div>
  );
}
