import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { User, LogOut, X, Zap, Sword, Shield } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export default function ProfileMenu({ profile }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

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
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center"
                aria-label="Close profile menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
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
                  <p className="text-[10px] text-muted-foreground">
                    Stamina
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Sword className="w-4 h-4 text-red-400 mx-auto mb-1" />
                  <p className="text-xs font-bold">
                    {profile?.attack_energy ?? '—'}/
                    {profile?.max_attack_energy ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Attack
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
                  <Shield className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                  <p className="text-xs font-bold">
                    {profile?.defense_energy ?? '—'}/
                    {profile?.max_defense_energy ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Defense
                  </p>
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
    </>
  );
}