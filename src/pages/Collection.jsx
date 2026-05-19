import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  useCards,
  usePlayerCards,
  useUpdatePlayerCard,
  useUpdateProfile,
  useProfile,
} from '@/hooks/useGameData';
import GameCard from '@/components/game/GameCard';
import CardDetailModal from '@/components/game/CardDetailModal';
import PageHeader from '@/components/game/PageHeader';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function Collection() {
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: profile } = useProfile();

  const updatePlayerCard = useUpdatePlayerCard();
  const updateProfile = useUpdateProfile();

  const [selectedCard, setSelectedCard] = useState(null);
  const [selectedPlayerCard, setSelectedPlayerCard] = useState(null);
  const [elementFilter, setElementFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');

  const enrichedCards = useMemo(() => {
    return playerCards
      .map((pc) => {
        const card = cards.find((c) => c.id === pc.card_id);
        return card ? { card, playerCard: pc } : null;
      })
      .filter(Boolean);
  }, [cards, playerCards]);

  const filtered = useMemo(() => {
    return enrichedCards.filter(({ card }) => {
      if (elementFilter !== 'all' && card.element !== elementFilter) {
        return false;
      }

      if (rarityFilter !== 'all' && card.rarity !== rarityFilter) {
        return false;
      }

      return true;
    });
  }, [enrichedCards, elementFilter, rarityFilter]);

  const handleLevelUp = async (pc) => {
    if (!profile) {
      toast.error('Profile has not loaded yet');
      return;
    }

    if ((profile.gold || 0) < 100) {
      toast.error('Not enough gold!');
      return;
    }

    const currentLevel = pc.level || 1;
    const currentXp = pc.experience || 0;

    const xpNeeded = currentLevel * 50;
    const newXp = currentXp + 50;
    const levelUp = newXp >= xpNeeded;

    try {
      await updatePlayerCard.mutateAsync({
        id: pc.id,
        data: {
          level: levelUp ? currentLevel + 1 : currentLevel,
          experience: levelUp ? newXp - xpNeeded : newXp,
        },
      });

      await updateProfile.mutateAsync({
        id: profile.id,
        data: {
          gold: (profile.gold || 0) - 100,
        },
      });

      toast.success(levelUp ? 'Level Up!' : 'XP gained!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not level up card');
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PageHeader title="Collection" />

      <div className="px-4 space-y-4">
        <div className="flex gap-2">
          <Select value={elementFilter} onValueChange={setElementFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Elements</SelectItem>
              <SelectItem value="fire">🔥 Fire</SelectItem>
              <SelectItem value="water">💧 Water</SelectItem>
              <SelectItem value="earth">🌿 Earth</SelectItem>
              <SelectItem value="light">✨ Light</SelectItem>
              <SelectItem value="dark">🌑 Dark</SelectItem>
            </SelectContent>
          </Select>

          <Select value={rarityFilter} onValueChange={setRarityFilter}>
            <SelectTrigger className="w-28 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">All Rarity</SelectItem>
              <SelectItem value="common">Common</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="epic">Epic</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <p className="text-xs text-muted-foreground">
          {filtered.length} cards
        </p>

        <div className="grid grid-cols-3 gap-3">
          <AnimatePresence>
            {filtered.map(({ card, playerCard }) => (
              <motion.div
                key={playerCard.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <GameCard
                  card={card}
                  playerCard={playerCard}
                  size="sm"
                  onClick={() => {
                    setSelectedCard(card);
                    setSelectedPlayerCard(playerCard);
                  }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="font-display text-lg">No cards yet</p>
            <p className="text-sm mt-1">
              Visit the Summon Portal to draw cards!
            </p>
          </div>
        )}

        <CardDetailModal
          card={selectedCard}
          playerCard={selectedPlayerCard}
          open={!!selectedCard}
          onClose={() => {
            setSelectedCard(null);
            setSelectedPlayerCard(null);
          }}
          onLevelUp={handleLevelUp}
        />
      </div>
    </div>
  );
}