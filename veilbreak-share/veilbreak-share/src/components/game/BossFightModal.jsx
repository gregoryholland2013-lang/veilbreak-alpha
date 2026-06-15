import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Swords, X } from 'lucide-react';

export default function BossFightModal({
  quest,
  profile,
  inventory,
  updateProfile,
  open,
  onClose,
  onResult,
}) {
  const [fighting, setFighting] = useState(false);

  if (!quest) return null;

  const fightBoss = async () => {
    if (!profile) {
      toast.error('Profile not loaded');
      return;
    }

    if ((profile.stamina || 0) < (quest.stamina_cost || 0)) {
      toast.error('Not enough stamina!');
      return;
    }

    setFighting(true);

    try {
      const won = Math.random() > 0.25;

      const goldGained = won
        ? Math.round(
            (quest.gold_reward_min || 0) +
              Math.random() *
                ((quest.gold_reward_max || 0) - (quest.gold_reward_min || 0))
          )
        : 0;

      const gemGained = won ? quest.gem_reward || 0 : 0;
      const xpGained = won ? quest.xp_reward || 25 : 10;

      const newXp = (profile.experience || 0) + xpGained;
      const xpForLevel = (profile.level || 1) * 100;
      const levelUp = newXp >= xpForLevel;

      await updateProfile.mutateAsync({
        id: profile.id,
        data: {
          gold: (profile.gold || 0) + goldGained,
          gems: (profile.gems || 0) + gemGained,
          stamina: Math.max(0, (profile.stamina || 0) - (quest.stamina_cost || 0)),
          experience: levelUp ? newXp - xpForLevel : newXp,
          level: levelUp ? (profile.level || 1) + 1 : profile.level || 1,
          quests_completed: won
            ? (profile.quests_completed || 0) + 1
            : profile.quests_completed || 0,
        },
      });

      if (levelUp) {
        toast.success('🎉 Level Up!');
      }

      onResult?.({
        won,
        goldGained,
        gemGained,
        xpGained,
        shardsGained: won ? quest.skill_shard_reward || 0 : 0,
        fodderGained: won ? quest.fodder_reward || 0 : 0,
        levelUp,
        questName: quest.name,
      });

      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Boss fight failed');
    } finally {
      setFighting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display">
            Boss Fight
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-4 text-center space-y-2">
            <p className="text-4xl">💀</p>

            <h2 className="font-display font-bold text-lg text-primary">
              {quest.name}
            </h2>

            <p className="text-xs text-muted-foreground">
              {quest.description || 'A dangerous enemy blocks your path.'}
            </p>

            <p className="text-xs text-muted-foreground">
              Costs {quest.stamina_cost || 0} stamina
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={fighting}
              className="flex-1 gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>

            <Button
              onClick={fightBoss}
              disabled={fighting}
              className="flex-1 gap-2"
            >
              <Swords className="w-4 h-4" />
              {fighting ? 'Fighting…' : 'Fight'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}