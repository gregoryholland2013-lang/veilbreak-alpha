import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import {
  useCards,
  usePlayerCards,
  useProfile,
} from '@/hooks/useGameData';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageHeader from '@/components/game/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EnhanceCardPicker from '@/components/enhance/EnhanceCardPicker';
import FodderPicker from '@/components/enhance/FodderPicker';
import EvolvePanel from '@/components/enhance/EvolvePanel';

const BASE_MAX_LEVEL = 10;
const FINAL_FORM_MAX_LEVEL = 20;
const MAX_EVOLVES = 3;

// Current controlled stat growth after each created stage base.
// Lv.1 = 100% of stage base.
// Lv.10 = 190% of stage base.
// Lv.20 = 290% of stage base.
const STAT_GROWTH_PER_LEVEL = 0.1;

const EVOLUTION_RATES = {
  base_plus: 0.4, // Base → Base+
  base_plus_plus: 0.45, // Base+ → Base++
  final: 0.5, // Base++ → Final
};

// Card capacity per player level
function cardCapacity(level) {
  return 50 + (level - 1) * 10;
}

// XP needed to level up from currentLevel
function xpToNextLevel(level) {
  return level * 50;
}

function getNextEvolutionStage(newEvolveCount) {
  if (newEvolveCount >= 3) return 'final';
  if (newEvolveCount === 2) return 'base_plus_plus';
  if (newEvolveCount === 1) return 'base_plus';
  return 'base';
}

function getEvolutionRate(newEvolveCount) {
  const nextStage = getNextEvolutionStage(newEvolveCount);
  return EVOLUTION_RATES[nextStage] || 0.4;
}

function formatStageLabel(stage) {
  if (stage === 'base_plus') return 'Base+';
  if (stage === 'base_plus_plus') return 'Base++';
  if (stage === 'final') return 'Final Form';
  return 'Base';
}

function isFinalForm(playerCard) {
  const stage = String(playerCard?.evolution_stage || '').toLowerCase();

  return (
    stage === 'final' ||
    stage === 'final_form' ||
    stage === 'final form' ||
    Number(playerCard?.evolve_count || 0) >= MAX_EVOLVES
  );
}

function getCardMaxLevel(playerCard) {
  return isFinalForm(playerCard) ? FINAL_FORM_MAX_LEVEL : BASE_MAX_LEVEL;
}

function isCardMaxed(playerCard) {
  return Number(playerCard?.level || 1) >= getCardMaxLevel(playerCard);
}

function getMasterBaseStat(card, stat) {
  if (stat === 'attack') return Number(card?.base_attack || 0);
  if (stat === 'defense') return Number(card?.base_defense || 0);
  if (stat === 'hp') return Number(card?.base_hp || 0);
  return 0;
}

function getStageBaseStat(playerCard, card, stat) {
  if (stat === 'attack') {
    return Number(playerCard?.stage_base_attack ?? card?.base_attack ?? 0);
  }

  if (stat === 'defense') {
    return Number(playerCard?.stage_base_defense ?? card?.base_defense ?? 0);
  }

  if (stat === 'hp') {
    return Number(playerCard?.stage_base_hp ?? card?.base_hp ?? 0);
  }

  return 0;
}

function getCurrentStat(playerCard, card, stat) {
  if (stat === 'attack') {
    return Number(
      playerCard?.attack ??
        playerCard?.stage_base_attack ??
        card?.base_attack ??
        0
    );
  }

  if (stat === 'defense') {
    return Number(
      playerCard?.defense ??
        playerCard?.stage_base_defense ??
        card?.base_defense ??
        0
    );
  }

  if (stat === 'hp') {
    return Number(
      playerCard?.hp ??
        playerCard?.max_hp ??
        playerCard?.stage_base_hp ??
        card?.base_hp ??
        0
    );
  }

  return 0;
}

function levelMultiplier(level) {
  return 1 + (Math.max(1, Number(level || 1)) - 1) * STAT_GROWTH_PER_LEVEL;
}

function calculateEnhancedStat(stageBase, level) {
  return Math.round(Number(stageBase || 0) * levelMultiplier(level));
}

function calculateEvolvedStat({
  previousStageBase,
  targetCurrent,
  consumedCurrent,
  rate,
}) {
  return Math.round(
    Number(previousStageBase || 0) +
      (Number(targetCurrent || 0) + Number(consumedCurrent || 0)) *
        Number(rate || 0)
  );
}

function buildEnhanceStats({ card, playerCard, newLevel, levelsGained }) {
  const currentAttack = getCurrentStat(playerCard, card, 'attack');
  const currentDefense = getCurrentStat(playerCard, card, 'defense');
  const currentHp = getCurrentStat(playerCard, card, 'hp');

  const stageBaseAttack = getStageBaseStat(playerCard, card, 'attack');
  const stageBaseDefense = getStageBaseStat(playerCard, card, 'defense');
  const stageBaseHp = getStageBaseStat(playerCard, card, 'hp');

  const calculatedAttack = calculateEnhancedStat(stageBaseAttack, newLevel);
  const calculatedDefense = calculateEnhancedStat(stageBaseDefense, newLevel);
  const calculatedHp = calculateEnhancedStat(stageBaseHp, newLevel);

  // Never let enhancement reduce stats.
  // If the card gained no level, stats stay unchanged.
  if (levelsGained <= 0) {
    return {
      attack: currentAttack,
      defense: currentDefense,
      hp: currentHp,
      max_hp: currentHp,
    };
  }

  return {
    attack: Math.max(currentAttack, calculatedAttack),
    defense: Math.max(currentDefense, calculatedDefense),
    hp: Math.max(currentHp, calculatedHp),
    max_hp: Math.max(currentHp, calculatedHp),
  };
}

export default function Enhance() {
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: profile } = useProfile();

  const queryClient = useQueryClient();

  const [step, setStep] = useState('pick'); // pick | fodder | evolve
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [tab, setTab] = useState('enhance'); // enhance | evolve
  const [processing, setProcessing] = useState(false);

  const enrichedCards = useMemo(() => {
    return playerCards
      .map((pc) => {
        const card = cards.find((c) => c.id === pc.card_id);
        return card ? { card, playerCard: pc } : null;
      })
      .filter(Boolean);
  }, [cards, playerCards]);

  const capacity = profile ? cardCapacity(profile.level || 1) : 50;
  const atCapacity = playerCards.length >= capacity;

  const resetFlow = () => {
    setStep('pick');
    setSelectedTarget(null);
  };

  // ── ENHANCE: confirm fodder sacrifice ──
  const handleEnhanceConfirm = async (fodderIds, totalXpGain) => {
    if (!selectedTarget) return;

    const { card, playerCard } = selectedTarget;
    const maxLevel = getCardMaxLevel(playerCard);
    const currentLevel = playerCard.level || 1;

    if (currentLevel >= maxLevel) {
      toast.error(`${card.name} is already MAX level (${maxLevel})`);
      return;
    }

    if (!fodderIds || fodderIds.length === 0) {
      toast.error('Select at least one fodder card');
      return;
    }

    if (fodderIds.includes(playerCard.id)) {
      toast.error('You cannot sacrifice the target card');
      return;
    }

    setProcessing(true);

    try {
      const now = new Date().toISOString();

      let newXp = (playerCard.experience || 0) + totalXpGain;
      let newLevel = currentLevel;

      while (newLevel < maxLevel && newXp >= xpToNextLevel(newLevel)) {
        newXp -= xpToNextLevel(newLevel);
        newLevel += 1;
      }

      // Once maxed, stop XP gain completely.
      if (newLevel >= maxLevel) {
        newLevel = maxLevel;
        newXp = 0;
      }

      const levelsGained = newLevel - currentLevel;

      const enhancedStats = buildEnhanceStats({
        card,
        playerCard,
        newLevel,
        levelsGained,
      });

      const { error: updateError } = await supabase
        .from('player_cards')
        .update({
          level: newLevel,
          experience: newXp,

          attack: enhancedStats.attack,
          defense: enhancedStats.defense,
          hp: enhancedStats.hp,
          max_hp: enhancedStats.max_hp,

          // If these are missing on older cards, preserve/repair them now.
          stage_base_attack:
            playerCard.stage_base_attack ?? card.base_attack ?? enhancedStats.attack,
          stage_base_defense:
            playerCard.stage_base_defense ??
            card.base_defense ??
            enhancedStats.defense,
          stage_base_hp:
            playerCard.stage_base_hp ?? card.base_hp ?? enhancedStats.hp,

          updated_at: now,
        })
        .eq('id', playerCard.id);

      if (updateError) {
        throw updateError;
      }

      const { error: deleteError } = await supabase
        .from('player_cards')
        .delete()
        .in('id', fodderIds);

      if (deleteError) {
        throw deleteError;
      }

      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      let msg = `${card.name} gained ${totalXpGain} XP!`;

      if (newLevel >= maxLevel) {
        msg = `${card.name} reached MAX Lv.${maxLevel}!`;
      } else if (levelsGained > 0) {
        msg = `${card.name} reached Lv.${newLevel}!`;
      }

      toast.success(`✨ ${msg}`);
      resetFlow();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not enhance card');
    } finally {
      setProcessing(false);
    }
  };

  // ── EVOLVE: consume one selected duplicate ──
  const handleEvolve = async (duplicatePcId) => {
    if (!selectedTarget) return;

    const { card, playerCard } = selectedTarget;

    if (!duplicatePcId) {
      toast.error('Select a duplicate to evolve');
      return;
    }

    if (duplicatePcId === playerCard.id) {
      toast.error('You cannot consume the target card');
      return;
    }

    if ((playerCard.evolve_count || 0) >= MAX_EVOLVES) {
      toast.error(`${card.name} is already Final Form`);
      return;
    }

    const duplicateItem = enrichedCards.find(
      (item) => item.playerCard.id === duplicatePcId
    );

    if (!duplicateItem) {
      toast.error('Could not find selected duplicate');
      return;
    }

    const duplicatePlayerCard = duplicateItem.playerCard;
    const duplicateCard = duplicateItem.card;

    const sameCard =
      duplicatePlayerCard.card_id === playerCard.card_id ||
      duplicateCard.id === card.id;

    if (!sameCard) {
      toast.error('Selected card is not a valid duplicate');
      return;
    }

    setProcessing(true);

    try {
      const now = new Date().toISOString();

      const newEvolveCount = (playerCard.evolve_count || 0) + 1;
      const nextStage = getNextEvolutionStage(newEvolveCount);
      const nextStageLabel = formatStageLabel(nextStage);
      const rate = getEvolutionRate(newEvolveCount);

      /**
       * Previous stage created base.
       * Base cards start from master card base stats.
       * Base+ / Base++ use their previous stage_base stats.
       */
      const previousStageBaseAttack = getStageBaseStat(
        playerCard,
        card,
        'attack'
      );
      const previousStageBaseDefense = getStageBaseStat(
        playerCard,
        card,
        'defense'
      );
      const previousStageBaseHp = getStageBaseStat(playerCard, card, 'hp');

      /**
       * Current stats of target and consumed card.
       * These include enhancement investment if the player enhanced them first.
       */
      const targetAttack = getCurrentStat(playerCard, card, 'attack');
      const targetDefense = getCurrentStat(playerCard, card, 'defense');
      const targetHp = getCurrentStat(playerCard, card, 'hp');

      const consumedAttack = getCurrentStat(
        duplicatePlayerCard,
        duplicateCard,
        'attack'
      );
      const consumedDefense = getCurrentStat(
        duplicatePlayerCard,
        duplicateCard,
        'defense'
      );
      const consumedHp = getCurrentStat(duplicatePlayerCard, duplicateCard, 'hp');

      /**
       * Empirical exact formula:
       *
       * New Stage Base Stat =
       * Previous Stage Created Base Stat
       * + ((Target Current Stat + Consumed Current Stat) × Evolution Rate)
       *
       * Base → Base+ = 40%
       * Base+ → Base++ = 45%
       * Base++ → Final = 50%
       */
      const newStageBaseAttack = calculateEvolvedStat({
        previousStageBase: previousStageBaseAttack,
        targetCurrent: targetAttack,
        consumedCurrent: consumedAttack,
        rate,
      });

      const newStageBaseDefense = calculateEvolvedStat({
        previousStageBase: previousStageBaseDefense,
        targetCurrent: targetDefense,
        consumedCurrent: consumedDefense,
        rate,
      });

      const newStageBaseHp = calculateEvolvedStat({
        previousStageBase: previousStageBaseHp,
        targetCurrent: targetHp,
        consumedCurrent: consumedHp,
        rate,
      });

      const inheritedAttackGain = Math.max(
        0,
        newStageBaseAttack - previousStageBaseAttack
      );

      const inheritedDefenseGain = Math.max(
        0,
        newStageBaseDefense - previousStageBaseDefense
      );

      const inheritedHpGain = Math.max(0, newStageBaseHp - previousStageBaseHp);

      /**
       * Important:
       * Evolution creates a new stage base and resets the card to Lv.1
       * of that new stage. The player then enhances upward from there.
       */
      const { error: updateError } = await supabase
        .from('player_cards')
        .update({
          evolved: true,
          evolve_count: newEvolveCount,
          evolution_stage: nextStage,

          stage_base_attack: newStageBaseAttack,
          stage_base_defense: newStageBaseDefense,
          stage_base_hp: newStageBaseHp,

          attack: newStageBaseAttack,
          defense: newStageBaseDefense,
          hp: newStageBaseHp,
          max_hp: newStageBaseHp,

          inherited_attack:
            (playerCard.inherited_attack || 0) + inheritedAttackGain,
          inherited_defense:
            (playerCard.inherited_defense || 0) + inheritedDefenseGain,
          inherited_hp: (playerCard.inherited_hp || 0) + inheritedHpGain,

          // New stage starts fresh from the newly created base.
          level: 1,
          experience: 0,

          updated_at: now,
        })
        .eq('id', playerCard.id);

      if (updateError) {
        throw updateError;
      }

      const { error: deleteError } = await supabase
        .from('player_cards')
        .delete()
        .eq('id', duplicatePcId);

      if (deleteError) {
        throw deleteError;
      }

      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      toast.success(
        newEvolveCount >= MAX_EVOLVES
          ? `🌟 ${card.name} reached Final Form! New base: ${newStageBaseAttack} ATK / ${newStageBaseDefense} DEF / ${newStageBaseHp} HP.`
          : `🌟 ${card.name} evolved to ${nextStageLabel}! New base: ${newStageBaseAttack} ATK / ${newStageBaseDefense} DEF / ${newStageBaseHp} HP.`
      );

      resetFlow();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not evolve card');
    } finally {
      setProcessing(false);
    }
  };

  const handleSelectTarget = (item, mode) => {
    if (processing) return;

    if (mode === 'enhance' && isCardMaxed(item.playerCard)) {
      toast.error(
        `${item.card.name} is already MAX level (${getCardMaxLevel(
          item.playerCard
        )})`
      );
      return;
    }

    setSelectedTarget(item);
    setStep(mode === 'evolve' ? 'evolve' : 'fodder');
  };

  const enhancedCardsForPicker = useMemo(() => {
    return enrichedCards.map((item) => {
      const maxLevel = getCardMaxLevel(item.playerCard);
      const maxed = isCardMaxed(item.playerCard);

      return {
        ...item,
        maxLevel,
        maxed,
      };
    });
  }, [enrichedCards]);

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Enhance" />

      <div className="px-4 py-4 space-y-4">
        {/* Card capacity bar */}
        {profile && (
          <div
            className={`rounded-xl border p-3 flex items-center gap-3 ${
              atCapacity
                ? 'border-destructive/50 bg-destructive/5'
                : 'border-border bg-card'
            }`}
          >
            <div className="flex-1">
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-muted-foreground">Card Slots</span>
                <span
                  className={`font-bold ${
                    atCapacity ? 'text-destructive' : 'text-foreground'
                  }`}
                >
                  {playerCards.length} / {capacity}
                </span>
              </div>

              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    atCapacity ? 'bg-destructive' : 'bg-primary'
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      (playerCards.length / capacity) * 100
                    )}%`,
                  }}
                />
              </div>

              <p className="text-[10px] text-muted-foreground mt-1">
                Level up to increase your card capacity +10 per level
              </p>
            </div>

            {atCapacity && (
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0" />
            )}
          </div>
        )}

        <div className="rounded-xl border border-border bg-card p-3 space-y-1">
          <p className="text-xs font-bold text-primary">Enhancement Caps</p>
          <p className="text-[11px] text-muted-foreground">
            Base, Base+, and Base++ cards max at Lv.{BASE_MAX_LEVEL}. Final
            Form cards max at Lv.{FINAL_FORM_MAX_LEVEL}. Maxed cards no longer
            gain XP or stats.
          </p>
        </div>

        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-1">
          <p className="text-xs font-bold text-primary">Evolution Inheritance</p>
          <p className="text-[11px] text-muted-foreground">
            New stage base = previous stage base + percentage of the target and
            consumed card’s current stats. Base→Base+ uses 40%, Base+→Base++
            uses 45%, and Base++→Final uses 50%.
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === 'pick' && (
            <motion.div
              key="pick"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="w-full mb-4">
                  <TabsTrigger value="enhance" className="flex-1">
                    ⚡ Enhance
                  </TabsTrigger>
                  <TabsTrigger value="evolve" className="flex-1">
                    🌟 Evolve
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="enhance">
                  <EnhanceCardPicker
                    enrichedCards={enhancedCardsForPicker}
                    onSelect={(item) => handleSelectTarget(item, 'enhance')}
                  />
                </TabsContent>

                <TabsContent value="evolve">
                  <div className="space-y-3">
                    <div>
                      <h2 className="font-display text-lg font-bold text-primary">
                        Choose a Card to Evolve
                      </h2>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Select a card with a duplicate in your collection.
                        Investment in both cards affects the next stage’s base
                        stats.
                      </p>
                    </div>

                    <EnhanceCardPicker
                      enrichedCards={enhancedCardsForPicker}
                      onSelect={(item) => handleSelectTarget(item, 'evolve')}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </motion.div>
          )}

          {step === 'fodder' && selectedTarget && (
            <motion.div
              key="fodder"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <FodderPicker
                target={{
                  ...selectedTarget,
                  maxLevel: getCardMaxLevel(selectedTarget.playerCard),
                  maxed: isCardMaxed(selectedTarget.playerCard),
                }}
                enrichedCards={enhancedCardsForPicker}
                onConfirm={handleEnhanceConfirm}
                onBack={resetFlow}
                disabled={processing}
              />
            </motion.div>
          )}

          {step === 'evolve' && selectedTarget && (
            <motion.div
              key="evolve"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <EvolvePanel
                target={{
                  ...selectedTarget,
                  maxLevel: getCardMaxLevel(selectedTarget.playerCard),
                  maxed: isCardMaxed(selectedTarget.playerCard),
                }}
                enrichedCards={enhancedCardsForPicker}
                onEvolve={handleEvolve}
                onBack={resetFlow}
                disabled={processing}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}