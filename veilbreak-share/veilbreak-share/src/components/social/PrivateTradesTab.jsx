import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, ArrowLeftRight } from 'lucide-react';
import TradeCard from './TradeCard';
import CreateTradeModal from './CreateTradeModal';

export default function PrivateTradesTab() {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  /**
   * Supabase Realtime
   * Keeps private trades, friendships, profile, inventory, and cards reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('private-trades-tab-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'trade_posts',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tradePosts'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friendships'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_inventory',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerInventory'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_cards',
        },
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
    queryFn: async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) throw error;

      return user;
    },
  });

  const myEmail = authUser?.email || null;
  const userId = authUser?.id || null;

  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships', myEmail],
    enabled: !!myEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_email.eq.${myEmail},recipient_email.eq.${myEmail}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: trades = [] } = useQuery({
    queryKey: ['tradePosts', 'private', myEmail],
    enabled: !!myEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('trade_posts')
        .select('*')
        .eq('trade_type', 'private')
        .or(`poster_email.eq.${myEmail},target_email.eq.${myEmail}`)
        .order('created_at', { ascending: false })
        .limit(100);

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
      const { data, error } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data;
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

  const eligibleFriends = useMemo(() => {
    return friendships
      .filter((f) => {
        if (f.status !== 'accepted') return false;

        const acceptedAt = f.accepted_at ? new Date(f.accepted_at) : null;
        if (!acceptedAt) return false;

        const hoursSince = (Date.now() - acceptedAt.getTime()) / 3600000;
        return hoursSince >= 48;
      })
      .map((f) =>
        f.requester_email === myEmail ? f.recipient_email : f.requester_email
      );
  }, [friendships, myEmail]);

  const incoming = useMemo(() => {
    return trades.filter(
      (t) => t.target_email === myEmail && t.status === 'open'
    );
  }, [trades, myEmail]);

  const outgoing = useMemo(() => {
    return trades.filter(
      (t) => t.poster_email === myEmail && t.status === 'open'
    );
  }, [trades, myEmail]);

  const history = useMemo(() => {
    return trades.filter((t) => t.status !== 'open');
  }, [trades]);

  const acceptTrade = async (trade) => {
    if (!myEmail || !profile || !inventory) {
      toast.error('Profile or inventory not loaded yet');
      return;
    }

    if (trade.target_email !== myEmail) {
      toast.error('This trade is not addressed to you');
      return;
    }

    if (trade.status !== 'open') {
      toast.error('This trade is no longer open');
      return;
    }

    const checks = [
      [trade.want_gold, profile.gold, 'Gold'],
      [trade.want_gems, profile.gems, 'Gems'],
      [trade.want_aether_dust, inventory.aether_dust, 'Aether Dust'],
      [trade.want_spirit_water, inventory.spirit_water, 'Spirit Water'],
      [trade.want_skill_shards, inventory.skill_shards, 'Skill Shards'],
      [trade.want_fodder, inventory.fodder_cards, 'Fodder'],
    ];

    for (const [needed, have, name] of checks) {
      if ((needed || 0) > (have || 0)) {
        toast.error(`Not enough ${name}`);
        return;
      }
    }

    try {
      const now = new Date().toISOString();

      /**
       * Re-check latest trade before accepting.
       * Prevents accepting stale/cancelled/completed offers.
       */
      const { data: latestTrade, error: tradeFetchError } = await supabase
        .from('trade_posts')
        .select('*')
        .eq('id', trade.id)
        .single();

      if (tradeFetchError) throw tradeFetchError;

      if (!latestTrade || latestTrade.status !== 'open') {
        toast.error('This trade is no longer available');
        return;
      }

      if (latestTrade.target_email !== myEmail) {
        toast.error('This trade is not addressed to you');
        return;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gold:
            (profile.gold || 0) +
            (latestTrade.offer_gold || 0) -
            (latestTrade.want_gold || 0),
          gems:
            (profile.gems || 0) +
            (latestTrade.offer_gems || 0) -
            (latestTrade.want_gems || 0),
          updated_at: now,
        })
        .eq('id', profile.id);

      if (profileError) throw profileError;

      const { error: inventoryError } = await supabase
        .from('player_inventory')
        .update({
          aether_dust:
            (inventory.aether_dust || 0) +
            (latestTrade.offer_aether_dust || 0) -
            (latestTrade.want_aether_dust || 0),
          spirit_water:
            (inventory.spirit_water || 0) +
            (latestTrade.offer_spirit_water || 0) -
            (latestTrade.want_spirit_water || 0),
          skill_shards:
            (inventory.skill_shards || 0) +
            (latestTrade.offer_skill_shards || 0) -
            (latestTrade.want_skill_shards || 0),
          fodder_cards:
            (inventory.fodder_cards || 0) +
            (latestTrade.offer_fodder || 0) -
            (latestTrade.want_fodder || 0),
          updated_at: now,
        })
        .eq('id', inventory.id);

      if (inventoryError) throw inventoryError;

      const { error: tradeError } = await supabase
        .from('trade_posts')
        .update({
          status: 'completed',
          accepted_by_email: myEmail,
          accepted_at: now,
          updated_at: now,
        })
        .eq('id', latestTrade.id)
        .eq('status', 'open');

      if (tradeError) throw tradeError;

      queryClient.invalidateQueries({ queryKey: ['tradePosts'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
      queryClient.invalidateQueries({ queryKey: ['playerInventory'] });

      toast.success('Trade completed!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not complete trade');
    }
  };

  const cancelTrade = async (trade) => {
    if (!myEmail) {
      toast.error('You need to be logged in');
      return;
    }

    if (trade.poster_email !== myEmail && trade.target_email !== myEmail) {
      toast.error('You cannot cancel this trade');
      return;
    }

    try {
      const { error } = await supabase
        .from('trade_posts')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', trade.id)
        .eq('status', 'open');

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['tradePosts'] });

      toast.success('Trade cancelled');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not cancel trade');
    }
  };

  if (!myEmail) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display font-bold text-sm">Private Trades</p>
          <p className="text-[10px] text-muted-foreground">
            Friends 48h+ · {eligibleFriends.length} eligible
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setShowCreate(true)}
          disabled={eligibleFriends.length === 0}
          className="gap-1.5"
        >
          <Plus className="w-4 h-4" /> Offer Trade
        </Button>
      </div>

      {eligibleFriends.length === 0 && (
        <div className="bg-muted/30 border border-border rounded-xl p-4 text-center text-sm text-muted-foreground">
          Friends must be added for 48+ hours before trading privately.
        </div>
      )}

      {incoming.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Incoming ({incoming.length})
          </p>

          {incoming.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              onAccept={() => acceptTrade(t)}
              onCancel={() => cancelTrade(t)}
            />
          ))}
        </div>
      )}

      {outgoing.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Your Offers
          </p>

          {outgoing.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              isOwn
              onCancel={() => cancelTrade(t)}
            />
          ))}
        </div>
      )}

      {history.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            History
          </p>

          {history.slice(0, 10).map((t) => (
            <TradeCard key={t.id} trade={t} isHistory />
          ))}
        </div>
      )}

      {incoming.length === 0 && outgoing.length === 0 && history.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <ArrowLeftRight className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No private trades yet</p>
        </div>
      )}

      <CreateTradeModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        tradeType="private"
        eligibleFriends={eligibleFriends}
        profile={profile}
        inventory={inventory}
        myPlayerCards={myPlayerCards}
        cards={cards}
        myEmail={myEmail}
        myDisplayName={profile?.full_name || profile?.username || myEmail}
      />
    </div>
  );
}