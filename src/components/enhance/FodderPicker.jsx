import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Sparkles,
  ArrowLeft,
  Zap,
  Sword,
  Shield,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CardOrganizerControls from '@/components/enhance/CardOrganizerControls';
import {
  formatStageLabel,
  getCardFilterOptions,
  getCurrentStat,
  getStage,
  organizeCards,
} from '@/utils/cardOrganization';

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
};

const rarityXp = {
  common: 20,
  normal: 20,
  high_normal: 30,
  rare: 50,
  super_rare: 80,
  super_super_rare: 120,
  epic: 120,
  legendary: 300,
  ultra_rare: 400,
  ascended: 500,
  exalted: 650,
  paragon: 800,
  mythic: 1000,
  transcendent: 1300,
  eclipse: 1600,
  singularity: 2000,
};

const rarityBorder = {
  common: 'border-muted-foreground/40',
  normal: 'border-muted-foreground/40',
  high_normal: 'border-slate-400',
  rare: 'border-blue-400',
  super_rare: 'border-purple-400',
  super_super_rare: 'border-fuchsia-400',
  epic: 'border-purple-400',
  legendary: 'border-primary',
  ultra_rare: 'border-orange-400',
  ascended: 'border-yellow-300',
  exalted: 'border-amber-300',
  paragon: 'border-cyan-300',
  mythic: 'border-pink-400',
  transcendent: 'border-indigo-300',
  eclipse: 'border-violet-300',
  singularity: 'border-primary',
};

const MAX_FODDER = 10;

function fodderXp(card, playerCard) {
  const base = rarityXp[card.rarity] || 20;
  return base * (playerCard.level || 1);
}

function xpToNextLevel(currentLevel) {
  return currentLevel * 50;
}

export default function FodderPicker({
  target,
  enrichedCards,
  onConfirm,
  onBack,
  disabled,
}) {
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('rarity_asc');
  const [filters, setFilters] = useState({
    rarity: 'all',
    faction: 'all',
    stage: 'all',
    line: 'all',
  });

  const available = useMemo(() => {
    return enrichedCards.filter(
      ({ playerCard }) => playerCard.id !== target.playerCard.id
    );
  }, [enrichedCards, target.playerCard.id]);

  const filterOptions = useMemo(() => {
    return getCardFilterOptions(available);
  }, [available]);

  const organizedAvailable = useMemo(() => {
    return organizeCards(available, {
      sortBy,
      filters: {
        ...filters,
        search,
      },
    });
  }, [available, sortBy, filters, search]);

  const toggle = (pcId) => {
    if (disabled) return;

    setSelected((prev) => {
      if (prev.includes(pcId)) {
        return prev.filter((id) => id !== pcId);
      }

      if (prev.length >= MAX_FODDER) {
        return prev;
      }

      return [...prev, pcId];
    });
  };

  const totalXpGain = selected.reduce((sum, id) => {
    const item = available.find(({ playerCard }) => playerCard.id === id);
    if (!item) return sum;

    return sum + fodderXp(item.card, item.playerCard);
  }, 0);

  const currentLevel = target.playerCard.level || 1;
  const currentXp = target.playerCard.experience || 0;

  let simXp = currentXp + totalXpGain;
  let simLevel = currentLevel;

  while (simXp >= xpToNextLevel(simLevel)) {
    simXp -= xpToNextLevel(simLevel);
    simLevel += 1;
  }

  const levelsGained = simLevel - currentLevel;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          type="button"
          disabled={disabled}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div>
          <h2 className="font-display text-lg font-bold text-primary">
            Select Fodder
          </h2>

          <p className="text-xs text-muted-foreground">
            Up to {MAX_FODDER} cards to sacrifice for{' '}
            <span className="text-foreground font-semibold">
              {target.card.name}
            </span>
          </p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {target.card.image_url ? (
            <img
              src={target.card.image_url}
              alt={target.card.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xl">
              {elementIcons[target.card.element] || '⚔️'}
            </span>
          )}
        </div>

        <div className="flex-1">
          <p className="font-display font-bold text-sm">
            {target.card.name}{' '}
            <span className="text-muted-foreground font-normal text-xs">
              Lv.{currentLevel}
            </span>
          </p>

          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (currentXp / xpToNextLevel(currentLevel)) * 100
                  )}%`,
                }}
              />
            </div>

            <span className="text-[10px] text-muted-foreground">
              {currentXp}/{xpToNextLevel(currentLevel)} XP
            </span>
          </div>
        </div>

        {totalXpGain > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-primary font-bold">
              +{totalXpGain} XP
            </p>

            {levelsGained > 0 && (
              <p className="text-[10px] text-green-400">
                +{levelsGained} level{levelsGained > 1 ? 's' : ''}!
              </p>
            )}
          </div>
        )}
      </div>

      <CardOrganizerControls
        search={search}
        setSearch={setSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filters={filters}
        setFilters={setFilters}
        filterOptions={filterOptions}
        compact
      />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {selected.length}/{MAX_FODDER} selected
        </span>

        {selected.length > 0 && (
          <button
            onClick={() => setSelected([])}
            className="text-destructive hover:text-destructive/80"
            type="button"
            disabled={disabled}
          >
            Clear all
          </button>
        )}
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {organizedAvailable.map(({ card, playerCard }, i) => {
          const isSelected = selected.includes(playerCard.id);
          const xpVal = fodderXp(card, playerCard);
          const level = playerCard.level || 1;
          const stageLabel = formatStageLabel(getStage(playerCard, card));

          const attack = getCurrentStat(playerCard, card, 'attack');
          const defense = getCurrentStat(playerCard, card, 'defense');
          const hp = getCurrentStat(playerCard, card, 'hp');

          return (
            <motion.button
              key={playerCard.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.01, 0.2) }}
              onClick={() => toggle(playerCard.id)}
              disabled={disabled}
              type="button"
              className={`w-full flex items-center gap-3 rounded-xl border-2 p-2.5 transition-all text-left ${
                isSelected
                  ? 'border-primary bg-primary/10'
                  : `${rarityBorder[card.rarity] || rarityBorder.common} bg-card hover:brightness-110`
              }`}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-lg">
                    {elementIcons[card.element] || '⚔️'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-xs truncate">
                  {card.name}
                </p>

                <p className="text-[9px] text-muted-foreground capitalize">
                  Lv.{level} · {card.rarity} · {stageLabel}
                </p>

                <div className="flex gap-2 mt-1 text-[9px]">
                  <span className="text-red-400 flex items-center gap-0.5">
                    <Sword className="w-2.5 h-2.5" />
                    {attack}
                  </span>

                  <span className="text-blue-400 flex items-center gap-0.5">
                    <Shield className="w-2.5 h-2.5" />
                    {defense}
                  </span>

                  <span className="text-green-400 flex items-center gap-0.5">
                    <Heart className="w-2.5 h-2.5" />
                    {hp}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                  <Zap className="w-3 h-3" />
                  +{xpVal}
                </span>

                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'border-primary bg-primary'
                      : 'border-muted-foreground'
                  }`}
                >
                  {isSelected && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {available.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          No other cards to use as fodder.
        </p>
      )}

      {available.length > 0 && organizedAvailable.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-sm">
          No fodder cards match your filters.
        </p>
      )}

      <Button
        onClick={() => onConfirm(selected, totalXpGain, levelsGained)}
        disabled={selected.length === 0 || disabled}
        className="w-full gap-2"
      >
        <Sparkles className="w-4 h-4" />
        {disabled
          ? 'Enhancing…'
          : `Enhance ${target.card.name} ${
              selected.length > 0 ? `(+${totalXpGain} XP)` : ''
            }`}
      </Button>
    </div>
  );
}