import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const HERO_IMAGE =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/12dd112d1_generated_image.png';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [ready, setReady] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) return;

      if (error) {
        console.error(error);
        toast.error(error.message || 'Password reset session failed');
        setHasSession(false);
      } else {
        setHasSession(Boolean(data?.session));
      }

      setReady(true);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasSession(Boolean(session));
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function submit(event) {
    event.preventDefault();

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      toast.success('Password updated. Please log in again.');

      await supabase.auth.signOut();

      navigate('/');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not update password');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt=""
          className="w-full h-full object-cover object-top opacity-45"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/70 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-background/75 backdrop-blur-md shadow-2xl p-5 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto">
              {hasSession ? (
                <ShieldCheck className="w-7 h-7 text-primary" />
              ) : (
                <KeyRound className="w-7 h-7 text-primary" />
              )}
            </div>

            <div>
              <h1 className="font-display text-3xl font-black text-primary text-glow-gold tracking-widest">
                RESET PASSWORD
              </h1>

              <p className="text-[11px] tracking-[0.25em] uppercase text-muted-foreground">
                Veilbreak Account Recovery
              </p>
            </div>
          </div>

          {!ready && (
            <div className="flex items-center justify-center py-6">
              <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {ready && !hasSession && (
            <div className="space-y-4">
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
                <p className="text-sm font-bold text-destructive">
                  Reset link is missing or expired.
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Go back to the login screen and request a new password reset
                  email.
                </p>
              </div>

              <Button onClick={() => navigate('/')} className="w-full">
                Back to Login
              </Button>
            </div>
          )}

          {ready && hasSession && (
            <form onSubmit={submit} className="space-y-3">
              <div className="rounded-xl border border-primary/25 bg-primary/10 p-3">
                <p className="text-sm font-display font-black text-primary">
                  Create a new password
                </p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  Enter a new password for your Veilbreak account.
                </p>
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  New Password
                </p>

                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="h-10"
                  autoComplete="new-password"
                />
              </div>

              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  Confirm Password
                </p>

                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Confirm new password"
                  className="h-10"
                  autoComplete="new-password"
                />
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Updating Password…' : 'Update Password'}
              </Button>
            </form>
          )}

          <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
            Password reset links can expire. Request a new link if this page
            does not unlock.
          </p>
        </div>
      </div>
    </div>
  );
}
