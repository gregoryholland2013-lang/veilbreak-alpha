import React, { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Gift,
  Mail,
  RefreshCw,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

function normalizeReferralCode(value) {
  return String(value || '')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '');
}

function Milestone({ done, title, reward }) {
  return (
    <div
      className={`rounded-2xl border p-3 ${
        done
          ? 'border-emerald-400/30 bg-emerald-500/10'
          : 'border-border bg-background/40'
      }`}
    >
      <div className="flex items-start gap-2">
        <CheckCircle2
          className={`mt-0.5 h-4 w-4 shrink-0 ${
            done ? 'text-emerald-300' : 'text-muted-foreground'
          }`}
        />
        <div>
          <p className="text-xs font-black text-foreground">{title}</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            {reward}
          </p>
        </div>
      </div>
    </div>
  );
}

function ReferredPlayerCard({ player }) {
  const milestones = player?.milestones || {};
  const loginDays = Number(player?.loginDays || 0);
  const level = Number(player?.level || 1);
  const questsCompleted = Number(player?.questsCompleted || 0);

  return (
    <div className="rounded-3xl border border-border bg-card/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-base font-black text-foreground">
            {player?.displayName || 'Adventurer'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Level {level}
            {player?.faction ? ` · ${player.faction}` : ' · No faction yet'}
          </p>
        </div>
        <div className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-black uppercase text-primary">
          {player?.status || 'pending'}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-background/40 p-2 text-center">
          <p className="font-display text-sm font-black text-primary">{level}</p>
          <p className="text-[10px] text-muted-foreground">Level</p>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-2 text-center">
          <p className="font-display text-sm font-black text-primary">
            {questsCompleted}
          </p>
          <p className="text-[10px] text-muted-foreground">Quests</p>
        </div>
        <div className="rounded-xl border border-border bg-background/40 p-2 text-center">
          <p className="font-display text-sm font-black text-primary">
            {loginDays}/3
          </p>
          <p className="text-[10px] text-muted-foreground">Login Days</p>
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Milestone
          done={Boolean(milestones.level5ReferrerClaimed)}
          title="Level 5"
          reward="You receive 1 Summon Ticket + 1,000 Gold."
        />
        <Milestone
          done={Boolean(milestones.chapter1ReferrerClaimed)}
          title="Book 1 Chapter 1"
          reward="Both receive 2 Summon Tickets + 2,500 Gold."
        />
        <Milestone
          done={Boolean(milestones.threeDayReferrerClaimed)}
          title="3 Login Days"
          reward="You receive 25 Gems + 2 Summon Tickets."
        />
      </div>
    </div>
  );
}

export default function ReferralPanel() {
  const queryClient = useQueryClient();
  const [referralInput, setReferralInput] = useState('');
  const [applying, setApplying] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRef = normalizeReferralCode(params.get('ref'));
    const storedRef = normalizeReferralCode(
      window.localStorage.getItem('veilbreak_referral_code')
    );

    if (urlRef) {
      window.localStorage.setItem('veilbreak_referral_code', urlRef);
      setReferralInput(urlRef);
      return;
    }

    if (storedRef) {
      setReferralInput(storedRef);
    }
  }, []);

  const {
    data: dashboard = null,
    error: dashboardError = null,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['referralDashboard'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_referral_dashboard');

      if (error) {
        throw error;
      }

      return data;
    },
    retry: false,
    staleTime: 0,
  });

  const referralCode = dashboard?.code?.code || '';

  const shareLink = useMemo(() => {
    if (!referralCode) return '';
    return `${window.location.origin}/?ref=${referralCode}`;
  }, [referralCode]);

  const copyText = async (value, message) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(message);
    } catch (error) {
      console.error(error);
      toast.error('Could not copy.');
    }
  };

  const applyReferral = async () => {
    const code = normalizeReferralCode(referralInput);

    if (!code) {
      toast.error('Enter a referral code.');
      return;
    }

    setApplying(true);

    try {
      const { data, error } = await supabase.rpc('apply_referral_code', {
        p_code: code,
      });

      if (error) throw error;

      window.localStorage.removeItem('veilbreak_referral_code');
      toast.success(data?.message || 'Referral code applied.');
      await queryClient.invalidateQueries({ queryKey: ['referralDashboard'] });
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not apply referral code.');
    } finally {
      setApplying(false);
    }
  };

  const checkMilestones = async () => {
    setChecking(true);

    try {
      const { data, error } = await supabase.rpc(
        'check_current_user_referral_milestones'
      );

      if (error) throw error;

      const delivered = Array.isArray(data?.delivered) ? data.delivered.length : 0;
      toast.success(
        delivered > 0
          ? `${delivered} referral reward(s) delivered to Mailbox.`
          : 'Referral milestones checked.'
      );

      await queryClient.invalidateQueries({ queryKey: ['referralDashboard'] });
      await queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not check referral milestones.');
    } finally {
      setChecking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <div className="rounded-3xl border border-border bg-card/70 p-5 text-center text-sm text-muted-foreground">
          Loading referrals…
        </div>
      </div>
    );
  }

  if (dashboardError) {
    return (
      <div className="p-4">
        <div className="space-y-3 rounded-3xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200">
          <p className="font-display text-base font-black">
            Referrals could not load.
          </p>
          <p className="text-xs leading-relaxed text-red-100/90">
            Backend error: {dashboardError.message || 'Unknown referral RPC error'}
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Run the referrals schema repair SQL, then refresh this page.
          </p>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="p-4">
        <div className="rounded-3xl border border-red-400/30 bg-red-500/10 p-5 text-sm text-red-200">
          Referrals returned no dashboard data. Run the referrals schema repair SQL.
        </div>
      </div>
    );
  }

  const canApplyReferral = Boolean(dashboard?.canApplyReferral);
  const appliedReferral = dashboard?.appliedReferral;
  const players = dashboard?.players || [];

  return (
    <div className="space-y-5 p-4 pb-28">
      <section className="relative overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/15 via-card/80 to-purple-500/10 p-5 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15">
            <Share2 className="h-7 w-7 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-primary/80">
              Referral Bonds
            </p>
            <h2 className="font-display text-2xl font-black text-primary">
              Invite Players
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Share Veilbreak with new players. Rewards unlock only after they
              play, level, quest, and return.
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-primary/30 bg-card/70 p-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="font-display text-lg font-black text-primary">
            Your Referral Code
          </p>
        </div>

        <div className="mt-3 rounded-2xl border border-primary/30 bg-background/50 p-3">
          <p className="break-all text-center font-display text-2xl font-black tracking-widest text-primary">
            {referralCode || '—'}
          </p>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => copyText(referralCode, 'Referral code copied.')}
            disabled={!referralCode}
            variant="outline"
            className="gap-2"
          >
            <Copy className="h-4 w-4" />
            Copy Code
          </Button>

          <Button
            type="button"
            onClick={() => copyText(shareLink, 'Referral link copied.')}
            disabled={!shareLink}
            className="gap-2"
          >
            <Share2 className="h-4 w-4" />
            Copy Link
          </Button>
        </div>
      </section>

      {canApplyReferral && (
        <section className="rounded-3xl border border-purple-400/30 bg-purple-950/20 p-4">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-purple-300" />
            <p className="font-display text-lg font-black text-purple-200">
              Have a Referral Code?
            </p>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            Referral codes can only be used before Level 3.
          </p>

          <div className="mt-3 flex gap-2">
            <Input
              value={referralInput}
              onChange={(event) =>
                setReferralInput(normalizeReferralCode(event.target.value))
              }
              placeholder="VB..."
              className="h-11"
            />

            <Button
              type="button"
              onClick={applyReferral}
              disabled={applying || !referralInput}
            >
              {applying ? 'Applying…' : 'Apply'}
            </Button>
          </div>
        </section>
      )}

      {!canApplyReferral && appliedReferral && (
        <section className="rounded-3xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <p className="font-display text-lg font-black text-emerald-200">
              Referral Applied
            </p>
          </div>

          <p className="mt-1 text-xs text-muted-foreground">
            This account is connected to referral code{' '}
            <span className="font-black text-foreground">
              {appliedReferral.referralCode}
            </span>
            .
          </p>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-3xl border border-border bg-card/70 p-4 text-center">
          <Users className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-2xl font-black text-primary">
            {dashboard?.stats?.totalReferred || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Total Referrals</p>
        </div>

        <div className="rounded-3xl border border-border bg-card/70 p-4 text-center">
          <Ticket className="mx-auto mb-2 h-5 w-5 text-primary" />
          <p className="font-display text-2xl font-black text-primary">
            {dashboard?.stats?.completed || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Completed Bonds</p>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-400/25 bg-yellow-500/10 p-4">
        <div className="flex items-start gap-3">
          <Mail className="mt-1 h-5 w-5 shrink-0 text-yellow-300" />
          <div>
            <p className="font-display text-base font-black text-yellow-200">
              Rewards go to Mailbox
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Referrers are not rewarded instantly. Rewards unlock after real
              progress: Level 5, Book 1 Chapter 1, and 3 login days.
            </p>
          </div>
        </div>

        <Button
          type="button"
          onClick={checkMilestones}
          disabled={checking}
          variant="outline"
          className="mt-3 w-full gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {checking ? 'Checking…' : 'Check Referral Milestones'}
        </Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="font-display text-lg font-black text-primary">
            Referred Players
          </h3>

          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            v1 Milestones
          </p>
        </div>

        {players.length === 0 ? (
          <div className="rounded-3xl border border-border bg-card/70 p-5 text-center text-sm text-muted-foreground">
            No referred players yet. Share your link to start building Referral
            Bonds.
          </div>
        ) : (
          <div className="space-y-3">
            {players.map((player) => (
              <ReferredPlayerCard key={player.id} player={player} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
