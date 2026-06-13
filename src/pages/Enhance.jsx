import React, { useMemo, useState } from 'react';
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

const STAT_GROWTH_PER_LEVEL = 0.1;

const EVOLUTION_RATES = {
  base_plus: 0.4,
  base_plus_plus: 0.45,
  final: 0.5,
};

function cardCapacity(level) {
  return 50 + (level - 1) * 10;
}

function isCardProtected(playerCard) {
  return Boolean(playerCard?.is_protected || playerCard?.locked);
}

function xpToNextLevel(level) {
  return level * 50;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeStage(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll('+', '_plus')
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function inferLineFromName(value) {
  return normalizeText(value)
    .replace(/base\+\+/g, '')
    .replace(/base_plus_plus/g, '')
    .replace(/base\+/g, '')
    .replace(/base_plus/g, '')
    .replace(/final form/g, '')
    .replace(/final/g, '')
    .replace(/\bbase\b/g, '')
    .replace(/[,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getCardLineKey(card) {
  const explicitLine = normalizeText(card?.card_line);

  if (explicitLine) {
    return explicitLine;
  }

  return inferLineFromName(card?.full_card_name || card?.name || '');
}

function inferStageFromName(card) {
  const text = normalizeText(
    `${card?.name || ''} ${card?.full_card_name || ''}`
  );

  if (
    text.includes('final form') ||
    text.includes(' final') ||
    text.endsWith('final')
  ) {
    return 'final';
  }

  if (
    text.includes('base++') ||
    text.includes('base_plus_plus') ||
    text.includes('++')
  ) {
    return 'base_plus_plus';
  }

  if (
    text.includes('base+') ||
    text.includes('base_plus') ||
    text.includes('+')
  ) {
    return 'base_plus';
  }

  return 'base';
}

function getCardStage(card) {
  const evoForm = normalizeStage(card?.evo_form);
  const stage = normalizeStage(card?.evolution_stage);

  if (evoForm && evoForm !== 'base') return evoForm;
  if (stage && stage !== 'base') return stage;

  if (evoForm === 'base' || stage === 'base') return 'base';

  return inferStageFromName(card);
}

function getNextEvolutionStage(evolveCount) {
  if (evolveCount >= 3) return 'final';
  if (evolveCount === 2) return 'base_plus_plus';
  if (evolveCount === 1) return 'base_plus';
  return 'base';
}

function formatStageLabel(stage) {
  if (stage === 'base_plus') return 'Base+';
  if (stage === 'base_plus_plus') return 'Base++';
  if (stage === 'final') return 'Final Form';
  return 'Base';
}

function getEvolutionRate(nextEvolveCount) {
  const nextStage = getNextEvolutionStage(nextEvolveCount);
  return EVOLUTION_RATES[nextStage] || 0.4;
}

function getStageCountFromStage(stage) {
  const normalized = normalizeStage(stage);

  if (normalized === 'final') return 3;
  if (normalized === 'base_plus_plus') return 2;
  if (normalized === 'base_plus') return 1;

  return 0;
}

function getOwnedCardStageCount(playerCard, card) {
  const evolveCount = Number(playerCard?.evolve_count || 0);

  if (evolveCount > 0) {
    return Math.min(evolveCount, MAX_EVOLVES);
  }

  return getStageCountFromStage(
    playerCard?.evolution_stage || card?.evolution_stage || card?.evo_form
  );
}

function getNextEvolveCountFromTarget(targetPlayerCard, targetCard) {
  const targetStageCount = getOwnedCardStageCount(targetPlayerCard, targetCard);

  return Math.min(targetStageCount + 1, MAX_EVOLVES);
}

function isFinalForm(playerCard, card) {
  return getOwnedCardStageCount(playerCard, card) >= MAX_EVOLVES;
}

function getCardMaxLevel(playerCard, card) {
  return isFinalForm(playerCard, card)
    ? FINAL_FORM_MAX_LEVEL
    : BASE_MAX_LEVEL;
}

function isCardMaxed(playerCard, card) {
  return Number(playerCard?.level || 1) >= getCardMaxLevel(playerCard, card);
}

function isValidEvolutionMaterial(
  targetPlayerCard,
  targetCard,
  consumedPlayerCard,
  consumedCard
) {
  if (!targetPlayerCard || !targetCard || !consumedPlayerCard || !consumedCard) {
    return false;
  }

  if (targetPlayerCard.id === consumedPlayerCard.id) {
    return false;
  }

  if (isCardProtected(consumedPlayerCard)) {
    return false;
  }

  if (isFinalForm(targetPlayerCard, targetCard)) {
    return false;
  }

  return getCardLineKey(targetCard) === getCardLineKey(consumedCard);
}

function findNextStageCard({ cards, currentCard, nextStage }) {
  const currentLine = getCardLineKey(currentCard);
  const normalizedNextStage = normalizeStage(nextStage);

  const candidates = cards.filter((candidate) => {
    const sameLine = getCardLineKey(candidate) === currentLine;
    const candidateStage = getCardStage(candidate);

    return sameLine && candidateStage === normalizedNextStage;
  });

  const withImage = candidates.find(
    (candidate) =>
      candidate.image_url && String(candidate.image_url).trim() !== ''
  );

  return withImage || candidates[0] || null;
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

  const [step, setStep] = useState('pick');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [tab, setTab] = useState('enhance');
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

  const handleEnhanceConfirm = async (fodderIds, totalXpGain) => {
    if (!selectedTarget) return;

    const { card, playerCard } = selectedTarget;
    const maxLevel = getCardMaxLevel(playerCard, card);
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

    const protectedFodder = enrichedCards.filter((item) => {
      return fodderIds.includes(item.playerCard.id) && isCardProtected(item.playerCard);
    });
    
    if (protectedFodder.length > 0) {
      toast.error('Protected cards cannot be used as enhancement material.');
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

          stage_base_attack:
            playerCard.stage_base_attack ??
            card.base_attack ??
            enhancedStats.attack,
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

  const handleEvolve = async (consumedPcId) => {
    if (!selectedTarget) return;

    const { card, playerCard } = selectedTarget;

    if (!consumedPcId) {
      toast.error('Select a card to consume');
      return;
    }

    if (consumedPcId === playerCard.id) {
      toast.error('You cannot consume the target card');
      return;
    }

    if (isFinalForm(playerCard, card)) {
      toast.error(`${card.name} is already Final Form`);
      return;
    }

    const consumedItem = enrichedCards.find(
      (item) => item.playerCard.id === consumedPcId
    );

    if (!consumedItem) {
      toast.error('Could not find selected evolution material');
      return;
    }

    const consumedPlayerCard = consumedItem.playerCard;
    const consumedCard = consumedItem.card;

    if (isCardProtected(consumedPlayerCard)) {
      toast.error('Protected cards cannot be consumed for evolution.');
      return;
    }

    const validMaterial = isValidEvolutionMaterial(
      playerCard,
      card,
      consumedPlayerCard,
      consumedCard
    );

    if (!validMaterial) {
      toast.error('Selected card is not valid evolution material');
      return;
    }

    setProcessing(true);

    try {
      const now = new Date().toISOString();

      const currentStageCount = getOwnedCardStageCount(playerCard, card);
      const currentStage = getNextEvolutionStage(currentStageCount);
      const currentStageLabel = formatStageLabel(currentStage);

      const consumedStageCount = getOwnedCardStageCount(
        consumedPlayerCard,
        consumedCard
      );
      const consumedStage = getNextEvolutionStage(consumedStageCount);
      const consumedStageLabel = formatStageLabel(consumedStage);

      const newEvolveCount = getNextEvolveCountFromTarget(playerCard, card);
      const nextStage = getNextEvolutionStage(newEvolveCount);
      const nextStageLabel = formatStageLabel(nextStage);
      const rate = getEvolutionRate(newEvolveCount);

      const nextMasterCard = findNextStageCard({
        cards,
        currentCard: card,
        nextStage,
      });

      if (!nextMasterCard) {
        console.warn('Missing next-stage master card row:', {
          currentCard: card,
          nextStage,
          currentLine: getCardLineKey(card),
          availableSameLineCards: cards.filter(
            (candidate) => getCardLineKey(candidate) === getCardLineKey(card)
          ),
        });
      }

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

      const targetAttack = getCurrentStat(playerCard, card, 'attack');
      const targetDefense = getCurrentStat(playerCard, card, 'defense');
      const targetHp = getCurrentStat(playerCard, card, 'hp');

      const consumedAttack = getCurrentStat(
        consumedPlayerCard,
        consumedCard,
        'attack'
      );
      const consumedDefense = getCurrentStat(
        consumedPlayerCard,
        consumedCard,
        'defense'
      );
      const consumedHp = getCurrentStat(consumedPlayerCard, consumedCard, 'hp');

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

      const updatePayload = {
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

        level: 1,
        experience: 0,

        updated_at: now,
      };

      if (nextMasterCard?.id) {
        updatePayload.card_id = nextMasterCard.id;
      }

      const { data: updatedRows, error: updateError } = await supabase
        .from('player_cards')
        .update(updatePayload)
        .eq('id', playerCard.id)
        .select();

      if (updateError) {
        throw updateError;
      }

      if (!updatedRows || updatedRows.length === 0) {
        throw new Error('No player card was updated. Check RLS or card ownership.');
      }

      const { error: deleteError } = await supabase
        .from('player_cards')
        .delete()
        .eq('id', consumedPcId);

      if (deleteError) {
        throw deleteError;
      }

      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      const artNote = nextMasterCard?.id
        ? ''
        : ' Artwork row was not found, so art stayed the same for now.';

      toast.success(
        `🌟 ${nextMasterCard?.name || card.name} evolved to ${nextStageLabel}! ` +
          `${currentStageLabel} + ${consumedStageLabel} → ${nextStageLabel}. ` +
          `New base: ${newStageBaseAttack} ATK / ${newStageBaseDefense} DEF / ${newStageBaseHp} HP.` +
          artNote
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

    if (mode === 'enhance' && isCardMaxed(item.playerCard, item.card)) {
      toast.error(
        `${item.card.name} is already MAX level (${getCardMaxLevel(
          item.playerCard,
          item.card
        )})`
      );
      return;
    }

    if (mode === 'evolve' && isFinalForm(item.playerCard, item.card)) {
      toast.error(`${item.card.name} is already Final Form`);
      return;
    }

    setSelectedTarget(item);
    setStep(mode === 'evolve' ? 'evolve' : 'fodder');
  };

  const enhancedCardsForPicker = useMemo(() => {
    return enrichedCards.map((item) => {
      const maxLevel = getCardMaxLevel(item.playerCard, item.card);
      const maxed = isCardMaxed(item.playerCard, item.card);
      const stageCount = getOwnedCardStageCount(item.playerCard, item.card);
      const stage = getNextEvolutionStage(stageCount);

      return {
        ...item,
        maxLevel,
        maxed,
        stageCount,
        stage,
        stageLabel: formatStageLabel(stage),
      };
    });
  }, [enrichedCards]);

  const consumableCardsForPicker = useMemo(() => {
    return enhancedCardsForPicker.filter((item) => {
      return !isCardProtected(item.playerCard);
    });
  }, [enhancedCardsForPicker]);

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Enhance" />

      <div className="px-4 py-4 space-y-4">
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
          <p className="text-xs font-bold text-primary">
            Target-Driven Evolution
          </p>
          <p className="text-[11px] text-muted-foreground">
            The selected target always evolves one form forward. Consumed
            same-line cards contribute stats only. Base becomes Base+, Base+
            becomes Base++, and Base++ becomes Final Form.
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
                    enrichedCards={consumableCardsForPicker}
                    onSelect={(item) => handleSelectTarget(item, 'enhance')}
                    title="Choose a Card to Enhance"
                    subtitle="Sort, search, and filter your cards before choosing a target."
                    defaultSort="total_desc"
                  />
                </TabsContent>

                <TabsContent value="evolve">
                  <EnhanceCardPicker
                    enrichedCards={consumableCardsForPicker}
                    onSelect={(item) => handleSelectTarget(item, 'evolve')}
                    title="Choose a Card to Evolve"
                    subtitle="Select the target card first. It will evolve one stage forward."
                    defaultSort="evolution_asc"
                  />
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
                  maxLevel: getCardMaxLevel(
                    selectedTarget.playerCard,
                    selectedTarget.card
                  ),
                  maxed: isCardMaxed(
                    selectedTarget.playerCard,
                    selectedTarget.card
                  ),
                }}
                enrichedCards={consumableCardsForPicker}
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
                  maxLevel: getCardMaxLevel(
                    selectedTarget.playerCard,
                    selectedTarget.card
                  ),
                  maxed: isCardMaxed(
                    selectedTarget.playerCard,
                    selectedTarget.card
                  ),
                }}
                enrichedCards={consumableCardsForPicker}
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
