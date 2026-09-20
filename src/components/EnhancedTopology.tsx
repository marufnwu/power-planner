import { Zap, Battery, Home, Sun as SunIcon, Wifi } from 'lucide-react';

interface EnhancedTopologyProps {
  gridAvailable: boolean;
  solarW: number;
  batterySoC: number;
  loadW: number;
  batteryCharging: boolean;
  inverterOn: boolean;
  hasSolar?: boolean;
  batteryAh?: number;
  inverterVA?: number;
}

export function EnhancedTopology({
  gridAvailable,
  solarW,
  batterySoC,
  loadW,
  batteryCharging,
  inverterOn,
  hasSolar = false,
  batteryAh = 100,
  inverterVA = 1200,
}: EnhancedTopologyProps) {
  return (
    <div className="relative w-full aspect-video rounded-2xl overflow-hidden" style={{ background: 'var(--paper-warm)' }}>
      {/* Animated background grid */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="var(--ink)" strokeWidth="0.5"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      {/* Main diagram */}
      <svg viewBox="0 0 800 400" className="w-full h-full relative z-10">
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
          
          {/* Glow filter */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>

          {/* Power flow animation */}
          <marker id="flowArrow" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
            <polygon points="0 0, 10 3, 0 6" fill="#ff4d1c" />
          </marker>
        </defs>

        {/* Grid Connection */}
        <g transform="translate(100, 200)">
          {/* Tower */}
          <rect x="-3" y="-80" width="6" height="160" fill="var(--border)" rx="2" />
          <rect x="-30" y="-80" width="60" height="4" fill="var(--border)" rx="2" />
          <rect x="-30" y="-60" width="60" height="4" fill="var(--border)" rx="2" />
          
          {/* Status indicator */}
          <circle cx="0" cy="0" r="12" fill={gridAvailable ? '#10b981' : '#ef4444'} filter="url(#glow)">
            <animate attributeName="r" values="12;14;12" dur="2s" repeatCount="indefinite" />
          </circle>
          <text x="0" y="4" textAnchor="middle" fontSize="10" fill="white" fontWeight="bold">
            {gridAvailable ? '✓' : '✗'}
          </text>
          
          {/* Label */}
          <text x="0" y="40" textAnchor="middle" fontSize="12" fill="var(--ink)" fontWeight="600">
            GRID
          </text>
          <text x="0" y="55" textAnchor="middle" fontSize="10" fill={gridAvailable ? '#10b981' : '#ef4444'}>
            {gridAvailable ? 'LIVE' : 'OUT'}
          </text>
        </g>

        {/* Solar Panels */}
        {hasSolar && (
          <g transform="translate(400, 80)">
            {/* Sun */}
            <circle cx="0" cy="-20" r="20" fill="url(#solarGradient)" filter="url(#glow)">
              <animate attributeName="opacity" values="1;0.8;1" dur="3s" repeatCount="indefinite" />
            </circle>
            
            {/* Sun rays */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <line
                key={i}
                x1={Math.cos((angle * Math.PI) / 180) * 25}
                y1={-20 + Math.sin((angle * Math.PI) / 180) * 25}
                x2={Math.cos((angle * Math.PI) / 180) * 35}
                y2={-20 + Math.sin((angle * Math.PI) / 180) * 35}
                stroke="#fbbf24"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.6"
              >
                <animate attributeName="opacity" values="0.6;0.3;0.6" dur="2s" begin={`${i * 0.2}s`} repeatCount="indefinite" />
              </line>
            ))}
            
            {/* Solar panel array */}
            <rect x="-50" y="20" width="100" height="60" rx="4" fill="#1e3a8a" stroke="#3b82f6" strokeWidth="2" />
            <line x1="-50" y1="40" x2="50" y2="40" stroke="#3b82f6" strokeWidth="1" />
            <line x1="-50" y1="60" x2="50" y2="60" stroke="#3b82f6" strokeWidth="1" />
            <line x1="-17" y1="20" x2="-17" y2="80" stroke="#3b82f6" strokeWidth="1" />
            <line x1="17" y1="20" x2="17" y2="80" stroke="#3b82f6" strokeWidth="1" />
            
            {/* Label */}
            <text x="0" y="100" textAnchor="middle" fontSize="12" fill="var(--ink)" fontWeight="600">
              SOLAR
            </text>
            <text x="0" y="115" textAnchor="middle" fontSize="11" fill="#f59e0b" fontWeight="600">
              {solarW > 0 ? `${solarW.toFixed(0)}W` : '—'}
            </text>
          </g>
        )}

        {/* Inverter */}
        <g transform="translate(400, 200)">
          {/* Inverter body */}
          <rect x="-60" y="-40" width="120" height="80" rx="8" fill="var(--ink)" stroke="var(--border)" strokeWidth="2" />
          <rect x="-55" y="-35" width="110" height="70" rx="6" fill="var(--paper)" />
          
          {/* Display screen */}
          <rect x="-40" y="-25" width="80" height="30" rx="4" fill="#0f172a" stroke="var(--border)" strokeWidth="1" />
          <text x="0" y="-10" textAnchor="middle" fontSize="14" fill={inverterOn ? '#10b981' : 'var(--muted)'} fontWeight="700">
            {inverterOn ? 'ON' : 'OFF'}
          </text>
          <text x="0" y="5" textAnchor="middle" fontSize="9" fill="var(--muted)">
            {inverterVA}VA
          </text>
          
          {/* Status LEDs */}
          <circle cx="-30" cy="20" r="3" fill={inverterOn ? '#10b981' : 'var(--muted)'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" repeatCount="indefinite" />
          </circle>
          <circle cx="-15" cy="20" r="3" fill={batteryCharging ? '#fbbf24' : 'var(--muted)'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" begin="0.3s" repeatCount="indefinite" />
          </circle>
          <circle cx="0" cy="20" r="3" fill={loadW > 0 ? '#ff4d1c' : 'var(--muted)'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1.5s" begin="0.6s" repeatCount="indefinite" />
          </circle>
          
          {/* Vents */}
          {[-20, -10, 0, 10, 20].map((x, i) => (
            <rect key={i} x={x - 2} y="30" width="4" height="2" fill="var(--border)" rx="1" />
          ))}
          
          {/* Label */}
          <text x="0" y="60" textAnchor="middle" fontSize="12" fill="var(--ink)" fontWeight="600">
            INVERTER
          </text>
        </g>

        {/* Battery */}
        <g transform="translate(200, 320)">
          {/* Battery body */}
          <rect x="-50" y="-30" width="100" height="60" rx="6" fill="var(--ink)" stroke="var(--border)" strokeWidth="2" />
          
          {/* Terminal */}
          <rect x="-15" y="-38" width="30" height="10" rx="3" fill="var(--ink)" stroke="var(--border)" strokeWidth="2" />
          
          {/* Fill level */}
          <rect
            x="-45"
            y={25 - (batterySoC / 100) * 50}
            width="90"
            height={(batterySoC / 100) * 50}
            rx="3"
            fill="url(#batteryGradient)"
            opacity="0.9"
          >
            <animate attributeName="opacity" values="0.9;0.7;0.9" dur="3s" repeatCount="indefinite" />
          </rect>
          
          {/* SoC text */}
          <text x="0" y="5" textAnchor="middle" fontSize="18" fill="white" fontWeight="700">
            {Math.round(batterySoC)}%
          </text>
          
          {/* Status indicator */}
          <circle cx="35" cy="-20" r="4" fill={batteryCharging ? '#10b981' : '#f59e0b'} filter="url(#glow)">
            <animate attributeName="opacity" values="1;0.5;1" dur="1s" repeatCount="indefinite" />
          </circle>
          
          {/* Label */}
          <text x="0" y="50" textAnchor="middle" fontSize="12" fill="var(--ink)" fontWeight="600">
            BATTERY
          </text>
          <text x="0" y="65" textAnchor="middle" fontSize="10" fill="var(--muted)">
            {batteryAh}Ah
          </text>
        </g>

        {/* Loads */}
        <g transform="translate(600, 320)">
          {/* House */}
          <path d="M -40 -20 L 0 -50 L 40 -20 L 40 30 L -40 30 Z" fill="var(--surface)" stroke="var(--ink)" strokeWidth="2" />
          <rect x="-10" y="5" width="20" height="25" fill="var(--ink)" />
          
          {/* Windows */}
          <rect x="-30" y="-10" width="15" height="15" fill="#fbbf24" opacity={loadW > 0 ? 1 : 0.3}>
            <animate attributeName="opacity" values={loadW > 0 ? "1;0.8;1" : "0.3;0.3;0.3"} dur="2s" repeatCount="indefinite" />
          </rect>
          <rect x="15" y="-10" width="15" height="15" fill="#fbbf24" opacity={loadW > 0 ? 1 : 0.3}>
            <animate attributeName="opacity" values={loadW > 0 ? "1;0.8;1" : "0.3;0.3;0.3"} dur="2s" begin="0.5s" repeatCount="indefinite" />
          </rect>
          
          {/* Label */}
          <text x="0" y="50" textAnchor="middle" fontSize="12" fill="var(--ink)" fontWeight="600">
            LOADS
          </text>
          <text x="0" y="65" textAnchor="middle" fontSize="11" fill="#ff4d1c" fontWeight="600">
            {loadW > 0 ? `${loadW.toFixed(0)}W` : '—'}
          </text>
        </g>

        {/* Power flow lines */}
        {/* Grid → Inverter */}
        <path
          d="M 160 200 Q 250 200 340 200"
          fill="none"
          stroke={gridAvailable ? '#4f46e5' : 'var(--border)'}
          strokeWidth={gridAvailable ? 4 : 2}
          strokeDasharray={gridAvailable ? '10 5' : '5 5'}
          opacity={gridAvailable ? 1 : 0.3}
          markerEnd={gridAvailable ? 'url(#flowArrow)' : ''}
        >
          {gridAvailable && (
            <animate attributeName="stroke-dashoffset" from="0" to="-30" dur="1.5s" repeatCount="indefinite" />
          )}
        </path>

        {/* Solar → Inverter */}
        {hasSolar && (
          <path
            d="M 400 140 Q 400 170 400 180"
            fill="none"
            stroke={solarW > 0 ? '#f59e0b' : 'var(--border)'}
            strokeWidth={solarW > 0 ? 3 : 2}
            strokeDasharray={solarW > 0 ? '8 4' : '5 5'}
            opacity={solarW > 0 ? 1 : 0.3}
            markerEnd={solarW > 0 ? 'url(#flowArrow)' : ''}
          >
            {solarW > 0 && (
              <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1s" repeatCount="indefinite" />
            )}
          </path>
        )}

        {/* Inverter → Battery */}
        <path
          d="M 340 240 Q 280 280 240 300"
          fill="none"
          stroke={batteryCharging ? '#10b981' : '#f59e0b'}
          strokeWidth={3}
          strokeDasharray="8 4"
          opacity="0.9"
          markerEnd="url(#flowArrow)"
        >
          <animate attributeName="stroke-dashoffset" from="0" to={batteryCharging ? "-24" : "24"} dur="1.5s" repeatCount="indefinite" />
        </path>

        {/* Inverter → Loads */}
        <path
          d="M 460 240 Q 520 280 560 300"
          fill="none"
          stroke={loadW > 0 ? '#ff4d1c' : 'var(--border)'}
          strokeWidth={loadW > 0 ? 3 : 2}
          strokeDasharray={loadW > 0 ? '8 4' : '5 5'}
          opacity={loadW > 0 ? 1 : 0.3}
          markerEnd={loadW > 0 ? 'url(#flowArrow)' : ''}
        >
          {loadW > 0 && (
            <animate attributeName="stroke-dashoffset" from="0" to="-24" dur="1.5s" repeatCount="indefinite" />
          )}
        </path>
      </svg>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#4f46e5' }} />
          <span style={{ color: 'var(--muted)' }}>Grid</span>
        </div>
        {hasSolar && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
            <span style={{ color: 'var(--muted)' }}>Solar</span>
          </div>
        )}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: batteryCharging ? '#10b981' : '#f59e0b' }} />
          <span style={{ color: 'var(--muted)' }}>{batteryCharging ? 'Charging' : 'Discharging'}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
          <div className="w-3 h-3 rounded-full" style={{ background: '#ff4d1c' }} />
          <span style={{ color: 'var(--muted)' }}>Load</span>
        </div>
      </div>
    </div>
  );
}
