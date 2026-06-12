import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Gem,
  Lock,
  Map,
  ScrollText,
  Shield,
  Sparkles,
  Sword,
  Trophy,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import {
  useCards,
  usePlayerCards,
  useProfile,
  useUpdateProfile,
} from '@/hooks/useGameData';
import { Button } from '@/components/ui/button';

const QUEST_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

const NODE_TYPE_META = {
  story: {
    icon: '📜',
    label: 'Story',
    border: 'border-blue-400/40',
    bg: 'bg-blue-500/10',
  },
  battle: {
    icon: '⚔️',
    label: 'Battle',
    border: 'border-red-400/40',
    bg: 'bg-red-500/10',
  },
  choice: {
    icon: '🧭',
    label: 'Choice',
    border: 'border-purple-400/40',
    bg: 'bg-purple-500/10',
  },
  treasure: {
    icon: '💠',
    label: 'Treasure',
    border: 'border-cyan-400/40',
    bg: 'bg-cyan-500/10',
  },
  boss: {
    icon: '👑',
    label: 'Boss',
    border: 'border-primary/60',
    bg: 'bg-primary/10',
  },
};

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
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

function randomBetween(min, max) {
  const safeMin = Number(min || 0);
  const safeMax = Number(max ?? safeMin);

  if (safeMax <= safeMin) return safeMin;

  return Math.round(safeMin + Math.random() * (safeMax - safeMin));
}

function rollRewards(rewardData = {}) {
  return {
    xpGained: Number(rewardData.xp || 0),
    goldGained: randomBetween(
      rewardData.gold_min || rewardData.gold || 0,
      rewardData.gold_max || rewardData.gold || 0
    ),
    gemGained: Number(rewardData.gems || 0),
    shardsGained: Number(rewardData.skill_shards || 0),
    fodderGained: Number(rewardData.fodder_cards || 0),
    ironveilCoreFragmentsGained: randomBetween(
      rewardData.ironveil_core_fragments_min ||
        rewardData.ironveil_core_fragments ||
        0,
      rewardData.ironveil_core_fragments_max ||
        rewardData.ironveil_core_fragments ||
        0
    ),
    ironveilReputationGained: Number(rewardData.ironveil_reputation || 0),
    ironveilSummonShardsGained: Number(rewardData.ironveil_summon_shards || 0),
  };
}

function getEnemyPower(enemyData = {}) {
  return (
    Number(enemyData.attack || 0) +
    Number(enemyData.defense || 0) +
    Number(enemyData.hp || 0)
  );
}

function ResultModal({ result, onClose }) {
  if (!result) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-primary/40 bg-card p-5 shadow-2xl"
      >
        <div className="text-center space-y-2">
          <div className="text-4xl">
            {result.victory === false ? '💀' : '✨'}
          </div>

          <h2 className="font-display text-xl font-black text-primary">
            {result.title}
          </h2>

          <p className="text-xs text-muted-foreground">
            {result.message}
          </p>
        </div>

        {result.enemyName && (
          <div className="mt-4 rounded-xl bg-muted/40 border border-border p-3">
            <p className="text-xs font-bold text-muted-foreground uppercase">
              Encounter
            </p>
            <p className="font-display text-sm text-foreground mt-1">
              {result.enemyName}
            </p>
            <div className="grid grid-cols-3 gap-2 mt-2 text-center text-xs">
              <div className="rounded-lg bg-background/60 p-2">
                <Sword className="w-3 h-3 text-red-400 mx-auto mb-1" />
                <p>{result.enemyAttack}</p>
              </div>
              <div className="rounded-lg bg-background/60 p-2">
                <Shield className="w-3 h-3 text-blue-400 mx-auto mb-1" />
                <p>{result.enemyDefense}</p>
              </div>
              <div className="rounded-lg bg-background/60 p-2">
                <Zap className="w-3 h-3 text-green-400 mx-auto mb-1" />
                <p>{result.enemyHp}</p>
              </div>
            </div>
          </div>
        )}

        {result.victory !== false && (
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
            {result.xpGained > 0 && (
              <div className="rounded-lg bg-muted/40 p-2">
                <span className="text-muted-foreground">XP</span>
                <p className="font-bold text-primary">+{result.xpGained}</p>
              </div>
            )}

            {result.goldGained > 0 && (
              <div className="rounded-lg bg-muted/40 p-2">
                <span className="text-muted-foreground">Gold</span>
                <p className="font-bold text-yellow-300">
                  +{result.goldGained}
                </p>
              </div>
            )}

            {result.ironveilCoreFragmentsGained > 0 && (
              <div className="rounded-lg bg-muted/40 p-2">
                <span className="text-muted-foreground">Core Fragments</span>
                <p className="font-bold text-cyan-300">
                  +{result.ironveilCoreFragmentsGained}
                </p>
              </div>
            )}

            {result.ironveilReputationGained > 0 && (
              <div className="rounded-lg bg-muted/40 p-2">
                <span className="text-muted-foreground">Ironveil Rep</span>
                <p className="font-bold text-blue-300">
                  +{result.ironveilReputationGained}
                </p>
              </div>
            )}

            {result.ironveilSummonShardsGained > 0 && (
              <div className="rounded-lg bg-muted/40 p-2">
                <span className="text-muted-foreground">Summon Shard</span>
                <p className="font-bold text-purple-300">
                  +{result.ironveilSummonShardsGained}
                </p>
              </div>
            )}
          </div>
        )}

        {result.levelUp && (
          <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3 text-center text-sm font-bold text-primary">
            🎉 Level Up!
          </div>
        )}

        <Button onClick={onClose} className="w-full mt-5">
          Continue
        </Button>
      </motion.div>
    </div>
  );
}

function ChoiceModal({ node, onChoose, onClose, disabled }) {
  if (!node) return null;

  const options = node.choice_data?.options || [];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-sm rounded-2xl border border-purple-400/40 bg-card p-5 shadow-2xl"
      >
        <div className="space-y-2">
          <p className="text-xs font-bold text-purple-300 uppercase tracking-wider">
            Choice Node
          </p>

          <h2 className="font-display text-xl font-black text-primary">
            {node.title}
          </h2>

          <p className="text-sm text-muted-foreground leading-relaxed">
            {node.story_text}
          </p>
        </div>

        <div className="space-y-2 mt-5">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              disabled={disabled}
              onClick={() => onChoose(option)}
              className="w-full rounded-xl border border-border bg-muted/30 p-3 text-left hover:border-primary/50 hover:bg-primary/10 transition-all"
            >
              <p className="font-bold text-sm text-foreground">
                {option.label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {option.description}
              </p>
            </button>
          ))}
        </div>

        <Button
          variant="ghost"
          onClick={onClose}
          disabled={disabled}
          className="w-full mt-4"
        >
          Cancel
        </Button>
      </motion.div>
    </div>
  );
}

export default function Quests() {
  const { data: profile } = useProfile();
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const updateProfile = useUpdateProfile();
  const queryClient = useQueryClient();

  const [selectedChapterId, setSelectedChapterId] = useState(null);
  const [activeChoiceNode, setActiveChoiceNode] = useState(null);
  const [lastResult, setLastResult] = useState(null);
  const [processingNodeId, setProcessingNodeId] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('expeditions-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expedition_chapters',
        },
        () => queryClient.invalidateQueries({ queryKey: ['expeditionChapters'] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'expedition_nodes',
        },
        () => queryClient.invalidateQueries({ queryKey: ['expeditionNodes'] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_expedition_progress',
        },
        () =>
          queryClient.invalidateQueries({
            queryKey: ['playerExpeditionProgress'],
          })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_inventory',
        },
        () => queryClient.invalidateQueries({ queryKey: ['playerInventory'] })
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => queryClient.invalidateQueries({ queryKey: ['playerProfile'] })
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: async () => getAuthUser(),
  });

  const userId = authUser?.id || null;
  const myEmail = authUser?.email || null;

  const { data: chapters = [] } = useQuery({
    queryKey: ['expeditionChapters'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expedition_chapters')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: nodes = [] } = useQuery({
    queryKey: ['expeditionNodes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expedition_nodes')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: progress = [] } = useQuery({
    queryKey: ['playerExpeditionProgress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_expedition_progress')
        .select('*')
        .eq('player_id', userId);

      if (error) throw error;

      return data || [];
    },
  });

  const { data: choices = [] } = useQuery({
    queryKey: ['playerExpeditionChoices', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_expedition_choices')
        .select('*')
        .eq('player_id', userId);

      if (error) throw error;

      return data || [];
    },
  });

  const { data: inventory = null } = useQuery({
    queryKey: ['playerInventory', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data: existing, error: fetchError } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existing) return existing;

      const now = new Date().toISOString();

      const { data: created, error: createError } = await supabase
        .from('player_inventory')
        .insert({
          id: userId,
          user_id: userId,
          email: myEmail,
          skill_shards: 0,
          fodder_cards: 0,
          quests_completed: 0,
          boss_quests_cleared: 0,
          aether_dust: 0,
          spirit_water: 0,
          ironveil_core_fragments: 0,
          ironveil_reputation: 0,
          ironveil_summon_shards: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (createError) throw createError;

      return created;
    },
  });

  useEffect(() => {
    if (!selectedChapterId && chapters.length > 0) {
      setSelectedChapterId(chapters[0].id);
    }
  }, [chapters, selectedChapterId]);

  const selectedChapter = useMemo(() => {
    return chapters.find((chapter) => chapter.id === selectedChapterId) || null;
  }, [chapters, selectedChapterId]);

  const chapterNodes = useMemo(() => {
    if (!selectedChapter) return [];

    return nodes
      .filter((node) => node.chapter_id === selectedChapter.id)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }, [nodes, selectedChapter]);

  const completedNodeKeys = useMemo(() => {
    const completedIds = new Set(
      progress
        .filter((item) => item.status === 'completed')
        .map((item) => item.node_id)
    );

    return new Set(
      chapterNodes
        .filter((node) => completedIds.has(node.id))
        .map((node) => node.node_key)
    );
  }, [progress, chapterNodes]);

  const selectedChoice = useMemo(() => {
    if (!selectedChapter) return null;

    return choices.find((choice) => choice.chapter_id === selectedChapter.id) || null;
  }, [choices, selectedChapter]);

  const ownedDeckPower = useMemo(() => {
    const joined = playerCards
      .map((playerCard) => {
        const card = cards.find((item) => item.id === playerCard.card_id);
        if (!card) return null;

        const attack = getCurrentStat(playerCard, card, 'attack');
        const defense = getCurrentStat(playerCard, card, 'defense');
        const hp = getCurrentStat(playerCard, card, 'hp');

        return {
          playerCard,
          card,
          attack,
          defense,
          hp,
          total: attack + defense + hp,
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    return {
      cards: joined,
      attack: joined.reduce((sum, item) => sum + item.attack, 0),
      defense: joined.reduce((sum, item) => sum + item.defense, 0),
      hp: joined.reduce((sum, item) => sum + item.hp, 0),
      total: joined.reduce((sum, item) => sum + item.total, 0),
    };
  }, [cards, playerCards]);

  const isNodeCompleted = (node) => {
    return completedNodeKeys.has(node.node_key);
  };

  const isNodeUnlocked = (node) => {
    if (!node.required_node_key) return true;

    return completedNodeKeys.has(node.required_node_key);
  };

  const applyProfileAndInventoryRewards = async ({
    node,
    rolledRewards,
    staminaCost,
    completed,
    bossCleared,
  }) => {
    const currentXp = profile?.experience || 0;
    const currentLevel = profile?.level || 1;
    let nextXp = currentXp + (rolledRewards.xpGained || 0);
    let nextLevel = currentLevel;
    let levelUp = false;

    while (nextXp >= nextLevel * 100) {
      nextXp -= nextLevel * 100;
      nextLevel += 1;
      levelUp = true;
    }

    await updateProfile.mutateAsync({
      id: profile.id,
      data: {
        gold: (profile.gold || 0) + (rolledRewards.goldGained || 0),
        gems: (profile.gems || 0) + (rolledRewards.gemGained || 0),
        stamina: Math.max(0, (profile.stamina || 0) - staminaCost),
        experience: nextXp,
        level: nextLevel,
        quests_completed:
          (profile.quests_completed || 0) + (completed ? 1 : 0),
      },
    });

    if (inventory && completed) {
      const { error: inventoryError } = await supabase
        .from('player_inventory')
        .update({
          skill_shards:
            (inventory.skill_shards || 0) + (rolledRewards.shardsGained || 0),
          fodder_cards:
            (inventory.fodder_cards || 0) + (rolledRewards.fodderGained || 0),
          quests_completed: (inventory.quests_completed || 0) + 1,
          boss_quests_cleared:
            (inventory.boss_quests_cleared || 0) + (bossCleared ? 1 : 0),
          ironveil_core_fragments:
            (inventory.ironveil_core_fragments || 0) +
            (rolledRewards.ironveilCoreFragmentsGained || 0),
          ironveil_reputation:
            (inventory.ironveil_reputation || 0) +
            (rolledRewards.ironveilReputationGained || 0),
          ironveil_summon_shards:
            (inventory.ironveil_summon_shards || 0) +
            (rolledRewards.ironveilSummonShardsGained || 0),
          updated_at: new Date().toISOString(),
        })
        .eq('id', inventory.id)
        .eq('user_id', userId);

      if (inventoryError) throw inventoryError;
    }

    if (completed) {
      const existing = progress.find((item) => item.node_id === node.id);
      const now = new Date().toISOString();

      const { error: progressError } = await supabase
        .from('player_expedition_progress')
        .upsert(
          {
            player_id: userId,
            chapter_id: node.chapter_id,
            node_id: node.id,
            status: 'completed',
            attempts: (existing?.attempts || 0) + 1,
            wins: (existing?.wins || 0) + 1,
            completed_at: existing?.completed_at || now,
            updated_at: now,
          },
          {
            onConflict: 'player_id,node_id',
          }
        );

      if (progressError) throw progressError;

      const { error: logError } = await supabase
        .from('expedition_rewards_log')
        .insert({
          player_id: userId,
          chapter_id: node.chapter_id,
          node_id: node.id,
          reward_data: rolledRewards,
        });

      if (logError) throw logError;
    }

    queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
    queryClient.invalidateQueries({ queryKey: ['playerExpeditionProgress'] });

    return levelUp;
  };

  const resolveNode = async (node) => {
    if (!profile || !userId) {
      toast.error('Profile is still loading');
      return;
    }

    if (!isNodeUnlocked(node)) {
      toast.error('This expedition node is locked');
      return;
    }

    if ((profile.stamina || 0) < (node.stamina_cost || 0)) {
      toast.error('Not enough stamina');
      return;
    }

    if (
      (node.node_type === 'battle' || node.node_type === 'boss') &&
      ownedDeckPower.cards.length === 0
    ) {
      toast.error('You need cards before entering battle nodes');
      return;
    }

    if (node.node_type === 'choice') {
      setActiveChoiceNode(node);
      return;
    }

    setProcessingNodeId(node.id);

    try {
      const staminaCost = node.stamina_cost || 0;
      const enemyData = node.enemy_data || {};
      let victory = true;
      let message = node.story_text || 'Expedition complete.';

      if (node.node_type === 'battle' || node.node_type === 'boss') {
        let enemyPower = getEnemyPower(enemyData);

        if (
          node.node_type === 'boss' &&
          selectedChoice?.choice_key === 'save_engineer'
        ) {
          enemyPower = Math.round(enemyPower * 0.86);
        }

        if (
          node.node_type === 'boss' &&
          selectedChoice?.choice_key === 'chase_signal'
        ) {
          enemyPower = Math.round(enemyPower * 1.12);
        }

        const winChance = Math.max(
          0.25,
          Math.min(0.9, ownedDeckPower.total / (ownedDeckPower.total + enemyPower) + 0.08)
        );

        victory = Math.random() <= winChance;

        message = victory
          ? `Your deck overwhelmed ${enemyData.name || 'the enemy'} with a ${Math.round(
              winChance * 100
            )}% win chance.`
          : `${enemyData.name || 'The enemy'} pushed your deck back. Strengthen your cards and try again.`;
      }

      if (!victory) {
        await updateProfile.mutateAsync({
          id: profile.id,
          data: {
            stamina: Math.max(0, (profile.stamina || 0) - staminaCost),
          },
        });

        queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

        setLastResult({
          title: 'Expedition Failed',
          message,
          victory: false,
          enemyName: enemyData.name,
          enemyAttack: enemyData.attack,
          enemyDefense: enemyData.defense,
          enemyHp: enemyData.hp,
        });

        return;
      }

      const rolledRewards = rollRewards(node.reward_data || {});

      const levelUp = await applyProfileAndInventoryRewards({
        node,
        rolledRewards,
        staminaCost,
        completed: true,
        bossCleared: node.node_type === 'boss',
      });

      setLastResult({
        title:
          node.node_type === 'boss'
            ? 'Boss Defeated'
            : node.node_type === 'treasure'
              ? 'Cache Recovered'
              : 'Expedition Complete',
        message,
        victory: true,
        levelUp,
        questName: node.title,
        enemyName: enemyData.name,
        enemyAttack: enemyData.attack,
        enemyDefense: enemyData.defense,
        enemyHp: enemyData.hp,
        ...rolledRewards,
      });

      if (levelUp) {
        toast.success('🎉 Level Up!');
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not complete expedition node');
    } finally {
      setProcessingNodeId(null);
    }
  };

  const resolveChoice = async (option) => {
    const node = activeChoiceNode;

    if (!node || !profile || !userId) return;

    if ((profile.stamina || 0) < (node.stamina_cost || 0)) {
      toast.error('Not enough stamina');
      return;
    }

    setProcessingNodeId(node.id);

    try {
      const baseRewards = rollRewards(node.reward_data || {});
      const optionRewards = rollRewards(option.reward_data || {});

      const rolledRewards = {
        xpGained: baseRewards.xpGained + optionRewards.xpGained,
        goldGained: baseRewards.goldGained + optionRewards.goldGained,
        gemGained: baseRewards.gemGained + optionRewards.gemGained,
        shardsGained: baseRewards.shardsGained + optionRewards.shardsGained,
        fodderGained: baseRewards.fodderGained + optionRewards.fodderGained,
        ironveilCoreFragmentsGained:
          baseRewards.ironveilCoreFragmentsGained +
          optionRewards.ironveilCoreFragmentsGained,
        ironveilReputationGained:
          baseRewards.ironveilReputationGained +
          optionRewards.ironveilReputationGained,
        ironveilSummonShardsGained:
          baseRewards.ironveilSummonShardsGained +
          optionRewards.ironveilSummonShardsGained,
      };

      const levelUp = await applyProfileAndInventoryRewards({
        node,
        rolledRewards,
        staminaCost: node.stamina_cost || 0,
        completed: true,
        bossCleared: false,
      });

      const { error: choiceError } = await supabase
        .from('player_expedition_choices')
        .upsert(
          {
            player_id: userId,
            chapter_id: node.chapter_id,
            node_id: node.id,
            choice_key: option.key,
            choice_label: option.label,
            choice_result: option,
          },
          {
            onConflict: 'player_id,node_id',
          }
        );

      if (choiceError) throw choiceError;

      queryClient.invalidateQueries({ queryKey: ['playerExpeditionChoices'] });

      setActiveChoiceNode(null);

      setLastResult({
        title: 'Choice Made',
        message: option.result_text || option.description || 'Your path has changed.',
        victory: true,
        levelUp,
        questName: node.title,
        ...rolledRewards,
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not resolve choice');
    } finally {
      setProcessingNodeId(null);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
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
              VEIL EXPEDITIONS
            </h1>
            <p className="text-[11px] text-foreground/60 tracking-widest uppercase">
              Ironveil Chapter 1
            </p>
          </div>
        </div>

        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {inventory && (
        <div className="grid grid-cols-3 gap-2 px-4 py-3 bg-card/40 border-b border-border/50 text-xs">
          <span className="flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-green-400" />
            <span className="font-bold">{profile?.stamina ?? '—'}</span>
            <span className="text-muted-foreground">STA</span>
          </span>

          <span className="flex items-center gap-1.5">
            <span className="text-base">💠</span>
            <span className="font-bold text-cyan-300">
              {inventory.ironveil_core_fragments || 0}
            </span>
            <span className="text-muted-foreground">Core</span>
          </span>

          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-300" />
            <span className="font-bold text-purple-300">
              {inventory.ironveil_summon_shards || 0}
            </span>
            <span className="text-muted-foreground">Shard</span>
          </span>
        </div>
      )}

      <div className="px-4 py-4 space-y-4">
        {chapters.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <ScrollText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-display text-lg">No expeditions available</p>
            <p className="text-sm mt-1">
              Run the Ironveil Chapter 1 SQL seed first.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Chapters
              </p>

              {chapters.map((chapter) => {
                const active = chapter.id === selectedChapterId;

                return (
                  <button
                    key={chapter.id}
                    type="button"
                    onClick={() => setSelectedChapterId(chapter.id)}
                    className={`w-full rounded-2xl border p-4 text-left transition-all ${
                      active
                        ? 'border-primary bg-primary/10'
                        : 'border-border bg-card hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                        <Map className="w-5 h-5 text-primary" />
                      </div>

                      <div className="flex-1">
                        <p className="font-display font-black text-primary">
                          {chapter.title}
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          {chapter.description}
                        </p>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[10px] rounded-full bg-muted px-2 py-0.5 uppercase">
                            {chapter.faction}
                          </span>
                          <span className="text-[10px] rounded-full bg-muted px-2 py-0.5">
                            Chapter {chapter.chapter_number}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-black text-primary">
                    Expedition Map
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Complete nodes to unlock the path beneath Ironveil.
                  </p>
                </div>

                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Deck Power</p>
                  <p className="font-display font-black text-primary">
                    {ownedDeckPower.total}
                  </p>
                </div>
              </div>

              {selectedChoice && (
                <div className="mt-3 rounded-xl border border-purple-400/30 bg-purple-500/10 p-3 text-xs">
                  <p className="font-bold text-purple-300">Path Chosen</p>
                  <p className="text-muted-foreground mt-1">
                    {selectedChoice.choice_label}
                  </p>
                </div>
              )}

              <div className="relative mt-4 space-y-3">
                <AnimatePresence>
                  {chapterNodes.map((node, index) => {
                    const completed = isNodeCompleted(node);
                    const unlocked = isNodeUnlocked(node);
                    const meta = NODE_TYPE_META[node.node_type] || NODE_TYPE_META.story;
                    const enemyPower = getEnemyPower(node.enemy_data || {});
                    const processing = processingNodeId === node.id;

                    return (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className={`relative rounded-2xl border p-3 ${
                          unlocked
                            ? `${meta.border} ${meta.bg}`
                            : 'border-border bg-muted/20 opacity-70'
                        }`}
                      >
                        {index > 0 && (
                          <div className="absolute -top-3 left-8 h-3 w-0.5 bg-border" />
                        )}

                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-background/70 flex items-center justify-center text-2xl border border-border">
                            {unlocked ? meta.icon : <Lock className="w-5 h-5 text-muted-foreground" />}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-bold text-sm truncate">
                                {node.title}
                              </p>

                              {completed && (
                                <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0" />
                              )}
                            </div>

                            <p className="text-[10px] text-muted-foreground">
                              {meta.label} · {node.stamina_cost} stamina
                              {enemyPower > 0 ? ` · Enemy Power ${enemyPower}` : ''}
                            </p>

                            <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">
                              {node.story_text}
                            </p>
                          </div>

                          <Button
                            size="sm"
                            disabled={!unlocked || processing}
                            onClick={() => resolveNode(node)}
                            className="gap-1"
                          >
                            {processing ? (
                              '...'
                            ) : completed ? (
                              'Replay'
                            ) : (
                              <>
                                Start
                                <ChevronRight className="w-3 h-3" />
                              </>
                            )}
                          </Button>
                        </div>

                        {node.node_type === 'boss' && (
                          <div className="mt-3 rounded-xl border border-primary/30 bg-background/50 p-3 grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <Sword className="w-3.5 h-3.5 text-red-400 mx-auto mb-1" />
                              <p>{node.enemy_data?.attack || 0}</p>
                            </div>
                            <div>
                              <Shield className="w-3.5 h-3.5 text-blue-400 mx-auto mb-1" />
                              <p>{node.enemy_data?.defense || 0}</p>
                            </div>
                            <div>
                              <Trophy className="w-3.5 h-3.5 text-primary mx-auto mb-1" />
                              <p>{node.enemy_data?.hp || 0}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>

            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-start gap-2">
                <Gem className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-bold text-primary">
                    Veil Expeditions v1
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    This first chapter uses story, battle, choice, treasure, and boss nodes. Later we can branch this into faction routes, hidden card dialogue, raids, and 3D-style exploration.
                  </p>
                </div>
              </div>
            </div>

            {ownedDeckPower.cards.length === 0 && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 flex gap-2 text-xs text-muted-foreground">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0" />
                <span>
                  You need cards to clear battle and boss nodes.
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <ChoiceModal
        node={activeChoiceNode}
        disabled={!!processingNodeId}
        onClose={() => setActiveChoiceNode(null)}
        onChoose={resolveChoice}
      />

      <ResultModal
        result={lastResult}
        onClose={() => setLastResult(null)}
      />
    </div>
  );
}