import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sword,
  Shield,
  Heart,
  Sparkles,
  Trophy,
  Skull,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
  neutral: '⚔️',
};

const elementColors = {
  fire: 'from-red-900/80 to-orange-900/80 border-red-500/60',
  water: 'from-blue-900/80 to-cyan-900/80 border-blue-500/60',
  earth: 'from-green-900/80 to-emerald-900/80 border-green-500/60',
  light: 'from-yellow-900/80 to-amber-900/80 border-yellow-500/60',
  dark: 'from-purple-900/80 to-slate-900/80 border-purple-500/60',
  lightning: 'from-blue-900/80 to-purple-900/80 border-blue-400/60',
  neutral: 'from-slate-800/80 to-slate-950/80 border-slate-500/60',
};

const rarityGlow = {
  common: '',
  rare: 'shadow-[0_0_12px_rgba(96,165,250,0.5)]',
  epic: 'shadow-[0_0_12px_rgba(192,132,252,0.6)]',
  legendary: 'shadow-[0_0_16px_rgba(250,189,50,0.7)]',
};

const rarityBorder = {
  common: 'border-slate-500/50',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-yellow-400',
};

function makeNoDeckCards(opponentName = 'Opponent') {
  return [
    {
      id: 'no-deck-guard',
      card: {
        id: 'no-deck-guard-card',
        name: `${opponentName}'s Guard`,
        element: 'neutral',
        rarity: 'common',
        base_attack: 50,
        base_defense: 50,
        base_hp: 250,
        skill_name: null,
        skill_power: 1,
        image_url: null,
      },
      playerCard: { id: 'no-deck-guard-pc', level: 1 },
      isNpc: true,
    },
  ];
}

function getCardAttack(item) {
  return item.playerCard?.attack ?? item.card?.base_attack ?? 0;
}

function getCardDefense(item) {
  return item.playerCard?.defense ?? item.card?.base_defense ?? 0;
}

function getCardHp(item) {
  return item.playerCard?.hp ?? item.playerCard?.max_hp ?? item.card?.base_hp ?? 0;
}

function getCardPower(item) {
  return getCardAttack(item) + getCardDefense(item) + getCardHp(item) * 0.25;
}

function rollSkillTriggers(deckCards) {
  return deckCards.filter(({ card, playerCard }) => {
    if (!card?.skill_name) return false;

    const baseChance = Number(card.skill_chance ?? 0.3);
    const levelBonus = ((playerCard?.skill_level || 0) * 0.015);
    const chance = Math.min(0.75, baseChance + levelBonus);

    return Math.random() <= chance;
  });
}

function calculateDeckPower(deckCards) {
  return deckCards.reduce((sum, item) => {
    const level = item.playerCard?.level || 1;
    const mult = 1 + (level - 1) * 0.1;

    return sum + getCardPower(item) * mult;
  }, 0);
}

function calculateSkillBonus(triggeredItems) {
  return triggeredItems.reduce((sum, item) => {
    const skillPower = Number(item.card?.skill_power ?? 1.25);
    const skillValue = Number(item.card?.skill_value ?? 0);

    if (skillValue > 0) {
      return sum + skillValue;
    }

    return sum + getCardAttack(item) * skillPower;
  }, 0);
}

function BattleCard({ item, triggeredSkill, delay = 0, side = 'left', isActive }) {
  const { card, playerCard } = item;

  if (!card) return null;

  const level = playerCard?.level || 1;
  const mult = 1 + (level - 1) * 0.1;

  const element = card.element || 'neutral';
  const rarity = card.rarity || 'common';
  const elColors = elementColors[element] || elementColors.neutral;

  const atk = Math.round((playerCard?.attack ?? card.base_attack ?? 0) * mult);
  const def = Math.round((playerCard?.defense ?? card.base_defense ?? 0) * mult);
  const hp = Math.round((playerCard?.hp ?? playerCard?.max_hp ?? card.base_hp ?? 0) * mult);

  return (
    <motion.div
      initial={{
        opacity: 0,
        x: side === 'left' ? -50 : 50,
        rotateY: side === 'left' ? -15 : 15,
      }}
      animate={{
        opacity: 1,
        x: 0,
        rotateY: 0,
      }}
      transition={{
        delay,
        duration: 0.4,
        type: 'spring',
        stiffness: 200,
      }}
      className={`relative rounded-xl overflow-hidden border-2 ${
        rarityBorder[rarity] || rarityBorder.common
      } ${rarityGlow[rarity] || ''} transition-all duration-300`}
    >
      <div
        className={`relative w-full h-20 bg-gradient-to-br ${elColors} flex items-center justify-center overflow-hidden`}
      >
        {card.image_url ? (
          <img
            src={card.image_url}
            alt={card.name}
            className="w-full h-full object-cover opacity-90"
          />
        ) : (
          <motion.span
            animate={isActive ? { scale: [1, 1.2, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className="text-4xl drop-shadow-lg"
          >
            {elementIcons[element] || '⚔️'}
          </motion.span>
        )}

        <div className="absolute top-1 right-1 bg-black/60 rounded-md px-1 py-0.5 text-[9px] font-black text-primary font-display">
          Lv{level}
        </div>

        {rarity === 'legendary' && (
          <motion.div
            animate={{ x: ['-100%', '200%'] }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
              ease: 'linear',
              repeatDelay: 1,
            }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
        )}
      </div>

      <div className="bg-card/95 px-2 py-1.5">
        <p className="font-display text-[10px] font-bold truncate text-foreground leading-tight">
          {card.name || card.full_card_name || 'Unknown Card'}
        </p>

        <div className="flex gap-1.5 mt-1 text-[9px]">
          <span className="flex items-center gap-0.5 text-red-400 font-bold">
            <Sword className="w-2.5 h-2.5" />
            {atk}
          </span>

          <span className="flex items-center gap-0.5 text-blue-400 font-bold">
            <Shield className="w-2.5 h-2.5" />
            {def}
          </span>

          <span className="flex items-center gap-0.5 text-green-400 font-bold">
            <Heart className="w-2.5 h-2.5" />
            {hp}
          </span>
        </div>
      </div>

      <AnimatePresence>
        {triggeredSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl border-2 border-yellow-400 bg-yellow-400/20 backdrop-blur-sm flex flex-col items-center justify-center gap-1 z-10"
          >
            <motion.div
              animate={{ rotate: 360, scale: [1, 1.3, 1] }}
              transition={{ duration: 0.6 }}
            >
              <Sparkles className="w-6 h-6 text-yellow-300 drop-shadow-lg" />
            </motion.div>

            <p className="text-[9px] font-black text-yellow-200 text-center px-1 leading-tight">
              {card.skill_name || 'SKILL!'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BattleScreen({
  myDeckCards = [],
  opponentDeckCards = [],
  opponent,
  possibleWinPoints = 1,
  possibleDefenderPoints = 3,
  onFinish,
  onBack,
}) {
  const [phase, setPhase] = useState('show_decks');
  const [mySkills, setMySkills] = useState([]);
  const [oppSkills, setOppSkills] = useState([]);
  const [skillEvents, setSkillEvents] = useState([]);
  const [result, setResult] = useState(null);
  const [clashFlash, setClashFlash] = useState(false);
  const [hasResolved, setHasResolved] = useState(false);

  const opponentName =
    opponent?.display_name || opponent?.email || 'Opponent';

  const enemyCards = useMemo(() => {
    if (opponentDeckCards.length > 0) {
      return opponentDeckCards;
    }

    return makeNoDeckCards(opponentName);
  }, [opponentDeckCards, opponentName]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;

      const myTriggeredItems = rollSkillTriggers(myDeckCards);
      const oppTriggeredItems = rollSkillTriggers(enemyCards);

      const myTriggeredIds = myTriggeredItems.map(
        (item) => item.playerCard?.id || item.card?.id || item.id
      );

      const oppTriggeredIds = oppTriggeredItems.map(
        (item) => item.playerCard?.id || item.card?.id || item.id
      );

      setMySkills(myTriggeredIds);
      setOppSkills(oppTriggeredIds);

      const events = [];

      myTriggeredItems.forEach((item) => {
        events.push({
          side: 'player',
          cardName: item.card?.name || item.card?.full_card_name || 'Card',
          skillName: item.card?.skill_name || 'Skill',
          power: Number(item.card?.skill_power ?? 1.25),
        });
      });

      oppTriggeredItems.forEach((item) => {
        events.push({
          side: 'enemy',
          cardName: item.card?.name || item.card?.full_card_name || 'Card',
          skillName: item.card?.skill_name || 'Skill',
          power: Number(item.card?.skill_power ?? 1.25),
        });
      });

      setSkillEvents(events);
      setPhase('skills');

      await new Promise((r) => setTimeout(r, 1200));
      if (cancelled) return;

      setClashFlash(true);

      await new Promise((r) => setTimeout(r, 400));
      if (cancelled) return;

      setClashFlash(false);

      await new Promise((r) => setTimeout(r, 1400));
      if (cancelled) return;

      const myPower = calculateDeckPower(myDeckCards);
      const oppPower = calculateDeckPower(enemyCards);

      const mySkillBonus = calculateSkillBonus(myTriggeredItems);
      const oppSkillBonus = calculateSkillBonus(oppTriggeredItems);

      const myTotal =
        myPower + mySkillBonus + Math.random() * Math.max(myPower, 1) * 0.15;

      const oppTotal =
        oppPower + oppSkillBonus + Math.random() * Math.max(oppPower, 1) * 0.15;

      const attackerWon = myTotal >= oppTotal;

      const finalResult = {
        attackerWon,
        won: attackerWon,
        myTotal: Math.round(myTotal),
        oppTotal: Math.round(oppTotal),
        attackerBattlePower: Math.round(myTotal),
        defenderBattlePower: Math.round(oppTotal),
        mySkillsTriggered: myTriggeredItems.length,
        oppSkillsTriggered: oppTriggeredItems.length,
        attackerPoints: attackerWon ? possibleWinPoints : 0,
        defenderPoints: attackerWon ? 0 : possibleDefenderPoints,
      };

      setResult(finalResult);
      setPhase('result');

      if (!hasResolved) {
        setHasResolved(true);
        await onFinish?.(finalResult);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="relative space-y-0 overflow-hidden">
      <AnimatePresence>
        {clashFlash && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/30 pointer-events-none"
          />
        )}
      </AnimatePresence>

      <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-purple-500/20 pt-4 pb-2 px-3">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/60"
            style={{
              left: `${15 + i * 14}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{ y: [-4, 4, -4], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 2 + i * 0.3,
              repeat: Infinity,
              delay: i * 0.4,
            }}
          />
        ))}

        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-display text-[10px] uppercase tracking-widest text-green-400/80 mb-1">
              You
            </p>

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-green-900/60 border border-green-500/50 flex items-center justify-center mx-auto">
              <Sword className="w-5 h-5 text-green-300" />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1">
            <motion.div
              animate={{
                scale: [1, 1.08, 1],
                boxShadow: [
                  '0 0 10px rgba(250,189,50,0.3)',
                  '0 0 25px rgba(250,189,50,0.7)',
                  '0 0 10px rgba(250,189,50,0.3)',
                ],
              }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary flex items-center justify-center"
            >
              <span className="font-display font-black text-sm text-primary">
                VS
              </span>
            </motion.div>

            <p className="text-[9px] tracking-widest text-muted-foreground uppercase">
              {phase === 'show_decks'
                ? 'decks revealed'
                : phase === 'skills'
                  ? '⚡ skills!'
                  : 'result'}
            </p>
          </div>

          <div className="text-center">
            <p className="font-display text-[10px] uppercase tracking-widest text-red-400/80 mb-1 truncate max-w-[100px]">
              {opponentName}
            </p>

            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-red-900/60 border border-red-500/50 flex items-center justify-center mx-auto">
              <Skull className="w-5 h-5 text-red-300" />
            </div>
          </div>
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-slate-900/90 to-background border-x border-purple-500/20 px-3 pb-3">
        <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-primary/30 via-primary/60 to-primary/30 transform -translate-x-1/2" />

        <div className="grid grid-cols-2 gap-3 pt-3">
          <div className="space-y-2">
            {myDeckCards.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card/70 p-4 text-center text-xs text-muted-foreground">
                No active deck
              </div>
            )}

            {myDeckCards.map((item, i) => {
              const triggerId = item.playerCard?.id || item.card?.id || item.id;

              return (
                <BattleCard
                  key={triggerId}
                  item={item}
                  triggeredSkill={phase === 'skills' && mySkills.includes(triggerId)}
                  delay={i * 0.08}
                  side="left"
                  isActive={phase === 'skills'}
                />
              );
            })}
          </div>

          <div className="space-y-2">
            {enemyCards.map((item, i) => {
              const triggerId = item.playerCard?.id || item.card?.id || item.id;

              return (
                <BattleCard
                  key={triggerId}
                  item={item}
                  triggeredSkill={phase === 'skills' && oppSkills.includes(triggerId)}
                  delay={i * 0.08 + 0.04}
                  side="right"
                  isActive={phase === 'skills'}
                />
              );
            })}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {phase === 'skills' && skillEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-x border-b border-purple-500/20 bg-slate-900/80 px-4 py-3 space-y-1.5"
          >
            <p className="text-[9px] uppercase tracking-widest text-yellow-400/80 font-bold mb-1">
              ⚡ Skills Activated!
            </p>

            {skillEvents.map((ev, i) => (
              <motion.div
                key={`${ev.cardName}-${i}`}
                initial={{ opacity: 0, x: ev.side === 'player' ? -12 : 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.25 }}
                className={`flex items-center gap-2 text-xs ${
                  ev.side === 'player' ? 'text-green-300' : 'text-red-300'
                }`}
              >
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span>
                  <span className="font-bold">{ev.cardName}</span> →{' '}
                  <span className="font-bold">{ev.skillName}</span>{' '}
                  <span className="text-muted-foreground">
                    (×{ev.power.toFixed(1)})
                  </span>
                </span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {phase === 'skills' && (
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1, repeat: Infinity }}
          className="text-center text-[11px] text-primary font-semibold py-2 bg-gradient-to-r from-transparent via-primary/5 to-transparent"
        >
          ⚔️ Computing battle outcome…
        </motion.p>
      )}

      <AnimatePresence>
        {phase === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className={`relative overflow-hidden rounded-b-2xl border-x border-b p-5 text-center space-y-4 ${
              result.won
                ? 'border-primary/50 bg-gradient-to-br from-yellow-900/40 via-amber-900/20 to-background'
                : 'border-red-500/40 bg-gradient-to-br from-red-900/40 via-red-950/20 to-background'
            }`}
          >
            <div className="relative">
              <motion.div
                animate={{
                  scale: [1, 1.15, 1],
                  rotate: result.won ? [0, 5, -5, 0] : [0],
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                {result.won ? (
                  <Trophy className="w-14 h-14 mx-auto text-primary drop-shadow-[0_0_20px_hsl(45,80%,55%,0.8)]" />
                ) : (
                  <Skull className="w-14 h-14 mx-auto text-red-400 opacity-80" />
                )}
              </motion.div>

              <h2
                className={`font-display text-3xl font-black mt-2 ${
                  result.won ? 'text-primary' : 'text-red-400'
                }`}
              >
                {result.won ? '⚔️ VICTORY!' : '💀 DEFEAT'}
              </h2>
            </div>

            <div className="space-y-2">
              {[
                {
                  label: 'Your Power',
                  value: result.myTotal,
                  max: Math.max(result.myTotal, result.oppTotal),
                  color: 'bg-green-500',
                  won: result.won,
                },
                {
                  label: opponentName,
                  value: result.oppTotal,
                  max: Math.max(result.myTotal, result.oppTotal),
                  color: 'bg-red-500',
                  won: !result.won,
                },
              ].map(({ label, value, max, color, won: isWinner }) => (
                <div key={label} className="text-left">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span
                      className={`font-semibold ${
                        isWinner ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {label}
                    </span>

                    <span className="text-muted-foreground font-mono">
                      {value.toLocaleString()}
                    </span>
                  </div>

                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${(value / max) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${color} ${
                        isWinner ? 'opacity-100' : 'opacity-50'
                      }`}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>
                🌟 My skills:{' '}
                <strong className="text-foreground">
                  {result.mySkillsTriggered}
                </strong>
              </span>

              <span>
                ⚡ Their skills:{' '}
                <strong className="text-foreground">
                  {result.oppSkillsTriggered}
                </strong>
              </span>
            </div>

            <div className="rounded-xl border border-border bg-background/40 p-3 text-xs text-muted-foreground">
              {result.won ? (
                <p>
                  You earned{' '}
                  <span className="text-primary font-bold">
                    +{result.attackerPoints} arena points
                  </span>
                  .
                </p>
              ) : (
                <p>
                  Defender earned{' '}
                  <span className="text-blue-300 font-bold">
                    +{result.defenderPoints} arena points
                  </span>
                  .
                </p>
              )}
            </div>

            <Button onClick={onBack} variant="outline" className="w-full gap-2">
              <RotateCcw className="w-4 h-4" />
              Return to Arena
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}