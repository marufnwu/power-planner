import { LoadItem, LoadType } from '../../types';
import { r2 } from './calculator';

/**
 * LoadSimulator - Realistic load behavior modeling
 * 
 * Handles:
 * - Binary loads (ON/OFF)
 * - Cyclic loads (fridge, AC with duty cycle)
 * - Variable loads (fans with multiple speeds)
 * - Startup surges
 * - Hysteresis (min ON/OFF times)
 * - Occupancy-based scheduling
 * - Seasonal variations
 */

export interface LoadState {
  loadId: string;
  isOn: boolean;
  currentState: number; // For variable loads (index into states array)
  lastStateChange: number; // Timestamp in seconds
  isStarting: boolean; // Startup surge active
  startTime: number; // When current state started
}

export class LoadSimulator {
  private states: Map<string, LoadState> = new Map();
  
  constructor(loads: LoadItem[]) {
    // Initialize load states
    for (const load of loads) {
      this.states.set(load.id, {
        loadId: load.id,
        isOn: load.loadType === 'binary' ? true : false,
        currentState: load.states ? load.states.length - 1 : 0, // Start at highest state
        lastStateChange: 0,
        isStarting: false,
        startTime: 0
      });
    }
  }
  
  /**
   * Calculate load power at specific time with realistic behavior
   */
  calculateLoadPower(
    load: LoadItem,
    timeSeconds: number,
    availablePower: number,
    hourFraction: number,
    seasonMultiplier: number = 1.0
  ): { power: number; state: LoadState } {
    const state = this.states.get(load.id)!;
    const loadType = load.loadType || 'binary';
    
    // Apply seasonal multiplier
    const adjustedHourFraction = hourFraction * seasonMultiplier;
    
    switch (loadType) {
      case 'binary':
        return this.simulateBinaryLoad(load, state, timeSeconds, availablePower, adjustedHourFraction);
      case 'cyclic':
        return this.simulateCyclicLoad(load, state, timeSeconds, availablePower, adjustedHourFraction);
      case 'variable':
        return this.simulateVariableLoad(load, state, timeSeconds, availablePower, adjustedHourFraction);
      case 'standby':
        return this.simulateStandbyLoad(load, state);
      default:
        return { power: 0, state };
    }
  }
  
  /**
   * Simulate binary load (lights, TV, router)
   * - Either ON or OFF
   * - No partial power
   * - Startup surge if configured
   */
  private simulateBinaryLoad(
    load: LoadItem,
    state: LoadState,
    timeSeconds: number,
    availablePower: number,
    hourFraction: number
  ): { power: number; state: LoadState } {
    const loadPower = load.qty * load.watts;
    
    // Check if should be ON based on hourly profile
    const shouldBeOn = hourFraction > 0.1;
    
    if (shouldBeOn && !state.isOn) {
      // Turn ON
      if (this.canTurnOn(load, state, timeSeconds, availablePower)) {
        state.isOn = true;
        state.isStarting = true;
        state.startTime = timeSeconds;
        state.lastStateChange = timeSeconds;
      }
    } else if (!shouldBeOn && state.isOn) {
      // Turn OFF
      if (this.canTurnOff(load, state, timeSeconds)) {
        state.isOn = false;
        state.isStarting = false;
        state.lastStateChange = timeSeconds;
      }
    }
    
    if (!state.isOn) {
      return { power: 0, state };
    }
    
    // Calculate power with startup surge
    let power = loadPower;
    if (state.isStarting && load.startupSurge) {
      const elapsed = timeSeconds - state.startTime;
      const surgeDuration = load.surgeDuration || 3;
      if (elapsed < surgeDuration) {
        power = loadPower * load.startupSurge;
      } else {
        state.isStarting = false;
      }
    }
    
    return { power: r2(power), state };
  }
  
  /**
   * Simulate cyclic load (fridge, AC, water pump)
   * - Cycles ON/OFF based on duty cycle
   * - Has startup surge
   * - Has minimum ON/OFF times (hysteresis)
   */
  private simulateCyclicLoad(
    load: LoadItem,
    state: LoadState,
    timeSeconds: number,
    availablePower: number,
    hourFraction: number
  ): { power: number; state: LoadState } {
    const loadPower = load.qty * load.watts;
    const cycleTime = 3600; // 1 hour cycle
    const cyclePosition = timeSeconds % cycleTime;
    const onTime = cycleTime * load.dutyCycle;
    
    // Determine if should be ON based on cycle and hourly profile
    const shouldBeOn = cyclePosition < onTime && hourFraction > 0.1;
    
    if (shouldBeOn && !state.isOn) {
      // Turn ON
      if (this.canTurnOn(load, state, timeSeconds, availablePower)) {
        state.isOn = true;
        state.isStarting = true;
        state.startTime = timeSeconds;
        state.lastStateChange = timeSeconds;
      }
    } else if (!shouldBeOn && state.isOn) {
      // Turn OFF
      if (this.canTurnOff(load, state, timeSeconds)) {
        state.isOn = false;
        state.isStarting = false;
        state.lastStateChange = timeSeconds;
      }
    }
    
    if (!state.isOn) {
      return { power: 0, state };
    }
    
    // Calculate power with startup surge
    let power = loadPower;
    if (state.isStarting && load.startupSurge) {
      const elapsed = timeSeconds - state.startTime;
      const surgeDuration = load.surgeDuration || 3;
      if (elapsed < surgeDuration) {
        power = loadPower * load.startupSurge;
      } else {
        state.isStarting = false;
      }
    }
    
    return { power: r2(power), state };
  }
  
  /**
   * Simulate variable load (fan, pump with multiple speeds)
   * - Can run at different power levels
   * - Multiple discrete states
   * - Can be shed by reducing speed
   */
  private simulateVariableLoad(
    load: LoadItem,
    state: LoadState,
    timeSeconds: number,
    availablePower: number,
    hourFraction: number
  ): { power: number; state: LoadState } {
    if (!load.states || load.states.length === 0) {
      return { power: 0, state };
    }
    
    const currentPower = load.states[state.currentState].power * load.qty;
    
    // Check if should be ON based on hourly profile
    const shouldBeOn = hourFraction > 0.1;
    
    if (shouldBeOn && !state.isOn) {
      // Turn ON
      if (this.canTurnOn(load, state, timeSeconds, availablePower)) {
        state.isOn = true;
        state.isStarting = true;
        state.startTime = timeSeconds;
        state.lastStateChange = timeSeconds;
      }
    } else if (!shouldBeOn && state.isOn) {
      // Turn OFF
      if (this.canTurnOff(load, state, timeSeconds)) {
        state.isOn = false;
        state.isStarting = false;
        state.lastStateChange = timeSeconds;
      }
    }
    
    if (!state.isOn) {
      return { power: 0, state };
    }
    
    // Calculate power with startup surge
    let power = currentPower;
    if (state.isStarting && load.startupSurge) {
      const elapsed = timeSeconds - state.startTime;
      const surgeDuration = load.surgeDuration || 3;
      if (elapsed < surgeDuration) {
        power = currentPower * load.startupSurge;
      } else {
        state.isStarting = false;
      }
    }
    
    return { power: r2(power), state };
  }
  
  /**
   * Simulate standby load (always ON, low power)
   * - TV standby, phone chargers, etc.
   * - Continuous low power draw
   */
  private simulateStandbyLoad(
    load: LoadItem,
    state: LoadState
  ): { power: number; state: LoadState } {
    // Standby loads are always ON
    state.isOn = true;
    const power = load.qty * load.watts;
    return { power: r2(power), state };
  }
  
  /**
   * Check if load can turn ON (hysteresis)
   */
  private canTurnOn(
    load: LoadItem,
    state: LoadState,
    timeSeconds: number,
    availablePower: number
  ): boolean {
    const minOffTime = (load.minOffTime || 5) * 60; // Convert to seconds
    const timeSinceChange = timeSeconds - state.lastStateChange;
    
    // Check minimum OFF time
    if (state.lastStateChange > 0 && timeSinceChange < minOffTime) {
      return false;
    }
    
    // Check available power (include surge)
    const loadPower = load.qty * load.watts;
    const surgePower = load.startupSurge ? loadPower * load.startupSurge : loadPower;
    
    return availablePower >= surgePower;
  }
  
  /**
   * Check if load can turn OFF (hysteresis)
   */
  private canTurnOff(
    load: LoadItem,
    state: LoadState,
    timeSeconds: number
  ): boolean {
    const minOnTime = (load.minOnTime || 10) * 60; // Convert to seconds
    const timeSinceChange = timeSeconds - state.lastStateChange;
    
    return timeSinceChange >= minOnTime;
  }
  
  /**
   * Shed load (reduce power or turn off)
   * Returns the new power level and description of what happened
   */
  shedLoad(load: LoadItem, state: LoadState): { power: number; shedAmount: string } {
    const loadType = load.loadType || 'binary';
    
    switch (loadType) {
      case 'binary':
        // Turn off completely
        state.isOn = false;
        state.lastStateChange = Date.now() / 1000;
        return { power: 0, shedAmount: 'OFF' };
        
      case 'cyclic':
        // Delay cycle (keep OFF longer)
        state.isOn = false;
        state.lastStateChange = Date.now() / 1000;
        return { power: 0, shedAmount: 'DELAYED' };
        
      case 'variable':
        // Reduce to lower state
        if (state.currentState > 0 && load.states) {
          state.currentState--;
          const newPower = load.states[state.currentState].power * load.qty;
          return { power: newPower, shedAmount: `REDUCED to ${load.states[state.currentState].label}` };
        } else {
          // Already at lowest state, turn off
          state.isOn = false;
          state.lastStateChange = Date.now() / 1000;
          return { power: 0, shedAmount: 'OFF' };
        }
        
      case 'standby':
        // Standby loads cannot be shed
        return { power: load.qty * load.watts, shedAmount: 'CANNOT SHED' };
        
      default:
        return { power: 0, shedAmount: 'UNKNOWN' };
    }
  }
  
  /**
   * Get all load states
   */
  getStates(): Map<string, LoadState> {
    return this.states;
  }
  
  /**
   * Reset all states
   */
  reset(): void {
    for (const state of this.states.values()) {
      state.isOn = false;
      state.currentState = 0;
      state.lastStateChange = 0;
      state.isStarting = false;
      state.startTime = 0;
    }
  }
}
