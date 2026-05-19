import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coins, Gem, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuestRewardModal({ reward, open, onClose }) {
  if (!reward) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-xs text-center">
        <DialogHeader>
          <DialogTitle className="font-display text-primary text-xl">
            {reward.levelUp ? '🎉 Level Up!' : '⚔️ Quest Complete!'}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground -mt-1">{reward.questName}</p>

        <div className="flex flex-col gap-2 my-2">
          {reward.goldGained > 0 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.05 }}
              className="flex items-center justify-center gap-2 bg-yellow-500/10 rounded-lg px-4 py-2">
              <Coins className="w-5 h-5 text-yellow-400" />
              <span className="font-display font-bold text-lg text-yellow-300">+{reward.goldGained} Gold</span>
            </motion.div>
          )}
          {reward.gemGained > 0 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 bg-blue-500/10 rounded-lg px-4 py-2">
              <Gem className="w-5 h-5 text-blue-400" />
              <span className="font-display font-bold text-lg text-blue-300">+{reward.gemGained} Gems</span>
            </motion.div>
          )}
          {reward.shardsGained > 0 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }}
              className="flex items-center justify-center gap-2 bg-purple-500/10 rounded-lg px-4 py-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <span className="font-display font-bold text-lg text-purple-300">+{reward.shardsGained} Skill Shards</span>
            </motion.div>
          )}
          {reward.fodderGained > 0 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              className="flex items-center justify-center gap-2 bg-orange-500/10 rounded-lg px-4 py-2">
              <span className="text-xl">🃏</span>
              <span className="font-display font-bold text-lg text-orange-300">+{reward.fodderGained} Fodder Cards</span>
            </motion.div>
          )}
          {reward.xpGained > 0 && (
            <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.25 }}
              className="flex items-center justify-center gap-2 bg-cyan-500/10 rounded-lg px-4 py-2">
              <span className="text-xl">✨</span>
              <span className="font-display font-bold text-lg text-cyan-300">+{reward.xpGained} XP</span>
            </motion.div>
          )}
        </div>

        <Button onClick={onClose} className="w-full mt-1">Continue</Button>
      </DialogContent>
    </Dialog>
  );
}