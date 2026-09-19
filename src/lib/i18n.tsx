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
    'nav.learn': 'Learn',
    'nav.assumptions': 'Assumptions',
    'nav.openPlanner': 'Open planner',
    
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
    'nav.learn': 'শিখুন',
    'nav.assumptions': 'অনুমানসমূহ',
    'nav.openPlanner': 'প্ল্যানার খুলুন',
    
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
  
  return (
    <div className="flex items-center gap-1 text-xs rounded-full p-0.5" style={{ border: '1px solid var(--border)' }}>
      <button
        onClick={() => setLocale('en')}
        className="px-2 py-1 rounded-full transition-all"
        style={{
          background: locale === 'en' ? 'var(--ink)' : 'transparent',
          color: locale === 'en' ? 'var(--paper)' : 'var(--muted)',
        }}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('bn')}
        className="px-2 py-1 rounded-full transition-all"
        style={{
          background: locale === 'bn' ? 'var(--ink)' : 'transparent',
          color: locale === 'bn' ? 'var(--paper)' : 'var(--muted)',
        }}
      >
        বাং
      </button>
    </div>
  );
}
