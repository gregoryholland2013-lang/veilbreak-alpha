import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, Shield, Gem, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const NODE_CHARACTER_MAP = {
  static_in_the_veil: {
    name: 'Lira',
    role: 'Ironveil Signalbearer',
    quote: 'That sound... it is not machine code. It is breathing.',
    cardSearch: 'lira',
  },
  the_broken_gate: {
    name: 'Kael',
    role: 'Ironveil Vanguard',
    quote: 'The gate remembers us. That does not mean it will open.',
    cardSearch: 'kael',
  },
  sentinel_ambush: {
    name: 'Vex',
    role: 'Ironveil Saboteur',
    quote: 'They are not guarding the path. They are herding us deeper.',
    cardSearch: 'vex',
  },
  split_signal: {
    name: 'Lira',
    role: 'Ironveil Signalbearer',
    quote: 'Two signals. One is human. One is calling my name.',
    cardSearch: 'lira',
  },
  hidden_cache: {
    name: 'Nyx',
    role: 'Ironveil Ghostline',
    quote: 'Old caches do not stay hidden by accident.',
    cardSearch: 'nyx',
  },
  null_sentinel: {
    name: 'Null Sentinel',
    role: 'Corrupted Ironveil Boss',
    quote: 'The armor is Ironveil. The heart is something else.',
    cardSearch: 'sentinel',
  },
};

const TYPE_CONFIG = {
  story: {
    title: 'Decode the Signal',
    instruction: 'Tap the signal pulses before they fade.',
    icon: ScrollText,
    emoji: '📜',
    targetLabel: 'Signal',
    requiredTaps: 4,
    timeLimit: 10,
    bonusPerTap: 0.01,
  },
  battle: {
    title: 'Strike the Weak Points',
    instruction: 'Tap unstable weak points to charge your opening attack.',
    icon: Target,
    emoji: '⚔️',
    targetLabel: 'Weak Point',
    requiredTaps: 6,
    timeLimit: 9,
    bonusPerTap: 0.015,
  },
  choice: {
    title: 'Choose Your Path',
    instruction: 'Make a choice to continue.',
    icon: ScrollText,
    emoji: '🧭',
    targetLabel: 'Choice',
    requiredTaps: 1,
    timeLimit: 10,
    bonusPerTap: 0,
  },
  treasure: {
    title: 'Unlock the Core Cache',
    instruction: 'Tap the glowing fragments to stabilize the cache.',
    icon: Gem,
    emoji: '💠',
    targetLabel: 'Core',
    requiredTaps: 5,
    timeLimit: 10,
    bonusPerTap: 0.01,
  },
  boss: {
    title: 'Break the Null Shield',
    instruction: 'Tap fast to crack the boss shield before combat starts.',
    icon: Shield,
    emoji: '👑',
    targetLabel: 'Shield Crack',
    requiredTaps: 10,
    timeLimit: 8,
    bonusPerTap: 0.018,
  },
};

function randomPosition() {
  return {
    x: 14 + Math.random() * 72,
    y: 22 + Math.random() * 52,
  };
}

function findCharacterCard(cards = [], character) {
  if (!character?.cardSearch) return null;

  const search = character.cardSearch.toLowerCase();

  return (
    cards.find((card) =>
      String(card.name || '').toLowerCase().includes(search)
    ) ||
    cards.find((card) =>
      String(card.full_card_name || '').toLowerCase().includes(search)
    ) ||
    null
  );
}

export default function ExpeditionActionModal({
  node,
  open,
  cards = [],
  onComplete,
  onClose,
}) {
  const config = useMemo(() => {
    return TYPE_CONFIG[node?.node_type] || TYPE_CONFIG.story;
  }, [node]);

  const character = useMemo(() => {
    return NODE_CHARACTER_MAP[node?.node_key] || null;
  }, [node]);

  const characterCard = useMemo(() => {
    return findCharacterCard(cards, character);
  }, [cards, character]);

  const artworkUrl = characterCard?.image_url || characterCard?.artwork_url || null;

  const Icon = config.icon;

  const [taps, setTaps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(config.timeLimit);
  const [targetPosition, setTargetPosition] = useState(randomPosition());
  const [finished, setFinished] = useState(false);

  const progressPercent = Math.min(100, (taps / config.requiredTaps) * 100);
  const timePercent = Math.max(0, (timeLeft / config.timeLimit) * 100);

  useEffect(() => {
    if (!open || !node) return;

    setTaps(0);
    setTimeLeft(config.timeLimit);
    setTargetPosition(randomPosition());
    setFinished(false);
  }, [open, node, config.timeLimit]);

  useEffect(() => {
    if (!open || finished) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          finishAction(false);
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, finished]);

  const finishAction = (hitRequirement) => {
    if (finished) return;

    setFinished(true);

    const finalTaps = hitRequirement ? config.requiredTaps : taps;
    const completionRatio = Math.min(1, finalTaps / config.requiredTaps);
    const bonus = Number((finalTaps * config.bonusPerTap).toFixed(3));

    setTimeout(() => {
      onComplete?.({
        success: hitRequirement,
        taps: finalTaps,
        requiredTaps: config.requiredTaps,
        completionRatio,
        bonus,
        label: config.title,
        characterName: character?.name,
      });
    }, 450);
  };

  const handleTapTarget = () => {
    if (finished) return;

    setTaps((prev) => {
      const next = prev + 1;

      if (next >= config.requiredTaps) {
        finishAction(true);
      } else {
        setTargetPosition(randomPosition());
      }

      return next;
    });
  };

  if (!open || !node) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-primary/40 bg-card shadow-2xl overflow-hidden"
      >
        <div className="relative p-4 border-b border-border bg-gradient-to-r from-primary/10 via-card to-card overflow-hidden">
          {artworkUrl && (
            <img
              src={artworkUrl}
              alt={character?.name || node.title}
              className="absolute right-0 top-0 h-full w-32 object-cover object-top opacity-25 pointer-events-none"
            />
          )}

          <div className="absolute inset-0 bg-gradient-to-r from-card via-card/90 to-card/20 pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="relative z-10 flex items-center gap-3 pr-9">
            <div className="w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center overflow-hidden">
              {artworkUrl ? (
                <img
                  src={artworkUrl}
                  alt={character?.name || node.title}
                  className="w-full h-full object-cover object-top"
                />
              ) : (
                <Icon className="w-5 h-5 text-primary" />
              )}
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {node.title}
              </p>
              <h2 className="font-display text-lg font-black text-primary">
                {config.title}
              </h2>
            </div>
          </div>

          <p className="relative z-10 text-xs text-muted-foreground mt-3 leading-relaxed">
            {config.instruction}
          </p>

          {character && (
            <div className="relative z-10 mt-3 rounded-xl border border-primary/20 bg-black/25 px-3 py-2">
              <p className="text-[10px] text-primary font-bold">
                {character.name}
                <span className="text-muted-foreground font-normal">
                  {' '}· {character.role}
                </span>
              </p>
              <p className="text-[10px] text-foreground/80 italic mt-0.5">
                “{character.quote}”
              </p>
            </div>
          )}
        </div>

        <div className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Action Charge</span>
            <span className="font-bold text-primary">
              {taps}/{config.requiredTaps}
            </span>
          </div>

          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary"
              animate={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Time Remaining</span>
            <span className="font-bold text-foreground">{timeLeft}s</span>
          </div>

          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-green-400"
              animate={{ width: `${timePercent}%` }}
            />
          </div>

          <div className="relative h-72 rounded-2xl border border-border bg-background overflow-hidden">
            {artworkUrl && (
              <>
                <img
                  src={artworkUrl}
                  alt={character?.name || node.title}
                  className="absolute inset-0 w-full h-full object-cover object-top opacity-35 pointer-events-none"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/35 pointer-events-none" />
                <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/40 pointer-events-none" />
              </>
            )}

            {!artworkUrl && (
              <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_60%)]" />
            )}

            <div className="absolute inset-0">
              {Array.from({ length: 14 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1.5 h-1.5 rounded-full bg-primary/60"
                  style={{
                    left: `${8 + ((i * 17) % 84)}%`,
                    top: `${12 + ((i * 23) % 74)}%`,
                  }}
                  animate={{
                    opacity: [0.15, 0.9, 0.15],
                    scale: [1, 1.9, 1],
                  }}
                  transition={{
                    duration: 1.8 + (i % 3) * 0.4,
                    repeat: Infinity,
                    delay: i * 0.12,
                  }}
                />
              ))}
            </div>

            <AnimatePresence mode="wait">
              {!finished && (
                <motion.button
                  key={`${targetPosition.x}-${targetPosition.y}-${taps}`}
                  type="button"
                  onClick={handleTapTarget}
                  initial={{ scale: 0.3, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 1.8, opacity: 0 }}
                  whileTap={{ scale: 0.82 }}
                  className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
                  style={{
                    left: `${targetPosition.x}%`,
                    top: `${targetPosition.y}%`,
                  }}
                >
                  <div className="relative w-20 h-20 flex items-center justify-center">
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-primary"
                      animate={{
                        scale: [1, 1.35, 1],
                        opacity: [0.8, 0.2, 0.8],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                      }}
                    />

                    <motion.div
                      className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center text-2xl border border-white/20 overflow-hidden"
                      animate={{
                        boxShadow: [
                          '0 0 10px rgba(255,255,255,0.2)',
                          '0 0 24px rgba(255,255,255,0.45)',
                          '0 0 10px rgba(255,255,255,0.2)',
                        ],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                      }}
                    >
                      {artworkUrl ? (
                        <img
                          src={artworkUrl}
                          alt={character?.name || config.targetLabel}
                          className="w-full h-full object-cover object-top"
                        />
                      ) : (
                        config.emoji
                      )}
                    </motion.div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {finished && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-30 bg-black/55 flex items-center justify-center"
              >
                <div className="text-center">
                  <Zap className="w-10 h-10 text-primary mx-auto mb-2" />
                  <p className="font-display text-lg font-black text-primary">
                    Action Locked
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Resolving expedition...
                  </p>
                </div>
              </motion.div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
            Better action charge gives battle and boss nodes a small win-chance bonus.
          </div>

          <Button
            variant="ghost"
            onClick={() => finishAction(false)}
            disabled={finished}
            className="w-full"
          >
            Skip Action
          </Button>
        </div>
      </motion.div>
    </div>
  );
}