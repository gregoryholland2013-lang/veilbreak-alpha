import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowLeft, Star, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const elementIcons = { fire: '🔥', water: '💧', earth: '🌿', light: '✨', dark: '🌑' };

const MAX_EVOLVES = 4;

// Stat bonus per evolution (additive multiplier)
const EVOLVE_BONUS = 0.25;

export default function EvolvePanel({ target, enrichedCards, onEvolve, onBack }) {
  const { card, playerCard } = target;
  const evolveCount = playerCard.evolve_count || 0;
  const canEvolveMore = evolveCount < MAX_EVOLVES;

  // Find other copies of the same base card (same card_id, different playerCard id, not the target itself)
  const duplicates = enrichedCards.filter(
    ({ card: c, playerCard: pc }) =>
      c.id === card.id && pc.id !== playerCard.id
  );

  const hasRequiredCopy = duplicates.length > 0;
  const canEvolve = canEvolveMore && hasRequiredCopy;

  const currentMult = 1 + (playerCard.level - 1) * 0.1 + evolveCount * EVOLVE_BONUS;
  const nextMult = currentMult + EVOLVE_BONUS;

  const stars = Array.from({ length: MAX_EVOLVES }, (_, i) => i < evolveCount);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Evolve Card</h2>
          <p className="text-xs text-muted-foreground">Sacrifice a duplicate to evolve <span className="text-foreground font-semibold">{card.name}</span></p>
        </div>
      </div>

      {/* Card Display */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        {/* Card art */}
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-muted overflow-hidden flex items-center justify-center flex-shrink-0">
            {card.image_url
              ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
              : <span className="text-3xl">{elementIcons[card.element] || '⚔️'}</span>
            }
          </div>
          <div className="flex-1">
            <p className="font-display font-bold text-base">{card.name}</p>
            <p className="text-xs text-muted-foreground capitalize">Lv.{playerCard.level} · {card.rarity}</p>
            {/* Evolution stars */}
            <div className="flex gap-1 mt-1.5">
              {stars.map((filled, i) => (
                <Star key={i} className={`w-4 h-4 ${filled ? 'text-primary fill-primary' : 'text-muted-foreground'}`} />
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
              <p className={`font-bold ${color}`}>{Math.round(base * currentMult)}</p>
              {canEvolve && (
                <p className="text-primary text-[10px]">→ {Math.round(base * nextMult)}</p>
              )}
            </div>
          ))}
        </div>

        {/* Evolution progress */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Evolution Progress</span>
            <span className="text-primary font-semibold">{evolveCount} / {MAX_EVOLVES}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${(evolveCount / MAX_EVOLVES) * 100}%` }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>

      {/* Requirements */}
      <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Requirements</p>

        <div className={`flex items-center gap-3 text-sm ${hasRequiredCopy ? 'text-green-400' : 'text-destructive'}`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${hasRequiredCopy ? 'border-green-400 bg-green-400/20' : 'border-destructive bg-destructive/10'}`}>
            {hasRequiredCopy
              ? <span className="text-[10px] font-black">✓</span>
              : <span className="text-[10px] font-black">✗</span>
            }
          </div>
          <span>
            1× <strong>{card.name}</strong> duplicate
            {hasRequiredCopy
              ? ` (${duplicates.length} available)`
              : ' — not owned'}
          </span>
        </div>

        <div className={`flex items-center gap-3 text-sm ${canEvolveMore ? 'text-green-400' : 'text-muted-foreground'}`}>
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${canEvolveMore ? 'border-green-400 bg-green-400/20' : 'border-muted-foreground bg-muted'}`}>
            {canEvolveMore
              ? <span className="text-[10px] font-black">✓</span>
              : <span className="text-[10px] font-black">✗</span>
            }
          </div>
          <span>Evolution limit not reached ({evolveCount}/{MAX_EVOLVES})</span>
        </div>
      </div>

      {/* Duplicate cards available */}
      {duplicates.length > 0 && (
        <div>
          <p className="text-xs text-muted-foreground mb-2">Duplicate copies owned:</p>
          <div className="flex gap-2 flex-wrap">
            {duplicates.map(({ playerCard: pc }) => (
              <div key={pc.id} className="bg-primary/10 border border-primary/30 rounded-lg px-3 py-1.5 text-xs text-primary font-semibold">
                {card.name} Lv.{pc.level}
              </div>
            ))}
          </div>
        </div>
      )}

      {!canEvolveMore && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>This card has reached the maximum of {MAX_EVOLVES} evolutions.</span>
        </div>
      )}

      <Button
        onClick={() => onEvolve(duplicates[0]?.playerCard.id)}
        disabled={!canEvolve}
        className="w-full gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90"
      >
        <Sparkles className="w-4 h-4" />
        {canEvolve ? `Evolve (${evolveCount + 1}/${MAX_EVOLVES})` : 'Cannot Evolve'}
      </Button>
    </div>
  );
}