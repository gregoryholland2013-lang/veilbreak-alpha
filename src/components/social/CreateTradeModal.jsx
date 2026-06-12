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

function getOwnedStat(playerCard, card, key) {
  if (key === 'attack') {
    return Number(playerCard?.attack ?? card?.base_attack ?? 0);
  }

  if (key === 'defense') {
    return Number(playerCard?.defense ?? card?.base_defense ?? 0);
  }

  if (key === 'hp') {
    return Number(playerCard?.hp ?? playerCard?.max_hp ?? card?.base_hp ?? 0);
  }

  return 0;
}

function buildCardLabel(pc, card) {
  const attack = getOwnedStat(pc, card, 'attack');
  const defense = getOwnedStat(pc, card, 'defense');
  const hp = getOwnedStat(pc, card, 'hp');

  return `${card.name} Lv.${pc.level || 1} [${card.rarity}] · ${attack}/${defense}/${hp}`;
}

function cleanAssets(values, cards = []) {
  const cleaned = {};

  TRADE_RESOURCES.forEach((resource) => {
    const amount = Number(values?.[resource.key] || 0);

    if (amount > 0) {
      cleaned[resource.key] = amount;
    }
  });

  if (cards.length > 0) {
    cleaned.cards = cards;
  }

  return cleaned;
}

function hasAssets(data) {
  return Object.keys(data || {}).length > 0;
}

function SummaryPills({ data }) {
  const items = [];

  TRADE_RESOURCES.forEach((resource) => {
    const amount = Number(data?.[resource.key] || 0);

    if (amount > 0) {
      items.push(`${resource.icon} ${amount} ${resource.label}`);
    }
  });

  const cards = Array.isArray(data?.cards) ? data.cards : [];

  cards.forEach((card) => {
    items.push(`🎴 ${card.card_name || 'Card'}`);
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
        return card ? { pc, card } : null;
      })
      .filter(Boolean);
  }, [myPlayerCards, cards]);

  const getMax = (key) => {
  if (key === 'gold') return profile?.gold || 0;
  return inventory?.[key] || 0;
};
  const selectedOfferCard = useMemo(() => {
    if (offerCardId === 'none') return null;

    return enrichedOwnedCards.find((item) => item.pc.id === offerCardId) || null;
  }, [offerCardId, enrichedOwnedCards]);

  const selectedWantCard = useMemo(() => {
    if (wantCardId === 'none') return null;

    return (cards || []).find((card) => card.id === wantCardId) || null;
  }, [wantCardId, cards]);

  const offerData = useMemo(() => {
    const offerCards = selectedOfferCard
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

    return cleanAssets(offer, offerCards);
  }, [offer, selectedOfferCard]);

  const wantData = useMemo(() => {
    const wantCards = selectedWantCard
      ? [
          {
            card_id: selectedWantCard.id,
            card_name: selectedWantCard.name,
            rarity: selectedWantCard.rarity,
          },
        ]
      : [];

    return cleanAssets(want, wantCards);
  }, [want, selectedWantCard]);

  const resetForm = () => {
    setTitle('');
    setNote('');
    setOffer(EMPTY_VALUES);
    setWant(EMPTY_VALUES);
    setOfferCardId('none');
    setWantCardId('none');
    setConfirming(false);
  };

  const validateBeforeConfirm = () => {
  if (!myEmail) {
    toast.error('You need to be logged in to post a trade');
    return false;
  }

  if (!profile) {
    toast.error('Profile has not loaded yet');
    return false;
  }

  if (!hasAssets(offerData)) {
    toast.error('Add at least one offered item');
    return false;
  }

  if (!hasAssets(wantData)) {
    toast.error('Add at least one requested item');
    return false;
  }

  for (const resource of TRADE_RESOURCES) {
    const amount = Number(offer[resource.key] || 0);

    if (amount < 0) {
      toast.error(`${resource.label} cannot be negative`);
      return false;
    }

    if (amount > getMax(resource.key)) {
      toast.error(`Not enough ${resource.label}`);
      return false;
    }
  }

  setConfirming(true);
  return true;
};

  const submit = async () => {
    if (!validateBeforeConfirm()) return;

    setSaving(true);

    try {
      const { error } = await supabase.rpc('post_bazaar_trade', {
        p_title: title.trim() || 'Bazaar Trade',
        p_offer_data: offerData,
        p_want_data: wantData,
        p_note: note.trim(),
      });

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['tradePosts'] });
      queryClient.invalidateQueries({ queryKey: ['tradeClaims'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
      queryClient.invalidateQueries({ queryKey: ['playerCards'] });

      toast.success('Trade posted to Bazaar');
      resetForm();
      onClose();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not post trade');
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    if (!saving) {
      resetForm();
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            🏪 Post to Bazaar
          </DialogTitle>
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Trade title..."
              className="h-8 text-xs"
              maxLength={40}
            />

            <div className="space-y-2">
              <div className="grid grid-cols-3 text-[9px] text-center text-muted-foreground font-semibold uppercase tracking-wider">
                <span />
                <span>Offer</span>
                <span>Want</span>
              </div>

              {TRADE_RESOURCES.map((resource) => (
                <div key={resource.key} className="flex items-center gap-2 text-xs">
                  <span className="w-5 text-center">{resource.icon}</span>

                  <span className="flex-1 text-muted-foreground text-[11px]">
                    {resource.label}
                  </span>

                  <Input
                    type="number"
                    min={0}
                    max={getMax(resource.key)}
                    value={offer[resource.key] || ''}
                    onChange={(e) => {
                      const value = Math.max(
                        0,
                        Math.min(
                          Number(e.target.value || 0),
                          getMax(resource.key)
                        )
                      );

                      setOffer((previous) => ({
                        ...previous,
                        [resource.key]: value,
                      }));
                    }}
                    className="w-16 h-7 text-xs text-center px-1"
                    placeholder="0"
                  />

                  <Input
                    type="number"
                    min={0}
                    value={want[resource.key] || ''}
                    onChange={(e) => {
                      const value = Math.max(0, Number(e.target.value || 0));

                      setWant((previous) => ({
                        ...previous,
                        [resource.key]: value,
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
                    <SelectItem key={card.id} value={card.id} className="text-xs">
                      {card.name} [{card.rarity}]
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Input
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
                Your offered items will be locked until someone accepts this trade
                or you cancel it.
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

            <div className="flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setConfirming(false)}
                disabled={saving}
                className="flex-1"
              >
                Back
              </Button>

              <Button onClick={submit} disabled={saving} className="flex-1">
                {saving ? 'Posting…' : 'Confirm Post'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}