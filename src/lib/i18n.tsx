import { createContext, useContext, useState, ReactNode } from 'react';

type Locale = 'en' | 'bn';

interface I18nContextType {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
}

const translations: Record<Locale, Record<string, string>> = {
  en: {
    // Nav
    'nav.choose': 'Choose',
    'nav.planner': 'Planner',
    'nav.audit': 'Audit',
    'nav.compare': 'Compare',
    'nav.learn': 'Learn',
    'nav.assumptions': 'Assumptions',
    'nav.openPlanner': 'Open planner',
    
    // Common Actions
    'action.share': 'Share',
    'action.print': 'Print',
    'action.save': 'Save',
    'action.cancel': 'Cancel',
    'action.continue': 'Continue',
    'action.back': 'Back',
    'action.reset': 'Reset',
    'action.add': 'Add',
    'action.remove': 'Remove',
    
    // Planner
    'planner.title': 'Size your system',
    'planner.loads': 'Loads',
    'planner.grid': 'Grid',
    'planner.system': 'System',
    'planner.results': 'Results',
    'planner.costs': 'Costs',
    'planner.addLoad': 'Add a load',
    'planner.customize': 'Customize',
    'planner.backup': 'Backup',
    
    // Results
    'result.runtime': 'Runtime',
    'result.recharge': 'Recharge time',
    'result.minSoc': 'Min SoC',
    'result.unserved': 'Unserved energy',
    'result.recovers': 'Recovers between outages',
    'result.barelyRecovers': 'Barely recovers',
    'result.noRecovery': 'Does not recover',
    'result.showMath': 'Show the math',
    'result.warnings': 'Warnings',
    
    // Battery
    'battery.select': 'Select battery',
    'battery.custom': 'Custom battery',
    'battery.bank': 'Battery bank',
    'battery.series': 'Series',
    'battery.parallel': 'Parallel',
    'battery.voltage': 'Voltage',
    'battery.capacity': 'Capacity',
    'battery.energy': 'Energy',
    'battery.usable': 'Usable',
    'battery.cost': 'Cost',
    'battery.weight': 'Weight',
    
    // Solar
    'solar.enable': 'Enable solar',
    'solar.panels': 'Panels',
    'solar.totalWp': 'Total Wp',
    
    // Grid
    'grid.outage': 'Outage duration',
    'grid.available': 'Grid available',
    'grid.mode': 'Operating mode',
    
    // Wizard
    'wizard.title': 'Help me choose',
    'wizard.shedding': 'Load shedding',
    'wizard.loads': 'Your loads',
    'wizard.goal': 'Your goal',
    'wizard.solar': 'Solar interest',
    'wizard.roof': 'Roof/terrace',
    'wizard.budget': 'Budget',
    'wizard.result': 'Recommendation',
    
    // Units
    'unit.hours': 'hours',
    'unit.minutes': 'minutes',
    'unit.watts': 'W',
    'unit.volts': 'V',
    'unit.amps': 'A',
    'unit.taka': '৳',
    'unit.percent': '%',
    'unit.kwh': 'kWh',
    
    // Home
    'home.tagline': 'Free · No login · Runs in your browser',
    'home.heroTitle1': 'Size your',
    'home.heroTitle2': 'IPS',
    'home.heroTitle3': 'or solar system.',
    'home.heroSub': 'See the math behind every number.',
    'home.heroDesc': 'Plan your home inverter-battery or hybrid solar setup. Understand why it works — or doesn\'t. Avoid the expensive mistakes installers won\'t tell you about.',
    'home.ctaChoose': 'Help me choose',
    'home.ctaPlanner': 'Open planner',
    'home.diffTitle': 'How this is different',
    'home.diffHeadline': 'No scores.',
    'home.diffHeadlineEm': 'No "best choice" badges.',
    'home.diffHeadline3': 'Just numbers.',
    'home.startTitle': 'Where to start',
    'home.startHeadline': 'Four ways in.',
    'home.startHeadlineEm': 'Pick the one that fits.',
  },
  bn: {
    // Nav
    'nav.choose': 'বেছে নিন',
    'nav.planner': 'প্ল্যানার',
    'nav.audit': 'অডিট',
    'nav.compare': 'তুলনা',
    'nav.learn': 'শিখুন',
    'nav.assumptions': 'অনুমানসমূহ',
    'nav.openPlanner': 'প্ল্যানার খুলুন',
    
    // Common Actions
    'action.share': 'শেয়ার',
    'action.print': 'প্রিন্ট',
    'action.save': 'সংরক্ষণ',
    'action.cancel': 'বাতিল',
    'action.continue': 'এগিয়ে যান',
    'action.back': 'পিছনে',
    'action.reset': 'রিসেট',
    'action.add': 'যোগ করুন',
    'action.remove': 'সরান',
    
    // Planner
    'planner.title': 'আপনার সিস্টেম সাইজ করুন',
    'planner.loads': 'লোড',
    'planner.grid': 'গ্রিড',
    'planner.system': 'সিস্টেম',
    'planner.results': 'ফলাফল',
    'planner.costs': 'খরচ',
    'planner.addLoad': 'লোড যোগ করুন',
    'planner.customize': 'কাস্টমাইজ',
    'planner.backup': 'ব্যাকআপ',
    
    // Results
    'result.runtime': 'রানটাইম',
    'result.recharge': 'রিচার্জ সময়',
    'result.minSoc': 'সর্বনিম্ন SoC',
    'result.unserved': 'অসেবার শক্তি',
    'result.recovers': 'আউটেজের মধ্যে পুনরুদ্ধার করে',
    'result.barelyRecovers': 'কষ্টে পুনরুদ্ধার করে',
    'result.noRecovery': 'পুনরুদ্ধার করে না',
    'result.showMath': 'হিসাব দেখান',
    'result.warnings': 'সতর্কতা',
    
    // Battery
    'battery.select': 'ব্যাটারি নির্বাচন করুন',
    'battery.custom': 'কাস্টম ব্যাটারি',
    'battery.bank': 'ব্যাটারি ব্যাংক',
    'battery.series': 'সিরিজ',
    'battery.parallel': 'প্যারালেল',
    'battery.voltage': 'ভোল্টেজ',
    'battery.capacity': 'ক্ষমতা',
    'battery.energy': 'শক্তি',
    'battery.usable': 'ব্যবহারযোগ্য',
    'battery.cost': 'খরচ',
    'battery.weight': 'ওজন',
    
    // Solar
    'solar.enable': 'সোলার সক্রিয় করুন',
    'solar.panels': 'প্যানেল',
    'solar.totalWp': 'মোট Wp',
    
    // Grid
    'grid.outage': 'আউটেজ সময়কাল',
    'grid.available': 'গ্রিড উপলব্ধ',
    'grid.mode': 'অপারেটিং মোড',
    
    // Wizard
    'wizard.title': 'আমাকে বেছে নিতে সাহায্য করুন',
    'wizard.shedding': 'লোড শেডিং',
    'wizard.loads': 'আপনার লোড',
    'wizard.goal': 'আপনার লক্ষ্য',
    'wizard.solar': 'সোলার আগ্রহ',
    'wizard.roof': 'ছাদ/ছাত',
    'wizard.budget': 'বাজেট',
    'wizard.result': 'সুপারিশ',
    
    // Units
    'unit.hours': 'ঘণ্টা',
    'unit.minutes': 'মিনিট',
    'unit.watts': 'ওয়াট',
    'unit.volts': 'ভোল্ট',
    'unit.amps': 'অ্যাম্পিয়ার',
    'unit.taka': '৳',
    'unit.percent': '%',
    'unit.kwh': 'kWh',
    
    // Home
    'home.tagline': 'বিনামূল্যে · লগইন নেই · ব্রাউজারে চলে',
    'home.heroTitle1': 'আপনার',
    'home.heroTitle2': 'আইপিএস',
    'home.heroTitle3': 'বা সোলার সিস্টেম সাইজ করুন।',
    'home.heroSub': 'প্রতিটি সংখ্যার পেছনের হিসাব দেখুন।',
    'home.heroDesc': 'আপনার বাসার ইনভার্টার-ব্যাটারি বা হাইব্রিড সোলার সিস্টেম পরিকল্পনা করুন। বুঝুন কেন কাজ করে — বা করে না। ইনস্টলাররা যেমন ব্যয়বহুল ভুলের কথা বলে না, সেগুলো এড়িয়ে চলুন।',
    'home.ctaChoose': 'আমাকে সাহায্য করুন',
    'home.ctaPlanner': 'প্ল্যানার খুলুন',
    'home.diffTitle': 'এটা কীভাবে আলাদা',
    'home.diffHeadline': 'কোনো স্কোর নেই।',
    'home.diffHeadlineEm': 'কোনো "সেরা পছন্দ" ব্যাজ নেই।',
    'home.diffHeadline3': 'শুধু সংখ্যা।',
    'home.startTitle': 'কোথা থেকে শুরু',
    'home.startHeadline': 'চারটি পথ।',
    'home.startHeadlineEm': 'আপনার জন্য যেটা মানানসই।',
  },
};

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>('en');
  
  const t = (key: string): string => {
    return translations[locale][key] || translations.en[key] || key;
  };
  
  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  
  const handleLanguageChange = (newLocale: 'en' | 'bn') => {
    setLocale(newLocale);
    // Force re-render by updating document language
    document.documentElement.lang = newLocale;
    // Store preference
    localStorage.setItem('preferred-language', newLocale);
  };
  
  return (
    <div className="flex items-center gap-1 text-xs rounded-full p-0.5" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => handleLanguageChange('en')}
        className="px-2 py-1 rounded-full transition-all font-medium"
        style={{
          background: locale === 'en' ? 'var(--ink)' : 'transparent',
          color: locale === 'en' ? 'var(--paper)' : 'var(--muted)',
        }}
        aria-label="Switch to English"
      >
        EN
      </button>
      <button
        onClick={() => handleLanguageChange('bn')}
        className="px-2 py-1 rounded-full transition-all font-medium"
        style={{
          background: locale === 'bn' ? 'var(--ink)' : 'transparent',
          color: locale === 'bn' ? 'var(--paper)' : 'var(--muted)',
        }}
        aria-label="বাংলায় পরিবর্তন করুন"
      >
        বাং
      </button>
    </div>
  );
}
