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

const ARENA_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

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

      return { playerCard: pc, card };
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

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-red-700/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }) {
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

function MiniStat({ icon: Icon, label, value, valueClass = 'text-foreground' }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3 text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <p className={`font-display text-lg font-black ${valueClass}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function QuestPanel({ children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden ${className}`}>
      {children}
    </section>
  );
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
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
          queryClient.invalidateQueries({ queryKey: ['allProfiles'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'decks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['decks'] });
          queryClient.invalidateQueries({ queryKey: ['allDecks'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_cards' },
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

      if (error) throw error;
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

      if (error) throw error;
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

      if (error) throw error;
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

        return { card, playerCard };
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

    const theirCards = allPlayerCards.filter((pc) => pc.user_id === opponent.id);

    return (opponent.activeDeck.card_ids || [])
      .map((pcId) => {
        const playerCard = theirCards.find((pc) => pc.id === pcId);
        if (!playerCard) return null;

        const card = cards.find((c) => c.id === playerCard.card_id);
        if (!card) return null;

        return { card, playerCard };
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
      .sort((a, b) => (b.weeklyArenaPoints || 0) - (a.weeklyArenaPoints || 0));
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

      if (error) throw error;

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
      await queryClient.invalidateQueries({
        queryKey: ['battleSeasonCurrentOrRecent'],
      });

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

  const claimBattleReward = async () => {
    if (!battleSeason?.id) {
      toast.error('No battle season found.');
      return;
    }

    setClaimingReward(true);

    try {
      const { data, error } = await supabase.rpc('claim_battle_rank_reward', {
        p_season_id: battleSeason.id,
      });

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['playerItems'] });
      await queryClient.invalidateQueries({ queryKey: ['battleRewardClaim'] });

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
        <PageHeader title={`vs ${getProfileName(battleOpponent)}`} />

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
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={ARENA_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <Swords className="w-4 h-4" />
                  Arena Reloaded
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  OPEN ARENA
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  Challenge other players, test your active deck, and climb the weekly battle rankings.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat
                  icon={Trophy}
                  label="Rank"
                  value={myWeeklyRank ? `#${myWeeklyRank}` : '—'}
                />
                <HeroStat
                  icon={Medal}
                  label="Weekly Pts"
                  value={Number(myWeeklyProgress?.arena_points || 0).toLocaleString()}
                />
                <HeroStat
                  icon={Zap}
                  label="ATK"
                  value={profile?.attack_energy ?? '—'}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-8 space-y-6">
            <SeasonPanel
              season={battleSeason}
              loading={loadingBattleSeason}
              ended={battleSeasonEnded}
              myRank={myWeeklyRank}
              myProgress={myWeeklyProgress}
              rewards={battleRewards}
              claimed={!!myBattleClaim}
              claiming={claimingReward}
              onClaim={claimBattleReward}
            />

            <QuestPanel>
              <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Shield className="w-4 h-4" />
                      Battle Setup
                    </div>

                    <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                      {myActiveDeck?.name || 'No Active Deck'}
                    </h2>

                    <p className="text-sm text-muted-foreground mt-2">
                      {myDeckStats.hasDeck
                        ? `${myDeckStats.cardCount} cards ready · Power ${myDeckStats.power.toLocaleString()}`
                        : 'You can attack, but your default power is very low.'}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-right">
                    <p className="text-xs text-emerald-300 font-black flex items-center gap-1 justify-end">
                      <Zap className="w-4 h-4" />
                      {profile?.attack_energy ?? '—'} ATK
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {ATTACK_COST} per attack
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <MiniStat
                    icon={Swords}
                    label="ATK"
                    value={myDeckStats.attack.toLocaleString()}
                    valueClass="text-red-300"
                  />
                  <MiniStat
                    icon={Shield}
                    label="DEF"
                    value={myDeckStats.defense.toLocaleString()}
                    valueClass="text-blue-300"
                  />
                  <MiniStat
                    icon={Heart}
                    label="HP"
                    value={myDeckStats.hp.toLocaleString()}
                    valueClass="text-green-300"
                  />
                </div>

                {profile && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MiniStat
                      icon={Medal}
                      label="Weekly Pts"
                      value={Number(myWeeklyProgress?.arena_points || profile.arena_points || 0).toLocaleString()}
                      valueClass="text-primary"
                    />
                    <MiniStat
                      icon={TrendingUp}
                      label="Atk Wins"
                      value={myWeeklyProgress?.attack_wins ?? profile.wins ?? 0}
                      valueClass="text-green-300"
                    />
                    <MiniStat
                      icon={TrendingDown}
                      label="Atk Loss"
                      value={myWeeklyProgress?.attack_losses ?? profile.losses ?? 0}
                      valueClass="text-red-300"
                    />
                    <MiniStat
                      icon={Shield}
                      label="Def Wins"
                      value={myWeeklyProgress?.defense_wins ?? profile.defense_wins ?? 0}
                      valueClass="text-blue-300"
                    />
                  </div>
                )}
              </div>
            </QuestPanel>

            {result && (
              <ResultPanel result={result} onDismiss={() => setResult(null)} />
            )}

            <QuestPanel>
              <div className="p-5 border-b border-border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Target className="w-4 h-4" />
                      Arena Targets
                    </div>
                    <h2 className="font-display text-2xl font-black text-primary mt-2">
                      Choose Opponent
                    </h2>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {loadingProfiles ? 'Loading…' : `${arenaPlayers.length} players`}
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {arenaPlayers.map((opponent, index) => (
                  <OpponentCard
                    key={opponent.id}
                    opponent={opponent}
                    index={index}
                    attackingId={attackingId}
                    battleSeason={battleSeason}
                    battleSeasonEnded={battleSeasonEnded}
                    onAttack={openBattle}
                  />
                ))}

                {!loadingProfiles && arenaPlayers.length === 0 && (
                  <div className="rounded-2xl border border-border bg-background/50 p-6 text-center text-sm text-muted-foreground">
                    No opponents yet. Invite another tester to the arena.
                  </div>
                )}
              </div>
            </QuestPanel>
          </div>

          <aside className="xl:col-span-4 space-y-6">
            <WeeklyLeaderboard
              progress={weeklyProgress}
              profiles={profileById}
              currentUserId={profile?.id}
            />

            <section className="rounded-3xl border border-primary/20 bg-card/90 shadow-2xl p-5">
              <div className="flex items-start gap-3">
                <Trophy className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-display font-black text-primary">
                    Arena Rule Active
                  </p>
                  <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                    Stronger opponents grant better weekly point potential.
                    Low-value targets are safer, but they do not move the rankings as quickly.
                  </p>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
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
  const [showRewards, setShowRewards] = useState(false);

  return (
    <QuestPanel>
      <div className="p-5 border-b border-primary/20 bg-primary/5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
              <CalendarDays className="w-4 h-4" />
              Weekly Battle Arena
            </div>

            <h2 className="font-display text-2xl font-black text-primary mt-2">
              {loading ? 'Loading Season…' : season?.name || 'No Weekly Season Live'}
            </h2>

            <p className="text-sm text-muted-foreground mt-2">
              {season
                ? ended
                  ? `Ended ${formatDateTime(season.ends_at)}`
                  : `Ends ${formatDateTime(season.ends_at)}`
                : 'Run the weekly arena SQL to create a season.'}
            </p>
          </div>

          <div className="rounded-2xl border border-primary/30 bg-background/60 px-4 py-3 text-right">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
              Your Rank
            </p>
            <p className="font-display text-2xl font-black text-primary">
              {myRank ? `#${myRank}` : '—'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <MiniStat
            icon={Medal}
            label="Weekly Pts"
            value={Number(myProgress?.arena_points || 0).toLocaleString()}
            valueClass="text-primary"
          />
          <MiniStat
            icon={TrendingUp}
            label="Atk Wins"
            value={Number(myProgress?.attack_wins || 0).toLocaleString()}
            valueClass="text-green-300"
          />
          <MiniStat
            icon={TrendingDown}
            label="Atk Loss"
            value={Number(myProgress?.attack_losses || 0).toLocaleString()}
            valueClass="text-red-300"
          />
        </div>

        {!!rewards?.length && (
          <div className="rounded-2xl border border-border bg-background/40 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowRewards((value) => !value)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
            >
              <span className="text-sm text-muted-foreground flex items-center gap-2">
                <Gift className="w-4 h-4 text-primary" />
                Weekly Rewards
              </span>

              <span className="text-xs font-black text-primary">
                {showRewards ? 'Hide' : 'View'}
              </span>
            </button>

            {showRewards && (
              <div className="border-t border-border p-4 space-y-2">
                {rewards.slice(0, 5).map((reward) => (
                  <div
                    key={reward.id}
                    className="flex items-start justify-between gap-2 text-xs"
                  >
                    <span className="font-black text-foreground">
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
            )}
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
    </QuestPanel>
  );
}

function ResultPanel({ result, onDismiss }) {
  return (
    <div
      className={`rounded-3xl border p-5 space-y-4 shadow-2xl ${
        result.attackerWon
          ? 'border-primary/50 bg-primary/10'
          : 'border-red-500/40 bg-red-500/10'
      }`}
    >
      <div className="flex items-center gap-3">
        <Trophy
          className={`w-9 h-9 ${
            result.attackerWon ? 'text-primary' : 'text-red-400'
          }`}
        />

        <div>
          <p className="font-display text-2xl font-black text-primary">
            {result.attackerWon ? 'Victory!' : 'Defeat'}
          </p>
          <p className="text-sm text-muted-foreground">
            vs {getProfileName(result.opponent)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <MiniStat
          icon={Swords}
          label="Your Power"
          value={Number(result.attackerBattlePower || 0).toLocaleString()}
        />
        <MiniStat
          icon={Shield}
          label="Defender Power"
          value={Number(result.defenderBattlePower || 0).toLocaleString()}
        />
        <MiniStat
          icon={Medal}
          label="Your Points"
          value={formatSigned(result.attackerPointsDelta)}
          valueClass={result.attackerPointsDelta >= 0 ? 'text-primary' : 'text-red-300'}
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {result.attackerWon
          ? `You gained ${formatSigned(result.attackerPointsDelta)} weekly points, +${result.goldReward} gold, and +${result.xpReward} XP.`
          : `You lost ${Math.abs(result.attackerPointsDelta)} weekly points. The defender gained ${formatSigned(result.defenderPointsDelta)} weekly points.`}
      </p>

      <Button onClick={onDismiss} variant="outline" className="w-full gap-2">
        <RotateCcw className="w-4 h-4" />
        Continue Battling
      </Button>
    </div>
  );
}

function OpponentCard({
  opponent,
  index,
  attackingId,
  battleSeason,
  battleSeasonEnded,
  onAttack,
}) {
  const stats = opponent.deckStats;
  const hasDeck = stats.hasDeck;

  return (
    <div className="rounded-3xl border border-border bg-background/50 p-4 space-y-3">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
        <div className="min-w-0">
          <p className="font-display text-lg font-black text-foreground truncate">
            #{index + 1} {getProfileName(opponent)}
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            Lv.{opponent.level || 1}
            {opponent.faction ? ` · ${opponent.faction}` : ''}
            {' · '}
            {Number(opponent.weeklyArenaPoints || 0).toLocaleString()} weekly pts
          </p>

          <p className="text-xs text-muted-foreground mt-1">
            {hasDeck
              ? `${stats.cardCount} card active deck · Power ${stats.power.toLocaleString()}`
              : 'No active deck · low defense value'}
          </p>
        </div>

        <div className="rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-right">
          <p className="text-[10px] text-muted-foreground">
            {opponent.difficultyLabel}
          </p>
          <p className="font-black text-primary text-sm">
            Win +{opponent.possibleWinPoints}
          </p>
          <p className="text-[10px] text-red-300">
            Loss -{opponent.possibleLossPoints}
          </p>
          <p className="text-[10px] text-blue-300">
            Def +{opponent.possibleDefenderPoints}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <MiniStat icon={Swords} label="ATK est." value={formatRange(stats.attack)} valueClass="text-red-300" />
        <MiniStat icon={Shield} label="DEF est." value={formatRange(stats.defense)} valueClass="text-blue-300" />
        <MiniStat icon={Heart} label="HP est." value={formatRange(stats.hp)} valueClass="text-green-300" />
      </div>

      <Button
        onClick={() => onAttack(opponent)}
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
}

function WeeklyLeaderboard({ progress, profiles, currentUserId }) {
  const topRows = (progress || []).slice(0, 10);

  return (
    <QuestPanel>
      <div className="p-5 border-b border-border bg-primary/5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
            <Trophy className="w-4 h-4" />
            Weekly Rankings
          </div>

          <p className="text-[10px] text-muted-foreground">
            Top {topRows.length || 0}
          </p>
        </div>

        <h2 className="font-display text-2xl font-black text-primary mt-2">
          Leaderboard
        </h2>
      </div>

      <div className="p-5">
        {topRows.length ? (
          <div className="space-y-2">
            {topRows.map((row, index) => {
              const player = profiles.get(row.user_id);
              const isYou = row.user_id === currentUserId;

              return (
                <div
                  key={row.id}
                  className={`rounded-2xl border p-3 flex items-center justify-between gap-3 ${
                    isYou
                      ? 'border-primary/50 bg-primary/10'
                      : 'border-border bg-background/50'
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-black truncate">
                      #{index + 1} {getProfileName(player)}
                      {isYou ? ' (You)' : ''}
                    </p>

                    <p className="text-[10px] text-muted-foreground">
                      {row.attack_wins}W / {row.attack_losses}L · Def {row.defense_wins}W
                    </p>
                  </div>

                  <p className="font-display text-lg font-black text-primary">
                    {Number(row.arena_points || 0).toLocaleString()}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-5">
            No weekly battle points yet. Win battles to enter the rankings.
          </p>
        )}
      </div>
    </QuestPanel>
  );
}
