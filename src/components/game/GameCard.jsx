import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Heart, Lock } from 'lucide-react';
import CardArtCanvas from '@/components/game/CardArtCanvas';
import {
  getCoreFormMeta,
  getVeilRankMeta,
  MAX_VEIL_MARKS,
} from '@/utils/cardCosmetics';

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

function getOwnedCardStats(playerCard, card) {
  const attack = getOwnedCardStat(playerCard, card, 'attack');
  const defense = getOwnedCardStat(playerCard, card, 'defense');
  const hp = getOwnedCardStat(playerCard, card, 'hp');

  return {
    attack,
    defense,
    hp,
    total: attack + defense + hp,
  };
}

function VeilMarks({ rank, size = 'md' }) {
  const markSize =
    size === 'sm' ? 'h-1.5 w-1.5' : size === 'lg' ? 'h-2.5 w-2.5' : 'h-2 w-2';

  const gap = size === 'sm' ? 'gap-0.5' : 'gap-1';
  const padding = size === 'sm' ? 'px-1.5 py-1' : 'px-2 py-1.5';

  return (
    <div
      title={`Veil Rank: ${rank.label} · ${rank.markCount} Veil Marks`}
      className={`flex items-center ${gap} rounded-full border border-white/10 bg-black/65 ${padding} backdrop-blur-md shadow-lg`}
    >
      {Array.from({ length: MAX_VEIL_MARKS }).map((_, index) => {
        const filled = index < rank.markCount;
        const isSingularityFinalMark =
          rank.singularity && index === MAX_VEIL_MARKS - 1;

        return (
          <span
            key={index}
            className={`${markSize} rounded-full border ${
              filled ? rank.mark : rank.emptyMark
            } ${
              isSingularityFinalMark
                ? 'scale-125 ring-1 ring-primary/70'
                : ''
            }`}
          />
        );
      })}
    </div>
  );
}

function FormPill({ form, size = 'md' }) {
  const textSize =
    size === 'sm' ? 'text-[8px]' : size === 'lg' ? 'text-[10px]' : 'text-[9px]';

  return (
    <div
      title={`Core Form: ${form.label}`}
      className={`rounded-lg border border-primary/35 bg-black/70 px-1.5 py-1 ${textSize} font-display font-black leading-none text-primary backdrop-blur-md`}
    >
      {form.pill}
    </div>
  );
}

export default function GameCard({
  card,
  playerCard,
  onClick,
  size = 'md',
  showStats = true,
  actionSlot = null,
  showProtectionBadge = true,
}) {
  if (!card) return null;

  const rank = getVeilRankMeta(card);
  const form = getCoreFormMeta(playerCard, card);
  const level = playerCard?.level || 1;
  const stats = getOwnedCardStats(playerCard, card);
  const isProtected = Boolean(playerCard?.is_protected);

  const sizeClasses = {
    sm: 'w-24',
    md: 'w-40',
    lg: 'w-52',
  };

  const statTextSize = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[10px]',
  };

  const cardSizeClass = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`relative ${cardSizeClass}`}>
      <motion.div
        whileHover={{ scale: 1.045, y: -5, transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.97 }}
        onClick={onClick}
        className={`relative cursor-pointer select-none ${rank.glow} transition-all duration-300`}
      >
        <CardArtCanvas card={card} playerCard={playerCard} size={size}>
          {rank.shine && (
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: 'linear',
                repeatDelay: 1.6,
              }}
              className="pointer-events-none absolute inset-0 z-40 skew-x-12 bg-gradient-to-r from-transparent via-white/14 to-transparent"
            />
          )}

          <div className="absolute left-1.5 top-1.5 z-50">
            <VeilMarks rank={rank} size={size} />
          </div>

          {playerCard && (
            <div className="absolute right-[8%] top-[18%] z-50 rounded-md border border-white/10 bg-black/65 px-1.5 py-1 font-display text-[9px] font-black leading-none text-primary backdrop-blur-sm">
              Lv{level}
            </div>
          )}

          {isProtected && !actionSlot && showProtectionBadge && (
            <div className="absolute right-[8%] top-[27%] z-50 flex h-5 w-5 items-center justify-center rounded-lg border border-primary/50 bg-black/75 backdrop-blur-sm">
              <Lock className="h-3 w-3 text-primary" />
            </div>
          )}

          <div className="absolute bottom-[24%] right-[8%] z-50">
            <FormPill form={form} size={size} />
          </div>

          {showStats && (
            <div
              className={`absolute bottom-[3.1%] left-[12%] right-[12%] z-50 flex justify-center gap-1.5 ${
                statTextSize[size] || statTextSize.md
              }`}
            >
              <span className="flex items-center gap-0.5 font-bold text-red-400">
                <Sword className="h-2.5 w-2.5" />
                {stats.attack}
              </span>

              <span className="flex items-center gap-0.5 font-bold text-blue-400">
                <Shield className="h-2.5 w-2.5" />
                {stats.defense}
              </span>

              <span className="flex items-center gap-0.5 font-bold text-green-400">
                <Heart className="h-2.5 w-2.5" />
                {stats.hp}
              </span>
            </div>
          )}

          <div
            className={`absolute left-0 right-0 top-0 z-40 h-0.5 ${rank.edge} opacity-70`}
          />
        </CardArtCanvas>
      </motion.div>

      {actionSlot && (
        <div
          className="absolute -right-1 -top-1 z-[80]"
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
        >
          {actionSlot}
        </div>
      )}
    </div>
  );
}
