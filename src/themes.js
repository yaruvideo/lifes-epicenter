// Theme presets. Each person picks one on the Appearance screen; it only changes their own devices.
export const THEMES = [
  { id: 'eva01', name: 'Eva-01', desc: 'Purple armor, neon green trim, orange warning lights.', bg: '#131019', side: '#19151F', panel: '#1D1826', inner: '#251F2F', border: '#322A3F', text: '#EEEAF4', muted: '#ADA6BC', accent: '#A57CFF', hi: '#8EE05A', warm: '#FF9F45' },
  { id: 'vegeta', name: 'Vegeta', desc: 'Royal blue battle suit, white armor, Super Saiyan gold.', bg: '#0E1220', side: '#131830', panel: '#171D38', inner: '#1F2645', border: '#2C3560', text: '#F1F3FA', muted: '#A9B0CC', accent: '#5A84FF', hi: '#F5D547', warm: '#F4F6FB' },
  { id: 'gohan', name: 'Gohan / Piccolo', desc: "Piccolo's purple gi, red sash, Namekian green.", bg: '#120E1C', side: '#181226', panel: '#1C162D', inner: '#251D3A', border: '#33294D', text: '#F2EEF8', muted: '#AFA6C4', accent: '#9A6BEA', hi: '#6CCB4A', warm: '#E0453A' },
  { id: 'goku', name: 'Goku', desc: 'Orange gi, blue undershirt and wristbands.', bg: '#171008', side: '#1E1509', panel: '#23190C', inner: '#2D2112', border: '#3F2F1A', text: '#FBF2E6', muted: '#C2B29C', accent: '#FF8A1F', hi: '#5A8BFF', warm: '#F5D547' },
  { id: 'transistor', name: 'Transistor', desc: "The sword's cyan glow, Red's red, Cloudbank gold.", bg: '#0D1117', side: '#11161E', panel: '#151B25', inner: '#1C2430', border: '#283343', text: '#EDF2F6', muted: '#A3AEBB', accent: '#3FD8E0', hi: '#FF5A4E', warm: '#F2B45A' },
  { id: 'moon', name: 'Sailor Moon', desc: 'Navy sailor collar, red bow, golden tiara.', bg: '#0E1226', side: '#131833', panel: '#171D3D', inner: '#20274B', border: '#2D3663', text: '#F4F2FA', muted: '#AEB2CC', accent: '#FF5C7A', hi: '#F7D046', warm: '#6FA0FF' },
  { id: 'jupiter', name: 'Sailor Jupiter', desc: 'Forest green skirt, pink bow, thunder gold.', bg: '#0D1611', side: '#121D16', panel: '#16231B', inner: '#1E2E24', border: '#2A4033', text: '#EEF6F0', muted: '#A6BCAD', accent: '#4CD483', hi: '#FF8FC7', warm: '#F2C14E' },
  { id: 'pluto', name: 'Sailor Pluto', desc: 'Black uniform, garnet bow, dark green hair.', bg: '#0B0A0D', side: '#110F14', panel: '#16131A', inner: '#1E1A23', border: '#2C2632', text: '#F1EEF3', muted: '#ABA3B1', accent: '#E0577A', hi: '#3FBF93', warm: '#C9AE62' },
  { id: 'mars', name: 'Sailor Mars', desc: 'Fire red skirt, violet bow, raven black.', bg: '#150C0E', side: '#1C1113', panel: '#221517', inner: '#2C1C1F', border: '#40292D', text: '#F7EEEF', muted: '#C0A9AC', accent: '#F2544A', hi: '#A879F0', warm: '#FFB03A' },
  { id: 'unit02', name: 'Unit-02', desc: 'Crimson red with orange and yellow.', bg: '#170F10', side: '#1E1415', panel: '#231819', inner: '#2C1F20', border: '#3D2A2B', text: '#F4ECEC', muted: '#BBA8A9', accent: '#F2545B', hi: '#FF9F45', warm: '#F5D547' },
  { id: 'unit00', name: 'Unit-00', desc: 'Cool blue with white and yellow.', bg: '#10131A', side: '#151A23', panel: '#19202B', inner: '#212935', border: '#2E3847', text: '#EEF1F6', muted: '#A7B0C0', accent: '#6FA8FF', hi: '#E8ECF4', warm: '#F5D547' },
  { id: 'classic', name: 'Classic', desc: 'The original teal and amber.', bg: '#14161B', side: '#1A1D23', panel: '#1C1F26', inner: '#22262E', border: '#2B303B', text: '#ECEDF0', muted: '#A6ACB8', accent: '#5ED3C3', hi: '#B8A4F5', warm: '#F2B45A' },
  { id: 'daylight', name: 'Daylight', desc: 'Light mode with deep purple.', bg: '#F6F4FA', side: '#EEEAF4', panel: '#FFFFFF', inner: '#F1EDF7', border: '#DDD6E8', text: '#1D1826', muted: '#5E5670', accent: '#7448D8', hi: '#3E8F1F', warm: '#C2600F' },
];

export const SWATCHES = [
  ['Eva purple', '#A57CFF'], ['Violet', '#8B5CF6'], ['Orchid', '#C084FC'], ['Lavender', '#B8A4F5'], ['Grape', '#7448D8'],
  ['Eva green', '#8EE05A'], ['Teal', '#5ED3C3'], ['Blue', '#6FA8FF'], ['Pink', '#FF7EB6'], ['Orange', '#FF9F45'], ['Red', '#F2545B'], ['Yellow', '#F5D547']
];

export const DEFAULT_LOOK = { theme: 'eva01', accent: null, hi: null, bg: 'dark', round: 'soft', size: 'm' };

// Turns a saved look into CSS variables on <html>, so every screen follows it.
export function applyLook(look) {
  const l = { ...DEFAULT_LOOK, ...look };
  const base = THEMES.find((t) => t.id === l.theme) || THEMES[0];
  const t = { ...base, accent: l.accent || base.accent, hi: l.hi || base.hi };
  const light = base.id === 'daylight';
  if (l.bg === 'oled' && !light) Object.assign(t, { bg: '#000000', side: '#08070B', panel: '#0F0D14', inner: '#17141E' });
  if (l.bg === 'soft' && !light) Object.assign(t, { bg: t.inner, panel: t.border });
  const radius = l.round === 'sharp' ? 4 : l.round === 'round' ? 18 : 10;
  const size = l.size === 's' ? 14 : l.size === 'l' ? 17 : 15;
  const vars = {
    '--bg': t.bg, '--side': t.side, '--panel': t.panel, '--inner': t.inner, '--border': t.border,
    '--text': t.text, '--muted': t.muted, '--accent': t.accent, '--hi': t.hi, '--warm': t.warm,
    '--on-accent': light ? '#FFFFFF' : t.bg, '--r': radius + 'px', '--fs': size + 'px'
  };
  const root = document.documentElement;
  Object.entries(vars).forEach(([k, v]) => root.style.setProperty(k, v));
  root.style.colorScheme = light ? 'light' : 'dark';
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', t.bg);
}
