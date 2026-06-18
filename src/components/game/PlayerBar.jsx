import React from 'react';
import { Coins, Gem, Zap, Sword, Shield, User } from 'lucide-react';
import { motion } from 'framer-motion';

function clampPercent(value) {
  const numberValue = Number(value || 0);
  return Math.max(0, Math.min(100, numberValue));
}

function formatCompact(value) {
  const numberValue = Number(value || 0);

  if (numberValue >= 1000000) {
    return `${(numberValue / 1000000).toFixed(1)}M`;
  }

  if (numberValue >= 10000) {
    return `${Math.round(numberValue / 1000)}K`;
  }

  return numberValue.toLocaleString();
}

function StatPill({
  icon: Icon,
  label,
  value,
  maxValue,
  colorClass,
  barClass,
  bgClass,
  borderClass,
}) {
  const current = Number(value || 0);
  const max = Number(maxValue || 100);
  const percent = max > 0 ? clampPercent((current / max) * 100) : 0;

  return (
    <div
      title={`${label}: ${current}/${max}`}
      className={`min-w-[72px] rounded-xl border ${borderClass} ${bgClass} px-2 py-1`}
    >
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
          <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>

        <span className={`text-[10px] font-black ${colorClass}`}>
          {current}
        </span>
      </div>

      <div className="mt-1 h-1 overflow-hidden rounded-full bg-black/35">
        <motion.div
          className={`h-full rounded-full ${barClass}`}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

function CurrencyPill({ icon: Icon, label, value, colorClass, bgClass, borderClass }) {
  return (
    <div
      title={`${label}: ${Number(value || 0).toLocaleString()}`}
      className={`flex min-w-[58px] items-center justify-center gap-1 rounded-xl border ${borderClass} ${bgClass} px-2 py-1`}
    >
      <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
      <span className={`text-[10px] font-black ${colorClass}`}>
        {formatCompact(value)}
      </span>
    </div>
  );
}

export default function PlayerBar({ profile, onProfileClick }) {
  if (!profile) return null;

  const level = Number(profile.level || 1);
  const experience = Number(profile.experience || 0);
  const xpForNext = Math.max(level * 100, 1);
  const xpPercent = clampPercent((experience / xpForNext) * 100);

  const stamina = Number(profile.stamina ?? 0);
  const maxStamina = Number(profile.max_stamina || 100);

  const attackEnergy = Number(profile.attack_energy ?? 0);
  const maxAttackEnergy = Number(profile.max_attack_energy || 100);

  const defenseEnergy = Number(profile.defense_energy ?? 0);
  const maxDefenseEnergy = Number(profile.max_defense_energy || 100);

  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-background/95 px-3 py-2 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
        <button
          type="button"
          onClick={onProfileClick}
          className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/55 bg-primary/10 shadow-[0_0_18px_rgba(250,189,50,0.22)] transition-all hover:bg-primary/15"
          aria-label="Open profile"
          title="Open profile"
        >
          <User className="h-5 w-5 text-primary" />

          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-primary/60 bg-background px-1 font-display text-[10px] font-black text-primary">
            {level}
          </span>
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-foreground">
                {profile.display_name || 'Adventurer'}
              </p>

              <p className="truncate text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Lv. {level}
                {profile.faction ? ` · ${profile.faction}` : ''}
              </p>
            </div>

            <p className="shrink-0 text-[9px] font-black text-primary">
              {Math.round(xpPercent)}%
            </p>
          </div>

          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted/45">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-primary via-yellow-300 to-emerald-300"
              initial={{ width: 0 }}
              animate={{ width: `${xpPercent}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            />
          </div>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <StatPill
            icon={Zap}
            label="STA"
            value={stamina}
            maxValue={maxStamina}
            colorClass="text-emerald-300"
            barClass="bg-emerald-300"
            bgClass="bg-emerald-500/10"
            borderClass="border-emerald-400/25"
          />

          <StatPill
            icon={Sword}
            label="ATK"
            value={attackEnergy}
            maxValue={maxAttackEnergy}
            colorClass="text-red-300"
            barClass="bg-red-300"
            bgClass="bg-red-500/10"
            borderClass="border-red-400/25"
          />

          <StatPill
            icon={Shield}
            label="DEF"
            value={defenseEnergy}
            maxValue={maxDefenseEnergy}
            colorClass="text-blue-300"
            barClass="bg-blue-300"
            bgClass="bg-blue-500/10"
            borderClass="border-blue-400/25"
          />

          <CurrencyPill
            icon={Coins}
            label="Gold"
            value={profile.gold}
            colorClass="text-yellow-300"
            bgClass="bg-yellow-500/10"
            borderClass="border-yellow-400/25"
          />

          <CurrencyPill
            icon={Gem}
            label="Gems"
            value={profile.gems}
            colorClass="text-cyan-300"
            bgClass="bg-cyan-500/10"
            borderClass="border-cyan-400/25"
          />
        </div>
      </div>

      <div className="mx-auto mt-2 grid w-full max-w-5xl grid-cols-3 gap-2 md:hidden">
        <StatPill
          icon={Zap}
          label="STA"
          value={stamina}
          maxValue={maxStamina}
          colorClass="text-emerald-300"
          barClass="bg-emerald-300"
          bgClass="bg-emerald-500/10"
          borderClass="border-emerald-400/25"
        />

        <StatPill
          icon={Sword}
          label="ATK"
          value={attackEnergy}
          maxValue={maxAttackEnergy}
          colorClass="text-red-300"
          barClass="bg-red-300"
          bgClass="bg-red-500/10"
          borderClass="border-red-400/25"
        />

        <StatPill
          icon={Shield}
          label="DEF"
          value={defenseEnergy}
          maxValue={maxDefenseEnergy}
          colorClass="text-blue-300"
          barClass="bg-blue-300"
          bgClass="bg-blue-500/10"
          borderClass="border-blue-400/25"
        />
      </div>

      <div className="mx-auto mt-2 grid w-full max-w-5xl grid-cols-2 gap-2 md:hidden">
        <CurrencyPill
          icon={Coins}
          label="Gold"
          value={profile.gold}
          colorClass="text-yellow-300"
          bgClass="bg-yellow-500/10"
          borderClass="border-yellow-400/25"
        />

        <CurrencyPill
          icon={Gem}
          label="Gems"
          value={profile.gems}
          colorClass="text-cyan-300"
          bgClass="bg-cyan-500/10"
          borderClass="border-cyan-400/25"
        />
      </div>
    </header>
  );
}
