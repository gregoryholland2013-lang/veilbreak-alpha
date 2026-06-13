import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins, Gem, Ticket } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  useCards,
  useProfile,
  useCreatePlayerCard,
  useUpdateProfile,
} from '@/hooks/useGameData';
import { supabase } from '@/lib/supabaseClient';
import GameCard from '@/components/game/GameCard';
import PageHeader from '@/components/game/PageHeader';
import { toast } from 'sonner';

const SUMMON_COST_GOLD = 300;
const SUMMON_COST_GEMS = 5;

const DROP_RATES = [
  { rarity: 'legendary', rate: 0.03 },
  { rarity: 'epic', rate: 0.12 },
  { rarity: 'rare', rate: 0.25 },
  { rarity: 'common', rate: 0.60 },
];

function normalizeRarity(rarity) {
  return String(rarity || 'common').toLowerCase();
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

  return 'common';
}

export default function Summon() {
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: profile = null, isLoading: profileLoading } = useProfile();

  const createPlayerCard = useCreatePlayerCard();
  const updateProfile = useUpdateProfile();

  const summonLockRef = useRef(false);

  const [summoning, setSummoning] = useState(false);
  const [revealedCards, setRevealedCards] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [summonTickets, setSummonTickets] = useState(0);
  const [loadingTickets, setLoadingTickets] = useState(true);

  useEffect(() => {
    loadSummonTickets();
  }, []);

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
      console.error(error);
      setSummonTickets(0);
    } finally {
      setLoadingTickets(false);
    }
  }

  const activeCards = useMemo(() => {
    return (cards || []).filter((card) => {
      return (
        card.is_active !== false &&
        card.name &&
        card.image_url &&
        card.image_url.trim() !== '' &&
        card.evolution_stage === 'base' &&
        (card.evo_form === 'base' || !card.evo_form)
      );
    });
  }, [cards]);

  const randomPick = (excludedIds = new Set()) => {
    if (activeCards.length === 0) {
      return null;
    }

    const wantedRarity = pickRarity();

    let pool = activeCards.filter(
      (card) =>
        normalizeRarity(card.rarity) === wantedRarity &&
        !excludedIds.has(card.id)
    );

    if (pool.length === 0) {
      pool = activeCards.filter((card) => !excludedIds.has(card.id));
    }

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

  const doSummon = async (count, currency) => {
    if (summonLockRef.current) return;

    summonLockRef.current = true;
    setSummoning(true);
    setShowResults(false);
    setRevealedCards([]);

    try {
      if (profileLoading || cardsLoading || loadingTickets) {
        toast.error('Game data is still loading');
        return;
      }

      if (!profile) {
        toast.error('Profile has not loaded yet');
        return;
      }

      if (activeCards.length === 0) {
        toast.error('No active cards available to summon');
        return;
      }

      const totalGoldCost = SUMMON_COST_GOLD * count;
      const totalGemCost = SUMMON_COST_GEMS * count;
      const totalTicketCost = count;

      if (currency === 'gold' && (profile.gold || 0) < totalGoldCost) {
        toast.error('Not enough gold!');
        return;
      }

      if (currency === 'gems' && (profile.gems || 0) < totalGemCost) {
        toast.error('Not enough gems!');
        return;
      }

      if (currency === 'ticket' && summonTickets < totalTicketCost) {
        toast.error(
          `Not enough Summon Tickets. Need ${totalTicketCost}, you have ${summonTickets}.`
        );
        return;
      }

      if (currency === 'ticket') {
        await spendSummonTickets(totalTicketCost);
      }

      await new Promise((resolve) => setTimeout(resolve, 900));

      const pulled = [];
      const usedCardIds = new Set();

      for (let i = 0; i < count; i += 1) {
        const card = randomPick(usedCardIds);

        if (!card) {
          throw new Error('No card could be selected');
        }

        usedCardIds.add(card.id);

        const playerCard = await createPlayerCard.mutateAsync({
          card_id: card.id,
          level: 1,
          experience: 0,
          evolution_stage: card.evo_form || 'base',
          skill_level: card.skill_name ? 1 : 0,
          attack: card.base_attack || 100,
          defense: card.base_defense || 100,
          hp: card.base_hp || 300,
          max_hp: card.base_hp || 300,
          locked: false,
          is_protected: false,
        });

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

      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['playerCards'] });
      await queryClient.invalidateQueries({ queryKey: ['playerItems'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });

      if (currency !== 'ticket') {
        await loadSummonTickets();
      }

      setRevealedCards(pulled);
      setShowResults(true);

      if (currency === 'ticket') {
        toast.success(
          count === 1
            ? 'Card summoned with Summon Ticket!'
            : `${count} cards summoned with Summon Tickets!`
        );
      } else {
        toast.success(
          count === 1 ? 'Card summoned!' : `${count} cards summoned!`
        );
      }
    } catch (error) {
      console.error('Summon failed:', error);
      toast.error(error.message || 'Summon failed');
      await loadSummonTickets();
    } finally {
      summonLockRef.current = false;
      setSummoning(false);
    }
  };

  const isLoading = cardsLoading || profileLoading || loadingTickets;
  const canUseTicketSingle = summonTickets >= 1;
  const canUseTicketTen = summonTickets >= 10;

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PageHeader title="Summon Portal" />

      <div className="px-4 space-y-6">
        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Loading summon portal…
          </div>
        )}

        {!isLoading && activeCards.length === 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-center text-sm text-muted-foreground">
            No active cards are available. Add active base cards with artwork in
            Supabase first.
          </div>
        )}

        <motion.div
          className="relative mx-auto w-64 h-64 flex items-center justify-center"
          animate={summoning ? { rotate: 360 } : {}}
          transition={
            summoning
              ? { duration: 2, repeat: Infinity, ease: 'linear' }
              : {}
          }
        >
          <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
          <div className="absolute inset-4 rounded-full border border-accent/30" />
          <div className="absolute inset-8 rounded-full border border-primary/10" />
          <div
            className={`absolute inset-0 rounded-full ${
              summoning ? 'bg-primary/10 animate-pulse' : ''
            }`}
          />

          <Sparkles
            className={`w-16 h-16 ${
              summoning
                ? 'text-primary animate-pulse'
                : 'text-muted-foreground'
            }`}
          />
        </motion.div>

        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Gold</p>
            <p className="font-display font-bold text-yellow-400">
              {(profile?.gold || 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Gems</p>
            <p className="font-display font-bold text-blue-300">
              {(profile?.gems || 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-purple-400/40 bg-purple-950/20 p-3 text-center">
            <p className="text-xs text-muted-foreground">Tickets</p>
            <p className="font-display font-bold text-purple-300">
              {Number(summonTickets || 0).toLocaleString()}
            </p>
          </div>
        </div>

        {!showResults && (
          <div className="space-y-3">
            <div className="rounded-xl border border-purple-400/30 bg-purple-950/20 p-3 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-display font-bold text-purple-200">
                    Summon Tickets
                  </p>
                  <p className="text-xs text-muted-foreground">
                    1 ticket = 1 summon. Tickets are consumed before gold or
                    gems.
                  </p>
                </div>

                <div className="w-10 h-10 rounded-xl bg-purple-400/10 border border-purple-400/30 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-purple-300" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button
                  onClick={() => doSummon(1, 'ticket')}
                  disabled={
                    summoning ||
                    isLoading ||
                    activeCards.length === 0 ||
                    !canUseTicketSingle
                  }
                  className="gap-2 bg-gradient-to-r from-purple-600 to-fuchsia-700 hover:from-purple-500 hover:to-fuchsia-600 text-white disabled:from-slate-700 disabled:to-slate-700"
                  size="lg"
                >
                  <Ticket className="w-5 h-5" />
                  {summoning ? 'Summoning…' : 'x1 · 1 Ticket'}
                </Button>

                <Button
                  onClick={() => doSummon(10, 'ticket')}
                  disabled={
                    summoning ||
                    isLoading ||
                    activeCards.length === 0 ||
                    !canUseTicketTen
                  }
                  className="gap-2 bg-gradient-to-r from-fuchsia-700 to-purple-800 hover:from-fuchsia-600 hover:to-purple-700 text-white disabled:from-slate-700 disabled:to-slate-700"
                  size="lg"
                >
                  <Ticket className="w-5 h-5" />
                  {summoning ? 'Summoning…' : 'x10 · 10 Tickets'}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => doSummon(1, 'gold')}
                disabled={summoning || isLoading || activeCards.length === 0}
                className="gap-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white"
                size="lg"
              >
                <Coins className="w-5 h-5" />
                {summoning ? 'Summoning…' : `x1 · ${SUMMON_COST_GOLD} Gold`}
              </Button>

              <Button
                onClick={() => doSummon(10, 'gold')}
                disabled={summoning || isLoading || activeCards.length === 0}
                className="gap-2 bg-gradient-to-r from-yellow-700 to-amber-800 hover:from-yellow-600 hover:to-amber-700 text-white"
                size="lg"
              >
                <Coins className="w-5 h-5" />
                {summoning
                  ? 'Summoning…'
                  : `x10 · ${SUMMON_COST_GOLD * 10} Gold`}
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={() => doSummon(3, 'gems')}
                disabled={summoning || isLoading || activeCards.length === 0}
                className="gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
                size="lg"
              >
                <Gem className="w-4 h-4" />
                {summoning ? 'Summoning…' : `x3 · ${SUMMON_COST_GEMS * 3}`}
              </Button>

              <Button
                onClick={() => doSummon(10, 'gems')}
                disabled={summoning || isLoading || activeCards.length === 0}
                className="gap-2 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white"
                size="lg"
              >
                <Gem className="w-4 h-4" />
                {summoning ? 'Summoning…' : `x10 · ${SUMMON_COST_GEMS * 10}`}
              </Button>

              <Button
                onClick={() => doSummon(25, 'gems')}
                disabled={summoning || isLoading || activeCards.length === 0}
                className="gap-2 bg-gradient-to-r from-purple-600 to-blue-800 hover:from-purple-500 hover:to-blue-700 text-white"
                size="lg"
              >
                <Gem className="w-4 h-4" />
                {summoning ? 'Summoning…' : `x25 · ${SUMMON_COST_GEMS * 25}`}
              </Button>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showResults && revealedCards.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <h2 className="font-display text-lg text-center text-primary">
                Cards Summoned!
              </h2>

              <div className="flex justify-center gap-4 flex-wrap">
                {revealedCards.map(({ card, playerCard }, i) => (
                  <motion.div
                    key={playerCard.id}
                    initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    transition={{ delay: i * 0.3, duration: 0.5 }}
                  >
                    <GameCard card={card} playerCard={playerCard} size="md" />
                  </motion.div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setShowResults(false);
                  setRevealedCards([]);
                  loadSummonTickets();
                }}
                variant="outline"
                className="w-full"
              >
                Summon Again
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-card rounded-xl border border-border p-4">
          <p className="text-xs font-semibold text-muted-foreground mb-2">
            Drop Rates
          </p>

          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <span className="block text-muted-foreground">Common</span>
              <span className="font-bold">60%</span>
            </div>

            <div>
              <span className="block text-blue-400">Rare</span>
              <span className="font-bold">25%</span>
            </div>

            <div>
              <span className="block text-purple-400">Epic</span>
              <span className="font-bold">12%</span>
            </div>

            <div>
              <span className="block text-primary">Legend</span>
              <span className="font-bold">3%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}