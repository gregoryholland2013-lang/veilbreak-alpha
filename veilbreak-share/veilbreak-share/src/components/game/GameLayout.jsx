import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import PlayerBar from './PlayerBar';
import ChooseFaction from '@/components/auth/ChooseFaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { User, LogOut, X, Zap, Sword, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function GameLayout() {
  const queryClient = useQueryClient();
  const [localProfile, setLocalProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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

  const { data: existingProfile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (existingProfile) {
    return existingProfile;
  }

  const now = new Date().toISOString();

  const { data: createdProfile, error: createError } = await supabase
    .from('profiles')
    .insert({
      id: user.id,
      email: user.email,
      display_name:
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'Adventurer',
      level: 1,
      experience: 0,
      gold: 1000,
      gems: 50,
      stamina: 100,
      max_stamina: 100,
      attack_energy: 100,
      max_attack_energy: 100,
      defense_energy: 100,
      max_defense_energy: 100,
      wins: 0,
      losses: 0,
      quests_completed: 0,
      stats_regen_at: now,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();

  if (createError) {
    throw createError;
  }

  return createdProfile;
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

  const logout = async () => {
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not log out');
    } finally {
      setLoggingOut(false);
    }
  };

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
      {/* Direct profile/logout button */}
      <button
        type="button"
        onClick={() => setProfileOpen(true)}
        className="fixed top-16 left-3 z-[9999] w-11 h-11 rounded-xl border border-primary/40 bg-background/90 backdrop-blur-md flex items-center justify-center shadow-xl hover:bg-primary/10 transition-all"
        aria-label="Open profile menu"
      >
        <User className="w-5 h-5 text-primary" />
      </button>

      {profileOpen && (
        <div className="fixed inset-0 z-[10000] bg-background/75 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="font-display font-bold text-primary">
                  Player Profile
                </p>
                <p className="text-xs text-muted-foreground">
                  Account and stats
                </p>
              </div>

              <button
                type="button"
                onClick={() => setProfileOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                aria-label="Close profile menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="font-display font-bold text-lg">
                  {activeProfile?.display_name || 'Adventurer'}
                </p>

                <p className="text-xs text-muted-foreground">
                  Level {activeProfile?.level || 1}
                  {activeProfile?.faction ? ` · ${activeProfile.faction}` : ''}
                </p>

                {activeProfile?.email && (
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    {activeProfile.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
                  <p className="text-xs font-bold">
                    {activeProfile?.stamina ?? '—'}/
                    {activeProfile?.max_stamina ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Stamina</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Sword className="w-4 h-4 text-red-400 mx-auto mb-1" />
                  <p className="text-xs font-bold">
                    {activeProfile?.attack_energy ?? '—'}/
                    {activeProfile?.max_attack_energy ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Attack</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs font-bold">
                    {activeProfile?.defense_energy ?? '—'}/
                    {activeProfile?.max_defense_energy ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Defense</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-yellow-400">
                    {activeProfile?.gold ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gold</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-cyan-300">
                    {activeProfile?.gems ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gems</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-green-400">
                    {activeProfile?.wins ?? 0}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Wins</p>
                </div>
              </div>

              <Button
                variant="destructive"
                onClick={logout}
                disabled={loggingOut}
                className="w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? 'Logging out…' : 'Log Out'}
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Closed Alpha Build — progress may reset during testing.
              </p>
            </div>
          </div>
        </div>
      )}

      <PlayerBar profile={activeProfile} isLoading={isLoading} />

      <main className="flex-1 pb-20 overflow-auto">
        <Outlet context={{ profile: activeProfile }} />
      </main>

      <NavBar />
    </div>
  );
}