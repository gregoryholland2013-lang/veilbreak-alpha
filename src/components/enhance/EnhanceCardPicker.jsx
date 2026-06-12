import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Heart, ChevronRight } from 'lucide-react';
import CardOrganizerControls from '@/components/enhance/CardOrganizerControls';
import {
  formatStageLabel,
  getCardFilterOptions,
  getCurrentStat,
  getStage,
  organizeCards,
} from '@/utils/cardOrganization';

const rarityColors = {
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

const rarityBg = {
  common: 'bg-muted/20',
  normal: 'bg-muted/20',
  high_normal: 'bg-slate-900/20',
  rare: 'bg-blue-900/20',
  super_rare: 'bg-purple-900/20',
  super_super_rare: 'bg-fuchsia-900/20',
  epic: 'bg-purple-900/20',
  legendary: 'bg-primary/10',
  ultra_rare: 'bg-orange-900/20',
  ascended: 'bg-yellow-900/20',
  exalted: 'bg-amber-900/20',
  paragon: 'bg-cyan-900/20',
  mythic: 'bg-pink-900/20',
  transcendent: 'bg-indigo-900/20',
  eclipse: 'bg-violet-900/20',
  singularity: 'bg-primary/10',
};

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
};

export default function EnhanceCardPicker({
  enrichedCards,
  onSelect,
  title = 'Choose a Card',
  subtitle = 'Select the card you want to level up or evolve.',
  defaultSort = 'newest',
  hideHeader = false,
}) {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState(defaultSort);
  const [filters, setFilters] = useState({
    rarity: 'all',
    faction: 'all',
    stage: 'all',
    line: 'all',
  });

  const filterOptions = useMemo(() => {
    return getCardFilterOptions(enrichedCards);
  }, [enrichedCards]);

  const organizedCards = useMemo(() => {
    return organizeCards(enrichedCards, {
      sortBy,
      filters: {
        ...filters,
        search,
      },
    });
  }, [enrichedCards, sortBy, filters, search]);

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div>
          <h2 className="font-display text-lg font-bold text-primary">
            {title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {subtitle}
          </p>
        </div>
      )}

      <CardOrganizerControls
        search={search}
        setSearch={setSearch}
        sortBy={sortBy}
        setSortBy={setSortBy}
        filters={filters}
        setFilters={setFilters}
        filterOptions={filterOptions}
      />

      <div className="space-y-2">
        {organizedCards.map(({ card, playerCard, maxed, stageLabel }, i) => {
          const level = playerCard.level || 1;
          const evolveCount = playerCard.evolve_count || 0;
          const stage = stageLabel || formatStageLabel(getStage(playerCard, card));

          const attack = getCurrentStat(playerCard, card, 'attack');
          const defense = getCurrentStat(playerCard, card, 'defense');
          const hp = getCurrentStat(playerCard, card, 'hp');

          return (
            <motion.button
              key={playerCard.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.015, 0.25) }}
              onClick={() => onSelect({ card, playerCard })}
              className={`w-full flex items-center gap-3 rounded-xl border-2 ${
                rarityColors[card.rarity] || rarityColors.common
              } ${
                rarityBg[card.rarity] || rarityBg.common
              } p-3 hover:brightness-110 transition-all text-left ${
                maxed ? 'opacity-70' : ''
              }`}
              type="button"
            >
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {card.image_url ? (
                  <img
                    src={card.image_url}
                    alt={card.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl">
                    {elementIcons[card.element] || '⚔️'}
                  </span>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-sm truncate">
                    {card.name}
                  </p>

                  <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold whitespace-nowrap">
                    {stage}
                  </span>

                  {maxed && (
                    <span className="text-[9px] bg-destructive/20 text-destructive px-1.5 py-0.5 rounded-full font-bold">
                      MAX
                    </span>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground capitalize">
                  {card.rarity} · Lv.{level} · Evo {evolveCount}/3
                </p>

                <div className="flex gap-2 mt-1 text-[10px]">
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

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {organizedCards.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">
          No cards found.
        </p>
      )}
    </div>
  );
}