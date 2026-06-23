import React, { useEffect, useMemo, useState } from 'react';
import BattleScreen from '@/components/battle/BattleScreen';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CalendarDays,
  Gift,
  Heart,
  Medal,
  RotateCcw,
  Shield,
  Swords,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Zap,
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

function formatSigned(value) {
  const numberValue = Number(value || 0);
  return numberValue >= 0 ? `+${numberValue}` : `${numberValue}`;
}

function formatDateTime(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatRewardJson(rewardJson = {}) {
  const entries = Object.entries(rewardJson || {}).filter(([, value]) => {
    return Number(value || 0) > 0;
  });

  if (!entries.length) return 'Reward TBD';

  return entries
    .map(([key, value]) => {
      const label = key
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      return `${label} ${Number(value).toLocaleString()}`;
    })
    .join(' · ');
}

function getProfileName(profile) {
  return (
    profile?.display_name ||
    profile?.username ||
    profile?.email ||
    'Unknown Player'
  );
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

      if (!card) return null;

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
  const attackerPower = Math.max(Number(attackerStats.power || 1), 1);
  const defenderPower = Math.max(Number(defenderStats.power || 1), 1);

  const strengthBase = Math.round(defenderPower / 400);

  const matchupAdjustment =
    defenderPower > attackerPower
      ? Math.round((defenderPower - attackerPower) / 180)
      : -Math.round((attackerPower - defenderPower) / 300);

  return clamp(12 + strengthBase + matchupAdjustment, 3, 80);
}

function estimateAttackerLossPenalty(attackerStats, defenderStats) {
  const attackerPower = Math.max(Number(attackerStats.power || 1), 1);
  const defenderPower = Math.max(Number(defenderStats.power || 1), 1);

  const matchupAdjustment =
    attackerPower > defenderPower
      ? Math.round((attackerPower - defenderPower) / 250)
      : -Math.round((defenderPower - attackerPower) / 350);

  return clamp(8 + matchupAdjustment, 2, 40);
}

function estimateDefenderWinPoints(attackerStats, defenderStats) {
  const attackerPower = Math.max(Number(attackerStats.power || 1), 1);
  const defenderPower = Math.max(Number(defenderStats.power || 1), 1);

  const strengthBase = Math.round(attackerPower / 450);

  const matchupAdjustment =
    attackerPower > defenderPower
      ? Math.round((attackerPower - defenderPower) / 220)
      : -Math.round((defenderPower - attackerPower) / 500);

  return clamp(10 + strengthBase + matchupAdjustment, 5, 70);
}

function getDifficultyLabel(attackerStats, defenderStats) {
  const attackerPower = Math.max(Number(attackerStats.power || 1), 1);
  const defenderPower = Math.max(Number(defenderStats.power || 1), 1);
  const ratio = defenderPower / attackerPower;

  if (ratio >= 1.35) return 'High Value Underdog';
  if (ratio >= 1.1) return 'Stronger Target';
  if (ratio >= 0.9) return 'Even Match';
  if (ratio >= 0.65) return 'Lower Value';
  return 'Very Low Value';
}

export default function Battle() {
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: decks = [] } = useDecks();
  const { data: profile } = useProfile();

  const queryClient = useQueryClient();

  const [result, setResult] = useState(null);
  const [attackingId, setAttackingId] = useState(null);
  const [battleOpponent, setBattleOpponent] = useState(null);
  const [battleResolved, setBattleResolved] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);

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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_battle_weekly_progress',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['battleWeeklyProgress'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: battleSeason = null, isLoading: loadingBattleSeason } =
    useQuery({
      queryKey: ['battleSeasonCurrentOrRecent'],
      queryFn: async () => {
        const now = new Date().toISOString();

        const { data: activeSeason, error: activeError } = await supabase
          .from('battle_seasons')
          .select('*')
          .eq('status', 'active')
          .lte('starts_at', now)
          .gt('ends_at', now)
          .order('starts_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (activeError) throw activeError;
        if (activeSeason) return activeSeason;

        const { data: endedSeason, error: endedError } = await supabase
          .from('battle_seasons')
          .select('*')
          .eq('status', 'ended')
          .order('ends_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (endedError) throw endedError;
        if (endedSeason) return endedSeason;

        const { data: expiredSeason, error: expiredError } = await supabase
          .from('battle_seasons')
          .select('*')
          .lte('ends_at', now)
          .order('ends_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (expiredError) throw expiredError;

        return expiredSeason || null;
      },
    });

  const battleSeasonEnded = battleSeason
    ? battleSeason.status === 'ended' || new Date(battleSeason.ends_at) <= new Date()
    : false;

  const { data: claimableRewardSeason = null } = useQuery({
    queryKey: ['battleClaimableRewardSeason', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const now = new Date().toISOString();

      const { data: endedSeasons, error: seasonError } = await supabase
        .from('battle_seasons')
        .select('*')
        .lte('ends_at', now)
        .order('ends_at', { ascending: false })
        .limit(8);

      if (seasonError) throw seasonError;
      if (!endedSeasons?.length) return null;

      const seasonIds = endedSeasons.map((season) => season.id);

      const { data: progressRows, error: progressError } = await supabase
        .from('player_battle_weekly_progress')
        .select('*')
        .eq('user_id', profile.id)
        .in('season_id', seasonIds);

      if (progressError) throw progressError;
      if (!progressRows?.length) return null;

      const { data: claimRows, error: claimError } = await supabase
        .from('battle_reward_claims')
        .select('season_id')
        .eq('user_id', profile.id)
        .in('season_id', seasonIds);

      if (claimError) throw claimError;

      const claimedSeasonIds = new Set((claimRows || []).map((row) => row.season_id));

      for (const season of endedSeasons) {
        const progress = progressRows.find((row) => row.season_id === season.id);

        if (progress && !claimedSeasonIds.has(season.id)) {
          return {
            season,
            progress,
          };
        }
      }

      return null;
    },
  });

  const { data: claimableRewardProgress = [] } = useQuery({
    queryKey: ['battleClaimableRewardProgress', claimableRewardSeason?.season?.id],
    enabled: !!claimableRewardSeason?.season?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_battle_weekly_progress')
        .select('*')
        .eq('season_id', claimableRewardSeason.season.id)
        .order('arena_points', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
  });

  const claimableRewardRank = useMemo(() => {
    if (!profile?.id || !claimableRewardProgress.length) return null;

    const index = claimableRewardProgress.findIndex((row) => row.user_id === profile.id);

    return index >= 0 ? index + 1 : null;
  }, [profile, claimableRewardProgress]);

  const { data: claimableBattleRewards = [] } = useQuery({
    queryKey: ['battleClaimableRankRewards', claimableRewardSeason?.season?.id],
    enabled: !!claimableRewardSeason?.season?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_rank_rewards')
        .select('*')
        .eq('season_id', claimableRewardSeason.season.id)
        .order('min_rank', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const shouldShowSeparateRewardClaim = Boolean(
    claimableRewardSeason?.season?.id &&
      (!battleSeason?.id || battleSeason.id !== claimableRewardSeason.season.id)
  );

  const { data: weeklyProgress = [] } = useQuery({
    queryKey: ['battleWeeklyProgress', battleSeason?.id],
    enabled: !!battleSeason?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_battle_weekly_progress')
        .select('*')
        .eq('season_id', battleSeason.id)
        .order('arena_points', { ascending: false })
        .order('updated_at', { ascending: true })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
  });

  const { data: battleRewards = [] } = useQuery({
    queryKey: ['battleRankRewards', battleSeason?.id],
    enabled: !!battleSeason?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_rank_rewards')
        .select('*')
        .eq('season_id', battleSeason.id)
        .order('min_rank', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: myBattleClaim = null } = useQuery({
    queryKey: ['battleRewardClaim', battleSeason?.id, profile?.id],
    enabled: !!battleSeason?.id && !!profile?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('battle_reward_claims')
        .select('*')
        .eq('season_id', battleSeason.id)
        .eq('user_id', profile.id)
        .maybeSingle();

      if (error) throw error;

      return data || null;
    },
  });

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

  const myDeckCards = useMemo(() => {
    if (!myActiveDeck) return [];

    return (myActiveDeck.card_ids || [])
      .map((pcId) => {
        const playerCard = playerCards.find((pc) => pc.id === pcId);

        if (!playerCard) return null;

        const card = cards.find((c) => c.id === playerCard.card_id);

        if (!card) return null;

        return {
          card,
          playerCard,
        };
      })
      .filter(Boolean);
  }, [myActiveDeck, playerCards, cards]);

  const myDeckStats = useMemo(() => {
    return calcDeckStats(myActiveDeck, playerCards, cards);
  }, [myActiveDeck, playerCards, cards]);

  const progressByUserId = useMemo(() => {
    return new Map((weeklyProgress || []).map((row) => [row.user_id, row]));
  }, [weeklyProgress]);

  const profileById = useMemo(() => {
    return new Map((allProfiles || []).map((row) => [row.id, row]));
  }, [allProfiles]);

  const myWeeklyProgress = useMemo(() => {
    if (!profile?.id) return null;

    return progressByUserId.get(profile.id) || null;
  }, [profile, progressByUserId]);

  const myWeeklyRank = useMemo(() => {
    if (!profile?.id || !weeklyProgress.length) return null;

    const index = weeklyProgress.findIndex((row) => row.user_id === profile.id);

    return index >= 0 ? index + 1 : null;
  }, [profile, weeklyProgress]);

  const getOpponentDeckCards = (opponent) => {
    if (!opponent?.activeDeck) return [];

    const theirCards = allPlayerCards.filter(
      (pc) => pc.user_id === opponent.id
    );

    return (opponent.activeDeck.card_ids || [])
      .map((pcId) => {
        const playerCard = theirCards.find((pc) => pc.id === pcId);

        if (!playerCard) return null;

        const card = cards.find((c) => c.id === playerCard.card_id);

        if (!card) return null;

        return {
          card,
          playerCard,
        };
      })
      .filter(Boolean);
  };

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

        const possibleLossPoints = estimateAttackerLossPenalty(
          myDeckStats,
          deckStats
        );

        const possibleDefenderPoints = estimateDefenderWinPoints(
          myDeckStats,
          deckStats
        );

        const weeklyRow = progressByUserId.get(p.id);

        return {
          ...p,
          activeDeck,
          deckStats,
          possibleWinPoints,
          possibleLossPoints,
          possibleDefenderPoints,
          difficultyLabel: getDifficultyLabel(myDeckStats, deckStats),
          weeklyArenaPoints: weeklyRow?.arena_points ?? p.arena_points ?? 0,
        };
      })
      .sort((a, b) => {
        return (b.weeklyArenaPoints || 0) - (a.weeklyArenaPoints || 0);
      });
  }, [
    allProfiles,
    allDecks,
    allPlayerCards,
    cards,
    profile,
    myDeckStats,
    progressByUserId,
  ]);

  const openBattle = async (opponent) => {
    if (!profile) {
      toast.error('Profile has not loaded yet');
      return;
    }

    if (!battleSeason) {
      toast.error('No weekly arena season is available.');
      return;
    }

    if (battleSeasonEnded) {
      toast.error('This weekly arena season has ended. Claim rewards instead.');
      return;
    }

    if ((profile.attack_energy || 0) < ATTACK_COST) {
      toast.error('Not enough attack energy!');
      return;
    }

    setResult(null);
    setBattleResolved(false);
    setBattleOpponent(opponent);
  };

  const finishBattle = async (battleResult) => {
    if (!profile || !battleOpponent || battleResolved) {
      return;
    }

    setBattleResolved(true);
    setAttackingId(battleOpponent.id);

    try {
      const attackerWon = !!battleResult.attackerWon;

      const attackerPower = Math.max(
        Number(
          battleResult.attackerBattlePower ||
            battleResult.myTotal ||
            myDeckStats.power ||
            1
        ),
        1
      );

      const defenderPower = Math.max(
        Number(
          battleResult.defenderBattlePower ||
            battleResult.oppTotal ||
            battleOpponent.deckStats.power ||
            1
        ),
        1
      );

      const estimatedWinPoints = estimateAttackerWinPoints(
        { power: attackerPower },
        { power: defenderPower }
      );

      const estimatedLossPoints = estimateAttackerLossPenalty(
        { power: attackerPower },
        { power: defenderPower }
      );

      const estimatedDefenderPoints = estimateDefenderWinPoints(
        { power: attackerPower },
        { power: defenderPower }
      );

      const goldReward = attackerWon
        ? clamp(Math.round(25 + defenderPower / 60), 25, 250)
        : 0;

      const xpReward = attackerWon ? 35 : 10;

      const { data, error } = await supabase.rpc(
        'apply_weekly_arena_battle_result',
        {
          p_defender_id: battleOpponent.id,
          p_attacker_won: attackerWon,
          p_attacker_power: attackerPower,
          p_defender_power: defenderPower,
          p_gold_reward: goldReward,
          p_xp_reward: xpReward,
          p_attack_cost: ATTACK_COST,
        }
      );

      if (error) {
        throw error;
      }

      const attackerPointsDelta = Number(
        data?.attacker_points_delta ??
          (attackerWon ? estimatedWinPoints : -estimatedLossPoints)
      );

      const defenderPointsDelta = Number(
        data?.defender_points_delta ??
          (attackerWon ? 0 : estimatedDefenderPoints)
      );

      setResult({
        opponent: battleOpponent,
        ...battleResult,
        attackerWon,
        attackerPointsDelta,
        defenderPointsDelta,
        estimatedWinPoints,
        estimatedLossPoints,
        estimatedDefenderPoints,
        goldReward: Number(data?.gold_reward ?? goldReward),
        xpReward: Number(data?.xp_reward ?? xpReward),
        attackerBattlePower: attackerPower,
        defenderBattlePower: defenderPower,
      });

      await queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
      await queryClient.invalidateQueries({ queryKey: ['allDecks'] });
      await queryClient.invalidateQueries({ queryKey: ['allPlayerCards'] });
      await queryClient.invalidateQueries({ queryKey: ['battleWeeklyProgress'] });
      await queryClient.invalidateQueries({ queryKey: ['battleSeasonCurrentOrRecent'] });

      toast.success(
        attackerWon
          ? `Victory! ${formatSigned(attackerPointsDelta)} Weekly Points`
          : `Defeat. ${formatSigned(attackerPointsDelta)} Weekly Points. Defender ${formatSigned(defenderPointsDelta)}`
      );

      return data;
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Battle failed');
    } finally {
      setAttackingId(null);
    }
  };

  const claimBattleReward = async (seasonIdOverride = null) => {
    const seasonId = seasonIdOverride || battleSeason?.id;

    if (!seasonId) {
      toast.error('No claimable battle season found.');
      return;
    }

    setClaimingReward(true);

    try {
      const { data, error } = await supabase.rpc('claim_battle_rank_reward', {
        p_season_id: seasonId,
      });

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerItems'] }),
        queryClient.invalidateQueries({ queryKey: ['battleRewardClaim'] }),
        queryClient.invalidateQueries({ queryKey: ['battleClaimableRewardSeason'] }),
        queryClient.invalidateQueries({ queryKey: ['battleClaimableRewardProgress'] }),
        queryClient.invalidateQueries({ queryKey: ['battleClaimableRankRewards'] }),
      ]);

      toast.success(`Weekly Arena reward claimed! Rank #${data.rank}.`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not claim weekly reward.');
    } finally {
      setClaimingReward(false);
    }
  };

  const closeBattle = () => {
    setBattleOpponent(null);
    setBattleResolved(false);
    setResult(null);
  };

  if (battleOpponent) {
    const opponentDeckCards = getOpponentDeckCards(battleOpponent);

    return (
      <div className="max-w-lg mx-auto">
        <PageHeader
          title={`vs ${getProfileName(battleOpponent)}`}
        />

        <div className="px-4 py-4">
          <BattleScreen
            myDeckCards={myDeckCards}
            opponentDeckCards={opponentDeckCards}
            opponent={battleOpponent}
            possibleWinPoints={battleOpponent.possibleWinPoints}
            possibleLossPoints={battleOpponent.possibleLossPoints}
            possibleDefenderPoints={battleOpponent.possibleDefenderPoints}
            onFinish={finishBattle}
            onBack={closeBattle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PageHeader title="Open Arena" />

      <div className="px-4 space-y-4">
        {shouldShowSeparateRewardClaim && (
          <ClaimableArenaRewardPanel
            season={claimableRewardSeason.season}
            myRank={claimableRewardRank}
            myProgress={claimableRewardSeason.progress}
            rewards={claimableBattleRewards}
            claiming={claimingReward}
            onClaim={() => claimBattleReward(claimableRewardSeason.season.id)}
          />
        )}

        <SeasonPanel
          season={battleSeason}
          loading={loadingBattleSeason}
          ended={battleSeasonEnded}
          myRank={myWeeklyRank}
          myProgress={myWeeklyProgress}
          rewards={battleRewards}
          claimed={!!myBattleClaim}
          claiming={claimingReward}
          onClaim={() => claimBattleReward(battleSeason?.id)}
        />

        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs text-muted-foreground">Your Battle Setup</p>

              <p className="font-display font-bold text-sm">
                {myActiveDeck?.name || 'No active deck'}
              </p>

              <p className="text-[10px] text-muted-foreground">
                {myDeckStats.hasDeck
                  ? `${myDeckStats.cardCount} cards ready · Power ${myDeckStats.power.toLocaleString()}`
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
                {Number(myWeeklyProgress?.arena_points || profile.arena_points || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground">Weekly Pts</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-green-400">
                {myWeeklyProgress?.attack_wins ?? profile.wins ?? 0}
              </p>
              <p className="text-[9px] text-muted-foreground">Atk Wins</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-red-400">
                {myWeeklyProgress?.attack_losses ?? profile.losses ?? 0}
              </p>
              <p className="text-[9px] text-muted-foreground">Atk Loss</p>
            </div>

            <div className="bg-card rounded-lg border border-border p-2 text-center">
              <p className="text-lg font-bold font-display text-blue-400">
                {myWeeklyProgress?.defense_wins ?? profile.defense_wins ?? 0}
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
                  vs {getProfileName(result.opponent)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Your Battle Power</p>
                <p className="font-bold">
                  {Number(result.attackerBattlePower || 0).toLocaleString()}
                </p>
              </div>

              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Defender Power</p>
                <p className="font-bold">
                  {Number(result.defenderBattlePower || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Your Points</p>
                <p
                  className={`font-bold ${
                    result.attackerPointsDelta >= 0
                      ? 'text-primary'
                      : 'text-red-400'
                  }`}
                >
                  {formatSigned(result.attackerPointsDelta)}
                </p>
              </div>

              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Defender</p>
                <p className="font-bold text-blue-300">
                  {formatSigned(result.defenderPointsDelta)}
                </p>
              </div>

              <div className="rounded-lg bg-background/40 border border-border p-2 text-center">
                <p className="text-muted-foreground">Gold</p>
                <p className="font-bold text-yellow-300">
                  +{Number(result.goldReward || 0).toLocaleString()}
                </p>
              </div>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {result.attackerWon
                ? `You gained ${formatSigned(result.attackerPointsDelta)} weekly points, +${result.goldReward} gold, and +${result.xpReward} XP.`
                : `You lost ${Math.abs(result.attackerPointsDelta)} weekly points. The defender gained ${formatSigned(result.defenderPointsDelta)} weekly points.`}
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

        <WeeklyLeaderboard
          progress={weeklyProgress}
          profiles={profileById}
          currentUserId={profile?.id}
        />

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
                      {getProfileName(opponent)}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      Lv.{opponent.level || 1}
                      {opponent.faction ? ` · ${opponent.faction}` : ''}
                      {' · '}
                      {Number(opponent.weeklyArenaPoints || 0).toLocaleString()} weekly pts
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {hasDeck
                        ? `${stats.cardCount} card active deck · Power ${stats.power.toLocaleString()}`
                        : 'No active deck · low defense value'}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] text-muted-foreground">
                      {opponent.difficultyLabel}
                    </p>

                    <p className="font-bold text-primary text-sm">
                      Win +{opponent.possibleWinPoints}
                    </p>

                    <p className="text-[9px] text-red-300">
                      Loss -{opponent.possibleLossPoints}
                    </p>

                    <p className="text-[9px] text-blue-300">
                      Def +{opponent.possibleDefenderPoints}
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
                  onClick={() => openBattle(opponent)}
                  disabled={
                    attackingId === opponent.id ||
                    battleSeasonEnded ||
                    !battleSeason
                  }
                  className="w-full gap-2"
                >
                  <Target className="w-4 h-4" />
                  {attackingId === opponent.id
                    ? 'Attacking…'
                    : battleSeasonEnded
                      ? 'Season Ended'
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

function ClaimableArenaRewardPanel({
  season,
  myRank,
  myProgress,
  rewards,
  claiming,
  onClaim,
}) {
  const matchingReward = rewards?.find((reward) => {
    if (!myRank) return false;

    return myRank >= reward.min_rank && myRank <= reward.max_rank;
  });

  return (
    <div className="rounded-xl border border-yellow-400/40 bg-yellow-500/10 p-4 space-y-3 shadow-[0_0_24px_rgba(250,189,50,0.14)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-yellow-300 flex items-center gap-1 font-bold uppercase tracking-[0.18em]">
            <Gift className="w-3.5 h-3.5" />
            Weekly Reward Ready
          </p>

          <p className="font-display font-bold text-sm mt-1">
            {season?.name || 'Previous Arena Season'}
          </p>

          <p className="text-[10px] text-muted-foreground mt-1">
            Ended {formatDateTime(season?.ends_at)} · Claim before starting your next reward cycle.
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Final Rank</p>
          <p className="text-xl font-black text-primary">
            {myRank ? `#${myRank}` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-center">
        <div className="rounded-lg border border-border bg-background/40 p-2">
          <Medal className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-xs font-bold">
            {Number(myProgress?.arena_points || 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-muted-foreground">Final Weekly Pts</p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-2">
          <Trophy className="w-4 h-4 text-yellow-300 mx-auto mb-1" />
          <p className="text-xs font-bold">
            {matchingReward ? formatRewardJson(matchingReward.reward_json) : 'Fallback Reward'}
          </p>
          <p className="text-[9px] text-muted-foreground">Reward</p>
        </div>
      </div>

      <Button onClick={onClaim} disabled={claiming || !myProgress} className="w-full gap-2">
        <Gift className="w-4 h-4" />
        {claiming ? 'Claiming…' : 'Claim Previous Weekly Reward'}
      </Button>
    </div>
  );
}

function SeasonPanel({
  season,
  loading,
  ended,
  myRank,
  myProgress,
  rewards,
  claimed,
  claiming,
  onClaim,
}) {
  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="w-3.5 h-3.5" />
            Weekly Battle Arena
          </p>

          <p className="font-display font-bold text-sm">
            {loading
              ? 'Loading season…'
              : season?.name || 'No weekly season live'}
          </p>

          <p className="text-[10px] text-muted-foreground mt-1">
            {season
              ? ended
                ? `Ended ${formatDateTime(season.ends_at)}`
                : `Ends ${formatDateTime(season.ends_at)}`
              : 'Run the weekly arena SQL to create a season.'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Your Rank</p>
          <p className="text-xl font-black text-primary">
            {myRank ? `#${myRank}` : '—'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-background/40 p-2">
          <Medal className="w-4 h-4 text-primary mx-auto mb-1" />
          <p className="text-xs font-bold">
            {Number(myProgress?.arena_points || 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-muted-foreground">Weekly Pts</p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-2">
          <TrendingUp className="w-4 h-4 text-green-400 mx-auto mb-1" />
          <p className="text-xs font-bold">
            {Number(myProgress?.attack_wins || 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-muted-foreground">Atk Wins</p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-2">
          <TrendingDown className="w-4 h-4 text-red-400 mx-auto mb-1" />
          <p className="text-xs font-bold">
            {Number(myProgress?.attack_losses || 0).toLocaleString()}
          </p>
          <p className="text-[9px] text-muted-foreground">Atk Losses</p>
        </div>
      </div>

      {!!rewards?.length && (
        <div className="rounded-lg border border-border bg-background/30 p-3 space-y-2">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Gift className="w-3.5 h-3.5" />
            Weekly Rewards
          </p>

          <div className="space-y-1">
            {rewards.slice(0, 5).map((reward) => (
              <div
                key={reward.id}
                className="flex items-start justify-between gap-2 text-[10px]"
              >
                <span className="font-bold text-foreground">
                  #{reward.min_rank}
                  {reward.max_rank !== reward.min_rank
                    ? `-${reward.max_rank}`
                    : ''}
                </span>
                <span className="text-muted-foreground text-right">
                  {formatRewardJson(reward.reward_json)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {ended && (
        <Button
          onClick={onClaim}
          disabled={claimed || claiming || !myProgress}
          className="w-full gap-2"
        >
          <Gift className="w-4 h-4" />
          {claimed
            ? 'Weekly Reward Claimed'
            : claiming
              ? 'Claiming…'
              : myProgress
                ? 'Claim Weekly Arena Reward'
                : 'No Weekly Reward Available'}
        </Button>
      )}
    </div>
  );
}

function WeeklyLeaderboard({ progress, profiles, currentUserId }) {
  const topRows = (progress || []).slice(0, 10);

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="font-display font-bold text-primary flex items-center gap-2">
          <Trophy className="w-4 h-4" />
          Weekly Rankings
        </p>

        <p className="text-[10px] text-muted-foreground">
          Top {topRows.length || 0}
        </p>
      </div>

      {topRows.length ? (
        <div className="space-y-2">
          {topRows.map((row, index) => {
            const player = profiles.get(row.user_id);
            const isYou = row.user_id === currentUserId;

            return (
              <div
                key={row.id}
                className={`rounded-lg border p-2 flex items-center justify-between gap-3 ${
                  isYou
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-background/30'
                }`}
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold truncate">
                    #{index + 1} {getProfileName(player)}
                    {isYou ? ' (You)' : ''}
                  </p>

                  <p className="text-[9px] text-muted-foreground">
                    {row.attack_wins}W / {row.attack_losses}L · Def {row.defense_wins}W
                  </p>
                </div>

                <p className="text-sm font-black text-primary">
                  {Number(row.arena_points || 0).toLocaleString()}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">
          No weekly battle points yet. Win battles to enter the rankings.
        </p>
      )}
    </div>
  );
}
