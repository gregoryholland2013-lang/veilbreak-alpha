import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Lock,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import CardProtectionButton from '@/components/cards/CardProtectionButton';
import CardBack from '@/components/game/CardBack';
import CardCanvas from '@/components/game/CardCanvas';
import {
  getCoreFormMeta,
  getVeilRankMeta,
  MAX_VEIL_MARKS,
} from '@/utils/cardCosmetics';

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

const DETAIL_OVERLAYS = {
  marks: { left: '5.2%', top: '4.5%' },
  level: { right: '5.4%', top: '16.6%' },
  form: { right: '5.6%', bottom: '18.7%' },
  protect: { right: '5.7%', top: '28.6%' },
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

function getOwnedCardStat(playerCard, card, stat) {
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

function VeilMarks({ rank }) {
  return (
    <div
      title={`Veil Rank: ${rank.label} · ${rank.markCount} Veil Marks`}
      className="flex items-center gap-1 rounded-full border border-white/10 bg-black/80 px-2 py-1.5 shadow-lg backdrop-blur-md"
    >
      {Array.from({ length: MAX_VEIL_MARKS }).map((_, index) => {
        const filled = index < rank.markCount;
        const isSingularityFinalMark =
          rank.singularity && index === MAX_VEIL_MARKS - 1;

        return (
          <span
            key={index}
            className={`h-2.5 w-2.5 rounded-full border ${
              filled ? rank.mark : rank.emptyMark
            } ${
              isSingularityFinalMark
                ? 'scale-125 ring-1 ring-primary/70'
                : ''
            }`}
          />
        );
      })}
    </div>
  );
}

function FormPill({ form }) {
  return (
    <div
      title={`Core Form: ${form.label}`}
      className="rounded-full border border-primary/45 bg-black/85 px-2.5 py-1.5 text-[10px] font-display font-black leading-none text-primary shadow-lg backdrop-blur-md"
    >
      {form.pill}
    </div>
  );
}

function FramedCardPreview({ card, playerCard }) {
  const rank = getVeilRankMeta(card);
  const form = getCoreFormMeta(playerCard, card);
  const level = playerCard?.level || 1;
  const isProtected = Boolean(playerCard?.is_protected);

  return (
    <div className="mx-auto w-full max-w-[390px]">
      <CardCanvas card={card} playerCard={playerCard} size="detail">
        <div
          className="absolute z-50"
          style={{ left: DETAIL_OVERLAYS.marks.left, top: DETAIL_OVERLAYS.marks.top }}
        >
          <VeilMarks rank={rank} />
        </div>

        {playerCard && (
          <div
            className="absolute z-50 rounded-full border border-primary/45 bg-black/85 px-3 py-1.5 font-display text-xs font-black text-primary shadow-lg backdrop-blur-md"
            style={{ right: DETAIL_OVERLAYS.level.right, top: DETAIL_OVERLAYS.level.top }}
          >
            Lv{level}
          </div>
        )}

        {isProtected && (
          <div
            className="absolute z-50 flex h-8 w-8 items-center justify-center rounded-full border border-primary/45 bg-black/85 shadow-lg backdrop-blur-md"
            style={{ right: DETAIL_OVERLAYS.protect.right, top: DETAIL_OVERLAYS.protect.top }}
          >
            <Lock className="h-4 w-4 text-primary" />
          </div>
        )}

        <div
          className="absolute z-50"
          style={{ right: DETAIL_OVERLAYS.form.right, bottom: DETAIL_OVERLAYS.form.bottom }}
        >
          <FormPill form={form} />
        </div>
      </CardCanvas>
    </div>
  );
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

  const { data: lore, isLoading: loreLoading } = useQuery({
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
  const maxLevel = card.max_level || 50;
  const xpNeeded = level * 50;
  const xpCurrent = Number(playerCard?.experience || 0);
  const xpPercent = playerCard
    ? Math.min((xpCurrent / xpNeeded) * 100, 100)
    : 0;

  const attack = getOwnedCardStat(playerCard, card, 'attack');
  const defense = getOwnedCardStat(playerCard, card, 'defense');
  const hp = getOwnedCardStat(playerCard, card, 'hp');

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setShowBack(false);
          onClose?.();
        }
      }}
    >
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto border-border bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-primary">
            {card.name}
            {playerCard?.evolved && <Sparkles className="h-4 w-4 text-primary" />}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {showBack ? (
            <div className="relative overflow-hidden rounded-2xl border border-border bg-black/40 p-2">
              <CardBack card={card} lore={lore} loading={loreLoading} />
            </div>
          ) : (
            <FramedCardPreview card={card} playerCard={playerCard} />
          )}

          <Button
            type="button"
            variant="outline"
            onClick={() => setShowBack((value) => !value)}
            className="w-full gap-2"
          >
            {showBack ? (
              <>
                <ImageIcon className="h-4 w-4" />
                Show Card Art
              </>
            ) : (
              <>
                <BookOpen className="h-4 w-4" />
                Show Lore
              </>
            )}
          </Button>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
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
              <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/50 p-3">
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
              <div className="rounded-lg bg-muted p-2.5 text-center">
                <Sword className="mx-auto mb-1 h-4 w-4 text-red-400" />
                <p className="font-display text-lg font-bold">{attack}</p>
                <p className="text-[10px] text-muted-foreground">ATK</p>
              </div>

              <div className="rounded-lg bg-muted p-2.5 text-center">
                <Shield className="mx-auto mb-1 h-4 w-4 text-blue-400" />
                <p className="font-display text-lg font-bold">{defense}</p>
                <p className="text-[10px] text-muted-foreground">DEF</p>
              </div>

              <div className="rounded-lg bg-muted p-2.5 text-center">
                <Heart className="mx-auto mb-1 h-4 w-4 text-green-400" />
                <p className="font-display text-lg font-bold">{hp}</p>
                <p className="text-[10px] text-muted-foreground">HP</p>
              </div>
            </div>

            {card.skill_name && (
              <div className="rounded-lg border border-border bg-secondary/50 p-3">
                <p className="mb-1 text-xs font-bold text-accent-foreground">
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
                    {xpCurrent} / {xpNeeded} XP
                  </span>
                </div>

                <Progress value={xpPercent} className="h-2" />

                {onLevelUp && level < maxLevel && (
                  <Button
                    onClick={() => onLevelUp(playerCard)}
                    size="sm"
                    className="w-full gap-2"
                  >
                    <ArrowUp className="h-4 w-4" />
                    Level Up (100 Gold)
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
