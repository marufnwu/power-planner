# User Insights That Improved This Tool

This document captures the real-world insights from users that led to significant improvements in the Home Power Planner.

---

## Insight #1: Load Variation Patterns

**User said:** "load variation, cause always ips not take same load, like day loadshedding not take lights loads, or guest room not take load always. also day and night has different loadshedding pattern."

**What we missed:** We were treating all loads as if they run 24/7. But in reality:
- Day outages don't need lights
- Night outages need lights + fans + TV
- Guest rooms are occasional
- Some loads (fridge, router) run all the time

**What we added:**
1. **Usage profiles** for each load:
   - ☀ Daytime (6am-6pm)
   - 🌙 Nighttime (6pm-6am)
   - ☀🌙 All day
   - ◌ Occasional (guest rooms, seasonal)

2. **Scenario comparison** in results:
   - Day outage runtime
   - Night outage runtime
   - Worst case runtime
   
   These can differ by 2-3x! A system might give 6h during day but only 3h at night.

**Why it matters:** This is what real installers think about. Your system's performance depends heavily on WHEN the outage happens, not just how long it lasts.

---

## Insight #2: Charge/Discharge Cycle Balance

**User said:** "also another thing, loadshedding time and non loadshedding time, cause when loadshedding power used from battery, but charging matter."

**What we missed:** We showed "runtime" as if the battery just drains to zero. But batteries don't work that way:
- During outage → battery discharges
- During grid time → battery recharges
- The real question: does it recover between outages?

**What we added:**
1. **Outage cycle analysis** showing:
   - Energy used during outage (kWh)
   - Recharge capacity (A, W)
   - Time needed to recharge vs time available
   - Grid window utilization %
   - Solar contribution (if present)

2. **Visual cycle representation:**
   ```
   [⚡ 1.5h outage] [🔌 3h grid]
   ```

3. **Clear recovery verdict:**
   - ✓ Recovers (needs 2h, has 3h)
   - ⚠ Barely recovers (needs 2.8h, has 3h)
   - ✗ Does not recover (needs 4h, has 3h)

4. **Enhanced summary text:**
   - "Battery recovers in 2.1h (you have 3h grid time)"
   - "⚠️ Battery needs 4.2h to recharge but only has 3h grid time"

**Why it matters:** A system that can't recharge between outages will gradually drain over multiple cycles. This is the #1 reason IPS systems fail in practice. Users need to see this clearly.

---

## Other Improvements Based on Missing Features

### Audit Page
**Problem:** Homepage promised "Audit my setup" but the route didn't exist.

**Solution:** Created `/audit` page where users can:
- Enter existing inverter/battery/solar specs
- Input current loads and outage pattern
- See real runtime with battery age degradation
- Get health issues and upgrade suggestions
- Jump to planner to explore upgrades

### Bangla Toggle
**Problem:** Spec said "Bangladesh-first" but UI was English-only.

**Solution:** Added EN / বাং toggle in navigation with basic translations for key UI elements.

### Interactive Topology
**Problem:** System diagram was decorative, not useful.

**Solution:** Topology now shows actual inverter VA and battery Ah from the user's configuration.

### Print Stylesheet
**Problem:** Print output was minimal and unusable.

**Solution:** Enhanced print CSS with proper page breaks, hidden controls, clean black text output.

---

## The Pattern

Both user insights followed the same pattern:
1. **We modeled something too simply** (loads always on, battery just drains)
2. **User pointed out real-world complexity** (loads vary by time, batteries recharge)
3. **We added the missing dimension** (usage profiles, cycle analysis)
4. **The tool became genuinely useful** instead of just theoretically correct

This is why user feedback is irreplaceable. We can build correct physics, but only users can tell us what we're missing about how systems actually work in practice.
