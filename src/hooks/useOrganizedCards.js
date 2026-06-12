import { useMemo } from 'react';
import { useCards, usePlayerCards } from '@/hooks/useGameData';
import { organizePlayerCards } from '@/utils/cardOrganization';

export function useOrganizedCards({ sortBy = 'newest', filters = {} } = {}) {
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: playerCards = [], isLoading: playerCardsLoading } = usePlayerCards();

  const organized = useMemo(() => {
    return organizePlayerCards(playerCards, cards, {
      sortBy,
      filters,
    });
  }, [playerCards, cards, sortBy, filters]);

  return {
    ...organized,
    isLoading: cardsLoading || playerCardsLoading,
    rawCards: cards,
    rawPlayerCards: playerCards,
  };
}