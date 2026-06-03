import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const HERO_IMAGE =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/12dd112d1_generated_image.png';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const [mode, setMode] = useState('login'); // login | signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error('Session load error:', error);

          await supabase.auth.signOut();

          if (mounted) {
            setSession(null);
            setLoadingSession(false);
          }

          return;
        }

        if (mounted) {
          setSession(data?.session || null);
          setLoadingSession(false);
        }
      } catch (error) {
        console.error('Unexpected session error:', error);

        await supabase.auth.signOut();

        if (mounted) {
          setSession(null);
          setLoadingSession(false);
        }
      }
    }

    loadSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setLoadingSession(false);
        return;
      }

      setSession(newSession);
      setLoadingSession(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const submit = async (e) => {
    e.preventDefault();

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      toast.error('Enter your email and password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setSaving(true);

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
        });

        if (error) {
          throw error;
        }

        if (data?.session) {
          setSession(data.session);
          toast.success('Account created!');
          return;
        }

        toast.success('Account created. Please log in.');
        setMode('login');
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        setSession(data.session);
        toast.success('Welcome back!');
        return;
      }

      toast.error('Login failed. Please try again.');
    } catch (error) {
      console.error(error);

      if (error.message?.toLowerCase().includes('invalid login credentials')) {
        toast.error(
          'Invalid email or password. If this is a new account, use Sign Up first.'
        );
      } else if (error.message?.toLowerCase().includes('already registered')) {
        toast.error('This email already has an account. Switch to Login.');
        setMode('login');
      } else if (error.message?.toLowerCase().includes('security purposes')) {
        toast.error('Too many attempts. Wait a few seconds and try again.');
      } else {
        toast.error(error.message || 'Authentication failed');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (session) {
    return children;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt=""
          className="w-full h-full object-cover object-top opacity-45"
        />
        <div className="absolute inset-0 bg-background/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/60 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />
      </div>

      {/* Login card */}
      <div className="relative z-10 min-h-screen flex items-center justify-center px-5">
        <div className="w-full max-w-sm rounded-2xl border border-primary/30 bg-background/70 backdrop-blur-md shadow-2xl p-5 space-y-5">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center mx-auto">
              <Sparkles className="w-7 h-7 text-primary" />
            </div>

            <div>
              <h1 className="font-display text-3xl font-black text-primary text-glow-gold tracking-widest">
                VEILBREAK
              </h1>

              <p className="text-[11px] tracking-[0.28em] uppercase text-muted-foreground">
                Into the Singularity
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 rounded-xl border border-border overflow-hidden">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`h-10 text-xs font-bold transition-all ${
                mode === 'login'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/70 text-muted-foreground'
              }`}
            >
              Login
            </button>

            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`h-10 text-xs font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card/70 text-muted-foreground'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Email
              </p>

              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="h-10"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs font-semibold text-muted-foreground">
                Password
              </p>

              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                className="h-10"
                autoComplete={
                  mode === 'signup' ? 'new-password' : 'current-password'
                }
              />
            </div>

            <Button type="submit" disabled={saving} className="w-full">
              {saving
                ? mode === 'signup'
                  ? 'Creating account…'
                  : 'Logging in…'
                : mode === 'signup'
                  ? 'Create Account'
                  : 'Enter Veilbreak'}
            </Button>
          </form>

          <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
            Closed Alpha Build — progress may reset during testing.
          </p>
        </div>
      </div>
    </div>
  );
}