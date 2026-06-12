import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Store, Gift, AlertCircle } from 'lucide-react';
import TradeCard from './TradeCard';
import CreateTradeModal from './CreateTradeModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const RESOURCE_META = [
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

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

function assetAmount(data, key) {
  return Number(data?.[key] || 0);
}

function getOwnedStat(playerCard, card, key) {
  if (key === 'attack') return Number(playerCard?.attack ?? card?.base_attack ?? 0);
  if (key === 'defense') return Number(playerCard?.defense ?? card?.base_defense ?? 0);
  if (key === 'hp') return Number(playerCard?.hp ?? playerCard?.max_hp ?? card?.base_hp ?? 0);
  return 0;
}

function buildAcceptData(trade, selectedCardsByCardId, matchingOwnedCards) {
  const want = trade?.want_data || {};
  const data = {};

  RESOURCE_META.forEach((resource) => {
    const amount = assetAmount(want, resource.key);

    if (amount > 0) {
      data[resource.key] = amount;
    }
  });

  const wantedCards = Array.isArray(want.cards) ? want.cards : [];

  const acceptedCards = wantedCards
    .map((wantedCard) => {
      const selectedPlayerCardId = selectedCardsByCardId[wantedCard.card_id];

      const selected = matchingOwnedCards.find(
        (item) => item.pc.id === selectedPlayerCardId
      );

      if (!selected) return null;

      return {
        player_card_id: selected.pc.id,
        card_id: selected.card.id,
        card_name: selected.card.name,
        rarity: selected.card.rarity,
        level: selected.pc.level || 1,
      };
    })
    .filter(Boolean);

  if (acceptedCards.length > 0) {
    data.cards = acceptedCards;
  }

  return data;
}

function AcceptTradeModal({
  trade,
  open,
  onClose,
  onConfirm,
  profile,
  inventory,
  myPlayerCards,
  cards,
  processing,
}) {
  const [selectedCardsByCardId, setSelectedCardsByCardId] = useState({});

  const want = trade?.want_data || {};
  const wantedCards = Array.isArray(want.cards) ? want.cards : [];

  const enrichedOwnedCards = useMemo(() => {
    return (myPlayerCards || [])
      .filter((pc) => !pc.trade_locked)
      .map((pc) => {
        const card = (cards || []).find((c) => c.id === pc.card_id);
        return card ? { pc, card } : null;
      })
      .filter(Boolean);
  }, [myPlayerCards, cards]);

  const matchingOwnedCards = useMemo(() => {
    return enrichedOwnedCards.filter((item) => {
      return wantedCards.some((wanted) => wanted.card_id === item.card.id);
    });
  }, [enrichedOwnedCards, wantedCards]);

  const missingResources = useMemo(() => {
  const missing = [];

  RESOURCE_META.forEach((resource) => {
    const needed = assetAmount(want, resource.key);

    if (needed <= 0) return;

    const have =
      resource.source === 'profile'
        ? Number(profile?.[resource.key] || 0)
        : Number(inventory?.[resource.key] || 0);

    if (needed > have) {
      missing.push(`${resource.label}: need ${needed}, have ${have}`);
    }
  });

  return missing;
}, [want, profile, inventory]);

  const missingCards = useMemo(() => {
    return wantedCards.filter((wanted) => {
      return !matchingOwnedCards.some((item) => item.card.id === wanted.card_id);
    });
  }, [wantedCards, matchingOwnedCards]);

  const allWantedCardsSelected = wantedCards.every((wanted) => {
    return Boolean(selectedCardsByCardId[wanted.card_id]);
  });

  const canAccept =
    missingResources.length === 0 &&
    missingCards.length === 0 &&
    allWantedCardsSelected;

  const acceptData = useMemo(() => {
    return buildAcceptData(trade, selectedCardsByCardId, matchingOwnedCards);
  }, [trade, selectedCardsByCardId, matchingOwnedCards]);

  if (!trade) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">
            Confirm Bazaar Trade
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
            <p className="text-xs font-bold text-primary">
              First come, first serve
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              If another player accepts first, this listing will no longer be available.
              After acceptance, both sides must claim their completed trade.
            </p>
          </div>

          {RESOURCE_META.some((resource) => assetAmount(want, resource.key) > 0) && (
            <div className="space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                You Will Pay
              </p>

              <div className="flex flex-wrap gap-1">
                {RESOURCE_META.map((resource) => {
                  const amount = assetAmount(want, resource.key);

                  if (amount <= 0) return null;

                  return (
                    <span
                      key={resource.key}
                      className="rounded-md bg-muted/60 px-2 py-1 text-[10px] font-semibold"
                    >
                      {resource.icon} {amount} {resource.label}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {wantedCards.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-bold text-muted-foreground uppercase">
                Select Requested Card
              </p>

              {wantedCards.map((wantedCard) => {
                const options = matchingOwnedCards.filter(
                  (item) => item.card.id === wantedCard.card_id
                );

                return (
                  <div key={wantedCard.card_id} className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      Requested: {wantedCard.card_name}
                    </p>

                    <Select
                      value={selectedCardsByCardId[wantedCard.card_id] || ''}
                      onValueChange={(value) => {
                        setSelectedCardsByCardId((prev) => ({
                          ...prev,
                          [wantedCard.card_id]: value,
                        }));
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Choose owned card..." />
                      </SelectTrigger>

                      <SelectContent>
                        {options.map(({ pc, card }) => (
                          <SelectItem key={pc.id} value={pc.id} className="text-xs">
                            {card.name} Lv.{pc.level || 1} ·{' '}
                            {getOwnedStat(pc, card, 'attack')}/
                            {getOwnedStat(pc, card, 'defense')}/
                            {getOwnedStat(pc, card, 'hp')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          )}

          {(missingResources.length > 0 || missingCards.length > 0) && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-destructive">
                    Cannot accept yet
                  </p>

                  {missingResources.map((item) => (
                    <p key={item} className="text-[11px] text-muted-foreground">
                      {item}
                    </p>
                  ))}

                  {missingCards.map((card) => (
                    <p
                      key={card.card_id}
                      className="text-[11px] text-muted-foreground"
                    >
                      Missing card: {card.card_name}
                    </p>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="ghost"
              disabled={processing}
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>

            <Button
              disabled={!canAccept || processing}
              onClick={() => onConfirm(acceptData)}
              className="flex-1"
            >
              {processing ? 'Accepting…' : 'Confirm Accept'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function BazaarTab() {
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [selectedAcceptTrade, setSelectedAcceptTrade] = useState(null);
  const [processingTradeId, setProcessingTradeId] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('bazaar-tab-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_posts' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tradePosts'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'trade_claims' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tradeClaims'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_inventory' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'player_cards' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerCards'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: getAuthUser,
  });

  const myEmail = authUser?.email || null;
  const userId = authUser?.id || null;

  const { data: trades = [], isLoading } = useQuery({
    queryKey: ['tradePosts', 'bazaar'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_posts')
        .select('*')
        .eq('trade_type', 'bazaar')
        .in('status', ['open', 'accepted', 'completed'])
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      return data || [];
    },
  });

  const { data: claims = [] } = useQuery({
    queryKey: ['tradeClaims', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_claims')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: profile = null } = useQuery({
    queryKey: ['playerProfile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  const { data: inventory = null } = useQuery({
  queryKey: ['playerInventory', userId],
  enabled: !!userId,
  queryFn: async () => {
    const { data: existing, error: fetchError } = await supabase
      .from('player_inventory')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existing) return existing;

    const now = new Date().toISOString();

    const { data: created, error: createError } = await supabase
      .from('player_inventory')
      .insert({
        id: userId,
        user_id: userId,
        email: myEmail,
        skill_shards: 0,
        fodder_cards: 0,
        quests_completed: 0,
        boss_quests_cleared: 0,
        aether_dust: 0,
        spirit_water: 0,
        ironveil_core_fragments: 0,
        ironveil_reputation: 0,
        ironveil_summon_shards: 0,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    if (createError) throw createError;

    return created;
  },
});

  const { data: myPlayerCards = [] } = useQuery({
    queryKey: ['playerCards', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const openTrades = useMemo(() => {
    return trades.filter((trade) => trade.status === 'open');
  }, [trades]);

  const myTrades = useMemo(() => {
    return trades.filter((trade) => trade.poster_id === userId);
  }, [trades, userId]);

  const otherOpenTrades = useMemo(() => {
    return openTrades.filter((trade) => trade.poster_id !== userId);
  }, [openTrades, userId]);

  const pendingClaims = useMemo(() => {
    return claims.filter((claim) => claim.status === 'pending');
  }, [claims]);

  const tradeById = useMemo(() => {
    const map = new Map();

    trades.forEach((trade) => {
      map.set(trade.id, trade);
    });

    return map;
  }, [trades]);

  const acceptTrade = async (trade, acceptData) => {
  if (!myEmail || !userId) {
    toast.error('You need to be logged in');
    return;
  }

  if (trade.poster_id === userId) {
    toast.error("Can't accept your own trade");
    return;
  }

  setProcessingTradeId(trade.id);

  try {
    const { error } = await supabase.rpc('accept_bazaar_trade', {
      p_trade_id: trade.id,
      p_accept_data: acceptData,
    });

    if (error) throw error;

    toast.success('Trade accepted! Both sides can now claim.');

    setSelectedAcceptTrade(null);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['tradePosts'] }),
      queryClient.invalidateQueries({ queryKey: ['tradeClaims'] }),
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
      queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
    ]);
  } catch (error) {
    console.error('Could not accept Bazaar trade:', error);

    const message =
      error?.message ||
      error?.details ||
      error?.hint ||
      'Could not accept trade';

    toast.error(message);
    alert(message);
  } finally {
    setProcessingTradeId(null);
  }
};

  const claimTrade = async (claim) => {
    setProcessingTradeId(claim.trade_id);

    try {
      const { error } = await supabase.rpc('claim_bazaar_trade', {
        p_trade_id: claim.trade_id,
      });

      if (error) throw error;

      toast.success('Trade claimed!');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tradePosts'] }),
        queryClient.invalidateQueries({ queryKey: ['tradeClaims'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not claim trade');
    } finally {
      setProcessingTradeId(null);
    }
  };

  const cancelTrade = async (trade) => {
    if (trade.poster_id !== userId) {
      toast.error('You can only cancel your own trade');
      return;
    }

    setProcessingTradeId(trade.id);

    try {
      const { error } = await supabase.rpc('cancel_bazaar_trade', {
        p_trade_id: trade.id,
      });

      if (error) throw error;

      toast.success('Trade cancelled and escrow returned');

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tradePosts'] }),
        queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
        queryClient.invalidateQueries({ queryKey: ['playerInventory'] }),
        queryClient.invalidateQueries({ queryKey: ['playerCards'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not cancel trade');
    } finally {
      setProcessingTradeId(null);
    }
  };

  return (
    <div className="p-4 space-y-5">
      <div className="rounded-xl border border-yellow-400/30 bg-yellow-500/10 p-3">
        <p className="text-xs font-bold text-yellow-300">
          Bazaar Escrow Active
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Trades are first come, first serve. Once accepted, both users must claim
          their completed trade. Gems are account-bound and cannot be traded yet.
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm">Public Bazaar</p>
          <p className="text-[10px] text-muted-foreground">
            Anyone can accept your listings
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Post Trade
        </Button>
      </div>

      {pendingClaims.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider flex items-center gap-1">
            <Gift className="w-3.5 h-3.5 text-primary" />
            Pending Claims ({pendingClaims.length})
          </p>

          {pendingClaims.map((claim) => {
            const trade = tradeById.get(claim.trade_id) || {
              id: claim.trade_id,
              title: 'Completed Bazaar Trade',
              status: claim.status,
            };

            return (
              <TradeCard
                key={claim.id}
                trade={trade}
                claim={claim}
                onClaim={() => claimTrade(claim)}
              />
            );
          })}
        </div>
      )}

      {myTrades.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Your Listings
          </p>

          {myTrades.map((trade) => (
            <TradeCard
              key={trade.id}
              trade={trade}
              isOwn
              onCancel={
                trade.status === 'open'
                  ? () => cancelTrade(trade)
                  : undefined
              }
            />
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Open Listings ({otherOpenTrades.length})
        </p>

        {isLoading && (
          <p className="text-xs text-muted-foreground animate-pulse">
            Loading…
          </p>
        )}

        {!isLoading && otherOpenTrades.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Store className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No trades posted yet</p>
          </div>
        )}

        <AnimatePresence>
          {otherOpenTrades.map((trade) => (
            <motion.div
              key={trade.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <TradeCard
                trade={trade}
                onAccept={() => setSelectedAcceptTrade(trade)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <CreateTradeModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        profile={profile}
        inventory={inventory}
        myPlayerCards={myPlayerCards}
        cards={cards}
        myEmail={myEmail}
        myDisplayName={profile?.full_name || profile?.username || myEmail}
      />

      <AcceptTradeModal
        trade={selectedAcceptTrade}
        open={!!selectedAcceptTrade}
        onClose={() => setSelectedAcceptTrade(null)}
        onConfirm={(acceptData) => {
          if (selectedAcceptTrade) {
            acceptTrade(selectedAcceptTrade, acceptData);
          }
        }}
        profile={profile}
        inventory={inventory}
        myPlayerCards={myPlayerCards}
        cards={cards}
        processing={!!processingTradeId}
      />
    </div>
  );
}