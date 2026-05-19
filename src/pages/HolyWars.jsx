import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Swords,
  Shield,
  Trophy,
  Crown,
  Flame,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

const BATTLE_DURATION_MS = 3000;

export default function HolyWars() {
  const queryClient = useQueryClient();

  const [battling, setBattling] = useState(false);
  const [battleLog, setBattleLog] = useState([]);
  const [warResult, setWarResult] = useState(null);

  /**
   * Supabase Realtime
   * Keeps guilds, wars, decks, and cards reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('holy-wars-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guilds',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'holy_wars',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['holyWars'] });
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
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        throw error;
      }

      return user;
    },
  });

  const myEmail = authUser?.email || null;

  const { data: allGuilds = [] } = useQuery({
    queryKey: ['guilds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .order('total_power', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: holyWars = [] } = useQuery({
    queryKey: ['holyWars'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('holy_wars')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: playerCards = [] } = useQuery({
    queryKey: ['playerCards', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_cards')
        .select('*');

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*');

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: decks = [] } = useQuery({
    queryKey: ['decks', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('decks')
        .select('*');

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const myGuild = useMemo(() => {
    if (!myEmail) return null;

    return (
      allGuilds.find((guild) =>
        (guild.member_emails || []).includes(myEmail)
      ) || null
    );
  }, [allGuilds, myEmail]);

  const isLeader = myGuild?.leader_email === myEmail;

  const myActiveWar = useMemo(() => {
    if (!myGuild) return null;

    return (
      holyWars.find(
        (war) =>
          (war.guild_a_id === myGuild.id || war.guild_b_id === myGuild.id) &&
          war.status === 'active'
      ) || null
    );
  }, [holyWars, myGuild]);

  const calcGuildPower = (guild) => {
    return (guild.member_emails || []).reduce((sum, email) => {
      /**
       * Supabase version:
       * We use owner_email on decks/player_cards for guild member matching.
       * If your tables only use user_id, add owner_email to decks/player_cards
       * or join through profiles.
       */
      const memberDeck = decks.find(
        (deck) => deck.owner_email === email && deck.is_active
      );

      if (!memberDeck) return sum;

      const deckPower = (memberDeck.card_ids || []).reduce((cardSum, pcId) => {
        const pc = playerCards.find((playerCard) => playerCard.id === pcId);

        if (!pc) return cardSum;

        const card = cards.find((c) => c.id === pc.card_id);

        if (!card) return cardSum;

        const level = pc.level || 1;
        const mult = 1 + (level - 1) * 0.1;

        return (
          cardSum +
          ((card.base_attack || 0) * mult +
            (card.base_defense || 0) * mult +
            (card.base_hp || 0) * mult)
        );
      }, 0);

      return sum + deckPower;
    }, 0);
  };

  const challengeableGuilds = useMemo(() => {
    if (!myGuild) return [];

    return allGuilds.filter((guild) => {
      if (guild.id === myGuild.id) return false;

      const guildOrMineInActiveWar = holyWars.find(
        (war) =>
          war.status === 'active' &&
          (war.guild_a_id === guild.id ||
            war.guild_b_id === guild.id ||
            war.guild_a_id === myGuild.id ||
            war.guild_b_id === myGuild.id)
      );

      return !guildOrMineInActiveWar;
    });
  }, [allGuilds, holyWars, myGuild]);

  const declareWar = async (targetGuild) => {
    if (!myGuild || !isLeader) {
      toast.error('Only guild leaders can declare war');
      return;
    }

    if (myActiveWar) {
      toast.error('Already in an active war');
      return;
    }

    try {
      const now = new Date().toISOString();
      const endsAt = new Date(
        Date.now() + 24 * 60 * 60 * 1000
      ).toISOString();

      const { error } = await supabase.from('holy_wars').insert({
        guild_a_id: myGuild.id,
        guild_a_name: myGuild.name,
        guild_b_id: targetGuild.id,
        guild_b_name: targetGuild.name,
        status: 'active',
        guild_a_score: 0,
        guild_b_score: 0,
        starts_at: now,
        ends_at: endsAt,
        battle_log: [],
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['holyWars'] });

      toast.success(`⚔️ War declared against ${targetGuild.name}!`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not declare war');
    }
  };

  const fightRound = async (war) => {
    if (battling) return;

    setBattling(true);
    setBattleLog([]);

    try {
      const guildA = allGuilds.find((guild) => guild.id === war.guild_a_id);
      const guildB = allGuilds.find((guild) => guild.id === war.guild_b_id);

      if (!guildA || !guildB) {
        toast.error('Could not load both guilds');
        return;
      }

      /**
       * Re-check latest war before fighting.
       */
      const { data: latestWar, error: warFetchError } = await supabase
        .from('holy_wars')
        .select('*')
        .eq('id', war.id)
        .single();

      if (warFetchError) {
        throw warFetchError;
      }

      if (!latestWar || latestWar.status !== 'active') {
        toast.error('This war is no longer active');
        return;
      }

      const powerA = calcGuildPower(guildA) + Math.random() * 500;
      const powerB = calcGuildPower(guildB) + Math.random() * 500;

      const rounds = 3;
      let scoreA = latestWar.guild_a_score || 0;
      let scoreB = latestWar.guild_b_score || 0;

      const log = [...(latestWar.battle_log || [])];
      const newLogs = [];

      for (let roundIndex = 0; roundIndex < rounds; roundIndex++) {
        await new Promise((resolve) =>
          setTimeout(resolve, BATTLE_DURATION_MS / rounds)
        );

        const aRoll = powerA * (0.7 + Math.random() * 0.6);
        const bRoll = powerB * (0.7 + Math.random() * 0.6);

        const roundWinner = aRoll > bRoll ? guildA.name : guildB.name;

        if (aRoll > bRoll) {
          scoreA++;
        } else {
          scoreB++;
        }

        const entry = {
          round: log.length + 1,
          winner: roundWinner,
          a: Math.round(aRoll),
          b: Math.round(bRoll),
        };

        newLogs.push(entry);
        log.push(entry);

        setBattleLog((previous) => [...previous, entry]);
      }

      const { error: updateError } = await supabase
        .from('holy_wars')
        .update({
          guild_a_score: scoreA,
          guild_b_score: scoreB,
          battle_log: log,
          updated_at: new Date().toISOString(),
        })
        .eq('id', latestWar.id)
        .eq('status', 'active');

      if (updateError) {
        throw updateError;
      }

      queryClient.invalidateQueries({ queryKey: ['holyWars'] });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not fight round');
    } finally {
      setBattling(false);
    }
  };

  const endWar = async (war) => {
    if (!isLeader) {
      toast.error('Only guild leaders can end war');
      return;
    }

    try {
      const now = new Date().toISOString();

      const { data: latestWar, error: warFetchError } = await supabase
        .from('holy_wars')
        .select('*')
        .eq('id', war.id)
        .single();

      if (warFetchError) {
        throw warFetchError;
      }

      if (!latestWar || latestWar.status !== 'active') {
        toast.error('This war is no longer active');
        return;
      }

      const aWon =
        (latestWar.guild_a_score || 0) >= (latestWar.guild_b_score || 0);

      const winnerGuild = allGuilds.find(
        (guild) => guild.id === (aWon ? latestWar.guild_a_id : latestWar.guild_b_id)
      );

      const loserGuild = allGuilds.find(
        (guild) => guild.id === (!aWon ? latestWar.guild_a_id : latestWar.guild_b_id)
      );

      const { error: warUpdateError } = await supabase
        .from('holy_wars')
        .update({
          status: 'completed',
          winner_guild_id: winnerGuild?.id || null,
          completed_at: now,
          updated_at: now,
        })
        .eq('id', latestWar.id)
        .eq('status', 'active');

      if (warUpdateError) {
        throw warUpdateError;
      }

      if (winnerGuild) {
        const { error: winnerError } = await supabase
          .from('guilds')
          .update({
            holy_war_wins: (winnerGuild.holy_war_wins || 0) + 1,
            updated_at: now,
          })
          .eq('id', winnerGuild.id);

        if (winnerError) {
          throw winnerError;
        }
      }

      if (loserGuild) {
        const { error: loserError } = await supabase
          .from('guilds')
          .update({
            holy_war_losses: (loserGuild.holy_war_losses || 0) + 1,
            updated_at: now,
          })
          .eq('id', loserGuild.id);

        if (loserError) {
          throw loserError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['holyWars'] });
      queryClient.invalidateQueries({ queryKey: ['guilds'] });

      setWarResult({
        winner: winnerGuild?.name,
        aScore: latestWar.guild_a_score,
        bScore: latestWar.guild_b_score,
      });

      toast.success(`🏆 ${winnerGuild?.name} wins the Holy War!`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not end war');
    }
  };

  const completedWarsForMyGuild = useMemo(() => {
    if (!myGuild) return [];

    return holyWars.filter(
      (war) =>
        war.status === 'completed' &&
        (war.guild_a_id === myGuild.id || war.guild_b_id === myGuild.id)
    );
  }, [holyWars, myGuild]);

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Holy Wars" />

      <div className="p-4 space-y-5">
        {!myGuild && (
          <div className="text-center py-10 text-muted-foreground">
            <Shield className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-display text-lg font-bold">
              Join a Guild First
            </p>
            <p className="text-sm">Holy Wars are guild vs guild battles.</p>
          </div>
        )}

        {/* Active war */}
        {myGuild && myActiveWar && (
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-red-900/40 to-red-950/60 border border-red-500/30 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="font-display font-black text-sm text-red-300">
                  ⚔️ HOLY WAR IN PROGRESS
                </p>
                <Flame className="w-5 h-5 text-red-400 animate-pulse" />
              </div>

              <div className="flex items-center justify-center gap-4">
                <div className="text-center flex-1">
                  <p className="font-display font-bold text-sm truncate">
                    {myActiveWar.guild_a_name}
                  </p>
                  <p className="font-black text-3xl text-primary">
                    {myActiveWar.guild_a_score || 0}
                  </p>
                </div>

                <p className="font-display font-black text-xl text-muted-foreground">
                  VS
                </p>

                <div className="text-center flex-1">
                  <p className="font-display font-bold text-sm truncate">
                    {myActiveWar.guild_b_name}
                  </p>
                  <p className="font-black text-3xl text-red-400">
                    {myActiveWar.guild_b_score || 0}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-2"
                  onClick={() => fightRound(myActiveWar)}
                  disabled={battling}
                >
                  {battling ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Swords className="w-4 h-4" />
                  )}
                  {battling ? 'Fighting…' : 'Fight Round'}
                </Button>

                {isLeader && (
                  <Button
                    variant="outline"
                    className="gap-1 text-xs"
                    onClick={() => endWar(myActiveWar)}
                  >
                    End War
                  </Button>
                )}
              </div>
            </div>

            {/* Battle log */}
            {battleLog.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-3 space-y-1.5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">
                  Battle Log
                </p>

                {battleLog.map((entry, i) => (
                  <motion.div
                    key={`${entry.round}-${i}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.2 }}
                    className="flex items-center gap-2 text-xs"
                  >
                    <span className="text-muted-foreground">
                      Rd.{entry.round}
                    </span>
                    <Swords className="w-3 h-3 text-primary flex-shrink-0" />
                    <span className="font-bold text-primary">
                      {entry.winner}
                    </span>
                    <span className="text-muted-foreground">
                      wins! ({entry.a.toLocaleString()} vs{' '}
                      {entry.b.toLocaleString()})
                    </span>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* War result */}
        {warResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-primary/10 border border-primary/30 rounded-2xl p-5 text-center space-y-2"
          >
            <Trophy className="w-10 h-10 text-primary mx-auto" />
            <p className="font-display font-black text-xl text-primary">
              🏆 {warResult.winner} Wins!
            </p>
            <p className="text-sm text-muted-foreground">
              {warResult.aScore} — {warResult.bScore}
            </p>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setWarResult(null)}
              className="gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Dismiss
            </Button>
          </motion.div>
        )}

        {/* Challenge guilds */}
        {myGuild && !myActiveWar && (
          <div className="space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Challenge a Guild
            </p>

            {!isLeader && (
              <p className="text-xs text-muted-foreground">
                Only guild leaders can declare war.
              </p>
            )}

            {challengeableGuilds.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No guilds available to challenge right now.
              </p>
            )}

            {challengeableGuilds.map((guild) => (
              <div
                key={guild.id}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
              >
                <p className="text-2xl flex-shrink-0">
                  {guild.emblem || '🛡️'}
                </p>

                <div className="flex-1 min-w-0">
                  <p className="font-display font-bold text-sm">
                    {guild.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {(guild.member_emails || []).length} members ·{' '}
                    {guild.holy_war_wins || 0}W/
                    {guild.holy_war_losses || 0}L
                  </p>
                </div>

                {isLeader && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                    onClick={() => declareWar(guild)}
                  >
                    <Swords className="w-3.5 h-3.5" /> Declare War
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* War history */}
        {completedWarsForMyGuild.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              War History
            </p>

            {completedWarsForMyGuild.slice(0, 5).map((war) => {
              const won = war.winner_guild_id === myGuild?.id;

              return (
                <div
                  key={war.id}
                  className={`flex items-center gap-3 rounded-xl border p-3 ${
                    won
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-card'
                  }`}
                >
                  <Crown
                    className={`w-5 h-5 flex-shrink-0 ${
                      won ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  />

                  <div className="flex-1">
                    <p className="text-sm font-semibold">
                      {war.guild_a_name} vs {war.guild_b_name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {war.guild_a_score}—{war.guild_b_score}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-bold ${
                      won ? 'text-primary' : 'text-destructive'
                    }`}
                  >
                    {won ? 'WIN' : 'LOSS'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}