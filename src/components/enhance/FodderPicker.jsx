import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sword, Shield, Heart, Sparkles, ArrowLeft, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

const elementIcons = { fire: '🔥', water: '💧', earth: '🌿', light: '✨', dark: '🌑' };
const rarityXp = { common: 20, rare: 50, epic: 120, legendary: 300 };
const rarityBorder = { common: 'border-muted-foreground/40', rare: 'border-blue-400', epic: 'border-purple-400', legendary: 'border-primary' };

const MAX_FODDER = 10;

// XP a fodder card provides based on its rarity + level
function fodderXp(card, playerCard) {
  const base = rarityXp[card.rarity] || 20;
  return base * (playerCard.level || 1);
}

// XP needed to level up from current level
function xpToNextLevel(currentLevel) {
  return currentLevel * 50;
}

export default function FodderPicker({ target, enrichedCards, onConfirm, onBack }) {
  const [selected, setSelected] = useState([]);

  // Can't use the target card itself as fodder
  const available = enrichedCards.filter(({ playerCard }) => playerCard.id !== target.playerCard.id);

  const toggle = (pcId) => {
    setSelected(prev => {
      if (prev.includes(pcId)) return prev.filter(id => id !== pcId);
      if (prev.length >= MAX_FODDER) return prev;
      return [...prev, pcId];
    });
  };

  const totalXpGain = selected.reduce((sum, id) => {
    const item = available.find(({ playerCard }) => playerCard.id === id);
    if (!item) return sum;
    return sum + fodderXp(item.card, item.playerCard);
  }, 0);

  const currentLevel = target.playerCard.level || 1;
  const currentXp = target.playerCard.experience || 0;
  let simXp = currentXp + totalXpGain;
  let simLevel = currentLevel;
  while (simXp >= xpToNextLevel(simLevel)) {
    simXp -= xpToNextLevel(simLevel);
    simLevel++;
  }
  const levelsGained = simLevel - currentLevel;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h2 className="font-display text-lg font-bold text-primary">Select Fodder</h2>
          <p className="text-xs text-muted-foreground">Up to {MAX_FODDER} cards to sacrifice for <span className="text-foreground font-semibold">{target.card.name}</span></p>
        </div>
      </div>

      {/* Target card summary */}
      <div className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
          {target.card.image_url
            ? <img src={target.card.image_url} alt={target.card.name} className="w-full h-full object-cover" />
            : <span className="text-xl">{elementIcons[target.card.element] || '⚔️'}</span>
          }
        </div>
        <div className="flex-1">
          <p className="font-display font-bold text-sm">{target.card.name} <span className="text-muted-foreground font-normal text-xs">Lv.{currentLevel}</span></p>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.min(100, (currentXp / xpToNextLevel(currentLevel)) * 100)}%` }} />
            </div>
            <span className="text-[10px] text-muted-foreground">{currentXp}/{xpToNextLevel(currentLevel)} XP</span>
          </div>
        </div>
        {totalXpGain > 0 && (
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-primary font-bold">+{totalXpGain} XP</p>
            {levelsGained > 0 && <p className="text-[10px] text-green-400">+{levelsGained} level{levelsGained > 1 ? 's' : ''}!</p>}
          </div>
        )}
      </div>

      {/* Selected count */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{selected.length}/{MAX_FODDER} selected</span>
        {selected.length > 0 && <button onClick={() => setSelected([])} className="text-destructive hover:text-destructive/80">Clear all</button>}
      </div>

      {/* Card list */}
      <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
        {available.map(({ card, playerCard }, i) => {
          const isSelected = selected.includes(playerCard.id);
          const xpVal = fodderXp(card, playerCard);
          const level = playerCard.level || 1;
          return (
            <motion.button
              key={playerCard.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.025 }}
              onClick={() => toggle(playerCard.id)}
              className={`w-full flex items-center gap-3 rounded-xl border-2 p-2.5 transition-all text-left
                ${isSelected
                  ? 'border-primary bg-primary/10'
                  : `${rarityBorder[card.rarity]} bg-card hover:brightness-110`
                }`}
            >
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                {card.image_url
                  ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  : <span className="text-lg">{elementIcons[card.element] || '⚔️'}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-xs truncate">{card.name}</p>
                <p className="text-[9px] text-muted-foreground capitalize">Lv.{level} · {card.rarity}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] text-primary font-bold flex items-center gap-0.5">
                  <Zap className="w-3 h-3" />+{xpVal}
                </span>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                  {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {available.length === 0 && (
        <p className="text-center text-muted-foreground py-6 text-sm">No other cards to use as fodder.</p>
      )}

      <Button
        onClick={() => onConfirm(selected, totalXpGain, levelsGained)}
        disabled={selected.length === 0}
        className="w-full gap-2"
      >
        <Sparkles className="w-4 h-4" />
        Enhance {target.card.name} {selected.length > 0 ? `(+${totalXpGain} XP)` : ''}
      </Button>
    </div>
  );
}