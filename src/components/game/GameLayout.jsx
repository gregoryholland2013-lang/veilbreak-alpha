import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import PlayerBar from './PlayerBar';
import ProfileMenu from './ProfileMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export default function GameLayout() {
  const queryClient = useQueryClient();

  const { data: profile = null, isLoading } = useQuery({
    queryKey: ['playerProfile'],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
    initialData: null,
  });

  useEffect(() => {
    const channel = supabase
      .channel('profile-menu-realtime')
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ProfileMenu profile={profile} />

      <PlayerBar profile={profile} isLoading={isLoading} />

      <main className="flex-1 pb-20 overflow-auto">
        <Outlet context={{ profile }} />
      </main>

      <NavBar />
    </div>
  );
}