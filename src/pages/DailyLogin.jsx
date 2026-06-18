import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Gift,
  Lock,
  Mail,
  Sparkles,
} from 'lucide-react';

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);

  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return monday.toISOString().split('T')[0];
}

function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

function rewardEntries(rewardJson = {}) {
  const reward = rewardJson || {};
  const entries = [];

  const labels = {
    gold: 'Gold',
    gems: 'Gems',
    stamina: 'Stamina',
    attack_energy: 'Attack Energy',
    defense_energy: 'Defense Energy',
    summon_ticket: 'Summon Ticket',
    summon_tickets: 'Summon Tickets',
    skill_shard: 'Skill Shard',
    skill_shards: 'Skill Shards',
    spirit_water: 'Spirit Water',
    stamina_potion: 'Stamina Potion',
    attack_refill: 'Attack Refill',
    defense_refill: 'Defense Refill',
  };

  Object.entries(labels).forEach(([key, label]) => {
    const amount = Number(reward[key] || 0);

    if (amount > 0) {
      entries.push({ key, label, amount });
    }
  });

  if (reward.items && typeof reward.items === 'object') {
    Object.entries(reward.items).forEach(([key, value]) => {
      const amount = Number(value || 0);

      if (amount > 0) {
        entries.push({
          key: `item_${key}`,
          label: String(key)
            .replaceAll('_', ' ')
            .replace(/\b\w/g, (letter) => letter.toUpperCase()),
          amount,
        });
      }
    });
  }

  return entries;
}

function RewardPills({ rewardJson }) {
  const entries = rewardEntries(rewardJson);

  if (!entries.length) {
    return <p className="text-[11px] text-muted-foreground">Reward contents hidden.</p>;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <span
          key={entry.key}
          className="rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] font-black text-primary"
        >
          {entry.label} ×{Number(entry.amount || 0).toLocaleString()}
        </span>
      ))}
    </div>
  );
}

function LoginRewardCard({ reward, state, onClaim, claiming }) {
  const isDelivered = state === 'delivered';
  const isReady = state === 'ready';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`overflow-hidden rounded-3xl border bg-card/85 shadow-xl ${
        isReady
          ? 'border-primary/50 glow-gold'
          : isDelivered
            ? 'border-emerald-400/25'
            : 'border-border/70'
      }`}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              isDelivered
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                : isReady
                  ? 'border-primary/35 bg-primary/15 text-primary'
                  : 'border-border bg-muted/40 text-muted-foreground'
            }`}
          >
            {isDelivered ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : isReady ? (
              <Gift className="h-6 w-6" />
            ) : (
              <Lock className="h-5 w-5" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                  Day {reward.week_day}
                </p>

                <h3 className="mt-1 truncate font-display text-lg font-black text-primary">
                  {reward.icon ? `${reward.icon} ` : ''}
                  {reward.title}
                </h3>

                {reward.description && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {reward.description}
                  </p>
                )}
              </div>

              <div className="shrink-0">
                {isReady ? (
                  <Button onClick={onClaim} disabled={claiming} className="gap-2">
                    <Mail className="h-4 w-4" />
                    {claiming ? 'Delivering…' : 'Deliver'}
                  </Button>
                ) : (
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-black ${
                      isDelivered
                        ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                        : 'border-border bg-muted/40 text-muted-foreground'
                    }`}
                  >
                    {isDelivered ? 'Delivered' : 'Locked'}
                  </span>
                )}
              </div>
            </div>

            <RewardPills rewardJson={reward.reward_json} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function DailyLogin() {
  const queryClient = useQueryClient();
  const [claiming, setClaiming] = useState(false);

  const weekStart = getWeekStart();
  const todayStr = getTodayStr();

  useEffect(() => {
    const channel = supabase
      .channel('daily-login-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_login_progress',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['dailyLoginProgress'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mailbox_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mailboxMessages'] });
          queryClient.invalidateQueries({ queryKey: ['mailboxUnreadCount'] });
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

  const userId = authUser?.id || null;

  const { data: rewards = [], isLoading: loadingRewards } = useQuery({
    queryKey: ['dailyLoginRewards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_login_rewards')
        .select('*')
        .eq('is_active', true)
        .order('week_day', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: progress = null, isLoading: loadingProgress } = useQuery({
    queryKey: ['dailyLoginProgress', userId, weekStart],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_login_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('week_start_date', weekStart)
        .maybeSingle();

      if (error) throw error;
      return data || null;
    },
  });

  const claimedCount = Number(progress?.claimed_count || 0);
  const alreadyDeliveredToday = progress?.last_claim_date === todayStr;
  const trackComplete = claimedCount >= 7;
  const nextRewardDay = Math.min(claimedCount + 1, 7);
  const canClaim = !!userId && !alreadyDeliveredToday && !trackComplete;

  const claimDailyLogin = async () => {
    if (!canClaim) {
      toast.error('Daily Login is not ready yet.');
      return;
    }

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc('deliver_daily_login_reward');

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dailyLoginProgress'] }),
        queryClient.invalidateQueries({ queryKey: ['mailboxMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['mailboxUnreadCount'] }),
      ]);

      toast.success(data?.message || 'Daily Login reward delivered to your Mailbox.');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not deliver Daily Login reward.');
    } finally {
      setClaiming(false);
    }
  };

  const loading = loadingRewards || loadingProgress;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-purple-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <PageHeader title="Daily Login" subtitle="Weekly reward track" />

        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
                  <Sparkles className="h-4 w-4" />
                  Weekly Login Track
                </div>

                <h1 className="mt-3 font-display text-4xl font-black text-primary text-glow-gold md:text-6xl">
                  DAILY LOGIN
                </h1>

                <p className="mt-3 max-w-3xl text-muted-foreground">
                  Claim one reward per day. Missing a day does not skip the
                  next reward, but the weekly track resets every Monday.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Week</p>
                  <p className="font-display text-xl font-black text-primary">
                    Active
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Progress</p>
                  <p className="font-display text-2xl font-black text-primary">
                    {claimedCount}/7
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Today</p>
                  <p className="font-display text-xl font-black text-foreground">
                    {alreadyDeliveredToday ? 'Done' : canClaim ? 'Ready' : '—'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-12">
          <section className="space-y-4 xl:col-span-8">
            <div className="rounded-3xl border border-primary/30 bg-card/90 shadow-2xl">
              <div className="border-b border-primary/20 bg-primary/5 p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                      <Gift className="h-4 w-4" />
                      Current Week
                    </p>

                    <h2 className="mt-2 font-display text-2xl font-black">
                      Reward Path
                    </h2>
                  </div>

                  <Button
                    onClick={claimDailyLogin}
                    disabled={!canClaim || claiming}
                    className="gap-2"
                  >
                    <Mail className="h-4 w-4" />
                    {claiming
                      ? 'Delivering…'
                      : alreadyDeliveredToday
                        ? 'Delivered Today'
                        : trackComplete
                          ? 'Week Complete'
                          : 'Deliver Today'}
                  </Button>
                </div>
              </div>

              <div className="space-y-3 p-5">
                {loading && (
                  <div className="rounded-3xl border border-border bg-background/50 p-8 text-center text-muted-foreground">
                    Loading Daily Login…
                  </div>
                )}

                {!loading &&
                  rewards.map((reward) => {
                    let state = 'locked';

                    if (reward.week_day <= claimedCount) {
                      state = 'delivered';
                    } else if (reward.week_day === nextRewardDay && canClaim) {
                      state = 'ready';
                    }

                    return (
                      <LoginRewardCard
                        key={reward.id || reward.week_day}
                        reward={reward}
                        state={state}
                        onClaim={claimDailyLogin}
                        claiming={claiming}
                      />
                    );
                  })}

                {!loading && !rewards.length && (
                  <div className="rounded-3xl border border-border bg-background/50 p-8 text-center">
                    <Gift className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-60" />
                    <p className="font-display text-xl font-black text-primary">
                      No login rewards found
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Run the Daily Login SQL seed first.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <section className="rounded-3xl border border-yellow-500/30 bg-card/90 shadow-2xl">
              <div className="border-b border-yellow-500/20 bg-yellow-500/5 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                  <Clock className="h-4 w-4" />
                  Rules
                </div>

                <h3 className="mt-2 font-display text-2xl font-black">
                  Login Logic
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  This track rewards consistent logins without permanently
                  skipping days after a missed login.
                </p>
              </div>

              <div className="space-y-3 p-5">
                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-sm font-black text-primary">
                    One reward per day
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    A player can deliver one login reward to the Mailbox each
                    calendar day.
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-sm font-black text-primary">
                    Missed days do not skip
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The next login gets the next unclaimed reward in the weekly
                    track.
                  </p>
                </div>

                <Link to="/mailbox">
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 transition-all hover:bg-primary/15">
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                      <div>
                        <p className="font-display font-black text-primary">
                          Open Mailbox
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Delivered login rewards wait in the Mailbox until
                          claimed.
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
