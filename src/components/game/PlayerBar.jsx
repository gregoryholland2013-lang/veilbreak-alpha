import React from 'react';
import { Coins, Gem, Zap, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

function formatNumber(value) {
  const num = Number(value || 0);

  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 10000) return `${Math.round(num / 1000)}K`;

  return num.toLocaleString();
}

export default function PlayerBar({ profile, onProfileClick }) {
  if (!profile) return null;

  const level = Number(profile.level || 1);
  const xpForNext = level * 100;
  const xpPercent = Math.min(
    ((Number(profile.experience || 0) / xpForNext) * 100) || 0,
    100
  );

  const stamina = Number(profile.stamina || 0);
  const maxStamina = Number(profile.max_stamina || 100);
  const staminaPercent = Math.min((stamina / maxStamina) * 100, 100);

  return (
    <header className="sticky top-0 z-40 border-b border-primary/10 bg-[#080b14]/92 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent" />

      <div className="mx-auto flex max-w-lg items-center gap-3 px-3 py-2">
        <button
          type="button"
          onClick={onProfileClick}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/45 bg-gradient-to-br from-primary/25 via-primary/10 to-transparent shadow-[0_0_18px_rgba(250,189,50,0.22)] transition-all hover:scale-[1.03] hover:border-primary/70 hover:bg-primary/20"
          aria-label="Open player profile"
        >
          <div className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-primary/50 bg-background text-[10px] font-black text-primary">
            {level}
          </div>

          <UserRound className="h-5 w-5 text-primary" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-end justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[12px] font-black leading-none text-foreground">
                {profile.display_name || 'Adventurer'}
              </p>

              <p className="mt-0.5 truncate text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
                Lv. {level}
                {profile.faction ? ` · ${profile.faction}` : ''}
              </p>
            </div>

            <p className="shrink-0 text-[10px] font-bold text-primary">
              {Math.round(xpPercent)}%
            </p>
          </div>

          <div className="space-y-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted/45">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-primary/75 via-yellow-300 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${xpPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </div>

            <div className="h-1 overflow-hidden rounded-full bg-muted/35">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 via-green-400 to-emerald-300"
                initial={{ width: 0 }}
                animate={{ width: `${staminaPercent}%` }}
                transition={{ duration: 0.6, ease: 'easeOut', delay: 0.08 }}
              />
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <div className="min-w-[42px] rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-center">
            <Zap className="mx-auto h-3 w-3 text-emerald-300" />
            <p className="mt-0.5 text-[10px] font-black leading-none text-emerald-200">
              {formatNumber(stamina)}
            </p>
          </div>

          <div className="min-w-[46px] rounded-xl border border-yellow-400/20 bg-yellow-400/10 px-2 py-1 text-center">
            <Coins className="mx-auto h-3 w-3 text-yellow-300" />
            <p className="mt-0.5 text-[10px] font-black leading-none text-yellow-200">
              {formatNumber(profile.gold)}
            </p>
          </div>

          <div className="min-w-[46px] rounded-xl border border-blue-400/20 bg-blue-400/10 px-2 py-1 text-center">
            <Gem className="mx-auto h-3 w-3 text-blue-300" />
            <p className="mt-0.5 text-[10px] font-black leading-none text-blue-200">
              {formatNumber(profile.gems)}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}