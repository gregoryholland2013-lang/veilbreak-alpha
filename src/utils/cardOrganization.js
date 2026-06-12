const RARITY_RANK = {
  common: 1,
  normal: 1,
  high_normal: 2,
  rare: 3,
  super_rare: 4,
  super_super_rare: 5,
  epic: 5,
  legendary: 6,
  ultra_rare: 7,
  ascended: 8,
  exalted: 9,
  paragon: 10,
  mythic: 11,
  transcendent: 12,
  eclipse: 13,
  singularity: 14,
};

const STAGE_RANK = {
  base: 0,
  base_plus: 1,
  base_plus_plus: 2,
  final: 3,
};

export const CARD_SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'name_az', label: 'Name A-Z' },
  { value: 'level_desc', label: 'Level High' },
  { value: 'level_asc', label: 'Level Low' },
  { value: 'total_desc', label: 'Total Stats High' },
  { value: 'attack_desc', label: 'ATK High' },
  { value: 'defense_desc', label: 'DEF High' },
  { value: 'hp_desc', label: 'HP High' },
  { value: 'rarity_desc', label: 'Rarity High' },
  { value: 'rarity_asc', label: 'Rarity Low' },
  { value: 'faction_az', label: 'Faction A-Z' },
  { value: 'evolution_desc', label: 'Evolution High' },
  { value: 'evolution_asc', label: 'Evolution Low' },
];

export function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

export function normalizeStage(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll('+', '_plus')
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

export function formatStageLabel(stage) {
  const normalized = normalizeStage(stage);

  if (normalized === 'base_plus') return 'Base+';
  if (normalized === 'base_plus_plus') return 'Base++';
  if (normalized === 'final') return 'Final Form';

  return 'Base';
}

export function getFaction(card) {
  return card?.faction || card?.element || card?.card_type || 'unknown';
}

export function getCardLine(card) {
  const explicit = normalizeText(card?.card_line);

  if (explicit) return explicit;

  return normalizeText(card?.full_card_name || card?.name || '')
    .replace(/base\+\+/g, '')
    .replace(/base_plus_plus/g, '')
    .replace(/base\+/g, '')
    .replace(/base_plus/g, '')
    .replace(/final form/g, '')
    .replace(/final/g, '')
    .replace(/\bbase\b/g, '')
    .replace(/[,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getStage(playerCard, card) {
  const evolveCount = Number(playerCard?.evolve_count || 0);

  if (evolveCount >= 3) return 'final';
  if (evolveCount === 2) return 'base_plus_plus';
  if (evolveCount === 1) return 'base_plus';

  const raw =
    playerCard?.evolution_stage ||
    card?.evolution_stage ||
    card?.evo_form;

  const normalized = normalizeStage(raw);

  if (normalized === 'final') return 'final';
  if (normalized === 'base_plus_plus') return 'base_plus_plus';
  if (normalized === 'base_plus') return 'base_plus';

  const text = normalizeText(`${card?.name || ''} ${card?.full_card_name || ''}`);

  if (
    text.includes('final form') ||
    text.includes(' final') ||
    text.endsWith('final')
  ) {
    return 'final';
  }

  if (
    text.includes('base++') ||
    text.includes('base_plus_plus') ||
    text.includes('++')
  ) {
    return 'base_plus_plus';
  }

  if (
    text.includes('base+') ||
    text.includes('base_plus') ||
    text.includes('+')
  ) {
    return 'base_plus';
  }

  return 'base';
}

export function getStageRank(playerCard, card) {
  return STAGE_RANK[getStage(playerCard, card)] || 0;
}

export function getRarityRank(card) {
  return RARITY_RANK[normalizeText(card?.rarity)] || 0;
}

export function getCurrentStat(playerCard, card, stat) {
  if (stat === 'attack') {
    return Number(
      playerCard?.attack ??
        playerCard?.stage_base_attack ??
        card?.base_attack ??
        0
    );
  }

  if (stat === 'defense') {
    return Number(
      playerCard?.defense ??
        playerCard?.stage_base_defense ??
        card?.base_defense ??
        0
    );
  }

  if (stat === 'hp') {
    return Number(
      playerCard?.hp ??
        playerCard?.max_hp ??
        playerCard?.stage_base_hp ??
        card?.base_hp ??
        0
    );
  }

  return 0;
}

export function getTotalStats(playerCard, card) {
  return (
    getCurrentStat(playerCard, card, 'attack') +
    getCurrentStat(playerCard, card, 'defense') +
    getCurrentStat(playerCard, card, 'hp')
  );
}

export function getCardFilterOptions(enrichedCards = []) {
  const rarities = new Set();
  const factions = new Set();
  const stages = new Set();
  const lines = new Set();

  enrichedCards.forEach(({ card, playerCard }) => {
    if (card?.rarity) rarities.add(card.rarity);

    const faction = getFaction(card);
    const stage = getStage(playerCard, card);
    const line = getCardLine(card);

    if (faction) factions.add(faction);
    if (stage) stages.add(stage);
    if (line) lines.add(line);
  });

  return {
    rarities: [...rarities].sort(),
    factions: [...factions].sort(),
    stages: [...stages].sort(
      (a, b) => (STAGE_RANK[a] || 0) - (STAGE_RANK[b] || 0)
    ),
    lines: [...lines].sort(),
  };
}

export function filterCards(enrichedCards = [], filters = {}) {
  const {
    search = '',
    rarity = 'all',
    faction = 'all',
    stage = 'all',
    line = 'all',
  } = filters;

  const searchValue = normalizeText(search);

  return enrichedCards.filter(({ card, playerCard }) => {
    const cardName = normalizeText(card?.name);
    const fullName = normalizeText(card?.full_card_name);
    const skillName = normalizeText(card?.skill_name);
    const cardLine = getCardLine(card);
    const cardFaction = normalizeText(getFaction(card));
    const cardStage = getStage(playerCard, card);
    const cardRarity = normalizeText(card?.rarity);

    if (searchValue) {
      const matchesSearch =
        cardName.includes(searchValue) ||
        fullName.includes(searchValue) ||
        skillName.includes(searchValue) ||
        cardLine.includes(searchValue);

      if (!matchesSearch) return false;
    }

    if (rarity !== 'all' && cardRarity !== normalizeText(rarity)) return false;
    if (faction !== 'all' && cardFaction !== normalizeText(faction)) return false;
    if (stage !== 'all' && cardStage !== normalizeStage(stage)) return false;
    if (line !== 'all' && cardLine !== normalizeText(line)) return false;

    return true;
  });
}

export function sortCards(enrichedCards = [], sortBy = 'newest') {
  const sorted = [...enrichedCards];

  sorted.sort((a, b) => {
    const aCard = a.card;
    const bCard = b.card;
    const aPc = a.playerCard;
    const bPc = b.playerCard;

    switch (sortBy) {
      case 'oldest':
        return new Date(aPc?.created_at || 0) - new Date(bPc?.created_at || 0);

      case 'name_az':
        return String(aCard?.name || '').localeCompare(String(bCard?.name || ''));

      case 'level_desc':
        return Number(bPc?.level || 1) - Number(aPc?.level || 1);

      case 'level_asc':
        return Number(aPc?.level || 1) - Number(bPc?.level || 1);

      case 'total_desc':
        return getTotalStats(bPc, bCard) - getTotalStats(aPc, aCard);

      case 'attack_desc':
        return (
          getCurrentStat(bPc, bCard, 'attack') -
          getCurrentStat(aPc, aCard, 'attack')
        );

      case 'defense_desc':
        return (
          getCurrentStat(bPc, bCard, 'defense') -
          getCurrentStat(aPc, aCard, 'defense')
        );

      case 'hp_desc':
        return getCurrentStat(bPc, bCard, 'hp') - getCurrentStat(aPc, aCard, 'hp');

      case 'rarity_desc':
        return getRarityRank(bCard) - getRarityRank(aCard);

      case 'rarity_asc':
        return getRarityRank(aCard) - getRarityRank(bCard);

      case 'faction_az':
        return String(getFaction(aCard)).localeCompare(String(getFaction(bCard)));

      case 'evolution_desc':
        return getStageRank(bPc, bCard) - getStageRank(aPc, aCard);

      case 'evolution_asc':
        return getStageRank(aPc, aCard) - getStageRank(bPc, bCard);

      case 'newest':
      default:
        return new Date(bPc?.created_at || 0) - new Date(aPc?.created_at || 0);
    }
  });

  return sorted;
}

export function organizeCards(enrichedCards = [], options = {}) {
  const filtered = filterCards(enrichedCards, options.filters || {});
  const sorted = sortCards(filtered, options.sortBy || 'newest');

  return sorted;
}