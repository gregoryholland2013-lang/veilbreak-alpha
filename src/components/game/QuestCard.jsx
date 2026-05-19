import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Zap, Coins, Gem, Skull, Sparkles, ChevronDown } from 'lucide-react';

const difficultyConfig = {
  easy:   { label: 'Easy',   gradient: 'from-green-900/60 to-emerald-950/80',  border: 'border-green-500/40', badge: 'bg-green-500/20 text-green-300', glow: '', icon: '🌿', accent: 'text-green-300' },
  medium: { label: 'Medium', gradient: 'from-blue-900/60 to-blue-950/80',      border: 'border-blue-500/40',  badge: 'bg-blue-500/20 text-blue-300',   glow: '', icon: '⚔️', accent: 'text-blue-300' },
  hard:   { label: 'Hard',   gradient: 'from-purple-900/60 to-purple-950/80',  border: 'border-purple-500/40', badge: 'bg-purple-500/20 text-purple-300', glow: 'glow-purple', icon: '🗡️', accent: 'text-purple-300' },
  boss:   { label: 'BOSS',   gradient: 'from-amber-900/60 to-red-950/80',      border: 'border-primary/60',   badge: 'bg-primary/20 text-primary',     glow: 'glow-gold',   icon: '💀', accent: 'text-primary' },
};

const enemyArt = {
  easy:   ['🧌', '🐺', '🦎', '🐗', '🦂'],
  medium: ['🧟', '🐲', '🦅', '🦁', '🐙'],
  hard:   ['🧙', '🧜', '🦄', '🐉', '👹'],
  boss:   ['💀', '☠️', '👿', '🔥', '⚡'],
};

function getEnemyEmoji(quest) {
  const pool = enemyArt[quest.difficulty] || enemyArt.easy;
  const idx = (quest.quest_order || 0) % pool.length;
  return pool[idx];
}

export default function QuestCard({ quest, profile, onStart }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = difficultyConfig[quest.difficulty] || difficultyConfig.easy;
  const canAfford = profile && profile.stamina >= quest.stamina_cost;
  const enemyEmoji = getEnemyEmoji(quest);

  return (
    <motion.div
      layout
      className={`relative overflow-hidden rounded-2xl border ${cfg.border} ${cfg.glow} cursor-pointer`}
      onClick={() => setExpanded(e => !e)}
      whileHover={{ scale: 1.015 }}
      transition={{ duration: 0.15 }}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-r ${cfg.gradient}`} />

      {/* Animated shimmer for boss */}
      {quest.is_boss && (
        <motion.div
          animate={{ x: ['-100%', '200%'] }}
          transition={{ repeat: Infinity, duration: 3, ease: 'linear', repeatDelay: 1.5 }}
          className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent skew-x-12 pointer-events-none"
        />
      )}

      {/* Content row */}
      <div className="relative flex items-center gap-3 p-3.5">
        {/* Enemy art */}
        <motion.div
          animate={quest.is_boss ? { scale: [1, 1.1, 1] } : {}}
          transition={{ duration: 2, repeat: Infinity }}
          className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-3xl
            bg-black/30 border ${cfg.border} backdrop-blur-sm`}
        >
          {enemyEmoji}
        </motion.div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.badge}`}>
              {cfg.label}
            </span>
            <h3 className={`font-display font-bold text-sm truncate ${quest.is_boss ? 'text-primary' : 'text-foreground'}`}>
              {quest.name}
            </h3>
          </div>

          {/* Enemy name if present */}
          {quest.enemy_name && (
            <p className={`text-[10px] font-semibold ${cfg.accent} mb-1`}>vs {quest.enemy_name}</p>
          )}

          {/* Reward pills */}
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <span className="flex items-center gap-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-md px-1.5 py-0.5 text-yellow-400 font-bold">
              <Coins className="w-2.5 h-2.5" />{quest.gold_reward_min}–{quest.gold_reward_max}
            </span>
            {quest.gem_reward > 0 && (
              <span className="flex items-center gap-0.5 bg-blue-500/10 border border-blue-500/30 rounded-md px-1.5 py-0.5 text-blue-400 font-bold">
                <Gem className="w-2.5 h-2.5" />{quest.gem_reward}
              </span>
            )}
            {quest.skill_shard_reward > 0 && (
              <span className="flex items-center gap-0.5 bg-purple-500/10 border border-purple-500/30 rounded-md px-1.5 py-0.5 text-purple-400 font-bold">
                <Sparkles className="w-2.5 h-2.5" />{quest.skill_shard_reward}
              </span>
            )}
            {quest.fodder_reward > 0 && (
              <span className="bg-orange-500/10 border border-orange-500/30 rounded-md px-1.5 py-0.5 text-orange-400 font-bold">
                🃏×{quest.fodder_reward}
              </span>
            )}
            <span className="bg-cyan-500/10 border border-cyan-500/30 rounded-md px-1.5 py-0.5 text-cyan-400 font-bold">
              ✨{quest.xp_reward}xp
            </span>
          </div>
        </div>

        {/* Right side: start button + expand chevron */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
          <Button
            size="sm"
            onClick={e => { e.stopPropagation(); onStart(); }}
            disabled={!canAfford}
            className={`gap-1 h-9 font-bold ${quest.is_boss
              ? 'bg-gradient-to-r from-primary to-yellow-500 text-primary-foreground hover:opacity-90 shadow-lg'
              : canAfford ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'opacity-50'}`}
            variant={quest.is_boss ? 'default' : 'ghost'}
          >
            <Zap className="w-3.5 h-3.5" />
            {quest.stamina_cost}
          </Button>
          <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Expanded detail */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="relative border-t border-white/10 px-4 py-3 space-y-2">
              {quest.description && (
                <p className="text-xs text-muted-foreground leading-relaxed italic">"{quest.description}"</p>
              )}
              {quest.flavor_text && (
                <p className="text-[10px] text-muted-foreground/70 leading-relaxed">{quest.flavor_text}</p>
              )}
              {quest.enemy_power && (
                <p className="text-[10px] text-red-400">Enemy Power: <span className="font-bold">{quest.enemy_power}</span></p>
              )}
              {!canAfford && (
                <p className="text-[10px] text-red-400 font-semibold">⚡ Need {quest.stamina_cost} stamina (have {profile?.stamina || 0})</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}