import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Check, X, Users, Sparkles } from 'lucide-react';

const MAX_FRIENDS = 50;
const CHEER_GOLD = 20;
const CHEER_GEMS = 1;
const DEV_EMAIL = 'dev@realmoflegends.com';

const todayStr = () => new Date().toISOString().split('T')[0];

export default function FriendsList() {
  const queryClient = useQueryClient();

  const [addEmail, setAddEmail] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * Supabase Realtime
   * Keeps friend requests, accepted friends, and cheer updates reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('friends-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friendships',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friendships'] });
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

  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships', myEmail],
    enabled: !!myEmail,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_email.eq.${myEmail},recipient_email.eq.${myEmail}`)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
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

  const myFriendships = useMemo(() => {
    return friendships.filter(
      (f) => f.requester_email === myEmail || f.recipient_email === myEmail
    );
  }, [friendships, myEmail]);

  const accepted = useMemo(() => {
    return myFriendships.filter((f) => f.status === 'accepted');
  }, [myFriendships]);

  const incomingPending = useMemo(() => {
    return myFriendships.filter(
      (f) => f.status === 'pending' && f.recipient_email === myEmail
    );
  }, [myFriendships, myEmail]);

  const outgoingPending = useMemo(() => {
    return myFriendships.filter(
      (f) => f.status === 'pending' && f.requester_email === myEmail
    );
  }, [myFriendships, myEmail]);

  const isDevAccount = myEmail === DEV_EMAIL;
  const atCapacity = !isDevAccount && accepted.length >= MAX_FRIENDS;

  const getFriendEmail = (f) =>
    f.requester_email === myEmail ? f.recipient_email : f.requester_email;

  const sendRequest = async () => {
    const recipientEmail = addEmail.trim().toLowerCase();

    if (!myEmail) {
      toast.error('You need to be logged in');
      return;
    }

    if (!recipientEmail || recipientEmail === myEmail.toLowerCase()) {
      toast.error('Invalid email');
      return;
    }

    const already = myFriendships.find((f) => {
      const otherEmail =
        f.requester_email === myEmail ? f.recipient_email : f.requester_email;

      return otherEmail?.toLowerCase() === recipientEmail;
    });

    if (already) {
      toast.error('Already friends or request pending');
      return;
    }

    if (atCapacity) {
      toast.error(`Friend limit is ${MAX_FRIENDS}`);
      return;
    }

    setLoading(true);

    try {
      const now = new Date().toISOString();

      /**
       * Defensive DB check before insert.
       * This catches duplicates even if the local list is stale.
       */
      const { data: existing, error: existingError } = await supabase
        .from('friendships')
        .select('id, status')
        .or(
          `and(requester_email.eq.${myEmail},recipient_email.eq.${recipientEmail}),and(requester_email.eq.${recipientEmail},recipient_email.eq.${myEmail})`
        )
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existing) {
        toast.error('Already friends or request pending');
        return;
      }

      const { error } = await supabase.from('friendships').insert({
        requester_email: myEmail,
        recipient_email: recipientEmail,
        status: 'pending',
        created_at: now,
        updated_at: now,
      });

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['friendships'] });

      toast.success('Friend request sent!');
      setAddEmail('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not send friend request');
    } finally {
      setLoading(false);
    }
  };

  const acceptRequest = async (f) => {
    try {
      if (atCapacity) {
        toast.error(`Friend limit is ${MAX_FRIENDS}`);
        return;
      }

      const now = new Date().toISOString();

      const { error } = await supabase
        .from('friendships')
        .update({
          status: 'accepted',
          accepted_at: now,
          updated_at: now,
        })
        .eq('id', f.id)
        .eq('recipient_email', myEmail)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['friendships'] });

      toast.success('Friend accepted!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not accept friend');
    }
  };

  const rejectRequest = async (f) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', f.id)
        .eq('recipient_email', myEmail)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['friendships'] });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not reject request');
    }
  };

  const removeFriend = async (f) => {
    try {
      const { error } = await supabase
        .from('friendships')
        .delete()
        .eq('id', f.id)
        .or(`requester_email.eq.${myEmail},recipient_email.eq.${myEmail}`);

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['friendships'] });

      toast.success('Friend removed');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not remove friend');
    }
  };

  const cheer = async (f) => {
    if (!profile) {
      toast.error('Profile has not loaded yet');
      return;
    }

    const iAmRequester = f.requester_email === myEmail;

    const lastCheerField = iAmRequester
      ? 'last_cheer_by_requester'
      : 'last_cheer_by_recipient';

    const lastCheer = iAmRequester
      ? f.last_cheer_by_requester
      : f.last_cheer_by_recipient;

    if (lastCheer === todayStr()) {
      toast.error('Already cheered today!');
      return;
    }

    try {
      const now = new Date().toISOString();

      const { error: friendshipError } = await supabase
        .from('friendships')
        .update({
          [lastCheerField]: todayStr(),
          updated_at: now,
        })
        .eq('id', f.id)
        .eq('status', 'accepted');

      if (friendshipError) {
        throw friendshipError;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gold: (profile.gold || 0) + CHEER_GOLD,
          gems: (profile.gems || 0) + CHEER_GEMS,
          updated_at: now,
        })
        .eq('id', profile.id);

      if (profileError) {
        throw profileError;
      }

      queryClient.invalidateQueries({ queryKey: ['friendships'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

      toast.success(`Cheered! +${CHEER_GOLD} Gold +${CHEER_GEMS} Gem`);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not cheer friend');
    }
  };

  if (!myEmail) {
    return (
      <div className="p-6 text-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Add Friend
        </p>

        <div className="flex gap-2">
          <Input
            placeholder="Friend's email…"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            className="text-sm h-9"
            onKeyDown={(e) => e.key === 'Enter' && sendRequest()}
          />

          <Button
            size="sm"
            onClick={sendRequest}
            disabled={loading}
            className="gap-1.5 h-9"
          >
            <UserPlus className="w-4 h-4" />
            {loading ? 'Adding…' : 'Add'}
          </Button>
        </div>

        {!isDevAccount && (
          <p className="text-[10px] text-muted-foreground">
            {accepted.length} / {MAX_FRIENDS} friends
          </p>
        )}
      </div>

      {incomingPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Requests ({incomingPending.length})
          </p>

          {incomingPending.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 bg-primary/5 border border-primary/20 rounded-xl p-3"
            >
              <p className="flex-1 text-sm font-semibold truncate">
                {f.requester_email}
              </p>

              <Button
                size="sm"
                className="h-7 gap-1"
                onClick={() => acceptRequest(f)}
              >
                <Check className="w-3.5 h-3.5" />
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                onClick={() => rejectRequest(f)}
              >
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {outgoingPending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
            Sent Requests
          </p>

          {outgoingPending.map((f) => (
            <div
              key={f.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
            >
              <p className="flex-1 text-sm truncate text-muted-foreground">
                {f.recipient_email}
              </p>

              <span className="text-[10px] text-yellow-400 font-semibold">
                Pending
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">
          Friends ({accepted.length})
        </p>

        {accepted.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No friends yet. Add some!</p>
          </div>
        )}

        <AnimatePresence>
          {accepted.map((f) => {
            const friendEmail = getFriendEmail(f);
            const iAmRequester = f.requester_email === myEmail;

            const lastCheer = iAmRequester
              ? f.last_cheer_by_requester
              : f.last_cheer_by_recipient;

            const cheeredToday = lastCheer === todayStr();

            const acceptedAt = f.accepted_at ? new Date(f.accepted_at) : null;
            const hoursSince = acceptedAt
              ? (Date.now() - acceptedAt.getTime()) / 3600000
              : 0;

            const canTrade = hoursSince >= 48;

            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
              >
                <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-muted-foreground" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {friendEmail}
                  </p>

                  <p className="text-[10px] text-muted-foreground">
                    {canTrade
                      ? '✅ Trade eligible'
                      : `⏳ Trade in ${Math.ceil(48 - hoursSince)}h`}
                  </p>
                </div>

                <Button
                  size="sm"
                  variant={cheeredToday ? 'ghost' : 'outline'}
                  disabled={cheeredToday}
                  onClick={() => cheer(f)}
                  className="h-7 gap-1 text-xs"
                >
                  <Sparkles className="w-3 h-3" />
                  {cheeredToday ? 'Cheered' : 'Cheer'}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-destructive text-xs"
                  onClick={() => removeFriend(f)}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}