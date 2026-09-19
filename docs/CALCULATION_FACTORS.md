# Real-World Calculation Factors

This document outlines all the factors that affect actual power system performance, beyond the basic physics.

## Battery Factors

### 1. Temperature Effects
- **Capacity**: Drops ~20% at 0°C, increases ~5% at 40°C (but life decreases)
- **Internal resistance**: Increases in cold, causing voltage sag
- **Charging efficiency**: Reduced in extreme temperatures
- **Life expectancy**: Halved for every 10°C above 25°C (Arrhenius equation)
- **Formula**: `Capacity_temp = Capacity_rated × (1 - 0.005 × (25 - T))` for lead-acid

### 2. Aging & Degradation
- **Cycle life**: We model this, but real degradation is non-linear
- **Calendar aging**: Even unused batteries degrade (~5% per year for LiFePO4)
- **Capacity fade**: Typically 20% loss at end-of-life (80% remaining capacity)
- **Impedance growth**: Internal resistance increases with age
- **Formula**: `Capacity_age = Capacity_rated × (1 - 0.02 × years)` (simplified)

### 3. Depth of Discharge Impact
- **Peukert effect**: Lead-acid capacity reduces at high discharge rates
- **Cycle life vs DoD**: Exponential relationship, not linear
- **Partial state of charge**: Sulfation in lead-acid if left partially charged
- **Formula**: `Cycles = Cycles_100% × (DoD^-1.5)` (approximation)

### 4. Charging Profile
- **Bulk phase**: Constant current until absorption voltage
- **Absorption phase**: Constant voltage, current tapers
- **Float phase**: Maintenance charging
- **Equalization**: Periodic overcharge for flooded batteries
- **Impact**: Incorrect charging reduces life by 50%+

## Inverter Factors

### 5. Efficiency Curve
- **No-load consumption**: 10-50W idle draw
- **Peak efficiency**: Usually at 30-50% load
- **Low load penalty**: <20% load = poor efficiency (70-80%)
- **Overload capacity**: Typically 200% for 1 second, 150% for 10 minutes
- **Formula**: `η = η_peak × (1 - 0.3 × (1 - load_ratio))` for load_ratio < 0.3

### 6. Power Factor
- **Real power (W)**: Actual work done
- **Apparent power (VA)**: V × I
- **Power factor**: PF = W/VA (0.6-0.95 typical)
- **Impact**: Low PF means larger inverter needed
- **Formula**: `Inverter_VA = Load_W / PF`

### 7. Waveform Quality
- **Pure sine wave**: Required for sensitive electronics
- **Modified sine wave**: Cheaper, but causes issues with some loads
- **THD (Total Harmonic Distortion)**: Should be <3%
- **Impact**: Poor waveform = equipment damage, inefficiency

## Solar Factors

### 8. Irradiance Variation
- **Seasonal**: Winter = 50-70% of summer production
- **Daily**: Cloud cover, haze, pollution
- **Hourly**: Not a perfect sine wave (morning/evening losses)
- **Soiling**: Dust, bird droppings (5-20% loss)
- **Shading**: Partial shading causes disproportionate losses
- **Formula**: `Production = P_rated × (G/1000) × η_system`

### 9. Temperature Coefficients
- **Power output**: -0.3% to -0.5% per °C above 25°C
- **Voltage**: -0.3% per °C (affects string sizing)
- **Current**: +0.05% per °C (minor effect)
- **Formula**: `P_actual = P_rated × (1 + γ × (T_cell - 25))`

### 10. System Losses
- **Wiring**: 1-3% (voltage drop)
- **Mismatch**: 2-5% (panel variations)
- **Inverter**: 3-8% (conversion loss)
- **Soiling**: 2-5% (dirt on panels)
- **Degradation**: 0.5-1% per year
- **Availability**: 1-3% (downtime)
- **Total system efficiency**: 75-85% typical

## Load Factors

### 11. Simultaneity & Diversity
- **Diversity factor**: Not all loads run simultaneously (0.6-0.8)
- **Demand factor**: Max demand / connected load (0.5-0.9)
- **Load factor**: Average load / peak load (0.3-0.7)
- **Impact**: Allows smaller system sizing
- **Formula**: `Peak_load = Σ(Load_i × diversity_i)`

### 12. Load Characteristics
- **Resistive**: Heaters, incandescent (PF=1.0)
- **Inductive**: Motors, transformers (PF=0.6-0.85)
- **Capacitive**: Some electronics (PF leading)
- **Non-linear**: Computers, LEDs (harmonics)
- **Starting current**: Motors draw 5-7× rated current

### 13. Load Growth
- **Future expansion**: 20-30% headroom recommended
- **Appliance addition**: New devices over time
- **Capacity upgrade**: Should plan for 5-10 year growth
- **Formula**: `Design_load = Current_load × 1.25`

## Environmental Factors

### 14. Ambient Conditions
- **Temperature**: Affects all components
- **Humidity**: Corrosion, insulation breakdown
- **Altitude**: Reduced cooling above 1000m
- **Dust/salt**: Accelerated degradation
- **Ventilation**: Critical for battery life

### 15. Installation Quality
- **Cable sizing**: Undersized = voltage drop, heat
- **Connections**: Loose = hot spots, fire risk
- **Ventilation**: Poor = reduced life
- **Mounting**: Vibration, mechanical stress

## Grid Factors

### 16. Grid Quality
- **Voltage variation**: ±10% affects charging
- **Frequency stability**: Affects inverter synchronization
- **Harmonics**: From grid can damage equipment
- **Outage pattern**: Predictable vs random

### 17. Tariff Structure
- **Time-of-use**: Peak vs off-peak rates
- **Demand charges**: Based on peak kW
- **Net metering**: Export rates vs import rates
- **Fixed charges**: Monthly connection fees

## Safety Margins

### 18. Design Margins
- **Inverter**: 25% above peak load
- **Battery**: 20% above required capacity
- **Solar**: 15% above energy requirement
- **Cables**: 25% above max current
- **Fuses**: 125% of continuous current

### 19. Redundancy
- **Critical loads**: N+1 redundancy
- **Battery strings**: Parallel for redundancy
- **Charge controllers**: Dual for critical systems
- **Impact**: Increases cost but improves reliability

## Maintenance Factors

### 20. O&M Requirements
- **Battery**: Watering (flooded), cleaning, testing
- **Solar**: Cleaning, inspection, monitoring
- **Inverter**: Filter cleaning, firmware updates
- **Connections**: Torque checks, thermal imaging
- **Impact**: Poor maintenance = 30-50% life reduction

## Calculation Approach

### Comprehensive Formula

```
System_Runtime = (Battery_Capacity × DoD × η_inverter × η_battery × η_temp × η_age) / 
                 (Load_Power × diversity_factor × safety_margin)

Solar_Production = Panel_Power × PSH × η_system × η_temp × η_soiling × η_degradation

Battery_Life = min(Cycle_Life / (DoD_cycles_per_year), Calendar_Life)

Levelized_Cost = (System_Cost + O&M_Cost × Years) / (Energy_Delivered × Years)
```

### Monte Carlo Simulation

For realistic results, we should:
1. **Sample from distributions** (not just point estimates)
2. **Account for correlations** (temperature affects both capacity and load)
3. **Model extreme events** (heat waves, extended outages)
4. **Include degradation over time** (year-by-year simulation)

### Sensitivity Analysis

Show users how results change with:
- ±10% load variation
- ±20% solar production
- ±5°C temperature
- ±10% battery capacity
- Different outage patterns

## Implementation Priority

### Phase 1 (Current)
- Basic physics (voltage, current, power, energy)
- Efficiency curves
- Peukert effect
- Simple temperature correction

### Phase 2 (Next)
- Detailed temperature modeling
- Aging/degradation curves
- Seasonal solar variation
- Load diversity factors

### Phase 3 (Future)
- Monte Carlo simulation
- Hourly weather data integration
- Time-of-use tariff optimization
- Predictive maintenance alerts

## Transparency

Every calculation should show:
1. **Input assumptions** (what we're assuming)
2. **Calculation method** (how we're computing it)
3. **Uncertainty range** (min/typical/max)
4. **Sensitivity** (what matters most)
5. **Validation** (how we know it's correct)

This builds trust and helps users make informed decisions.
