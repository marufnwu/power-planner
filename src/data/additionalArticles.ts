/**
 * Additional Learning Articles (11-20)
 * 
 * These articles complement the existing 10 articles in LearnPage.tsx
 */

export const additionalArticles = [
  {
    id: 'maintenance-guide',
    title: 'IPS Maintenance Guide',
    summary: 'Keep your system running efficiently with proper maintenance.',
    category: 'Practical',
    content: `**Monthly Maintenance:**
- Check battery terminals for corrosion
- Clean solar panels if dusty
- Verify all connections are tight
- Check inverter display for error codes

**Quarterly Maintenance:**
- Measure battery voltage under load
- Check electrolyte levels (tubular/flooded only)
- Inspect cables for damage
- Test emergency shutdown

**Annual Maintenance:**
- Professional inspection recommended
- Battery load test
- Inverter efficiency check
- Update firmware if available

**Warning Signs:**
- Battery getting hot during charging
- Unusual smells (burning, acid)
- Inverter frequently tripping
- Reduced backup time`,
  },
  {
    id: 'safety-first',
    title: 'Safety First: Working with Batteries',
    summary: 'Essential safety practices when installing and maintaining battery systems.',
    category: 'Safety',
    content: `**Electrical Safety:**
- Always wear insulated gloves when working with batteries
- Remove jewelry before working on battery connections
- Use insulated tools only
- Never work on batteries alone

**Battery Hazards:**
- Hydrogen gas emission (explosion risk)
- Acid spills (chemical burns)
- High short-circuit current (fire risk)
- Heavy weight (physical injury)

**Ventilation Requirements:**
- Tubular/flooded: Minimum 4 air changes per hour
- LiFePO4: Standard room ventilation sufficient
- Never install batteries in sealed rooms

**Emergency Procedures:**
- Acid spill: Neutralize with baking soda, flush with water
- Fire: Use CO2 or dry chemical extinguisher only
- Electric shock: Disconnect power, call emergency services`,
  },
  {
    id: 'installer-checklist',
    title: 'Installer Checklist',
    summary: 'What to verify before and after installation.',
    category: 'Practical',
    content: `**Pre-Installation:**
- [ ] Site survey completed
- [ ] Load calculation verified
- [ ] Equipment specifications confirmed
- [ ] Cable sizes calculated
- [ ] Protection devices selected
- [ ] Ventilation adequate
- [ ] Structural support verified

**During Installation:**
- [ ] Correct polarity verified
- [ ] Torque specifications followed
- [ ] Cable routing proper
- [ ] Protection devices installed
- [ ] Earthing/grounding connected
- [ ] Ventilation confirmed

**Post-Installation:**
- [ ] Voltage measurements taken
- [ ] Load test performed
- [ ] Charging parameters set
- [ ] User training completed
- [ ] Documentation provided
- [ ] Warranty registered`,
  },
  {
    id: 'cable-sizing',
    title: 'Cable Sizing for 12V Systems',
    summary: 'Why cable size matters more at low voltage.',
    category: 'Technical',
    content: `**Why Cable Size Matters:**
At 12V, even small resistance causes significant voltage drop:
- 100A through 10mm² cable (5m) = 0.88V drop (7.3%)
- 100A through 25mm² cable (5m) = 0.35V drop (2.9%)

**Voltage Drop Calculation:**
\`\`\`
Voltage Drop = (2 × Length × Current × Resistance) / 1000
Where Resistance = 0.0175 / Cross-sectional Area
\`\`\`

**Recommended Cable Sizes:**
- Up to 50A: 16mm²
- 50-100A: 25mm²
- 100-150A: 35mm²
- 150-200A: 50mm²
- 200-300A: 70mm²

**Best Practices:**
- Keep cables as short as possible
- Use stranded copper cables
- Proper crimping or soldering
- Heat shrink insulation
- Regular inspection for damage`,
  },
  {
    id: 'net-metering',
    title: 'Net Metering Explained',
    summary: 'How to sell excess solar power back to the grid.',
    category: 'Solar',
    content: `**What is Net Metering?**
Net metering allows you to export excess solar power to the grid and receive credit on your electricity bill.

**How it Works:**
1. Solar panels generate power
2. Excess power flows to grid (bidirectional meter)
3. Utility credits your account
4. Use credits when solar production is low

**Benefits:**
- Reduces electricity bill
- No battery needed for grid-tie
- Faster payback period
- Environmental benefits

**Requirements:**
- Bidirectional meter
- Grid-tie inverter
- Utility approval
- Proper documentation

**Limitations:**
- No backup during outages
- Utility-dependent
- Regulatory changes possible
- Export limits may apply`,
  },
  {
    id: 'cost-payback',
    title: 'Understanding Cost and Payback',
    summary: 'How to calculate if your system is worth the investment.',
    category: 'Financial',
    content: `**Initial Costs:**
- Inverter: ৳15,000-50,000
- Battery: ৳18,000-60,000
- Solar panels: ৳12,000 per kWp
- Installation: ৳5,000-15,000
- Total: ৳50,000-150,000

**Monthly Savings:**
- Reduced electricity bill
- Avoided generator fuel costs
- Increased property value

**Payback Calculation:**
\`\`\`
Payback Period = Total Cost / Monthly Savings
Example: ৳100,000 / ৳3,000 = 33 months (2.8 years)
\`\`\`

**ROI Factors:**
- Electricity tariff increases
- Battery replacement costs
- Maintenance expenses
- System lifespan

**Typical Payback Periods:**
- IPS only: 4-6 years
- IPS + Solar: 3-5 years
- Solar only (net metering): 5-7 years`,
  },
  {
    id: 'generator-comparison',
    title: 'When a Generator Still Makes Sense',
    summary: 'Comparing IPS/solar vs generator for backup power.',
    category: 'Comparison',
    content: `**Generator Advantages:**
- Lower upfront cost
- Unlimited runtime (with fuel)
- High power output
- No battery degradation

**Generator Disadvantages:**
- Fuel costs (৳100-150 per liter)
- Noise pollution
- Air pollution
- Regular maintenance
- Manual start (unless auto-start)

**IPS/Solar Advantages:**
- Silent operation
- No fuel costs
- Zero emissions
- Automatic operation
- Lower maintenance

**IPS/Solar Disadvantages:**
- Higher upfront cost
- Limited runtime
- Battery replacement needed
- Weather dependent (solar)

**When to Choose Generator:**
- Very long outages (8+ hours)
- Very high power needs (5kW+)
- Infrequent use
- Limited budget
- No roof space for solar

**When to Choose IPS/Solar:**
- Frequent outages
- Moderate power needs
- Environmental concerns
- Long-term savings priority`,
  },
  {
    id: 'load-shedding-survival',
    title: 'Load Shedding Survival Guide',
    summary: 'Practical tips for managing power outages in Bangladesh.',
    category: 'Practical',
    content: `**Understand Your Pattern:**
- Track outage times and duration
- Identify peak shedding hours
- Plan activities accordingly
- Charge devices proactively

**Energy Conservation:**
- Use LED lights only
- Set AC to 25°C (if on IPS)
- Unplug devices when not needed
- Use natural light during day

**Priority Loading:**
1. Essential: Lights, fans, router
2. Important: TV, phone charging
3. Comfortable: Fridge, laptop
4. Luxury: AC, water heater

**Battery Management:**
- Don't discharge below 20% (lead-acid)
- Recharge fully when grid returns
- Avoid deep discharges
- Monitor battery health

**Emergency Preparedness:**
- Keep power banks charged
- Have backup lighting
- Store water in advance
- Keep important documents safe`,
  },
  {
    id: 'mppt-explained',
    title: 'MPPT Charge Controller Explained',
    summary: 'How Maximum Power Point Tracking maximizes solar output.',
    category: 'Solar',
    content: `**What is MPPT?**
MPPT (Maximum Power Point Tracking) is a technology that ensures solar panels operate at their maximum power output regardless of conditions.

**How it Works:**
- Continuously monitors panel voltage and current
- Finds optimal operating point (MPP)
- Adjusts to maximize power harvest
- Converts excess voltage to current

**Benefits over PWM:**
- 20-30% more energy harvest
- Better performance in cold weather
- Handles partial shading better
- Works with higher voltage panels

**When MPPT is Worth It:**
- Systems over 400W
- Cold climates
- Partial shading
- Higher voltage panels

**MPPT vs PWM:**
\`\`\`
PWM: Cheaper, simpler, less efficient
MPPT: More expensive, complex, more efficient
\`\`\`

**Sizing MPPT Controller:**
- Voltage: Match panel Voc
- Current: 125% of panel Isc
- Power: Match panel wattage`,
  },
  {
    id: 'future-proofing',
    title: 'Future-Proofing Your System',
    summary: 'How to design a system that can grow with your needs.',
    category: 'Planning',
    content: `**Plan for Growth:**
- Add 20-30% capacity for future loads
- Choose inverter with expansion capability
- Leave space for additional batteries
- Plan cable routes for future panels

**Modular Design:**
- Start with core system
- Add batteries as needed
- Expand solar array gradually
- Upgrade inverter when necessary

**Technology Considerations:**
- Choose standard voltages (12/24/48V)
- Use compatible battery chemistries
- Select inverters with firmware updates
- Plan for smart home integration

**Financial Planning:**
- Budget for battery replacement (5-10 years)
- Plan for inverter upgrade (10-15 years)
- Consider electricity tariff increases
- Factor in technology improvements

**Documentation:**
- Keep all manuals and warranties
- Document all modifications
- Track maintenance schedule
- Monitor performance over time`,
  },
];
