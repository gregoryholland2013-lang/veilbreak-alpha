import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sword,
  Shield,
  Heart,
  Sparkles,
  ArrowUp,
  BookOpen,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import CardProtectionButton from '@/components/cards/CardProtectionButton';
import CardBack from '@/components/game/CardBack';
import CardArtCanvas from '@/components/game/CardArtCanvas';

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
};

const rarityColors = {
  common: 'bg-muted text-muted-foreground',
  rare: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  epic: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  legendary: 'bg-primary/20 text-primary border-primary/30',

  normal: 'bg-muted text-muted-foreground',
  high_normal: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  vessel: 'bg-slate-500/20 text-slate-200 border-slate-400/30',
  awakened: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  ascendant: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  super_rare: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
  ultra_rare: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  ascended: 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
  exalted: 'bg-orange-500/20 text-orange-300 border-orange-400/30',
  paragon: 'bg-pink-500/20 text-pink-300 border-pink-400/30',
  mythic: 'bg-red-500/20 text-red-300 border-red-400/30',
  transcendent: 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30',
  eclipse: 'bg-violet-500/20 text-violet-300 border-violet-400/30',
  singularity: 'bg-primary/20 text-primary border-primary/30',
};

function getLoreStage(evolutionStage) {
  const normalized = String(evolutionStage || 'base').toLowerCase();

  const stageMap = {
    base: 1,
    vessel: 1,
    base_plus: 2,
    base_plus_plus: 3,
    awakened: 2,
    final: 4,
  };

  return stageMap[normalized] || 1;
}

export default function CardDetailModal({
  card,
  playerCard,
  open,
  onClose,
  onLevelUp,
  onProtectionUpdated,
}) {
  const [showBack, setShowBack] = useState(false);

  const loreStage = getLoreStage(card?.evolution_stage);

  const {
    data: lore,
    isLoading: loreLoading,
  } = useQuery({
    queryKey: ['card-lore', card?.id, loreStage],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_lore')
        .select('*')
        .eq('card_id', card.id)
        .eq('lore_stage', loreStage)
        .eq('is_active', true)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!card?.id && open && showBack,
  });

  if (!card) return null;

  const level = playerCard?.level || 1;
  const mult = 1 + (level - 1) * 0.1;
  const maxLevel = card.max_level || 50;
  const xpNeeded = level * 50;
  const xpPercent = playerCard
    ? Math.min((playerCard.experience / xpNeeded) * 100, 100)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-primary flex items-center gap-2">
            {elementIcons[card.element]} {card.name}
            {playerCard?.evolved && <Sparkles className="w-4 h-4 text-primary" />}
          </DialogTitle>
        </DialogHeader>

        {showBack ? (
          <div className="relative w-full rounded-xl overflow-hidden bg-black/40 border border-border flex items-center justify-center">
            <CardBack card={card} lore={lore} loading={loreLoading} />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[340px]">
            <CardArtCanvas
              card={card}
              playerCard={playerCard}
              size="detail"
              className="border border-border"
            />
          </div>
        )}

        <Button
          type="button"
          variant="outline"
          onClick={() => setShowBack((value) => !value)}
          className="w-full gap-2"
        >
          {showBack ? (
            <>
              <ImageIcon className="w-4 h-4" />
              Show Card Art
            </>
          ) : (
            <>
              <BookOpen className="w-4 h-4" />
              Show Lore
            </>
          )}
        </Button>

        <div className="space-y-3">
          <div className="flex gap-2 flex-wrap">
            <Badge className={rarityColors[card.rarity] || rarityColors.common}>
              {card.rarity}
            </Badge>

            {card.card_type && <Badge variant="outline">{card.card_type}</Badge>}
            {card.element && <Badge variant="outline">{card.element}</Badge>}
            {card.faction && <Badge variant="outline">{card.faction}</Badge>}
          </div>

          <p className="text-sm text-muted-foreground">
            {card.description || 'A mysterious card of power.'}
          </p>

          {playerCard && (
            <div className="rounded-xl border border-border bg-background/50 p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-foreground">Card Protection</p>
                <p className="text-[11px] text-muted-foreground">
                  Protected cards cannot be consumed during enhance or evolution.
                </p>
              </div>

              <CardProtectionButton
                playerCard={playerCard}
                size="md"
                onUpdated={onProtectionUpdated}
              />
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Sword className="w-4 h-4 text-red-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-display">
                {Math.round((card.base_attack || 0) * mult)}
              </p>
              <p className="text-[10px] text-muted-foreground">ATK</p>
            </div>

            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-display">
                {Math.round((card.base_defense || 0) * mult)}
              </p>
              <p className="text-[10px] text-muted-foreground">DEF</p>
            </div>

            <div className="bg-muted rounded-lg p-2.5 text-center">
              <Heart className="w-4 h-4 text-green-400 mx-auto mb-1" />
              <p className="text-lg font-bold font-display">
                {Math.round((card.base_hp || 0) * mult)}
              </p>
              <p className="text-[10px] text-muted-foreground">HP</p>
            </div>
          </div>

          {card.skill_name && (
            <div className="bg-secondary/50 rounded-lg p-3 border border-border">
              <p className="text-xs font-bold text-accent-foreground mb-1">
                ⚡ {card.skill_name}
              </p>
              <p className="text-xs text-muted-foreground">
                {card.skill_description}
              </p>
            </div>
          )}

          {playerCard && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>
                  Level {level} / {maxLevel}
                </span>
                <span>
                  {playerCard.experience} / {xpNeeded} XP
                </span>
              </div>

              <Progress value={xpPercent} className="h-2" />

              {onLevelUp && level < maxLevel && (
                <Button
                  onClick={() => onLevelUp(playerCard)}
                  size="sm"
                  className="w-full gap-2"
                >
                  <ArrowUp className="w-4 h-4" />
                  Level Up (100 Gold)
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
