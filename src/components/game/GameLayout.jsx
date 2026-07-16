import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import NavBar from './NavBar';
import PlayerBar from './PlayerBar';
import DailyLoginModal from './DailyLoginModal';
import AttributePanel from './AttributePanel';
import ChooseFaction from '@/components/auth/ChooseFaction';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import {
  AlertTriangle,
  LogOut,
  Shield,
  Sword,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

async function syncAttributesOrFallback(fallbackProfile) {
  try {
    const { data, error } = await supabase.rpc(
      'sync_current_user_attribute_stats'
    );

    if (error) {
      console.warn('Attribute sync skipped:', error);
      return fallbackProfile;
    }

    return data || fallbackProfile;
  } catch (error) {
    console.warn('Attribute sync unavailable:', error);
    return fallbackProfile;
  }
}

export default function GameLayout() {
  const queryClient = useQueryClient();

  const [localProfile, setLocalProfile] = useState(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const { data: profile = null, isLoading } = useQuery({
    queryKey: ['playerProfile'],
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return null;

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      if (existingProfile) return syncAttributesOrFallback(existingProfile);

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

      if (createError) throw createError;

      return syncAttributesOrFallback(createdProfile);
    },
    initialData: null,
  });

  useEffect(() => {
    if (profile) setLocalProfile(profile);
  }, [profile]);

  useEffect(() => {
    const channel = supabase
      .channel('game-layout-profile-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
          queryClient.invalidateQueries({ queryKey: ['profile'] });
          queryClient.invalidateQueries({ queryKey: ['attributeState'] });
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [queryClient]);

  const activeProfile = localProfile || profile;

  const logout = async () => {
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      queryClient.clear();
      window.location.href = '/';
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not log out');
    } finally {
      setLoggingOut(false);
    }
  };

  const openDeleteAccount = () => {
    setDeleteConfirmText('');
    setDeleteReason('');
    setDeleteOpen(true);
  };

  const closeDeleteAccount = () => {
    if (requestingDeletion) return;

    setDeleteOpen(false);
    setDeleteConfirmText('');
    setDeleteReason('');
  };

  const requestAccountDeletion = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== 'DELETE') {
      toast.error('Type DELETE to confirm your account deletion request.');
      return;
    }

    setRequestingDeletion(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user?.id) {
        throw new Error('You must be logged in to request account deletion.');
      }

      const { data: existingRequest, error: existingError } = await supabase
        .from('account_deletion_requests')
        .select('id, requested_at, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingError) throw existingError;

      if (existingRequest) {
        toast.info('You already have a pending account deletion request.');
        closeDeleteAccount();
        return;
      }

      const { error: insertError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          email: user.email || activeProfile?.email || null,
          display_name: activeProfile?.display_name || null,
          reason: deleteReason.trim() || null,
          source: 'in_app',
          status: 'pending',
        });

      if (insertError) throw insertError;

      toast.success('Account deletion request submitted.');
      closeDeleteAccount();
    } catch (error) {
      console.error(error);

      if (error?.code === '23505') {
        toast.info('You already have a pending account deletion request.');
      } else {
        toast.error(error.message || 'Could not submit deletion request.');
      }
    } finally {
      setRequestingDeletion(false);
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
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {profileOpen && (
        <div className="fixed inset-0 z-[10000] bg-background/75 backdrop-blur-sm flex items-center justify-center px-4 py-6">
          <div className="w-full max-w-3xl max-h-[92vh] rounded-2xl border border-primary/30 bg-card shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
              <div>
                <p className="font-display font-bold text-primary">
                  Player Profile
                </p>
                <p className="text-xs text-muted-foreground">
                  Account, stats, and Attributes
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

            <div className="p-4 space-y-4 overflow-y-auto">
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
                    {(activeProfile?.gold || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gold</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-cyan-300">
                    {(activeProfile?.gems || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Gems</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-green-400">
                    {(activeProfile?.wins || 0).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Wins</p>
                </div>
              </div>

              <AttributePanel compact profile={activeProfile} />

              <Button
                variant="destructive"
                onClick={logout}
                disabled={loggingOut || requestingDeletion}
                className="w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                {loggingOut ? 'Logging out…' : 'Log Out'}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={openDeleteAccount}
                disabled={loggingOut || requestingDeletion}
                className="w-full gap-2 border-red-400/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-red-100"
              >
                <Trash2 className="w-4 h-4" />
                Request Account Deletion
              </Button>

              <p className="text-[10px] text-center text-muted-foreground">
                Closed Alpha Build — progress may reset during testing.
              </p>
            </div>
          </div>

          {deleteOpen && (
            <div className="fixed inset-0 z-[11000] flex items-center justify-center bg-background/80 px-4 backdrop-blur-sm">
              <div className="flex max-h-[88vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-red-400/40 bg-card shadow-2xl">
                <div className="flex shrink-0 items-center justify-between border-b border-red-400/25 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/40 bg-red-500/10">
                      <AlertTriangle className="h-5 w-5 text-red-300" />
                    </div>

                    <div>
                      <p className="font-display font-bold text-red-200">
                        Delete Account
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Submit a deletion request
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDeleteAccount}
                    disabled={requestingDeletion}
                    className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
                    aria-label="Close delete account dialog"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-4 overflow-y-auto p-4">
                  <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100/90">
                    Requesting deletion will start the process to remove your
                    Veilbreak account and associated game progress, including
                    your profile, cards, inventory, quest progress, event
                    progress, and account-linked gameplay data.
                  </div>

                  <div className="rounded-xl border border-border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
                    Some records may be kept only if required for fraud
                    prevention, payment verification, security, legal, or
                    operational reasons.
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">
                      Optional reason
                    </label>

                    <textarea
                      value={deleteReason}
                      onChange={(event) => setDeleteReason(event.target.value)}
                      placeholder="Tell us why you are deleting your account..."
                      disabled={requestingDeletion}
                      className="min-h-[84px] w-full resize-none rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary/60"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-foreground">
                      Type DELETE to confirm
                    </label>

                    <input
                      value={deleteConfirmText}
                      onChange={(event) =>
                        setDeleteConfirmText(event.target.value)
                      }
                      placeholder="DELETE"
                      disabled={requestingDeletion}
                      className="w-full rounded-xl border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-red-400/70"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closeDeleteAccount}
                      disabled={requestingDeletion}
                      className="flex-1"
                    >
                      Cancel
                    </Button>

                    <Button
                      type="button"
                      variant="destructive"
                      onClick={requestAccountDeletion}
                      disabled={
                        requestingDeletion ||
                        deleteConfirmText.trim().toUpperCase() !== 'DELETE'
                      }
                      className="flex-1 gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {requestingDeletion ? 'Submitting…' : 'Submit'}
                    </Button>
                  </div>

                  <p className="text-[10px] text-center text-muted-foreground">
                    You can also request account deletion from the public
                    deletion page once it is added.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <PlayerBar
        profile={activeProfile}
        isLoading={isLoading}
        onProfileClick={() => setProfileOpen(true)}
      />

      <main className="flex-1 w-full pb-20 overflow-y-auto">
        <Outlet context={{ profile: activeProfile }} />
      </main>

      <NavBar />
      <DailyLoginModal />
    </div>
  );
}