import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Check, Edit3 } from 'lucide-react';
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

export default function DeckBuilder() {
  const { data: cards = [], isLoading: cardsLoading } = useCards();
  const { data: playerCards = [], isLoading: playerCardsLoading } = usePlayerCards();
  const { data: decks = [], isLoading: decksLoading } = useDecks();

  const queryClient = useQueryClient();

  const [deckName, setDeckName] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingDeckId, setEditingDeckId] = useState(null);
  const [saving, setSaving] = useState(false);

  const enriched = useMemo(() => {
    return playerCards
      .map((pc) => {
        const card = cards.find((c) => c.id === pc.card_id);
        return card ? { card, playerCard: pc } : null;
      })
      .filter(Boolean);
  }, [cards, playerCards]);

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
    setSelectedIds(deck.card_ids || []);
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

        {/* Deck Form */}
        <div className="bg-card rounded-xl border border-border p-4 space-y-3">
          <Input
            placeholder="Deck name..."
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            className="font-display"
          />

          <p className="text-xs text-muted-foreground">
            Selected: {selectedIds.length} / {MAX_DECK_SIZE}
          </p>

          {/* Selected Preview */}
          <div className="flex gap-2 flex-wrap min-h-[50px]">
            {selectedIds.map((id) => {
              const item = enriched.find((e) => e.playerCard.id === id);

              if (!item) return null;

              return (
                <motion.div
                  key={id}
                  layout
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  <GameCard
                    card={item.card}
                    playerCard={item.playerCard}
                    size="sm"
                    onClick={() => toggleCard(id)}
                  />
                </motion.div>
              );
            })}
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

        {/* Available Cards */}
        <div>
          <h2 className="text-sm font-semibold mb-2">Your Cards</h2>

          <div className="grid grid-cols-4 gap-2">
            {enriched.map(({ card, playerCard }) => (
              <div key={playerCard.id} className="relative">
                <GameCard
                  card={card}
                  playerCard={playerCard}
                  size="sm"
                  showStats={false}
                  onClick={() => toggleCard(playerCard.id)}
                />

                {selectedIds.includes(playerCard.id) && (
                  <div className="absolute inset-0 bg-primary/20 rounded-xl border-2 border-primary flex items-center justify-center pointer-events-none">
                    <Check className="w-6 h-6 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Saved Decks */}
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