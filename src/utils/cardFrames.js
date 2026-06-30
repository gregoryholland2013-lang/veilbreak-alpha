const CARD_FRAMES = {
  basic: {
    key: 'basic',
    label: 'Basic Frame',
    rarity: 'standard',
    url: '/card-frames/basic.png',
    previewUrl: '/card-frames/basic_dark_preview.png',
    description: 'The default Veilbreak card border.',
  },
  prestige_gold: {
    key: 'prestige_gold',
    label: 'Prestige Gold',
    rarity: 'premium',
    url: '/card-frames/prestige_gold.png',
    previewUrl: '/card-frames/prestige_gold_dark_preview.png',
    description: 'A regal premium frame for special achievements or shop cosmetics.',
  },
  ember_relic: {
    key: 'ember_relic',
    label: 'Ember Relic',
    rarity: 'premium',
    url: '/card-frames/ember_relic.png',
    previewUrl: '/card-frames/ember_relic_dark_preview.png',
    description: 'A molten premium frame with infernal ember energy.',
  },
  tideborn_pearl: {
    key: 'tideborn_pearl',
    label: 'Tideborn Pearl',
    rarity: 'premium',
    url: '/card-frames/tideborn_pearl.png',
    previewUrl: '/card-frames/tideborn_pearl_dark_preview.png',
    description: 'A flowing oceanic frame with pearl and cyan accents.',
  },
  verdant_vine: {
    key: 'verdant_vine',
    label: 'Verdant Vine',
    rarity: 'premium',
    url: '/card-frames/verdant_vine.png',
    previewUrl: '/card-frames/verdant_vine_dark_preview.png',
    description: 'An ancient forest frame wrapped in vines and emerald glow.',
  },
  singularity_void: {
    key: 'singularity_void',
    label: 'Singularity Void',
    rarity: 'premium',
    url: '/card-frames/singularity_void.png',
    previewUrl: '/card-frames/singularity_void_dark_preview.png',
    description: 'An elite cosmic-tech frame for rare endgame cosmetics.',
  },
};

export const DEFAULT_CARD_FRAME_KEY = 'basic';

export function normalizeCardFrameKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

export function getCardFrameKey(card, playerCard) {
  const raw =
    playerCard?.card_frame_key ||
    playerCard?.frame_key ||
    playerCard?.border_key ||
    playerCard?.cosmetic_frame_key ||
    card?.card_frame_key ||
    card?.default_card_frame_key ||
    card?.frame_key ||
    card?.border_key ||
    DEFAULT_CARD_FRAME_KEY;

  const key = normalizeCardFrameKey(raw);

  return CARD_FRAMES[key] ? key : DEFAULT_CARD_FRAME_KEY;
}

export function getCardFrameMeta(card, playerCard) {
  return CARD_FRAMES[getCardFrameKey(card, playerCard)] || CARD_FRAMES.basic;
}

export const CARD_FRAMES_BY_KEY = CARD_FRAMES;
