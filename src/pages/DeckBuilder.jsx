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
  X,
  BookOpen,
  Trophy,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useCards, usePlayerCards, useDecks } from '@/hooks/useGameData';
import GameCard from '@/components/game/GameCard';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const MAX_DECK_SIZE = 5;

const DECK_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;

    const text = String(value).trim();

    if (text) return text;
  }

  return '';
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function getDisplayName(card, playerCard) {
  return (
    firstNonEmpty(
      card?.full_card_name,
      card?.card_line,
      card?.name,
      card?.card_name,
      playerCard?.full_card_name,
      playerCard?.card_line,
      playerCard?.name,
      playerCard?.card_name
    ) || 'Unknown Card'
  );
}

function getRawFaction(card, playerCard) {
  return (
    firstNonEmpty(
      card?.faction,
      card?.faction_name,
      card?.card_faction,
      card?.element,
      playerCard?.faction,
      playerCard?.faction_name,
      playerCard?.card_faction,
      playerCard?.element
    ) || 'Unknown'
  );
}

function getRawRarity(card, playerCard) {
  return (
    firstNonEmpty(
      card?.rarity_tier,
      card?.rarity,
      playerCard?.rarity_tier,
      playerCard?.rarity
    ) || 'Vessel'
  );
}

function getRawEvoForm(card, playerCard) {
  return (
    firstNonEmpty(
      card?.evo_form,
      card?.evolution,
      playerCard?.evo_form,
      playerCard?.evolution
    ) || 'base'
  );
}

function normalizeCardForDisplay(card = {}, playerCard = {}) {
  const name = getDisplayName(card, playerCard);
  const faction = getRawFaction(card, playerCard);
  const rarity = getRawRarity(card, playerCard);
  const evoForm = getRawEvoForm(card, playerCard);

  return {
    ...card,

    id: card?.id || playerCard?.card_id,

    // Name fields — this is the main fix.
    name,
    card_name: card?.card_name || name,
    card_line: card?.card_line || playerCard?.card_line || name,
    full_card_name: card?.full_card_name || playerCard?.full_card_name || name,

    // Rarity fields.
    rarity,
    rarity_tier: card?.rarity_tier || playerCard?.rarity_tier || rarity,

    // Faction/element fields.
    faction,
    element: card?.element || faction,
    faction_key: normalizeKey(faction),

    // Evo fields.
    evo_form: card?.evo_form || playerCard?.evo_form || evoForm,
    evolution: card?.evolution || playerCard?.evolution || evoForm,

    // Image fields.
    image_url:
      card?.image_url ||
      card?.artwork_url ||
      card?.image ||
      playerCard?.image_url ||
      playerCard?.artwork_url ||
      playerCard?.image ||
      '',

    // Stat fields.
    base_attack: card?.base_attack ?? playerCard?.base_attack ?? playerCard?.attack ?? 0,
    base_defense:
      card?.base_defense ?? playerCard?.base_defense ?? playerCard?.defense ?? 0,
    base_hp: card?.base_hp ?? playerCard?.base_hp ?? playerCard?.hp ?? 0,
  };
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

function getStageLabel(playerCard, card) {
  const evoKey = normalizeKey(
    playerCard?.evo_form ||
      playerCard?.evolution ||
      card?.evo_form ||
      card?.evolution ||
      ''
  );

  if (evoKey === 'final') return 'Final';
  if (evoKey === 'base_plus_plus') return 'Base++';
  if (evoKey === 'base_plus') return 'Base+';
  if (evoKey === 'base') return 'Base';

  const count = Number(playerCard?.evolve_count || 0);

  if (count >= 3) return 'Final';
  if (count === 2) return 'Base++';
  if (count === 1) return 'Base+';

  return 'Base';
}

function getCardImage(card) {
  return card?.image_url || card?.artwork_url || card?.image || '';
}

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-blue-700/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {label}
      </div>
      <p className="font-display text-xl font-black mt-1">{value}</p>
    </div>
  );
}

function MiniStat({ icon: Icon, label, value, valueClass = 'text-foreground' }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3 text-center">
      <Icon className="w-4 h-4 text-primary mx-auto mb-1" />
      <p className={`font-display text-lg font-black ${valueClass}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}

function QuestPanel({ children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden ${className}`}>
      {children}
    </section>
  );
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

  const cardsById = useMemo(() => {
    return new Map((cards || []).map((card) => [String(card.id), card]));
  }, [cards]);

  const enriched = useMemo(() => {
    return playerCards
      .map((pc) => {
        const rawCard =
          cardsById.get(String(pc.card_id)) ||
          pc.cards ||
          pc.card ||
          pc.card_definition ||
          pc.cardDef ||
          null;

        if (!rawCard && !pc.card_line && !pc.full_card_name && !pc.name) {
          return null;
        }

        const card = normalizeCardForDisplay(rawCard || {}, pc);
        const stats = getOwnedCardStats(pc, card);

        return {
          card,
          playerCard: pc,
          stats,
          stageLabel: getStageLabel(pc, card),
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
  }, [cardsById, playerCards]);

  const filteredCards = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return enriched;

    return enriched.filter(({ card, stageLabel }) => {
      return (
        String(card.name || '').toLowerCase().includes(value) ||
        String(card.full_card_name || '').toLowerCase().includes(value) ||
        String(card.card_line || '').toLowerCase().includes(value) ||
        String(card.rarity_tier || '').toLowerCase().includes(value) ||
        String(card.rarity || '').toLowerCase().includes(value) ||
        String(card.faction || '').toLowerCase().includes(value) ||
        String(card.element || '').toLowerCase().includes(value) ||
        String(card.evo_form || '').toLowerCase().includes(value) ||
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
      { attack: 0, defense: 0, hp: 0, total: 0 }
    );
  }, [selectedCards]);

  const activeDeck = useMemo(() => {
    return decks.find((deck) => deck.is_active) || null;
  }, [decks]);

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

  const removeSelectedCard = (pcId) => {
    setSelectedIds((prev) => prev.filter((id) => id !== pcId));
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
        .update({ is_active: false, updated_at: now })
        .eq('user_id', user.id);

      if (deactivateError) throw deactivateError;

      const { error: activateError } = await supabase
        .from('decks')
        .update({ is_active: true, updated_at: now })
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
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={DECK_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <BookOpen className="w-4 h-4" />
                  Deck Forge
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  DECK BUILDER
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  Build a five-card battle lineup, set an active deck, and prepare for Arena and Holy War combat.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat
                  icon={Check}
                  label="Selected"
                  value={`${selectedIds.length}/${MAX_DECK_SIZE}`}
                />
                <HeroStat
                  icon={Trophy}
                  label="Power"
                  value={selectedStats.total.toLocaleString()}
                />
                <HeroStat
                  icon={Sparkles}
                  label="Saved"
                  value={decks.length}
                />
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <div className="xl:col-span-5 space-y-6">
            <QuestPanel>
              <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Shield className="w-4 h-4" />
                      Battle Deck
                    </div>

                    <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                      {editingDeckId ? 'Edit Deck' : 'Create Deck'}
                    </h2>

                    <p className="text-sm text-muted-foreground mt-2">
                      Selected {selectedIds.length} / {MAX_DECK_SIZE}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-primary/30 bg-background/60 px-4 py-3 text-right">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      Power
                    </p>
                    <p className="font-display text-2xl font-black text-primary">
                      {selectedStats.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-5 md:p-6 space-y-4">
                {isLoading && (
                  <div className="rounded-2xl border border-border bg-background/50 p-4 text-center text-sm text-muted-foreground">
                    Loading deck builder…
                  </div>
                )}

                {!isLoading && enriched.length === 0 && (
                  <div className="rounded-2xl border border-border bg-background/50 p-5 text-center text-sm text-muted-foreground">
                    No cards available. Summon cards first.
                  </div>
                )}

                <Input
                  placeholder="Deck name..."
                  value={deckName}
                  onChange={(e) => setDeckName(e.target.value)}
                  className="h-10 font-display text-sm"
                />

                <div className="grid grid-cols-3 gap-3">
                  <MiniStat
                    icon={Sword}
                    label="ATK"
                    value={selectedStats.attack.toLocaleString()}
                    valueClass="text-red-300"
                  />
                  <MiniStat
                    icon={Shield}
                    label="DEF"
                    value={selectedStats.defense.toLocaleString()}
                    valueClass="text-blue-300"
                  />
                  <MiniStat
                    icon={Heart}
                    label="HP"
                    value={selectedStats.hp.toLocaleString()}
                    valueClass="text-green-300"
                  />
                </div>

                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: MAX_DECK_SIZE }).map((_, index) => {
                    const item = selectedCards[index];
                    const imageUrl = getCardImage(item?.card);

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() => {
                          if (item) removeSelectedCard(item.playerCard.id);
                        }}
                        className={`relative aspect-[3/4] overflow-hidden rounded-xl border ${
                          item
                            ? 'border-primary/50 bg-background'
                            : 'border-dashed border-border bg-background/35'
                        }`}
                      >
                        {item && imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={item.card.name}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : item ? (
                          <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-primary">
                            {item.card.name}
                          </div>
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Plus className="h-4 w-4" />
                          </div>
                        )}

                        {item && (
                          <>
                            <div className="absolute inset-x-0 bottom-0 bg-black/75 px-1 py-0.5 text-[8px] font-black text-white">
                              {item.stats.total.toLocaleString()}
                            </div>

                            <div className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-black/70 text-white">
                              <X className="h-3 w-3" />
                            </div>
                          </>
                        )}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={saveDeck}
                  disabled={saving || selectedIds.length === 0}
                  className="w-full gap-2"
                >
                  <Plus className="h-4 w-4" />
                  {saving
                    ? 'Saving…'
                    : editingDeckId
                      ? 'Update Deck'
                      : 'Save Deck'}
                </Button>

                {editingDeckId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="w-full text-xs"
                  >
                    Cancel Edit
                  </Button>
                )}
              </div>
            </QuestPanel>

            <QuestPanel>
              <div className="p-5 border-b border-border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <BookOpen className="w-4 h-4" />
                      Saved Decks
                    </div>
                    <h2 className="font-display text-2xl font-black text-primary mt-2">
                      Arsenal
                    </h2>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {decks.length} saved
                  </p>
                </div>
              </div>

              <div className="p-5 space-y-3">
                {activeDeck && (
                  <div className="rounded-2xl border border-primary/50 bg-primary/10 p-3">
                    <p className="text-[10px] uppercase tracking-widest text-primary font-bold">
                      Active Deck
                    </p>
                    <p className="font-display text-lg font-black mt-1">
                      {activeDeck.name}
                    </p>
                  </div>
                )}

                {decks.length === 0 && (
                  <div className="rounded-2xl border border-border bg-background/50 p-4 text-center text-sm text-muted-foreground">
                    No saved decks yet.
                  </div>
                )}

                {decks.map((deck) => (
                  <div
                    key={deck.id}
                    className={`rounded-2xl border bg-background/50 p-3 ${
                      deck.is_active ? 'border-primary/70 glow-gold' : 'border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-display text-sm font-black text-foreground">
                          {deck.name}
                        </p>

                        <p className="text-xs text-muted-foreground">
                          {deck.card_ids?.length || 0} cards
                          {deck.is_active ? ' · Active' : ''}
                        </p>
                      </div>

                      <div className="flex shrink-0 gap-1.5">
                        {!deck.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setActive(deck)}
                            className="h-8 text-xs"
                          >
                            Active
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => editDeck(deck)}
                          className="h-8 px-2 text-xs"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteDeck(deck)}
                          className="h-8 px-2 text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </QuestPanel>
          </div>

          <div className="xl:col-span-7">
            <QuestPanel>
              <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Search className="w-4 h-4" />
                      Card Selection
                    </div>

                    <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                      Your Cards
                    </h2>

                    <p className="text-sm text-muted-foreground mt-2">
                      Tap cards to add or remove them from the deck.
                    </p>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {filteredCards.length} shown
                  </p>
                </div>

                <div className="relative mt-4">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search cards..."
                    className="h-10 pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 justify-items-center">
                  {filteredCards.map(({ card, playerCard, stats }) => {
                    const selected = selectedIds.includes(playerCard.id);

                    return (
                      <motion.div
                        key={playerCard.id}
                        layout
                        className="relative"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                      >
                        <GameCard
                          card={card}
                          playerCard={playerCard}
                          size="md"
                          showStats
                          showProtectionBadge={false}
                          onClick={() => toggleCard(playerCard.id)}
                        />

                        <div className="pointer-events-none absolute bottom-1 left-2 right-2 rounded-full bg-black/75 px-2 py-0.5 text-center text-[9px] font-black text-white">
                          Power {stats.total.toLocaleString()}
                        </div>

                        {selected && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-xl border-2 border-primary bg-primary/20">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
                              <Check className="h-6 w-6" />
                            </div>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>

                {filteredCards.length === 0 && (
                  <div className="mt-3 rounded-2xl border border-border bg-background/50 p-5 text-center text-sm text-muted-foreground">
                    No cards match your search.
                  </div>
                )}
              </div>
            </QuestPanel>
          </div>
        </div>
      </div>
    </div>
  );
}