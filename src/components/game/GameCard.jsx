import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Heart, Sparkles } from 'lucide-react';

const rarityStyles = {
  common: {
    border: 'border-slate-500/60',
    glow: '',
    label: 'bg-slate-700/60 text-slate-300',
    gradient: 'from-slate-800 to-slate-900',
    edge: 'bg-slate-400',
    shine: false,
  },
  normal: {
    border: 'border-slate-500/60',
    glow: '',
    label: 'bg-slate-700/60 text-slate-300',
    gradient: 'from-slate-800 to-slate-900',
    edge: 'bg-slate-400',
    shine: false,
  },
  high_normal: {
    border: 'border-slate-400',
    glow: 'shadow-[0_0_10px_rgba(148,163,184,0.35)]',
    label: 'bg-slate-500/25 text-slate-200',
    gradient: 'from-slate-700 to-slate-900',
    edge: 'bg-slate-300',
    shine: false,
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-[0_0_14px_rgba(96,165,250,0.5)]',
    label: 'bg-blue-500/25 text-blue-300',
    gradient: 'from-blue-900/70 to-slate-900',
    edge: 'bg-blue-400',
    shine: false,
  },
  super_rare: {
    border: 'border-purple-400',
    glow: 'shadow-[0_0_14px_rgba(192,132,252,0.55)]',
    label: 'bg-purple-500/25 text-purple-300',
    gradient: 'from-purple-900/70 to-slate-900',
    edge: 'bg-purple-400',
    shine: false,
  },
  super_super_rare: {
    border: 'border-fuchsia-400',
    glow: 'shadow-[0_0_16px_rgba(232,121,249,0.6)]',
    label: 'bg-fuchsia-500/25 text-fuchsia-300',
    gradient: 'from-fuchsia-900/70 to-slate-900',
    edge: 'bg-fuchsia-400',
    shine: false,
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-[0_0_14px_rgba(192,132,252,0.6)]',
    label: 'bg-purple-500/25 text-purple-300',
    gradient: 'from-purple-900/70 to-slate-900',
    edge: 'bg-purple-400',
    shine: false,
  },
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-[0_0_18px_rgba(250,189,50,0.7)]',
    label: 'bg-yellow-500/25 text-yellow-300',
    gradient: 'from-amber-900/70 to-slate-900',
    edge: 'bg-yellow-400',
    shine: true,
  },
  ultra_rare: {
    border: 'border-orange-400',
    glow: 'shadow-[0_0_18px_rgba(251,146,60,0.65)]',
    label: 'bg-orange-500/25 text-orange-300',
    gradient: 'from-orange-900/70 to-slate-900',
    edge: 'bg-orange-400',
    shine: true,
  },
  ascended: {
    border: 'border-yellow-300',
    glow: 'shadow-[0_0_20px_rgba(253,224,71,0.7)]',
    label: 'bg-yellow-400/25 text-yellow-200',
    gradient: 'from-yellow-900/70 to-slate-900',
    edge: 'bg-yellow-300',
    shine: true,
  },
  exalted: {
    border: 'border-amber-300',
    glow: 'shadow-[0_0_22px_rgba(252,211,77,0.75)]',
    label: 'bg-amber-400/25 text-amber-200',
    gradient: 'from-amber-900/80 to-slate-900',
    edge: 'bg-amber-300',
    shine: true,
  },
  paragon: {
    border: 'border-cyan-300',
    glow: 'shadow-[0_0_22px_rgba(103,232,249,0.75)]',
    label: 'bg-cyan-400/25 text-cyan-200',
    gradient: 'from-cyan-900/80 to-slate-900',
    edge: 'bg-cyan-300',
    shine: true,
  },
  mythic: {
    border: 'border-pink-400',
    glow: 'shadow-[0_0_24px_rgba(244,114,182,0.75)]',
    label: 'bg-pink-500/25 text-pink-300',
    gradient: 'from-pink-900/80 to-slate-900',
    edge: 'bg-pink-400',
    shine: true,
  },
  transcendent: {
    border: 'border-indigo-300',
    glow: 'shadow-[0_0_24px_rgba(165,180,252,0.75)]',
    label: 'bg-indigo-400/25 text-indigo-200',
    gradient: 'from-indigo-900/80 to-slate-900',
    edge: 'bg-indigo-300',
    shine: true,
  },
  eclipse: {
    border: 'border-violet-300',
    glow: 'shadow-[0_0_26px_rgba(196,181,253,0.8)]',
    label: 'bg-violet-500/25 text-violet-200',
    gradient: 'from-violet-950/90 to-slate-950',
    edge: 'bg-violet-300',
    shine: true,
  },
  singularity: {
    border: 'border-primary',
    glow: 'shadow-[0_0_30px_rgba(250,189,50,0.85)]',
    label: 'bg-primary/25 text-primary',
    gradient: 'from-primary/30 to-slate-950',
    edge: 'bg-primary',
    shine: true,
  },
};

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
};

const elementBg = {
  fire: 'bg-gradient-to-br from-red-900/80 to-orange-900/60',
  water: 'bg-gradient-to-br from-blue-900/80 to-cyan-900/60',
  earth: 'bg-gradient-to-br from-green-900/80 to-emerald-900/60',
  light: 'bg-gradient-to-br from-yellow-900/80 to-amber-900/60',
  dark: 'bg-gradient-to-br from-purple-900/80 to-slate-900/60',
  lightning: 'bg-gradient-to-br from-yellow-900/80 to-blue-900/60',
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

function getStageLabel(playerCard) {
  const count = Number(playerCard?.evolve_count || 0);

  if (count >= 3) return 'Final';
  if (count === 2) return 'Base++';
  if (count === 1) return 'Base+';

  return null;
}

export default function GameCard({
  card,
  playerCard,
  onClick,
  size = 'md',
  showStats = true,
}) {
  if (!card) return null;

  const rarity = card?.rarity || 'common';
  const style = rarityStyles[rarity] || rarityStyles.common;
  const level = playerCard?.level || 1;
  const stats = getOwnedCardStats(playerCard, card);
  const stageLabel = getStageLabel(playerCard);

  const sizeClasses = {
    sm: 'w-24 h-36',
    md: 'w-40 h-56',
    lg: 'w-52 h-72',
  };

  const artHeight = {
    sm: 'h-[52%]',
    md: 'h-[55%]',
    lg: 'h-[57%]',
  };

  const statTextSize = {
    sm: 'text-[8px]',
    md: 'text-[9px]',
    lg: 'text-[10px]',
  };

  return (
    <motion.div
      whileHover={{ scale: 1.06, y: -6, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative ${sizeClasses[size] || sizeClasses.md} rounded-xl overflow-hidden cursor-pointer
        border-2 ${style.border} ${style.glow} bg-gradient-to-b ${style.gradient} transition-all duration-300 select-none`}
    >
      {style.shine && (
        <motion.div
          animate={{ x: ['-100%', '220%'] }}
          transition={{
            repeat: Infinity,
            duration: 3,
            ease: 'linear',
            repeatDelay: 1.5,
          }}
          className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
        />
      )}

      <div className={`relative ${artHeight[size] || artHeight.md} overflow-hidden`}>
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full ${
              elementBg[card.element] || elementBg.dark
            } flex items-center justify-center`}
          >
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-5xl drop-shadow-lg"
            >
              {elementIcons[card.element] || '⚔️'}
            </motion.span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/70 to-transparent" />

        <div className="absolute top-1.5 left-1.5 text-sm bg-black/50 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center leading-none">
          {elementIcons[card.element] || '⚔️'}
        </div>

        {playerCard && (
          <div className="absolute top-1.5 right-1.5 text-[9px] font-black bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-primary font-display leading-none">
            Lv{level}
          </div>
        )}

        {stageLabel && (
          <div className="absolute bottom-1 right-1 text-[8px] font-black bg-primary/80 text-primary-foreground rounded-md px-1 py-0.5 font-display leading-none">
            {stageLabel}
          </div>
        )}

        {playerCard?.evolve_count > 0 && (
          <div className="absolute bottom-1 left-1 flex gap-0.5">
            {Array.from({ length: Math.min(Number(playerCard.evolve_count), 3) }).map(
              (_, i) => (
                <Sparkles key={i} className="w-2.5 h-2.5 text-primary" />
              )
            )}
          </div>
        )}
      </div>

      <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1">
        <h3 className="font-display text-[10px] font-bold truncate text-foreground leading-tight">
          {card.name}
        </h3>

        <span
          className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full self-start ${style.label}`}
        >
          {rarity.replaceAll('_', ' ')}
        </span>

        {showStats && (
          <div className={`flex gap-1.5 ${statTextSize[size] || statTextSize.md} mt-0.5 flex-wrap`}>
            <span className="flex items-center gap-0.5 text-red-400 font-bold">
              <Sword className="w-2.5 h-2.5" />
              {stats.attack}
            </span>

            <span className="flex items-center gap-0.5 text-blue-400 font-bold">
              <Shield className="w-2.5 h-2.5" />
              {stats.defense}
            </span>

            <span className="flex items-center gap-0.5 text-green-400 font-bold">
              <Heart className="w-2.5 h-2.5" />
              {stats.hp}
            </span>
          </div>
        )}
      </div>

      {rarity !== 'common' && (
        <div
          className={`absolute top-0 left-0 right-0 h-0.5 ${style.edge} opacity-80`}
        />
      )}
    </motion.div>
  );
}