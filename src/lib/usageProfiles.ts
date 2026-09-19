import { UsageProfile } from '../types';

/**
 * Generate hourly usage profile based on usage pattern.
 * Returns 24 values (0-1) representing fraction of time the load is ON each hour.
 * 
 * This is the key insight: loads don't all run the same way.
 * - Day loads: high during 6am-6pm, low at night
 * - Night loads: high during 6pm-6am, low during day
 * - Both: spread throughout the day
 * - Occasional: low probability, used for guest rooms etc.
 */
export function generateHourlyProfile(usage: UsageProfile, category?: string): number[] {
  const profile = new Array(24).fill(0);
  
  switch (usage) {
    case 'day':
      // 6am to 6pm: high usage
      for (let h = 0; h < 24; h++) {
        if (h >= 6 && h < 18) {
          // Peak during work hours
          if (h >= 9 && h < 17) profile[h] = 0.9;
          else profile[h] = 0.6;
        } else {
          profile[h] = 0.1;
        }
      }
      break;
      
    case 'night':
      // 6pm to 6am: high usage
      for (let h = 0; h < 24; h++) {
        if (h >= 18 || h < 6) {
          // Peak evening hours
          if (h >= 19 && h < 23) profile[h] = 1.0;
          else profile[h] = 0.7;
        } else {
          profile[h] = 0.1;
        }
      }
      break;
      
    case 'both':
      // Spread throughout the day with peaks
      for (let h = 0; h < 24; h++) {
        if (h >= 6 && h < 9) profile[h] = 0.7;      // Morning
        else if (h >= 9 && h < 12) profile[h] = 0.5; // Late morning
        else if (h >= 12 && h < 14) profile[h] = 0.6; // Lunch
        else if (h >= 14 && h < 18) profile[h] = 0.5; // Afternoon
        else if (h >= 18 && h < 23) profile[h] = 0.9; // Evening peak
        else profile[h] = 0.3;                         // Night
      }
      break;
      
    case 'occasional':
      // Low probability - guest room, seasonal, etc.
      for (let h = 0; h < 24; h++) {
        profile[h] = 0.15; // 15% chance of being used any given hour
      }
      break;
  }
  
  // Category-specific overrides
  if (category === 'medical') {
    // Medical devices run 24/7
    return new Array(24).fill(1.0);
  }
  
  if (category === 'water') {
    // Water pumps: morning and evening peaks
    const waterProfile = new Array(24).fill(0);
    for (let h = 0; h < 24; h++) {
      if (h >= 6 && h < 8) waterProfile[h] = 0.8;
      else if (h >= 18 && h < 20) waterProfile[h] = 0.8;
      else waterProfile[h] = 0.1;
    }
    return waterProfile;
  }
  
  return profile;
}

/**
 * Calculate effective load for a specific scenario
 */
export function getScenarioLoad(
  baseHourly: number[],
  scenario: 'day_outage' | 'night_outage' | 'worst_case'
): number[] {
  switch (scenario) {
    case 'day_outage':
      // Only count daytime hours (6am-6pm)
      return baseHourly.map((v, h) => (h >= 6 && h < 18) ? v : 0);
      
    case 'night_outage':
      // Only count nighttime hours (6pm-6am)
      return baseHourly.map((v, h) => (h < 6 || h >= 18) ? v : 0);
      
    case 'worst_case':
      // Use the load as-is (already represents typical usage)
      return baseHourly;
  }
}

/**
 * Get a human-readable label for usage profile
 */
export function getUsageLabel(usage: UsageProfile): string {
  switch (usage) {
    case 'day': return 'Daytime only';
    case 'night': return 'Nighttime only';
    case 'both': return 'All day';
    case 'occasional': return 'Occasional';
  }
}

/**
 * Get a short description for usage profile
 */
export function getUsageDescription(usage: UsageProfile): string {
  switch (usage) {
    case 'day': return 'Runs mainly 6am–6pm';
    case 'night': return 'Runs mainly 6pm–6am';
    case 'both': return 'Runs throughout the day';
    case 'occasional': return 'Used sometimes (guest room, seasonal)';
  }
}
