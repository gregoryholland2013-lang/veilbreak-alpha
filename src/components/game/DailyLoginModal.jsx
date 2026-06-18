import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { Clock, Gift, Mail, Sparkles, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

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
      entries.push({
        key,
        label,
        amount,
      });
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
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Reward contents will appear in your Mailbox.
      </p>
    );
  }

  return (
    <div className="mt-4 flex flex-wrap gap-2">
      {entries.map((entry) => (
        <span
          key={entry.key}
          className="rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[10px] font-black text-primary"
        >
          {entry.label} ×{Number(entry.amount || 0).toLocaleString()}
        </span>
      ))}
    </div>
  );
}

export default function DailyLoginModal() {
  const location = useLocation();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [delivering, setDelivering] = useState(false);

  const weekStart = getWeekStart();
  const todayStr = getTodayStr();
  const dismissedKey = `veilbreak-daily-login-dismissed-${todayStr}`;

  const shouldNeverShowHere =
    location.pathname === '/daily-login' || location.pathname === '/mailbox';

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

  const { data: rewards = [], isLoading: rewardsLoading } = useQuery({
    queryKey: ['dailyLoginRewards'],
    enabled: !!userId,
    retry: false,
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

  const { data: progress = null, isLoading: progressLoading } = useQuery({
    queryKey: ['dailyLoginProgress', userId, weekStart],
    enabled: !!userId,
    retry: false,
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

  const nextReward = useMemo(() => {
    return rewards.find((reward) => reward.week_day === nextRewardDay) || null;
  }, [rewards, nextRewardDay]);

  const canDeliver =
    !!userId &&
    !shouldNeverShowHere &&
    !rewardsLoading &&
    !progressLoading &&
    !alreadyDeliveredToday &&
    !trackComplete &&
    !!nextReward;

  useEffect(() => {
    if (!canDeliver) {
      setOpen(false);
      return;
    }

    const dismissedThisSession = sessionStorage.getItem(dismissedKey) === '1';

    if (!dismissedThisSession) {
      const timer = window.setTimeout(() => {
        setOpen(true);
      }, 700);

      return () => window.clearTimeout(timer);
    }
  }, [canDeliver, dismissedKey]);

  function closeForSession() {
    sessionStorage.setItem(dismissedKey, '1');
    setOpen(false);
  }

  async function deliverReward() {
    if (!canDeliver || delivering) return;

    setDelivering(true);

    try {
      const { data, error } = await supabase.rpc('deliver_daily_login_reward');

      if (error) throw error;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['dailyLoginProgress'] }),
        queryClient.invalidateQueries({ queryKey: ['mailboxMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['mailboxUnreadCount'] }),
      ]);

      sessionStorage.setItem(dismissedKey, '1');
      setOpen(false);

      toast.success(
        data?.message || 'Daily Login reward delivered to your Mailbox.'
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not deliver Daily Login reward.');
    } finally {
      setDelivering(false);
    }
  }

  if (!userId || shouldNeverShowHere) return null;

  return (
    <AnimatePresence>
      {open && canDeliver && (
        <motion.div
          className="fixed inset-0 z-[10050] flex items-center justify-center bg-background/80 px-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/40 bg-card shadow-2xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-purple-700/10" />
            <div className="absolute -right-20 -top-20 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />

            <button
              type="button"
              onClick={closeForSession}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background/70 text-muted-foreground transition-all hover:text-foreground"
              aria-label="Close Daily Login"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative p-5">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.28em] text-primary">
                <Sparkles className="h-4 w-4" />
                Daily Login Ready
              </div>

              <h2 className="mt-3 font-display text-3xl font-black text-primary text-glow-gold">
                Day {nextRewardDay} Reward
              </h2>

              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Your next weekly login reward is ready. Deliver it to your
                Mailbox, then claim it from Mailbox whenever you want.
              </p>

              <div className="mt-5 rounded-2xl border border-primary/30 bg-background/55 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-2xl">
                    {nextReward.icon || '🎁'}
                  </div>

                  <div className="min-w-0">
                    <p className="font-display text-lg font-black text-primary">
                      {nextReward.title}
                    </p>

                    {nextReward.description && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {nextReward.description}
                      </p>
                    )}

                    <RewardPills rewardJson={nextReward.reward_json} />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border bg-background/40 p-3">
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Missing a day does not skip this reward. The weekly track
                    resets every Monday, so consistent logins unlock more of
                    the 7-day path.
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-2">
                <Button
                  onClick={deliverReward}
                  disabled={delivering}
                  className="h-11 gap-2"
                >
                  <Mail className="h-4 w-4" />
                  {delivering ? 'Delivering…' : 'Deliver to Mailbox'}
                </Button>

                <Link to="/daily-login" onClick={closeForSession}>
                  <Button variant="outline" className="h-11 w-full gap-2">
                    <Gift className="h-4 w-4" />
                    View Weekly Track
                  </Button>
                </Link>

                <button
                  type="button"
                  onClick={closeForSession}
                  className="py-1 text-xs font-bold text-muted-foreground hover:text-foreground"
                >
                  Later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
