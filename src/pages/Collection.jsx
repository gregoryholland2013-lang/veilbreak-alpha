import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Layers,
  Search,
  Sparkles,
  Trophy,
  Shield,
} from 'lucide-react';
import {
  useCards,
  usePlayerCards,
  useUpdatePlayerCard,
  useUpdateProfile,
  useProfile,
} from '@/hooks/useGameData';
import GameCard from '@/components/game/GameCard';
import CardDetailModal from '@/components/game/CardDetailModal';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

const COLLECTION_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

const FACTION_OPTIONS = [
  { value: 'all', label: 'All Factions', icon: '🌌' },
  { value: 'ironveil', label: 'Ironveil', icon: '⚙️' },
  { value: 'embercourt', label: 'Embercourt', icon: '🔥' },
  { value: 'tideborn', label: 'Tideborn', icon: '💧' },
  { value: 'verdant', label: 'Verdant', icon: '🌿' },
  { value: 'aurelion', label: 'Aurelion', icon: '✨' },
];

const RARITY_OPTIONS = [
  { value: 'all', label: 'All Rarity' },
  { value: 'vessel', label: 'Vessel' },
  { value: 'awakened', label: 'Awakened' },
  { value: 'ascendant', label: 'Ascendant' },
  { value: 'exalted', label: 'Exalted' },
  { value: 'mythic', label: 'Mythic' },
  { value: 'transcendent', label: 'Transcendent' },
  { value: 'eclipse', label: 'Eclipse' },
  { value: 'singularity', label: 'Singularity' },
  { value: 'common', label: 'Common' },
  { value: 'normal', label: 'Normal' },
  { value: 'high_normal', label: 'High Normal' },
  { value: 'rare', label: 'Rare' },
  { value: 'super_rare', label: 'Super Rare' },
  { value: 'super_super_rare', label: 'Super Super Rare' },
  { value: 'epic', label: 'Epic' },
  { value: 'legendary', label: 'Legendary' },
  { value: 'ultra_rare', label: 'Ultra Rare' },
];

const RARITY_RANK = {
  vessel: 1,
  common: 1,
  normal: 1,
  awakened: 2,
  high_normal: 2,
  ascendant: 3,
  rare: 3,
  exalted: 4,
  super_rare: 4,
  mythic: 5,
  super_super_rare: 5,
  epic: 5,
  transcendent: 6,
  legendary: 6,
  eclipse: 7,
  ultra_rare: 7,
  singularity: 8,
};

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();

    if (text) return text;
  }

  return '';
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function getDisplayName(card, playerCard) {
  return (
    firstNonEmpty(
      card?.full_card_name,
      card?.card_line,
      card?.name,
      card?.card_name,
      playerCard?.full_card_name,
      playerCard?.card_line,
      playerCard?.name,
      playerCard?.card_name
    ) || 'Unknown Card'
  );
}

function getRawFaction(card, playerCard) {
  return (
    firstNonEmpty(
      card?.faction,
      card?.faction_name,
      card?.card_faction,
      card?.element,
      playerCard?.faction,
      playerCard?.faction_name,
      playerCard?.card_faction,
      playerCard?.element
    ) || 'Unknown'
  );
}

function getRawRarity(card, playerCard) {
  return (
    firstNonEmpty(
      card?.rarity_tier,
      card?.rarity,
      playerCard?.rarity_tier,
      playerCard?.rarity
    ) || 'Vessel'
  );
}

function getRawEvoForm(card, playerCard) {
  return (
    firstNonEmpty(
      card?.evo_form,
      card?.evolution,
      playerCard?.evo_form,
      playerCard?.evolution
    ) || 'base'
  );
}

function normalizeCardForDisplay(card = {}, playerCard = {}) {
  const name = getDisplayName(card, playerCard);
  const faction = getRawFaction(card, playerCard);
  const rarity = getRawRarity(card, playerCard);
  const evoForm = getRawEvoForm(card, playerCard);

  return {
    ...card,

    id: card?.id || playerCard?.card_id,

    // Name fields — this is the main fix.
    name,
    card_name: card?.card_name || name,
    card_line: card?.card_line || playerCard?.card_line || name,
    full_card_name: card?.full_card_name || playerCard?.full_card_name || name,

    // Rarity fields.
    rarity,
    rarity_tier: card?.rarity_tier || playerCard?.rarity_tier || rarity,

    // Faction/element fields.
    faction,
    element: card?.element || faction,
    faction_key: normalizeKey(faction),

    // Evo fields.
    evo_form: card?.evo_form || playerCard?.evo_form || evoForm,
    evolution: card?.evolution || playerCard?.evolution || evoForm,

    // Image fields.
    image_url:
      card?.image_url ||
      card?.artwork_url ||
      card?.image ||
      playerCard?.image_url ||
      playerCard?.artwork_url ||
      playerCard?.image ||
      '',

    // Stat fields.
    base_attack: card?.base_attack ?? playerCard?.base_attack ?? playerCard?.attack ?? 0,
    base_defense:
      card?.base_defense ?? playerCard?.base_defense ?? playerCard?.defense ?? 0,
    base_hp: card?.base_hp ?? playerCard?.base_hp ?? playerCard?.hp ?? 0,
  };
}

function getCardFaction(card) {
  return normalizeKey(card?.faction || card?.faction_name || card?.card_faction || card?.element || 'unknown');
}

function getCardRarity(card) {
  return normalizeKey(card?.rarity_tier || card?.rarity || 'vessel');
}

function getFactionLabel(value) {
  const normalized = normalizeKey(value);

  return (
    FACTION_OPTIONS.find((faction) => faction.value === normalized)?.label ||
    value ||
    'Unknown'
  );
}

function getFactionIcon(value) {
  const normalized = normalizeKey(value);

  return (
    FACTION_OPTIONS.find((faction) => faction.value === normalized)?.icon ||
    '🌌'
  );
}

function getOwnedCardStat(playerCard, card, stat) {
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

function getOwnedCardPower(playerCard, card) {
  return (
    getOwnedCardStat(playerCard, card, 'attack') +
    getOwnedCardStat(playerCard, card, 'defense') +
    getOwnedCardStat(playerCard, card, 'hp')
  );
}

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-blue-700/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {label}
      </div>
      <p className="font-display text-xl font-black mt-1">{value}</p>
    </div>
  );
}

export default function Collection() {
  const queryClient = useQueryClient();

  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: profile } = useProfile();

  const updatePlayerCard = useUpdatePlayerCard();
  const updateProfile = useUpdateProfile();

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPlayerCard, setSelectedPlayerCard] = useState(null);
  const [factionFilter, setFactionFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');

  const cardsById = useMemo(() => {
    return new Map((cards || []).map((card) => [String(card.id), card]));
  }, [cards]);

  const enrichedCards = useMemo(() => {
    return playerCards
      .map((pc) => {
        const rawCard =
          cardsById.get(String(pc.card_id)) ||
          pc.cards ||
          pc.card ||
          pc.card_definition ||
          pc.cardDef ||
          null;

        if (!rawCard && !pc.card_line && !pc.full_card_name && !pc.name) {
          return null;
        }

        const card = normalizeCardForDisplay(rawCard || {}, pc);
        const rarity = getCardRarity(card);
        const faction = getCardFaction(card);

        return {
          card,
          playerCard: pc,
          faction,
          rarity,
          power: getOwnedCardPower(pc, card),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.power !== a.power) {
          return b.power - a.power;
        }

        const rarityDiff =
          (RARITY_RANK[b.rarity] || 0) - (RARITY_RANK[a.rarity] || 0);

        if (rarityDiff !== 0) {
          return rarityDiff;
        }

        return String(a.card.name || '').localeCompare(String(b.card.name || ''));
      });
  }, [cardsById, playerCards]);

  const filtered = useMemo(() => {
    return enrichedCards.filter(({ faction, rarity }) => {
      if (factionFilter !== 'all' && faction !== factionFilter) {
        return false;
      }

      if (rarityFilter !== 'all' && rarity !== rarityFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedCards, factionFilter, rarityFilter]);

  const highestPower = enrichedCards[0]?.power || 0;

  const uniqueLines = useMemo(() => {
    return new Set(
      enrichedCards.map(({ card }) =>
        String(card.card_line || card.full_card_name || card.name || '')
          .toLowerCase()
          .trim()
      )
    ).size;
  }, [enrichedCards]);

  const handleProtectionUpdated = (updatedCard) => {
    const nextCard = Array.isArray(updatedCard) ? updatedCard[0] : updatedCard;

    queryClient.invalidateQueries({ queryKey: ['playerCards'] });
    queryClient.invalidateQueries({ queryKey: ['collection'] });

    if (selectedPlayerCard?.id === nextCard?.id) {
      setSelectedPlayerCard(nextCard);
    }
  };

  const handleLevelUp = async (pc) => {
    if (!profile) {
      toast.error('Profile has not loaded yet');
      return;
    }

    if ((profile.gold || 0) < 100) {
      toast.error('Not enough gold!');
      return;
    }

    const currentLevel = pc.level || 1;
    const currentXp = pc.experience || 0;

    const xpNeeded = currentLevel * 50;
    const newXp = currentXp + 50;
    const levelUp = newXp >= xpNeeded;

    try {
      await updatePlayerCard.mutateAsync({
        id: pc.id,
        data: {
          level: levelUp ? currentLevel + 1 : currentLevel,
          experience: levelUp ? newXp - xpNeeded : newXp,
        },
      });

      await updateProfile.mutateAsync({
        id: profile.id,
        data: {
          gold: (profile.gold || 0) - 100,
        },
      });

      queryClient.invalidateQueries({ queryKey: ['playerCards'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast.success(levelUp ? 'Level Up!' : 'XP gained!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not level up card');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={COLLECTION_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <Layers className="w-4 h-4" />
                  Card Vault
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  COLLECTION
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  Browse your owned cards, inspect Veil Marks, and manage your strongest units.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat
                  icon={Layers}
                  label="Owned"
                  value={enrichedCards.length.toLocaleString()}
                />
                <HeroStat
                  icon={Trophy}
                  label="Best Power"
                  value={highestPower.toLocaleString()}
                />
                <HeroStat
                  icon={Sparkles}
                  label="Lines"
                  value={uniqueLines.toLocaleString()}
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden">
          <div className="p-5 md:p-6 border-b border-border bg-primary/5">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                  <Search className="w-4 h-4" />
                  Your Owned Cards
                </div>

                <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                  Card Vault
                </h2>

                <p className="text-sm text-muted-foreground mt-2">
                  {filtered.length} shown · {enrichedCards.length} owned
                  {factionFilter !== 'all'
                    ? ` · ${getFactionIcon(factionFilter)} ${getFactionLabel(
                        factionFilter
                      )}`
                    : ''}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 w-full lg:w-[420px]">
                <Select value={factionFilter} onValueChange={setFactionFilter}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="All Factions" />
                  </SelectTrigger>

                  <SelectContent>
                    {FACTION_OPTIONS.map((faction) => (
                      <SelectItem key={faction.value} value={faction.value}>
                        {faction.icon} {faction.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={rarityFilter} onValueChange={setRarityFilter}>
                  <SelectTrigger className="h-10 text-xs">
                    <SelectValue placeholder="All Rarity" />
                  </SelectTrigger>

                  <SelectContent>
                    {RARITY_OPTIONS.map((rarity) => (
                      <SelectItem key={rarity.value} value={rarity.value}>
                        {rarity.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="p-5 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5 justify-items-center">
              <AnimatePresence>
                {filtered.map(({ card, playerCard }) => (
                  <motion.div
                    key={playerCard.id}
                    layout
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                  >
                    <GameCard
                      card={card}
                      playerCard={playerCard}
                      size="md"
                      showProtectionBadge={false}
                      onClick={() => {
                        setSelectedCard(card);
                        setSelectedPlayerCard(playerCard);
                      }}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-display text-lg text-primary">No cards found</p>
                <p className="text-sm mt-1">
                  Try changing your faction or rarity filter.
                </p>
              </div>
            )}
          </div>
        </section>

        <CardDetailModal
          card={selectedCard}
          playerCard={selectedPlayerCard}
          open={!!selectedCard}
          onClose={() => {
            setSelectedCard(null);
            setSelectedPlayerCard(null);
          }}
          onLevelUp={handleLevelUp}
          onProtectionUpdated={handleProtectionUpdated}
        />
      </div>
    </div>
  );
}