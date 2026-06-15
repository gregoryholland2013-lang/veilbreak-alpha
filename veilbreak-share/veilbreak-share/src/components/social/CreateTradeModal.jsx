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

const TRADE_RESOURCES = [
  { key: 'gold', icon: '🪙', label: 'Gold', source: 'profile' },
  { key: 'aether_dust', icon: '✨', label: 'Aether Dust', source: 'inventory' },
  { key: 'spirit_water', icon: '💧', label: 'Spirit Water', source: 'inventory' },
  { key: 'skill_shards', icon: '⚗️', label: 'Skill Shards', source: 'inventory' },
  { key: 'fodder_cards', icon: '🃏', label: 'Fodder', source: 'inventory' },
  {
    key: 'ironveil_core_fragments',
    icon: '💠',
    label: 'Ironveil Core',
    source: 'inventory',
  },
  {
    key: 'ironveil_summon_shards',
    icon: '🔮',
    label: 'Ironveil Shard',
    source: 'inventory',
  },
];

const EMPTY_VALUES = TRADE_RESOURCES.reduce((acc, item) => {
  acc[item.key] = 0;
  return acc;
}, {});

function numberValue(value) {
  return Math.max(0, Number(value || 0));
}

function getOwnedStat(playerCard, card, key) {
  if (key === 'attack') {
    return Number(
      playerCard?.attack ??
        playerCard?.stage_base_attack ??
        card?.base_attack ??
        0
    );
  }

  if (key === 'defense') {
    return Number(
      playerCard?.defense ??
        playerCard?.stage_base_defense ??
        card?.base_defense ??
        0
    );
  }

  if (key === 'hp') {
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

function buildCardLabel(playerCard, card) {
  const attack = getOwnedStat(playerCard, card, 'attack');
  const defense = getOwnedStat(playerCard, card, 'defense');
  const hp = getOwnedStat(playerCard, card, 'hp');

  return `${card.name} Lv.${playerCard.level || 1} [${card.rarity}] · ${attack}/${defense}/${hp}`;
}

function cleanAssets(values, selectedCards = []) {
  const cleaned = {};

  TRADE_RESOURCES.forEach((resource) => {
    const amount = numberValue(values?.[resource.key]);

    if (amount > 0) {
      cleaned[resource.key] = amount;
    }
  });

  if (selectedCards.length > 0) {
    cleaned.cards = selectedCards;
  }

  return cleaned;
}

function hasAssets(data) {
  if (!data) return false;

  const hasResource = TRADE_RESOURCES.some((resource) => {
    return Number(data?.[resource.key] || 0) > 0;
  });

  const hasCards = Array.isArray(data?.cards) && data.cards.length > 0;

  return hasResource || hasCards;
}

function SummaryPills({ data }) {
  const items = [];

  TRADE_RESOURCES.forEach((resource) => {
    const amount = Number(data?.[resource.key] || 0);

    if (amount > 0) {
      items.push(`${resource.icon} ${amount} ${resource.label}`);
    }
  });

  const selectedCards = Array.isArray(data?.cards) ? data.cards : [];

  selectedCards.forEach((card) => {
    items.push(`🎴 ${card.card_name || card.name || 'Card'}`);
  });

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nothing</p>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span
          key={item}
          className="rounded-md bg-muted/60 px-2 py-1 text-[10px] font-semibold"
        >
          {item}
        </span>
      ))}
    </div>
  );
}

export default function CreateTradeModal({
  open,
  onClose,
  profile,
  inventory,
  myPlayerCards = [],
  cards = [],
  myEmail,
  myDisplayName,
}) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [offer, setOffer] = useState(EMPTY_VALUES);
  const [want, setWant] = useState(EMPTY_VALUES);
  const [offerCardId, setOfferCardId] = useState('none');
  const [wantCardId, setWantCardId] = useState('none');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  const enrichedOwnedCards = useMemo(() => {
    return (myPlayerCards || [])
      .filter((pc) => !pc.trade_locked)
      .map((pc) => {
        const card = (cards || []).find((c) => c.id === pc.card_id);

        if (!card) return null;

        return { pc, card };
      })
      .filter(Boolean);
  }, [myPlayerCards, cards]);

  const selectedOfferCard = useMemo(() => {
    if (offerCardId === 'none') return null;

    return (
      enrichedOwnedCards.find((item) => item.pc.id === offerCardId) || null
    );
  }, [offerCardId, enrichedOwnedCards]);

  const selectedWantCard = useMemo(() => {
    if (wantCardId === 'none') return null;

    return (cards || []).find((card) => card.id === wantCardId) || null;
  }, [wantCardId, cards]);

  const offerData = useMemo(() => {
    const offeredCards = selectedOfferCard
      ? [
          {
            player_card_id: selectedOfferCard.pc.id,
            card_id: selectedOfferCard.card.id,
            card_name: selectedOfferCard.card.name,
            rarity: selectedOfferCard.card.rarity,
            level: selectedOfferCard.pc.level || 1,
          },
        ]
      : [];

    return cleanAssets(offer, offeredCards);
  }, [offer, selectedOfferCard]);

  const wantData = useMemo(() => {
    const wantedCards = selectedWantCard
      ? [
          {
            card_id: selectedWantCard.id,
            card_name: selectedWantCard.name,
            rarity: selectedWantCard.rarity,
          },
        ]
      : [];

    return cleanAssets(want, wantedCards);
  }, [want, selectedWantCard]);

  const getMax = (key) => {
    if (key === 'gold') {
      return Number(profile?.gold || 0);
    }

    return Number(inventory?.[key] || 0);
  };

  const resetForm = () => {
    setTitle('');
    setNote('');
    setOffer({ ...EMPTY_VALUES });
    setWant({ ...EMPTY_VALUES });
    setOfferCardId('none');
    setWantCardId('none');
    setConfirming(false);
    setSaving(false);
  };

  const validateBeforeConfirm = () => {
  const block = (message) => {
    console.warn('Bazaar review blocked:', message, {
      myEmail,
      profile,
      inventory,
      offer,
      want,
      offerCardId,
      wantCardId,
      offerData,
      wantData,
    });

    toast.error(message);
    alert(message);
    return false;
  };

  if (!myEmail) {
    return block('You need to be logged in to post a trade');
  }

  if (!hasAssets(offerData)) {
    return block('Add at least one offered item or card');
  }

  if (!hasAssets(wantData)) {
    return block('Add at least one requested item or card');
  }

  for (const resource of TRADE_RESOURCES) {
    const amount = Number(offer[resource.key] || 0);

    if (amount < 0) {
      return block(`${resource.label} cannot be negative`);
    }

    if (amount === 0) {
      continue;
    }

    if (resource.key === 'gold' && !profile) {
      return block('Profile has not loaded yet, so gold cannot be offered');
    }

    if (resource.key !== 'gold' && !inventory) {
      return block(`${resource.label} inventory has not loaded yet`);
    }

    if (amount > getMax(resource.key)) {
      return block(`Not enough ${resource.label}`);
    }
  }

  console.log('Bazaar review passed:', {
    offerData,
    wantData,
  });

  setConfirming(true);
  return true;
};

  const submit = async () => {
    if (!validateBeforeConfirm()) return;

    setSaving(true);

    try {
      const payload = {
        p_title: title.trim() || 'Bazaar Trade',
        p_offer_data: offerData,
        p_want_data: wantData,
        p_note: note.trim() || '',
      };

      console.log('Posting Bazaar trade payload:', payload);

      const { data, error } = await supabase.rpc('post_bazaar_trade', payload);

      if (error) {
        console.error('post_bazaar_trade RPC error:', error);
        throw error;
      }

      console.log('Bazaar trade posted:', data);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tradePosts'] }),
        queryClient.invalidateQueries({ queryKey: ['tradeClaims'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
      ]);

      toast.success('Trade posted to Bazaar');
      resetForm();
      onClose();
    } catch (error) {
      console.error('Could not post Bazaar trade:', error);

      const message =
        error?.message ||
        error?.details ||
        error?.hint ||
        'Could not post trade';

      toast.error(message);
      alert(message);
    } finally {
      setSaving(false);
    }
  };

  const closeModal = () => {
    if (saving) return;

    resetForm();
    onClose();
  };

  const updateOfferAmount = (key, value) => {
    const max = getMax(key);
    const cleanValue = Math.min(numberValue(value), max);

    setOffer((previous) => ({
      ...previous,
      [key]: cleanValue,
    }));
  };

  const updateWantAmount = (key, value) => {
    setWant((previous) => ({
      ...previous,
      [key]: numberValue(value),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={closeModal}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">🏪 Post to Bazaar</DialogTitle>
        </DialogHeader>

        {!confirming ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-3">
              <p className="text-xs font-bold text-yellow-300">
                Gems are account-bound
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Gems cannot be offered or requested in Bazaar trades yet.
              </p>
            </div>

            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Trade title..."
              className="h-8 text-xs"
              maxLength={40}
            />

            <div className="space-y-2">
              <div className="grid grid-cols-[1fr_64px_64px] gap-2 text-[9px] text-center text-muted-foreground font-semibold uppercase tracking-wider">
                <span />
                <span>Offer</span>
                <span>Want</span>
              </div>

              {TRADE_RESOURCES.map((resource) => (
                <div
                  key={resource.key}
                  className="grid grid-cols-[1fr_64px_64px] gap-2 items-center text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center">{resource.icon}</span>
                    <span className="text-muted-foreground text-[11px] truncate">
                      {resource.label}
                    </span>
                  </div>

                  <Input
                    type="number"
                    min={0}
                    max={getMax(resource.key)}
                    value={offer[resource.key] || ''}
                    onChange={(event) =>
                      updateOfferAmount(resource.key, event.target.value)
                    }
                    className="w-16 h-7 text-xs text-center px-1"
                    placeholder="0"
                  />

                  <Input
                    type="number"
                    min={0}
                    value={want[resource.key] || ''}
                    onChange={(event) =>
                      updateWantAmount(resource.key, event.target.value)
                    }
                    className="w-16 h-7 text-xs text-center px-1"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">
                Offer Owned Card optional
              </p>

              <Select value={offerCardId} onValueChange={setOfferCardId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    None
                  </SelectItem>

                  {enrichedOwnedCards.map(({ pc, card }) => (
                    <SelectItem key={pc.id} value={pc.id} className="text-xs">
                      {buildCardLabel(pc, card)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {enrichedOwnedCards.length === 0 && (
                <p className="text-[10px] text-muted-foreground">
                  No unlocked owned cards available to trade.
                </p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">
                Request Specific Card optional
              </p>

              <Select value={wantCardId} onValueChange={setWantCardId}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="None" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="none" className="text-xs">
                    None
                  </SelectItem>

                  {(cards || []).map((card) => (
                    <SelectItem
                      key={card.id}
                      value={card.id}
                      className="text-xs"
                    >
                      {card.name} [{card.rarity}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Optional note..."
              className="h-8 text-xs"
              maxLength={80}
            />

            <Button
              type="button"
              onClick={validateBeforeConfirm}
              className="w-full"
            >
              Review Trade
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
              <p className="text-xs font-bold text-primary">
                Confirm Bazaar Listing
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Your offered items will be locked until another player accepts
                the trade or you cancel it.
              </p>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                Title
              </p>
              <p className="text-sm font-display text-primary">
                {title.trim() || 'Bazaar Trade'}
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                You Offer
              </p>
              <SummaryPills data={offerData} />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                You Want
              </p>
              <SummaryPills data={wantData} />
            </div>

            {note.trim() && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-muted-foreground uppercase">
                  Note
                </p>
                <p className="text-xs text-muted-foreground italic">
                  "{note.trim()}"
                </p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="flex-1"
              >
                Back
              </Button>

              <Button
                type="button"
                onClick={submit}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Posting…' : 'Confirm Post'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}