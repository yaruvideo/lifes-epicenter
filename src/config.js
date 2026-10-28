// Sync settings. The Supabase URL and "anon" key are safe to publish: the
// database's row rules (supabase/setup.sql) decide who can read what.
export const SUPABASE_URL = 'https://xlxhmgqfwuzhjfgkxuob.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhseGhtZ3Fmd3V6aGpmZ2t4dW9iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI3ODE0NjYsImV4cCI6MjEwODM1NzQ2Nn0.7kr-HBuH1EbZtsKKNvOE0z7UD2_mm332T_e0Ip_tlAk';

// The preview copy (built from the `preview` branch into /preview/) reads the real data but never writes it back.
export const PREVIEW = import.meta.env.VITE_PREVIEW === '1';

export const PEOPLE = {
  yaru: { name: 'Yaru', color: '#A57CFF' },
  hannah: { name: 'Hannah', color: '#FF7EB6' }
};

// Public half of the key used to send reminders when the app is closed.
export const VAPID_PUBLIC_KEY = 'BFyhm7u5N5mXcbJbxi8C3_tLhTsQujFX6BIEc2yijwrjCnTqz_aGHkQL28DcwHoNVuacNstNjcCs3wxu4W08WXE';
