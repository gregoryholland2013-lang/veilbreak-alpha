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
import CardOrganizerControls from '@/components/enhance/CardOrganizerControls';
import {
  getCardFilterOptions,
  organizeCards,
} from '@/utils/cardOrganization';

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
};

const MAX_EVOLVES = 3;

const EVOLUTION_RATES = {
  base_plus: 0.4,
  base_plus_plus: 0.45,
  final: 0.5,
};

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

  if (consumedPlayerCard.locked === true) {
    return false;
  }

  if (isFinalForm(targetPlayerCard, targetCard)) {
    return false;
  }

  return getCardLineKey(targetCard) === getCardLineKey(consumedCard);
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

export default function EvolvePanel({
  target,
  enrichedCards = [],
  onEvolve,
  onBack,
  disabled,
}) {
  const [selectedMaterialId, setSelectedMaterialId] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('total_desc');
  const [filters, setFilters] = useState({
    rarity: 'all',
    faction: 'all',
    stage: 'all',
    line: 'all',
  });

  const card = target?.card || null;
  const playerCard = target?.playerCard || null;

  const targetStageCount =
    card && playerCard ? getOwnedCardStageCount(playerCard, card) : 0;

  const targetStage = getNextEvolutionStage(targetStageCount);
  const targetStageLabel = formatStageLabel(targetStage);
  const finalForm = card && playerCard ? isFinalForm(playerCard, card) : false;

  const nextEvolveCount =
    card && playerCard ? getNextEvolveCountFromTarget(playerCard, card) : 0;

  const nextStage = getNextEvolutionStage(nextEvolveCount);
  const nextStageLabel = formatStageLabel(nextStage);
  const rate = getEvolutionRate(nextEvolveCount);

  const validMaterials = useMemo(() => {
    if (!card || !playerCard) return [];

    return enrichedCards.filter(({ card: candidateCard, playerCard: pc }) => {
      return isValidEvolutionMaterial(playerCard, card, pc, candidateCard);
    });
  }, [enrichedCards, card, playerCard]);

  const filterOptions = useMemo(() => {
    return getCardFilterOptions(validMaterials);
  }, [validMaterials]);

  const organizedValidMaterials = useMemo(() => {
    return organizeCards(validMaterials, {
      sortBy,
      filters: {
        ...filters,
        search,
      },
    });
  }, [validMaterials, sortBy, filters, search]);

  const selectedMaterial = validMaterials.find(
    (item) => item.playerCard.id === selectedMaterialId
  );

  const previewStats = useMemo(() => {
    if (!card || !playerCard || !selectedMaterial) return null;

    const previousStageBaseAttack = getStageBaseStat(playerCard, card, 'attack');
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
      selectedMaterial.playerCard,
      selectedMaterial.card,
      'attack'
    );
    const consumedDefense = getCurrentStat(
      selectedMaterial.playerCard,
      selectedMaterial.card,
      'defense'
    );
    const consumedHp = getCurrentStat(
      selectedMaterial.playerCard,
      selectedMaterial.card,
      'hp'
    );

    return {
      attack: calculateEvolvedStat({
        previousStageBase: previousStageBaseAttack,
        targetCurrent: targetAttack,
        consumedCurrent: consumedAttack,
        rate,
      }),
      defense: calculateEvolvedStat({
        previousStageBase: previousStageBaseDefense,
        targetCurrent: targetDefense,
        consumedCurrent: consumedDefense,
        rate,
      }),
      hp: calculateEvolvedStat({
        previousStageBase: previousStageBaseHp,
        targetCurrent: targetHp,
        consumedCurrent: consumedHp,
        rate,
      }),
      targetAttack,
      targetDefense,
      targetHp,
      consumedAttack,
      consumedDefense,
      consumedHp,
    };
  }, [selectedMaterial, playerCard, card, rate]);

  const stars = Array.from(
    { length: MAX_EVOLVES },
    (_, i) => i < targetStageCount
  );

  const canEvolve =
    !finalForm && validMaterials.length > 0 && Boolean(selectedMaterial);

  const confirmEvolve = () => {
    if (!selectedMaterial) return;
    onEvolve?.(selectedMaterialId);
  };

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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          type="button"
          disabled={disabled}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <div>
          <h2 className="font-display text-lg font-bold text-primary">
            Evolve Card
          </h2>

          <p className="text-xs text-muted-foreground">
            Target evolves one stage forward. Select a same-line card to
            consume for stat inheritance.
          </p>
        </div>
      </div>

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
              Lv.{playerCard.level || 1} · {card.rarity} · {targetStageLabel}
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

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          {[
            {
              label: 'ATK',
              current: getCurrentStat(playerCard, card, 'attack'),
              next: previewStats?.attack,
              color: 'text-red-400',
            },
            {
              label: 'DEF',
              current: getCurrentStat(playerCard, card, 'defense'),
              next: previewStats?.defense,
              color: 'text-blue-400',
            },
            {
              label: 'HP',
              current: getCurrentStat(playerCard, card, 'hp'),
              next: previewStats?.hp,
              color: 'text-green-400',
            },
          ].map(({ label, current, next, color }) => (
            <div key={label} className="bg-muted/40 rounded-lg p-2">
              <p className="text-muted-foreground text-[10px]">{label}</p>
              <p className={`font-bold ${color}`}>{current}</p>
              {next && <p className="text-primary text-[10px]">→ {next}</p>}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Evolution Progress</span>
            <span className="text-primary font-semibold">
              {finalForm
                ? 'Final Form'
                : `${targetStageLabel} → ${nextStageLabel}`}
            </span>
          </div>

          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${
                  (Math.min(targetStageCount, MAX_EVOLVES) / MAX_EVOLVES) *
                  100
                }%`,
              }}
              transition={{ duration: 0.6 }}
            />
          </div>
        </div>
      </div>

      <div className="bg-muted/30 border border-border rounded-xl p-4 space-y-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Requirements
        </p>

        <div
          className={`flex items-center gap-3 text-sm ${
            validMaterials.length > 0 ? 'text-green-400' : 'text-destructive'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              validMaterials.length > 0
                ? 'border-green-400 bg-green-400/20'
                : 'border-destructive bg-destructive/10'
            }`}
          >
            {validMaterials.length > 0 ? (
              <span className="text-[10px] font-black">✓</span>
            ) : (
              <span className="text-[10px] font-black">✗</span>
            )}
          </div>

          <span>
            1× valid same-line material
            {validMaterials.length > 0
              ? ` (${validMaterials.length} available)`
              : ' — not owned'}
          </span>
        </div>
      </div>

      {finalForm ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>This card has reached Final Form and cannot evolve further.</span>
        </div>
      ) : validMaterials.length === 0 ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>You need a valid same-line card to evolve {card.name}.</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Select Card to Consume
            </p>

            <p className="text-[10px] text-muted-foreground mt-1">
              The target becomes {nextStageLabel}. The selected card only
              contributes stats and will be permanently removed.
            </p>
          </div>

          <CardOrganizerControls
            search={search}
            setSearch={setSearch}
            sortBy={sortBy}
            setSortBy={setSortBy}
            filters={filters}
            setFilters={setFilters}
            filterOptions={filterOptions}
            compact
          />

          <div className="grid grid-cols-3 gap-3">
            {organizedValidMaterials.map((item) => {
              const materialPc = item.playerCard;
              const materialStageCount = getOwnedCardStageCount(
                item.playerCard,
                item.card
              );
              const materialStage = getNextEvolutionStage(materialStageCount);
              const materialStageLabel = formatStageLabel(materialStage);
              const isSelected = selectedMaterialId === materialPc.id;

              return (
                <button
                  key={materialPc.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      setSelectedMaterialId(materialPc.id);
                    }
                  }}
                  className={`relative rounded-xl transition-all ${
                    isSelected
                      ? 'ring-2 ring-primary scale-[1.03]'
                      : 'opacity-90 hover:opacity-100 hover:scale-[1.02]'
                  }`}
                >
                  <GameCard
                    card={item.card}
                    playerCard={materialPc}
                    size="sm"
                    showStats
                  />

                  <div className="absolute left-1 right-1 bottom-1 rounded-md bg-black/70 px-1 py-0.5 text-[9px] text-white font-bold">
                    {materialStageLabel} Material
                  </div>

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

          {organizedValidMaterials.length === 0 && validMaterials.length > 0 && (
            <p className="text-center text-muted-foreground py-6 text-sm">
              No evolution materials match your filters.
            </p>
          )}

          {selectedMaterial && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-destructive flex-shrink-0" />

              <div className="min-w-0">
                <p className="text-xs text-destructive font-semibold">
                  This card will be consumed:
                </p>

                <p className="text-[11px] text-muted-foreground truncate">
                  {selectedMaterial.card.name} · Lv.
                  {selectedMaterial.playerCard.level || 1} ·{' '}
                  {formatStageLabel(
                    getNextEvolutionStage(
                      getOwnedCardStageCount(
                        selectedMaterial.playerCard,
                        selectedMaterial.card
                      )
                    )
                  )}
                </p>
              </div>
            </div>
          )}

          {previewStats && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-bold text-primary">
                Evolution Preview
              </p>

              <p className="text-[11px] text-muted-foreground mt-1">
                Result: {targetStageLabel} → {nextStageLabel}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Consumed material:{' '}
                {formatStageLabel(
                  getNextEvolutionStage(
                    getOwnedCardStageCount(
                      selectedMaterial.playerCard,
                      selectedMaterial.card
                    )
                  )
                )}
              </p>

              <p className="text-[11px] text-muted-foreground">
                Rate: {Math.round(rate * 100)}%
              </p>

              <p className="text-[11px] text-muted-foreground">
                New Base: {previewStats.attack} ATK / {previewStats.defense} DEF
                / {previewStats.hp} HP
              </p>
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
            ? `Evolve to ${nextStageLabel}`
            : 'Select Material to Evolve'}
      </Button>
    </div>
  );
}
