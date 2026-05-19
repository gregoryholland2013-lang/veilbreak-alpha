import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Zap, RotateCcw, Trophy } from 'lucide-react';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';
import {
  useCards,
  usePlayerCards,
  useDecks,
  useProfile,
  useUpdateProfile,
} from '@/hooks/useGameData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import Leaderboard from '@/components/battle/Leaderboard';
import BattleScreen from '@/components/battle/BattleScreen';

const STAMINA_COST = 10;

export default function Battle() {
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: decks = [] } = useDecks();
  const { data: profile } = useProfile();

  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [view, setView] = useState('leaderboard'); // leaderboard | battle | result
  const [currentOpponent, setCurrentOpponent] = useState(null);
  const [lastResult, setLastResult] = useState(null); // { won, goldReward, xpReward }

  /**
   * Supabase Realtime
   * Keeps PvP leaderboard, deck power, and card power reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('battle-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
          queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'decks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['decks'] });
          queryClient.invalidateQueries({ queryKey: ['allDecks'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_cards',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerCards'] });
          queryClient.invalidateQueries({ queryKey: ['allPlayerCards'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: allProfiles = [], isLoading: loadingProfiles } = useQuery({
    queryKey: ['allProfiles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('wins', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: allDecks = [] } = useQuery({
    queryKey: ['allDecks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: allPlayerCards = [] } = useQuery({
    queryKey: ['allPlayerCards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const activeDeck = useMemo(() => {
    return decks.find((d) => d.is_active);
  }, [decks]);

  const myDeckCards = useMemo(() => {
    if (!activeDeck) return [];

    return (activeDeck.card_ids || [])
      .map((pcId) => {
        const pc = playerCards.find((p) => p.id === pcId);
        if (!pc) return null;

        const card = cards.find((c) => c.id === pc.card_id);
        return card ? { card, playerCard: pc } : null;
      })
      .filter(Boolean);
  }, [activeDeck, playerCards, cards]);

  const calcPower = (deckCardIds = [], playerCardList = [], masterCards = []) => {
    return playerCardList
      .filter((pc) => deckCardIds.includes(pc.id))
      .reduce((sum, pc) => {
        const card = masterCards.find((c) => c.id === pc.card_id);

        if (!card) return sum;

        const level = pc.level || 1;
        const mult = 1 + (level - 1) * 0.1;

        return (
          sum +
          ((card.base_attack || 0) * mult +
            (card.base_defense || 0) * mult +
            (card.base_hp || 0) * mult)
        );
      }, 0);
  };

  const myDeckPower = useMemo(() => {
    if (!activeDeck) return 0;
    return calcPower(activeDeck.card_ids || [], playerCards, cards);
  }, [activeDeck, playerCards, cards]);

  const opponents = useMemo(() => {
    return allProfiles
      .filter((p) => p.id !== profile?.id)
      .map((p) => {
        /**
         * Supabase version uses user_id instead of Base44 created_by.
         */
        const theirActiveDeck = allDecks.find(
          (d) => d.user_id === p.user_id && d.is_active
        );

        const theirCards = allPlayerCards.filter(
          (pc) => pc.user_id === p.user_id
        );

        const realPower = theirActiveDeck
          ? Math.round(
              calcPower(theirActiveDeck.card_ids || [], theirCards, cards)
            )
          : 0;

        const deckPower =
          realPower > 0
            ? realPower
            : Math.round((p.level || 1) * 120 + (p.wins || 0) * 8);

        return {
          ...p,
          deckPower,
          activeDeck: theirActiveDeck,
        };
      })
      .sort((a, b) => (b.wins || 0) - (a.wins || 0));
  }, [allProfiles, allDecks, allPlayerCards, cards, profile]);

  const handleChallenge = (opponent) => {
    if (!activeDeck || myDeckCards.length === 0) {
      toast.error('Set an active deck first!');
      return;
    }

    if (!profile || profile.stamina < STAMINA_COST) {
      toast.error('Not enough stamina!');
      return;
    }

    setCurrentOpponent(opponent);
    setLastResult(null);
    setView('battle');
  };

  const handleBattleFinish = async (won) => {
    if (!profile) return;

    const goldReward = won ? Math.round(80 + Math.random() * 120) : 15;
    const xpReward = won ? 40 : 10;

    setLastResult({ won, goldReward, xpReward });

    const newXp = (profile.experience || 0) + xpReward;
    const xpForLevel = (profile.level || 1) * 100;
    const levelUp = newXp >= xpForLevel;

    await updateProfile.mutateAsync({
      id: profile.id,
      data: {
        stamina: Math.max(0, (profile.stamina || 0) - STAMINA_COST),
        gold: (profile.gold || 0) + goldReward,
        experience: levelUp ? newXp - xpForLevel : newXp,
        level: levelUp ? (profile.level || 1) + 1 : profile.level || 1,
        wins: won ? (profile.wins || 0) + 1 : profile.wins || 0,
        losses: won ? profile.losses || 0 : (profile.losses || 0) + 1,
      },
    });

    queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
    queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

    if (levelUp) {
      toast.success('🎉 Level Up!');
    }
  };

  const reset = () => {
    setView('leaderboard');
    setCurrentOpponent(null);
    setLastResult(null);
  };

  if (view === 'battle' && currentOpponent) {
    return (
      <div className="max-w-lg mx-auto">
        <PageHeader
          title={`vs ${
            currentOpponent.display_name ||
            currentOpponent.username ||
            currentOpponent.email ||
            'Opponent'
          }`}
        />

        <div className="px-4 py-4 space-y-4">
          <BattleScreen
            myDeckCards={myDeckCards}
            opponent={currentOpponent}
            onFinish={handleBattleFinish}
          />

          {lastResult && (
            <div className="space-y-3">
              <div
                className={`rounded-xl border p-4 flex items-center gap-4 ${
                  lastResult.won
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border bg-card'
                }`}
              >
                <Trophy
                  className={`w-8 h-8 flex-shrink-0 ${
                    lastResult.won
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                />

                <div className="flex-1">
                  <p className="font-display font-bold text-sm">
                    {lastResult.won ? 'Rewards Earned' : 'Consolation Prize'}
                  </p>

                  <p className="text-xs text-yellow-400">
                    +{lastResult.goldReward} Gold ·{' '}
                    <span className="text-blue-400">
                      +{lastResult.xpReward} XP
                    </span>
                  </p>
                </div>
              </div>

              <Button onClick={reset} className="w-full gap-2" variant="outline">
                <RotateCcw className="w-4 h-4" /> Back to Leaderboard
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PageHeader title="PvP Arena" />

      <div className="px-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-3 flex items-center gap-3">
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Your Active Deck</p>

            <p className="font-display font-bold text-sm">
              {activeDeck?.name || '— No deck set —'}
            </p>

            {myDeckPower > 0 && (
              <p className="text-[10px] text-muted-foreground">
                Power: {Math.round(myDeckPower)}
              </p>
            )}
          </div>

          <div className="text-right">
            <p className="text-xs flex items-center gap-1 justify-end text-muted-foreground">
              <Zap className="w-3 h-3 text-green-400" />{' '}
              {profile?.stamina ?? '—'} stamina
            </p>

            <p className="text-[10px] text-muted-foreground">
              {STAMINA_COST} per battle
            </p>
          </div>
        </div>

        {profile && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-lg border border-border p-2.5 text-center">
              <p className="text-lg font-bold font-display text-green-400">
                {profile.wins || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Wins</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2.5 text-center">
              <p className="text-lg font-bold font-display text-red-400">
                {profile.losses || 0}
              </p>
              <p className="text-[10px] text-muted-foreground">Losses</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2.5 text-center">
              <p className="text-lg font-bold font-display text-primary">
                {(profile.wins || 0) + (profile.losses || 0) > 0
                  ? Math.round(
                      ((profile.wins || 0) /
                        ((profile.wins || 0) + (profile.losses || 0))) *
                        100
                    )
                  : 0}
                %
              </p>
              <p className="text-[10px] text-muted-foreground">Win Rate</p>
            </div>
          </div>
        )}

        <Leaderboard
          opponents={opponents}
          myProfile={profile}
          onChallenge={handleChallenge}
          loading={loadingProfiles}
        />
      </div>
    </div>
  );
}