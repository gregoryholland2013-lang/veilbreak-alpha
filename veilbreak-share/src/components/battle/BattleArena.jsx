import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Trophy, RotateCcw, Swords } from 'lucide-react';

export default function BattleArena({ battleState, battleLog, playerHP, enemyHP, result, opponentName, onReset }) {
  return (
    <div className="space-y-4">
      {/* HUD */}
      {battleState !== 'idle' && (
        <div className="space-y-3">
          <div className="bg-card rounded-xl border border-border p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-green-400 font-semibold">Your Team</span>
              <span>{playerHP}%</span>
            </div>
            <Progress value={playerHP} className="h-2" />
          </div>
          <div className="bg-card rounded-xl border border-destructive/30 p-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-red-400 font-semibold">{opponentName}'s Deck</span>
              <span>{enemyHP}%</span>
            </div>
            <Progress value={enemyHP} className="h-2 [&>div]:bg-destructive" />
          </div>
        </div>
      )}

      {/* Battle Log */}
      {battleLog.length > 0 && (
        <div className="bg-card rounded-xl border border-border p-3 max-h-44 overflow-y-auto space-y-1">
          <AnimatePresence>
            {battleLog.map((entry, i) => (
              <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`text-xs ${entry.type === 'player' ? 'text-green-400' : entry.type === 'enemy' ? 'text-red-400' : 'text-muted-foreground'}`}>
                {entry.text}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Result */}
      {battleState === 'result' && result && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          className={`rounded-xl border p-6 text-center space-y-3 ${result.won
            ? 'bg-gradient-to-br from-primary/10 to-primary/5 border-primary/30'
            : 'bg-gradient-to-br from-destructive/10 to-destructive/5 border-destructive/30'}`}>
          <Trophy className={`w-12 h-12 mx-auto ${result.won ? 'text-primary' : 'text-muted-foreground'}`} />
          <h2 className="font-display text-xl font-bold">{result.won ? 'Victory!' : 'Defeat'}</h2>
          <p className="text-sm text-muted-foreground">
            {result.won ? `You defeated ${opponentName}!` : `${opponentName} was too strong!`}
          </p>
          <div className="flex justify-center gap-4 text-sm">
            <span className="text-yellow-400">+{result.goldReward} Gold</span>
            <span className="text-blue-400">+{result.xpReward} XP</span>
          </div>
          <Button onClick={onReset} className="gap-2">
            <RotateCcw className="w-4 h-4" /> Find Another Opponent
          </Button>
        </motion.div>
      )}

      {battleState === 'fighting' && (
        <p className="text-center text-xs text-muted-foreground animate-pulse flex items-center justify-center gap-2">
          <Swords className="w-4 h-4" /> Battle in progress…
        </p>
      )}
    </div>
  );
}