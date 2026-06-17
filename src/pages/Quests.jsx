import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Crown,
  Droplets,
  Gem,
  Gift,
  Lock,
  Map as MapIcon,
  RefreshCcw,
  ScrollText,
  Shield,
  Sparkles,
  Star,
  Swords,
  Ticket,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

const QUEST_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

const NODE_META = {
  story: {
    icon: ScrollText,
    emoji: '📜',
    label: 'Story',
    border: 'border-blue-400/40',
    bg: 'bg-blue-500/10',
    text: 'text-blue-200',
  },
  battle: {
    icon: Swords,
    emoji: '⚔️',
    label: 'Battle',
    border: 'border-red-400/40',
    bg: 'bg-red-500/10',
    text: 'text-red-200',
  },
  choice: {
    icon: MapIcon,
    emoji: '🧭',
    label: 'Choice',
    border: 'border-purple-400/40',
    bg: 'bg-purple-500/10',
    text: 'text-purple-200',
  },
  treasure: {
    icon: Gem,
    emoji: '💠',
    label: 'Treasure',
    border: 'border-cyan-400/40',
    bg: 'bg-cyan-500/10',
    text: 'text-cyan-200',
  },
  boss: {
    icon: Crown,
    emoji: '👑',
    label: 'Boss',
    border: 'border-yellow-400/50',
    bg: 'bg-yellow-500/10',
    text: 'text-yellow-200',
  },
  milestone: {
    icon: Trophy,
    emoji: '🏆',
    label: 'Milestone',
    border: 'border-primary/50',
    bg: 'bg-primary/10',
    text: 'text-primary',
  },
  event: {
    icon: Sparkles,
    emoji: '✨',
    label: 'Event',
    border: 'border-fuchsia-400/50',
    bg: 'bg-fuchsia-500/10',
    text: 'text-fuchsia-200',
  },
};

function numberText(value) {
  return Number(value || 0).toLocaleString();
}

function getRewardValue(rewards, key) {
  return Number(rewards?.[key] || 0);
}

function hasAnyReward(rewards) {
  if (!rewards) return false;

  return [
    'gold',
    'xp',
    'stamina',
    'summon_tickets',
    'aether_dust',
    'spirit_water',
    'vessel_cards',
  ].some((key) => Number(rewards[key] || 0) > 0);
}

function RewardPill({ icon: Icon, label, value, soft = false }) {
  if (!value || Number(value) <= 0) return null;

  return (
    <div
      className={`rounded-xl border px-3 py-2 text-xs ${
        soft
          ? 'border-border bg-background/50'
          : 'border-primary/30 bg-primary/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <span className="text-muted-foreground">{label}</span>
      </div>
      <p className="font-display text-sm font-black text-foreground mt-1">
        +{numberText(value)}
      </p>
    </div>
  );
}

function RewardGrid({ rewards, soft = false }) {
  if (!hasAnyReward(rewards)) {
    return (
      <p className="text-xs text-muted-foreground">
        No bonus reward rolled this time.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      <RewardPill
        icon={CircleDollarSign}
        label="Gold"
        value={getRewardValue(rewards, 'gold')}
        soft={soft}
      />
      <RewardPill
        icon={Star}
        label="XP"
        value={getRewardValue(rewards, 'xp')}
        soft={soft}
      />
      <RewardPill
        icon={Zap}
        label="Stamina"
        value={getRewardValue(rewards, 'stamina')}
        soft={soft}
      />
      <RewardPill
        icon={Ticket}
        label="Summon Tickets"
        value={getRewardValue(rewards, 'summon_tickets')}
        soft={soft}
      />
      <RewardPill
        icon={Sparkles}
        label="Aether Dust"
        value={getRewardValue(rewards, 'aether_dust')}
        soft={soft}
      />
      <RewardPill
        icon={Droplets}
        label="Spirit Water"
        value={getRewardValue(rewards, 'spirit_water')}
        soft={soft}
      />
      <RewardPill
        icon={Gift}
        label="Vessel Cards"
        value={getRewardValue(rewards, 'vessel_cards')}
        soft={soft}
      />
    </div>
  );
}

function prettyKey(value) {
  return String(value || 'Bonus Reward')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getEnemyData(node) {
  const enemy = node?.enemy_data || {};

  return {
    name: enemy.name || node?.title || 'Veil Threat',
    attack: Number(enemy.attack || (node?.node_type === 'boss' ? 55 : 24)),
    defense: Number(enemy.defense || (node?.node_type === 'boss' ? 42 : 18)),
    hp: Number(enemy.hp || (node?.node_type === 'boss' ? 520 : 180)),
    description:
      enemy.description ||
      node?.story_text ||
      'A hostile signal blocks the expedition path.',
  };
}

function getHpPercent(current, max) {
  return Math.max(
    0,
    Math.min(100, Math.floor((Number(current || 0) / Number(max || 1)) * 100))
  );
}

function getRemainingMinutesFrom(startIso, minutesToAdd) {
  if (!startIso || !minutesToAdd || Number(minutesToAdd) <= 0) return 0;

  const startTime = new Date(startIso).getTime();
  if (Number.isNaN(startTime)) return 0;

  const targetTime = startTime + Number(minutesToAdd) * 60 * 1000;
  return Math.max(0, Math.ceil((targetTime - Date.now()) / 60000));
}

function AwardedCardGrid({ cards = [] }) {
  if (!cards.length) return null;

  return (
    <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3">
      <p className="text-xs font-bold text-yellow-200 uppercase tracking-wider">
        Card Collected
      </p>

      <div className="mt-3 grid grid-cols-1 gap-3">
        {cards.map((card, index) => (
          <div
            key={`${card.card_id || card.name || 'card'}-${index}`}
            className="rounded-2xl border border-yellow-400/30 bg-background/60 p-3 flex gap-3 items-center"
          >
            <div className="w-16 h-20 rounded-xl border border-border bg-muted overflow-hidden flex-shrink-0">
              {card.image_url ? (
                <img
                  src={card.image_url}
                  alt={card.name || 'Vessel Card'}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gift className="w-7 h-7 text-yellow-300" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-display font-black text-primary truncate">
                {card.name || 'Vessel Card'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {card.rarity || 'Vessel'}
                {card.faction ? ` · ${card.faction}` : ''}
              </p>
              <p className="text-[11px] text-yellow-100/80 mt-2">
                Added to your collection as a normal card.
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuestActionModal({
  node,
  open,
  onClose,
  onComplete,
  onSpawnBoss,
  onAttackBoss,
  processing,
  stamina,
  attackEnergy,
  activeBoss,
  spawning,
  attacking,
  lastBossAction,
}) {
  const [selectedApproach, setSelectedApproach] = useState('balanced');

  useEffect(() => {
    if (node?.id) setSelectedApproach('balanced');
  }, [node?.id]);

  if (!open || !node) return null;

  const meta = NODE_META[node.node_type] || NODE_META.story;
  const Icon = meta.icon;
  const isBoss = node.node_type === 'boss';
  const isBattle = node.node_type === 'battle';
  const isCombat = isBoss || isBattle;
  const enemy = getEnemyData(node);
  const bossMaxHp = Number(activeBoss?.max_hp || enemy.hp || 1);
  const bossCurrentHp = Number(activeBoss?.current_hp ?? bossMaxHp);
  const bossHpPercent = getHpPercent(bossCurrentHp, bossMaxHp);
  const bossAttackCost = Number(activeBoss?.attack_energy_cost || enemy.attack_energy_cost || 5);
  const canSpawnBoss = Number(stamina || 0) >= Number(node.stamina_cost || 0);
  const canAttackBoss = Number(attackEnergy || 0) >= bossAttackCost;
  const canStart = Number(stamina || 0) >= Number(node.stamina_cost || 0);

  const previewDamage = Math.max(
    1,
    Math.floor(enemy.hp * (isBoss ? 0.32 : 0.55))
  );
  const hpAfterPreview = Math.max(0, enemy.hp - previewDamage);
  const hpPercent = getHpPercent(hpAfterPreview, enemy.hp);

  const approachOptions = [
    {
      key: 'balanced',
      title: 'Balanced Push',
      description: 'Move through the node safely and keep the route stable.',
      icon: '🧭',
    },
    {
      key: 'search',
      title: 'Search the Area',
      description: 'Look for hidden caches, signal traces, or faction clues.',
      icon: '💠',
    },
    {
      key: 'force',
      title: 'Force the Path',
      description: 'Break through quickly and let your deck carry the risk.',
      icon: '⚔️',
    },
  ];

  if (isBoss) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-3xl rounded-3xl border border-yellow-400/40 shadow-2xl overflow-hidden bg-card max-h-[92vh] overflow-y-auto"
        >
          <div className="relative p-5 md:p-6 border-b border-yellow-400/20 bg-yellow-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-transparent to-red-500/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 uppercase tracking-[0.25em] text-xs font-bold text-yellow-300">
                  <Crown className="w-4 h-4" />
                  Quest Boss Encounter
                </div>

                <h2 className="font-display text-3xl md:text-5xl font-black text-primary mt-3">
                  {activeBoss?.boss_name || enemy.name}
                </h2>

                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {enemy.description}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={processing || spawning || attacking}
                className="rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            {!activeBoss ? (
              <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-5 text-center">
                <div className="text-5xl mb-3">👑</div>
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                  Boss Dormant
                </p>
                <h3 className="font-display text-2xl font-black text-primary mt-2">
                  Awaken {enemy.name}
                </h3>
                <p className="text-sm text-muted-foreground mt-2 max-w-xl mx-auto">
                  Spend stamina to trigger this boss encounter. Rewards will not be paid until the monster is defeated.
                </p>

                <div className="mt-5 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-border bg-background/60 p-3">
                    <Swords className="w-4 h-4 text-red-300 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase">Attack</p>
                    <p className="font-display font-black">{numberText(enemy.attack)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-3">
                    <Shield className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase">Defense</p>
                    <p className="font-display font-black">{numberText(enemy.defense)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-3">
                    <Zap className="w-4 h-4 text-green-300 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase">HP</p>
                    <p className="font-display font-black">{numberText(enemy.hp)}</p>
                  </div>
                </div>

                {!canSpawnBoss && (
                  <div className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    Not enough stamina to awaken this boss.
                  </div>
                )}

                <Button
                  disabled={spawning || !canSpawnBoss}
                  onClick={() => onSpawnBoss(node)}
                  className="w-full h-14 text-base font-black gap-2 mt-5 bg-yellow-400 hover:bg-yellow-300 text-black"
                >
                  {spawning ? 'Awakening Boss...' : `Awaken Boss - ${numberText(node.stamina_cost)} Stamina`}
                  {!spawning && <ChevronRight className="w-5 h-5" />}
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-3xl border border-yellow-400/30 bg-yellow-500/10 p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                        Active Monster
                      </p>
                      <h3 className="font-display text-2xl font-black text-primary mt-1">
                        {activeBoss.boss_name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Attacks: {numberText(activeBoss.attacks_count)} · Damage Dealt: {numberText(activeBoss.total_damage_dealt)}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-yellow-400/30 bg-background/60 px-4 py-3 text-center">
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Attack Cost
                      </p>
                      <p className="font-display text-xl font-black text-yellow-200">
                        {numberText(bossAttackCost)} ATK
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Boss HP</span>
                      <span className="font-bold">
                        {numberText(bossCurrentHp)} / {numberText(bossMaxHp)}
                      </span>
                    </div>

                    <div className="h-5 rounded-full bg-muted overflow-hidden border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all"
                        style={{ width: `${bossHpPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {lastBossAction && String(lastBossAction.boss_id) === String(activeBoss.id) && (
                  <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-200">
                      Last Attack
                    </p>
                    <p className="font-display text-lg font-black mt-1">
                      {lastBossAction.crit ? 'Critical hit! ' : ''}
                      {numberText(lastBossAction.damage)} damage dealt
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Deck Power: {numberText(lastBossAction.deck_power)} · Attack Energy Spent: {numberText(lastBossAction.attack_energy_spent)}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-2xl border border-border bg-background/60 p-3">
                    <Swords className="w-4 h-4 text-red-300 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase">Attack</p>
                    <p className="font-display font-black">{numberText(activeBoss.attack)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-3">
                    <Shield className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase">Defense</p>
                    <p className="font-display font-black">{numberText(activeBoss.defense)}</p>
                  </div>
                  <div className="rounded-2xl border border-border bg-background/60 p-3">
                    <Zap className="w-4 h-4 text-green-300 mx-auto mb-1" />
                    <p className="text-[10px] text-muted-foreground uppercase">Your ATK</p>
                    <p className="font-display font-black">{numberText(attackEnergy)}</p>
                  </div>
                </div>

                {!canAttackBoss && (
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                    Not enough attack energy to attack this boss.
                  </div>
                )}

                <Button
                  disabled={attacking || !canAttackBoss}
                  onClick={() => onAttackBoss(activeBoss)}
                  className="w-full h-14 text-base font-black gap-2 bg-yellow-400 hover:bg-yellow-300 text-black"
                >
                  {attacking ? 'Attacking Boss...' : `Attack Boss - ${numberText(bossAttackCost)} ATK`}
                  {!attacking && <ChevronRight className="w-5 h-5" />}
                </Button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  if (isBattle) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-2xl rounded-3xl border border-red-400/40 shadow-2xl overflow-hidden bg-card"
        >
          <div className="relative p-5 md:p-6 border-b border-red-400/20 bg-red-500/10">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-red-500/10" />
            <div className="relative flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 uppercase tracking-[0.25em] text-xs font-bold text-red-300">
                  <Swords className="w-4 h-4" />
                  Battle Encounter
                </div>

                <h2 className="font-display text-3xl md:text-4xl font-black text-primary mt-3">
                  {enemy.name}
                </h2>

                <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                  {enemy.description}
                </p>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={processing}
                className="rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>

          <div className="p-5 md:p-6 space-y-5">
            <div className="rounded-3xl border border-border bg-background/60 p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Enemy HP Preview</span>
                <span className="font-bold">
                  {numberText(hpAfterPreview)} / {numberText(enemy.hp)}
                </span>
              </div>

              <div className="h-4 rounded-full bg-muted overflow-hidden border border-border">
                <div
                  className="h-full bg-gradient-to-r from-red-600 to-fuchsia-500 transition-all"
                  style={{ width: `${hpPercent}%` }}
                />
              </div>

              <p className="text-[11px] text-muted-foreground mt-2">
                This battle resolves securely through Supabase. Bosses use a separate multi-attack encounter.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <Swords className="w-4 h-4 text-red-300 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">Attack</p>
                <p className="font-display font-black">{numberText(enemy.attack)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <Shield className="w-4 h-4 text-blue-300 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">Defense</p>
                <p className="font-display font-black">{numberText(enemy.defense)}</p>
              </div>
              <div className="rounded-2xl border border-border bg-background/60 p-3">
                <Zap className="w-4 h-4 text-green-300 mx-auto mb-1" />
                <p className="text-[10px] text-muted-foreground uppercase">Cost</p>
                <p className="font-display font-black">{numberText(node.stamina_cost)} STA</p>
              </div>
            </div>

            {!canStart && (
              <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                Not enough stamina to enter this encounter.
              </div>
            )}

            <Button
              disabled={processing || !canStart}
              onClick={() => onComplete(node)}
              className="w-full h-14 text-base font-black gap-2"
            >
              {processing ? 'Resolving Battle...' : 'Enter Battle'}
              {!processing && <ChevronRight className="w-5 h-5" />}
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl rounded-3xl border border-primary/40 bg-card shadow-2xl overflow-hidden"
      >
        <div className="relative p-5 md:p-6 border-b border-border bg-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                <Icon className="w-4 h-4" />
                {meta.label} Node
              </div>

              <h2 className="font-display text-3xl font-black text-primary mt-3">
                {node.title}
              </h2>

              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                {node.story_text}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-xl border border-border bg-background/60 px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-5 md:p-6 space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Choose Your Approach
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {approachOptions.map((option) => {
                const active = selectedApproach === option.key;

                return (
                  <button
                    key={option.key}
                    type="button"
                    onClick={() => setSelectedApproach(option.key)}
                    disabled={processing}
                    className={`rounded-2xl border p-3 text-left transition-all ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-background/60 hover:border-primary/40'
                    }`}
                  >
                    <p className="text-2xl">{option.icon}</p>
                    <p className="font-bold text-sm mt-1">{option.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                      {option.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-background/60 p-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold text-muted-foreground uppercase">Expedition Cost</p>
              <p className="font-display font-black text-primary mt-1">
                {numberText(node.stamina_cost)} Stamina
              </p>
            </div>
            <Zap className="w-6 h-6 text-primary" />
          </div>

          {!canStart && (
            <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              Not enough stamina to start this node.
            </div>
          )}

          <Button
            disabled={processing || !canStart}
            onClick={() => onComplete(node)}
            className="w-full h-12 gap-2"
          >
            {processing ? 'Resolving Node...' : 'Begin Expedition'}
            {!processing && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function ResultModal({ result, onClose }) {
  if (!result) return null;

  const rewards = result.rewards || {};
  const rewardHits = Array.isArray(result.reward_hits)
    ? result.reward_hits
    : [];
  const awardedCards = Array.isArray(result.awarded_cards)
    ? result.awarded_cards
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-md rounded-3xl border border-primary/40 bg-card shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="relative p-5 border-b border-border bg-primary/5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/10" />

          <div className="relative text-center">
            <div className="text-5xl mb-2">
              {result.node_type === 'boss' ? '👑' : result.first_clear ? '✨' : '⚔️'}
            </div>

            <p className="text-xs uppercase tracking-[0.25em] text-primary font-bold">
              {result.first_clear ? 'First Clear' : result.node_type === 'milestone' ? 'Milestone Claimed' : 'Quest Complete'}
            </p>

            <h2 className="font-display text-2xl font-black text-primary mt-1">
              {result.title || 'Quest Complete'}
            </h2>

            <p className="text-xs text-muted-foreground mt-2">
              Stamina spent: {numberText(result.stamina_spent)}
            </p>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {result.level_up && (
            <div className="rounded-2xl border border-yellow-400/40 bg-yellow-500/10 p-3 text-center">
              <p className="font-black text-yellow-200">🎉 Level Up!</p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Rewards Gained
            </p>
            <RewardGrid rewards={rewards} />
          </div>

          <AwardedCardGrid cards={awardedCards} />

          {getRewardValue(rewards, 'vessel_cards') > 0 && awardedCards.length === 0 && (
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-500/10 p-3 text-xs text-yellow-100/80">
              A Vessel card was awarded. Run the Quest Reloaded V1.1 SQL patch to show the exact card name and art here.
            </div>
          )}

          {rewardHits.length > 0 && (
            <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-3">
              <p className="text-xs font-bold text-purple-200 uppercase tracking-wider">
                Bonus Roll Hit
              </p>

              <div className="mt-2 space-y-2">
                {rewardHits.map((hit, index) => (
                  <div
                    key={`${hit.key || 'hit'}-${index}`}
                    className="rounded-xl bg-background/50 border border-border p-2"
                  >
                    <p className="text-xs font-bold text-foreground">
                      {prettyKey(hit.key)}
                    </p>
                    <div className="mt-2">
                      <RewardGrid rewards={hit.reward || {}} soft />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={onClose} className="w-full">
            Continue
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

function EmptyState({ message, subtext }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-8 text-center">
      <ScrollText className="w-12 h-12 mx-auto text-muted-foreground opacity-40" />
      <p className="font-display text-xl font-black text-primary mt-3">
        {message}
      </p>
      {subtext && (
        <p className="text-sm text-muted-foreground mt-2">{subtext}</p>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {label}
      </div>
      <p className="font-display text-xl font-black mt-1">{value}</p>
    </div>
  );
}

function ResourceCard({ label, value, max, icon: Icon }) {
  const numericValue = Number(value || 0);
  const numericMax = Number(max || 1);
  const percent = Math.max(
    0,
    Math.min(100, Math.floor((numericValue / numericMax) * 100))
  );

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{label}</span>
        <Icon className="w-4 h-4 text-primary" />
      </div>

      <p className="font-display text-xl font-black mt-1">
        {numberText(value)}
        {max !== undefined && max !== null ? (
          <span className="text-sm text-muted-foreground">/{numberText(max)}</span>
        ) : null}
      </p>

      {max !== undefined && max !== null && (
        <div className="h-2 rounded-full bg-muted overflow-hidden mt-2">
          <div
            className="h-full bg-gradient-to-r from-primary to-purple-400 transition-all"
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}

function QuestPath({ nodes, completedNodeIds, nextNodeId }) {
  if (!nodes.length) return null;

  return (
    <div className="mt-6 rounded-3xl border border-border bg-background/50 p-4">
      <div className="grid grid-cols-5 md:grid-cols-8 lg:grid-cols-10 gap-3">
        {nodes.map((node) => {
          const completed = completedNodeIds.has(node.id);
          const current = nextNodeId === node.id;
          const meta = NODE_META[node.node_type] || NODE_META.story;
          const Icon = meta.icon;

          return (
            <div key={node.id} className="flex flex-col items-center">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center transition-all ${
                  current
                    ? 'bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110'
                    : completed
                      ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                      : node.node_type === 'boss'
                        ? 'bg-yellow-500/10 border-yellow-400/40 text-yellow-200'
                        : 'bg-card border-border text-muted-foreground'
                }`}
              >
                {completed ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <Icon className="w-5 h-5" />
                )}
              </div>

              <p className="text-[10px] text-muted-foreground mt-2 text-center leading-tight">
                {meta.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function getPeriodKey(cadence) {
  if (cadence === 'weekly') {
    const now = new Date();
    const oneJan = new Date(now.getFullYear(), 0, 1);
    const week = Math.ceil(
      ((now - oneJan) / 86400000 + oneJan.getDay() + 1) / 7
    );

    return `${now.getFullYear()}-W${String(week).padStart(2, '0')}`;
  }

  if (cadence === 'event') return 'event';

  return 'permanent';
}


export default function Quests() {
  const queryClient = useQueryClient();

  const [selectedBookId, setSelectedBookId] = useState(null);
  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [processingNodeId, setProcessingNodeId] = useState(null);
  const [claimingMilestoneId, setClaimingMilestoneId] = useState(null);
  const [switchingPathKey, setSwitchingPathKey] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [activeNode, setActiveNode] = useState(null);
  const [spawningBossNodeId, setSpawningBossNodeId] = useState(null);
  const [attackingBossId, setAttackingBossId] = useState(null);
  const [lastBossAction, setLastBossAction] = useState(null);
  const [message, setMessage] = useState('');

  const { data: authUser = null, isLoading: authLoading } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;
      return user;
    },
  });

  const userId = authUser?.id || null;

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['questsReloadedV14Data', userId],
    enabled: !!userId,
    queryFn: async () => {
      const unlockResponse = await supabase.rpc(
        'ensure_player_quest_starter_unlocks',
        {
          p_user_id: userId,
        }
      );

      if (unlockResponse.error) throw unlockResponse.error;

      const [
        profileResponse,
        inventoryResponse,
        summonTicketResponse,
        booksResponse,
        chaptersResponse,
        nodesResponse,
        legacyProgressResponse,
        nodePathProgressResponse,
        chapterPathProgressResponse,
        bookUnlocksResponse,
        chapterUnlocksResponse,
        activePathsResponse,
        storyPathsResponse,
        milestonesResponse,
        claimedResponse,
        bossInstancesResponse,
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),

        supabase
          .from('player_inventory')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),

        supabase
          .from('player_items')
          .select('*')
          .eq('user_id', userId)
          .eq('item_key', 'summon_ticket')
          .maybeSingle(),

        supabase
          .from('quest_books')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('quest_chapters')
          .select('*')
          .eq('is_visible', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('quest_nodes')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('player_quest_progress')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('player_quest_node_path_progress')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('player_quest_chapter_path_progress')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('player_quest_book_unlocks')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('player_quest_chapter_unlocks')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('player_quest_active_paths')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('quest_story_paths')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('quest_milestones')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true }),

        supabase
          .from('player_quest_milestones_claimed')
          .select('*')
          .eq('user_id', userId),

        supabase
          .from('quest_boss_instances')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('spawned_at', { ascending: false }),
      ]);

      const responses = [
        profileResponse,
        inventoryResponse,
        summonTicketResponse,
        booksResponse,
        chaptersResponse,
        nodesResponse,
        legacyProgressResponse,
        nodePathProgressResponse,
        chapterPathProgressResponse,
        bookUnlocksResponse,
        chapterUnlocksResponse,
        activePathsResponse,
        storyPathsResponse,
        milestonesResponse,
        claimedResponse,
        bossInstancesResponse,
      ];

      const failed = responses.find((response) => response.error);
      if (failed?.error) throw failed.error;

      return {
        profile: profileResponse.data || null,
        inventory: inventoryResponse.data || null,
        summonTickets: Number(summonTicketResponse.data?.quantity || 0),
        books: booksResponse.data || [],
        chapters: chaptersResponse.data || [],
        nodes: nodesResponse.data || [],
        legacyProgress: legacyProgressResponse.data || [],
        nodePathProgress: nodePathProgressResponse.data || [],
        chapterPathProgress: chapterPathProgressResponse.data || [],
        bookUnlocks: bookUnlocksResponse.data || [],
        chapterUnlocks: chapterUnlocksResponse.data || [],
        activePaths: activePathsResponse.data || [],
        storyPaths: storyPathsResponse.data || [],
        milestones: milestonesResponse.data || [],
        claimedMilestones: claimedResponse.data || [],
        bossInstances: bossInstancesResponse.data || [],
      };
    },
  });

  const profile = data?.profile || null;
  const inventory = data?.inventory || null;
  const summonTickets = data?.summonTickets || 0;
  const books = data?.books || [];
  const chapters = data?.chapters || [];
  const nodes = data?.nodes || [];
  const legacyProgress = data?.legacyProgress || [];
  const nodePathProgress = data?.nodePathProgress || [];
  const chapterPathProgressRows = data?.chapterPathProgress || [];
  const bookUnlocks = data?.bookUnlocks || [];
  const chapterUnlocks = data?.chapterUnlocks || [];
  const activePaths = data?.activePaths || [];
  const storyPaths = data?.storyPaths || [];
  const milestones = data?.milestones || [];
  const claimedMilestones = data?.claimedMilestones || [];
  const bossInstances = data?.bossInstances || [];

  const bookUnlockIds = useMemo(() => {
    return new Set(bookUnlocks.map((row) => row.book_id));
  }, [bookUnlocks]);

  const chapterUnlockIds = useMemo(() => {
    return new Set(chapterUnlocks.map((row) => row.chapter_id));
  }, [chapterUnlocks]);

  const firstPlayableBook = useMemo(() => {
    return (
      books.find(
        (book) =>
          book.is_active &&
          book.release_state === 'active' &&
          bookUnlockIds.has(book.id)
      ) || books.find((book) => book.book_number === 1) || books[0] || null
    );
  }, [books, bookUnlockIds]);

  useEffect(() => {
    if (!selectedBookId && firstPlayableBook?.id) {
      setSelectedBookId(firstPlayableBook.id);
    }
  }, [firstPlayableBook, selectedBookId]);

  const selectedBook = useMemo(() => {
    return books.find((book) => book.id === selectedBookId) || firstPlayableBook || null;
  }, [books, selectedBookId, firstPlayableBook]);

  const bookChapters = useMemo(() => {
    if (!selectedBook) return [];

    return chapters
      .filter((chapter) => chapter.book_id === selectedBook.id)
      .sort((a, b) => Number(a.chapter_number || a.sort_order || 0) - Number(b.chapter_number || b.sort_order || 0));
  }, [chapters, selectedBook]);

  const firstPlayableChapter = useMemo(() => {
    return (
      bookChapters.find(
        (chapter) =>
          chapter.is_active &&
          chapter.release_state === 'active' &&
          chapterUnlockIds.has(chapter.id)
      ) || bookChapters[0] || null
    );
  }, [bookChapters, chapterUnlockIds]);

  useEffect(() => {
    if (!selectedChapterId && firstPlayableChapter?.id) {
      setSelectedChapterId(firstPlayableChapter.id);
      return;
    }

    if (
      selectedChapterId &&
      selectedBook &&
      !bookChapters.some((chapter) => chapter.id === selectedChapterId)
    ) {
      setSelectedChapterId(firstPlayableChapter?.id || null);
    }
  }, [selectedChapterId, selectedBook, bookChapters, firstPlayableChapter]);

  const selectedChapter = useMemo(() => {
    return bookChapters.find((chapter) => chapter.id === selectedChapterId) || firstPlayableChapter || null;
  }, [bookChapters, selectedChapterId, firstPlayableChapter]);

  const selectedActivePathKey = useMemo(() => {
    if (!selectedChapter) return 'main';

    return (
      activePaths.find((row) => row.chapter_id === selectedChapter.id)?.active_path_key || 'main'
    );
  }, [activePaths, selectedChapter]);

  const chapterStoryPaths = useMemo(() => {
    if (!selectedChapter) return [];

    return storyPaths
      .filter((path) => path.chapter_id === selectedChapter.id)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [storyPaths, selectedChapter]);

  const chapterNodes = useMemo(() => {
    if (!selectedChapter) return [];

    return nodes
      .filter((node) => {
        const nodePath = node.story_path_key || 'main';
        return (
          node.chapter_id === selectedChapter.id &&
          (nodePath === 'main' || nodePath === selectedActivePathKey)
        );
      })
      .sort((a, b) => Number(a.node_number || a.sort_order || 0) - Number(b.node_number || b.sort_order || 0));
  }, [nodes, selectedChapter, selectedActivePathKey]);

  const activePathProgressRows = useMemo(() => {
    return nodePathProgress.filter(
      (row) =>
        row.chapter_id === selectedChapter?.id &&
        row.path_key === selectedActivePathKey
    );
  }, [nodePathProgress, selectedChapter, selectedActivePathKey]);

  const progressByNodeId = useMemo(() => {
    const map = new Map();

    activePathProgressRows.forEach((row) => {
      map.set(row.node_id, row);
    });

    // Legacy fallback keeps old progress visible during the V1.4 transition.
    legacyProgress
      .filter((row) => row.chapter_id === selectedChapter?.id)
      .forEach((row) => {
        if (!map.has(row.node_id)) map.set(row.node_id, row);
      });

    return map;
  }, [activePathProgressRows, legacyProgress, selectedChapter]);

  const progressByNodeKey = useMemo(() => {
    return new Map(
      chapterNodes.map((node) => [node.node_key, progressByNodeId.get(node.id)])
    );
  }, [chapterNodes, progressByNodeId]);

  const bossInstanceByNodeId = useMemo(() => {
    return new Map(
      bossInstances
        .filter((boss) => {
          if (!selectedChapter) return false;
          const bossPath = boss.path_key || 'main';
          return boss.chapter_id === selectedChapter.id && bossPath === selectedActivePathKey;
        })
        .map((boss) => [boss.node_id, boss])
    );
  }, [bossInstances, selectedChapter, selectedActivePathKey]);

  const completedNodeIds = useMemo(() => {
    return new Set(
      chapterNodes
        .filter((node) => progressByNodeId.get(node.id)?.first_completed_at)
        .map((node) => node.id)
    );
  }, [chapterNodes, progressByNodeId]);

  const completedNodeKeys = useMemo(() => {
    return new Set(
      chapterNodes
        .filter((node) => completedNodeIds.has(node.id))
        .map((node) => node.node_key)
    );
  }, [chapterNodes, completedNodeIds]);

  const selectedBookAvailable = !!(
    selectedBook &&
    selectedBook.is_active &&
    selectedBook.release_state === 'active' &&
    bookUnlockIds.has(selectedBook.id)
  );

  const selectedChapterAvailable = !!(
    selectedChapter &&
    selectedBookAvailable &&
    selectedChapter.is_active &&
    selectedChapter.release_state === 'active' &&
    chapterUnlockIds.has(selectedChapter.id)
  );

  function getNodeLockInfo(node) {
    if (!node) {
      return { locked: true, reason: 'Quest unavailable.' };
    }

    if (!selectedChapterAvailable) {
      return { locked: true, reason: 'This chapter is locked.' };
    }

    const requiredLevel = Number(node.min_level_required || 1);
    const playerLevel = Number(profile?.level || 1);

    if (requiredLevel > 1 && playerLevel < requiredLevel) {
      return { locked: true, reason: `Requires Level ${requiredLevel}.` };
    }

    if (node.required_node_key) {
      const requiredProgress = progressByNodeKey.get(node.required_node_key);

      if (!requiredProgress?.first_completed_at) {
        return { locked: true, reason: 'Complete the previous node first.' };
      }

      const unlockDelay = Number(node.unlock_delay_minutes || 0);
      const unlockRemaining = getRemainingMinutesFrom(
        requiredProgress.first_completed_at,
        unlockDelay
      );

      if (unlockRemaining > 0) {
        return { locked: true, reason: `Path opens in ${unlockRemaining}m.` };
      }
    }

    // Replays are intentionally allowed.
    // First-clear rewards are protected by Supabase per storyline path,
    // while completed path replays only receive repeat rewards.

    return { locked: false, reason: '' };
  }

  const nextNode = useMemo(() => {
    return (
      chapterNodes.find(
        (node) => !completedNodeIds.has(node.id) && !getNodeLockInfo(node).locked
      ) || null
    );
  }, [chapterNodes, completedNodeIds, progressByNodeKey, progressByNodeId, selectedChapterAvailable]);

  const completedCount = chapterNodes.filter((node) => completedNodeIds.has(node.id)).length;
  const questPercent = chapterNodes.length ? Math.floor((completedCount / chapterNodes.length) * 100) : 0;

  const activeChapterPathProgress = useMemo(() => {
    return chapterPathProgressRows.find(
      (row) =>
        row.chapter_id === selectedChapter?.id &&
        row.path_key === selectedActivePathKey
    ) || null;
  }, [chapterPathProgressRows, selectedChapter, selectedActivePathKey]);

  const weeklyQuestCount = useMemo(() => {
    return nodePathProgress.reduce((sum, row) => sum + Number(row.completions || 0), 0);
  }, [nodePathProgress]);

  const bossClearCount = useMemo(() => {
    const bossNodeIds = new Set(
      nodes.filter((node) => node.node_type === 'boss').map((node) => node.id)
    );

    return nodePathProgress
      .filter((row) => bossNodeIds.has(row.node_id))
      .reduce((sum, row) => sum + Number(row.completions || 0), 0);
  }, [nodes, nodePathProgress]);

  async function switchBook(book) {
    if (!book) return;

    const globallyActive = book.is_active && book.release_state === 'active';
    const unlocked = bookUnlockIds.has(book.id);

    if (!globallyActive || !unlocked) {
      toast.error(`${book.title} is not playable yet.`);
      setSelectedBookId(book.id);
      const firstChapter = chapters
        .filter((chapter) => chapter.book_id === book.id)
        .sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0))[0];
      setSelectedChapterId(firstChapter?.id || null);
      return;
    }

    setSelectedBookId(book.id);
    const nextChapter = chapters
      .filter((chapter) => chapter.book_id === book.id)
      .sort((a, b) => Number(a.chapter_number || 0) - Number(b.chapter_number || 0))
      .find(
        (chapter) =>
          chapter.is_active &&
          chapter.release_state === 'active' &&
          chapterUnlockIds.has(chapter.id)
      );

    setSelectedChapterId(nextChapter?.id || null);
  }

  function switchChapter(chapter) {
    if (!chapter) return;

    setSelectedChapterId(chapter.id);

    const globallyActive = chapter.is_active && chapter.release_state === 'active';
    const unlocked = chapterUnlockIds.has(chapter.id);

    if (!globallyActive || !unlocked) {
      toast.error(`${chapter.title} is locked.`);
    }
  }

  async function switchStoryPath(path) {
    if (!selectedChapter || !path) return;

    try {
      setSwitchingPathKey(path.path_key);
      setMessage('');

      const { error: rpcError } = await supabase.rpc('set_active_quest_story_path', {
        p_chapter_id: selectedChapter.id,
        p_path_key: path.path_key,
      });

      if (rpcError) throw rpcError;

      toast.success(`Storyline switched to ${path.title}.`);
      await queryClient.invalidateQueries({ queryKey: ['questsReloadedV14Data', userId] });
      await refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not switch storyline.');
      setMessage(err.message || 'Could not switch storyline.');
    } finally {
      setSwitchingPathKey(null);
    }
  }

  function openNode(node) {
    if (!userId) {
      toast.error('You must be logged in.');
      return;
    }

    const lockInfo = getNodeLockInfo(node);

    if (lockInfo.locked) {
      toast.error(lockInfo.reason || 'This quest node is locked.');
      return;
    }

    const activeBoss = bossInstanceByNodeId.get(node.id);

    if (
      node.node_type !== 'boss' &&
      Number(profile?.stamina || 0) < Number(node.stamina_cost || 0)
    ) {
      toast.error('Not enough stamina.');
      return;
    }

    if (
      node.node_type === 'boss' &&
      !activeBoss &&
      Number(profile?.stamina || 0) < Number(node.stamina_cost || 0)
    ) {
      toast.error('Not enough stamina to awaken this boss.');
      return;
    }

    setLastBossAction(null);
    setActiveNode(node);
  }

  async function completeNode(node) {
    if (!userId) {
      toast.error('You must be logged in.');
      return;
    }

    const lockInfo = getNodeLockInfo(node);

    if (lockInfo.locked) {
      toast.error(lockInfo.reason || 'This quest node is locked.');
      return;
    }

    if (node.node_type === 'boss') {
      toast.error('Boss nodes must be cleared through the boss encounter.');
      return;
    }

    if (Number(profile?.stamina || 0) < Number(node.stamina_cost || 0)) {
      toast.error('Not enough stamina.');
      return;
    }

    try {
      setProcessingNodeId(node.id);
      setMessage('');

      const { data: result, error: rpcError } = await supabase.rpc(
        'complete_quest_node_v14',
        {
          p_node_id: node.id,
        }
      );

      if (rpcError) throw rpcError;

      setLastResult(result);
      setActiveNode(null);
      toast.success(result?.path_first_clear ? 'Story path first clear!' : 'Quest complete!');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questsReloadedV14Data', userId] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
      ]);

      await refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not complete quest.');
      setMessage(err.message || 'Could not complete quest.');
    } finally {
      setProcessingNodeId(null);
    }
  }

  async function spawnQuestBoss(node) {
    if (!userId) {
      toast.error('You must be logged in.');
      return;
    }

    try {
      setSpawningBossNodeId(node.id);
      setMessage('');
      setLastBossAction(null);

      const { data: result, error: rpcError } = await supabase.rpc(
        'spawn_quest_boss',
        {
          p_node_id: node.id,
        }
      );

      if (rpcError) throw rpcError;

      toast.success(result?.reused ? 'Boss encounter resumed!' : 'Boss awakened!');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questsReloadedV14Data', userId] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
      ]);

      await refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not awaken boss.');
      setMessage(err.message || 'Could not awaken boss.');
    } finally {
      setSpawningBossNodeId(null);
    }
  }

  async function attackQuestBoss(boss) {
    if (!userId) {
      toast.error('You must be logged in.');
      return;
    }

    try {
      setAttackingBossId(boss.id);
      setMessage('');

      const { data: result, error: rpcError } = await supabase.rpc(
        'attack_quest_boss',
        {
          p_boss_id: boss.id,
        }
      );

      if (rpcError) throw rpcError;

      setLastBossAction(result);

      if (result?.defeated) {
        const completion = result.completion_result || {};

        setLastResult({
          ...completion,
          title: completion.title || boss.boss_name || 'Boss Defeated',
          node_type: 'boss',
          stamina_spent: 0,
          boss_damage: result.damage,
          boss_crit: result.crit,
        });

        setActiveNode(null);
        toast.success(`${boss.boss_name || 'Boss'} defeated!`);
      } else {
        toast.success(
          `${result?.crit ? 'Critical hit! ' : ''}${numberText(result?.damage)} damage dealt.`
        );
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questsReloadedV14Data', userId] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
      ]);

      await refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Boss attack failed.');
      setMessage(err.message || 'Boss attack failed.');
    } finally {
      setAttackingBossId(null);
    }
  }

  async function claimMilestone(milestone) {
    if (!userId) {
      toast.error('You must be logged in.');
      return;
    }

    try {
      setClaimingMilestoneId(milestone.id);
      setMessage('');

      const { data: result, error: rpcError } = await supabase.rpc(
        'claim_quest_milestone',
        {
          p_milestone_id: milestone.id,
        }
      );

      if (rpcError) throw rpcError;

      setLastResult({
        ...result,
        title: result?.title || milestone.title,
        node_type: 'milestone',
        first_clear: false,
        stamina_spent: 0,
      });

      toast.success('Milestone claimed!');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['questsReloadedV14Data', userId] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
      ]);

      await refetch();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Could not claim milestone.');
      setMessage(err.message || 'Could not claim milestone.');
    } finally {
      setClaimingMilestoneId(null);
    }
  }

  function getMilestoneProgress(milestone) {
    if (milestone.requirement_type === 'unique_nodes_completed') {
      return new Set(nodePathProgress.filter((row) => row.first_completed_at).map((row) => row.node_id)).size;
    }

    if (milestone.requirement_type === 'boss_nodes_completed') {
      return bossClearCount;
    }

    return weeklyQuestCount;
  }

  function isMilestoneClaimed(milestone) {
    const periodKey = getPeriodKey(milestone.cadence);

    return claimedMilestones.some(
      (row) =>
        row.milestone_id === milestone.id &&
        String(row.period_key || 'permanent') === periodKey
    );
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-primary font-bold tracking-widest uppercase text-sm">
            Loading Veil Expeditions...
          </p>
        </div>
      </div>
    );
  }

  if (!authUser) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <EmptyState
          message="Login Required"
          subtext="You must be logged in to enter Veil Expeditions."
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-5">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-bold text-destructive">Quest load failed</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
              <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!books.length) {
    return (
      <div className="max-w-lg mx-auto p-4">
        <EmptyState
          message="No Quest Books Found"
          subtext="Run the Quest Reloaded V1.4 SQL in Supabase first."
        />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-purple-700/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={selectedBook?.background_url || selectedChapter?.background_url || QUEST_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />

          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <Sparkles className="w-4 h-4" />
                  Quest Reloaded V1.4
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  VEIL EXPEDITIONS
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  {selectedBook?.title || 'Book'} → {selectedChapter?.title || 'Chapter'} → Node Map
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <StatCard icon={ScrollText} label="Book" value={selectedBook?.book_number || 1} />
                <StatCard icon={Trophy} label="Chapter" value={selectedChapter?.chapter_number || 1} />
                <StatCard icon={Clock} label="Progress" value={`${questPercent}%`} />
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive mt-0.5 flex-shrink-0" />
              <p className="font-semibold text-sm">{message}</p>
            </div>
          </div>
        )}

        <section className="rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden">
          <div className="p-5 md:p-6 border-b border-border bg-primary/5">
            <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
              <ScrollText className="w-4 h-4" />
              Campaign Books
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
              Select a Book
            </h2>
          </div>

          <div className="p-5 md:p-6 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {books.map((book) => {
              const active = book.id === selectedBook?.id;
              const playable = book.is_active && book.release_state === 'active' && bookUnlockIds.has(book.id);

              return (
                <button
                  key={book.id}
                  type="button"
                  onClick={() => switchBook(book)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    active
                      ? 'border-primary bg-primary/10'
                      : playable
                        ? 'border-border bg-background/60 hover:border-primary/40'
                        : 'border-border bg-muted/20 opacity-75'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        Book {book.book_number}
                      </p>
                      <p className="font-display font-black text-primary mt-1">
                        {book.faction || book.title}
                      </p>
                    </div>
                    {!playable && <Lock className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 line-clamp-3">
                    {playable ? 'Playable' : prettyKey(book.release_state || 'Coming Soon')}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <section className="xl:col-span-8 rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden">
            <div className="p-5 md:p-6 border-b border-border bg-primary/5">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                    <MapIcon className="w-4 h-4" />
                    {selectedBook?.title || 'Book'}
                  </div>

                  <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                    {selectedChapter?.title || 'Select a Chapter'}
                  </h2>

                  <p className="text-sm text-muted-foreground mt-2">
                    Active Storyline: <span className="text-primary font-bold">{prettyKey(selectedActivePathKey)}</span>
                  </p>
                </div>

                <Button variant="outline" onClick={() => refetch()} className="gap-2">
                  <RefreshCcw className="w-4 h-4" />
                  Refresh
                </Button>
              </div>

              <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                {bookChapters.map((chapter) => {
                  const active = chapter.id === selectedChapter?.id;
                  const playable = chapter.is_active && chapter.release_state === 'active' && chapterUnlockIds.has(chapter.id);

                  return (
                    <button
                      key={chapter.id}
                      type="button"
                      onClick={() => switchChapter(chapter)}
                      className={`rounded-2xl border px-4 py-3 text-left min-w-[220px] transition-all ${
                        active
                          ? 'border-primary bg-primary/10'
                          : playable
                            ? 'border-border bg-background/50 hover:border-primary/40'
                            : 'border-border bg-muted/20 opacity-70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-display font-black text-sm text-primary">
                            Chapter {chapter.chapter_number}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                            {chapter.title}
                          </p>
                        </div>
                        {!playable && <Lock className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <ResourceCard icon={Zap} label="Stamina" value={profile?.stamina ?? 0} max={profile?.max_stamina ?? 100} />
                <ResourceCard icon={CircleDollarSign} label="Gold" value={profile?.gold ?? 0} />
                <ResourceCard icon={Ticket} label="Summon Tickets" value={summonTickets} />
                <ResourceCard icon={Star} label="Level" value={profile?.level ?? 1} />
              </div>

              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                <ResourceCard icon={Sparkles} label="Aether Dust" value={inventory?.aether_dust ?? 0} />
                <ResourceCard icon={Droplets} label="Spirit Water" value={inventory?.spirit_water ?? 0} />
                <ResourceCard icon={ScrollText} label="Path Clears" value={activeChapterPathProgress?.completion_count ?? 0} />
                <ResourceCard icon={Crown} label="Boss Clears" value={inventory?.boss_quests_cleared ?? 0} />
              </div>

              {!selectedChapterAvailable ? (
                <div className="mt-6 rounded-3xl border border-border bg-muted/20 p-8 text-center">
                  <Lock className="w-12 h-12 mx-auto text-muted-foreground opacity-60" />
                  <h3 className="font-display text-2xl font-black text-primary mt-4">
                    Chapter Locked
                  </h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    This chapter is reserved for the next campaign rollout.
                  </p>
                </div>
              ) : (
                <>
                  <div className="mt-6 rounded-3xl border border-purple-400/20 bg-purple-500/10 p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-purple-200 font-bold">
                          Story Paths
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          First clear rewards can be earned once per storyline path. Completed paths become repeat-reward farming routes.
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {chapterStoryPaths.map((path) => {
                        const active = path.path_key === selectedActivePathKey;
                        const completed = chapterPathProgressRows.some(
                          (row) =>
                            row.chapter_id === selectedChapter.id &&
                            row.path_key === path.path_key &&
                            row.first_completed_at
                        );

                        return (
                          <Button
                            key={path.id}
                            size="sm"
                            variant={active ? 'default' : 'outline'}
                            disabled={switchingPathKey === path.path_key}
                            onClick={() => switchStoryPath(path)}
                            className="whitespace-nowrap gap-2"
                          >
                            {completed && <CheckCircle2 className="w-3.5 h-3.5" />}
                            {switchingPathKey === path.path_key ? 'Switching...' : path.title}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <QuestPath nodes={chapterNodes} completedNodeIds={completedNodeIds} nextNodeId={nextNode?.id} />

                  <div className="mt-5">
                    <div className="flex justify-between text-xs uppercase tracking-widest text-muted-foreground mb-2">
                      <span>Chapter Progress</span>
                      <span>{questPercent}%</span>
                    </div>

                    <div className="h-4 rounded-full bg-muted overflow-hidden border border-border">
                      <div
                        className="h-full bg-gradient-to-r from-primary via-purple-400 to-yellow-300 transition-all"
                        style={{ width: `${questPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-3">
                    <AnimatePresence>
                      {chapterNodes.map((node, index) => {
                        const meta = NODE_META[node.node_type] || NODE_META.story;
                        const Icon = meta.icon;
                        const completed = completedNodeIds.has(node.id);
                        const lockInfo = getNodeLockInfo(node);
                        const unlocked = !lockInfo.locked;
                        const processing = processingNodeId === node.id;
                        const progressRow = progressByNodeId.get(node.id);
                        const activeBoss = bossInstanceByNodeId.get(node.id);

                        return (
                          <motion.div
                            key={node.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.035 }}
                            className={`relative overflow-hidden rounded-3xl border p-4 ${
                              unlocked
                                ? `${meta.border} ${meta.bg}`
                                : 'border-border bg-muted/20 opacity-80'
                            }`}
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-card/95 via-card/80 to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col md:flex-row md:items-center gap-4">
                              <div
                                className={`w-14 h-14 rounded-2xl border flex items-center justify-center flex-shrink-0 ${
                                  unlocked
                                    ? 'border-primary/30 bg-background/70'
                                    : 'border-border bg-background/40'
                                }`}
                              >
                                {unlocked ? (
                                  <Icon className={`w-6 h-6 ${meta.text}`} />
                                ) : (
                                  <Lock className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-[11px] rounded-full bg-background/70 border border-border px-2 py-0.5 text-muted-foreground font-bold">
                                    Node {node.node_number || node.sort_order || index + 1}
                                  </p>

                                  <p className="font-display text-lg font-black text-foreground">
                                    {node.title}
                                  </p>

                                  {completed && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-200 font-bold uppercase">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Path Cleared
                                    </span>
                                  )}

                                  {!unlocked && (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] text-muted-foreground font-bold uppercase">
                                      <Lock className="w-3 h-3" />
                                      {lockInfo.reason || 'Locked'}
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs text-muted-foreground mt-1">
                                  {meta.label} · {numberText(node.stamina_cost)} Stamina
                                  {node.recommended_power ? ` · Recommended Power ${numberText(node.recommended_power)}` : ''}
                                  {progressRow?.completions ? ` · ${numberText(progressRow.completions)} clears` : ''}
                                </p>

                                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                                  {node.story_text}
                                </p>

                                {activeBoss && (
                                  <div className="mt-3 rounded-2xl border border-red-400/30 bg-red-500/10 p-3">
                                    <p className="text-xs font-bold text-red-200">
                                      Active Boss: {activeBoss.boss_name}
                                    </p>
                                    <div className="h-2 rounded-full bg-background/70 overflow-hidden mt-2">
                                      <div
                                        className="h-full bg-gradient-to-r from-red-600 to-fuchsia-500"
                                        style={{ width: `${getHpPercent(activeBoss.current_hp, activeBoss.max_hp)}%` }}
                                      />
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                      HP {numberText(activeBoss.current_hp)} / {numberText(activeBoss.max_hp)}
                                    </p>
                                  </div>
                                )}
                              </div>

                              <div className="md:w-[180px]">
                                <Button
                                  disabled={!unlocked || processing}
                                  onClick={() => openNode(node)}
                                  className="w-full gap-2"
                                >
                                  {processing ? (
                                    'Clearing...'
                                  ) : completed ? (
                                    <>
                                      Replay
                                      <RefreshCcw className="w-4 h-4" />
                                    </>
                                  ) : activeBoss ? (
                                    <>
                                      Attack
                                      <Swords className="w-4 h-4" />
                                    </>
                                  ) : (
                                    <>
                                      Start
                                      <ChevronRight className="w-4 h-4" />
                                    </>
                                  )}
                                </Button>

                                {completed && (
                                  <p className="text-[10px] text-muted-foreground text-center mt-2">
                                    Repeat rewards only on this path.
                                  </p>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>
          </section>

          <aside className="xl:col-span-4 space-y-6">
            <section className="rounded-3xl border border-yellow-500/30 bg-card/90 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-2 text-yellow-300 uppercase tracking-[0.25em] text-xs font-bold">
                  <Trophy className="w-4 h-4" />
                  Campaign Structure
                </div>
                <h3 className="font-display text-2xl font-black mt-2">
                  Book → Chapter → Node
                </h3>
              </div>

              <div className="p-5 space-y-3">
                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <p className="font-display font-black text-primary">
                    Long-Term Campaign
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    6 Books · 5 Chapters per Book · 10 Nodes per Chapter. Each faction gets a book, then the final Singularity book closes the arc.
                  </p>
                </div>

                <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4">
                  <p className="font-display font-black text-primary">
                    Storyline Farming
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    New storyline paths can earn their own first-clear rewards. Completed paths become repeat reward routes.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-yellow-500/30 bg-card/90 shadow-2xl overflow-hidden">
              <div className="p-5 border-b border-yellow-500/20 bg-yellow-500/5">
                <div className="flex items-center gap-2 text-yellow-300 uppercase tracking-[0.25em] text-xs font-bold">
                  <Trophy className="w-4 h-4" />
                  Milestones
                </div>
                <h3 className="font-display text-2xl font-black mt-2">Premium Goals</h3>
              </div>

              <div className="p-5 space-y-3">
                {milestones.map((milestone) => {
                  const current = getMilestoneProgress(milestone);
                  const required = Number(milestone.required_count || 1);
                  const percent = Math.max(0, Math.min(100, Math.floor((current / required) * 100)));
                  const claimed = isMilestoneClaimed(milestone);
                  const ready = current >= required && !claimed;
                  const claiming = claimingMilestoneId === milestone.id;

                  return (
                    <div
                      key={milestone.id}
                      className={`rounded-2xl border p-4 ${
                        ready
                          ? 'border-yellow-400/40 bg-yellow-500/10'
                          : claimed
                            ? 'border-emerald-400/30 bg-emerald-500/10'
                            : 'border-border bg-background/50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-display font-black text-primary">{milestone.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                        </div>
                        {claimed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-300 flex-shrink-0" />
                        ) : (
                          <Gift className="w-5 h-5 text-yellow-300 flex-shrink-0" />
                        )}
                      </div>

                      <div className="mt-3">
                        <div className="flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                          <span>{milestone.cadence}</span>
                          <span>{numberText(current)}/{numberText(required)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-yellow-500 to-primary" style={{ width: `${percent}%` }} />
                        </div>
                      </div>

                      <Button
                        className="w-full mt-3"
                        variant={ready ? 'default' : 'outline'}
                        disabled={!ready || claiming}
                        onClick={() => claimMilestone(milestone)}
                      >
                        {claiming ? 'Claiming...' : claimed ? 'Claimed' : ready ? 'Claim Reward' : 'Locked'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </section>
          </aside>
        </div>
      </div>

      <QuestActionModal
        node={activeNode}
        open={!!activeNode}
        onClose={() => setActiveNode(null)}
        onComplete={completeNode}
        onSpawnBoss={spawnQuestBoss}
        onAttackBoss={attackQuestBoss}
        processing={!!processingNodeId}
        stamina={profile?.stamina || 0}
        attackEnergy={profile?.attack_energy || 0}
        activeBoss={activeNode ? bossInstanceByNodeId.get(activeNode.id) : null}
        spawning={!!spawningBossNodeId}
        attacking={!!attackingBossId}
        lastBossAction={lastBossAction}
      />

      <ResultModal result={lastResult} onClose={() => setLastResult(null)} />
    </div>
  );
}
