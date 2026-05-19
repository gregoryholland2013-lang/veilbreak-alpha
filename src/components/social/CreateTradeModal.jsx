import React, { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const CURRENCIES = [
  { key: 'gold', icon: '🪙', label: 'Gold' },
  { key: 'gems', icon: '💎', label: 'Gems' },
  { key: 'aether_dust', icon: '✨', label: 'Aether Dust' },
  { key: 'spirit_water', icon: '💧', label: 'Spirit Water' },
  { key: 'skill_shards', icon: '⚗️', label: 'Skill Shards' },
  { key: 'fodder', icon: '🃏', label: 'Fodder' },
];

const EMPTY_TRADE_VALUES = {
  gold: 0,
  gems: 0,
  aether_dust: 0,
  spirit_water: 0,
  skill_shards: 0,
  fodder: 0,
};

export default function CreateTradeModal({
  open,
  onClose,
  tradeType,
  eligibleFriends = [],
  profile,
  inventory,
  myPlayerCards = [],
  cards = [],
  myEmail,
  myDisplayName,
}) {
  const queryClient = useQueryClient();

  const [offer, setOffer] = useState(EMPTY_TRADE_VALUES);
  const [want, setWant] = useState(EMPTY_TRADE_VALUES);
  const [offerCardId, setOfferCardId] = useState('none');
  const [wantCardRarity, setWantCardRarity] = useState('any');
  const [targetEmail, setTargetEmail] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const getMax = (key) => {
    if (key === 'gold') return profile?.gold || 0;
    if (key === 'gems') return profile?.gems || 0;
    if (key === 'aether_dust') return inventory?.aether_dust || 0;
    if (key === 'spirit_water') return inventory?.spirit_water || 0;
    if (key === 'skill_shards') return inventory?.skill_shards || 0;
    if (key === 'fodder') return inventory?.fodder_cards || 0;

    return 0;
  };

  const enrichedCards = useMemo(() => {
    return (myPlayerCards || [])
      .map((pc) => {
        const card = (cards || []).find((c) => c.id === pc.card_id);
        return card ? { pc, card } : null;
      })
      .filter(Boolean);
  }, [myPlayerCards, cards]);

  const hasOffer =
    Object.values(offer).some((v) => Number(v) > 0) ||
    (offerCardId && offerCardId !== 'none');

  const hasWant =
    Object.values(want).some((v) => Number(v) > 0) ||
    wantCardRarity !== 'any';

  const resetForm = () => {
    setOffer(EMPTY_TRADE_VALUES);
    setWant(EMPTY_TRADE_VALUES);
    setOfferCardId('none');
    setWantCardRarity('any');
    setTargetEmail('');
    setNote('');
  };

  const submit = async () => {
    if (!myEmail) {
      toast.error('You need to be logged in to post a trade');
      return;
    }

    if (!profile || !inventory) {
      toast.error('Profile or inventory has not loaded yet');
      return;
    }

    if (!hasOffer) {
      toast.error('Add at least one item to offer');
      return;
    }

    if (!hasWant) {
      toast.error('Add at least one item to want');
      return;
    }

    if (tradeType === 'private' && !targetEmail) {
      toast.error('Select a friend');
      return;
    }

    const offeredValues = {
      gold: Number(offer.gold || 0),
      gems: Number(offer.gems || 0),
      aether_dust: Number(offer.aether_dust || 0),
      spirit_water: Number(offer.spirit_water || 0),
      skill_shards: Number(offer.skill_shards || 0),
      fodder: Number(offer.fodder || 0),
    };

    const wantedValues = {
      gold: Number(want.gold || 0),
      gems: Number(want.gems || 0),
      aether_dust: Number(want.aether_dust || 0),
      spirit_water: Number(want.spirit_water || 0),
      skill_shards: Number(want.skill_shards || 0),
      fodder: Number(want.fodder || 0),
    };

    for (const currency of CURRENCIES) {
      const amount = offeredValues[currency.key] || 0;
      const max = getMax(currency.key);

      if (amount > max) {
        toast.error(`Not enough ${currency.label}`);
        return;
      }

      if (amount < 0) {
        toast.error(`${currency.label} cannot be negative`);
        return;
      }
    }

    const selectedCard = enrichedCards.find((e) => e.pc.id === offerCardId);

    setSaving(true);

    try {
      const now = new Date().toISOString();

      /**
       * Create the trade post first.
       * This stores what the poster is offering and what they want back.
       */
      const { error: tradeError } = await supabase.from('trade_posts').insert({
        poster_email: myEmail,
        poster_display_name: myDisplayName || myEmail,
        trade_type: tradeType,
        target_email: tradeType === 'private' ? targetEmail : null,
        status: 'open',

        offer_gold: offeredValues.gold,
        offer_gems: offeredValues.gems,
        offer_aether_dust: offeredValues.aether_dust,
        offer_spirit_water: offeredValues.spirit_water,
        offer_skill_shards: offeredValues.skill_shards,
        offer_fodder: offeredValues.fodder,

        offer_card_id: selectedCard?.pc.id || null,
        offer_card_name: selectedCard?.card.name || null,

        want_gold: wantedValues.gold,
        want_gems: wantedValues.gems,
        want_aether_dust: wantedValues.aether_dust,
        want_spirit_water: wantedValues.spirit_water,
        want_skill_shards: wantedValues.skill_shards,
        want_fodder: wantedValues.fodder,

        want_card_rarity:
          wantCardRarity && wantCardRarity !== 'any' ? wantCardRarity : null,

        note: note.trim() || null,
        created_at: now,
        updated_at: now,
      });

      if (tradeError) {
        throw tradeError;
      }

      /**
       * Remove offered gold/gems from the poster immediately.
       */
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gold: (profile.gold || 0) - offeredValues.gold,
          gems: (profile.gems || 0) - offeredValues.gems,
          updated_at: now,
        })
        .eq('id', profile.id);

      if (profileError) {
        throw profileError;
      }

      /**
       * Remove offered materials from the poster immediately.
       */
      const { error: inventoryError } = await supabase
        .from('player_inventory')
        .update({
          aether_dust:
            (inventory.aether_dust || 0) - offeredValues.aether_dust,
          spirit_water:
            (inventory.spirit_water || 0) - offeredValues.spirit_water,
          skill_shards:
            (inventory.skill_shards || 0) - offeredValues.skill_shards,
          fodder_cards:
            (inventory.fodder_cards || 0) - offeredValues.fodder,
          updated_at: now,
        })
        .eq('id', inventory.id);

      if (inventoryError) {
        throw inventoryError;
      }

      /**
       * Optional card handling:
       * For now this marks the offered card as locked in trade.
       * This assumes player_cards has trade_locked and trade_locked_at columns.
       */
      if (selectedCard?.pc?.id) {
        const { error: cardError } = await supabase
          .from('player_cards')
          .update({
            trade_locked: true,
            trade_locked_at: now,
            updated_at: now,
          })
          .eq('id', selectedCard.pc.id);

        if (cardError) {
          throw cardError;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['tradePosts'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      toast.success('Trade posted!');
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not post trade');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            {tradeType === 'bazaar'
              ? '🏪 Post to Bazaar'
              : '🔒 Private Trade Offer'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {tradeType === 'private' && (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">
                Send to Friend
              </p>

              <Select value={targetEmail} onValueChange={setTargetEmail}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select friend…" />
                </SelectTrigger>

                <SelectContent>
                  {eligibleFriends.map((email) => (
                    <SelectItem
                      key={email}
                      value={email}
                      className="text-xs"
                    >
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <div className="grid grid-cols-3 text-[9px] text-center text-muted-foreground font-semibold uppercase tracking-wider">
              <span />
              <span>Offer</span>
              <span>Want</span>
            </div>

            {CURRENCIES.map((c) => (
              <div key={c.key} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-center">{c.icon}</span>

                <span className="flex-1 text-muted-foreground text-[11px]">
                  {c.label}
                </span>

                <Input
                  type="number"
                  min={0}
                  max={getMax(c.key)}
                  value={offer[c.key] || ''}
                  onChange={(e) => {
                    const value = Math.max(
                      0,
                      Math.min(Number(e.target.value || 0), getMax(c.key))
                    );

                    setOffer((previous) => ({
                      ...previous,
                      [c.key]: value,
                    }));
                  }}
                  className="w-16 h-7 text-xs text-center px-1"
                  placeholder="0"
                />

                <Input
                  type="number"
                  min={0}
                  value={want[c.key] || ''}
                  onChange={(e) => {
                    const value = Math.max(0, Number(e.target.value || 0));

                    setWant((previous) => ({
                      ...previous,
                      [c.key]: value,
                    }));
                  }}
                  className="w-16 h-7 text-xs text-center px-1"
                  placeholder="0"
                />
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">
              Also Offer a Card optional
            </p>

            <Select value={offerCardId} onValueChange={setOfferCardId}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="None" />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="none" className="text-xs">
                  None
                </SelectItem>

                {enrichedCards.map(({ pc, card }) => (
                  <SelectItem key={pc.id} value={pc.id} className="text-xs">
                    {card.name} Lv.{pc.level} [{card.rarity}]
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">
              Also Want a Card Rarity optional
            </p>

            <Select value={wantCardRarity} onValueChange={setWantCardRarity}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                {['any', 'common', 'rare', 'epic', 'legendary'].map((r) => (
                  <SelectItem
                    key={r}
                    value={r}
                    className="text-xs capitalize"
                  >
                    {r === 'any' ? 'Any / None' : r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <p className="text-xs text-muted-foreground font-semibold">
              Note optional
            </p>

            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a message…"
              className="h-8 text-xs"
              maxLength={80}
            />
          </div>

          <Button onClick={submit} disabled={saving} className="w-full">
            {saving ? 'Posting…' : 'Post Trade'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}