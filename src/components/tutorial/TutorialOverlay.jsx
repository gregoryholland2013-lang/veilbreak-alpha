import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  Gift,
  Map,
  ScrollText,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useDecks, usePlayerCards } from '@/hooks/useGameData';

const TUTORIAL_STEPS = [
  {
    step: 1,
    eyebrow: 'Welcome',
    title: 'Welcome to Veilbreak',
    body:
      'Veilbreak is about collecting cards, building a deck, strengthening your best units, and pushing into expeditions, raids, and arena battles.',
    objective: 'Begin your journey.',
    reward: '500 Gold + 1 Summon Ticket',
    route: null,
    actionLabel: null,
  },
  {
    step: 2,
    eyebrow: 'Shop',
    title: 'Visit the Veil Shop',
    body:
      'The Veil Shop is where players find summons, packs, tickets, stamina items, and event bundles.',
    objective: 'Go to the Veil Shop or Summon Portal.',
    reward: '1 Summon Ticket',
    route: '/shop',
    actionLabel: 'Go to Veil Shop',
  },
  {
    step: 3,
    eyebrow: 'Summon',
    title: 'Summon Your First Card',
    body:
      'Use a Summon Ticket, gold, or gems to pull a base card. Your first card starts your collection and gives you something to build around.',
    objective: 'Summon at least 1 card.',
    reward: '50 Aether Dust',
    route: '/summon',
    actionLabel: 'Go to Summon Portal',
  },
  {
    step: 4,
    eyebrow: 'Collection',
    title: 'Open Your Collection',
    body:
      'Your Collection shows owned cards, rarity, faction, stats, and protection options. This is your card vault.',
    objective: 'Visit your Collection.',
    reward: '1 Stamina Potion',
    route: '/collection',
    actionLabel: 'Go to Collection',
  },
  {
    step: 5,
    eyebrow: 'Deck',
    title: 'Build an Active Deck',
    body:
      'A deck uses up to 5 cards. Your deck power matters in battles, expeditions, raids, and weekly arena rankings.',
    objective: 'Create or activate a deck with at least 1 card.',
    reward: '25 Gems + 5 Skill Shards',
    route: '/deck-builder',
    actionLabel: 'Go to Deck Builder',
  },
  {
    step: 6,
    eyebrow: 'Expedition',
    title: 'Complete Your First Expedition',
    body:
      'Expeditions are story-driven nodes with battles, choices, treasure, and bosses. Complete a node to begin your progression.',
    objective: 'Complete at least 1 Expedition node.',
    reward: '1 Raid Ticket + 1 Summon Ticket',
    route: '/quests',
    actionLabel: 'Go to Expeditions',
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

function isSameOrChildRoute(pathname, route) {
  if (!route) return false;
  return pathname === route || pathname.startsWith(`${route}/`);
}

export default function TutorialOverlay({ profile, onProfileUpdate }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  const { data: playerCards = [] } = usePlayerCards();
  const { data: decks = [] } = useDecks();

  const [panelOpen, setPanelOpen] = useState(true);
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

  const { data: expeditionProgress = [] } = useQuery({
    queryKey: ['tutorialExpeditionProgress', profile?.id],
    enabled: !!profile?.id && !tutorialCompleted,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_expedition_progress')
        .select('id, status')
        .eq('player_id', profile.id)
        .eq('status', 'completed')
        .limit(10);

      if (error) throw error;

      return data || [];
    },
    initialData: [],
  });

  const hasAnyCard = playerCards.length > 0;

  const hasActiveDeck = decks.some((deck) => {
    return (
      deck.is_active &&
      Array.isArray(deck.card_ids) &&
      deck.card_ids.length > 0
    );
  });

  const hasCompletedExpedition = expeditionProgress.length > 0;

  const rewardAlreadyClaimed = claimedSteps.includes(String(currentStep));

  const objectiveReady = useMemo(() => {
    if (!activeStep) return false;

    if (activeStep.step === 1) {
      return true;
    }

    if (activeStep.step === 2) {
      return (
        isSameOrChildRoute(location.pathname, '/shop') ||
        isSameOrChildRoute(location.pathname, '/summon')
      );
    }

    if (activeStep.step === 3) {
      return hasAnyCard;
    }

    if (activeStep.step === 4) {
      return isSameOrChildRoute(location.pathname, '/collection');
    }

    if (activeStep.step === 5) {
      return hasActiveDeck;
    }

    if (activeStep.step === 6) {
      return hasCompletedExpedition;
    }

    return false;
  }, [
    activeStep,
    location.pathname,
    hasAnyCard,
    hasActiveDeck,
    hasCompletedExpedition,
  ]);

  useEffect(() => {
    if (objectiveReady && !rewardAlreadyClaimed && !tutorialCompleted) {
      setPanelOpen(true);
    }
  }, [objectiveReady, rewardAlreadyClaimed, tutorialCompleted]);

  useEffect(() => {
    setPanelOpen(true);
  }, [currentStep]);

  if (!profile || tutorialCompleted || !activeStep) {
    return null;
  }

  const progressPercent = Math.round(
    (currentStep / TUTORIAL_STEPS.length) * 100
  );

  async function refreshProfile() {
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
  }

  async function claimReward() {
    if (!activeStep || claiming) return;

    if (!objectiveReady) {
      toast.error('Complete the tutorial objective first.');
      return;
    }

    setClaiming(true);

    try {
      const { data, error } = await supabase.rpc(
        'claim_tutorial_step_reward',
        {
          p_step: activeStep.step,
        }
      );

      if (error) throw error;

      await refreshProfile();

      await queryClient.invalidateQueries({ queryKey: ['inventory'] });
      await queryClient.invalidateQueries({ queryKey: ['playerItems'] });
      await queryClient.invalidateQueries({ queryKey: ['playerCards'] });
      await queryClient.invalidateQueries({ queryKey: ['decks'] });
      await queryClient.invalidateQueries({
        queryKey: ['tutorialExpeditionProgress', profile?.id],
      });

      toast.success(`Tutorial reward claimed: ${formatRewards(data?.rewards)}`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not claim tutorial reward');
    } finally {
      setClaiming(false);
    }
  }

  function goToObjective() {
    if (!activeStep?.route) return;

    navigate(activeStep.route);
    setPanelOpen(false);
  }

  if (!panelOpen) {
    return (
      <button
        type="button"
        onClick={() => setPanelOpen(true)}
        className="fixed bottom-24 left-1/2 z-[11000] -translate-x-1/2 rounded-full border border-primary/40 bg-card/95 px-4 py-3 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full ${
              objectiveReady
                ? 'bg-green-500/20 text-green-300'
                : 'bg-primary/15 text-primary'
            }`}
          >
            {objectiveReady ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Map className="h-4 w-4" />
            )}
          </div>

          <div className="text-left">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Tutorial {currentStep}/6
            </p>
            <p className="text-xs font-black text-foreground">
              {objectiveReady ? 'Reward Ready' : activeStep.objective}
            </p>
          </div>
        </div>
      </button>
    );
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
              onClick={() => setPanelOpen(false)}
              className="w-9 h-9 rounded-xl border border-border bg-background/50 hover:bg-muted flex items-center justify-center"
              aria-label="Minimize tutorial"
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

          <div
            className={`rounded-2xl border p-4 ${
              objectiveReady
                ? 'border-green-400/35 bg-green-500/10'
                : 'border-primary/25 bg-primary/5'
            }`}
          >
            <p
              className={`text-xs font-black flex items-center gap-2 ${
                objectiveReady ? 'text-green-300' : 'text-primary'
              }`}
            >
              {objectiveReady ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Star className="w-4 h-4" />
              )}
              Objective
            </p>

            <p className="text-sm mt-1">{activeStep.objective}</p>

            <p className="text-[10px] mt-2 text-muted-foreground">
              {objectiveReady
                ? 'Objective complete. Claim your reward.'
                : 'Complete this action to unlock the reward.'}
            </p>
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

          {!objectiveReady && activeStep.route && (
            <Button
              type="button"
              onClick={goToObjective}
              variant="outline"
              className="w-full h-11 gap-2 font-black"
            >
              {activeStep.actionLabel}
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}

          <Button
            onClick={claimReward}
            disabled={claiming || rewardAlreadyClaimed || !objectiveReady}
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
            ) : objectiveReady ? (
              <>
                Claim Reward + Continue
                <ChevronRight className="w-4 h-4" />
              </>
            ) : (
              'Reward Locked'
            )}
          </Button>

          <p className="text-[10px] text-center text-muted-foreground">
            Minimize this panel to complete the objective. It will reopen when
            your reward is ready.
          </p>
        </div>
      </div>
    </div>
  );
}