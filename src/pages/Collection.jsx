import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCards,
  usePlayerCards,
  useUpdatePlayerCard,
  useUpdateProfile,
  useProfile,
} from '@/hooks/useGameData';
import GameCard from '@/components/game/GameCard';
import CardDetailModal from '@/components/game/CardDetailModal';
import PageHeader from '@/components/game/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

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

  // Legacy support so old data does not disappear while we clean Supabase.
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

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function getCardFaction(card) {
  return normalizeKey(
    card?.faction ||
      card?.faction_name ||
      card?.card_faction ||
      card?.element ||
      'unknown'
  );
}

function getCardRarity(card) {
  return normalizeKey(card?.rarity || 'common');
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

  const enrichedCards = useMemo(() => {
    return playerCards
      .map((pc) => {
        const card = cards.find((c) => c.id === pc.card_id);

        if (!card) return null;

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
  }, [cards, playerCards]);

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
    <div className="max-w-lg mx-auto space-y-4">
      <PageHeader title="Collection" subtitle="Your owned cards" />

      <div className="px-4 pb-6 space-y-4">
        <div className="rounded-2xl border border-border/70 bg-card/70 p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm font-black text-primary">
                Card Vault
              </p>
              <p className="text-[11px] text-muted-foreground">
                {filtered.length} shown · {enrichedCards.length} owned
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Sorted by
              </p>
              <p className="text-xs font-bold text-foreground">Power</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select value={factionFilter} onValueChange={setFactionFilter}>
              <SelectTrigger className="h-9 text-xs">
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
              <SelectTrigger className="h-9 text-xs">
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

          {factionFilter !== 'all' && (
            <p className="text-[11px] text-muted-foreground">
              Filtered by {getFactionIcon(factionFilter)}{' '}
              {getFactionLabel(factionFilter)}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 justify-items-center">
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
            <p className="font-display text-lg text-primary">No cards found</p>
            <p className="text-sm mt-1">
              Try changing your faction or rarity filter.
            </p>
          </div>
        )}

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