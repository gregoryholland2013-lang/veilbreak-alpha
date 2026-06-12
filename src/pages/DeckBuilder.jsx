import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Trash2,
  Check,
  Edit3,
  Sword,
  Shield,
  Heart,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCards, usePlayerCards, useDecks } from '@/hooks/useGameData';
import GameCard from '@/components/game/GameCard';
import PageHeader from '@/components/game/PageHeader';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const MAX_DECK_SIZE = 5;

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

function getOwnedCardStat(playerCard, card, stat) {
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

function getOwnedCardStats(playerCard, card) {
  const attack = getOwnedCardStat(playerCard, card, 'attack');
  const defense = getOwnedCardStat(playerCard, card, 'defense');
  const hp = getOwnedCardStat(playerCard, card, 'hp');

  return {
    attack,
    defense,
    hp,
    total: attack + defense + hp,
  };
}

function getStageLabel(playerCard) {
  const count = Number(playerCard?.evolve_count || 0);

  if (count >= 3) return 'Final';
  if (count === 2) return 'Base++';
  if (count === 1) return 'Base+';

  return 'Base';
}

export default function DeckBuilder() {
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const {
    data: playerCards = [],
    isLoading: playerCardsLoading,
  } = usePlayerCards();
  const { data: decks = [], isLoading: decksLoading } = useDecks();

  const queryClient = useQueryClient();

  const [deckName, setDeckName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const enriched = useMemo(() => {
    return playerCards
      .map((pc) => {
        const card = cards.find((c) => c.id === pc.card_id);

        if (!card) return null;

        const stats = getOwnedCardStats(pc, card);

        return {
          card,
          playerCard: pc,
          stats,
          stageLabel: getStageLabel(pc),
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (b.stats.total !== a.stats.total) {
          return b.stats.total - a.stats.total;
        }

        if ((b.playerCard.level || 1) !== (a.playerCard.level || 1)) {
          return (b.playerCard.level || 1) - (a.playerCard.level || 1);
        }

        return String(a.card.name || '').localeCompare(String(b.card.name || ''));
      });
  }, [cards, playerCards]);

  const filteredCards = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return enriched;

    return enriched.filter(({ card, stageLabel }) => {
      return (
        String(card.name || '').toLowerCase().includes(value) ||
        String(card.rarity || '').toLowerCase().includes(value) ||
        String(card.element || '').toLowerCase().includes(value) ||
        String(stageLabel || '').toLowerCase().includes(value)
      );
    });
  }, [enriched, search]);

  const selectedCards = useMemo(() => {
    return selectedIds
      .map((id) => enriched.find((item) => item.playerCard.id === id))
      .filter(Boolean);
  }, [selectedIds, enriched]);

  const selectedStats = useMemo(() => {
    return selectedCards.reduce(
      (sum, item) => {
        return {
          attack: sum.attack + item.stats.attack,
          defense: sum.defense + item.stats.defense,
          hp: sum.hp + item.stats.hp,
          total: sum.total + item.stats.total,
        };
      },
      {
        attack: 0,
        defense: 0,
        hp: 0,
        total: 0,
      }
    );
  }, [selectedCards]);

  const resetForm = () => {
    setDeckName('');
    setSelectedIds([]);
    setEditingDeckId(null);
  };

  const toggleCard = (pcId) => {
    setSelectedIds((prev) => {
      if (prev.includes(pcId)) {
        return prev.filter((id) => id !== pcId);
      }

      if (prev.length >= MAX_DECK_SIZE) {
        toast.error(`Max ${MAX_DECK_SIZE} cards per deck`);
        return prev;
      }

      return [...prev, pcId];
    });
  };

  const saveDeck = async () => {
    const trimmedName = deckName.trim();

    if (!trimmedName) {
      toast.error('Enter a deck name');
      return;
    }

    if (selectedIds.length === 0) {
      toast.error('Select at least 1 card');
      return;
    }

    if (selectedIds.length > MAX_DECK_SIZE) {
      toast.error(`Max ${MAX_DECK_SIZE} cards per deck`);
      return;
    }

    setSaving(true);

    try {
      const user = await getAuthUser();

      if (!user) {
        toast.error('You need to be logged in');
        return;
      }

      const now = new Date().toISOString();

      if (editingDeckId) {
        const { data, error } = await supabase
          .from('decks')
          .update({
            name: trimmedName,
            card_ids: selectedIds,
            updated_at: now,
          })
          .eq('id', editingDeckId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;

        toast.success(`${data.name} updated!`);
      } else {
        const shouldBeActive = decks.length === 0;

        const { data, error } = await supabase
          .from('decks')
          .insert({
            user_id: user.id,
            owner_email: user.email,
            name: trimmedName,
            card_ids: selectedIds,
            is_active: shouldBeActive,
            created_at: now,
            updated_at: now,
          })
          .select()
          .single();

        if (error) throw error;

        toast.success(
          shouldBeActive
            ? `${data.name} created and set active!`
            : `${data.name} created!`
        );
      }

      await queryClient.invalidateQueries({ queryKey: ['decks'] });
      resetForm();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not save deck');
    } finally {
      setSaving(false);
    }
  };

  const setActive = async (deck) => {
    try {
      const user = await getAuthUser();

      if (!user) {
        toast.error('You need to be logged in');
        return;
      }

      const now = new Date().toISOString();

      const { error: deactivateError } = await supabase
        .from('decks')
        .update({
          is_active: false,
          updated_at: now,
        })
        .eq('user_id', user.id);

      if (deactivateError) throw deactivateError;

      const { error: activateError } = await supabase
        .from('decks')
        .update({
          is_active: true,
          updated_at: now,
        })
        .eq('id', deck.id)
        .eq('user_id', user.id);

      if (activateError) throw activateError;

      await queryClient.invalidateQueries({ queryKey: ['decks'] });

      toast.success(`${deck.name} is now active!`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not set active deck');
    }
  };

  const deleteDeck = async (deck) => {
    try {
      const user = await getAuthUser();

      if (!user) {
        toast.error('You need to be logged in');
        return;
      }

      const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deck.id)
        .eq('user_id', user.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ['decks'] });

      if (editingDeckId === deck.id) {
        resetForm();
      }

      toast.success('Deck deleted');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not delete deck');
    }
  };

  const editDeck = (deck) => {
    setEditingDeckId(deck.id);
    setDeckName(deck.name || '');

    const validPlayerCardIds = new Set(enriched.map((item) => item.playerCard.id));

    const deckIds = Array.isArray(deck.card_ids) ? deck.card_ids : [];

    const normalizedIds = deckIds.filter((id) => validPlayerCardIds.has(id));

    setSelectedIds(normalizedIds);
  };

  const isLoading = cardsLoading || playerCardsLoading || decksLoading;

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <PageHeader title="Deck Builder" />

      <div className="px-4 space-y-5">
        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Loading deck builder…
          </div>
        )}

        {!isLoading && enriched.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
            No cards available. Summon cards first.
          </div>
        )}

        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <Input
            placeholder="Deck name..."
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="font-display"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Selected: {selectedIds.length} / {MAX_DECK_SIZE}
            </p>

            <p className="text-xs text-primary font-bold">
              Power {selectedStats.total}
            </p>
          </div>

          {selectedIds.length > 0 && (
            <div className="grid grid-cols-3 gap-2 rounded-xl border border-border bg-muted/20 p-3 text-xs">
              <div className="flex items-center gap-1 text-red-400 font-bold">
                <Sword className="w-3.5 h-3.5" />
                {selectedStats.attack}
              </div>

              <div className="flex items-center gap-1 text-blue-400 font-bold">
                <Shield className="w-3.5 h-3.5" />
                {selectedStats.defense}
              </div>

              <div className="flex items-center gap-1 text-green-400 font-bold">
                <Heart className="w-3.5 h-3.5" />
                {selectedStats.hp}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap min-h-[50px]">
            {selectedCards.map((item) => (
              <motion.div
                key={item.playerCard.id}
                layout
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
              >
                <GameCard
                  card={item.card}
                  playerCard={item.playerCard}
                  size="sm"
                  showStats
                  onClick={() => toggleCard(item.playerCard.id)}
                />
              </motion.div>
            ))}
          </div>

          <Button
            onClick={saveDeck}
            disabled={saving || selectedIds.length === 0}
            className="w-full gap-2"
          >
            <Plus className="w-4 h-4" />
            {saving
              ? 'Saving…'
              : editingDeckId
                ? 'Update Deck'
                : 'Save Deck'}
          </Button>

          {editingDeckId && (
            <Button
              type="button"
              variant="ghost"
              onClick={resetForm}
              className="w-full text-xs"
            >
              Cancel Edit
            </Button>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-sm font-semibold">Your Cards</h2>

            <p className="text-[10px] text-muted-foreground">
              Sorted by current power
            </p>
          </div>

          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards, rarity, element, evolution..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-4 gap-2">
            {filteredCards.map(({ card, playerCard, stats }) => {
              const selected = selectedIds.includes(playerCard.id);

              return (
                <div key={playerCard.id} className="relative">
                  <GameCard
                    card={card}
                    playerCard={playerCard}
                    size="sm"
                    showStats
                    onClick={() => toggleCard(playerCard.id)}
                  />

                  <div className="absolute left-1 right-1 bottom-1 rounded-md bg-black/70 px-1 py-0.5 text-[8px] text-center text-white pointer-events-none">
                    Power {stats.total}
                  </div>

                  {selected && (
                    <div className="absolute inset-0 bg-primary/20 rounded-xl border-2 border-primary flex items-center justify-center pointer-events-none">
                      <Check className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredCards.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-5 text-center text-sm text-muted-foreground">
              No cards match your search.
            </div>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Saved Decks</h2>

          {decks.length === 0 && (
            <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
              No saved decks yet.
            </div>
          )}

          {decks.map((deck) => (
            <div
              key={deck.id}
              className={`bg-card rounded-xl border p-3 ${
                deck.is_active ? 'border-primary glow-gold' : 'border-border'
              }`}
            >
              <div className="flex justify-between items-center gap-3">
                <div className="min-w-0">
                  <p className="font-display font-bold text-sm truncate">
                    {deck.name}
                  </p>

                  <p className="text-xs text-muted-foreground">
                    {deck.card_ids?.length || 0} cards
                    {deck.is_active ? ' · Active' : ''}
                  </p>
                </div>

                <div className="flex gap-1.5 flex-shrink-0">
                  {!deck.is_active && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActive(deck)}
                      className="text-xs h-7"
                    >
                      Set Active
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => editDeck(deck)}
                    className="h-7 text-xs gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDeck(deck)}
                    className="h-7 text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}