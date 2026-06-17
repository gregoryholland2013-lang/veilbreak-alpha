import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import {
  Swords,
  Shield,
  Trophy,
  Crown,
  Flame,
  RotateCcw,
  Sparkles,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';

const BATTLE_DURATION_MS = 3000;

const HOLY_WARS_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

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

function QuestPanel({ children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

export default function HolyWars() {
  const queryClient = useQueryClient();

  const [battling, setBattling] = useState(false);
  const [battleLog, setBattleLog] = useState([]);
  const [warResult, setWarResult] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('holy-wars-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guilds' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'holy_wars' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['holyWars'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'decks' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['decks'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_cards' },
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

      if (error) throw error;
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

      if (error) throw error;
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

      if (error) throw error;
      return data || [];
    },
  });

  const { data: playerCards = [] } = useQuery({
    queryKey: ['playerCards', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('player_cards').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase.from('cards').select('*');
      if (error) throw error;
      return data || [];
    },
  });

  const { data: decks = [] } = useQuery({
    queryKey: ['decks', 'all'],
    queryFn: async () => {
      const { data, error } = await supabase.from('decks').select('*');
      if (error) throw error;
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

  const myGuildPower = useMemo(() => {
    return myGuild ? Math.round(calcGuildPower(myGuild)) : 0;
  }, [myGuild, decks, playerCards, cards]);

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
      const endsAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

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

      if (error) throw error;

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

      const { data: latestWar, error: warFetchError } = await supabase
        .from('holy_wars')
        .select('*')
        .eq('id', war.id)
        .single();

      if (warFetchError) throw warFetchError;

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

      if (updateError) throw updateError;

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

      if (warFetchError) throw warFetchError;

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

      if (warUpdateError) throw warUpdateError;

      if (winnerGuild) {
        const { error: winnerError } = await supabase
          .from('guilds')
          .update({
            holy_war_wins: (winnerGuild.holy_war_wins || 0) + 1,
            updated_at: now,
          })
          .eq('id', winnerGuild.id);

        if (winnerError) throw winnerError;
      }

      if (loserGuild) {
        const { error: loserError } = await supabase
          .from('guilds')
          .update({
            holy_war_losses: (loserGuild.holy_war_losses || 0) + 1,
            updated_at: now,
          })
          .eq('id', loserGuild.id);

        if (loserError) throw loserError;
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
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={HOLY_WARS_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <Flame className="w-4 h-4" />
                  Guild Warfront
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  HOLY WARS
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  Lead your guild into war, challenge rival guilds, and resolve multi-round battles for supremacy.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat
                  icon={Shield}
                  label="Guild"
                  value={myGuild ? myGuild.name : 'None'}
                />
                <HeroStat
                  icon={Swords}
                  label="Power"
                  value={myGuildPower.toLocaleString()}
                />
                <HeroStat
                  icon={Trophy}
                  label="Wars"
                  value={holyWars.length}
                />
              </div>
            </div>
          </div>
        </section>

        {!myGuild && (
          <QuestPanel>
            <div className="p-8 text-center text-muted-foreground">
              <Shield className="w-14 h-14 mx-auto mb-3 opacity-30" />
              <p className="font-display text-2xl font-black text-primary">
                Join a Guild First
              </p>
              <p className="text-sm mt-2">
                Holy Wars are guild vs guild battles. Join or create a guild to participate.
              </p>
            </div>
          </QuestPanel>
        )}

        {myGuild && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <main className="xl:col-span-8 space-y-6">
              {myActiveWar ? (
                <QuestPanel>
                  <div className="p-5 md:p-6 border-b border-red-500/20 bg-red-500/10">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 text-red-300 uppercase tracking-[0.25em] text-xs font-bold">
                          <Flame className="w-4 h-4 animate-pulse" />
                          Holy War in Progress
                        </div>

                        <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                          Active War
                        </h2>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 md:p-6 space-y-5">
                    <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-center">
                      <WarScore
                        name={myActiveWar.guild_a_name}
                        score={myActiveWar.guild_a_score || 0}
                        color="text-primary"
                      />

                      <p className="font-display font-black text-xl text-muted-foreground">
                        VS
                      </p>

                      <WarScore
                        name={myActiveWar.guild_b_name}
                        score={myActiveWar.guild_b_score || 0}
                        color="text-red-400"
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-2">
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
                          className="gap-1"
                          onClick={() => endWar(myActiveWar)}
                        >
                          End War
                        </Button>
                      )}
                    </div>
                  </div>
                </QuestPanel>
              ) : (
                <QuestPanel>
                  <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Swords className="w-4 h-4" />
                      Challenge Guild
                    </div>

                    <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                      War Targets
                    </h2>

                    <p className="text-sm text-muted-foreground mt-2">
                      {isLeader
                        ? 'Choose a rival guild and declare a 24-hour Holy War.'
                        : 'Only guild leaders can declare war.'}
                    </p>
                  </div>

                  <div className="p-5 md:p-6 space-y-3">
                    {challengeableGuilds.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-5">
                        No guilds available to challenge right now.
                      </p>
                    )}

                    {challengeableGuilds.map((guild) => (
                      <div
                        key={guild.id}
                        className="rounded-3xl border border-border bg-background/50 p-4 flex items-center gap-4"
                      >
                        <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center text-2xl flex-shrink-0">
                          {guild.emblem || '🛡️'}
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-display text-lg font-black text-primary truncate">
                            {guild.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(guild.member_emails || []).length} members · {guild.holy_war_wins || 0}W/{guild.holy_war_losses || 0}L
                          </p>
                        </div>

                        {isLeader && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 border-red-500/40 text-red-400 hover:bg-red-500/10"
                            onClick={() => declareWar(guild)}
                          >
                            <Swords className="w-3.5 h-3.5" />
                            Declare
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </QuestPanel>
              )}

              {battleLog.length > 0 && (
                <QuestPanel>
                  <div className="p-5 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Swords className="w-4 h-4" />
                      Battle Log
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    {battleLog.map((entry, i) => (
                      <motion.div
                        key={`${entry.round}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.2 }}
                        className="rounded-2xl border border-border bg-background/50 p-3 flex items-center gap-2 text-sm"
                      >
                        <span className="text-muted-foreground">Rd.{entry.round}</span>
                        <Swords className="w-4 h-4 text-primary flex-shrink-0" />
                        <span className="font-bold text-primary">{entry.winner}</span>
                        <span className="text-muted-foreground">
                          wins! ({entry.a.toLocaleString()} vs {entry.b.toLocaleString()})
                        </span>
                      </motion.div>
                    ))}
                  </div>
                </QuestPanel>
              )}

              {warResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-primary/10 border border-primary/30 rounded-3xl p-6 text-center space-y-2 shadow-2xl"
                >
                  <Trophy className="w-12 h-12 text-primary mx-auto" />
                  <p className="font-display font-black text-2xl text-primary">
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
            </main>

            <aside className="xl:col-span-4 space-y-6">
              <QuestPanel>
                <div className="p-5 border-b border-border bg-primary/5">
                  <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                    <Crown className="w-4 h-4" />
                    Your Guild
                  </div>
                  <h2 className="font-display text-2xl font-black text-primary mt-2">
                    {myGuild.name}
                  </h2>
                </div>

                <div className="p-5 space-y-3">
                  <SmallStat label="Members" value={(myGuild.member_emails || []).length} />
                  <SmallStat label="Power" value={myGuildPower.toLocaleString()} />
                  <SmallStat label="Leader" value={isLeader ? 'You' : 'Member'} />
                </div>
              </QuestPanel>

              {completedWarsForMyGuild.length > 0 && (
                <QuestPanel>
                  <div className="p-5 border-b border-border bg-primary/5">
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Trophy className="w-4 h-4" />
                      War History
                    </div>
                  </div>

                  <div className="p-5 space-y-2">
                    {completedWarsForMyGuild.slice(0, 5).map((war) => {
                      const won = war.winner_guild_id === myGuild?.id;

                      return (
                        <div
                          key={war.id}
                          className={`flex items-center gap-3 rounded-2xl border p-3 ${
                            won
                              ? 'border-primary/30 bg-primary/5'
                              : 'border-border bg-background/50'
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
                </QuestPanel>
              )}

              <QuestPanel>
                <div className="p-5">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-black text-primary">
                        War Rule Active
                      </p>
                      <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                        Holy Wars use active guild member decks. Leaders declare and end wars while members help raise guild power through stronger decks.
                      </p>
                    </div>
                  </div>
                </div>
              </QuestPanel>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function WarScore({ name, score, color }) {
  return (
    <div className="rounded-3xl border border-border bg-background/50 p-5 text-center">
      <p className="font-display font-bold text-sm truncate">{name}</p>
      <p className={`font-display font-black text-5xl mt-3 ${color}`}>
        {score}
      </p>
    </div>
  );
}

function SmallStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-lg font-black text-primary mt-1">
        {value}
      </p>
    </div>
  );
}
