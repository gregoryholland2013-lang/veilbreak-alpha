import React, { useMemo, useState } from 'react';
import { X, Trophy, Skull, Play, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BattleDeckDisplay from './BattleDeckDisplay';
import SkillTriggerLog from './SkillTriggerLog';

function rollMultiplier() {
  return 0.9 + Math.random() * 0.2;
}

function applySkillTriggers(deckCards, baseStats, side) {
  const stats = { ...baseStats };
  const triggers = [];

  for (const item of deckCards) {
    const card = item.card;
    const skillName = card?.skill_name;

    if (!skillName) continue;

    const chance = Number(card.skill_chance ?? 0.3);
    const rolled = Math.random() <= chance;

    if (!rolled) continue;

    const skillType = card.skill_type || 'atk_boost';
    const skillValue = Number(card.skill_value ?? 10);

    let description = '';

    if (skillType === 'atk_boost') {
      stats.attack += skillValue;
      description = `Increased ATK by ${skillValue}.`;
    } else if (skillType === 'def_boost') {
      stats.defense += skillValue;
      description = `Increased DEF by ${skillValue}.`;
    } else if (skillType === 'hp_boost') {
      stats.hp += skillValue;
      description = `Increased HP by ${skillValue}.`;
    } else {
      stats.attack += skillValue;
      description = `Triggered for +${skillValue} battle power.`;
    }

    triggers.push({
      side,
      cardName: card.name || card.full_card_name || 'Unknown Card',
      skillName,
      skillType,
      skillValue,
      description,
    });
  }

  stats.power = Math.round(stats.attack + stats.defense + stats.hp * 0.25);

  return { stats, triggers };
}

function calculateBattleResult(attackerStats, defenderStats) {
  const attackerBattlePower =
    attackerStats.attack * rollMultiplier() + attackerStats.hp * 0.25;

  const defenderBattlePower =
    defenderStats.defense * rollMultiplier() + defenderStats.hp * 0.25;

  return {
    attackerBattlePower: Math.round(attackerBattlePower),
    defenderBattlePower: Math.round(defenderBattlePower),
    attackerWon: attackerBattlePower >= defenderBattlePower,
  };
}

export default function BattleArenaModal({
  open,
  onClose,
  opponent,
  myDeckCards = [],
  opponentDeckCards = [],
  myDeckStats,
  opponentDeckStats,
  possibleWinPoints,
  possibleDefenderPoints,
  onResolve,
  resolving,
}) {
  const [phase, setPhase] = useState('preview'); // preview | resolved
  const [battleResult, setBattleResult] = useState(null);

  const opponentName =
    opponent?.display_name || opponent?.email || 'Unknown Opponent';

  const startBattle = async () => {
    const attackerSkillResult = applySkillTriggers(
      myDeckCards,
      myDeckStats,
      'attacker'
    );

    const defenderSkillResult = applySkillTriggers(
      opponentDeckCards,
      opponentDeckStats,
      'defender'
    );

    const result = calculateBattleResult(
      attackerSkillResult.stats,
      defenderSkillResult.stats
    );

    const finalResult = {
      ...result,
      attackerFinalStats: attackerSkillResult.stats,
      defenderFinalStats: defenderSkillResult.stats,
      skillTriggers: [
        ...attackerSkillResult.triggers,
        ...defenderSkillResult.triggers,
      ],
    };

    setBattleResult(finalResult);
    setPhase('resolved');

    await onResolve?.(finalResult);
  };

  const resetAndClose = () => {
    setPhase('preview');
    setBattleResult(null);
    onClose?.();
  };

  if (!open || !opponent) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-md flex items-center justify-center px-3 py-6">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-primary/40 bg-background shadow-2xl">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
          <div>
            <p className="font-display font-black text-primary">
              Arena Battle
            </p>
            <p className="text-xs text-muted-foreground">
              You vs {opponentName}
            </p>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <BattleDeckDisplay
            title="Your Deck"
            deckCards={myDeckCards}
            stats={
              battleResult?.attackerFinalStats ||
              myDeckStats
            }
          />

          <div className="text-center">
            <p className="font-display text-xl font-black text-primary">VS</p>
          </div>

          <BattleDeckDisplay
            title={`${opponentName}'s Deck`}
            deckCards={opponentDeckCards}
            stats={
              battleResult?.defenderFinalStats ||
              opponentDeckStats
            }
            side="right"
          />

          {phase === 'preview' && (
            <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
              <p className="font-display font-bold text-sm text-primary">
                Battle Stakes
              </p>

              <p className="text-xs text-muted-foreground">
                Victory can award approximately{' '}
                <span className="text-primary font-bold">
                  +{possibleWinPoints} arena points
                </span>
                .
              </p>

              <p className="text-xs text-muted-foreground">
                If you lose, the defender may gain{' '}
                <span className="text-blue-300 font-bold">
                  +{possibleDefenderPoints} arena points
                </span>
                .
              </p>

              <Button
                onClick={startBattle}
                disabled={resolving}
                className="w-full gap-2 mt-2"
              >
                <Play className="w-4 h-4" />
                {resolving ? 'Resolving…' : 'Start Battle'}
              </Button>
            </div>
          )}

          {phase === 'resolved' && battleResult && (
            <div className="space-y-4">
              <SkillTriggerLog triggers={battleResult.skillTriggers} />

              <div
                className={`rounded-2xl border p-4 text-center space-y-2 ${
                  battleResult.attackerWon
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-red-500/40 bg-red-500/10'
                }`}
              >
                {battleResult.attackerWon ? (
                  <Trophy className="w-10 h-10 text-primary mx-auto" />
                ) : (
                  <Skull className="w-10 h-10 text-red-400 mx-auto" />
                )}

                <p className="font-display font-black text-lg">
                  {battleResult.attackerWon ? 'Victory!' : 'Defeat'}
                </p>

                <p className="text-xs text-muted-foreground">
                  Your Battle Power:{' '}
                  <span className="font-bold text-foreground">
                    {battleResult.attackerBattlePower.toLocaleString()}
                  </span>
                </p>

                <p className="text-xs text-muted-foreground">
                  Opponent Battle Power:{' '}
                  <span className="font-bold text-foreground">
                    {battleResult.defenderBattlePower.toLocaleString()}
                  </span>
                </p>
              </div>

              <Button onClick={resetAndClose} variant="outline" className="w-full gap-2">
                <RotateCcw className="w-4 h-4" />
                Return to Arena
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}