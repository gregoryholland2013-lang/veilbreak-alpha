import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import {
  User,
  LogOut,
  X,
  Zap,
  Sword,
  Shield,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ProfileMenu({ profile }) {
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [requestingDeletion, setRequestingDeletion] = useState(false);

  const logout = async () => {
    setLoggingOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      queryClient.clear();

      // Force AuthGate to re-check session and show login screen.
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

      if (userError) {
        throw userError;
      }

      if (!user?.id) {
        throw new Error('You must be logged in to request account deletion.');
      }

      const { data: existingRequest, error: existingError } = await supabase
        .from('account_deletion_requests')
        .select('id, requested_at, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingRequest) {
        toast.info('You already have a pending account deletion request.');
        setDeleteOpen(false);
        return;
      }

      const { error: insertError } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          email: user.email || profile?.email || null,
          display_name: profile?.display_name || null,
          reason: deleteReason.trim() || null,
          source: 'in_app',
          status: 'pending',
        });

      if (insertError) {
        throw insertError;
      }

      toast.success('Account deletion request submitted.');
      setDeleteOpen(false);
      setOpen(false);
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

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-20 left-3 z-[9999] w-12 h-12 rounded-xl border-2 border-yellow-400 bg-red-600 flex items-center justify-center"
        aria-label="Open profile menu"
      >
        <User className="w-5 h-5 text-primary" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] bg-background/75 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm max-h-[88vh] rounded-2xl border border-primary/30 bg-card shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
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
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                aria-label="Close profile menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-border bg-background/40 p-4">
                <p className="font-display font-bold text-lg">
                  {profile?.display_name || 'Adventurer'}
                </p>

                <p className="text-xs text-muted-foreground">
                  Level {profile?.level || 1}
                  {profile?.faction ? ` · ${profile.faction}` : ''}
                </p>

                {profile?.email && (
                  <p className="text-[11px] text-muted-foreground truncate mt-1">
                    {profile.email}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Zap className="w-4 h-4 text-yellow-400 mx-auto mb-1" />

                  <p className="text-xs font-bold">
                    {profile?.stamina ?? '—'}/{profile?.max_stamina ?? '—'}
                  </p>

                  <p className="text-[10px] text-muted-foreground">Stamina</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Sword className="w-4 h-4 text-red-400 mx-auto mb-1" />

                  <p className="text-xs font-bold">
                    {profile?.attack_energy ?? '—'}/
                    {profile?.max_attack_energy ?? '—'}
                  </p>

                  <p className="text-[10px] text-muted-foreground">Attack</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />

                  <p className="text-xs font-bold">
                    {profile?.defense_energy ?? '—'}/
                    {profile?.max_defense_energy ?? '—'}
                  </p>

                  <p className="text-[10px] text-muted-foreground">Defense</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-yellow-400">
                    {profile?.gold ?? 0}
                  </p>

                  <p className="text-[10px] text-muted-foreground">Gold</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-cyan-300">
                    {profile?.gems ?? 0}
                  </p>

                  <p className="text-[10px] text-muted-foreground">Gems</p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <p className="text-sm font-bold text-green-400">
                    {profile?.wins ?? 0}
                  </p>

                  <p className="text-[10px] text-muted-foreground">Wins</p>
                </div>
              </div>

              <div className="space-y-2">
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
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                Closed Alpha Build — progress may reset during testing.
              </p>
            </div>
          </div>
        </div>
      )}

      {deleteOpen && (
        <div className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-sm max-h-[88vh] rounded-2xl border border-red-400/40 bg-card shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-red-400/25 shrink-0">
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
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                aria-label="Close delete account dialog"
                disabled={requestingDeletion}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 overflow-y-auto">
              <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs leading-relaxed text-red-100/90">
                Requesting deletion will start the process to remove your
                Veilbreak account and associated game progress, including your
                profile, cards, inventory, quest progress, event progress, and
                account-linked gameplay data.
              </div>

              <div className="rounded-xl border border-border bg-background/40 p-3 text-xs leading-relaxed text-muted-foreground">
                Some records may be kept only if required for fraud prevention,
                payment verification, security, legal, or operational reasons.
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
                  onChange={(event) => setDeleteConfirmText(event.target.value)}
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
                  <Trash2 className="w-4 h-4" />
                  {requestingDeletion ? 'Submitting…' : 'Submit'}
                </Button>
              </div>

              <p className="text-[10px] text-center text-muted-foreground">
                You can also request account deletion from the public deletion
                page once it is added.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}