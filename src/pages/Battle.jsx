import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Zap,
  Trophy,
  Swords,
  Shield,
  Heart,
  RotateCcw,
  Target,
} from 'lucide-react';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';
import {
  useCards,
  usePlayerCards,
  useDecks,
  useProfile,
} from '@/hooks/useGameData';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

const ATTACK_COST = 10;

const DEFAULT_NO_DECK_STATS = {
  attack: 50,
  defense: 50,
  hp: 250,
  cardCount: 0,
  hasDeck: false,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rollMultiplier() {
  return 0.9 + Math.random() * 0.2;
}

function statRange(value) {
  return {
    low: Math.floor((value || 0) * 0.9),
    high: Math.ceil((value || 0) * 1.1),
  };
}

function formatRange(value) {
  const range = statRange(value);

  return `${range.low.toLocaleString()}–${range.high.toLocaleString()}`;
}

function calcDeckStats(deck, playerCardList = [], masterCards = []) {
  if (!deck || !Array.isArray(deck.card_ids) || deck.card_ids.length === 0) {
    return {
      ...DEFAULT_NO_DECK_STATS,
      power: Math.round(
        DEFAULT_NO_DECK_STATS.attack +
          DEFAULT_NO_DECK_STATS.defense +
          DEFAULT_NO_DECK_STATS.hp * 0.25
      ),
    };
  }

  const deckCards = deck.card_ids
    .map((pcId) => {
      const pc = playerCardList.find((p) => p.id === pcId);

      if (!pc) return null;

      const card = masterCards.find((c) => c.id === pc.card_id);

      return {
        playerCard: pc,
        card,
      };
    })
    .filter(Boolean);

  if (deckCards.length === 0) {
    return {
      ...DEFAULT_NO_DECK_STATS,
      power: Math.round(
        DEFAULT_NO_DECK_STATS.attack +
          DEFAULT_NO_DECK_STATS.defense +
          DEFAULT_NO_DECK_STATS.hp * 0.25
      ),
    };
  }

  const attack = deckCards.reduce((sum, item) => {
    const pc = item.playerCard;
    const card = item.card;

    return sum + (pc.attack ?? card?.base_attack ?? 0);
  }, 0);

  const defense = deckCards.reduce((sum, item) => {
    const pc = item.playerCard;
    const card = item.card;

    return sum + (pc.defense ?? card?.base_defense ?? 0);
  }, 0);

  const hp = deckCards.reduce((sum, item) => {
    const pc = item.playerCard;
    const card = item.card;

    return sum + (pc.hp ?? pc.max_hp ?? card?.base_hp ?? 0);
  }, 0);

  const power = Math.round(attack + defense + hp * 0.25);

  return {
    attack,
    defense,
    hp,
    power,
    cardCount: deckCards.length,
    hasDeck: true,
  };
}

function estimateAttackerWinPoints(attackerStats, defenderStats) {
  const defenderStrengthPoints = Math.round((defenderStats.power || 0) / 350);

  const noDeckPenalty = defenderStats.hasDeck ? 0 : -4;

  const underdogBonus =
    attackerStats.power < defenderStats.power
      ? Math.round((defenderStats.power - attackerStats.power) / 250)
      : 0;

  return clamp(2 + defenderStrengthPoints + underdogBonus + noDeckPenalty, 1, 75);
}

function estimateDefenderWinPoints(attackerStats, defenderStats) {
  const attackerStrengthPoints = Math.round((attackerStats.power || 0) / 300);

  const defenderUnderdogBonus =
    defenderStats.power < attackerStats.power
      ? Math.round((attackerStats.power - defenderStats.power) / 250)
      : 0;

  return clamp(4 + attackerStrengthPoints + defenderUnderdogBonus, 3, 90);
}

function resolveBattle(attackerStats, defenderStats) {
  const attackerBattlePower =
    (attackerStats.attack || 0) * rollMultiplier() +
    (attackerStats.hp || 0) * 0.25;

  const defenderBattlePower =
    (defenderStats.defense || 0) * rollMultiplier() +
    (defenderStats.hp || 0) * 0.25;

  const attackerWon = attackerBattlePower >= defenderBattlePower;

  const attackerPoints = attackerWon
    ? estimateAttackerWinPoints(attackerStats, defenderStats)
    : 0;

  const defenderPoints = attackerWon
    ? 0
    : estimateDefenderWinPoints(attackerStats, defenderStats);

  const goldReward = attackerWon
    ? clamp(Math.round(25 + defenderStats.power / 60), 25, 250)
    : 5;

  const xpReward = attackerWon ? 35 : 10;

  return {
    attackerWon,
    attackerBattlePower: Math.round(attackerBattlePower),
    defenderBattlePower: Math.round(defenderBattlePower),
    attackerPoints,
    defenderPoints,
    goldReward,
    xpReward,
  };
}

export default function Battle() {
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: decks = [] } = useDecks();
  const { data: profile } = useProfile();

  const queryClient = useQueryClient();

  const [result, setResult] = useState(null);
  const [attackingId, setAttackingId] = useState(null);

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
        .order('arena_points', { ascending: false })
        .limit(100);

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
        .eq('is_active', true)
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

  const myActiveDeck = useMemo(() => {
    return decks.find((d) => d.is_active) || null;
  }, [decks]);

  const myDeckStats = useMemo(() => {
    return calcDeckStats(myActiveDeck, playerCards, cards);
  }, [myActiveDeck, playerCards, cards]);

  const arenaPlayers = useMemo(() => {
    return allProfiles
      .filter((p) => p.id !== profile?.id)
      .map((p) => {
        const activeDeck = allDecks.find(
          (deck) => deck.user_id === p.id && deck.is_active
        );

        const theirCards = allPlayerCards.filter((pc) => pc.user_id === p.id);

        const deckStats = calcDeckStats(activeDeck, theirCards, cards);

        const possibleWinPoints = estimateAttackerWinPoints(
          myDeckStats,
          deckStats
        );

        return {
          ...p,
          activeDeck,
          deckStats,
          possibleWinPoints,
        };
      })
      .sort((a, b) => {
        return (b.arena_points || 0) - (a.arena_points || 0);
      });
  }, [allProfiles, allDecks, allPlayerCards, cards, profile, myDeckStats]);

  const attackPlayer = async (opponent) => {
    if (!profile) {
      toast.error('Profile has not loaded yet');
      return;
    }

    if ((profile.attack_energy || 0) < ATTACK_COST) {
      toast.error('Not enough attack energy!');
      return;
    }

    setAttackingId(opponent.id);
    setResult(null);

    try {
      const battleResult = resolveBattle(myDeckStats, opponent.deckStats);

      const { data, error } = await supabase.rpc('apply_arena_battle_result', {
        p_defender_id: opponent.id,
        p_attacker_won: battleResult.attackerWon,
        p_attacker_points: battleResult.attackerPoints,
        p_defender_points: battleResult.defenderPoints,
        p_gold_reward: battleResult.goldReward,
        p_xp_reward: battleResult.xpReward,
        p_attack_cost: ATTACK_COST,
      });

      if (error) {
        throw error;
      }

      setResult({
        opponent,
        ...battleResult,
      });

      await queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['allProfiles'] });

      toast.success(
        battleResult.attackerWon
          ? `Victory! +${battleResult.attackerPoints} Arena Points`
          : `Defeat. Defender gained +${battleResult.defenderPoints} Arena Points`
      );

      return data;
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Battle failed');
    } finally {
      setAttackingId(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PageHeader title="Open Arena" />

      <div className="px-4 space-y-4">
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Your Battle Setup</p>

              <p className="font-display font-bold text-sm">
                {myActiveDeck?.name || 'No active deck'}
              </p>

              <p className="text-[10px] text-muted-foreground">
                {myDeckStats.hasDeck
                  ? `${myDeckStats.cardCount} cards ready`
                  : 'You can attack, but your default power is very low.'}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs flex items-center gap-1 justify-end text-muted-foreground">
                <Zap className="w-3 h-3 text-green-400" />
                {profile?.attack_energy ?? '—'} ATK
              </p>

              <p className="text-[10px] text-muted-foreground">
                {ATTACK_COST} per attack
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg border border-border bg-background/40 p-2">
              <Swords className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <p className="text-xs font-bold">
                {myDeckStats.attack.toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground">ATK</p>
            </div>

            <div className="rounded-lg border border-border bg-background/40 p-2">
              <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-xs font-bold">
                {myDeckStats.defense.toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground">DEF</p>
            </div>

            <div className="rounded-lg border border-border bg-background/40 p-2">
              <Heart className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-xs font-bold">
                {myDeckStats.hp.toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground">HP</p>
            </div>
          </div>
        </div>

        {profile && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-primary">
                {profile.arena_points || 0}
              </p>
              <p className="text-[9px] text-muted-foreground">Arena Pts</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-green-400">
                {profile.wins || 0}
              </p>
              <p className="text-[9px] text-muted-foreground">Atk Wins</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-red-400">
                {profile.losses || 0}
              </p>
              <p className="text-[9px] text-muted-foreground">Atk Loss</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-blue-400">
                {profile.defense_wins || 0}
              </p>
              <p className="text-[9px] text-muted-foreground">Def Wins</p>
            </div>
          </div>
        )}

        {result && (
          <div
            className={`rounded-xl border p-4 space-y-3 ${
              result.attackerWon
                ? 'border-primary/50 bg-primary/5'
                : 'border-red-500/40 bg-red-500/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <Trophy
                className={`w-8 h-8 ${
                  result.attackerWon ? 'text-primary' : 'text-red-400'
                }`}
              />

              <div>
                <p className="font-display font-bold text-sm">
                  {result.attackerWon ? 'Victory!' : 'Defeat'}
                </p>

                <p className="text-xs text-muted-foreground">
                  vs{' '}
                  {result.opponent.display_name ||
                    result.opponent.email ||
                    'Opponent'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Your Battle Power</p>
                <p className="font-bold">
                  {result.attackerBattlePower.toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Defender Power</p>
                <p className="font-bold">
                  {result.defenderBattlePower.toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {result.attackerWon
                ? `You gained +${result.attackerPoints} arena points, +${result.goldReward} gold, and +${result.xpReward} XP.`
                : `The defender gained +${result.defenderPoints} arena points. You gained +${result.xpReward} XP.`}
            </p>

            <Button
              onClick={() => setResult(null)}
              variant="outline"
              className="w-full gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Continue Battling
            </Button>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-display font-bold text-primary">Arena Targets</p>

            <p className="text-[10px] text-muted-foreground">
              {loadingProfiles ? 'Loading…' : `${arenaPlayers.length} players`}
            </p>
          </div>

          {arenaPlayers.map((opponent, index) => {
            const stats = opponent.deckStats;
            const hasDeck = stats.hasDeck;

            return (
              <div
                key={opponent.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display font-bold text-sm truncate">
                      #{index + 1}{' '}
                      {opponent.display_name ||
                        opponent.email ||
                        'Unknown Player'}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      Lv.{opponent.level || 1}
                      {opponent.faction ? ` · ${opponent.faction}` : ''}
                      {' · '}
                      {(opponent.arena_points || 0).toLocaleString()} pts
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {hasDeck
                        ? `${stats.cardCount} card active deck`
                        : 'No active deck · low defense value'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      Possible Win
                    </p>

                    <p className="font-bold text-primary text-sm">
                      +{opponent.possibleWinPoints} pts
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg bg-background/40 border border-border p-2">
                    <Swords className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                    <p className="text-[10px] font-bold">
                      {formatRange(stats.attack)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">ATK est.</p>
                  </div>

                  <div className="rounded-lg bg-background/40 border border-border p-2">
                    <Shield className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                    <p className="text-[10px] font-bold">
                      {formatRange(stats.defense)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">DEF est.</p>
                  </div>

                  <div className="rounded-lg bg-background/40 border border-border p-2">
                    <Heart className="w-3.5 h-3.5 text-green-400 mx-auto mb-1" />
                    <p className="text-[10px] font-bold">
                      {formatRange(stats.hp)}
                    </p>
                    <p className="text-[9px] text-muted-foreground">HP est.</p>
                  </div>
                </div>

                <Button
                  onClick={() => attackPlayer(opponent)}
                  disabled={attackingId === opponent.id}
                  className="w-full gap-2"
                >
                  <Target className="w-4 h-4" />
                  {attackingId === opponent.id
                    ? 'Attacking…'
                    : `Attack · ${ATTACK_COST} ATK Energy`}
                </Button>
              </div>
            );
          })}

          {!loadingProfiles && arenaPlayers.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
              No opponents yet. Invite another tester to the arena.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}