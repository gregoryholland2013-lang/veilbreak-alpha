import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Coins,
  Gem,
  Gift,
  Layers,
  RotateCcw,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  useCards,
  useCreatePlayerCard,
  usePlayerCards,
  useProfile,
  useUpdateProfile,
} from '@/hooks/useGameData';
import { supabase } from '@/lib/supabaseClient';
import GameCard from '@/components/game/GameCard';
import PageHeader from '@/components/game/PageHeader';
import {
  getCoreFormMeta,
  getVeilRankMeta,
  MAX_VEIL_MARKS,
} from '@/utils/cardCosmetics';
import { toast } from 'sonner';

const SUMMON_COST_GOLD = 300;
const SUMMON_COST_GEMS = 5;

const DROP_RATES = [
  { rarity: 'vessel', label: 'Vessel', rate: 0.6 },
  { rarity: 'awakened', label: 'Awakened', rate: 0.25 },
  { rarity: 'ascendant', label: 'Ascendant', rate: 0.1 },
  { rarity: 'exalted', label: 'Exalted', rate: 0.04 },
  { rarity: 'mythic', label: 'Mythic', rate: 0.01 },
];

function cleanText(value) {
  return String(value || '').trim();
}

function normalizeRarity(rarity) {
  return cleanText(rarity || 'Vessel').toLowerCase();
}

function normalizeForm(value) {
  const form = cleanText(value).toLowerCase();

  if (!form) return 'base';
  if (form === 'base form') return 'base';
  if (form === 'base+' || form === 'base plus') return 'base_plus';
  if (form === 'base++' || form === 'base plus plus') return 'base_plus_plus';
  if (form === 'final form') return 'final';

  return form;
}

function isActiveCard(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function pickRarity() {
  const roll = Math.random();
  let running = 0;

  for (const item of DROP_RATES) {
    running += item.rate;

    if (roll <= running) {
      return item.rarity;
    }
  }

  return 'vessel';
}

function prepareSummonCard(card) {
  const safeName =
    cleanText(card.name) ||
    cleanText(card.card_line) ||
    cleanText(card.full_card_name) ||
    cleanText(card.card_name);

  const safeRarity =
    cleanText(card.rarity) ||
    cleanText(card.rarity_tier) ||
    'Vessel';

  const safeForm = normalizeForm(card.evo_form || card.evolution_stage || 'base');

  return {
    ...card,
    name: safeName,
    rarity: safeRarity,
    evolution_stage: safeForm,
    evo_form: safeForm,
    image_url: cleanText(card.image_url),
  };
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function VeilMarkRow({ rank }) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: MAX_VEIL_MARKS }).map((_, index) => {
        const filled = index < rank.markCount;

        return (
          <span
            key={index}
            className={`h-2 w-2 rounded-full border ${
              filled ? rank.mark : rank.emptyMark
            }`}
          />
        );
      })}
    </div>
  );
}

function ResourceTile({ icon: Icon, label, value, className = '' }) {
  return (
    <div className={`rounded-2xl border border-border bg-card/80 p-3 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
          {label}
        </p>
        <Icon className="h-4 w-4 text-primary" />
      </div>

      <p className="mt-1 font-display text-xl font-black text-primary">
        {formatNumber(value)}
      </p>
    </div>
  );
}

function PortalRings({ summoning }) {
  return (
    <div className="relative mx-auto flex h-72 w-72 items-center justify-center">
      <motion.div
        className="absolute inset-0 rounded-full border border-primary/30"
        animate={
          summoning
            ? {
                rotate: 360,
                scale: [1, 1.04, 1],
              }
            : {
                rotate: 0,
                scale: 1,
              }
        }
        transition={
          summoning
            ? {
                rotate: { duration: 3.6, repeat: Infinity, ease: 'linear' },
                scale: { duration: 1.1, repeat: Infinity },
              }
            : {}
        }
      />

      <motion.div
        className="absolute inset-6 rounded-full border border-purple-400/35"
        animate={
          summoning
            ? {
                rotate: -360,
                scale: [1, 0.96, 1],
              }
            : {
                rotate: 0,
                scale: 1,
              }
        }
        transition={
          summoning
            ? {
                rotate: { duration: 2.6, repeat: Infinity, ease: 'linear' },
                scale: { duration: 1.3, repeat: Infinity },
              }
            : {}
        }
      />

      <motion.div
        className="absolute inset-12 rounded-full border border-primary/15 bg-primary/5"
        animate={
          summoning
            ? {
                boxShadow: [
                  '0 0 24px rgba(250,189,50,0.18)',
                  '0 0 70px rgba(250,189,50,0.42)',
                  '0 0 24px rgba(250,189,50,0.18)',
                ],
              }
            : {}
        }
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      <motion.div
        className="absolute h-32 w-32 rounded-full bg-gradient-to-br from-primary/20 via-purple-700/15 to-transparent blur-xl"
        animate={
          summoning
            ? {
                scale: [1, 1.35, 1],
                opacity: [0.45, 0.9, 0.45],
              }
            : {
                scale: 1,
                opacity: 0.45,
              }
        }
        transition={{ duration: 1.2, repeat: Infinity }}
      />

      <motion.div
        className="relative flex h-24 w-24 items-center justify-center rounded-full border border-primary/30 bg-background/60 shadow-2xl"
        animate={
          summoning
            ? {
                scale: [1, 1.1, 1],
              }
            : {}
        }
        transition={{ duration: 0.95, repeat: Infinity }}
      >
        <Sparkles
          className={`h-12 w-12 ${
            summoning ? 'text-primary' : 'text-muted-foreground'
          }`}
        />
      </motion.div>
    </div>
  );
}

function CardBack({ index, revealed, children }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 30, rotateY: 180 }}
      animate={{
        opacity: 1,
        y: 0,
        rotateY: revealed ? 0 : 180,
      }}
      transition={{ duration: 0.55, delay: Math.min(index * 0.08, 0.5) }}
      className="relative"
      style={{ transformStyle: 'preserve-3d' }}
    >
      {revealed ? (
        children
      ) : (
        <div className="flex h-56 w-40 items-center justify-center overflow-hidden rounded-xl border-2 border-primary/40 bg-gradient-to-b from-purple-950 via-slate-950 to-black shadow-[0_0_24px_rgba(250,189,50,0.25)]">
          <div className="absolute inset-2 rounded-lg border border-primary/15" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'linear' }}
            className="flex h-20 w-20 items-center justify-center rounded-full border border-primary/30"
          >
            <Sparkles className="h-9 w-9 text-primary" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

function RevealOverlay({
  open,
  phase,
  pulled,
  revealCount,
  summoning,
  onSkip,
  onClose,
  onSummonAgain,
}) {
  const firstPull = pulled?.[0];
  const firstRank = firstPull ? getVeilRankMeta(firstPull.card) : null;
  const allRevealed = pulled.length > 0 && revealCount >= pulled.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[10050] overflow-y-auto bg-background/90 px-4 py-6 backdrop-blur-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="pointer-events-none fixed inset-0">
            <div className="absolute left-1/2 top-1/3 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl" />
            <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" />
          </div>

          <div className="relative mx-auto flex min-h-full max-w-6xl flex-col items-center justify-center">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card/80 text-muted-foreground hover:text-foreground"
              aria-label="Close reveal"
            >
              <X className="h-4 w-4" />
            </button>

            {phase !== 'cards' && (
              <div className="text-center">
                <PortalRings summoning />

                <motion.p
                  animate={{ opacity: [0.45, 1, 0.45] }}
                  transition={{ duration: 1.1, repeat: Infinity }}
                  className="mt-5 text-[11px] font-black uppercase tracking-[0.32em] text-primary"
                >
                  {phase === 'flash' ? 'The Veil Breaks' : 'Opening the Veil'}
                </motion.p>

                <h2 className="mt-2 font-display text-4xl font-black text-primary text-glow-gold md:text-6xl">
                  SUMMONING
                </h2>
              </div>
            )}

            {phase === 'flash' && (
              <motion.div
                className="fixed inset-0 bg-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.85, 0] }}
                transition={{ duration: 0.55 }}
              />
            )}

            {phase === 'cards' && (
              <div className="w-full space-y-6">
                <div className="text-center">
                  <p className="text-[11px] font-black uppercase tracking-[0.32em] text-primary">
                    Veil Summon Result
                  </p>

                  <h2 className="mt-2 font-display text-4xl font-black text-primary text-glow-gold md:text-6xl">
                    CARDS OBTAINED
                  </h2>

                  {firstRank && (
                    <div className="mt-3 flex flex-col items-center justify-center gap-2">
                      <p className={`text-xs font-black uppercase tracking-[0.25em] ${firstRank.accentText}`}>
                        Highest Reveal: {firstRank.label}
                      </p>
                      <VeilMarkRow rank={firstRank} />
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap justify-center gap-5">
                  {pulled.map(({ card, playerCard, isNew }, index) => {
                    const revealed = index < revealCount;
                    const rank = getVeilRankMeta(card);
                    const form = getCoreFormMeta(playerCard, card);

                    return (
                      <CardBack
                        key={playerCard.id || `${card.id}-${index}`}
                        index={index}
                        revealed={revealed}
                      >
                        <div className="relative">
                          <GameCard
                            card={card}
                            playerCard={playerCard}
                            size="md"
                            showProtectionBadge={false}
                          />

                          {isNew ? (
                            <div className="absolute -left-2 -top-2 z-40 rounded-full border border-emerald-300/60 bg-emerald-500 px-2.5 py-1 text-[10px] font-black text-white shadow-lg">
                              NEW
                            </div>
                          ) : (
                            <div className="absolute -left-2 -top-2 z-40 rounded-full border border-primary/50 bg-black/80 px-2.5 py-1 text-[10px] font-black text-primary shadow-lg">
                              DUPLICATE
                            </div>
                          )}

                          <div className="mt-3 rounded-2xl border border-border bg-card/80 p-3 text-center">
                            <p className={`font-display text-sm font-black ${rank.accentText}`}>
                              {rank.label}
                            </p>

                            <p className="text-[10px] text-muted-foreground">
                              {form.pill}
                              {!isNew ? ' · Evolution material' : ' · Archive updated'}
                            </p>
                          </div>
                        </div>
                      </CardBack>
                    );
                  })}
                </div>

                <div className="mx-auto flex max-w-xl flex-col gap-3 sm:flex-row">
                  {!allRevealed && (
                    <Button onClick={onSkip} variant="outline" className="flex-1">
                      Reveal All
                    </Button>
                  )}

                  {allRevealed && (
                    <>
                      <Button onClick={onSummonAgain} className="flex-1 gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Summon Again
                      </Button>

                      <Link to="/collection" className="flex-1">
                        <Button variant="outline" className="w-full gap-2">
                          <Layers className="h-4 w-4" />
                          View Collection
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Summon() {
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: profile = null, isLoading: profileLoading } = useProfile();
  const { data: playerCards = [], isLoading: playerCardsLoading } = usePlayerCards();

  const createPlayerCard = useCreatePlayerCard();
  const updateProfile = useUpdateProfile();

  const summonLockRef = useRef(false);

  const [summoning, setSummoning] = useState(false);
  const [revealedCards, setRevealedCards] = useState([]);
  const [summonTickets, setSummonTickets] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(true);

  const [revealOpen, setRevealOpen] = useState(false);
  const [revealPhase, setRevealPhase] = useState('idle'); // idle | charging | flash | cards
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    loadSummonTickets();
  }, []);

  useEffect(() => {
    if (!revealOpen || revealPhase !== 'cards' || revealedCards.length === 0) {
      return undefined;
    }

    if (revealCount >= revealedCards.length) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setRevealCount((value) => Math.min(value + 1, revealedCards.length));
    }, revealCount === 0 ? 450 : 360);

    return () => window.clearTimeout(timer);
  }, [revealOpen, revealPhase, revealCount, revealedCards.length]);

  async function loadSummonTickets() {
    setLoadingTickets(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setSummonTickets(0);
        return;
      }

      const { data, error } = await supabase
        .from('player_items')
        .select('quantity')
        .eq('user_id', user.id)
        .eq('item_key', 'summon_ticket')
        .maybeSingle();

      if (error) throw error;

      setSummonTickets(Number(data?.quantity || 0));
    } catch (error) {
      console.error('Failed to load summon tickets:', error);
      setSummonTickets(0);
    } finally {
      setLoadingTickets(false);
    }
  }

  const activeCards = useMemo(() => {
    return (cards || [])
      .map(prepareSummonCard)
      .filter((card) => {
        return (
          isActiveCard(card.is_active) &&
          card.name &&
          card.image_url &&
          card.evolution_stage === 'base'
        );
      });
  }, [cards]);

  const ownedCardIds = useMemo(() => {
    return new Set((playerCards || []).map((item) => item.card_id));
  }, [playerCards]);

  const randomPick = () => {
    if (activeCards.length === 0) {
      return null;
    }

    const wantedRarity = pickRarity();

    let pool = activeCards.filter((card) => {
      return normalizeRarity(card.rarity) === wantedRarity;
    });

    if (pool.length === 0) {
      pool = activeCards;
    }

    return pool[Math.floor(Math.random() * pool.length)];
  };

  const spendSummonTickets = async (count) => {
    const { data, error } = await supabase.rpc('spend_player_item', {
      p_item_key: 'summon_ticket',
      p_quantity: count,
    });

    if (error) throw error;

    setSummonTickets(Number(data?.remaining || 0));

    return data;
  };

  const closeReveal = () => {
    if (summoning) return;

    setRevealOpen(false);
    setRevealPhase('idle');
    setRevealCount(0);
  };

  const resetForSummonAgain = () => {
    setRevealOpen(false);
    setRevealPhase('idle');
    setRevealCount(0);
    setRevealedCards([]);
    loadSummonTickets();
  };

  const doSummon = async (count, currency) => {
    if (summonLockRef.current) return;

    summonLockRef.current = true;
    setSummoning(true);
    setRevealedCards([]);
    setRevealCount(0);
    setRevealOpen(true);
    setRevealPhase('charging');

    try {
      if (profileLoading || cardsLoading || loadingTickets || playerCardsLoading) {
        toast.error('Game data is still loading');
        setRevealOpen(false);
        return;
      }

      if (!profile) {
        toast.error('Profile has not loaded yet');
        setRevealOpen(false);
        return;
      }

      if (activeCards.length === 0) {
        toast.error('No active cards available to summon');
        setRevealOpen(false);
        return;
      }

      const totalGoldCost = SUMMON_COST_GOLD * count;
      const totalGemCost = SUMMON_COST_GEMS * count;
      const totalTicketCost = count;

      if (currency === 'gold' && (profile.gold || 0) < totalGoldCost) {
        toast.error('Not enough gold!');
        setRevealOpen(false);
        return;
      }

      if (currency === 'gems' && (profile.gems || 0) < totalGemCost) {
        toast.error('Not enough gems!');
        setRevealOpen(false);
        return;
      }

      if (currency === 'ticket' && summonTickets < totalTicketCost) {
        toast.error(
          `Not enough Summon Tickets. Need ${totalTicketCost}, you have ${summonTickets}.`
        );
        setRevealOpen(false);
        return;
      }

      if (currency === 'ticket') {
        await spendSummonTickets(totalTicketCost);
      }

      await new Promise((resolve) => setTimeout(resolve, 900));

      const pulled = [];
      const newlySeenDuringPull = new Set();

      for (let i = 0; i < count; i += 1) {
        const card = randomPick();

        if (!card) {
          throw new Error('No card could be selected');
        }

        const wasOwnedBefore =
          ownedCardIds.has(card.id) || newlySeenDuringPull.has(card.id);

        const playerCard = await createPlayerCard.mutateAsync({
          card_id: card.id,
          level: 1,
          experience: 0,
          evolution_stage: 'base',
          skill_level: card.skill_name ? 1 : 0,
          attack: card.base_attack || 100,
          defense: card.base_defense || 100,
          hp: card.base_hp || 300,
          max_hp: card.base_hp || 300,
          locked: false,
          is_protected: false,
        });

        newlySeenDuringPull.add(card.id);

        const { error: collectionError } = await supabase.rpc(
          'record_card_collection_pull',
          {
            p_card_id: card.id,
          }
        );

        if (collectionError) {
          console.warn('Collection archive update failed:', collectionError);
        }

        pulled.push({
          card,
          playerCard,
          isNew: !wasOwnedBefore,
        });
      }

      if (currency === 'gold') {
        await updateProfile.mutateAsync({
          id: profile.id,
          data: {
            gold: (profile.gold || 0) - totalGoldCost,
          },
        });
      }

      if (currency === 'gems') {
        await updateProfile.mutateAsync({
          id: profile.id,
          data: {
            gems: (profile.gems || 0) - totalGemCost,
          },
        });
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
        queryClient.invalidateQueries({ queryKey: ['playerItems'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);

      if (currency !== 'ticket') {
        await loadSummonTickets();
      }

      setRevealedCards(pulled);
      setRevealPhase('flash');

      await new Promise((resolve) => setTimeout(resolve, 550));

      setRevealPhase('cards');
      setRevealCount(0);

      toast.success(
        currency === 'ticket'
          ? count === 1
            ? 'Card delivered from the Veil with a Summon Ticket!'
            : `${count} cards delivered from the Veil with Summon Tickets!`
          : count === 1
            ? 'Card delivered from the Veil!'
            : `${count} cards delivered from the Veil!`
      );
    } catch (error) {
      console.error('Summon failed:', error);
      toast.error(error.message || 'Summon failed');
      await loadSummonTickets();
      setRevealOpen(false);
      setRevealPhase('idle');
    } finally {
      summonLockRef.current = false;
      setSummoning(false);
    }
  };

  const isLoading =
    cardsLoading || profileLoading || loadingTickets || playerCardsLoading;

  const canUseTicketSingle = summonTickets >= 1;
  const canUseTicketTen = summonTickets >= 10;
  const busy = summoning || revealOpen;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-purple-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <PageHeader title="Summon Portal" subtitle="Open the Veil" />

        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />
          <div className="absolute right-10 top-1/2 hidden h-64 w-64 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl md:block" />

          <div className="relative grid gap-6 p-6 md:grid-cols-[1fr_340px] md:p-8">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
                <Sparkles className="h-4 w-4" />
                Veil Ritual
              </div>

              <h1 className="mt-3 font-display text-4xl font-black text-primary text-glow-gold md:text-6xl">
                SUMMON PORTAL
              </h1>

              <p className="mt-3 max-w-3xl text-muted-foreground">
                Open the Veil to discover new cards. New cards update your
                collection archive, while duplicates become evolution material.
              </p>

              <div className="mt-5 grid grid-cols-3 gap-3">
                <ResourceTile icon={Coins} label="Gold" value={profile?.gold || 0} />
                <ResourceTile icon={Gem} label="Gems" value={profile?.gems || 0} />
                <ResourceTile
                  icon={Ticket}
                  label="Tickets"
                  value={summonTickets || 0}
                  className="border-purple-400/35 bg-purple-950/20"
                />
              </div>
            </div>

            <div className="flex items-center justify-center">
              <PortalRings summoning={busy} />
            </div>
          </div>
        </section>

        {isLoading && (
          <div className="rounded-3xl border border-border bg-card/80 p-5 text-center text-sm text-muted-foreground">
            Loading summon portal…
          </div>
        )}

        {!isLoading && activeCards.length === 0 && (
          <div className="rounded-3xl border border-destructive/40 bg-destructive/5 p-5 text-center text-sm text-muted-foreground">
            No active cards are available. Add active base cards with artwork in
            Supabase first.
          </div>
        )}

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="space-y-6 xl:col-span-8">
            <div className="rounded-3xl border border-primary/30 bg-card/90 shadow-2xl">
              <div className="border-b border-primary/20 bg-primary/5 p-5">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                  <Gift className="h-4 w-4" />
                  Portal Access
                </p>

                <h2 className="mt-2 font-display text-2xl font-black">
                  Choose Summon Method
                </h2>
              </div>

              <div className="space-y-4 p-5">
                <div className="rounded-3xl border border-purple-400/30 bg-purple-950/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-display text-lg font-black text-purple-200">
                        Summon Tickets
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Ticket summons are consumed before gold or gems.
                      </p>
                    </div>

                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-purple-400/30 bg-purple-400/10">
                      <Ticket className="h-6 w-6 text-purple-300" />
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <Button
                      onClick={() => doSummon(1, 'ticket')}
                      disabled={busy || isLoading || activeCards.length === 0 || !canUseTicketSingle}
                      className="h-12 gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-700 text-white hover:from-purple-500 hover:to-fuchsia-600 disabled:from-slate-700 disabled:to-slate-700"
                    >
                      <Ticket className="h-5 w-5" />
                      x1 · 1 Ticket
                    </Button>

                    <Button
                      onClick={() => doSummon(10, 'ticket')}
                      disabled={busy || isLoading || activeCards.length === 0 || !canUseTicketTen}
                      className="h-12 gap-2 bg-gradient-to-r from-fuchsia-700 to-purple-800 text-white hover:from-fuchsia-600 hover:to-purple-700 disabled:from-slate-700 disabled:to-slate-700"
                    >
                      <Ticket className="h-5 w-5" />
                      x10 · 10 Tickets
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    onClick={() => doSummon(1, 'gold')}
                    disabled={busy || isLoading || activeCards.length === 0}
                    className="h-12 gap-2 bg-gradient-to-r from-yellow-600 to-yellow-700 text-white hover:from-yellow-500 hover:to-yellow-600"
                  >
                    <Coins className="h-5 w-5" />
                    x1 · {SUMMON_COST_GOLD} Gold
                  </Button>

                  <Button
                    onClick={() => doSummon(10, 'gold')}
                    disabled={busy || isLoading || activeCards.length === 0}
                    className="h-12 gap-2 bg-gradient-to-r from-yellow-700 to-amber-800 text-white hover:from-yellow-600 hover:to-amber-700"
                  >
                    <Coins className="h-5 w-5" />
                    x10 · {formatNumber(SUMMON_COST_GOLD * 10)} Gold
                  </Button>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <Button
                    onClick={() => doSummon(3, 'gems')}
                    disabled={busy || isLoading || activeCards.length === 0}
                    className="h-12 gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-500 hover:to-blue-600"
                  >
                    <Gem className="h-4 w-4" />
                    x3 · {SUMMON_COST_GEMS * 3}
                  </Button>

                  <Button
                    onClick={() => doSummon(10, 'gems')}
                    disabled={busy || isLoading || activeCards.length === 0}
                    className="h-12 gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 text-white hover:from-cyan-500 hover:to-blue-600"
                  >
                    <Gem className="h-4 w-4" />
                    x10 · {SUMMON_COST_GEMS * 10}
                  </Button>

                  <Button
                    onClick={() => doSummon(25, 'gems')}
                    disabled={busy || isLoading || activeCards.length === 0}
                    className="h-12 gap-2 bg-gradient-to-r from-purple-600 to-blue-800 text-white hover:from-purple-500 hover:to-blue-700"
                  >
                    <Gem className="h-4 w-4" />
                    x25 · {SUMMON_COST_GEMS * 25}
                  </Button>
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <section className="rounded-3xl border border-yellow-500/30 bg-card/90 shadow-2xl">
              <div className="border-b border-yellow-500/20 bg-yellow-500/5 p-5">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                  <Sparkles className="h-4 w-4" />
                  Rank Odds
                </p>

                <h3 className="mt-2 font-display text-2xl font-black">
                  Veil Marks
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Summons determine Veil Rank. Evolution happens later through
                  Enhance.
                </p>
              </div>

              <div className="space-y-3 p-5">
                {DROP_RATES.map((item) => {
                  const rank = getVeilRankMeta({ rarity: item.rarity });

                  return (
                    <div
                      key={item.rarity}
                      className="rounded-2xl border border-border bg-background/50 p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className={`font-display text-sm font-black ${rank.accentText}`}>
                            {item.label}
                          </p>

                          <div className="mt-1">
                            <VeilMarkRow rank={rank} />
                          </div>
                        </div>

                        <p className="font-display text-lg font-black text-primary">
                          {Math.round(item.rate * 100)}%
                        </p>
                      </div>
                    </div>
                  );
                })}

                <Link to="/collection">
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 transition-all hover:bg-primary/15">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-display font-black text-primary">
                          View Collection
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Check new cards and duplicates.
                        </p>
                      </div>

                      <ArrowRight className="h-4 w-4 text-primary" />
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>

      <RevealOverlay
        open={revealOpen}
        phase={revealPhase}
        pulled={revealedCards}
        revealCount={revealCount}
        summoning={summoning}
        onSkip={() => setRevealCount(revealedCards.length)}
        onClose={closeReveal}
        onSummonAgain={resetForSummonAgain}
      />
    </div>
  );
}
