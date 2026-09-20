export interface DIYGuide {
  id: string;
  title: string;
  summary: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string;
  category: string;
  sections: GuideSection[];
}

export interface GuideSection {
  title: string;
  content: string;
  safety?: string[];
  tools?: string[];
  steps?: string[];
  diagram?: string;
}

export const diyGuides: DIYGuide[] = [
  {
    id: 'basic-ips-installation',
    title: 'Basic IPS Installation Guide',
    summary: 'Step-by-step guide to installing a basic inverter-battery system for home backup.',
    difficulty: 'beginner',
    estimatedTime: '4-6 hours',
    category: 'Installation',
    sections: [
      {
        title: 'Before You Start',
        content: 'This guide covers installing a basic IPS (Inverter Power Supply) system for home backup. You will learn how to mount the inverter, connect the battery, wire the loads, and test the system safely.',
        safety: [
          'Turn off main power before working with electrical connections',
          'Use insulated tools rated for DC voltage',
          'Wear safety glasses and insulated gloves',
          'Work in a well-ventilated area (batteries emit hydrogen gas)',
          'Never work alone - have someone nearby in case of emergency',
        ],
        tools: [
          'Insulated screwdrivers (flathead and Phillips)',
          'Wire strippers and crimpers',
          'Multimeter (for voltage testing)',
          'Cable ties and mounting hardware',
          'Drill and wall anchors (if mounting on wall)',
        ],
      },
      {
        title: 'Step 1: Choose Location',
        content: 'Select a location for your inverter and battery that is:',
        steps: [
          'Well-ventilated (not in enclosed space)',
          'Away from direct sunlight and heat sources',
          'Dry and protected from moisture',
          'Close to your main distribution board',
          'On a stable, level surface (wall or floor)',
          'Accessible for maintenance',
        ],
      },
      {
        title: 'Step 2: Mount the Inverter',
        content: 'Mount your inverter securely using the provided mounting holes:',
        steps: [
          'Hold inverter against wall and mark mounting holes',
          'Drill holes and insert wall anchors',
          'Secure inverter with screws (do not overtighten)',
          'Ensure inverter is level and has 10cm clearance on all sides for ventilation',
          'Leave space below for battery connections',
        ],
      },
      {
        title: 'Step 3: Connect Battery',
        content: 'Connect the battery to the inverter. This is the most critical step - double-check polarity!',
        safety: [
          '⚠️ CRITICAL: Connect POSITIVE (+) first, then NEGATIVE (-)',
          '⚠️ Never let positive and negative terminals touch',
          '⚠️ Use correct cable size (see cable sizing guide)',
          '⚠️ Tighten connections firmly but do not overtighten',
        ],
        steps: [
          'Turn OFF inverter before connecting battery',
          'Identify positive (+) and negative (-) terminals on both inverter and battery',
          'Connect POSITIVE (+) cable from battery to inverter positive terminal',
          'Connect NEGATIVE (-) cable from battery to inverter negative terminal',
          'Tighten all connections securely',
          'Double-check polarity before turning on',
          'Turn ON inverter and verify battery voltage displays correctly',
        ],
        diagram: 'Battery (+) ──────► Inverter (+)\nBattery (-) ──────► Inverter (-)',
      },
      {
        title: 'Step 4: Connect Grid Input',
        content: 'Connect the inverter to your main power supply:',
        safety: [
          '⚠️ Main power must be OFF during connection',
          '⚠️ Use proper circuit breaker for inverter input',
          '⚠️ Follow local electrical codes',
        ],
        steps: [
          'Turn OFF main power at distribution board',
          'Connect inverter AC INPUT to a dedicated circuit breaker',
          'Use correct wire size (consult electrician if unsure)',
          'Secure all connections and insulate exposed wires',
          'Turn ON main power',
          'Verify inverter shows grid power',
        ],
      },
      {
        title: 'Step 5: Connect Loads',
        content: 'Connect your backup loads to the inverter output:',
        steps: [
          'Identify which loads you want on backup (lights, fans, router, etc.)',
          'Connect these loads to inverter AC OUTPUT',
          'Do NOT connect high-power appliances (AC, heater, iron) unless inverter is sized for it',
          'Use proper wire size for each load',
          'Test each load individually',
        ],
      },
      {
        title: 'Step 6: Test the System',
        content: 'Test your IPS system to ensure it works correctly:',
        steps: [
          'Turn ON inverter and verify battery charging',
          'Turn ON all backup loads',
          'Simulate power outage by turning OFF main power',
          'Verify inverter switches to battery mode automatically',
          'Check that all loads continue working',
          'Measure runtime (should match calculated runtime)',
          'Turn ON main power and verify inverter switches back to grid mode',
          'Test complete system 2-3 times to ensure reliability',
        ],
      },
      {
        title: 'Maintenance Tips',
        content: 'Keep your system running reliably:',
        steps: [
          'Check battery terminals monthly (tighten if loose)',
          'Clean inverter ventilation ports every 3 months',
          'Check battery water level (for tubular/flooded batteries) monthly',
          'Test system monthly by simulating outage',
          'Keep inverter firmware updated (if applicable)',
          'Record battery replacement date and plan for replacement',
        ],
      },
    ],
  },
  {
    id: 'hybrid-solar-setup',
    title: 'Hybrid Solar System Setup',
    summary: 'Complete guide to installing a hybrid solar system with battery backup and grid connection.',
    difficulty: 'intermediate',
    estimatedTime: '2-3 days',
    category: 'Solar Installation',
    sections: [
      {
        title: 'System Overview',
        content: 'A hybrid solar system combines solar panels, battery storage, and grid connection. It can operate in multiple modes: solar-first, battery-first, or grid-tied with backup.',
      },
      {
        title: 'Safety Precautions',
        content: 'Solar systems involve high voltages and currents. Safety is critical.',
        safety: [
          '⚠️ Solar panels generate electricity in sunlight - treat as live',
          '⚠️ Use DC-rated breakers and fuses',
          '⚠️ Never work on solar system in wet conditions',
          '⚠️ Use proper PPE (insulated gloves, safety glasses)',
          '⚠️ Have a second person present for roof work',
          '⚠️ Follow all local electrical codes and get permits',
        ],
      },
      {
        title: 'Step 1: Plan Solar Array',
        content: 'Plan your solar panel placement:',
        steps: [
          'Choose roof area with maximum sun exposure (south-facing ideal)',
          'Calculate available space: each 550Wp panel needs ~2.2m²',
          'Check roof structural integrity (panels add ~20kg/m²)',
          'Plan cable routing from roof to inverter',
          'Ensure no shading from trees, buildings, or other obstacles',
          'Mark panel locations on roof',
        ],
      },
      {
        title: 'Step 2: Mount Solar Panels',
        content: 'Install mounting structure and panels:',
        tools: [
          'Solar mounting structure (rails, clamps, brackets)',
          'Drill and masonry bits',
          'Wrench set',
          'Sealant (for roof penetrations)',
          'MC4 connectors and solar cable',
        ],
        steps: [
          'Install mounting rails on roof (follow manufacturer instructions)',
          'Seal all roof penetrations to prevent leaks',
          'Mount solar panels on rails using clamps',
          'Connect panels in series (positive to negative)',
          'Leave final MC4 connections for later',
          'Do NOT connect to inverter yet (panels are live in sunlight)',
        ],
      },
      {
        title: 'Step 3: Install Inverter',
        content: 'Mount hybrid inverter in suitable location:',
        steps: [
          'Choose location near battery and distribution board',
          'Ensure good ventilation (inverter generates heat)',
          'Mount inverter securely on wall',
          'Leave space for cable connections',
          'Install DC isolator between panels and inverter',
          'Install AC breaker between inverter and distribution board',
        ],
      },
      {
        title: 'Step 4: Connect Battery Bank',
        content: 'Connect battery to hybrid inverter:',
        safety: [
          '⚠️ Follow battery manufacturer instructions',
          '⚠️ Use correct cable size for battery current',
          '⚠️ Install DC breaker between battery and inverter',
          '⚠️ Connect positive first, then negative',
        ],
        steps: [
          'Position battery bank near inverter',
          'Connect battery cables to inverter battery terminals',
          'Install DC breaker/fuse for protection',
          'Configure battery settings in inverter (chemistry, capacity, voltage)',
          'Verify battery communication (if BMS connected)',
        ],
      },
      {
        title: 'Step 5: Connect Solar to Inverter',
        content: 'Connect solar panels to hybrid inverter:',
        safety: [
          '⚠️ Cover panels or work in low light to reduce voltage',
          '⚠️ Verify polarity before connecting',
          '⚠️ Use MC4 connectors properly',
        ],
        steps: [
          'Verify solar string voltage with multimeter',
          'Check polarity (positive/negative)',
          'Connect solar DC cables to inverter PV input',
          'Verify voltage is within inverter MPPT range',
          'Turn ON DC isolator',
          'Verify inverter detects solar input',
        ],
      },
      {
        title: 'Step 6: Configure System',
        content: 'Configure hybrid inverter settings:',
        steps: [
          'Set battery type (LiFePO4, tubular, etc.)',
          'Set battery capacity (Ah)',
          'Set charge/discharge limits',
          'Choose operating mode (solar-first, battery-first, etc.)',
          'Set grid export limits (if net metering)',
          'Configure time-of-use settings (if applicable)',
          'Test all modes',
        ],
      },
      {
        title: 'Step 7: Test and Commission',
        content: 'Test complete system:',
        steps: [
          'Verify solar production (check inverter display)',
          'Test battery charging from solar',
          'Test battery charging from grid',
          'Simulate grid outage - verify seamless transfer',
          'Test all operating modes',
          'Monitor system for 24 hours',
          'Document all settings for future reference',
        ],
      },
    ],
  },
  {
    id: 'battery-bank-config',
    title: 'Battery Bank Configuration',
    summary: 'Learn how to configure battery banks in series and parallel for your system voltage and capacity needs.',
    difficulty: 'intermediate',
    estimatedTime: '2-3 hours',
    category: 'Battery Systems',
    sections: [
      {
        title: 'Understanding Series vs Parallel',
        content: 'Battery banks can be configured in series (increases voltage) or parallel (increases capacity):',
        diagram: 'SERIES (Voltage adds up):\nBattery 1 (12V) + Battery 2 (12V) = 24V system\n\nPARALLEL (Capacity adds up):\nBattery 1 (100Ah) + Battery 2 (100Ah) = 200Ah capacity',
      },
      {
        title: 'When to Use Series',
        content: 'Use series configuration when:',
        steps: [
          'Your inverter requires higher voltage (24V or 48V)',
          'You have 12V batteries but need 24V/48V system',
          'You want to reduce current (higher voltage = lower current)',
          'Lower current means thinner cables and less heat',
        ],
      },
      {
        title: 'When to Use Parallel',
        content: 'Use parallel configuration when:',
        steps: [
          'You need more capacity (longer runtime)',
          'Your system voltage is correct but capacity is insufficient',
          'You want redundancy (if one battery fails, others continue)',
          'You have space for multiple batteries',
        ],
      },
      {
        title: 'Safety Rules',
        content: 'Critical safety rules for battery banks:',
        safety: [
          '⚠️ NEVER mix old and new batteries',
          '⚠️ NEVER mix different capacities',
          '⚠️ NEVER mix different chemistries',
          '⚠️ NEVER mix different brands/models',
          '⚠️ Use identical batteries for series/parallel',
          '⚠️ Keep all batteries at same temperature',
          '⚠️ Use proper fusing between parallel strings',
        ],
      },
      {
        title: 'Example: 48V 200Ah Bank',
        content: 'How to build a 48V 200Ah battery bank using 12V 100Ah batteries:',
        steps: [
          'You need 48V, so connect 4 batteries in series (4 × 12V = 48V)',
          'You need 200Ah, so connect 2 series strings in parallel',
          'Total: 8 batteries (4 series × 2 parallel)',
          'String 1: Battery 1 + 2 + 3 + 4 = 48V 100Ah',
          'String 2: Battery 5 + 6 + 7 + 8 = 48V 100Ah',
          'Connect String 1 and String 2 in parallel = 48V 200Ah',
        ],
        diagram: 'String 1: [B1]─[B2]─[B3]─[B4] = 48V 100Ah\n            │                   │\nString 2: [B5]─[B6]─[B7]─[B8] = 48V 100Ah\n            │                   │\n            └─────PARALLEL──────┘\n            Result: 48V 200Ah',
      },
      {
        title: 'Wiring Best Practices',
        content: 'Follow these best practices for battery bank wiring:',
        steps: [
          'Use same length cables for all parallel connections',
          'Use proper cable size (consult cable sizing guide)',
          'Use copper cables (not aluminum)',
          'Crimp connections properly (do not just twist)',
          'Apply dielectric grease to prevent corrosion',
          'Install fuses/breakers on each parallel string',
          'Label all cables and batteries clearly',
          'Keep cables short to reduce voltage drop',
        ],
      },
    ],
  },
  {
    id: 'cable-sizing-guide',
    title: 'Cable Sizing Guide',
    summary: 'Learn how to select the correct cable size for your battery, solar, and load connections.',
    difficulty: 'intermediate',
    estimatedTime: '30 minutes',
    category: 'Technical Reference',
    sections: [
      {
        title: 'Why Cable Size Matters',
        content: 'Undersized cables cause:',
        steps: [
          'Voltage drop (reduced efficiency)',
          'Heat generation (fire hazard)',
          'Energy waste (money lost)',
          'Poor system performance',
        ],
      },
      {
        title: 'Cable Sizing Formula',
        content: 'To size cables correctly, you need to know:',
        steps: [
          'Current (Amps) = Power (Watts) ÷ Voltage (Volts)',
          'Example: 1000W at 12V = 83.3A',
          'Cable size depends on current and length',
          'Longer cables need larger size (more voltage drop)',
          'Rule of thumb: Keep voltage drop under 3%',
        ],
      },
      {
        title: 'Common Cable Sizes',
        content: 'Standard cable sizes for IPS/solar systems:',
        diagram: 'Current (A)    Cable Size (mm²)\n─────────────────────────────\n0-20A          2.5 mm²\n20-30A         4 mm²\n30-50A         6 mm²\n50-70A         10 mm²\n70-100A        16 mm²\n100-150A       25 mm²\n150-200A       35 mm²\n200-250A       50 mm²\n250-350A       70 mm²\n350-500A       95 mm²',
      },
      {
        title: 'Example: Battery to Inverter',
        content: 'Sizing cable for 12V 1000W inverter:',
        steps: [
          'Calculate current: 1000W ÷ 12V = 83.3A',
          'Add 25% safety margin: 83.3A × 1.25 = 104A',
          'For 2-meter cable, use 16 mm² cable',
          'For 5-meter cable, use 25 mm² cable (longer = larger)',
          'Use stranded copper cable (more flexible)',
          'Use proper lugs and crimping',
        ],
      },
      {
        title: 'Solar Cable Sizing',
        content: 'Solar cables have special requirements:',
        steps: [
          'Use solar-rated cable (UV resistant)',
          'Typically 4 mm² or 6 mm² for residential',
          'Calculate based on panel current (Isc × 1.25)',
          'Keep voltage drop under 2% for solar',
          'Use MC4 connectors for panel connections',
        ],
      },
    ],
  },
  {
    id: 'safety-checklist',
    title: 'Safety Checklist',
    summary: 'Complete safety checklist for IPS and solar system installation and maintenance.',
    difficulty: 'beginner',
    estimatedTime: '15 minutes',
    category: 'Safety',
    sections: [
      {
        title: 'Before Installation',
        content: 'Safety checks before starting installation:',
        steps: [
          'Read all equipment manuals completely',
          'Verify all components are compatible',
          'Check local electrical codes and get permits',
          'Ensure you have proper tools (insulated)',
          'Have fire extinguisher nearby (Class C for electrical)',
          'Work with a partner (never alone)',
          'Turn off main power before working',
          'Verify no power with multimeter before touching wires',
        ],
      },
      {
        title: 'Battery Safety',
        content: 'Battery-specific safety precautions:',
        safety: [
          '⚠️ Batteries contain acid - wear gloves and eye protection',
          '⚠️ Batteries emit hydrogen gas - ensure ventilation',
          '⚠️ Never smoke near batteries',
          '⚠️ Keep batteries away from sparks and flames',
          '⚠️ Never short circuit battery terminals',
          '⚠️ Use insulated tools when working with batteries',
          '⚠️ Have baking soda nearby to neutralize acid spills',
          '⚠️ Know location of nearest eyewash station',
        ],
      },
      {
        title: 'Electrical Safety',
        content: 'General electrical safety rules:',
        steps: [
          'Always turn off power before working',
          'Use proper wire sizes for current',
          'Install correct fuses/breakers',
          'Never overload circuits',
          'Keep all connections tight',
          'Insulate all exposed wires',
          'Use proper cable glands and connectors',
          'Label all circuits clearly',
          'Test with multimeter before energizing',
        ],
      },
      {
        title: 'Solar Safety',
        content: 'Solar-specific safety precautions:',
        safety: [
          '⚠️ Solar panels generate electricity in sunlight',
          '⚠️ Cover panels or work in low light',
          '⚠️ Use DC-rated components only',
          '⚠️ Install proper DC breakers/fuses',
          '⚠️ Use fall protection for roof work',
          '⚠️ Never work on roof in wet/windy conditions',
          '⚠️ Have partner assist with roof work',
        ],
      },
      {
        title: 'Maintenance Safety',
        content: 'Safety during maintenance:',
        steps: [
          'Turn off system before maintenance',
          'Wait 5 minutes for capacitors to discharge',
          'Verify zero voltage with multimeter',
          'Use insulated tools',
          'Wear appropriate PPE',
          'Follow lockout/tagout procedures',
          'Keep maintenance log',
          'Schedule regular inspections',
        ],
      },
      {
        title: 'Emergency Procedures',
        content: 'What to do in emergencies:',
        steps: [
          'ELECTRICAL FIRE: Use Class C fire extinguisher only',
          'ACID SPILL: Neutralize with baking soda, flush with water',
          'SHOCK VICTIM: Turn off power, call emergency services, perform CPR if needed',
          'BATTERY LEAK: Evacuate area, ventilate, contact professional',
          'Know location of main power shutoff',
          'Keep emergency numbers posted',
          'Train all users on emergency procedures',
        ],
      },
    ],
  },
];
