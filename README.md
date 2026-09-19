# Home Power Planner

A professional-grade power system planning tool for IPS (Inverter Power Supply) and hybrid solar systems. Built with React, TypeScript, and Tailwind CSS.

## 🎯 What This Tool Does

Helps users:
- **Size their IPS/solar system correctly** - Based on actual loads and conditions
- **Understand why** - Every calculation is transparent and explainable
- **Avoid expensive mistakes** - Warnings for unsafe configurations
- **Make informed decisions** - Compare options with real-world factors

## ✨ Key Features

### 📊 Comprehensive Calculations
- **20+ real-world factors** - Temperature, aging, efficiency, losses, safety margins
- **Battery customization** - Custom specs from datasheets, 6 chemistry types
- **Load variation patterns** - Hourly usage with 24-hour timeline
- **Outage cycle analysis** - Does the battery recover between outages?
- **Scenario comparison** - Day vs night vs worst-case runtime

### 🎛️ Complete User Control
- **50+ controllable parameters** - Every aspect of the system
- **Advanced settings panel** - 17 user-adjustable calculation factors
- **Custom battery creation** - Enter exact specs from your datasheet
- **Series/parallel configuration** - Visual bank layout
- **Real-time updates** - See impact of changes instantly

### 🎨 Beautiful Interface
- **Card-based design** - Modern, intuitive layout
- **Color-coded categories** - Easy to understand grouping
- **Impact indicators** - Know what matters most (High/Medium/Low)
- **Plain language** - Technical details on hover
- **Smooth animations** - Professional micro-interactions

### 🔧 Professional Features
- **Audit mode** - Analyze existing systems
- **Bangla language support** - EN/বাং toggle
- **Interactive topology** - Live system diagram
- **Print-friendly** - Clean output for installers
- **URL sharing** - Share configurations via link

## 🚀 Quick Start

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Preview
```bash
npm run preview
```

## 🐳 Docker Deployment

### Local Testing with Docker Compose
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

Access at: http://localhost:3000

### Production Docker Build
```bash
# Build image
docker build -t home-power-planner .

# Run container
docker run -p 80:80 home-power-planner
```

### Coolify Deployment

See [Coolify Deployment Guide](docs/COOLIFY_DEPLOYMENT.md) for detailed instructions.

**Quick Steps:**
1. Push code to Git repository
2. In Coolify: New Resource → Docker Compose
3. Select repository and branch
4. Deploy (2-3 minutes)

**Features:**
- ✅ Multi-stage Docker build (small image ~50MB)
- ✅ Nginx with SPA routing
- ✅ Gzip compression
- ✅ Health check endpoint
- ✅ Security headers
- ✅ Auto-deploy support

## 📁 Project Structure

```
home-power-planner/
├── src/
│   ├── components/           # React components
│   │   ├── AdvancedSettings.tsx      # 17 user-controllable parameters
│   │   ├── BatteryCustomizer.tsx     # Complete battery control
│   │   ├── HourlyUsageEditor.tsx     # 24-hour usage timeline
│   │   ├── ResultHero.tsx            # Live result display
│   │   ├── SystemTopology.tsx        # Interactive diagram
│   │   └── ...
│   ├── pages/                # Page components
│   │   ├── HomePage.tsx              # Landing page
│   │   ├── WizardPage.tsx            # "Help me choose" wizard
│   │   ├── PlannerPage.tsx           # Main planner
│   │   ├── AuditPage.tsx             # Audit existing systems
│   │   ├── LearnPage.tsx             # Learning hub
│   │   └── AssumptionsPage.tsx       # All assumptions
│   ├── lib/                  # Core logic
│   │   ├── engine/                   # Calculation engine
│   │   │   └── calculator.ts         # Core calculations
│   │   ├── enhanced-calculator.ts    # 20+ real-world factors
│   │   ├── usageProfiles.ts          # Load pattern logic
│   │   ├── state.ts                  # URL state management
│   │   └── i18n.tsx                  # Internationalization
│   ├── data/                 # Data catalogs
│   │   └── catalogs.ts               # Appliances, batteries, etc.
│   ├── types.ts              # TypeScript types
│   ├── App.tsx               # Main app component
│   └── index.css             # Global styles
├── docs/                     # Documentation
│   ├── FINAL_SUMMARY.md              # Complete project overview
│   ├── BATTERY_CONTROL_COMPLETE.md   # Battery customization
│   ├── USER_FRIENDLY_CONTROLS.md     # Control system design
│   ├── COMPLETE_TRANSFORMATION.md    # Evolution journey
│   ├── CALCULATION_FACTORS.md        # 20+ factors explained
│   └── ...
├── DECISIONS.md              # Design decisions
├── INSIGHTS.md               # User insights
└── package.json

```

## 🎯 User Journeys

### First-Time User
1. Lands on home page
2. Clicks "Help me choose"
3. Answers 6 questions (outages, loads, goals, solar, roof, budget)
4. Gets recommendation with reasons
5. Clicks "Size this system"
6. Lands in planner with pre-filled configuration
7. Adjusts as needed
8. Sees real-time results

### Existing System Owner
1. Clicks "Audit my setup"
2. Enters existing inverter/battery/solar specs
3. Enters current loads
4. Sees real performance with age degradation
5. Identifies issues and upgrade paths
6. Explores options in planner

### Advanced User
1. Opens planner directly
2. Configures loads with hourly patterns
3. Selects or creates custom battery
4. Adjusts advanced settings (temperature, efficiency, losses)
5. Configures series/parallel bank
6. Sees detailed results with "Show the math"
7. Shares configuration via URL

## 🔬 Calculation Engine

### Real-World Factors (20+)

#### Battery Factors
- Temperature effects on capacity
- Calendar aging (2-5% per year)
- Cycle life vs DoD (exponential)
- Peukert effect (lead-acid)
- Charging efficiency
- Internal resistance

#### Inverter Factors
- Efficiency curve by load
- No-load consumption
- Power factor handling
- Surge capacity
- Low-load penalty

#### Solar Factors
- Temperature coefficients
- System losses (wiring, mismatch, soiling)
- Seasonal variation
- Degradation over time

#### Load Factors
- Diversity/simultaneity
- Starting surge for motors
- Usage patterns (day/night/occasional)
- Duty cycles
- Power factor

#### Environmental Factors
- Temperature corrections
- Installation quality
- Ventilation requirements

#### Safety Margins
- Inverter: 25% above peak
- Battery: 20% above required
- Solar: 15% above energy need
- Cables: 25% above max current

### Core Formulas

```typescript
// Battery runtime with all corrections
Runtime = (Capacity × DoD × η_inverter × η_battery × η_temp × η_age) / 
          (Load × diversity × safety_margin)

// Solar production with losses
Production = Panel_Power × PSH × η_system × η_temp × η_soiling × η_degradation

// Battery life
Life = min(Cycle_Life / DoD_cycles, Calendar_Life)

// Levelized cost
LCOE = (System_Cost + O&M_Cost × Years) / (Energy_Delivered × Years)
```

## 🎨 Design System

### Typography
- **Display:** Instrument Serif (editorial, dramatic)
- **Body:** Inter (clean, readable)
- **Mono:** JetBrains Mono (technical data)

### Colors
- **Paper:** #fafaf7 (warm background)
- **Ink:** #0a0a0a (primary text)
- **Accent:** #ff4d1c (coral, used sparingly)
- **Success:** #1a7f37 (green)
- **Warning:** #b45309 (amber)
- **Danger:** #c2410c (red)

### Components
- **Cards:** Rounded corners, subtle borders
- **Buttons:** Pill-shaped, hover effects
- **Inputs:** Clean, focused states
- **Badges:** Color-coded by type
- **Sliders:** Custom styled, smooth

## 📊 Performance

### Bundle Size
- **Initial:** 177KB (58KB gzipped)
- **Planner:** 470KB (126KB gzipped)
- **Code splitting:** All pages lazy-loaded

### Optimization
- Tree shaking enabled
- Dynamic imports for heavy components
- Optimized images and assets
- Minimal dependencies

### Lighthouse Targets
- Performance: 90+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+

## 🌍 Internationalization

### Supported Languages
- **English (en)** - Complete
- **Bangla (bn)** - Basic (key UI elements)

### Usage
```typescript
import { useI18n } from './lib/i18n';

function MyComponent() {
  const { t, locale, setLocale } = useI18n();
  return <button onClick={() => setLocale('bn')}>{t('switch_language')}</button>;
}
```

## 🔒 Safety & Transparency

### Safety Warnings
- Battery overcurrent protection
- Inverter overload detection
- Voltage mismatch alerts
- Ventilation requirements
- Medical equipment disclaimers

### Transparency Features
- "Show the math" for every calculation
- All assumptions visible on `/assumptions`
- All defaults marked "check your datasheet"
- No hidden calculations or assumptions

## 📚 Documentation

### User Documentation
- **FINAL_SUMMARY.md** - Complete project overview
- **BATTERY_CONTROL_COMPLETE.md** - Battery customization guide
- **USER_FRIENDLY_CONTROLS.md** - Control system design
- **USER_CONTROL.md** - User control features

### Technical Documentation
- **CALCULATION_FACTORS.md** - 20+ real-world factors
- **COMPLETE_TRANSFORMATION.md** - Evolution journey
- **DECISIONS.md** - Design decisions
- **INSIGHTS.md** - User insights

### Code Documentation
- TypeScript types in `types.ts`
- JSDoc comments on functions
- Component prop documentation
- Inline code comments

## 🤝 Contributing

This is a production-ready application. For contributions:

1. Follow TypeScript best practices
2. Maintain transparency (no hidden assumptions)
3. Add tests for new calculations
4. Update documentation
5. Test with real-world scenarios

## 📄 License

This project is built for educational and practical use. All calculations are provided as-is for planning purposes. Always consult licensed professionals for actual installations.

## 🙏 Acknowledgments

Built based on real user insights and feedback:
- Load variation patterns
- Charge/discharge cycle analysis
- Full flexibility requirements
- Real-world calculation factors
- User control needs
- User-friendly design
- Battery customization

## 📞 Support

For issues, questions, or suggestions:
- Check documentation in `/docs`
- Review assumptions on `/assumptions`
- Read learning articles on `/learn`
- Use "Show the math" for calculation details

## 🎓 Learning Resources

Visit `/learn` for articles on:
- IPS vs UPS vs Hybrid
- How to size an inverter
- VA vs Watts
- LiFePO4 vs Tubular
- What is DoD
- Fridge surge requirements
- Battery life expectations
- Solar panel sizing
- Common mistakes
- Operating modes

## 🚀 Future Roadmap

### Phase 2
- Monte Carlo simulation
- Weather API integration
- Time-of-use optimization
- Configuration comparison (A/B/C)
- SEO scenario pages

### Phase 3
- Equipment database
- Installer directory
- Mobile PWA app
- Dealer embed widget
- Short links

### Phase 4
- Machine learning suggestions
- Collaborative editing
- Version history
- PDF import from datasheets
- Community battery database

---

**Built with care, based on real user insights, for real-world applications.**

**Status: Production Ready ✅**

**Version: 1.0.0**

**Last Updated: 2024**
