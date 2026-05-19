import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EventFloorMap from '@/components/event/EventFloorMap';
import RaidBossQueue from '@/components/event/RaidBossQueue';
import EventRankings from '@/components/event/EventRankings';
import { Zap, Skull, Trophy } from 'lucide-react';

export default function EventDungeon() {
  const queryClient = useQueryClient();

  /**
   * Supabase Realtime
   * Keeps event dungeon data reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('event-dungeon-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'event_seasons',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['eventSeasons'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_event_progress',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerEventProgress'] });
          queryClient.invalidateQueries({ queryKey: ['eventRankings'] });
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

      if (error) {
        throw error;
      }

      return user;
    },
  });

  const myEmail = authUser?.email || null;
  const userId = authUser?.id || null;

  const me = useMemo(() => {
    if (!authUser) return null;

    return {
      id: authUser.id,
      email: authUser.email,
      full_name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email,
    };
  }, [authUser]);

  const { data: events = [] } = useQuery({
    queryKey: ['eventSeasons'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('event_seasons')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const activeEvent = events[0] || null;

  const { data: myProgress = [] } = useQuery({
    queryKey: ['playerEventProgress', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_event_progress')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
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

      if (error) {
        throw error;
      }

      return data;
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

      if (error) {
        throw error;
      }

      return data;
    },
  });

  const { data: playerCards = [] } = useQuery({
    queryKey: ['playerCards', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const { data: cards = [] } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const myEventProgress = useMemo(() => {
    if (!activeEvent) return null;

    return myProgress.find((p) => p.event_id === activeEvent.id) || null;
  }, [activeEvent, myProgress]);

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Event Dungeon" />

      {!activeEvent ? (
        <div className="p-8 text-center text-muted-foreground space-y-3">
          <Zap className="w-14 h-14 mx-auto opacity-20" />
          <p className="font-display text-lg font-bold">No Active Event</p>
          <p className="text-sm">Check back soon for the next event!</p>
        </div>
      ) : (
        <>
          {/* Event Banner */}
          <div className="relative overflow-hidden border-b border-border">
            {activeEvent.banner_image && (
              <img
                src={activeEvent.banner_image}
                alt=""
                className="w-full h-28 object-cover object-center opacity-60"
              />
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

            <div className="absolute bottom-3 left-4">
              <h2 className="font-display font-black text-xl text-primary">
                {activeEvent.name}
              </h2>

              <p className="text-[11px] text-muted-foreground">
                {activeEvent.description}
              </p>
            </div>

            <div className="absolute bottom-3 right-4 text-right">
              <p className="text-xs font-bold text-foreground">
                💧 {inventory?.spirit_water || 0} Spirit Water
              </p>

              <p className="text-[10px] text-muted-foreground">
                {activeEvent.spirit_water_cost || 1} per floor
              </p>
            </div>
          </div>

          <Tabs defaultValue="floors" className="w-full">
            <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border bg-card/50 h-10">
              <TabsTrigger value="floors" className="gap-1 text-xs">
                <Zap className="w-3.5 h-3.5" />
                Floors
              </TabsTrigger>

              <TabsTrigger value="raids" className="gap-1 text-xs">
                <Skull className="w-3.5 h-3.5" />
                Raids
              </TabsTrigger>

              <TabsTrigger value="ranks" className="gap-1 text-xs">
                <Trophy className="w-3.5 h-3.5" />
                Rankings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="floors" className="mt-0">
              <EventFloorMap
                event={activeEvent}
                progress={myEventProgress}
                inventory={inventory}
                profile={profile}
                playerCards={playerCards}
                cards={cards}
                myEmail={myEmail}
                me={me}
              />
            </TabsContent>

            <TabsContent value="raids" className="mt-0">
              <RaidBossQueue
                event={activeEvent}
                myEmail={myEmail}
                me={me}
                playerCards={playerCards}
                cards={cards}
                inventory={inventory}
              />
            </TabsContent>

            <TabsContent value="ranks" className="mt-0">
              <EventRankings eventId={activeEvent.id} myEmail={myEmail} />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}