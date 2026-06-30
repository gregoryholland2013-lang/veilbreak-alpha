const FACTION_EMBLEMS = {
  ironveil: {
    key: 'ironveil',
    label: 'Ironveil',
    url: '/faction-emblems/ironveil.png',
    accent: 'text-blue-300',
    border: 'border-blue-400/40',
    bg: 'bg-blue-500/10',
    glow: 'shadow-[0_0_14px_rgba(96,165,250,0.28)]',
  },
  embercourt: {
    key: 'embercourt',
    label: 'Embercourt',
    url: '/faction-emblems/embercourt.png',
    accent: 'text-red-300',
    border: 'border-red-400/40',
    bg: 'bg-red-500/10',
    glow: 'shadow-[0_0_14px_rgba(248,113,113,0.28)]',
  },
  tideborn: {
    key: 'tideborn',
    label: 'Tideborn',
    url: '/faction-emblems/tideborn.png',
    accent: 'text-cyan-300',
    border: 'border-cyan-400/40',
    bg: 'bg-cyan-500/10',
    glow: 'shadow-[0_0_14px_rgba(34,211,238,0.28)]',
  },
  verdant: {
    key: 'verdant',
    label: 'Verdant',
    url: '/faction-emblems/verdant.png',
    accent: 'text-emerald-300',
    border: 'border-emerald-400/40',
    bg: 'bg-emerald-500/10',
    glow: 'shadow-[0_0_14px_rgba(52,211,153,0.28)]',
  },
  aurelion: {
    key: 'aurelion',
    label: 'Aurelion',
    url: '/faction-emblems/aurelion.png',
    accent: 'text-yellow-200',
    border: 'border-yellow-300/45',
    bg: 'bg-yellow-500/10',
    glow: 'shadow-[0_0_16px_rgba(250,204,21,0.34)]',
  },
};

const FACTION_ALIASES = {
  iron: 'ironveil',
  ironveil: 'ironveil',
  iron_veil: 'ironveil',

  ember: 'embercourt',
  embercourt: 'embercourt',
  ember_court: 'embercourt',

  tide: 'tideborn',
  tideborn: 'tideborn',
  tide_born: 'tideborn',

  verdant: 'verdant',

  aure: 'aurelion',
  aurelion: 'aurelion',
  light: 'aurelion',
};

export function normalizeFactionKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

export function getFactionKey(cardOrFaction) {
  const raw =
    typeof cardOrFaction === 'string'
      ? cardOrFaction
      : cardOrFaction?.faction ||
        cardOrFaction?.faction_key ||
        cardOrFaction?.element ||
        '';

  const normalized = normalizeFactionKey(raw);

  return FACTION_ALIASES[normalized] || normalized;
}

export function getFactionEmblemMeta(cardOrFaction) {
  const key = getFactionKey(cardOrFaction);

  return FACTION_EMBLEMS[key] || null;
}

export const FACTION_EMBLEMS_BY_KEY = FACTION_EMBLEMS;
