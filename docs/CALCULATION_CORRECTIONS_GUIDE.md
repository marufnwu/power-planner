# 📊 Calculation Corrections Guide

## What Are Real-World Corrections?

When you adjust parameters in the **Advanced Settings**, the calculator now applies **real-world corrections** to give you accurate predictions that match actual system performance.

---

## 🎯 How It Works

### Before (Incorrect)
```
User sets: Battery temperature = 40°C
Calculator: Ignores it, uses 25°C
Result: Wrong runtime prediction ❌
```

### After (Correct)
```
User sets: Battery temperature = 40°C
Calculator: Applies -7.5% capacity correction
Result: Accurate runtime prediction ✅
```

---

## 🔧 Corrections Applied

### 1. Battery Temperature Correction

**What it does:** Adjusts battery capacity based on temperature

**Formula:**
- LiFePO4: -0.2% per °C below 25°C, +0.2% per °C above 25°C (up to 45°C)
- Lead-acid: -0.5% per °C below 25°C, +0.5% per °C above 25°C (up to 45°C)

**Example:**
```
Battery: 100Ah LiFePO4
Temperature: 40°C (15°C above reference)
Correction: -0.2% × 15 = -3%
Effective capacity: 97Ah
```

**When to adjust:**
- Hot climates (Bangladesh summer): Set to 35-45°C
- Cold climates (winter): Set to 10-20°C
- Air-conditioned room: Set to 25°C

---

### 2. Battery Aging Correction

**What it does:** Reduces capacity based on battery age

**Formula:**
- LiFePO4: -2% per year
- Lead-acid: -5% per year
- AGM/Gel: -3% per year

**Example:**
```
Battery: 100Ah LiFePO4, 5 years old
Correction: -2% × 5 = -10%
Effective capacity: 90Ah
```

**When to adjust:**
- New battery: Set to 0 years
- Used battery: Set actual age
- Planning replacement: Set expected lifespan

---

### 3. Battery Health Correction

**What it does:** Direct capacity reduction based on health percentage

**Formula:**
```
Effective capacity = Rated capacity × (Health% / 100)
```

**Example:**
```
Battery: 100Ah, 85% health
Effective capacity: 100 × 0.85 = 85Ah
```

**When to adjust:**
- New battery: 100%
- After 2-3 years: 90-95%
- After 5 years: 80-85%
- Before replacement: 70-75%

**How to measure health:**
1. Fully charge battery
2. Discharge at known load
3. Measure actual capacity
4. Compare to rated capacity
5. Health% = (Actual / Rated) × 100

---

### 4. Inverter Efficiency Correction

**What it does:** Adjusts efficiency curve based on your inverter's actual performance

**Formula:**
```
Adjusted efficiency = Base efficiency × (User efficiency / 90%)
```

**Example:**
```
Base efficiency curve: 90% at 50% load
User sets: 88% efficiency
Adjusted: 90% × (88/90) = 88% at 50% load
```

**When to adjust:**
- Check inverter datasheet
- Typical range: 85-95%
- Lower quality inverters: 80-85%
- High quality inverters: 92-95%

---

### 5. Solar Temperature Correction

**What it does:** Reduces solar output based on panel temperature

**Formula:**
```
Cell temp = Ambient + (NOCT - 20) × (Irradiance / 800)
Power correction = 1 + (Temp coeff × (Cell temp - 25))
```

**Example:**
```
Ambient: 35°C
NOCT: 45°C
Irradiance: 800 W/m²
Cell temp: 35 + (45-20) × 1 = 60°C
Temp coeff: -0.35%/°C
Correction: 1 + (-0.0035 × 35) = 0.8775
Power reduction: -12.25%
```

**When to adjust:**
- Hot climates: Set ambient to 35-45°C
- Cool climates: Set ambient to 15-25°C
- Check panel datasheet for NOCT (typically 45-48°C)

---

### 6. Solar Degradation Correction

**What it does:** Reduces solar output based on panel age

**Formula:**
```
Degradation factor = 1 - (Degradation rate × Years)
```

**Example:**
```
Panels: 5 years old
Degradation rate: 0.5% per year
Correction: 1 - (0.005 × 5) = 0.975
Power reduction: -2.5%
```

**When to adjust:**
- New panels: 0.5% per year (typical)
- High quality panels: 0.3% per year
- Low quality panels: 0.7-1.0% per year
- Check manufacturer warranty for exact rate

---

### 7. System Losses Correction

**What it does:** Accounts for energy lost in wiring, connections, and mismatches

**Components:**

**Wiring losses:**
- Typical: 2%
- Long cable runs: 3-5%
- Short cable runs: 1%

**Soiling losses:**
- Clean panels: 2%
- Dusty environment: 5-8%
- Very dusty: 10-15%
- Bird droppings: 5-20%

**Mismatch losses:**
- Same brand/model: 2%
- Mixed panels: 3-5%
- Partial shading: 5-10%

**Example:**
```
Wiring: 2%
Soiling: 5%
Mismatch: 3%
Total loss: 1 - (0.98 × 0.95 × 0.97) = 9.7%
```

**When to adjust:**
- Clean, well-designed system: 5-7% total
- Dusty, long cables: 10-15% total
- Shaded, mixed panels: 15-20% total

---

### 8. Diversity Factor Correction

**What it does:** Accounts for the fact that not all loads run simultaneously

**Formula:**
```
Effective load = Connected load × Diversity factor
```

**Example:**
```
Connected loads: 1000W
Diversity factor: 0.8
Effective load: 1000 × 0.8 = 800W
```

**When to adjust:**
- All loads run together: 1.0
- Typical household: 0.7-0.8
- Office with staggered use: 0.6-0.7
- Industrial with heavy cycling: 0.5-0.6

---

### 9. Safety Margin Correction

**What it does:** Adds buffer capacity for unexpected loads and conditions

**Formula:**
```
Required capacity = Calculated capacity × (1 + Safety margin)
```

**Example:**
```
Calculated: 100Ah battery needed
Safety margin: 20%
Required: 100 × 1.2 = 120Ah
```

**When to adjust:**
- Critical loads (medical): 30-50%
- Normal household: 20-30%
- Budget-conscious: 10-15%
- Oversized system: 5-10%

---

## 📊 Visual Corrections Indicator

When corrections are applied, you'll see a blue info box in the results:

```
ℹ️ Real-world corrections applied:
  Temperature: -7.5%
  Aging: -10%
  Health: -15%
  Efficiency: -2.2%
  Losses: -11%
```

**What this means:**
- Each correction is shown as a percentage
- Negative values reduce capacity/performance
- Positive values increase capacity/performance
- All corrections are combined for final result

---

## 🎯 How to Use This Guide

### Step 1: Gather Your Data

**For battery:**
- [ ] Chemistry type (LiFePO4, lead-acid, etc.)
- [ ] Rated capacity (Ah)
- [ ] Age (years)
- [ ] Health percentage (if known)
- [ ] Installation location temperature

**For inverter:**
- [ ] Brand and model
- [ ] Efficiency from datasheet
- [ ] Idle consumption (W)

**For solar:**
- [ ] Panel brand and model
- [ ] Age (years)
- [ ] NOCT from datasheet
- [ ] Installation location temperature
- [ ] Environment (dusty, clean, shaded)

**For system:**
- [ ] Cable lengths and sizes
- [ ] Load diversity (how often loads run together)
- [ ] Safety requirements (critical vs normal)

### Step 2: Enter Values in Advanced Settings

1. Open the planner
2. Go to "System" step
3. Scroll to "Advanced Settings"
4. Expand the section
5. Enter your values
6. Watch results update in real-time

### Step 3: Verify Corrections

1. Check the blue info box in results
2. Verify all corrections are shown
3. Confirm values match your expectations
4. Adjust if needed

### Step 4: Interpret Results

**Example interpretation:**
```
Base runtime: 4.2 hours
After corrections: 2.3 hours

Corrections applied:
- Temperature: -7.5% (hot climate)
- Aging: -10% (5 year old battery)
- Health: -15% (85% health)
- Efficiency: -2.2% (88% inverter)
- Losses: -11% (system losses)

Total reduction: 45%
```

**What this tells you:**
- Your system will run 2.3 hours, not 4.2 hours
- Real-world conditions significantly impact performance
- You may need larger battery than calculated
- Consider upgrading old battery

---

## 🔍 Common Scenarios

### Scenario 1: New System in Hot Climate

**Settings:**
- Battery temperature: 40°C
- Battery age: 0 years
- Battery health: 100%
- Inverter efficiency: 92%
- Solar temperature: 45°C
- System losses: 8%

**Expected corrections:**
- Temperature: -3% (battery)
- Solar: -10% (panels)
- Losses: -8%
- Total: ~-20%

**Result:** Runtime will be ~20% less than ideal calculations

---

### Scenario 2: Old System in Normal Climate

**Settings:**
- Battery temperature: 25°C
- Battery age: 7 years
- Battery health: 80%
- Inverter efficiency: 85%
- Solar age: 7 years
- System losses: 12%

**Expected corrections:**
- Aging: -14% (battery)
- Health: -20%
- Efficiency: -5.5%
- Solar degradation: -3.5%
- Losses: -12%
- Total: ~-50%

**Result:** Runtime will be ~50% less than new system

---

### Scenario 3: Budget System with Minimal Corrections

**Settings:**
- Battery temperature: 25°C
- Battery age: 0 years
- Battery health: 100%
- Inverter efficiency: 90%
- System losses: 5%
- Safety margin: 10%

**Expected corrections:**
- Losses: -5%
- Safety: +10% (increases required capacity)
- Total: ~-5% (plus 10% safety buffer)

**Result:** Runtime will be ~5% less than ideal, with 10% safety buffer

---

## 💡 Tips for Accurate Results

### 1. Be Honest About Conditions
- Don't underestimate temperature
- Don't overestimate battery health
- Don't ignore system losses
- Be realistic about diversity

### 2. Measure When Possible
- Use multimeter to check battery voltage
- Use clamp meter to check actual current
- Use solar meter to check panel output
- Monitor actual runtime vs predicted

### 3. Update Regularly
- Re-measure battery health every 6 months
- Update age as battery gets older
- Adjust for seasonal temperature changes
- Re-evaluate after system modifications

### 4. Document Your Settings
- Save your advanced settings
- Note when you measured values
- Track changes over time
- Compare predicted vs actual performance

---

## 🎓 Understanding the Math

### Combined Correction Formula

```
Final capacity = Rated capacity × 
  (1 + temp_correction) × 
  (1 - aging_correction) × 
  (health / 100) × 
  (1 - loss_correction)
```

### Example Calculation

```
Rated: 100Ah
Temperature: 40°C → -3% = 0.97
Aging: 5 years → -10% = 0.90
Health: 85% = 0.85
Losses: 10% = 0.90

Final = 100 × 0.97 × 0.90 × 0.85 × 0.90
Final = 67.0Ah

Runtime will be based on 67Ah, not 100Ah
```

---

## ❓ FAQ

**Q: Why don't I see any corrections?**  
A: If all your settings are at defaults, no corrections are shown. Change a value and you'll see the correction appear.

**Q: Can corrections be positive?**  
A: Yes! If you set temperature below 25°C, battery capacity increases (up to a point).

**Q: Do corrections affect all results?**  
A: Yes - runtime, recharge time, costs, and all derived calculations use corrected values.

**Q: How accurate are the corrections?**  
A: They're based on industry standards and manufacturer data. Actual performance may vary ±10%.

**Q: Should I always use corrections?**  
A: Yes! Without corrections, you'll get optimistic results that don't match reality.

**Q: Can I save my correction settings?**  
A: Yes! Settings are saved in the URL. Share the URL to save/restore your configuration.

---

## 🚀 Next Steps

1. **Open the planner**
2. **Configure your system** (loads, battery, inverter, solar)
3. **Open Advanced Settings**
4. **Enter your real-world values**
5. **Check the corrections indicator**
6. **Review the adjusted results**
7. **Make informed decisions** based on accurate predictions

---

## 📞 Need Help?

- **Documentation:** [PARAMETER_APPLICATION_FIX.md](./PARAMETER_APPLICATION_FIX.md)
- **Technical details:** [CALCULATION_FACTORS.md](./CALCULATION_FACTORS.md)
- **User guide:** [USER_CONTROL.md](./USER_CONTROL.md)

---

**Remember:** Accurate inputs = Accurate predictions. Take time to measure and enter real values for the best results!
