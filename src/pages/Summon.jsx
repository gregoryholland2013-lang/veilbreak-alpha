import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Coins, Gem } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCards, useProfile, useCreatePlayerCard, useUpdateProfile } from '@/hooks/useGameData';
import GameCard from '@/components/game/GameCard';
import PageHeader from '@/components/game/PageHeader';
import { toast } from 'sonner';

const SUMMON_COST_GOLD = 300;
const SUMMON_COST_GEMS = 5;

export default function Summon() {
  const { data: cards } = useCards();
  const { data: profile } = useProfile();
  const createPlayerCard = useCreatePlayerCard();
  const updateProfile = useUpdateProfile();

  const [summoning, setSummoning] = useState(false);
  const [revealedCards, setRevealedCards] = useState([]);
  const [showResults, setShowResults] = useState(false);

 const randomPick = () => {
  if (!cards.length) return null;

  const activeCards = cards.filter((c) => c.is_active !== false);

  if (!activeCards.length) return null;

  return activeCards[Math.floor(Math.random() * activeCards.length)];
};

  const doSummon = async (count, currency) => {
    if (!profile || !cards.length) return;

    if (currency === 'gold' && profile.gold < SUMMON_COST_GOLD * count) {
      toast.error('Not enough gold!');
      return;
    }
    if (currency === 'gems' && profile.gems < SUMMON_COST_GEMS * count) {
      toast.error('Not enough gems!');
      return;
    }

    setSummoning(true);
    setShowResults(false);
    setRevealedCards([]);

    // Animate for a moment
    await new Promise(r => setTimeout(r, 1500));

    const card = randomPick();

    if (card) {
     const pc = await createPlayerCard.mutateAsync({
       card_id: card.id,
       level: 1,
       experience: 0,
       evolution_stage: card.evo_form || 'base',
       skill_level: card.skill_name ? 1 : 0,
        locked: false,
  });

  pulled.push({ card, playerCard: pc });
}

    // Deduct currency
    const costData = currency === 'gold'
      ? { gold: profile.gold - SUMMON_COST_GOLD * count }
      : { gems: profile.gems - SUMMON_COST_GEMS * count };
    await updateProfile.mutateAsync({ id: profile.id, data: costData });

    setRevealedCards(pulled);
    setSummoning(false);
    setShowResults(true);
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <PageHeader title="Summon Portal" />
      <div className="px-4 space-y-6">

      {/* Summon Circle */}
      <motion.div
        className="relative mx-auto w-64 h-64 flex items-center justify-center"
        animate={summoning ? { rotate: 360 } : {}}
        transition={summoning ? { duration: 2, repeat: Infinity, ease: 'linear' } : {}}
      >
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-4 rounded-full border border-accent/30" />
        <div className="absolute inset-8 rounded-full border border-primary/10" />
        <div className={`absolute inset-0 rounded-full ${summoning ? 'bg-primary/10 animate-pulse' : ''}`} />
        <Sparkles className={`w-16 h-16 ${summoning ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
      </motion.div>

      {/* Summon Buttons */}
      {!showResults && (
        <div className="space-y-3">
          <Button
            onClick={() => doSummon(1, 'gold')}
            disabled={summoning || !cards.length}
            className="w-full gap-2 bg-gradient-to-r from-yellow-600 to-yellow-700 hover:from-yellow-500 hover:to-yellow-600 text-white"
            size="lg"
          >
            <Coins className="w-5 h-5" />
            Summon x1 — {SUMMON_COST_GOLD} Gold
          </Button>
          <Button
            onClick={() => doSummon(3, 'gems')}
            disabled={summoning || !cards.length}
            className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white"
            size="lg"
          >
            <Gem className="w-5 h-5" />
            Summon x3 — {SUMMON_COST_GEMS * 3} Gems
          </Button>
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {showResults && revealedCards.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <h2 className="font-display text-lg text-center text-primary">Cards Summoned!</h2>
            <div className="flex justify-center gap-4 flex-wrap">
              {revealedCards.map(({ card, playerCard }, i) => (
                <motion.div
                  key={playerCard.id}
                  initial={{ opacity: 0, scale: 0.5, rotateY: 180 }}
                  animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                  transition={{ delay: i * 0.3, duration: 0.5 }}
                >
                  <GameCard card={card} playerCard={playerCard} size="md" />
                </motion.div>
              ))}
            </div>
            <Button
              onClick={() => { setShowResults(false); setRevealedCards([]); }}
              variant="outline"
              className="w-full"
            >
              Summon Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Rates */}
      <div className="bg-card rounded-xl border border-border p-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2">Drop Rates</p>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div><span className="block text-muted-foreground">Common</span><span className="font-bold">60%</span></div>
          <div><span className="block text-blue-400">Rare</span><span className="font-bold">25%</span></div>
          <div><span className="block text-purple-400">Epic</span><span className="font-bold">12%</span></div>
          <div><span className="block text-primary">Legend</span><span className="font-bold">3%</span></div>
        </div>
      </div>
      </div>
    </div>
  );
}