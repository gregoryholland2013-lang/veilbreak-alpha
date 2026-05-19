import React from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Heart, Sparkles } from 'lucide-react';

const rarityStyles = {
  common: {
    border: 'border-slate-500/60',
    glow: '',
    label: 'bg-slate-700/60 text-slate-300',
    gradient: 'from-slate-800 to-slate-900',
    shine: false,
  },
  rare: {
    border: 'border-blue-400',
    glow: 'shadow-[0_0_14px_rgba(96,165,250,0.5)]',
    label: 'bg-blue-500/25 text-blue-300',
    gradient: 'from-blue-900/70 to-slate-900',
    shine: false,
  },
  epic: {
    border: 'border-purple-400',
    glow: 'shadow-[0_0_14px_rgba(192,132,252,0.6)]',
    label: 'bg-purple-500/25 text-purple-300',
    gradient: 'from-purple-900/70 to-slate-900',
    shine: false,
  },
  legendary: {
    border: 'border-yellow-400',
    glow: 'shadow-[0_0_18px_rgba(250,189,50,0.7)]',
    label: 'bg-yellow-500/25 text-yellow-300',
    gradient: 'from-amber-900/70 to-slate-900',
    shine: true,
  },
};

const elementIcons = { fire: '🔥', water: '💧', earth: '🌿', light: '✨', dark: '🌑' };
const elementBg   = {
  fire:  'bg-gradient-to-br from-red-900/80 to-orange-900/60',
  water: 'bg-gradient-to-br from-blue-900/80 to-cyan-900/60',
  earth: 'bg-gradient-to-br from-green-900/80 to-emerald-900/60',
  light: 'bg-gradient-to-br from-yellow-900/80 to-amber-900/60',
  dark:  'bg-gradient-to-br from-purple-900/80 to-slate-900/60',
};

export default function GameCard({ card, playerCard, onClick, size = 'md', showStats = true }) {
  const rarity = card?.rarity || 'common';
  const style  = rarityStyles[rarity];
  const level  = playerCard?.level || 1;
  const mult   = 1 + (level - 1) * 0.1;

  const sizeClasses = { sm: 'w-24 h-36', md: 'w-40 h-56', lg: 'w-52 h-72' };
  const artHeight   = { sm: 'h-[52%]', md: 'h-[55%]', lg: 'h-[57%]' };

  if (!card) return null;

  return (
    <motion.div
      whileHover={{ scale: 1.06, y: -6, transition: { duration: 0.18 } }}
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className={`relative ${sizeClasses[size]} rounded-xl overflow-hidden cursor-pointer
        border-2 ${style.border} ${style.glow} bg-gradient-to-b ${style.gradient} transition-all duration-300 select-none`}
    >
      {/* Legendary shine sweep */}
      {style.shine && (
        <motion.div
          animate={{ x: ['−100%', '220%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 1.5 }}
          className="absolute inset-0 z-20 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 pointer-events-none"
        />
      )}

      {/* Card Art */}
      <div className={`relative ${artHeight[size]} overflow-hidden`}>
        {card.image_url ? (
          <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
        ) : (
          <div className={`w-full h-full ${elementBg[card.element] || elementBg.dark} flex items-center justify-center`}>
            <motion.span
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ duration: 3, repeat: Infinity }}
              className="text-5xl drop-shadow-lg"
            >
              {elementIcons[card.element] || '⚔️'}
            </motion.span>
          </div>
        )}
        {/* Bottom fade */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Element badge */}
        <div className="absolute top-1.5 left-1.5 text-sm bg-black/50 backdrop-blur-sm rounded-full w-6 h-6 flex items-center justify-center leading-none">
          {elementIcons[card.element]}
        </div>
        {/* Level badge */}
        {playerCard && (
          <div className="absolute top-1.5 right-1.5 text-[9px] font-black bg-black/60 backdrop-blur-sm rounded-md px-1.5 py-0.5 text-primary font-display leading-none">
            Lv{level}
          </div>
        )}
        {/* Evolve stars */}
        {playerCard?.evolve_count > 0 && (
          <div className="absolute bottom-1 left-1 flex gap-0.5">
            {[...Array(playerCard.evolve_count)].map((_, i) => (
              <Sparkles key={i} className="w-2.5 h-2.5 text-primary" />
            ))}
          </div>
        )}
      </div>

      {/* Card Info */}
      <div className="px-2 pt-1.5 pb-2 flex flex-col gap-1">
        <h3 className="font-display text-[10px] font-bold truncate text-foreground leading-tight">{card.name}</h3>
        <span className={`text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full self-start ${style.label}`}>
          {rarity}
        </span>
        {showStats && (
          <div className="flex gap-2 text-[9px] mt-0.5">
            <span className="flex items-center gap-0.5 text-red-400 font-bold">
              <Sword className="w-2.5 h-2.5" />{Math.round(card.base_attack * mult)}
            </span>
            <span className="flex items-center gap-0.5 text-blue-400 font-bold">
              <Shield className="w-2.5 h-2.5" />{Math.round(card.base_defense * mult)}
            </span>
            <span className="flex items-center gap-0.5 text-green-400 font-bold">
              <Heart className="w-2.5 h-2.5" />{Math.round(card.base_hp * mult)}
            </span>
          </div>
        )}
      </div>

      {/* Rarity top edge glow line */}
      {rarity !== 'common' && (
        <div className={`absolute top-0 left-0 right-0 h-0.5 ${
          rarity === 'rare' ? 'bg-blue-400' : rarity === 'epic' ? 'bg-purple-400' : 'bg-yellow-400'
        } opacity-80`} />
      )}
    </motion.div>
  );
}