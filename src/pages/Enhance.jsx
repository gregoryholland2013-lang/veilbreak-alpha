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

// Card capacity per player level
function cardCapacity(level) {
  return 50 + (level - 1) * 10;
}

// XP needed to level up from currentLevel
function xpToNextLevel(level) {
  return level * 50;
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
  const handleEnhanceConfirm = async (fodderIds, totalXpGain, levelsGained) => {
    if (!selectedTarget) return;

    const { card, playerCard } = selectedTarget;

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

      // Compute new level + xp
      let newXp = (playerCard.experience || 0) + totalXpGain;
      let newLevel = playerCard.level || 1;

      while (newXp >= xpToNextLevel(newLevel)) {
        newXp -= xpToNextLevel(newLevel);
        newLevel++;
      }

      /**
       * Update target card.
       */
      const { error: updateError } = await supabase
        .from('player_cards')
        .update({
          level: newLevel,
          experience: newXp,
          updated_at: now,
        })
        .eq('id', playerCard.id);

      if (updateError) {
        throw updateError;
      }

      /**
       * Delete fodder cards.
       */
      const { error: deleteError } = await supabase
        .from('player_cards')
        .delete()
        .in('id', fodderIds);

      if (deleteError) {
        throw deleteError;
      }

      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      const msg =
        levelsGained > 0
          ? `${card.name} reached Lv.${newLevel}!`
          : `${card.name} gained ${totalXpGain} XP!`;

      toast.success(`✨ ${msg}`);
      resetFlow();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not enhance card');
    } finally {
      setProcessing(false);
    }
  };

  // ── EVOLVE: consume one duplicate ──
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

    setProcessing(true);

    try {
      const now = new Date().toISOString();
      const newEvolveCount = (playerCard.evolve_count || 0) + 1;

      /**
       * Update target evolved state.
       */
      const { error: updateError } = await supabase
        .from('player_cards')
        .update({
          evolved: true,
          evolve_count: newEvolveCount,
          updated_at: now,
        })
        .eq('id', playerCard.id);

      if (updateError) {
        throw updateError;
      }

      /**
       * Delete duplicate card.
       */
      const { error: deleteError } = await supabase
        .from('player_cards')
        .delete()
        .eq('id', duplicatePcId);

      if (deleteError) {
        throw deleteError;
      }

      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      toast.success(`🌟 ${card.name} evolved! (${newEvolveCount}/4)`);
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

    setSelectedTarget(item);
    setStep(mode === 'evolve' ? 'evolve' : 'fodder');
  };

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
                    enrichedCards={enrichedCards}
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
                      </p>
                    </div>

                    <EnhanceCardPicker
                      enrichedCards={enrichedCards}
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
                target={selectedTarget}
                enrichedCards={enrichedCards}
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
                target={selectedTarget}
                enrichedCards={enrichedCards}
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