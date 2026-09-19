import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';

interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
}

const articles: Article[] = [
  {
    id: 'ips-vs-hybrid',
    title: 'IPS vs UPS vs Hybrid Inverter',
    summary: 'What are the differences and which one do you need?',
    content: `**IPS (Inverter Power Supply):** A basic inverter that converts battery DC to AC during outages. It charges the battery from the grid when power is available. Simple, affordable, but doesn't reduce your electricity bill.

**UPS (Uninterruptible Power Supply):** Provides instant switchover (milliseconds). Good for computers and sensitive electronics. Usually smaller capacity.

**Hybrid Inverter:** Can manage multiple sources — grid, solar panels, and battery — intelligently. Can run in different modes (SBU, solar-first, etc.). More expensive but enables solar integration and bill savings.

**Which do you need?**
- If you just need backup during outages → IPS is sufficient
- If you want to add solar now or later → Hybrid inverter
- If you have sensitive electronics → UPS or hybrid with UPS-mode`,
  },
  {
    id: 'sizing-inverter',
    title: 'How to size an inverter',
    summary: 'The key numbers: running watts, surge watts, and VA.',
    content: `**Step 1: Calculate total running watts**
Add up all appliances that will run simultaneously on backup:
- 3 fans × 70W = 210W
- 3 lights × 10W = 30W
- 1 router × 12W = 12W
- Total: 252W

**Step 2: Calculate total VA**
Divide each appliance's watts by its power factor, then sum:
- Fans: 210W / 0.85 = 247 VA
- Lights: 30W / 0.9 = 33 VA
- Router: 12W / 0.9 = 13 VA
- Total: ~293 VA

**Step 3: Add headroom (25%)**
293 × 1.25 = 366 VA → round up to 400-500 VA minimum

**Step 4: Check surge capacity**
If you have a fridge (surge ~5× running), the compressor startup needs:
150W × 5 = 750W surge for a few seconds
Your inverter must handle this surge without tripping.

**Rule of thumb:** For 3 fans + 3 lights + router, a 800-1200 VA inverter is comfortable.`,
  },
  {
    id: 'va-vs-w',
    title: 'VA vs Watts — why both matter',
    summary: 'Apparent power (VA) vs real power (W) and power factor.',
    content: `**Watts (W)** = real power that does actual work (heat, light, motion)

**VA (Volt-Amps)** = apparent power = V × I (voltage × current)

**Power Factor (PF)** = W / VA (ranges from 0 to 1)

For resistive loads (heaters, incandescent bulbs): PF ≈ 1.0, so W = VA
For motors, compressors, electronics: PF = 0.6–0.9, so VA > W

**Why it matters for inverters:**
Inverters are rated in VA because they must supply the current. A 1000VA inverter at PF 0.8 delivers only 800W of real power. If your load has poor power factor, you need a bigger inverter even if the wattage seems low.

**Example:** A 500W motor at PF 0.7 needs 714 VA. A 600VA inverter would be overloaded even though 500W < 600W.`,
  },
  {
    id: 'lifepo4-vs-tubular',
    title: 'LiFePO4 vs Tubular Lead-Acid',
    summary: 'The two most common battery types for home IPS in Bangladesh.',
    content: `**LiFePO4 (Lithium Iron Phosphate)**
- ✅ Usable DoD: 80-90% (most of the capacity is usable)
- ✅ Cycle life: 3000-5000+ cycles
- ✅ Lightweight (12kg for 100Ah)
- ✅ Fast charging (1C rate possible)
- ✅ No maintenance
- ❌ Higher upfront cost (৳30,000-60,000)
- ❌ Needs BMS (Battery Management System)

**Tubular Lead-Acid**
- ✅ Lower upfront cost (৳15,000-25,000)
- ✅ Well-understood technology
- ❌ Usable DoD: only 50% (half the capacity is "wasted")
- ❌ Cycle life: 500-1200 cycles at 50% DoD
- ❌ Heavy (50-60kg for 200Ah)
- ❌ Slow charging (0.1-0.2C)
- ❌ Needs ventilation, periodic water top-up

**Cost per kWh delivered over lifetime:**
- LiFePO4 100Ah: ৳32,000 / (1.15 kWh × 3000 cycles) ≈ ৳9.3/kWh/cycle
- Tubular 200Ah: ৳18,000 / (1.2 kWh × 800 cycles) ≈ ৳18.8/kWh/cycle

Lithium is cheaper over the long term despite higher upfront cost.`,
  },
  {
    id: 'dod-explained',
    title: 'What is DoD and why does it matter?',
    summary: 'Depth of Discharge determines how much of your battery you can actually use.',
    content: `**DoD (Depth of Discharge)** = how much of the battery's capacity you use before recharging.

If a 100Ah battery has 80% DoD, you can use 80Ah before recharging. The remaining 20Ah is "reserved" to protect the battery.

**Why it matters:**
- Deeper discharge = fewer total cycles (battery wears out faster)
- LiFePO4 can handle 80-90% DoD with minimal life impact
- Lead-acid should stay at 50% DoD for good life

**Example:**
- 200Ah tubular at 50% DoD = 100Ah usable → ~1.2 kWh usable
- 100Ah LiFePO4 at 90% DoD = 90Ah usable → ~1.15 kWh usable

Despite the LiFePO4 being "smaller" in Ah, the usable energy is almost the same!

**Rule of thumb:** Don't regularly discharge below 20% SoC for any chemistry.`,
  },
  {
    id: 'fridge-surge',
    title: 'Why your fridge needs a bigger inverter',
    summary: 'Compressor startup surge can be 5× running power.',
    content: `A refrigerator's compressor motor needs a huge burst of current when it starts — typically 4-6 times its running wattage, for 1-3 seconds.

**Example:**
- Running: 150W
- Startup surge: 150W × 5 = 750W (for ~2 seconds)

If your inverter is rated 800VA (about 640W at PF 0.8), the fridge surge alone might trip it, even though running power is fine.

**What to do:**
1. Size the inverter for the surge, not just running load
2. Use a "soft start" device on the fridge (reduces surge to ~2×)
3. Put the fridge on a separate circuit with a larger inverter
4. Choose an inverter with good surge tolerance (some handle 2× for 10 seconds)

**Important:** Never put a fridge on a small IPS with other loads. The combined surge will likely trip the inverter.`,
  },
  {
    id: 'battery-life',
    title: 'How long will my battery last?',
    summary: 'Cycle life, calendar life, and what affects them.',
    content: `Battery life depends on two things:
1. **Cycle life** — how many charge/discharge cycles before capacity drops to 80%
2. **Calendar life** — chemical aging even without use

**Factors that reduce life:**
- Deep daily discharge (high DoD)
- High temperatures (>35°C)
- Overcharging or undercharging
- Not using the correct charge profile

**Typical lifespans:**
| Chemistry | Cycles at 50% DoD | Calendar Life |
|-----------|-------------------|---------------|
| LiFePO4 | 4000-6000 | 10-15 years |
| Tubular | 800-1200 | 3-5 years |
| Flooded | 500-800 | 2-4 years |
| AGM/Gel | 600-1000 | 4-6 years |

**Real-world example:**
If you cycle a tubular battery once per day at 50% DoD:
- 1000 cycles ÷ 365 = ~2.7 years before replacement
- But if outages are only 3-4 times per week: ~4 years

LiFePO4 at same usage: 4000 ÷ 365 = ~11 years`,
  },
  {
    id: 'how-many-panels',
    title: 'How many solar panels do I need?',
    summary: 'Sizing solar for backup recharge vs bill savings.',
    content: `**For backup recharge:**
Calculate energy used per outage, then size panels to replace it between outages.

Example: 250W load × 3h outage = 750Wh used (plus inverter losses ≈ 850Wh)
Grid window between outages: 3h
Peak sun hours: 4.5h
Panel derate: 0.75

Wp needed = 850Wh / (4.5h × 0.75) = 252 Wp → 1 × 300Wp panel

**For bill savings:**
Calculate daily consumption, then offset a percentage.

Example: 5 kWh/day consumption, want to offset 50%:
Target = 2.5 kWh/day from solar
Wp needed = 2500 / (4.5 × 0.75) = 740 Wp → 2 × 400Wp panels

**Roof space needed:** ~7 m² per kWp (includes spacing)
- 1 kWp ≈ 2-3 panels ≈ 7 m²
- 2 kWp ≈ 4-6 panels ≈ 14 m²`,
  },
  {
    id: 'common-mistakes',
    title: 'Common IPS mistakes to avoid',
    summary: 'Expensive errors we see again and again.',
    content: `1. **Undersizing the inverter** — Not accounting for surge. Fridge or pump startup trips the inverter.

2. **Mixing old and new batteries** — Old battery drags down the whole bank. Never mix ages, capacities, or chemistries.

3. **Using thin cables** — Voltage drop wastes energy and can cause fires. At 12V, even small resistance matters. Use proper cable sizing.

4. **No DC fuse/breaker** — Battery can deliver hundreds of amps in a short circuit. A DC-rated breaker between battery and inverter is essential.

5. **Putting heaters on IPS** — Iron, geyser, rice cooker draw 1000-2000W. They'll drain a battery in minutes. Keep them on grid-only circuits.

6. **Ignoring ventilation** — Tubular/flooded batteries produce hydrogen gas. Without ventilation, this is an explosion risk.

7. **Wrong charge settings** — LiFePO4 needs different voltage settings than lead-acid. Using wrong settings damages the battery.

8. **Not checking polarity** — Reversing battery connections can destroy the inverter instantly. Double-check before connecting.`,
  },
  {
    id: 'operating-modes',
    title: 'Operating modes explained (SBU, etc.)',
    summary: 'What do IPS, SOL, UTI, and SBU modes actually do?',
    content: `**IPS (Inverter Priority / Offline):**
- Grid powers loads and charges battery
- On outage, inverter takes over from battery
- Simple, but battery only charges when grid is present

**SOL (Solar First):**
- Solar panels power loads first
- Excess solar charges battery
- Grid fills any gap
- Best for bill savings when grid is reliable

**UTI (Utility First):**
- Grid powers loads
- Solar charges battery
- On outage, battery + solar power loads
- Good for areas with frequent but short outages

**SBU (Solar → Battery → Utility):**
- Priority: Solar → Battery → Grid
- Uses stored battery before importing from grid
- Good for maximizing self-consumption
- Can switch to grid when battery is low

**Which to choose?**
- Frequent long outages → IPS with good battery
- Want bill savings → Solar First or SBU
- Want battery preservation → SBU with grid fallback
- Simple backup only → IPS`,
  },
];

export function LearnPage() {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-500" />
            <h1 className="font-bold text-lg">Learning Hub</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-600 mb-6">
          Articles to help you understand IPS, solar, and battery systems. Click any article to expand.
        </p>

        <div className="space-y-3">
          {articles.map(article => (
            <div key={article.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === article.id ? null : article.id)}
                className="w-full text-left p-4 flex items-start gap-3 hover:bg-gray-50"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{article.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{article.summary}</p>
                </div>
                {expandedId === article.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
              </button>
              {expandedId === article.id && (
                <div className="px-4 pb-4 border-t border-gray-100">
                  <div className="prose prose-sm max-w-none mt-3 text-gray-700 whitespace-pre-line">
                    {article.content.split('\n').map((line, i) => {
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={i} className="font-bold mt-3 mb-1">{line.replace(/\*\*/g, '')}</p>;
                      }
                      if (line.startsWith('- ')) {
                        return <p key={i} className="ml-4">• {line.slice(2)}</p>;
                      }
                      if (line.startsWith('|')) {
                        return <p key={i} className="font-mono text-xs">{line}</p>;
                      }
                      if (line.trim() === '') return <br key={i} />;
                      return <p key={i}>{line}</p>;
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            <strong>Want to try these concepts?</strong> Open the <Link to="/plan" className="underline font-medium">planner</Link> to experiment with different configurations and see how they affect runtime, recharge time, and costs.
          </p>
        </div>
      </div>
    </div>
  );
}
