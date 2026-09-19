/**
 * Programmatic SEO - Scenario Pages
 * 
 * Auto-generated pages for common configurations
 * Each page targets specific search queries
 */

export interface ScenarioConfig {
  slug: string;
  title: string;
  description: string;
  keywords: string[];
  inverterVA: number;
  batteryAh: number;
  batteryChemistry: 'lifepo4' | 'tubular';
  loads: Array<{ name: string; qty: number; watts: number }>;
  solarWp?: number;
}

/**
 * Generate scenario configurations
 */
export function generateScenarios(): ScenarioConfig[] {
  const scenarios: ScenarioConfig[] = [
    {
      slug: '1kva-lifepo4-100ah-3-fans-3-lights',
      title: '1kVA IPS with 100Ah LiFePO4 for 3 Fans and 3 LED Lights',
      description: 'Complete sizing guide for 1kVA inverter with 100Ah LiFePO4 battery powering 3 ceiling fans and 3 LED lights during load shedding in Bangladesh.',
      keywords: ['1kva inverter', '100ah lifepo4', '3 fans backup', 'ips bangladesh'],
      inverterVA: 1000,
      batteryAh: 100,
      batteryChemistry: 'lifepo4',
      loads: [
        { name: 'Ceiling Fan', qty: 3, watts: 75 },
        { name: 'LED Light', qty: 3, watts: 10 },
      ],
    },
    {
      slug: '2kva-lifepo4-200ah-fan-light-tv-router',
      title: '2kVA Hybrid Solar with 200Ah LiFePO4 for Complete Home Backup',
      description: 'Size your 2kVA hybrid inverter system with 200Ah LiFePO4 battery for fans, lights, TV, and router. Includes solar panel recommendations.',
      keywords: ['2kva hybrid', '200ah lifepo4', 'home backup', 'solar bangladesh'],
      inverterVA: 2000,
      batteryAh: 200,
      batteryChemistry: 'lifepo4',
      loads: [
        { name: 'Ceiling Fan', qty: 4, watts: 75 },
        { name: 'LED Light', qty: 5, watts: 10 },
        { name: 'LED TV', qty: 1, watts: 80 },
        { name: 'WiFi Router', qty: 1, watts: 12 },
      ],
      solarWp: 1000,
    },
    {
      slug: '3kva-tubular-200ah-basic-home',
      title: '3kVA IPS with 200Ah Tubular Battery for Basic Home Needs',
      description: 'Affordable 3kVA inverter system with 200Ah tubular lead-acid battery for essential home appliances during power outages.',
      keywords: ['3kva inverter', 'tubular battery', '200ah', 'affordable ips'],
      inverterVA: 3000,
      batteryAh: 200,
      batteryChemistry: 'tubular',
      loads: [
        { name: 'Ceiling Fan', qty: 5, watts: 75 },
        { name: 'LED Light', qty: 6, watts: 10 },
        { name: 'LED TV', qty: 1, watts: 80 },
      ],
    },
    {
      slug: '5kva-lifepo4-300ah-full-home-solar',
      title: '5kVA Full Home Solar System with 300Ah LiFePO4 Battery',
      description: 'Complete 5kVA hybrid solar system with 300Ah LiFePO4 battery bank for full home backup including AC, fridge, and all appliances.',
      keywords: ['5kva solar', '300ah lifepo4', 'full home backup', 'hybrid solar'],
      inverterVA: 5000,
      batteryAh: 300,
      batteryChemistry: 'lifepo4',
      loads: [
        { name: 'Ceiling Fan', qty: 6, watts: 75 },
        { name: 'LED Light', qty: 8, watts: 10 },
        { name: 'LED TV', qty: 2, watts: 80 },
        { name: 'Refrigerator', qty: 1, watts: 150 },
        { name: 'WiFi Router', qty: 1, watts: 12 },
      ],
      solarWp: 3000,
    },
    {
      slug: '800va-lifepo4-50ah-minimal-setup',
      title: '800VA Mini IPS with 50Ah LiFePO4 for Essential Devices',
      description: 'Compact 800VA inverter with 50Ah LiFePO4 battery for minimal backup - perfect for router, lights, and phone charging.',
      keywords: ['800va inverter', '50ah lifepo4', 'mini ips', 'router backup'],
      inverterVA: 800,
      batteryAh: 50,
      batteryChemistry: 'lifepo4',
      loads: [
        { name: 'LED Light', qty: 2, watts: 10 },
        { name: 'WiFi Router', qty: 1, watts: 12 },
        { name: 'Phone Charger', qty: 2, watts: 10 },
      ],
    },
    {
      slug: '1.5kva-tubular-150ah-budget-friendly',
      title: '1.5kVA Budget IPS with 150Ah Tubular Battery',
      description: 'Cost-effective 1.5kVA inverter system with 150Ah tubular battery for basic home backup during frequent load shedding.',
      keywords: ['1.5kva inverter', '150ah tubular', 'budget ips', 'load shedding'],
      inverterVA: 1500,
      batteryAh: 150,
      batteryChemistry: 'tubular',
      loads: [
        { name: 'Ceiling Fan', qty: 3, watts: 75 },
        { name: 'LED Light', qty: 4, watts: 10 },
        { name: 'LED TV', qty: 1, watts: 80 },
      ],
    },
  ];

  return scenarios;
}

/**
 * Generate meta tags for scenario page
 */
export function generateMetaTags(scenario: ScenarioConfig) {
  return {
    title: scenario.title,
    description: scenario.description,
    keywords: scenario.keywords.join(', '),
    ogTitle: scenario.title,
    ogDescription: scenario.description,
    ogType: 'article',
    twitterCard: 'summary_large_image',
  };
}

/**
 * Generate structured data (JSON-LD) for scenario page
 */
export function generateStructuredData(scenario: ScenarioConfig) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: scenario.title,
    description: scenario.description,
    keywords: scenario.keywords.join(', '),
    author: {
      '@type': 'Organization',
      name: 'Home Power Planner',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Home Power Planner',
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
    },
  };
}

/**
 * Generate FAQ content for scenario page
 */
export function generateFAQ(scenario: ScenarioConfig) {
  const faqs = [
    {
      question: `How long will a ${scenario.inverterVA}VA inverter with ${scenario.batteryAh}Ah ${scenario.batteryChemistry} battery last?`,
      answer: `With your load of ${scenario.loads.map(l => `${l.qty}× ${l.name}`).join(', ')}, the system will provide approximately ${calculateEstimatedRuntime(scenario)} hours of backup time.`,
    },
    {
      question: `Is ${scenario.batteryChemistry === 'lifepo4' ? 'LiFePO4' : 'tubular'} battery good for this setup?`,
      answer: scenario.batteryChemistry === 'lifepo4'
        ? `Yes, LiFePO4 is excellent for this setup. It offers 3000+ cycles, 90% depth of discharge, and 10+ years lifespan.`
        : `Tubular battery is a cost-effective choice for this setup. It offers 800-1200 cycles at 50% depth of discharge with 3-5 years lifespan.`,
    },
    {
      question: scenario.solarWp ? `How much will ${scenario.solarWp}Wp solar panels save?` : `Should I add solar panels to this system?`,
      answer: scenario.solarWp
        ? `With ${scenario.solarWp}Wp solar panels, you can save approximately ৳${calculateEstimatedSavings(scenario)} per month on your electricity bill.`
        : `Adding solar panels would help recharge the battery faster and reduce your electricity bill. Consider starting with 500-1000Wp.`,
    },
    {
      question: `What is the total cost of this system?`,
      answer: `The estimated total cost is ৳${calculateEstimatedCost(scenario)}, including inverter, battery, ${scenario.solarWp ? 'solar panels, ' : ''}and installation.`,
    },
  ];

  return faqs;
}

// Helper functions
function calculateEstimatedRuntime(scenario: ScenarioConfig): number {
  const totalWatts = scenario.loads.reduce((sum, load) => sum + load.qty * load.watts, 0);
  const batteryWh = scenario.batteryAh * (scenario.batteryChemistry === 'lifepo4' ? 12.8 : 12);
  const usableWh = batteryWh * (scenario.batteryChemistry === 'lifepo4' ? 0.9 : 0.5);
  return usableWh / totalWatts;
}

function calculateEstimatedSavings(scenario: ScenarioConfig): number {
  if (!scenario.solarWp) return 0;
  const dailyKwh = (scenario.solarWp * 4.5 * 0.75) / 1000; // PSH = 4.5, efficiency = 75%
  return Math.round(dailyKwh * 30 * 8); // 30 days, ৳8 per kWh
}

function calculateEstimatedCost(scenario: ScenarioConfig): number {
  const inverterCost = scenario.inverterVA * 15; // ৳15 per VA
  const batteryCost = scenario.batteryAh * (scenario.batteryChemistry === 'lifepo4' ? 320 : 90);
  const solarCost = scenario.solarWp ? scenario.solarWp * 12 : 0;
  const installationCost = 5000;
  return Math.round(inverterCost + batteryCost + solarCost + installationCost);
}
