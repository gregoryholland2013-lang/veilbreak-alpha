import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import PlayerBar from './PlayerBar';
import ChooseFaction from '@/components/auth/ChooseFaction';
import ProfileMenu from './ProfileMenu';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

export default function GameLayout() {
  const queryClient = useQueryClient();
  const [localProfile, setLocalProfile] = useState(null);

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
    if (profile) {
      setLocalProfile(profile);
    }
  }, [profile]);

  useEffect(() => {
    const channel = supabase
      .channel('game-layout-profile-realtime')
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

  const activeProfile = localProfile || profile;

  if (isLoading || !activeProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasChosenFaction =
    activeProfile.faction && activeProfile.faction.trim() !== '';

  if (!hasChosenFaction) {
    return (
      <ChooseFaction
        profile={activeProfile}
        onChosen={(updatedProfile) => {
          setLocalProfile(updatedProfile);
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <ProfileMenu profile={activeProfile} />

      <PlayerBar profile={activeProfile} isLoading={isLoading} />

      <main className="flex-1 pb-20 overflow-auto">
        <Outlet context={{ profile: activeProfile }} />
      </main>

      <NavBar />
    </div>
  );
}