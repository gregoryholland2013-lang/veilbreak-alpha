import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Crown,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const MAX_FRIENDS = 50;

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

function getProfileUserId(profile) {
  return profile?.user_id || profile?.id || null;
}

function getProfileName(profile) {
  return (
    profile?.display_name ||
    profile?.username ||
    profile?.name ||
    profile?.email ||
    'Unknown Player'
  );
}

function getProfileSubtext(profile) {
  const level = profile?.level || 1;
  const faction = profile?.faction || profile?.favorite_faction || null;

  if (faction) {
    return `Lv.${level} · ${faction}`;
  }

  return `Lv.${level}`;
}

function shortId(id) {
  if (!id) return '';
  return `${String(id).slice(0, 6)}...${String(id).slice(-4)}`;
}

export default function FriendsList() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const channel = supabase
      .channel('friends-list-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['friends'] });
          queryClient.invalidateQueries({ queryKey: ['recommendedFriends'] });
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
          queryClient.invalidateQueries({ queryKey: ['allProfilesForFriends'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: getAuthUser,
  });

  const userId = authUser?.id || null;

  const { data: ensureDevReady = false } = useQuery({
    queryKey: ['ensureDeveloperFriend', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { error } = await supabase.rpc('ensure_developer_friend');

      if (error) throw error;

      return true;
    },
  });

  const { data: friendRows = [], isLoading: friendsLoading } = useQuery({
    queryKey: ['friends', userId, ensureDevReady],
    enabled: !!userId,
    queryFn: async () => {
      await supabase.rpc('ensure_developer_friend');

      const { data, error } = await supabase
        .from('friends')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'accepted')
        .order('is_system', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: profiles = [], isLoading: profilesLoading } = useQuery({
    queryKey: ['allProfilesForFriends'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(500);

      if (error) throw error;

      return data || [];
    },
  });

  const profileByUserId = useMemo(() => {
    const map = new Map();

    profiles.forEach((profile) => {
      const profileUserId = getProfileUserId(profile);

      if (profileUserId) {
        map.set(profileUserId, profile);
      }
    });

    return map;
  }, [profiles]);

  const friendIds = useMemo(() => {
    return new Set(friendRows.map((row) => row.friend_id));
  }, [friendRows]);

  const friendItems = useMemo(() => {
    return friendRows.map((row) => {
      const profile = profileByUserId.get(row.friend_id);

      return {
        row,
        profile,
        userId: row.friend_id,
        name: profile ? getProfileName(profile) : `Player ${shortId(row.friend_id)}`,
        subtext: profile ? getProfileSubtext(profile) : shortId(row.friend_id),
      };
    });
  }, [friendRows, profileByUserId]);

  const recommendedUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (friendRows.length >= MAX_FRIENDS) {
      return [];
    }

    return profiles
      .filter((profile) => {
        const profileUserId = getProfileUserId(profile);

        if (!profileUserId) return false;
        if (profileUserId === userId) return false;
        if (friendIds.has(profileUserId)) return false;

        const name = getProfileName(profile).toLowerCase();
        const email = String(profile.email || '').toLowerCase();

        if (!value) return true;

        return name.includes(value) || email.includes(value);
      })
      .sort((a, b) => {
        const levelA = Number(a.level || 1);
        const levelB = Number(b.level || 1);

        if (levelB !== levelA) return levelB - levelA;

        return getProfileName(a).localeCompare(getProfileName(b));
      })
      .slice(0, 12);
  }, [profiles, friendRows.length, friendIds, userId, search]);

  const addFriend = async (targetUserId, targetName) => {
    if (!targetUserId) return;

    setProcessingId(targetUserId);

    try {
      const { error } = await supabase.rpc('add_friend', {
        p_friend_id: targetUserId,
      });

      if (error) throw error;

      toast.success(`Added ${targetName || 'player'} as a friend`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['friends'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendedFriends'] }),
        queryClient.invalidateQueries({ queryKey: ['ensureDeveloperFriend'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not add friend');
    } finally {
      setProcessingId(null);
    }
  };

  const removeFriend = async (friend) => {
    if (!friend?.userId) return;

    if (friend.row?.is_system) {
      toast.error('The developer account cannot be removed');
      return;
    }

    setProcessingId(friend.userId);

    try {
      const { error } = await supabase.rpc('remove_friend', {
        p_friend_id: friend.userId,
      });

      if (error) throw error;

      toast.success(`Removed ${friend.name}`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['friends'] }),
        queryClient.invalidateQueries({ queryKey: ['recommendedFriends'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not remove friend');
    } finally {
      setProcessingId(null);
    }
  };

  const isLoading = friendsLoading || profilesLoading;

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>

          <div className="flex-1">
            <p className="font-display text-lg font-black text-primary">
              Friends
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Add players for future private trades, guild invites, and raid assists.
            </p>

            <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (friendRows.length / MAX_FRIENDS) * 100
                  )}%`,
                }}
              />
            </div>

            <p className="text-[10px] text-muted-foreground mt-1">
              {friendRows.length}/{MAX_FRIENDS} friends
            </p>
          </div>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search recommended users..."
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Your Friends
        </p>

        {isLoading && (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Loading friends...
          </div>
        )}

        {!isLoading && friendItems.length === 0 && (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            No friends found yet.
          </div>
        )}

        <AnimatePresence>
          {friendItems.map((friend, index) => {
            const isSystem = friend.row?.is_system;

            return (
              <motion.div
                key={friend.row.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ delay: index * 0.03 }}
                className={`rounded-xl border p-3 flex items-center gap-3 ${
                  isSystem
                    ? 'border-primary/50 bg-primary/10'
                    : 'border-border bg-card'
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    isSystem
                      ? 'bg-primary/20 border border-primary/30'
                      : 'bg-muted'
                  }`}
                >
                  {isSystem ? (
                    <Crown className="w-5 h-5 text-primary" />
                  ) : (
                    <Shield className="w-5 h-5 text-blue-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-display font-bold text-sm truncate">
                      {friend.name}
                    </p>

                    {isSystem && (
                      <span className="text-[9px] rounded-full bg-primary/20 text-primary px-2 py-0.5 font-bold">
                        Developer
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground truncate">
                    {friend.subtext}
                  </p>
                </div>

                {isSystem ? (
                  <div className="text-[10px] text-primary font-bold flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    Locked
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={processingId === friend.userId}
                    onClick={() => removeFriend(friend)}
                    className="text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
          Recommended Users
        </p>

        {friendRows.length >= MAX_FRIENDS ? (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            Your friend list is full.
          </div>
        ) : recommendedUsers.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-4 text-center text-sm text-muted-foreground">
            No recommended users found.
          </div>
        ) : (
          <div className="space-y-2">
            {recommendedUsers.map((profile, index) => {
              const targetUserId = getProfileUserId(profile);
              const targetName = getProfileName(profile);

              return (
                <motion.div
                  key={targetUserId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.025 }}
                  className="rounded-xl border border-border bg-card p-3 flex items-center gap-3"
                >
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Users className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-display font-bold text-sm truncate">
                      {targetName}
                    </p>

                    <p className="text-xs text-muted-foreground truncate">
                      {getProfileSubtext(profile)}
                    </p>
                  </div>

                  <Button
                    size="sm"
                    disabled={processingId === targetUserId}
                    onClick={() => addFriend(targetUserId, targetName)}
                    className="gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Add
                  </Button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}