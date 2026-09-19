# Compare Configurations Feature

## Overview

The Compare page allows users to save up to 3 different system configurations and view them side-by-side to make informed decisions about which setup works best for their needs.

## Features

### Side-by-Side Comparison
- Compare up to 3 configurations simultaneously
- Visual highlighting of best values (green for max/min metrics)
- Automatic analysis and recommendations
- Share comparison via URL

### Metrics Compared
- **Runtime** - How long the system can power loads
- **Recharge time** - Time needed to recharge battery
- **Min SoC** - Minimum state of charge reached
- **Recovery status** - Whether system recovers between outages
- **Inverter rating** - VA capacity
- **Battery specs** - Ah, chemistry, configuration
- **Total energy** - Total battery bank capacity
- **Usable energy** - Energy available after DoD
- **Solar capacity** - Total Wp (if configured)
- **Outage pattern** - Grid availability
- **Average load** - Typical power consumption
- **Warnings** - Critical issues count

### Smart Analysis
The system automatically generates recommendations based on:
- Longest runtime configuration
- Recovery capability
- Cost-effectiveness
- Warning-free setups

## Usage

### Adding Configurations
1. Create a configuration in the Planner
2. Click "Compare" button in the planner header
3. Or navigate to `/compare` directly
4. Click "Add current" to save the current planner state
5. Repeat for up to 3 configurations

### Viewing Comparisons
- All metrics are displayed in a table format
- Best values are highlighted in green
- Automatic recommendations appear below the table
- Each configuration can be removed individually

### Sharing Comparisons
- Click "Share" button to copy comparison URL
- URL contains all configuration data
- Recipients can view the exact same comparison
- No backend required - all data in URL

## Technical Implementation

### State Management
```typescript
interface SavedConfig {
  id: string;
  name: string;
  project: Project;
  result: SimulationResult;
  timestamp: number;
}
```

### URL Encoding
- Configurations are encoded using LZ-String compression
- Stored in URL parameter `configs`
- Can be shared via link
- No server storage required

### Highlighting Logic
```typescript
// For metrics where higher is better (runtime, energy)
highlight="max"

// For metrics where lower is better (recharge time, warnings)
highlight="min"
```

## User Benefits

### Decision Making
- Compare different battery chemistries (LiFePO4 vs Tubular)
- Evaluate different inverter sizes
- Test solar vs non-solar configurations
- See impact of different outage patterns

### Cost Analysis
- Compare total system costs
- Evaluate cost per kWh delivered
- See trade-offs between upfront cost and performance

### Risk Assessment
- Identify configurations with warnings
- See which setups recover between outages
- Understand safety margins

## Examples

### Example 1: Battery Chemistry Comparison
```
Config A: LiFePO4 100Ah
- Runtime: 3.8h
- Recharge: 1.9h
- Cost: ৳32,000
- Recovery: ✓ Yes

Config B: Tubular 200Ah
- Runtime: 3.2h
- Recharge: 2.8h
- Cost: ৳18,000
- Recovery: ⚠ Barely
```
**Recommendation**: LiFePO4 offers longer runtime and full recovery, but costs 78% more.

### Example 2: Solar vs Non-Solar
```
Config A: No solar
- Runtime: 4.0h
- Monthly bill: ৳2,500
- System cost: ৳50,000

Config B: 1kWp solar
- Runtime: 4.0h
- Monthly bill: ৳1,800
- System cost: ৳75,000
```
**Recommendation**: Solar saves ৳700/month, payback in 3.6 years.

### Example 3: Inverter Sizing
```
Config A: 1.2kVA inverter
- Runtime: 3.8h
- Warnings: 2 critical (overload)
- Cost: ৳15,000

Config B: 2kVA inverter
- Runtime: 3.8h
- Warnings: 0
- Cost: ৳25,000
```
**Recommendation**: 2kVA inverter eliminates warnings for ৳10,000 more.

## Future Enhancements

### Planned Features
- Export comparison as PDF
- Save comparisons to localStorage
- Compare more than 3 configurations
- Custom metric selection
- Weighted scoring system
- Historical comparison tracking

### Advanced Analysis
- Total cost of ownership (TCO)
- Return on investment (ROI) calculations
- Risk scoring
- Performance vs cost trade-off curves
- Sensitivity analysis

## Accessibility

### Keyboard Navigation
- All interactive elements are keyboard accessible
- Focus indicators on all buttons
- Skip links for keyboard users
- ARIA labels on all interactive elements

### Screen Reader Support
- Semantic HTML structure
- ARIA roles and labels
- Descriptive link text
- Table headers properly associated

### Visual Accessibility
- High contrast ratios (WCAG AA)
- Color not used as sole indicator
- Text labels for all status indicators
- Scalable text sizes

## Performance

### Bundle Size
- ComparePage: 8.45 kB (3.01 kB gzipped)
- Lazy loaded - only loaded when needed
- No impact on initial page load

### Runtime Performance
- Simulations run on-demand
- Results cached in memory
- URL encoding/decoding is fast
- No network requests required

## Integration

### From Planner
- "Compare" button in planner header
- Saves current configuration
- Navigates to compare page
- Preserves planner state

### From Compare Page
- "Add current" button
- Links back to planner
- Maintains configuration context
- URL-based state sharing

## Documentation

### User Guide
1. Create first configuration in planner
2. Click "Compare" button
3. Adjust configuration in planner
4. Click "Add current" again
5. View side-by-side comparison
6. Analyze recommendations
7. Share or print results

### Developer Guide
- Component: `src/pages/ComparePage.tsx`
- State: Local component state
- Routing: `/compare` route
- Data: URL-encoded configurations
- Dependencies: Recharts, Lucide icons

## Testing

### Manual Testing Checklist
- [ ] Can add up to 3 configurations
- [ ] Can remove individual configurations
- [ ] Best values are highlighted correctly
- [ ] Recommendations are accurate
- [ ] Share URL works correctly
- [ ] Keyboard navigation works
- [ ] Screen reader announces correctly
- [ ] Mobile responsive layout
- [ ] Print layout is clean

### Automated Testing
- Unit tests for comparison logic
- Integration tests for URL encoding
- Accessibility tests with axe-core
- Visual regression tests

## Conclusion

The Compare feature empowers users to make data-driven decisions by viewing multiple system configurations side-by-side. It's a critical tool for evaluating trade-offs between cost, performance, and reliability.
