import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers,
  Sparkles,
  Swords,
  Trophy,
  ScrollText,
  Zap,
  Users,
  Shield,
  Flame,
  Gem,
  Coins,
  Package,
  ChevronRight,
  Crown,
  ShoppingBag,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { useProfile, usePlayerCards, useCards } from '@/hooks/useGameData';
import MailboxButton from '@/components/game/MailboxButton';

const HERO_IMAGE =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/12dd112d1_generated_image.png';

const DISCORD_INVITE_URL =
  import.meta.env.VITE_DISCORD_INVITE_URL || 'https://discord.gg/6GepRHPCbe';

const RARITY_RANK = {
  vessel: 1,
  common: 1,
  normal: 1,
  awakened: 2,
  high_normal: 2,
  ascendant: 3,
  rare: 3,
  exalted: 4,
  super_rare: 4,
  mythic: 5,
  super_super_rare: 5,
  epic: 5,
  transcendent: 6,
  legendary: 6,
  eclipse: 7,
  ultra_rare: 7,
  singularity: 8,
};

const RARITY_LABELS = {
  vessel: 'Vessel',
  awakened: 'Awakened',
  ascendant: 'Ascendant',
  exalted: 'Exalted',
  mythic: 'Mythic',
  transcendent: 'Transcendent',
  eclipse: 'Eclipse',
  singularity: 'Singularity',
  common: 'Common',
  normal: 'Normal',
  high_normal: 'High Normal',
  rare: 'Rare',
  super_rare: 'Super Rare',
  super_super_rare: 'Super Super Rare',
  epic: 'Epic',
  legendary: 'Legendary',
  ultra_rare: 'Ultra Rare',
};

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function formatNumber(value) {
  const num = Number(value || 0);

  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 10000) return `${Math.round(num / 1000)}K`;

  return num.toLocaleString();
}

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

function getOwnedCardPower(playerCard, card) {
  return (
    getOwnedCardStat(playerCard, card, 'attack') +
    getOwnedCardStat(playerCard, card, 'defense') +
    getOwnedCardStat(playerCard, card, 'hp')
  );
}

const quickActions = [
  {
    path: '/collection',
    icon: Layers,
    label: 'Collection',
    desc: 'View your cards',
    className: 'border-blue-400/35 bg-blue-500/10',
    iconClass: 'text-blue-300',
  },
  {
    path: '/enhance',
    icon: Zap,
    label: 'Enhance',
    desc: 'Level and evolve',
    className: 'border-yellow-400/35 bg-yellow-500/10',
    iconClass: 'text-yellow-300',
  },
  {
    path: '/battle',
    icon: Swords,
    label: 'Battle',
    desc: 'Fight for glory',
    className: 'border-red-400/35 bg-red-500/10',
    iconClass: 'text-red-300',
  },
  {
    path: '/raid-event',
    icon: Flame,
    label: 'Raid',
    desc: 'Weekend boss',
    className: 'border-orange-400/35 bg-orange-500/10',
    iconClass: 'text-orange-300',
  },
];

const secondaryActions = [
  {
    path: '/inventory',
    icon: Package,
    label: 'Inventory',
    desc: 'Items and materials',
    iconClass: 'text-yellow-300',
  },
  {
    path: '/guild',
    icon: Shield,
    label: 'Guild',
    desc: 'Your guild home',
    iconClass: 'text-emerald-300',
  },
  {
    path: '/social',
    icon: Users,
    label: 'Social',
    desc: 'Friends and trading',
    iconClass: 'text-cyan-300',
  },
  {
    path: '/event',
    icon: Flame,
    label: 'Event',
    desc: 'Dungeon content',
    iconClass: 'text-orange-300',
  },
];

export default function Home() {
  const { data: profile } = useProfile();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: cards = [] } = useCards();

  const ownedCards = useMemo(() => {
    return playerCards
      .map((playerCard) => {
        const card = cards.find((item) => item.id === playerCard.card_id);
        if (!card) return null;

        const rarity = normalizeKey(card.rarity || 'vessel');

        return {
          card,
          playerCard,
          rarity,
          power: getOwnedCardPower(playerCard, card),
        };
      })
      .filter(Boolean);
  }, [cards, playerCards]);

  const deckPower = useMemo(() => {
    return ownedCards
      .slice()
      .sort((a, b) => b.power - a.power)
      .slice(0, 5)
      .reduce((sum, item) => sum + item.power, 0);
  }, [ownedCards]);

  const highestRarity = useMemo(() => {
    if (ownedCards.length === 0) return 'None';

    const best = ownedCards.reduce((currentBest, item) => {
      const currentRank = RARITY_RANK[currentBest.rarity] || 0;
      const nextRank = RARITY_RANK[item.rarity] || 0;

      return nextRank > currentRank ? item : currentBest;
    }, ownedCards[0]);

    return RARITY_LABELS[best.rarity] || best.rarity || 'Unknown';
  }, [ownedCards]);

  const mythicPlusCount = useMemo(() => {
    return ownedCards.filter((item) => {
      return (RARITY_RANK[item.rarity] || 0) >= RARITY_RANK.mythic;
    }).length;
  }, [ownedCards]);

  const uniqueOwnedCount = useMemo(() => {
    return new Set(playerCards.map((pc) => pc.card_id).filter(Boolean)).size;
  }, [playerCards]);

  const totalCards = cards.length || 0;
  const collectionPercent =
    totalCards > 0 ? Math.min((uniqueOwnedCount / totalCards) * 100, 100) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt=""
          className="h-full w-full object-cover object-top opacity-35"
        />

        <div className="absolute inset-0 bg-background/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-transparent to-background" />
        <div className="absolute left-1/2 top-16 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-lg px-4 pb-28 pt-6">
        <div className="absolute right-4 top-4 z-20">
          <MailboxButton />
        </div>

        <motion.section
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-6 text-center"
        >
          <p className="text-[10px] uppercase tracking-[0.45em] text-foreground/55">
            Into the Singularity
          </p>

          <h1 className="mt-1 font-display text-4xl font-black tracking-[0.18em] text-primary text-glow-gold drop-shadow-2xl">
            VEILBREAK
          </h1>

          <p className="mx-auto mt-3 max-w-xs text-xs leading-relaxed text-muted-foreground">
            Build your deck, evolve your strongest cards, and push deeper into
            the corrupted veil.
          </p>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-6 overflow-hidden rounded-3xl border border-primary/25 bg-card/65 shadow-2xl backdrop-blur-md"
        >
          <div className="relative p-4">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />

            <div className="relative flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.25em] text-primary/80">
                  Current Objective
                </p>

                <h2 className="mt-1 font-display text-xl font-black text-primary">
                  Continue Expedition
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  Signal Beneath the City · Ironveil Chapter 1
                </p>
              </div>

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_20px_rgba(250,189,50,0.16)]">
                <ScrollText className="h-7 w-7 text-primary" />
              </div>
            </div>

            <div className="relative mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-2xl border border-border/70 bg-background/45 p-3 text-center">
                <Trophy className="mx-auto h-4 w-4 text-primary" />
                <p className="mt-1 text-sm font-black text-foreground">
                  {profile?.quests_completed || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">Clears</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/45 p-3 text-center">
                <Crown className="mx-auto h-4 w-4 text-purple-300" />
                <p className="mt-1 text-sm font-black text-foreground">
                  {formatNumber(deckPower)}
                </p>
                <p className="text-[10px] text-muted-foreground">Deck Power</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/45 p-3 text-center">
                <Zap className="mx-auto h-4 w-4 text-emerald-300" />
                <p className="mt-1 text-sm font-black text-foreground">
                  {profile?.stamina ?? '—'}
                </p>
                <p className="text-[10px] text-muted-foreground">Stamina</p>
              </div>
            </div>

            <Link
              to="/quests"
              className="relative mt-4 flex w-full items-center justify-between rounded-2xl bg-gradient-to-r from-primary to-yellow-500 px-4 py-3 font-black text-primary-foreground shadow-[0_0_22px_rgba(250,189,50,0.22)] transition-all hover:scale-[1.01] hover:brightness-110"
            >
              <span>Enter Expedition</span>
              <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-4 grid grid-cols-3 gap-2"
        >
          <div className="rounded-2xl border border-border/70 bg-card/70 p-3 text-center backdrop-blur-md">
            <Layers className="mx-auto h-4 w-4 text-blue-300" />
            <p className="mt-1 font-display text-lg font-black text-blue-200">
              {playerCards.length}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Owned
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-3 text-center backdrop-blur-md">
            <Sparkles className="mx-auto h-4 w-4 text-primary" />
            <p className="mt-1 font-display text-lg font-black text-primary">
              {mythicPlusCount}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Mythic+
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card/70 p-3 text-center backdrop-blur-md">
            <Swords className="mx-auto h-4 w-4 text-green-300" />
            <p className="mt-1 font-display text-lg font-black text-green-200">
              {profile?.wins || 0}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Wins
            </p>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="mt-4 rounded-3xl border border-border/70 bg-card/65 p-4 backdrop-blur-md"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-sm font-black text-primary">
                Collection Progress
              </p>
              <p className="text-[11px] text-muted-foreground">
                {uniqueOwnedCount} / {totalCards || '—'} discovered
              </p>
            </div>

            <div className="text-right">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Highest
              </p>
              <p className="text-xs font-black text-foreground">
                {highestRarity}
              </p>
            </div>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-muted/60">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-blue-400 via-primary to-purple-400"
              initial={{ width: 0 }}
              animate={{ width: `${collectionPercent}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            />
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="mt-4 rounded-3xl border border-primary/25 bg-card/65 p-4 shadow-xl backdrop-blur-md"
        >
          <Link to="/shop" className="group flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/35 bg-primary/10 shadow-[0_0_20px_rgba(250,189,50,0.14)]">
              <ShoppingBag className="h-7 w-7 text-primary" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-primary/75">
                Market
              </p>

              <h2 className="font-display text-lg font-black text-primary">
                Veil Shop
              </h2>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Summons, packs, tickets, stamina items, and event bundles.
              </p>
            </div>

            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
          </Link>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.17 }}
          className="mt-4 rounded-3xl border border-indigo-400/30 bg-indigo-500/10 p-4 shadow-xl backdrop-blur-md"
        >
          <button
            type="button"
            onClick={() =>
              window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer')
            }
            className="group flex w-full items-center gap-4 text-left"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/35 bg-indigo-500/15 shadow-[0_0_20px_rgba(99,102,241,0.16)]">
              <MessageCircle className="h-7 w-7 text-indigo-300" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-[10px] uppercase tracking-[0.25em] text-indigo-200/80">
                Community
              </p>

              <h2 className="font-display text-lg font-black text-primary">
                Join the Discord
              </h2>

              <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                Get updates, report bugs, talk trades, and follow alpha events.
              </p>
            </div>

            <ExternalLink className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
          </button>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="mt-4 grid grid-cols-2 gap-3"
        >
          {quickActions.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.04 }}
            >
              <Link
                to={item.path}
                className={`group block rounded-3xl border p-4 backdrop-blur-md transition-all hover:scale-[1.02] hover:brightness-110 ${item.className}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    <item.icon className={`h-6 w-6 ${item.iconClass}`} />
                  </div>

                  <ChevronRight className="mt-1 h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                </div>

                <p className="mt-3 font-display text-sm font-black text-foreground">
                  {item.label}
                </p>

                <p className="mt-1 text-[11px] text-muted-foreground">
                  {item.desc}
                </p>
              </Link>
            </motion.div>
          ))}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.24 }}
          className="mt-4 rounded-3xl border border-border/70 bg-card/55 p-3 backdrop-blur-md"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="font-display text-sm font-black text-primary">
              More to Do
            </p>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Coins className="h-3.5 w-3.5 text-yellow-300" />
              {formatNumber(profile?.gold)}
              <Gem className="ml-1 h-3.5 w-3.5 text-blue-300" />
              {formatNumber(profile?.gems)}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {secondaryActions.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 rounded-2xl border border-border/60 bg-background/35 p-3 transition-all hover:border-primary/40 hover:bg-primary/10"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/50">
                  <item.icon className={`h-4 w-4 ${item.iconClass}`} />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-xs font-black text-foreground">
                    {item.label}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </motion.section>

        <p className="mt-5 text-center text-[10px] uppercase tracking-[0.25em] text-muted-foreground/70">
          Closed Alpha Build
        </p>
      </div>
    </div>
  );
}