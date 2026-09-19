# User Control System

## Overview

The Home Power Planner gives users **complete control** over every aspect of their power system calculation. No hidden assumptions, no locked parameters, no "trust us" defaults.

## What Users Can Control

### 1. Load Configuration ✅

**Basic Controls:**
- Add/remove any appliance from the catalog
- Adjust quantity for each load
- Modify wattage (override defaults)
- Set power factor
- Configure surge multiplier
- Set duty cycle

**Advanced Controls:**
- **Hourly usage patterns** - 24-hour timeline editor
- **Usage profiles** - Day/Night/Both/Occasional presets
- **Custom patterns** - Click any hour to set usage level
- **Backup circuit assignment** - Which loads need backup
- **Priority levels** - Critical vs sheddable loads

**Example:** A bathroom light can be set to run 7am-9am and 8pm-10pm, while a bedroom fan runs 10pm-6am. Complete flexibility.

### 2. Grid & Outage Pattern ✅

**Controls:**
- Outage duration (minutes)
- Grid availability between outages (minutes)
- Operating mode (IPS/Utility First/Solar First/SBU)
- Night-time override patterns
- Custom outage schedules

**Why it matters:** A system that works for 1-hour outages might fail for 3-hour outages. Users control their exact pattern.

### 3. Inverter Configuration ✅

**Controls:**
- Rated VA
- Rated W
- System voltage (12V/24V/48V)
- Idle consumption (W)
- Efficiency curve (custom points)
- Grid charger max current
- MPPT settings (if hybrid)

**Advanced Settings:**
- Custom efficiency curve points
- Surge capacity
- Low-voltage cutoff

### 4. Battery Configuration ✅

**Controls:**
- Chemistry selection (LiFePO4/Tubular/Flooded/AGM)
- Nominal voltage
- Rated Ah
- Depth of Discharge (DoD)
- Peukert exponent
- Max charge/discharge current
- Charge efficiency
- Cycle life table
- Calendar life

**Advanced Settings:**
- Custom cycle life curves
- BMS limits
- Temperature coefficients

### 5. Solar Configuration ✅

**Controls:**
- Panel wattage
- Panels in series
- Parallel strings
- Voc, Vmp, Isc, Imp
- Temperature coefficients
- Peak sun hours (low/typical/high)
- System derate factor
- Sunrise/sunset times

**Advanced Settings:**
- Custom temperature coefficients
- NOCT (Nominal Operating Cell Temperature)
- Soiling loss percentage
- Mismatch loss percentage

### 6. **NEW: Advanced Calculation Settings** ✅

This is the game-changer. Users can now control **all the real-world factors** that affect actual system performance:

#### Temperature Controls
- **Ambient temperature** (°C) - Affects solar panel output
- **Battery room temperature** (°C) - Affects battery capacity

**Impact:** A battery at 35°C has different capacity than at 15°C. Solar panels at 65°C cell temp produce less than at 25°C.

#### Battery Condition
- **Battery age** (years) - Capacity degradation over time
- **Battery health** (%) - Current state of health (100% = new, 80% = end of life)

**Impact:** A 5-year-old battery might only have 85% of original capacity. Users can model their actual battery condition.

#### Efficiency Controls
- **Inverter efficiency** (%) - DC to AC conversion loss
- **Battery charge efficiency** (%) - Energy lost during charging
- **Battery discharge efficiency** (%) - Energy lost during discharging

**Impact:** Real-world efficiency is rarely 100%. Users can input their actual equipment specs.

#### System Losses
- **Wiring losses** (%) - Voltage drop in cables
- **Solar panel soiling** (%) - Dust, dirt, bird droppings
- **Panel mismatch** (%) - Variations between panels

**Impact:** These losses add up. A system with 2% wiring + 5% soiling + 3% mismatch loses 10% of potential energy.

#### Safety Margins
- **Inverter margin** (%) - Extra capacity above peak load (default 25%)
- **Battery margin** (%) - Extra capacity for unexpected loads (default 20%)
- **Solar margin** (%) - Extra capacity for cloudy days (default 15%)

**Impact:** Conservative users can increase margins for reliability. Aggressive users can reduce margins to minimize cost.

#### Load Characteristics
- **Diversity factor** (0.5-1.0) - Not all loads run simultaneously
- **Power factor** (0.6-1.0) - Real power vs apparent power

**Impact:** A diversity factor of 0.8 means only 80% of connected loads run at once. This allows smaller system sizing.

#### Solar Specifics
- **Panel degradation** (%/year) - Annual output reduction
- **NOCT** (°C) - Nominal Operating Cell Temperature

**Impact:** Panels lose 0.5-1% per year. After 10 years, a panel produces 90-95% of original output.

## How It Works

### Real-Time Updates

Every time a user changes a setting:
1. The calculation engine re-runs with new parameters
2. Results update instantly (runtime, recharge time, SoC)
3. Warnings recalculate based on new conditions
4. Cost analysis updates

### Transparency

Every calculation shows:
- **Input assumptions** - What values were used
- **Calculation method** - How the result was computed
- **Uncertainty range** - Min/typical/max based on variations
- **"Show the math"** - Full formula and intermediate steps

### Sensitivity Analysis

Users can see which parameters matter most:
- ±10% change in load → X% change in runtime
- ±20% change in solar → Y% change in savings
- ±5°C temperature → Z% change in battery capacity

## Use Cases

### Case 1: Hot Climate User
**Scenario:** User in Bangladesh with 40°C ambient temperature

**Controls they adjust:**
- Ambient temperature: 40°C
- Battery room temperature: 35°C (indoor)
- Panel NOCT: 48°C
- Soiling loss: 8% (dusty environment)

**Result:** System sized 15% larger to account for temperature derating and soiling.

### Case 2: Existing System Audit
**Scenario:** User has a 5-year-old tubular battery

**Controls they adjust:**
- Battery age: 5 years
- Battery health: 85% (measured capacity test)
- Charge efficiency: 82% (older batteries less efficient)

**Result:** Accurate runtime prediction accounting for actual battery condition.

### Case 3: Conservative Design
**Scenario:** User wants maximum reliability for medical equipment

**Controls they adjust:**
- Inverter margin: 40% (instead of 25%)
- Battery margin: 30% (instead of 20%)
- Solar margin: 25% (instead of 15%)
- Diversity factor: 1.0 (assume all loads run simultaneously)

**Result:** Oversized system with maximum headroom for critical loads.

### Case 4: Budget-Conscious Design
**Scenario:** User wants minimum viable system

**Controls they adjust:**
- Inverter margin: 15%
- Battery margin: 10%
- Solar margin: 10%
- Diversity factor: 0.7 (realistic simultaneous usage)

**Result:** Smaller, cheaper system that still works but with less headroom.

## Technical Implementation

### State Management

```typescript
interface CalculationSettings {
  // Temperature
  ambientTempC: number;
  batteryRoomTempC: number;
  
  // Battery
  batteryAgeYears: number;
  batteryHealthPct: number;
  
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
  diversityFactor: number;
  powerFactor: number;
  
  // Solar
  panelDegradationPctPerYear: number;
  noctC: number;
}
```

### Integration with Calculation Engine

The enhanced calculator (`enhanced-calculator.ts`) uses these settings:

```typescript
// Temperature correction
const batteryCapacity = batteryCapacityTempCorrection(
  chemistry,
  settings.batteryRoomTempC,
  ratedCapacity
);

// Aging correction
const agedCapacity = batteryCalendarAging(
  chemistry,
  settings.batteryAgeYears,
  batteryCapacity
);

// Health correction
const effectiveCapacity = agedCapacity * (settings.batteryHealthPct / 100);

// Efficiency correction
const roundTripEfficiency = 
  (settings.batteryChargeEfficiencyPct / 100) *
  (settings.batteryDischargeEfficiencyPct / 100) *
  (settings.inverterEfficiencyPct / 100);

// Loss correction
const systemLossFactor = 
  (1 - settings.wiringLossPct / 100) *
  (1 - settings.soilingLossPct / 100) *
  (1 - settings.mismatchLossPct / 100);

// Safety margin
const designCapacity = requiredCapacity * (1 + settings.batterySafetyMarginPct / 100);
```

## User Experience

### Progressive Disclosure

1. **Basic mode** - Simple sliders for main parameters
2. **Advanced mode** - Expandable panel with all controls
3. **Expert mode** - Direct JSON editing (future)

### Default Values

All defaults are **conservative estimates** based on typical installations:
- Temperature: 30°C (warm climate)
- Battery age: 0 years (new)
- Battery health: 100%
- Inverter efficiency: 90%
- Wiring loss: 2%
- Soiling: 5%
- Safety margins: 15-25%

Users can adjust any value to match their actual conditions.

### Validation

The UI provides:
- **Min/max ranges** - Prevent invalid inputs
- **Tooltips** - Explain what each parameter means
- **Real-time feedback** - See impact immediately
- **Reset button** - Return to defaults

## Benefits

### 1. Accuracy
Users can input actual conditions instead of generic assumptions.

### 2. Transparency
Every calculation is explainable and verifiable.

### 3. Flexibility
Same tool works for hot climates, cold climates, new systems, old systems, conservative designs, and budget designs.

### 4. Education
Users learn what factors matter and why.

### 5. Trust
No hidden assumptions. Users control everything.

## Future Enhancements

### Phase 2
- **Save/load presets** - Save common configurations
- **Import from datasheets** - Parse PDF specs
- **Weather integration** - Auto-fill temperature/solar data
- **Equipment database** - Verified specs for popular models

### Phase 3
- **Machine learning** - Suggest optimal settings based on location
- **Collaborative editing** - Share configurations with installers
- **Version history** - Track changes over time
- **What-if analysis** - Compare multiple scenarios side-by-side

## Conclusion

The user control system transforms the Home Power Planner from a generic calculator into a **personalized engineering tool**. Users aren't stuck with our assumptions - they can model their exact situation with all its quirks and complexities.

This is what makes the tool genuinely useful: **it adapts to the user, not the other way around.**
