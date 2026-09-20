# Load Shedding & Dynamic Load Behavior - Analysis & Fix Plan

## Executive Summary

The current load shedding implementation has **fundamental issues** with how it models real-world load behavior. Loads are not constant - they cycle on/off, have startup surges, and behave differently when shed vs. when running normally.

**Status:** 🔴 **CRITICAL ISSUES IDENTIFIED**

---

## Current Implementation Issues

### Issue #1: Duty Cycle Misuse ❌

**Current Code (line 290):**
```typescript
const loadWattsAC = r2(load.qty * load.watts * load.dutyCycle * hourFraction * loadMultiplier);
```

**Problem:**
- Treats duty cycle as **continuous power reduction**
- Example: Fridge with 30% duty cycle modeled as drawing 30% power continuously
- Reality: Fridge cycles **on for 30% of the time at 100% power**, off for 70%

**Impact:**
- Inaccurate energy calculations
- Doesn't capture startup surge behavior
- Misrepresents actual battery drain patterns

**Example:**
```
Fridge: 150W, 30% duty cycle

Current model:
- Draws 45W continuously (150W × 0.3)
- No startup surge
- Smooth power draw

Real behavior:
- Draws 150W for 18 minutes, then 0W for 42 minutes (per hour)
- Startup surge: 750W for 2-3 seconds when compressor starts
- Cyclic power draw
```

---

### Issue #2: Partial Load Serving ❌

**Current Code (lines 298-304):**
```typescript
if (remaining > 0) {
  // Partial service
  const fraction = remaining / loadWattsDC;
  servedWattsDC += remaining;
  unservedWattsAC += r2(loadWattsDC * (1 - fraction) * efficiency);
  shedLoads.push(`${load.label} (${r2(fraction * 100)}%)`);
}
```

**Problem:**
- Can serve a **fraction** of a load (e.g., 50%)
- Reality: Most loads are **binary** (on/off)
- You can't run a fridge at 50% power - it's either running or not
- You can't run a light at 30% - it's either on or off (unless dimmable)

**Impact:**
- Unrealistic load shedding behavior
- Misrepresents what actually gets shed
- Confusing user experience ("Fridge (50%)" - what does that mean?)

**Example:**
```
Available power: 100W
Loads:
- Router: 12W (priority 1)
- Fridge: 150W (priority 2)
- Light: 10W (priority 3)

Current model:
- Serves router: 12W
- Serves fridge at 58%: 88W (150W × 0.58)
- Sheds light: 0W
- Total: 100W

Real behavior:
- Serves router: 12W
- Fridge is OFF (can't serve at 58%)
- Light is ON: 10W
- Total: 22W
- Fridge cycles on later when power available
```

---

### Issue #3: No Startup Surge Handling ❌

**Problem:**
- When loads are shed and reconnected, they have startup surges
- Current system doesn't consider this
- Example: Fridge compressor needs 5× running power for 2-3 seconds

**Impact:**
- Inverter might trip when reconnecting loads
- Battery might not handle surge current
- Unrealistic simulation

**Example:**
```
Fridge reconnection:
- Running power: 150W
- Startup surge: 750W for 2-3 seconds
- Inverter must handle 750W surge
- Battery must deliver 750W / efficiency = ~850W DC
```

---

### Issue #4: No Hysteresis ❌

**Problem:**
- Loads can be shed and reconnected rapidly
- No delay or hysteresis
- Reality: Most loads have minimum off/on times

**Impact:**
- Unrealistic cycling behavior
- Potential equipment damage (rapid cycling)
- Inaccurate energy calculations

**Example:**
```
Current model:
- t=0: Fridge ON
- t=15min: Battery low, fridge shed
- t=16min: Grid returns, fridge reconnected
- t=30min: Grid out again, fridge shed
- t=31min: Grid returns, fridge reconnected
- Result: Fridge cycles 4 times in 31 minutes

Real behavior:
- Fridge has minimum 5-minute off time
- Fridge has minimum 10-minute on time
- Prevents rapid cycling
- Protects compressor
```

---

### Issue #5: No Sub-Hourly Variation ❌

**Problem:**
- Uses hourly profiles (0-1 value per hour)
- No variation within the hour
- Reality: Loads vary significantly within an hour

**Impact:**
- Misses peak demand within hours
- Inaccurate battery drain patterns
- Doesn't capture real usage patterns

**Example:**
```
Current model:
- Hour 20 (8pm): hourFraction = 0.9
- Loads draw 90% of rated power for entire hour
- Smooth, constant draw

Real behavior:
- Hour 20 (8pm): 
  - 8:00-8:15: Lights ON, TV ON, fridge cycling
  - 8:15-8:30: TV OFF, lights ON, fridge OFF
  - 8:30-8:45: All ON, fridge starts
  - 8:45-9:00: Lights dimmed, fridge OFF
- Highly variable within the hour
```

---

## Real-World Load Behavior

### 1. Cyclic Loads (Fridge, AC, Water Pump)

**Behavior:**
- Cycle on/off based on thermostat/timer
- Duty cycle represents **time ON**, not power reduction
- Startup surge when turning ON
- Minimum off/on times

**Model:**
```typescript
interface CyclicLoad {
  runningPower: number;      // Power when ON (e.g., 150W)
  startupSurge: number;      // Surge multiplier (e.g., 5×)
  surgeDuration: number;     // Surge duration (e.g., 3 seconds)
  dutyCycle: number;         // Fraction of time ON (e.g., 0.3)
  minOnTime: number;         // Minimum ON time (e.g., 10 minutes)
  minOffTime: number;        // Minimum OFF time (e.g., 5 minutes)
  currentState: 'on' | 'off';
  stateStartTime: number;
}
```

**Simulation:**
```typescript
function simulateCyclicLoad(load: CyclicLoad, time: number, availablePower: number): number {
  const cycleTime = time % 3600; // Position in hour
  
  // Check if should switch state
  if (load.currentState === 'on') {
    const onDuration = time - load.stateStartTime;
    if (onDuration >= load.minOnTime * 60) {
      // Turn OFF
      load.currentState = 'off';
      load.stateStartTime = time;
      return 0;
    }
    return load.runningPower;
  } else {
    const offDuration = time - load.stateStartTime;
    if (offDuration >= load.minOffTime * 60 && availablePower >= load.runningPower * 1.2) {
      // Turn ON (with surge)
      load.currentState = 'on';
      load.stateStartTime = time;
      if (offDuration < load.surgeDuration) {
        return load.runningPower * load.startupSurge;
      }
      return load.runningPower;
    }
    return 0;
  }
}
```

---

### 2. Binary Loads (Lights, TV, Router)

**Behavior:**
- Either ON or OFF
- No partial power (unless dimmable)
- Can be shed completely
- Quick on/off

**Model:**
```typescript
interface BinaryLoad {
  power: number;             // Power when ON (e.g., 10W)
  isDimmable: boolean;       // Can be dimmed (e.g., false for most)
  minDimLevel: number;       // Minimum dim level (e.g., 0.3 for 30%)
  currentState: boolean;     // ON or OFF
}
```

**Shedding:**
```typescript
function shedBinaryLoad(load: BinaryLoad, priority: number): 'full' | 'dim' | 'off' {
  if (priority === 1) {
    return 'full';  // Never shed critical loads
  } else if (priority === 2 && load.isDimmable) {
    return 'dim';   // Dim non-critical dimmable loads
  } else {
    return 'off';   // Turn off everything else
  }
}
```

---

### 3. Variable Loads (Fan, Pump)

**Behavior:**
- Can run at different speeds/power levels
- Multiple discrete states (e.g., low/medium/high)
- Can be shed by reducing speed

**Model:**
```typescript
interface VariableLoad {
  states: Array<{
    label: string;         // "Low", "Medium", "High"
    power: number;         // Power at this state
    priority: number;      // Shed priority (lower = shed first)
  }>;
  currentState: number;    // Index into states array
}
```

**Shedding:**
```typescript
function shedVariableLoad(load: VariableLoad): number {
  // Reduce to next lower state
  if (load.currentState > 0) {
    load.currentState--;
    return load.states[load.currentState].power;
  }
  return 0;  // Already at lowest state, turn off
}
```

---

## Proposed Solution

### Phase 1: Fix Duty Cycle (Critical)

**Change:**
```typescript
// OLD (wrong):
const loadWattsAC = load.qty * load.watts * load.dutyCycle * hourFraction;

// NEW (correct):
// Determine if load is ON or OFF this step
const cyclePosition = (minuteOfDay % 60) / 60;  // 0-1 within hour
const isOn = cyclePosition < load.dutyCycle;
const loadWattsAC = isOn ? load.qty * load.watts * hourFraction : 0;
```

**Impact:**
- Fridge now cycles on/off correctly
- Startup surge can be modeled
- More accurate energy calculations

---

### Phase 2: Fix Load Shedding (Critical)

**Change:**
```typescript
// OLD (wrong):
if (remaining > 0) {
  const fraction = remaining / loadWattsDC;
  servedWattsDC += remaining;
  // Partial serving
}

// NEW (correct):
// Binary loads: either fully served or fully shed
if (load.type === 'binary') {
  if (loadWattsDC <= availablePowerDC) {
    servedWattsDC += loadWattsDC;
  } else {
    unservedWattsAC += loadWattsAC;
    shedLoads.push(load.label);
  }
}
// Cyclic loads: can be delayed
else if (load.type === 'cyclic') {
  if (loadWattsDC <= availablePowerDC) {
    servedWattsDC += loadWattsDC;
    load.currentState = 'on';
  } else {
    load.currentState = 'off';  // Delay cycle
    unservedWattsAC += loadWattsAC;
    shedLoads.push(`${load.label} (delayed)`);
  }
}
// Variable loads: reduce to lower state
else if (load.type === 'variable') {
  const reducedPower = shedVariableLoad(load);
  servedWattsDC += reducedPower / efficiency;
}
```

**Impact:**
- Realistic load shedding behavior
- No more "50% serving" of binary loads
- Proper handling of different load types

---

### Phase 3: Add Startup Surge (Important)

**Add:**
```typescript
interface LoadState {
  isStarting: boolean;
  startTime: number;
}

function calculateLoadPower(load: LoadItem, state: LoadState, time: number): number {
  let power = load.qty * load.watts;
  
  // Apply startup surge
  if (state.isStarting && load.startupSurge) {
    const surgeDuration = load.surgeDuration || 3;  // seconds
    const elapsed = time - state.startTime;
    if (elapsed < surgeDuration) {
      power *= load.startupSurge;
    } else {
      state.isStarting = false;
    }
  }
  
  return power;
}
```

**Impact:**
- Captures startup surge behavior
- More accurate inverter loading
- Better battery current modeling

---

### Phase 4: Add Hysteresis (Important)

**Add:**
```typescript
interface LoadState {
  lastStateChange: number;
  minOnTime: number;
  minOffTime: number;
}

function canChangeState(load: LoadItem, state: LoadState, time: number, newState: boolean): boolean {
  const timeSinceChange = time - state.lastStateChange;
  
  if (state.currentState === 'on' && !newState) {
    // Turning OFF
    return timeSinceChange >= state.minOnTime;
  } else if (state.currentState === 'off' && newState) {
    // Turning ON
    return timeSinceChange >= state.minOffTime;
  }
  
  return true;
}
```

**Impact:**
- Prevents rapid cycling
- Protects equipment
- More realistic behavior

---

### Phase 5: Sub-Hourly Variation (Nice to Have)

**Add:**
```typescript
interface LoadProfile {
  // Instead of 24 hourly values, use 96 15-minute values
  profile: number[];  // 96 values, 0-1
}

function getLoadFraction(load: LoadItem, minuteOfDay: number): number {
  const index = Math.floor(minuteOfDay / 15);  // 0-95
  return load.profile[index] || 0;
}
```

**Impact:**
- Captures within-hour variation
- More accurate peak demand
- Better battery drain modeling

---

## Implementation Plan

### Priority 1: Fix Duty Cycle (1-2 days)
- [ ] Change duty cycle from power reduction to time-based cycling
- [ ] Update load calculation logic
- [ ] Add tests for cyclic loads
- [ ] Update documentation

### Priority 2: Fix Load Shedding (2-3 days)
- [ ] Add load type classification (binary/cyclic/variable)
- [ ] Implement proper shedding logic for each type
- [ ] Remove partial serving of binary loads
- [ ] Add tests for load shedding
- [ ] Update UI to show load types

### Priority 3: Add Startup Surge (1-2 days)
- [ ] Add surge fields to LoadItem type
- [ ] Implement surge calculation
- [ ] Add tests for surge behavior
- [ ] Update warnings for surge handling

### Priority 4: Add Hysteresis (1-2 days)
- [ ] Add state tracking to loads
- [ ] Implement min on/off times
- [ ] Add tests for hysteresis
- [ ] Update documentation

### Priority 5: Sub-Hourly Variation (2-3 days)
- [ ] Change hourly profile to 15-minute profile
- [ ] Update load calculation
- [ ] Add tests for sub-hourly variation
- [ ] Update UI for finer control

**Total estimated effort:** 7-12 days

---

## Impact on Existing Features

### Calibration (M1)
- ✅ Still works (calibrates overall system behavior)
- ⚠️ May need re-calibration after load model changes
- 📝 Document that calibration captures average behavior

### Warnings
- ✅ Still works
- ⚠️ Add new warnings for:
  - Surge overload
  - Rapid cycling
  - Load shedding patterns

### UI
- ⚠️ Need to add load type selection
- ⚠️ Need to show load state (on/off/cycling)
- ⚠️ Need to show shedding details

### Performance
- ⚠️ Slightly slower (more complex load modeling)
- ✅ Still < 100ms for typical simulation

---

## Testing Strategy

### Unit Tests
- [ ] Cyclic load on/off behavior
- [ ] Binary load shedding
- [ ] Variable load reduction
- [ ] Startup surge calculation
- [ ] Hysteresis timing
- [ ] Sub-hourly variation

### Integration Tests
- [ ] Mixed load types in simulation
- [ ] Load shedding with surges
- [ ] Calibration with new load model
- [ ] Warning generation

### Golden Tests
- [ ] Fridge cycling pattern
- [ ] Light shedding behavior
- [ ] Fan speed reduction
- [ ] Startup surge impact
- [ ] Hysteresis prevention

---

## Conclusion

The current load shedding implementation has **fundamental issues** that make it unrealistic:

1. ❌ Duty cycle treated as power reduction (should be time-based)
2. ❌ Partial load serving (should be binary for most loads)
3. ❌ No startup surge handling
4. ❌ No hysteresis (rapid cycling)
5. ❌ No sub-hourly variation

**These issues must be fixed** to provide accurate, realistic simulations.

**Recommended approach:**
1. Fix duty cycle first (most critical)
2. Fix load shedding second (very critical)
3. Add startup surge third (important)
4. Add hysteresis fourth (important)
5. Add sub-hourly variation last (nice to have)

**Estimated effort:** 7-12 days  
**Risk:** Medium (changes core simulation logic)  
**Impact:** High (significantly improves accuracy)

---

**Status:** 🔴 **CRITICAL FIXES NEEDED**  
**Priority:** HIGH  
**Estimated effort:** 7-12 days  
**Ready for implementation:** After user approval
