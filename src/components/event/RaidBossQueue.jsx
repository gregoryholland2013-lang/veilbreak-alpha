import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Skull, Swords, Globe, Users, Lock } from 'lucide-react';

const elementColors = {
  fire: 'border-red-500/50 bg-red-900/20',
  water: 'border-blue-500/50 bg-blue-900/20',
  earth: 'border-green-500/50 bg-green-900/20',
  light: 'border-yellow-500/50 bg-yellow-900/20',
  dark: 'border-purple-500/50 bg-purple-900/20',
};

function HPBar({ current = 0, max = 1 }) {
  const safeMax = max || 1;
  const pct = Math.max(0, Math.min(100, (current / safeMax) * 100));

  return (
    <div className="w-full bg-muted/40 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all ${
          pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-yellow-500' : 'bg-red-500'
        }`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export default function RaidBossQueue({
  event,
  myEmail,
  me,
  playerCards = [],
  cards = [],
  inventory,
}) {
  const queryClient = useQueryClient();
  const [attacking, setAttacking] = useState(null);

  const eventId = event?.id;

  /**
   * SUPABASE REALTIME
   *
   * Whenever raid bosses, raid attacks, or player progress changes,
   * React Query refetches the correct data automatically.
   */
  useEffect(() => {
    if (!myEmail) return;

    const channel = supabase
      .channel('raid-boss-queue-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raid_bosses',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['raidBosses'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'raid_attacks',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['raidAttacks'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_event_progress',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerEventProgress'] });
          queryClient.invalidateQueries({ queryKey: ['eventRankings'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myEmail, queryClient]);

  const { data: myBosses = [], isLoading: myBossesLoading } = useQuery({
    queryKey: ['raidBosses', 'mine', myEmail],
    enabled: !!myEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raid_bosses')
        .select('*')
        .eq('owner_email', myEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: publicBosses = [], isLoading: publicBossesLoading } = useQuery({
    queryKey: ['raidBosses', 'public'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raid_bosses')
        .select('*')
        .eq('shared_to', 'public')
        .eq('status', 'alive')
        .order('created_at', { ascending: false })
        .limit(30);

      if (error) throw error;
      return data || [];
    },
  });

  const { data: attacks = [] } = useQuery({
    queryKey: ['raidAttacks', myEmail],
    enabled: !!myEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('raid_attacks')
        .select('*')
        .eq('attacker_email', myEmail)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });

  const todayStr = new Date().toISOString().split('T')[0];

  const attackedTodayIds = useMemo(() => {
    return attacks
      .filter((a) => a.created_at?.startsWith(todayStr))
      .map((a) => a.raid_boss_id);
  }, [attacks, todayStr]);

  const aliveBosses = useMemo(() => {
    return myBosses.filter((b) => b.status === 'alive');
  }, [myBosses]);

  const defeatedBosses = useMemo(() => {
    return myBosses.filter((b) => b.status === 'defeated');
  }, [myBosses]);

  const visiblePublicBosses = useMemo(() => {
    return publicBosses.filter((b) => b.owner_email !== myEmail);
  }, [publicBosses, myEmail]);

  const shareToggle = async (boss, level) => {
    try {
      const { error } = await supabase
        .from('raid_bosses')
        .update({
          shared_to: level,
          updated_at: new Date().toISOString(),
        })
        .eq('id', boss.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['raidBosses'] });
      toast.success(`Boss shared to ${level}`);
    } catch (error) {
      console.error(error);
      toast.error('Could not update boss sharing');
    }
  };

  const calculateEventBoost = () => {
    if (!event?.element_theme) return 1;

    return playerCards.reduce((boost, pc) => {
      const card = cards.find((c) => c.id === pc.card_id);

      if (card?.element !== event.element_theme) {
        return boost;
      }

      const rarityBoosts = {
        common: 0.05,
        rare: 0.1,
        epic: 0.2,
        legendary: 0.4,
      };

      return boost + (rarityBoosts[card.rarity] || 0);
    }, 1);
  };

  const attackBoss = async (boss) => {
    if (!myEmail) {
      toast.error('You need to be logged in to attack');
      return;
    }

    if (attackedTodayIds.includes(boss.id)) {
      toast.error('Already attacked this boss today');
      return;
    }

    setAttacking(boss.id);

    try {
      /**
       * Re-check latest boss HP directly before attacking.
       * This prevents attacking stale HP if another player attacked at the same time.
       */
      const { data: latestBoss, error: bossFetchError } = await supabase
        .from('raid_bosses')
        .select('*')
        .eq('id', boss.id)
        .single();

      if (bossFetchError) throw bossFetchError;

      if (!latestBoss || latestBoss.status !== 'alive') {
        toast.error('This boss has already been defeated');
        return;
      }

      const eventBoost = calculateEventBoost();
      const baseDmg = 500 + Math.random() * 500;
      const damage = Math.round(baseDmg * eventBoost);

      const newHp = Math.max(0, latestBoss.current_hp - damage);
      const killed = newHp <= 0;

      const now = new Date().toISOString();

      const { error: bossUpdateError } = await supabase
        .from('raid_bosses')
        .update({
          current_hp: newHp,
          status: killed ? 'defeated' : 'alive',
          defeated_at: killed ? now : latestBoss.defeated_at,
          total_attackers: (latestBoss.total_attackers || 0) + 1,
          updated_at: now,
        })
        .eq('id', latestBoss.id);

      if (bossUpdateError) throw bossUpdateError;

      const { error: attackInsertError } = await supabase
        .from('raid_attacks')
        .insert({
          raid_boss_id: latestBoss.id,
          attacker_email: myEmail,
          attacker_name: me?.full_name || myEmail,
          damage_dealt: damage,
          is_killing_blow: killed,
          created_at: now,
        });

      if (attackInsertError) throw attackInsertError;

      /**
       * Update only this player's event progress.
       */
      if (eventId) {
        const { data: myProgress, error: progressFetchError } = await supabase
          .from('player_event_progress')
          .select('*')
          .eq('event_id', eventId)
          .eq('created_by', myEmail)
          .maybeSingle();

        if (progressFetchError) throw progressFetchError;

        if (myProgress) {
          const { error: progressUpdateError } = await supabase
            .from('player_event_progress')
            .update({
              total_damage_dealt:
                (myProgress.total_damage_dealt || 0) + damage,
              total_bosses_killed: killed
                ? (myProgress.total_bosses_killed || 0) + 1
                : myProgress.total_bosses_killed || 0,
              event_rank_score:
                (myProgress.event_rank_score || 0) + damage,
              updated_at: now,
            })
            .eq('id', myProgress.id);

          if (progressUpdateError) throw progressUpdateError;
        } else {
          const { error: progressInsertError } = await supabase
            .from('player_event_progress')
            .insert({
              event_id: eventId,
              created_by: myEmail,
              current_floor: 1,
              prestige_count: 0,
              total_damage_dealt: damage,
              total_bosses_killed: killed ? 1 : 0,
              event_rank_score: damage,
              created_at: now,
              updated_at: now,
            });

          if (progressInsertError) throw progressInsertError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['raidBosses'] });
      queryClient.invalidateQueries({ queryKey: ['raidAttacks'] });
      queryClient.invalidateQueries({ queryKey: ['playerEventProgress'] });
      queryClient.invalidateQueries({ queryKey: ['eventRankings'] });

      toast.success(
        killed
          ? `💀 Boss slain! +${damage.toLocaleString()} dmg`
          : `⚔️ Hit for ${damage.toLocaleString()} damage!`
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Attack failed');
    } finally {
      setAttacking(null);
    }
  };

  const BossCard = ({ boss, isOwn }) => {
    const colorClass = elementColors[boss.boss_element] || 'border-border bg-card';
    const alreadyAttacked = attackedTodayIds.includes(boss.id);
    const isDefeated = boss.status === 'defeated';
    const isOwner = boss.owner_email === myEmail;

    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className={`rounded-xl border-2 p-3 space-y-2 ${colorClass} ${
          isDefeated ? 'opacity-50' : ''
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="font-display font-bold text-sm">
              {boss.boss_name}
            </p>
            <p className="text-[10px] text-muted-foreground">
              Floor {boss.floor_level} ·{' '}
              {boss.trigger_type === 'milestone' ? '⭐ Milestone' : '🎲 Random'} ·{' '}
              {boss.boss_element}
            </p>
          </div>

          {isDefeated && (
            <span className="text-[10px] text-muted-foreground font-bold">
              SLAIN
            </span>
          )}
        </div>

        <HPBar current={boss.current_hp} max={boss.max_hp} />

        <p className="text-[10px] text-muted-foreground">
          {(boss.current_hp || 0).toLocaleString()} /{' '}
          {(boss.max_hp || 0).toLocaleString()} HP
        </p>

        <div className="flex gap-2">
          {!isDefeated && (
            <Button
              size="sm"
              className="flex-1 h-7 text-xs gap-1"
              disabled={alreadyAttacked || !!attacking}
              onClick={() => attackBoss(boss)}
            >
              {attacking === boss.id ? (
                '…'
              ) : alreadyAttacked ? (
                'Attacked ✓'
              ) : (
                <>
                  <Swords className="w-3 h-3" /> Attack
                </>
              )}
            </Button>
          )}

          {isOwn && !isDefeated && isOwner && (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                title="Friends only"
                onClick={() =>
                  shareToggle(
                    boss,
                    boss.shared_to === 'friends' ? 'private' : 'friends'
                  )
                }
              >
                <Users
                  className={`w-3 h-3 ${
                    boss.shared_to === 'friends' || boss.shared_to === 'public'
                      ? 'text-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              </Button>

              <Button
                size="sm"
                variant="outline"
                className="h-7 w-7 p-0"
                title="Share public"
                onClick={() =>
                  shareToggle(
                    boss,
                    boss.shared_to === 'public' ? 'friends' : 'public'
                  )
                }
              >
                <Globe
                  className={`w-3 h-3 ${
                    boss.shared_to === 'public'
                      ? 'text-green-400'
                      : 'text-muted-foreground'
                  }`}
                />
              </Button>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  if (myBossesLoading || publicBossesLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            My Raid Queue ({aliveBosses.length}/15)
          </p>

          <p className="text-[10px] text-muted-foreground">
            <Lock className="inline w-3 h-3 mr-0.5" />
            private ·{' '}
            <Users className="inline w-3 h-3 mr-0.5" />
            friends ·{' '}
            <Globe className="inline w-3 h-3 mr-0.5" />
            public
          </p>
        </div>

        {aliveBosses.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Skull className="w-10 h-10 mx-auto mb-2 opacity-20" />
            <p className="text-sm">No active bosses. Keep clearing floors!</p>
          </div>
        )}

        <AnimatePresence>
          {aliveBosses.map((boss) => (
            <BossCard key={boss.id} boss={boss} isOwn />
          ))}
        </AnimatePresence>

        {defeatedBosses.length > 0 && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">
              Defeated ({defeatedBosses.length})
            </summary>

            <div className="mt-2 space-y-2 opacity-60">
              {defeatedBosses.slice(0, 5).map((boss) => (
                <BossCard key={boss.id} boss={boss} isOwn />
              ))}
            </div>
          </details>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Globe className="inline w-3.5 h-3.5 mr-1" />
          Public Raid Board ({visiblePublicBosses.length})
        </p>

        {visiblePublicBosses.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">
            No public raids available
          </p>
        )}

        <AnimatePresence>
          {visiblePublicBosses.map((boss) => (
            <BossCard key={boss.id} boss={boss} isOwn={false} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}