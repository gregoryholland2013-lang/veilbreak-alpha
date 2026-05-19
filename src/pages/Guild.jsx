import React, { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GuildHome from '@/components/guild/GuildHome';
import GuildSearch from '@/components/guild/GuildSearch';
import GuildCreate from '@/components/guild/GuildCreate';
import { Shield, Search, Plus } from 'lucide-react';

export default function GuildPage() {
  const queryClient = useQueryClient();

  /**
   * Supabase Realtime
   * Keeps guild list and current guild membership reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('guild-page-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guilds',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
          queryClient.invalidateQueries({ queryKey: ['myGuild'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guild_applications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guildApplications'] });
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

  const { data: allGuilds = [], isLoading } = useQuery({
    queryKey: ['guilds'],
    enabled: !!myEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .order('total_power', { ascending: false })
        .limit(100);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const myGuild = useMemo(() => {
    if (!myEmail) return null;

    return (
      allGuilds.find((guild) =>
        (guild.member_emails || []).includes(myEmail)
      ) || null
    );
  }, [allGuilds, myEmail]);

  if (isLoading) {
    return (
      <div className="max-w-lg mx-auto">
        <PageHeader title="Guild" />

        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Guild" />

      <Tabs defaultValue={myGuild ? 'home' : 'search'} className="w-full">
        <TabsList className="w-full grid grid-cols-3 rounded-none border-b border-border bg-card/50 h-10">
          <TabsTrigger value="home" className="gap-1.5 text-xs">
            <Shield className="w-3.5 h-3.5" />
            My Guild
          </TabsTrigger>

          <TabsTrigger value="search" className="gap-1.5 text-xs">
            <Search className="w-3.5 h-3.5" />
            Find
          </TabsTrigger>

          <TabsTrigger value="create" className="gap-1.5 text-xs">
            <Plus className="w-3.5 h-3.5" />
            Create
          </TabsTrigger>
        </TabsList>

        <TabsContent value="home" className="mt-0">
          <GuildHome guild={myGuild} myEmail={myEmail} me={me} />
        </TabsContent>

        <TabsContent value="search" className="mt-0">
          <GuildSearch
            guilds={allGuilds}
            myGuild={myGuild}
            myEmail={myEmail}
            me={me}
          />
        </TabsContent>

        <TabsContent value="create" className="mt-0">
          <GuildCreate myGuild={myGuild} myEmail={myEmail} me={me} />
        </TabsContent>
      </Tabs>
    </div>
  );
}