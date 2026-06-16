const VEIL_RANKS = {
  vessel: {
    key: 'vessel',
    label: 'Vessel',
    markCount: 1,
    description: 'A newly bound card touched by the Veil.',
    border: 'border-slate-400/70',
    glow: 'shadow-[0_0_10px_rgba(148,163,184,0.25)]',
    frame: 'from-slate-800 to-slate-950',
    edge: 'bg-slate-300',
    mark: 'bg-slate-200 border-slate-50 shadow-[0_0_6px_rgba(226,232,240,0.55)]',
    emptyMark: 'bg-slate-700/60 border-slate-500/30',
    accentText: 'text-slate-200',
    shine: false,
  },

  awakened: {
    key: 'awakened',
    label: 'Awakened',
    markCount: 2,
    description: 'The card has stirred beyond its first Veil state.',
    border: 'border-blue-400',
    glow: 'shadow-[0_0_16px_rgba(96,165,250,0.55)]',
    frame: 'from-blue-950/80 to-slate-950',
    edge: 'bg-blue-400',
    mark: 'bg-blue-300 border-blue-100 shadow-[0_0_7px_rgba(147,197,253,0.65)]',
    emptyMark: 'bg-blue-950/70 border-blue-500/30',
    accentText: 'text-blue-200',
    shine: false,
  },

  ascendant: {
    key: 'ascendant',
    label: 'Ascendant',
    markCount: 3,
    description: 'A higher Veil rank with stronger aura potential.',
    border: 'border-purple-400',
    glow: 'shadow-[0_0_18px_rgba(192,132,252,0.65)]',
    frame: 'from-purple-950/80 to-slate-950',
    edge: 'bg-purple-400',
    mark: 'bg-purple-300 border-purple-100 shadow-[0_0_7px_rgba(216,180,254,0.7)]',
    emptyMark: 'bg-purple-950/70 border-purple-500/30',
    accentText: 'text-purple-200',
    shine: true,
  },

  exalted: {
    key: 'exalted',
    label: 'Exalted',
    markCount: 4,
    description: 'A rare Veil rank marked by divine or corrupted resonance.',
    border: 'border-amber-300',
    glow: 'shadow-[0_0_22px_rgba(252,211,77,0.75)]',
    frame: 'from-amber-900/80 to-slate-950',
    edge: 'bg-amber-300',
    mark: 'bg-amber-200 border-yellow-50 shadow-[0_0_8px_rgba(253,230,138,0.75)]',
    emptyMark: 'bg-amber-950/70 border-amber-500/30',
    accentText: 'text-amber-200',
    shine: true,
  },

  mythic: {
    key: 'mythic',
    label: 'Mythic',
    markCount: 5,
    description: 'A myth-level Veil rank carrying rare power.',
    border: 'border-pink-400',
    glow: 'shadow-[0_0_24px_rgba(244,114,182,0.75)]',
    frame: 'from-pink-900/80 to-slate-950',
    edge: 'bg-pink-400',
    mark: 'bg-pink-300 border-pink-100 shadow-[0_0_8px_rgba(249,168,212,0.78)]',
    emptyMark: 'bg-pink-950/70 border-pink-500/30',
    accentText: 'text-pink-200',
    shine: true,
  },

  transcendent: {
    key: 'transcendent',
    label: 'Transcendent',
    markCount: 6,
    description: 'A card that has pushed beyond known Veil limits.',
    border: 'border-indigo-300',
    glow: 'shadow-[0_0_24px_rgba(165,180,252,0.75)]',
    frame: 'from-indigo-900/80 to-slate-950',
    edge: 'bg-indigo-300',
    mark: 'bg-indigo-200 border-indigo-50 shadow-[0_0_8px_rgba(199,210,254,0.8)]',
    emptyMark: 'bg-indigo-950/70 border-indigo-500/30',
    accentText: 'text-indigo-200',
    shine: true,
  },

  eclipse: {
    key: 'eclipse',
    label: 'Eclipse',
    markCount: 7,
    description: 'A dark celestial rank wrapped in eclipse aura.',
    border: 'border-violet-300',
    glow: 'shadow-[0_0_26px_rgba(196,181,253,0.8)]',
    frame: 'from-violet-950/90 to-slate-950',
    edge: 'bg-violet-300',
    mark: 'bg-violet-200 border-violet-50 shadow-[0_0_9px_rgba(221,214,254,0.82)]',
    emptyMark: 'bg-violet-950/70 border-violet-500/30',
    accentText: 'text-violet-200',
    shine: true,
  },

  singularity: {
    key: 'singularity',
    label: 'Singularity',
    markCount: 7,
    description: 'The highest known Veil rank. Reality bends around it.',
    border: 'border-primary',
    glow: 'shadow-[0_0_30px_rgba(250,189,50,0.85)]',
    frame: 'from-primary/30 to-slate-950',
    edge: 'bg-primary',
    mark: 'bg-primary border-yellow-100 shadow-[0_0_10px_rgba(250,189,50,0.9)]',
    emptyMark: 'bg-yellow-950/70 border-primary/30',
    accentText: 'text-primary',
    shine: true,
    singularity: true,
  },
};

const LEGACY_RANK_MAP = {
  common: 'vessel',
  normal: 'vessel',
  high_normal: 'awakened',
  rare: 'ascendant',
  super_rare: 'exalted',
  ascended: 'exalted',
  super_super_rare: 'mythic',
  epic: 'mythic',
  legendary: 'transcendent',
  paragon: 'transcendent',
  ultra_rare: 'eclipse',
};

export const VEIL_RANK_ORDER = [
  'vessel',
  'awakened',
  'ascendant',
  'exalted',
  'mythic',
  'transcendent',
  'eclipse',
  'singularity',
];

export const MAX_VEIL_MARKS = 7;

export function normalizeCosmeticKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

export function getVeilRankKey(card) {
  const raw = normalizeCosmeticKey(card?.rarity || card?.rarity_tier || 'vessel');

  return LEGACY_RANK_MAP[raw] || raw;
}

export function getVeilRankMeta(card) {
  const key = getVeilRankKey(card);

  return VEIL_RANKS[key] || VEIL_RANKS.vessel;
}

function normalizeStage(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll('+', '_plus')
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

export function getCoreFormIndex(playerCard, card) {
  const evolveCount = Number(playerCard?.evolve_count || 0);

  if (evolveCount >= 3) return 4;
  if (evolveCount === 2) return 3;
  if (evolveCount === 1) return 2;

  const stage = normalizeStage(
    playerCard?.evolution_stage || card?.evolution_stage || card?.evo_form
  );

  if (stage === 'final') return 4;
  if (stage === 'base_plus_plus') return 3;
  if (stage === 'base_plus') return 2;

  return 1;
}

export function getCoreFormMeta(playerCard, card) {
  const index = getCoreFormIndex(playerCard, card);

  const forms = {
    1: {
      index: 1,
      roman: 'I',
      label: 'Base',
      pill: 'Form I',
    },
    2: {
      index: 2,
      roman: 'II',
      label: 'Base+',
      pill: 'Form II',
    },
    3: {
      index: 3,
      roman: 'III',
      label: 'Base++',
      pill: 'Form III',
    },
    4: {
      index: 4,
      roman: 'IV',
      label: 'Final',
      pill: 'Form IV',
    },
  };

  return forms[index] || forms[1];
}