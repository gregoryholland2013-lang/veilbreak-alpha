import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Heart, Lock } from 'lucide-react';
import CardCanvas from '@/components/game/CardCanvas';
import {
  getCoreFormMeta,
  getVeilRankMeta,
  MAX_VEIL_MARKS,
} from '@/utils/cardCosmetics';

const CARD_SIZES = {
  sm: {
    outer: 'w-24',
    marks: 'sm',
    levelText: 'text-[8px]',
    formText: 'text-[8px]',
    statText: 'text-[8px]',
    statIcon: 'h-2.5 w-2.5',
  },
  md: {
    outer: 'w-40',
    marks: 'md',
    levelText: 'text-[9px]',
    formText: 'text-[9px]',
    statText: 'text-[10px]',
    statIcon: 'h-3 w-3',
  },
  lg: {
    outer: 'w-52',
    marks: 'lg',
    levelText: 'text-[10px]',
    formText: 'text-[10px]',
    statText: 'text-[11px]',
    statIcon: 'h-3.5 w-3.5',
  },
};

const OVERLAY_ZONES = {
  sm: {
    marks: { left: '5.0%', top: '4.6%' },
    level: { right: '5.6%', top: '17.0%' },
    form: { right: '5.7%', bottom: '18.8%' },
    protect: { right: '5.8%', top: '28.8%' },
  },
  md: {
    marks: { left: '5.1%', top: '4.6%' },
    level: { right: '5.5%', top: '16.8%' },
    form: { right: '5.7%', bottom: '18.8%' },
    protect: { right: '5.8%', top: '28.7%' },
  },
  lg: {
    marks: { left: '5.2%', top: '4.5%' },
    level: { right: '5.4%', top: '16.6%' },
    form: { right: '5.6%', bottom: '18.7%' },
    protect: { right: '5.7%', top: '28.6%' },
  },
};

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
      className={`flex items-center ${gap} rounded-full border border-white/10 bg-black/80 ${padding} shadow-lg backdrop-blur-md`}
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

function FormPill({ form, textClass }) {
  return (
    <div
      title={`Core Form: ${form.label}`}
      className={`rounded-full border border-primary/45 bg-black/85 px-2 py-1 ${textClass} font-display font-black leading-none text-primary shadow-lg backdrop-blur-md`}
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

  const cfg = CARD_SIZES[size] || CARD_SIZES.md;
  const zones = OVERLAY_ZONES[size] || OVERLAY_ZONES.md;
  const rank = getVeilRankMeta(card);
  const form = getCoreFormMeta(playerCard, card);
  const level = playerCard?.level || 1;
  const stats = getOwnedCardStats(playerCard, card);
  const isProtected = Boolean(playerCard?.is_protected);

  return (
    <div className={`relative ${cfg.outer}`}>
      <motion.div
        whileHover={{ scale: 1.03, y: -4, transition: { duration: 0.18 } }}
        whileTap={{ scale: 0.98 }}
        onClick={onClick}
        className={`relative cursor-pointer select-none ${rank.glow} transition-all duration-300`}
      >
        <CardCanvas card={card} playerCard={playerCard} size={size}>
          <div
            className="absolute z-50"
            style={{ left: zones.marks.left, top: zones.marks.top }}
          >
            <VeilMarks rank={rank} size={cfg.marks} />
          </div>

          {playerCard && (
            <div
              className={`absolute z-50 rounded-full border border-primary/45 bg-black/85 px-2 py-1 font-display font-black text-primary shadow-lg backdrop-blur-md ${cfg.levelText}`}
              style={{ right: zones.level.right, top: zones.level.top }}
            >
              Lv{level}
            </div>
          )}

          {isProtected && !actionSlot && showProtectionBadge && (
            <div
              className="absolute z-50 flex h-6 w-6 items-center justify-center rounded-full border border-primary/45 bg-black/85 shadow-lg backdrop-blur-md"
              style={{ right: zones.protect.right, top: zones.protect.top }}
            >
              <Lock className="h-3 w-3 text-primary" />
            </div>
          )}

          <div
            className="absolute z-50"
            style={{ right: zones.form.right, bottom: zones.form.bottom }}
          >
            <FormPill form={form} textClass={cfg.formText} />
          </div>

          {rank.shine && (
            <motion.div
              animate={{ x: ['-120%', '220%'] }}
              transition={{
                repeat: Infinity,
                duration: 3,
                ease: 'linear',
                repeatDelay: 1.6,
              }}
              className="pointer-events-none absolute inset-0 z-45 skew-x-12 bg-gradient-to-r from-transparent via-white/12 to-transparent"
            />
          )}

          <div
            className={`absolute left-0 right-0 top-0 z-40 h-0.5 ${rank.edge} opacity-80`}
          />
        </CardCanvas>

        {showStats && (
          <div
            className={`mt-1 flex items-center justify-center gap-2 font-bold ${cfg.statText}`}
          >
            <span className="flex items-center gap-0.5 text-red-400">
              <Sword className={cfg.statIcon} />
              {stats.attack}
            </span>

            <span className="flex items-center gap-0.5 text-blue-400">
              <Shield className={cfg.statIcon} />
              {stats.defense}
            </span>

            <span className="flex items-center gap-0.5 text-green-400">
              <Heart className={cfg.statIcon} />
              {stats.hp}
            </span>
          </div>
        )}
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
