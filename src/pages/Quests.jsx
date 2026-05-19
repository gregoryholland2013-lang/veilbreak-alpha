import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { useProfile, useUpdateProfile } from '@/hooks/useGameData';
import QuestCard from '@/components/game/QuestCard';
import BossFightModal from '@/components/game/BossFightModal';
import QuestRewardModal from '@/components/game/QuestRewardModal';
import { Zap, ScrollText } from 'lucide-react';
import { toast } from 'sonner';

const QUEST_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return user;
}

export default function Quests() {
  const { data: profile } = useProfile();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [activeBossQuest, setActiveBossQuest] = useState(null);
  const [lastReward, setLastReward] = useState(null);

  /**
   * Supabase Realtime
   * Keeps quests, inventory, and profile reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('quests-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'quests',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['quests'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_inventory',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: getAuthUser,
  });

  const userId = authUser?.id || null;
  const myEmail = authUser?.email || null;

  const { data: quests = [] } = useQuery({
    queryKey: ['quests'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .order('quest_order', { ascending: true })
        .limit(100);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: inventory = null } = useQuery({
    queryKey: ['playerInventory', userId],
    enabled: !!userId,
    queryFn: async () => {
      /**
       * Try to find this user's inventory.
       */
      const { data: existing, error: fetchError } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (existing) {
        return existing;
      }

      /**
       * Create inventory if it does not exist.
       */
      const now = new Date().toISOString();

      const { data: created, error: createError } = await supabase
        .from('player_inventory')
        .insert({
          id: userId,
          email: myEmail,
          skill_shards: 0,
          fodder_cards: 0,
          quests_completed: 0,
          boss_quests_cleared: 0,
          aether_dust: 0,
          spirit_water: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) {
        throw createError;
      }

      return created;
    },
  });

  const sortedQuests = useMemo(() => {
    return [...quests].sort(
      (a, b) => (a.quest_order || 0) - (b.quest_order || 0)
    );
  }, [quests]);

  const doQuest = async (quest) => {
    if (!profile || (profile.stamina || 0) < quest.stamina_cost) {
      toast.error('Not enough stamina!');
      return;
    }

    /**
     * Boss quests get their own modal.
     */
    if (quest.is_boss) {
      setActiveBossQuest(quest);
      return;
    }

    try {
      const goldGained = Math.round(
        (quest.gold_reward_min || 0) +
          Math.random() *
            ((quest.gold_reward_max || 0) - (quest.gold_reward_min || 0))
      );

      const gemGained = quest.gem_reward || 0;
      const xpGained = quest.xp_reward || 20;
      const shardsGained = quest.skill_shard_reward || 0;
      const fodderGained = quest.fodder_reward || 0;

      const newXp = (profile.experience || 0) + xpGained;
      const xpForLevel = (profile.level || 1) * 100;
      const levelUp = newXp >= xpForLevel;

      /**
       * Update profile rewards.
       */
      await updateProfile.mutateAsync({
        id: profile.id,
        data: {
          gold: (profile.gold || 0) + goldGained,
          gems: (profile.gems || 0) + gemGained,
          stamina: Math.max(0, (profile.stamina || 0) - quest.stamina_cost),
          experience: levelUp ? newXp - xpForLevel : newXp,
          level: levelUp ? (profile.level || 1) + 1 : profile.level || 1,
          quests_completed: (profile.quests_completed || 0) + 1,
        },
      });

      /**
       * Update inventory rewards.
       */
      if (inventory && (shardsGained > 0 || fodderGained > 0)) {
        const { error: inventoryError } = await supabase
          .from('player_inventory')
          .update({
            skill_shards: (inventory.skill_shards || 0) + shardsGained,
            fodder_cards: (inventory.fodder_cards || 0) + fodderGained,
            quests_completed: (inventory.quests_completed || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq('id', inventory.id)
          .eq('user_id', userId);

        if (inventoryError) {
          throw inventoryError;
        }

        queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
      }

      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

      if (levelUp) {
        toast.success('🎉 Level Up!');
      }

      setLastReward({
        goldGained,
        gemGained,
        xpGained,
        shardsGained,
        fodderGained,
        levelUp,
        questName: quest.name,
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not complete quest');
    }
  };

  const handleBossResult = (result) => {
    setActiveBossQuest(null);

    if (result) {
      setLastReward(result);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      {/* Quest hero banner */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: '28vw', maxHeight: 180 }}
      >
        <img
          src={QUEST_BG}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/50 via-transparent to-background/50" />

        <div className="absolute inset-0 flex items-end pb-4 px-4">
          <div>
            <h1 className="font-display text-2xl font-black text-primary text-glow-gold tracking-wider drop-shadow-2xl">
              QUESTS
            </h1>
            <p className="text-[11px] text-foreground/60 tracking-widest uppercase">
              Adventures Await
            </p>
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {/* Inventory Bar */}
      {inventory && (
        <div className="flex gap-4 px-4 py-3 bg-card/40 border-b border-border/50 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="text-base">⚗️</span>
            <span className="text-muted-foreground">Skill Shards:</span>
            <span className="font-bold text-accent-foreground">
              {inventory.skill_shards || 0}
            </span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="text-base">🃏</span>
            <span className="text-muted-foreground">Fodder:</span>
            <span className="font-bold text-accent-foreground">
              {inventory.fodder_cards || 0}
            </span>
          </span>

          <span className="flex items-center gap-1.5 ml-auto">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="font-bold">{profile?.stamina ?? '—'}</span>
            <span className="text-muted-foreground">stamina</span>
          </span>
        </div>
      )}

      <div className="px-4 py-4 space-y-3">
        {sortedQuests.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg">No quests available</p>
            <p className="text-sm mt-1">
              Check back soon for new adventures!
            </p>
          </div>
        )}

        <AnimatePresence>
          {sortedQuests.map((quest, i) => (
            <motion.div
              key={quest.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <QuestCard
                quest={quest}
                profile={profile}
                onStart={() => doQuest(quest)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <BossFightModal
        quest={activeBossQuest}
        profile={profile}
        inventory={inventory}
        updateProfile={updateProfile}
        open={!!activeBossQuest}
        onClose={() => setActiveBossQuest(null)}
        onResult={handleBossResult}
      />

      <QuestRewardModal
        reward={lastReward}
        open={!!lastReward}
        onClose={() => setLastReward(null)}
      />
    </div>
  );
}