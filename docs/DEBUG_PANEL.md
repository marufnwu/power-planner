# Debug Panel - Complete Calculation Transparency

## Overview

The Debug Panel provides complete transparency into all calculations, parameters, and corrections applied in the Home Power Planner. It allows users and developers to verify that all factors are being correctly applied.

## Access

The Debug Panel is accessible via a floating bug icon (🐛) in the bottom-right corner of the Planner page. Click to open the full debug interface.

## Features

### 1. Four Main Tabs

#### Inputs Tab
Shows the raw project configuration:
- **Project Configuration**: Complete project object with all settings
- **Loads**: Detailed breakdown of each load including:
  - Quantity, watts, power factor
  - Duty cycle, surge multiplier
  - Usage profile (day/night/both/occasional)
  - Backup circuit status
  - Average hourly usage
- **Grid Configuration**: Outage duration, grid time, operating mode, assumption set

#### Corrections Tab
Shows all applied corrections and their impact:
- **Advanced Settings**: All 17+ user-adjustable parameters
- **Applied Corrections**: Visual list showing:
  - Temperature correction (°C and % impact)
  - Battery age correction (years and % impact)
  - Battery health correction (% and impact)
  - Inverter efficiency correction (% and impact)
  - System losses correction (% and impact)
  - Diversity factor correction (factor and % reduction)
  - Safety margin correction (% increase)
- **Enhanced Project**: The modified project object after all corrections are applied

#### Calculations Tab
Shows the step-by-step calculation process:
1. **Load Calculation**: `Total Load = Σ(qty × watts × dutyCycle × hourly × diversity)`
2. **DC Draw**: `DC Watts = AC Watts / Efficiency + Idle`
3. **Battery Capacity**: `Energy = Voltage × Ah × DoD × Health × Age`
4. **Runtime**: `Runtime = Usable Energy / DC Watts`
5. **Recharge Time**: `Recharge = Energy Removed / Charge Power`
6. **Solar Production**: `Solar = Wp × PSH × Derate × Temp × Degradation`

Also shows simulation details:
- Number of steps, step size, simulation days
- Initial SoC, minimum SoC, average DoD
- Cycles per day, recovery status

#### Results Tab
Shows the complete simulation results:
- **Simulation Results**: Full result object with all metrics
- **Warnings**: All generated warnings with severity levels
- **Energy Balance**: 
  - Solar generated/used/clipped
  - Grid used
  - Unserved energy
  - Overall efficiency

### 2. Copy All Data

Click the "Copy All" button to copy the complete debug data as JSON:
```json
{
  "timestamp": "2026-09-19T...",
  "inputs": { ... },
  "corrections": { ... },
  "enhancedProject": { ... },
  "results": { ... }
}
```

This is useful for:
- Reporting bugs
- Verifying calculations
- Sharing configurations
- Debugging issues

### 3. Visual Indicators

Each correction shows:
- **Green dot**: Correction is active (value differs from default)
- **Gray dot**: Correction is inactive (value matches default)
- **Impact percentage**: Shows how much the correction affects the result
- **Before/after values**: Shows the original and corrected values

## Use Cases

### For Users
- **Verify calculations**: See exactly how your settings affect results
- **Understand corrections**: See which factors are being applied
- **Debug issues**: If results seem wrong, check the debug panel
- **Learn the system**: Understand how different parameters interact

### For Developers
- **Test changes**: Verify that code changes produce expected results
- **Debug bugs**: Trace through calculations to find issues
- **Validate logic**: Ensure all factors are being applied correctly
- **Document behavior**: Show exactly what the system does

### For Support
- **Diagnose problems**: Get complete data from users
- **Verify reports**: Check if user configurations are correct
- **Reproduce issues**: Copy debug data to reproduce problems
- **Provide solutions**: See exactly what corrections are applied

## Example Debug Session

### Scenario: User reports runtime seems too short

1. **Open Debug Panel** (click bug icon)
2. **Check Inputs Tab**:
   - Verify loads are correct
   - Check grid configuration
   - Confirm battery settings
3. **Check Corrections Tab**:
   - See which corrections are active
   - Check if temperature correction is too aggressive
   - Verify battery age/health settings
4. **Check Calculations Tab**:
   - See step-by-step calculation
   - Verify formulas are correct
   - Check intermediate values
5. **Check Results Tab**:
   - See final simulation results
   - Check for warnings
   - Verify energy balance

### Scenario: Developer testing new feature

1. **Make code changes**
2. **Open Debug Panel**
3. **Compare before/after**:
   - Check Inputs tab for configuration
   - Check Corrections tab for applied factors
   - Check Calculations tab for formulas
   - Check Results tab for final output
4. **Copy All data** for documentation
5. **Verify correctness** of new behavior

## Technical Details

### Component Structure
```
DebugPanel
├── Header (title, copy button, close button)
├── Tabs (inputs, corrections, calculations, results)
└── Content
    ├── DebugSection (reusable container)
    ├── DebugObject (JSON display)
    ├── CorrectionRow (correction display)
    └── CalcStep (calculation step display)
```

### Data Flow
```
PlannerPage
├── project (raw input)
├── calcSettings (user adjustments)
├── enhancedProject (after corrections)
└── result (simulation output)
    ↓
DebugPanel (receives all data)
    ↓
Display (organized by tab)
```

### Performance
- **Lazy rendering**: Only renders visible tab content
- **Memoized data**: Uses useMemo for expensive calculations
- **Efficient updates**: Only re-renders when data changes
- **Copy optimization**: Serializes data only when requested

## Accessibility

- **Keyboard navigation**: All tabs and buttons are keyboard accessible
- **Screen reader support**: Proper ARIA labels and roles
- **High contrast**: Works in both light and dark modes
- **Focus indicators**: Clear focus states for all interactive elements

## Future Enhancements

### Planned Features
1. **Calculation graph**: Visual flow of calculations
2. **Comparison mode**: Side-by-side comparison of different configurations
3. **Export options**: PDF, CSV, Markdown formats
4. **Historical data**: Track changes over time
5. **Annotation system**: Add notes to specific values
6. **Validation warnings**: Highlight potential issues
7. **Performance metrics**: Show calculation time and complexity

### Advanced Debugging
1. **Step-through mode**: Walk through calculations step by step
2. **Breakpoints**: Pause at specific calculation steps
3. **Variable inspection**: Hover to see variable values
4. **Formula editor**: Modify formulas in real-time
5. **What-if analysis**: Change inputs and see immediate results

## Documentation

### For Users
- How to access the debug panel
- What each tab shows
- How to interpret the data
- How to copy and share data

### For Developers
- Component structure
- Data flow
- How to extend the panel
- How to add new debug information

### For Support
- How to request debug data from users
- How to interpret debug information
- Common issues and how to diagnose them
- How to reproduce problems

## Conclusion

The Debug Panel provides complete transparency into the Home Power Planner's calculations. It's an essential tool for:
- **Users** who want to understand and verify their results
- **Developers** who need to test and debug the system
- **Support** who need to diagnose user issues

By showing all inputs, corrections, calculations, and results, the Debug Panel ensures that the system is transparent, trustworthy, and debuggable.
