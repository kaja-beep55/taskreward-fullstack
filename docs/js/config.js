// ============================================================
// Application configuration (frontend placeholders only)
// Phase 6: whatsappNumber will be fetched from Supabase
// app_settings table. Never store real secrets here.
// ============================================================

export const CONFIG = {
  APP_NAME: 'TaskReward',
  APP_TAGLINE: 'Complete tasks. Earn coins.',
};

const SETTINGS_KEY = 'trp_settings';

// Runtime settings persisted locally for the prototype.
// TODO Phase 6: replace with Supabase app_settings table.
export const settingsService = {
  getAll() {
    const defaults = {
      whatsappNumber: '10000000000', // WHATSAPP_NUMBER placeholder — NOT a real number
      appName: CONFIG.APP_NAME,
      defaultTaskStatus: 'draft',
    };
    try {
      const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
      return { ...defaults, ...saved };
    } catch {
      return defaults;
    }
  },
  save(updates) {
    const merged = { ...this.getAll(), ...updates };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  },
};

// Builds a direct WhatsApp chat link (NOT WhatsApp Business API).
export function whatsappLink() {
  const number = settingsService.getAll().whatsappNumber;
  return `https://wa.me/${number}`;
}

export const DISTRICTS = [
  'Alipurduar', 'Bankura', 'Birbhum', 'Cooch Behar', 'Darjeeling',
  'Hooghly', 'Howrah', 'Jalpaiguri', 'Jhargram', 'Kalimpong',
  'Kolkata', 'Malda', 'Murshidabad', 'Nadia', 'North 24 Parganas',
  'Paschim Bardhaman', 'Paschim Medinipur', 'Purba Bardhaman',
  'Purba Medinipur', 'Purulia', 'South 24 Parganas', 'Uttar Dinajpur',
];
