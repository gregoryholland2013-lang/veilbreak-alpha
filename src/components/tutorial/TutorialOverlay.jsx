import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Gift,
  ScrollText,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const TUTORIAL_STEPS = [
  {
    step: 1,
    eyebrow: 'Welcome',
    title: 'Welcome to Veilbreak',
    body:
      'Veilbreak is built around collecting cards, building a deck, powering up your best units, and pushing through expeditions, raids, and arena battles.',
    objective: 'Learn the core loop: collect, build, enhance, battle.',
    reward: '500 Gold + 1 Summon Ticket',
  },
  {
    step: 2,
    eyebrow: 'Summon',
    title: 'Start Your Collection',
    body:
      'Use summon tickets, gold, or gems to pull new base cards. Summons are the main way to grow your card pool.',
    objective: 'Open the Veil Shop when you are ready and use your ticket.',
    reward: '1 Summon Ticket',
  },
  {
    step: 3,
    eyebrow: 'Collection',
    title: 'Review Your Cards',
    body:
      'Your collection shows owned cards, card art, rarities, factions, stats, and protected cards. Protect anything you do not want to consume.',
    objective: 'Check your collection after summoning.',
    reward: '50 Aether Dust',
  },
  {
    step: 4,
    eyebrow: 'Deck',
    title: 'Build Your Battle Deck',
    body:
      'A deck uses 5 cards. Your deck power comes from ATK, DEF, HP, levels, and evolutions. A stronger deck helps in battle and events.',
    objective: 'Create or update your active deck.',
    reward: '1 Stamina Potion',
  },
  {
    step: 5,
    eyebrow: 'Progression',
    title: 'Enhance, Evolve, and Skill Up',
    body:
      'Enhance cards with fodder and Aether Dust. Evolve same-line cards into stronger forms. Use Skill Shards to upgrade card skills.',
    objective: 'Use growth systems to strengthen your best card.',
    reward: '25 Gems + 5 Skill Shards',
  },
  {
    step: 6,
    eyebrow: 'Game Modes',
    title: 'Enter Expeditions, Raids, and Arena',
    body:
      'Expeditions push story progress. Raids reward event activity. Arena ranks players weekly with weighted points based on deck strength.',
    objective: 'Start playing the live modes and climb rankings.',
    reward: '1 Raid Ticket + 1 Summon Ticket',
  },
];

function normalizeClaimed(value) {
  if (Array.isArray(value)) return value.map(String);

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function formatRewards(rewards = {}) {
  const entries = Object.entries(rewards || {}).filter(([, value]) => {
    return Number(value || 0) > 0;
  });

  if (!entries.length) return 'Reward claimed.';

  return entries
    .map(([key, value]) => {
      const label = key
        .replaceAll('_', ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

      return `${Number(value).toLocaleString()} ${label}`;
    })
    .join(' · ');
}

export default function TutorialOverlay({ profile, onProfileUpdate }) {
  const queryClient = useQueryClient();

  const [dismissed, setDismissed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const tutorialCompleted = Boolean(profile?.tutorial_completed);
  const currentStep = Math.min(
    6,
    Math.max(1, Number(profile?.tutorial_step || 1))
  );

  const claimedSteps = useMemo(() => {
    return normalizeClaimed(profile?.tutorial_rewards_claimed);
  }, [profile]);

  const activeStep = TUTORIAL_STEPS.find((item) => item.step === currentStep);

  if (!profile || tutorialCompleted || dismissed || !activeStep) {
    return null;
  }

  const progressPercent = Math.round(
    (currentStep / TUTORIAL_STEPS.length) * 100
  );

  const rewardAlreadyClaimed = claimedSteps.includes(String(currentStep));

  async function claimReward() {
    if (!activeStep || claiming) return;

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc(
        'claim_tutorial_step_reward',
        {
          p_step: activeStep.step,
        }
      );

      if (error) throw error;

      const { data: freshProfile, error: freshProfileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profile.id)
        .maybeSingle();

      if (freshProfileError) throw freshProfileError;

      if (freshProfile) {
        onProfileUpdate?.(freshProfile);
      }

      await queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      await queryClient.invalidateQueries({ queryKey: ['profile'] });
      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['playerItems'] });

      toast.success(`Tutorial reward claimed: ${formatRewards(data?.rewards)}`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not claim tutorial reward');
    } finally {
      setClaiming(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[11000] bg-background/85 backdrop-blur-md flex items-center justify-center px-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/40 bg-card shadow-2xl">
        <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-primary/15 via-transparent to-yellow-500/10" />

        <div className="relative p-5 border-b border-border/80">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary font-black flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Tutorial {activeStep.step}/{TUTORIAL_STEPS.length}
              </p>

              <h2 className="font-display text-2xl font-black mt-2">
                {activeStep.title}
              </h2>

              <p className="text-xs text-muted-foreground mt-1">
                {activeStep.eyebrow}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setDismissed(true)}
              className="w-9 h-9 rounded-xl border border-border bg-background/50 hover:bg-muted flex items-center justify-center"
              aria-label="Close tutorial"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden mt-4">
            <div
              className="h-full bg-gradient-to-r from-primary via-yellow-400 to-purple-400 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="relative p-5 space-y-4">
          <div className="rounded-2xl border border-border bg-background/40 p-4">
            <div className="flex gap-3">
              <ScrollText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeStep.body}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
            <p className="text-xs font-black text-primary flex items-center gap-2">
              <Star className="w-4 h-4" />
              Objective
            </p>
            <p className="text-sm mt-1">{activeStep.objective}</p>
          </div>

          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4">
            <p className="text-xs font-black text-yellow-300 flex items-center gap-2">
              <Gift className="w-4 h-4" />
              Completion Reward
            </p>
            <p className="text-sm font-bold mt-1 text-yellow-100">
              {activeStep.reward}
            </p>
          </div>

          <Button
            onClick={claimReward}
            disabled={claiming || rewardAlreadyClaimed}
            className="w-full h-12 gap-2 font-black"
          >
            {rewardAlreadyClaimed ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Reward Already Claimed
              </>
            ) : claiming ? (
              'Claiming Reward…'
            ) : activeStep.step >= TUTORIAL_STEPS.length ? (
              <>
                <Trophy className="w-4 h-4" />
                Finish Tutorial
              </>
            ) : (
              <>
                Claim Reward + Continue
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            You can close this and continue later. It will reappear until the
            tutorial is completed.
          </p>
        </div>
      </div>
    </div>
  );
}