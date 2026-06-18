import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Clock,
  Gift,
  Inbox,
  Mail,
  PackageOpen,
  RefreshCcw,
  Sparkles,
} from 'lucide-react';

function formatDate(value) {
  if (!value) return '—';

  return new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatSource(value) {
  return String(value || 'system')
    .replaceAll('_', ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function rewardEntries(rewardJson = {}) {
  const reward = rewardJson || {};
  const entries = [];

  const directLabels = {
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
    aether_dust: 'Aether Dust',
  };

  Object.entries(directLabels).forEach(([key, label]) => {
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

  if (reward.cards && Array.isArray(reward.cards)) {
    reward.cards.forEach((card, index) => {
      entries.push({
        key: `card_${card.card_id || index}`,
        label: card.name || 'Card Reward',
        amount: Number(card.quantity || 1),
      });
    });
  }

  return entries;
}

function RewardSummary({ rewardJson }) {
  const entries = rewardEntries(rewardJson);

  if (!entries.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Reward contents will be shown when claimed.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
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

function MailCard({ mail, onClaim, claiming }) {
  const claimed = mail.status === 'claimed';
  const expired =
    mail.expires_at && new Date(mail.expires_at).getTime() <= Date.now();
  const claimable = !claimed && !expired && mail.status === 'claimable';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`rounded-3xl border bg-card/85 shadow-xl overflow-hidden ${
        claimed
          ? 'border-emerald-400/25'
          : claimable
            ? 'border-primary/35'
            : 'border-border/70'
      }`}
    >
      <div className="p-4 md:p-5">
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${
              claimed
                ? 'border-emerald-400/30 bg-emerald-500/15 text-emerald-300'
                : claimable
                  ? 'border-primary/35 bg-primary/15 text-primary'
                  : 'border-border bg-muted/40 text-muted-foreground'
            }`}
          >
            {claimed ? (
              <CheckCircle2 className="h-6 w-6" />
            ) : (
              <Gift className="h-6 w-6" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/80">
                  {formatSource(mail.source_type)}
                </p>

                <h3 className="mt-1 truncate font-display text-lg font-black text-primary">
                  {mail.title}
                </h3>

                {mail.body && (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {mail.body}
                  </p>
                )}
              </div>

              <div className="shrink-0 text-left md:text-right">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Delivered
                </p>
                <p className="text-xs font-bold text-foreground">
                  {formatDate(mail.delivered_at || mail.created_at)}
                </p>
              </div>
            </div>

            <RewardSummary rewardJson={mail.reward_json} />

            <div className="mt-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div className="text-[11px] text-muted-foreground">
                {claimed && mail.claimed_at
                  ? `Claimed ${formatDate(mail.claimed_at)}`
                  : expired
                    ? 'Expired'
                    : mail.expires_at
                      ? `Expires ${formatDate(mail.expires_at)}`
                      : 'No expiration'}
              </div>

              {claimable ? (
                <Button
                  onClick={() => onClaim(mail.id)}
                  disabled={claiming}
                  className="gap-2"
                >
                  <PackageOpen className="h-4 w-4" />
                  {claiming ? 'Claiming…' : 'Claim Reward'}
                </Button>
              ) : (
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-black ${
                    claimed
                      ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-300'
                      : 'border-border bg-muted/40 text-muted-foreground'
                  }`}
                >
                  {claimed ? 'Claimed' : 'Unavailable'}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function Mailbox() {
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState('claimable');
  const [claimingMailId, setClaimingMailId] = useState(null);
  const [claimingAll, setClaimingAll] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('mailbox-messages-realtime')
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

  const {
    data: messages = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['mailboxMessages', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error: mailboxError } = await supabase
        .from('mailbox_messages')
        .select('*')
        .eq('user_id', userId)
        .order('delivered_at', { ascending: false })
        .limit(100);

      if (mailboxError) throw mailboxError;

      return data || [];
    },
  });

  const counts = useMemo(() => {
    const claimable = messages.filter((message) => {
      const expired =
        message.expires_at &&
        new Date(message.expires_at).getTime() <= Date.now();

      return message.status === 'claimable' && !expired;
    }).length;

    const claimed = messages.filter((message) => {
      return message.status === 'claimed';
    }).length;

    return {
      all: messages.length,
      claimable,
      claimed,
      system: messages.filter((message) => message.source_type === 'system')
        .length,
    };
  }, [messages]);

  const filteredMessages = useMemo(() => {
    return messages.filter((message) => {
      const expired =
        message.expires_at &&
        new Date(message.expires_at).getTime() <= Date.now();

      if (filter === 'claimable') {
        return message.status === 'claimable' && !expired;
      }

      if (filter === 'claimed') {
        return message.status === 'claimed';
      }

      if (filter === 'system') {
        return message.source_type === 'system';
      }

      return true;
    });
  }, [messages, filter]);

  const claimMail = async (messageId) => {
    setClaimingMailId(messageId);

    try {
      const { data, error: claimError } = await supabase.rpc(
        'claim_mailbox_message',
        {
          p_message_id: messageId,
        }
      );

      if (claimError) throw claimError;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mailboxMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['mailboxUnreadCount'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerItems'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);

      toast.success(data?.message || 'Reward claimed!');
    } catch (claimError) {
      console.error(claimError);
      toast.error(claimError.message || 'Could not claim mail reward.');
    } finally {
      setClaimingMailId(null);
    }
  };

  const claimAll = async () => {
    setClaimingAll(true);

    try {
      const { data, error: claimError } = await supabase.rpc(
        'claim_all_mailbox_messages'
      );

      if (claimError) throw claimError;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['mailboxMessages'] }),
        queryClient.invalidateQueries({ queryKey: ['mailboxUnreadCount'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerItems'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      ]);

      toast.success(
        `Claimed ${Number(data?.claimed_count || 0).toLocaleString()} mailbox reward(s).`
      );
    } catch (claimError) {
      console.error(claimError);
      toast.error(claimError.message || 'Could not claim all mail rewards.');
    } finally {
      setClaimingAll(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-purple-700/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <PageHeader title="Mailbox" subtitle="Reward deliveries" />

        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/40" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
                  <Mail className="h-4 w-4" />
                  Delivery Box
                </div>

                <h1 className="mt-3 font-display text-4xl font-black text-primary text-glow-gold md:text-6xl">
                  MAILBOX
                </h1>

                <p className="mt-3 max-w-3xl text-muted-foreground">
                  Rewards, gifts, compensation, and system deliveries arrive
                  here before entering your account.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Claimable</p>
                  <p className="font-display text-2xl font-black text-primary">
                    {counts.claimable}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Claimed</p>
                  <p className="font-display text-2xl font-black text-emerald-300">
                    {counts.claimed}
                  </p>
                </div>

                <div className="rounded-2xl border border-border bg-background/50 p-3">
                  <p className="text-[10px] text-muted-foreground">Total</p>
                  <p className="font-display text-2xl font-black text-foreground">
                    {counts.all}
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
                      <Inbox className="h-4 w-4" />
                      Mail Deliveries
                    </p>
                    <h2 className="mt-2 font-display text-2xl font-black">
                      Reward Inbox
                    </h2>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {[
                      ['claimable', `Claimable ${counts.claimable}`],
                      ['all', `All ${counts.all}`],
                      ['claimed', `Claimed ${counts.claimed}`],
                      ['system', `System ${counts.system}`],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setFilter(value)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-black transition-all ${
                          filter === value
                            ? 'border-primary bg-primary/15 text-primary'
                            : 'border-border bg-background/50 text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Showing {filteredMessages.length} message(s).
                  </p>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => refetch()}
                      className="gap-2"
                    >
                      <RefreshCcw className="h-4 w-4" />
                      Refresh
                    </Button>

                    <Button
                      onClick={claimAll}
                      disabled={!counts.claimable || claimingAll}
                      className="gap-2"
                    >
                      <Gift className="h-4 w-4" />
                      {claimingAll ? 'Claiming…' : 'Claim All'}
                    </Button>
                  </div>
                </div>

                {isLoading && (
                  <div className="rounded-3xl border border-border bg-background/50 p-8 text-center text-muted-foreground">
                    Loading mailbox…
                  </div>
                )}

                {error && (
                  <div className="rounded-3xl border border-destructive/40 bg-destructive/10 p-5">
                    <p className="font-bold text-destructive">
                      Mailbox load failed
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {error.message}
                    </p>
                  </div>
                )}

                {!isLoading && !error && filteredMessages.length === 0 && (
                  <div className="rounded-3xl border border-border bg-background/50 p-8 text-center">
                    <Inbox className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-60" />
                    <p className="font-display text-xl font-black text-primary">
                      No mail here
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Claimable rewards from Daily Login, Arena, Quests, and
                      system gifts will appear here.
                    </p>
                  </div>
                )}

                <AnimatePresence>
                  {filteredMessages.map((mail) => (
                    <MailCard
                      key={mail.id}
                      mail={mail}
                      onClaim={claimMail}
                      claiming={claimingMailId === mail.id}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </section>

          <aside className="space-y-6 xl:col-span-4">
            <section className="rounded-3xl border border-yellow-500/30 bg-card/90 shadow-2xl">
              <div className="border-b border-yellow-500/20 bg-yellow-500/5 p-5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-yellow-300">
                  <Sparkles className="h-4 w-4" />
                  Daily System
                </div>

                <h3 className="mt-2 font-display text-2xl font-black">
                  Login Delivery
                </h3>

                <p className="mt-2 text-sm text-muted-foreground">
                  Daily Login rewards are generated first, then delivered here
                  as mailbox rewards.
                </p>
              </div>

              <div className="space-y-3 p-5">
                <Link to="/daily-login">
                  <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 transition-all hover:bg-primary/15">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/15 text-primary">
                        <Gift className="h-5 w-5" />
                      </div>

                      <div>
                        <p className="font-display font-black text-primary">
                          Open Daily Login
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Claim one weekly reward per day. Missing a day does
                          not skip the next reward.
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>

                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <div className="flex items-start gap-3">
                    <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      Each week resets on Monday. Unclaimed rewards from the
                      weekly track do not carry into the next week.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
