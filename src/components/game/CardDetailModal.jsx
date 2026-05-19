import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Sword, Shield, Heart, Sparkles, ArrowUp } from 'lucide-react';

const elementIcons = { fire: '🔥', water: '💧', earth: '🌿', light: '✨', dark: '🌑' };

const rarityColors = {
  common: 'bg-muted text-muted-foreground',
  rare: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  epic: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  legendary: 'bg-primary/20 text-primary border-primary/30'
};

export default function CardDetailModal({ card, playerCard, open, onClose, onLevelUp }) {
  if (!card) return null;

  const level = playerCard?.level || 1;
  const mult = 1 + (level - 1) * 0.1;
  const maxLevel = card.max_level || 50;
  const xpNeeded = level * 50;
  const xpPercent = playerCard ? Math.min((playerCard.experience / xpNeeded) * 100, 100) : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display text-primary flex items-center gap-2">
            {elementIcons[card.element]} {card.name}
            {playerCard?.evolved && <Sparkles className="w-4 h-4 text-primary" />}
          </DialogTitle>
        </DialogHeader>

        {/* Card Image */}
        <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
          {card.image_url ? (
            <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-secondary to-muted flex items-center justify-center">
              <span className="text-6xl">{elementIcons[card.element]}</span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Badge className={rarityColors[card.rarity]}>{card.rarity}</Badge>
            <Badge variant="outline">{card.card_type}</Badge>
            <Badge variant="outline">{card.element}</Badge>
          </div>

          <p className="text-sm text-muted-foreground">{card.description || 'A mysterious card of power.'}</p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Sword className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-display">{Math.round(card.base_attack * mult)}</p>
              <p className="text-[10px] text-muted-foreground">ATK</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-display">{Math.round(card.base_defense * mult)}</p>
              <p className="text-[10px] text-muted-foreground">DEF</p>
            </div>
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Heart className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-display">{Math.round(card.base_hp * mult)}</p>
              <p className="text-[10px] text-muted-foreground">HP</p>
            </div>
          </div>

          {/* Skill */}
          {card.skill_name && (
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs font-bold text-accent-foreground mb-1">⚡ {card.skill_name}</p>
              <p className="text-xs text-muted-foreground">{card.skill_description}</p>
            </div>
          )}

          {/* Level & XP */}
          {playerCard && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Level {level} / {maxLevel}</span>
                <span>{playerCard.experience} / {xpNeeded} XP</span>
              </div>
              <Progress value={xpPercent} className="h-2" />
              {onLevelUp && level < maxLevel && (
                <Button onClick={() => onLevelUp(playerCard)} size="sm" className="w-full gap-2">
                  <ArrowUp className="w-4 h-4" /> Level Up (100 Gold)
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}