import React, { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { motion } from 'framer-motion'
import { Zap, ChevronDown, ChevronUp } from 'lucide-react'

const FLOOR_REWARDS = {
  5: { type: 'aether_dust', amount: 2, label: '2 Aether Dust', icon: '✨' },
  10: { type: 'spirit_water', amount: 3, label: '3 Spirit Water', icon: '💧' },
  15: { type: 'gems', amount: 10, label: '10 Gems', icon: '💎' },
  20: { type: 'aether_dust', amount: 5, label: '5 Aether Dust', icon: '✨' },
  25: { type: 'spirit_water', amount: 5, label: '5 Spirit Water', icon: '💧' },
  30: { type: 'gems', amount: 20, label: '20 Gems', icon: '💎' },
  35: { type: 'aether_dust', amount: 10, label: '10 Aether Dust', icon: '✨' },
  40: { type: 'gold', amount: 5000, label: '5000 Gold', icon: '🪙' },
  45: { type: 'gems', amount: 50, label: '50 Gems', icon: '💎' },
  50: { type: 'gems', amount: 100, label: '100 Gems + Prestige!', icon: '🏆' },
}

const BOSS_FLOORS = [10, 20, 30, 40, 50]
const RAID_TRIGGER_CHANCE = 0.25

const BOSS_NAMES = [
  'Shadow Leviathan',
  'Void Wyrm',
  'Iron Colossus',
  'Plague Harbinger',
  'Storm Titan',
  'Inferno Drake',
  'Glacial Horror',
  'Thunder Behemoth',
  'Crimson Fiend',
  'Abyssal Overlord',
]

export default function EventFloorMap({
  event,
  progress,
  inventory,
  profile,
  playerCards = [],
  cards = [],
  user,
}) {
  const queryClient = useQueryClient()
  const [clearing, setClearing] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [lastResult, setLastResult] = useState(null)

  const userId = user?.id || profile?.id
  const currentFloor = progress?.current_floor || 1
  const prestigeCount = progress?.prestige_count || 0
  const clearedFirstTime = progress?.floors_cleared_first_time || []
  const spiritWater = inventory?.spirit_water || 0
  const cost = event?.spirit_water_cost || 1
  const totalFloors = event?.total_floors || 50

  const eventBoost = playerCards.reduce((boost, pc) => {
    const card = cards.find((c) => c.id === pc.card_id)
    if (!card) return boost

    if (card.faction === event?.faction_theme || card.faction === event?.element_theme) {
      const rarityBonus =
        {
          Vessel: 0.03,
          Awakened: 0.06,
          Exalted: 0.1,
          Ascendant: 0.18,
          Mythic: 0.3,
          Transcendent: 0.45,
          Singularity: 0.7,
        }[card.rarity_tier] || 0

      return boost + rarityBonus
    }

    return boost
  }, 1.0)

  const updateInventory = async (data) => {
    const { error } = await supabase
      .from('player_inventory')
      .update(data)
      .eq('id', inventory.id)

    if (error) throw error
  }

  const updateProfile = async (data) => {
    const { error } = await supabase
      .from('profiles')
      .update(data)
      .eq('id', profile.id)

    if (error) throw error
  }

  const upsertProgress = async (progressUpdates) => {
    if (progress?.id) {
      const { error } = await supabase
        .from('player_event_progress')
        .update(progressUpdates)
        .eq('id', progress.id)

      if (error) throw error
      return
    }

    const { error } = await supabase.from('player_event_progress').insert({
      id: userId,
      event_id: event.id,
      ...progressUpdates,
    })

    if (error) throw error
  }

  const createRaidBoss = async ({ isMilestoneBoss }) => {
    const { data: existingRaids, error: raidFetchError } = await supabase
      .from('raid_bosses')
      .select('id')
      .eq('owner_id', userId)
      .eq('status', 'alive')

    if (raidFetchError) throw raidFetchError
    if ((existingRaids || []).length >= 15) return false

    const bossName = BOSS_NAMES[Math.floor(Math.random() * BOSS_NAMES.length)]
    const hp = Math.round(5000 + currentFloor * 300)

    const { error } = await supabase.from('raid_bosses').insert({
      event_id: event.id,
      owner_id: userId,
      boss_name: bossName,
      boss_faction: event?.faction_theme || event?.element_theme || null,
      floor_level: currentFloor,
      max_hp: hp,
      current_hp: hp,
      status: 'alive',
      shared_to: 'private',
      trigger_type: isMilestoneBoss ? 'milestone' : 'random',
    })

    if (error) throw error
    return true
  }

  const attemptFloor = async () => {
    if (!userId || !profile || !inventory || !event) {
      toast.error('Event data is still loading.')
      return
    }

    if (spiritWater < cost) {
      toast.error('Not enough Spirit Water!')
      return
    }

    try {
      setClearing(true)
      setLastResult(null)

      await new Promise((r) => setTimeout(r, 800))

      const floorDifficulty = 1 + (currentFloor - 1) * 0.04
      const playerPower = (profile?.level || 1) * 80 * eventBoost
      const bossPower = floorDifficulty * 500
      const won =
        playerPower * (0.8 + Math.random() * 0.4) >
        bossPower * (0.8 + Math.random() * 0.4)

      await updateInventory({
        spirit_water: spiritWater - cost,
      })

      if (!won) {
        setLastResult({ won: false, floor: currentFloor })
        return
      }

      const newFloor = currentFloor >= totalFloors ? 1 : currentFloor + 1
      const isPrestige = currentFloor >= totalFloors
      const isFirstClear = !clearedFirstTime.includes(currentFloor)
      const isMilestoneBoss = BOSS_FLOORS.includes(currentFloor)
      const randomRaid = Math.random() < RAID_TRIGGER_CHANCE
      const shouldTriggerRaid = (isMilestoneBoss || randomRaid) && !isPrestige

      const progressUpdates = {
        current_floor: newFloor,
        prestige_count: isPrestige ? prestigeCount + 1 : prestigeCount,
        floors_cleared_first_time: isFirstClear
          ? [...clearedFirstTime, currentFloor]
          : clearedFirstTime,
        total_damage_dealt:
          (progress?.total_damage_dealt || 0) + Math.round(playerPower),
        event_rank_score:
          (progress?.event_rank_score || 0) +
          currentFloor * 10 +
          (isPrestige ? 1000 : 0),
      }

      let rewardGiven = null

      if (isFirstClear && FLOOR_REWARDS[currentFloor]) {
        const reward = FLOOR_REWARDS[currentFloor]
        rewardGiven = reward

        if (reward.type === 'gems') {
          await updateProfile({ gems: (profile.gems || 0) + reward.amount })
        }

        if (reward.type === 'gold') {
          await updateProfile({ gold: (profile.gold || 0) + reward.amount })
        }

        if (reward.type === 'aether_dust') {
          await updateInventory({
            aether_dust: (inventory.aether_dust || 0) + reward.amount,
            spirit_water: spiritWater - cost,
          })
        }

        if (reward.type === 'spirit_water') {
          await updateInventory({
            spirit_water: spiritWater - cost + reward.amount,
          })
        }
      }

      if (isPrestige) {
        await updateInventory({
          aether_dust: (inventory.aether_dust || 0) + 20,
          spirit_water: spiritWater - cost + 10,
        })

        rewardGiven = {
          label: '20 Aether Dust + 10 Spirit Water',
          icon: '🏆',
        }
      }

      await upsertProgress(progressUpdates)

      let raidTriggered = false
      if (shouldTriggerRaid) {
        raidTriggered = await createRaidBoss({ isMilestoneBoss })
      }

      setLastResult({
        won: true,
        floor: currentFloor,
        isPrestige,
        isFirstClear,
        reward: rewardGiven,
        raidTriggered,
      })

      queryClient.invalidateQueries({ queryKey: ['playerEventProgress'] })
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] })
      queryClient.invalidateQueries({ queryKey: ['playerInventory'] })
      queryClient.invalidateQueries({ queryKey: ['raidBosses'] })
    } catch (error) {
      console.error(error)
      toast.error(error.message || 'Failed to attempt floor')
    } finally {
      setClearing(false)
    }
  }

  const visibleFloors = showAll
    ? Array.from({ length: totalFloors }, (_, i) => i + 1)
    : Array.from({ length: Math.min(10, totalFloors) }, (_, i) =>
        Math.min(totalFloors, Math.max(1, currentFloor - 5) + i)
      )

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
        <div>
          <p className="text-xs text-muted-foreground">Current Floor</p>
          <p className="font-display font-black text-2xl text-primary">
            {currentFloor}{' '}
            <span className="text-sm text-muted-foreground">/ {totalFloors}</span>
          </p>
          {prestigeCount > 0 && (
            <p className="text-[10px] text-yellow-400">⭐ Prestige {prestigeCount}</p>
          )}
        </div>

        <div className="text-right space-y-1">
          <p className="text-xs text-muted-foreground">Event Boost</p>
          <p className="font-bold text-green-400 text-sm">×{eventBoost.toFixed(2)}</p>
          <p className="text-[10px] text-muted-foreground">💧 {spiritWater} left</p>
        </div>
      </div>

      {lastResult && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl border p-3 text-sm font-semibold ${
            lastResult.won
              ? 'border-green-500/40 bg-green-500/10 text-green-300'
              : 'border-destructive/40 bg-destructive/10 text-destructive'
          }`}
        >
          {lastResult.won ? (
            <div className="space-y-1">
              <p>✅ Floor {lastResult.floor} cleared!</p>
              {lastResult.isPrestige && (
                <p className="text-yellow-400">🏆 PRESTIGE! All floors complete!</p>
              )}
              {lastResult.isFirstClear && lastResult.reward && (
                <p className="text-primary text-xs">
                  🎁 First Clear Reward: {lastResult.reward.icon}{' '}
                  {lastResult.reward.label}
                </p>
              )}
              {lastResult.raidTriggered && (
                <p className="text-orange-400 text-xs">
                  ⚠️ Raid Boss triggered! Check your queue.
                </p>
              )}
            </div>
          ) : (
            <p>❌ Defeated on floor {lastResult.floor}. Try again!</p>
          )}
        </motion.div>
      )}

      <Button
        onClick={attemptFloor}
        disabled={clearing || spiritWater < cost}
        className="w-full gap-2 h-12 text-base font-display"
        size="lg"
      >
        {clearing ? (
          <>
            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            Battling…
          </>
        ) : (
          <>
            <Zap className="w-5 h-5" />
            Attempt Floor {currentFloor} · 💧{cost}
          </>
        )}
      </Button>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Floor Map
          </p>
          <button
            onClick={() => setShowAll(!showAll)}
            className="text-[10px] text-muted-foreground flex items-center gap-1"
          >
            {showAll ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {showAll ? 'Show Less' : 'Show All'}
          </button>
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {visibleFloors.map((floor) => {
            const cleared = clearedFirstTime.includes(floor)
            const isCurrent = floor === currentFloor
            const isBoss = BOSS_FLOORS.includes(floor)
            const reward = FLOOR_REWARDS[floor]

            return (
              <div
                key={floor}
                className={`relative rounded-lg border text-center py-2 text-[10px] font-bold transition-all ${
                  isCurrent
                    ? 'border-primary bg-primary/20 text-primary'
                    : cleared
                    ? 'border-green-500/40 bg-green-500/10 text-green-400'
                    : floor < currentFloor
                    ? 'border-border/40 bg-muted/20 text-muted-foreground/40'
                    : 'border-border/30 bg-card/30 text-muted-foreground'
                }`}
              >
                {isBoss && <span className="absolute -top-1 -right-1 text-[8px]">💀</span>}
                {reward && !cleared && (
                  <span className="absolute -top-1 -left-1 text-[8px]">{reward.icon}</span>
                )}
                <p>{floor}</p>
              </div>
            )
          })}
        </div>

        <p className="text-[9px] text-muted-foreground">
          💀 = Boss floor · Icons = First-clear reward
        </p>
      </div>
    </div>
  )
}