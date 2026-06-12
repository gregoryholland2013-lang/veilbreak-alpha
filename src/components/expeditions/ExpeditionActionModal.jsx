import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Target, Shield, Gem, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    x: 12 + Math.random() * 76,
    y: 18 + Math.random() * 58,
  };
}

export default function ExpeditionActionModal({
  node,
  open,
  onComplete,
  onClose,
}) {
  const config = useMemo(() => {
    return TYPE_CONFIG[node?.node_type] || TYPE_CONFIG.story;
  }, [node]);

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
        <div className="relative p-4 border-b border-border bg-gradient-to-r from-primary/10 via-card to-card">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-3 pr-9">
            <div className="w-11 h-11 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
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

          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            {config.instruction}
          </p>
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

          <div className="relative h-64 rounded-2xl border border-border bg-background overflow-hidden">
            <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_60%)]" />

            <div className="absolute inset-0">
              {Array.from({ length: 12 }).map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-1 h-1 rounded-full bg-primary/40"
                  style={{
                    left: `${8 + ((i * 17) % 84)}%`,
                    top: `${12 + ((i * 23) % 74)}%`,
                  }}
                  animate={{
                    opacity: [0.15, 0.8, 0.15],
                    scale: [1, 1.8, 1],
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
                  className="absolute -translate-x-1/2 -translate-y-1/2"
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
                      className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center text-2xl border border-white/20"
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
                      {config.emoji}
                    </motion.div>
                  </div>
                </motion.button>
              )}
            </AnimatePresence>

            {finished && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/50 flex items-center justify-center"
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
            Better action charge gives battle nodes a small win-chance bonus.
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