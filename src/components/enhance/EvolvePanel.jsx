import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles,
  ArrowLeft,
  Star,
  AlertCircle,
  Check,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import GameCard from '@/components/game/GameCard';

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
};

const MAX_EVOLVES = 3;

// Stat bonus per evolution, display only for now.
const EVOLVE_BONUS = 0.25;

function isFinalForm(playerCard) {
  const stage = String(playerCard?.evolution_stage || '').toLowerCase();

  return (
    stage === 'final' ||
    stage === 'final_form' ||
    stage === 'final form' ||
    Number(playerCard?.evolve_count || 0) >= MAX_EVOLVES
  );
}

export default function EvolvePanel({
  target,
  enrichedCards = [],
  onEvolve,
  onBack,
  disabled,
}) {
  const [selectedDuplicateId, setSelectedDuplicateId] = useState(null);

  if (!target?.card || !target?.playerCard) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="rounded-xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No target card selected.
        </div>
      </div>
    );
  }

  const { card, playerCard } = target;
  const evolveCount = playerCard.evolve_count || 0;
  const finalForm = isFinalForm(playerCard);
  const canEvolveMore = !finalForm && evolveCount < MAX_EVOLVES;

  const duplicates = useMemo(() => {
    return enrichedCards.filter(({ card: candidateCard, playerCard: pc }) => {
      if (!candidateCard || !pc) return false;

      const sameMasterCard =
        pc.card_id === playerCard.card_id || candidateCard.id === card.id;

      const notTargetCopy = pc.id !== playerCard.id;
      const notLocked = pc.locked !== true;

      return sameMasterCard && notTargetCopy && notLocked;
    });
  }, [enrichedCards, card.id, playerCard.card_id, playerCard.id]);

  const selectedDuplicate = duplicates.find(
    (item) => item.playerCard.id === selectedDuplicateId
  );

  const hasRequiredCopy = duplicates.length > 0;
  const canEvolve = canEvolveMore && hasRequiredCopy && selectedDuplicateId;

  const currentMult =
    1 + ((playerCard.level || 1) - 1) * 0.1 + evolveCount * EVOLVE_BONUS;

  const nextMult = currentMult + EVOLVE_BONUS;

  const stars = Array.from(
    { length: MAX_EVOLVES },
    (_, i) => i < evolveCount
  );

  const confirmEvolve = () => {
    if (!selectedDuplicateId) {
      return;
    }

    onEvolve?.(selectedDuplicateId);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          type="button"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div>
          <h2 className="font-display text-lg font-bold text-primary">
            Evolve Card
          </h2>

          <p className="text-xs text-muted-foreground">
            Select exactly which duplicate will be consumed into{' '}
            <span className="text-foreground font-semibold">{card.name}</span>.
          </p>
        </div>
      </div>

      {/* Target Card Display */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
            {card.image_url ? (
              <img
                src={card.image_url}
                alt={card.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">
                {elementIcons[card.element] || '⚔️'}
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-base truncate">
              {card.name}
            </p>

            <p className="text-xs text-muted-foreground capitalize">
              Lv.{playerCard.level || 1} · {card.rarity}
              {finalForm ? ' · Final Form' : ''}
            </p>

            <div className="flex gap-1 mt-1.5">
              {stars.map((filled, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    filled
                      ? 'text-primary fill-primary'
                      : 'text-muted-foreground'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Stat comparison */}
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            { label: 'ATK', base: card.base_attack, color: 'text-red-400' },
            { label: 'DEF', base: card.base_defense, color: 'text-blue-400' },
            { label: 'HP', base: card.base_hp, color: 'text-green-400' },
          ].map(({ label, base, color }) => (
            <div key={label} className="bg-muted/40 rounded-lg p-2">
              <p className="text-muted-foreground text-[10px]">{label}</p>

              <p className={`font-bold ${color}`}>
                {Math.round((base || 0) * currentMult)}
              </p>

              {canEvolveMore && (
                <p className="text-primary text-[10px]">
                  → {Math.round((base || 0) * nextMult)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Evolution progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Evolution Progress</span>
            <span className="text-primary font-semibold">
              {finalForm ? 'Final Form' : `${evolveCount} / ${MAX_EVOLVES}`}
            </span>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${(Math.min(evolveCount, MAX_EVOLVES) / MAX_EVOLVES) * 100}%`,
              }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Requirements
        </p>

        <div
          className={`flex items-center gap-3 text-sm ${
            hasRequiredCopy ? 'text-green-400' : 'text-destructive'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              hasRequiredCopy
                ? 'border-green-400 bg-green-400/20'
                : 'border-destructive bg-destructive/10'
            }`}
          >
            {hasRequiredCopy ? (
              <span className="text-[10px] font-black">✓</span>
            ) : (
              <span className="text-[10px] font-black">✗</span>
            )}
          </div>

          <span>
            1× <strong>{card.name}</strong> duplicate
            {hasRequiredCopy ? ` (${duplicates.length} available)` : ' — not owned'}
          </span>
        </div>

        <div
          className={`flex items-center gap-3 text-sm ${
            canEvolveMore ? 'text-green-400' : 'text-muted-foreground'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              canEvolveMore
                ? 'border-green-400 bg-green-400/20'
                : 'border-muted-foreground bg-muted'
            }`}
          >
            {canEvolveMore ? (
              <span className="text-[10px] font-black">✓</span>
            ) : (
              <span className="text-[10px] font-black">✗</span>
            )}
          </div>

          <span>
            Evolution limit not reached ({Math.min(evolveCount, MAX_EVOLVES)}/
            {MAX_EVOLVES})
          </span>
        </div>
      </div>

      {/* Duplicate Selection */}
      {finalForm ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>This card has reached Final Form and cannot evolve further.</span>
        </div>
      ) : duplicates.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>
            You need another unlocked copy of {card.name} to evolve this card.
          </span>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Duplicate to Consume
            </p>

            <p className="text-[10px] text-muted-foreground mt-1">
              The selected duplicate will be permanently removed.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {duplicates.map((item) => {
              const duplicatePc = item.playerCard;
              const isSelected = selectedDuplicateId === duplicatePc.id;

              return (
                <button
                  key={duplicatePc.id}
                  type="button"
                  onClick={() => setSelectedDuplicateId(duplicatePc.id)}
                  className={`relative rounded-xl transition-all ${
                    isSelected
                      ? 'ring-2 ring-primary scale-[1.03]'
                      : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'
                  }`}
                >
                  <GameCard
                    card={item.card}
                    playerCard={duplicatePc}
                    size="sm"
                    showStats
                  />

                  {isSelected && (
                    <div className="absolute inset-0 rounded-xl border-2 border-primary bg-primary/20 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-primary-foreground" />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {selectedDuplicate && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-destructive flex-shrink-0" />

              <div className="min-w-0">
                <p className="text-xs text-destructive font-semibold">
                  This copy will be consumed:
                </p>

                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedDuplicate.card.name} · Lv.
                  {selectedDuplicate.playerCard.level || 1}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <Button
        onClick={confirmEvolve}
        disabled={!canEvolve || disabled}
        className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
      >
        <Sparkles className="w-4 h-4" />
        {disabled
          ? 'Evolving…'
          : canEvolve
            ? `Evolve (${evolveCount + 1}/${MAX_EVOLVES})`
            : 'Select Duplicate to Evolve'}
      </Button>
    </div>
  );
}