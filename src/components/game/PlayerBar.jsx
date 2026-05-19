import React from 'react';
import { Coins, Gem, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlayerBar({ profile }) {
  if (!profile) return null;

  const xpForNext    = profile.level * 100;
  const xpPercent    = Math.min((profile.experience / xpForNext) * 100, 100);
  const staminaPercent = Math.min(((profile.stamina || 0) / (profile.max_stamina || 100)) * 100, 100);

  return (
    <div className="relative bg-gradient-to-r from-slate-900/95 via-card/95 to-slate-900/95 backdrop-blur-md border-b border-border/60 px-4 py-2">
      {/* Gold top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
      <div className="max-w-lg mx-auto flex items-center gap-3">

        {/* Level orb */}
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary/60 flex items-center justify-center flex-shrink-0 shadow-[0_0_10px_rgba(250,189,50,0.4)]">
          <span className="font-display font-black text-sm text-primary">{profile.level}</span>
        </div>

        {/* Name + XP bar */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-0.5">
            <p className="text-[11px] font-bold text-foreground truncate">{profile.display_name}</p>
            <p className="text-[9px] text-muted-foreground ml-1 flex-shrink-0">{Math.round(xpPercent)}%</p>
          </div>
          {/* XP bar */}
          <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary/80 to-yellow-400"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
          {/* Stamina bar */}
          <div className="h-1 bg-muted/30 rounded-full overflow-hidden mt-0.5">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-green-600 to-green-400"
              initial={{ width: 0 }}
              animate={{ width: `${staminaPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: 0.1 }}
            />
          </div>
        </div>

        {/* Resources */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex flex-col items-center bg-green-500/10 border border-green-500/20 rounded-lg px-2 py-0.5">
            <Zap className="w-3 h-3 text-green-400" />
            <span className="text-[10px] font-black text-green-300 leading-tight">{profile.stamina}</span>
          </div>
          <div className="flex flex-col items-center bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-0.5">
            <Coins className="w-3 h-3 text-yellow-400" />
            <span className="text-[10px] font-black text-yellow-300 leading-tight">{(profile.gold || 0).toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center bg-blue-500/10 border border-blue-500/20 rounded-lg px-2 py-0.5">
            <Gem className="w-3 h-3 text-blue-400" />
            <span className="text-[10px] font-black text-blue-300 leading-tight">{profile.gems || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}