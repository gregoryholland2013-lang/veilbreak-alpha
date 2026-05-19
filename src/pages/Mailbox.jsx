import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import { useProfile, useUpdateProfile } from '@/hooks/useGameData';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { CheckCircle2, Gift, Lock } from 'lucide-react';

// Get the Monday of the current week as ISO date string
function getWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);

  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return monday.toISOString().split('T')[0];
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

// Get current day of week: Mon=1 ... Sun=7
function getTodayDayNum() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

const rewardApply = {
  gold: (profile, amt) => ({
    gold: (profile.gold || 0) + amt,
  }),
  gems: (profile, amt) => ({
    gems: (profile.gems || 0) + amt,
  }),
  stamina_potion: (profile, amt) => ({
    stamina: Math.min(
      (profile.stamina || 0) + amt,
      profile.max_stamina || 100
    ),
  }),
  atk_boost: () => ({}),
  def_boost: () => ({}),
  card_pack: () => ({}),
  skill_shards: () => ({}),
  fodder: () => ({}),
};

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

async function applyInventoryReward(inventory, rewardType, amount) {
  if (!inventory) return;

  const updates = {};

  if (rewardType === 'skill_shards') {
    updates.skill_shards = (inventory.skill_shards || 0) + amount;
  }

  if (rewardType === 'fodder') {
    updates.fodder_cards = (inventory.fodder_cards || 0) + amount;
  }

  if (Object.keys(updates).length === 0) return;

  const { error } = await supabase
    .from('player_inventory')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', inventory.id);

  if (error) {
    throw error;
  }
}

export default function Mailbox() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();

  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const weekStart = getWeekStart();
  const todayStr = getTodayStr();
  const todayDay = getTodayDayNum();

  /**
   * Supabase Realtime
   * Keeps mailbox, login record, profile, and inventory reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('mailbox-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mail_rewards',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mailRewards'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_login_records',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['loginRecord'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_inventory',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: getAuthUser,
  });

  const userId = authUser?.id || null;
  const myEmail = authUser?.email || null;

  const { data: mailRewards = [] } = useQuery({
    queryKey: ['mailRewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mail_rewards')
        .select('*')
        .order('day', { ascending: true })
        .limit(7);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: loginRecord = null } = useQuery({
    queryKey: ['loginRecord', userId, weekStart],
    enabled: !!userId,
    queryFn: async () => {
      /**
       * Try to find this user's record for the current week.
       */
      const { data: existing, error: fetchError } = await supabase
        .from('player_login_records')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existing) {
        return existing;
      }

      /**
       * Create the weekly login record if it does not exist.
       */
      const now = new Date().toISOString();

      const { data: created, error: createError } = await supabase
        .from('player_login_records')
        .insert({
          id: userId,
          email: myEmail,
          week_start: weekStart,
          claimed_days: [],
          last_claim_date: null,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return created;
    },
  });

  const { data: inventory = null } = useQuery({
    queryKey: ['playerInventory', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const claimedDays = loginRecord?.claimed_days || [];

  const sortedRewards = useMemo(() => {
    return [...mailRewards].sort((a, b) => a.day - b.day);
  }, [mailRewards]);

  const canClaimToday =
    loginRecord &&
    !claimedDays.includes(todayDay) &&
    loginRecord.last_claim_date !== todayStr;

  const claimDay = async (reward) => {
    if (claiming || !profile || !loginRecord) return;

    if (claimedDays.includes(reward.day)) {
      toast.error('Already claimed!');
      return;
    }

    if (reward.day !== todayDay) {
      toast.error("You can only claim today's reward!");
      return;
    }

    if (loginRecord.last_claim_date === todayStr) {
      toast.error('Already claimed today!');
      return;
    }

    setClaiming(true);

    try {
      const now = new Date().toISOString();

      /**
       * Apply profile rewards.
       */
      const profileUpdates =
        rewardApply[reward.reward_type]?.(
          profile,
          reward.reward_amount
        ) || {};

      if (Object.keys(profileUpdates).length > 0) {
        await updateProfile.mutateAsync({
          id: profile.id,
          data: profileUpdates,
        });
      }

      /**
       * Apply inventory rewards.
       */
      await applyInventoryReward(
        inventory,
        reward.reward_type,
        reward.reward_amount
      );

      /**
       * Mark day as claimed.
       */
      const updatedClaimedDays = [...claimedDays, reward.day];

      const { error: loginRecordError } = await supabase
        .from('player_login_records')
        .update({
          claimed_days: updatedClaimedDays,
          last_claim_date: todayStr,
          updated_at: now,
        })
        .eq('id', loginRecord.id)
        .eq('user_id', userId);

      if (loginRecordError) {
        throw loginRecordError;
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['loginRecord'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
      ]);

      toast.success(`🎁 ${reward.title} claimed!`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not claim reward');
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Mailbox" />

      {/* Weekly reset notice */}
      <div className="mx-4 mt-4 mb-2 text-center">
        <p className="text-xs text-muted-foreground">
          Rewards reset every{' '}
          <span className="text-primary font-semibold">Monday</span>. Log in
          daily to claim all 7 rewards!
        </p>
      </div>

      {/* Today's highlight */}
      <div className="mx-4 mb-4 bg-primary/10 border border-primary/30 rounded-xl p-3 flex items-center gap-3">
        <Gift className="w-8 h-8 text-primary flex-shrink-0" />

        <div className="flex-1">
          <p className="text-sm font-display font-bold text-primary">
            Day {todayDay} — Today's Reward
          </p>

          {canClaimToday ? (
            <p className="text-xs text-muted-foreground">
              Your daily gift is ready to collect!
            </p>
          ) : claimedDays.includes(todayDay) ? (
            <p className="text-xs text-green-400">
              ✓ Claimed! Come back tomorrow.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Come back tomorrow for day {todayDay + 1}!
            </p>
          )}
        </div>
      </div>

      {/* Reward grid */}
      <div className="px-4 grid grid-cols-1 gap-3 pb-8">
        <AnimatePresence>
          {sortedRewards.map((reward, i) => {
            const claimed = claimedDays.includes(reward.day);
            const isToday = reward.day === todayDay;
            const isFuture = reward.day > todayDay;

            return (
              <motion.div
                key={reward.id || reward.day}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-xl border p-4 flex items-center gap-4 transition-all ${
                  claimed
                    ? 'border-green-500/30 bg-green-500/5 opacity-70'
                    : isToday
                      ? 'border-primary/60 bg-primary/10 glow-gold'
                      : isFuture
                        ? 'border-border/40 bg-card/40 opacity-60'
                        : 'border-border bg-card'
                }`}
              >
                {/* Day badge */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-display font-black text-sm flex-shrink-0 ${
                    claimed
                      ? 'bg-green-500/20 text-green-300'
                      : isToday
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {claimed ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : isFuture ? (
                    <Lock className="w-4 h-4" />
                  ) : (
                    `D${reward.day}`
                  )}
                </div>

                {/* Icon + info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{reward.icon || '🎁'}</span>

                    <div>
                      <p
                        className={`font-display font-bold text-sm ${
                          isToday ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {reward.title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {reward.description}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Claim button */}
                <div className="flex-shrink-0">
                  {claimed ? (
                    <span className="text-xs text-green-400 font-semibold">
                      Claimed
                    </span>
                  ) : isToday ? (
                    <Button
                      size="sm"
                      onClick={() => claimDay(reward)}
                      disabled={claiming}
                      className="bg-primary text-primary-foreground hover:bg-primary/90 font-display"
                    >
                      {claiming ? 'Claiming…' : 'Claim!'}
                    </Button>
                  ) : isFuture ? (
                    <span className="text-xs text-muted-foreground">
                      Day {reward.day}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground/50">
                      Missed
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}