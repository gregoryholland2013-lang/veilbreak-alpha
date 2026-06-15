import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Crown,
  Shield,
  Users,
  Plus,
  LogOut,
  Search,
  Sparkles,
  Swords,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Button } from '@/components/ui/button';

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

export default function Guilds() {
  const queryClient = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildDescription, setGuildDescription] = useState('');
  const [search, setSearch] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const channel = supabase
      .channel('guilds-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guilds',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
          queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guild_members',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
          queryClient.invalidateQueries({ queryKey: ['guildMembers'] });
          queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] });
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

  const { data: guilds = [], isLoading: guildsLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .order('level', { ascending: false })
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const { data: myMembership = null } = useQuery({
    queryKey: ['myGuildMembership', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guild_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  const myGuildId = myMembership?.guild_id || null;

  const { data: myGuild = null } = useQuery({
    queryKey: ['myGuild', myGuildId],
    enabled: !!myGuildId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .eq('id', myGuildId)
        .maybeSingle();

      if (error) throw error;

      return data;
    },
  });

  const { data: guildMembers = [] } = useQuery({
    queryKey: ['guildMembers', myGuildId],
    enabled: !!myGuildId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guild_members')
        .select('*')
        .eq('guild_id', myGuildId)
        .order('role', { ascending: true })
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data || [];
    },
  });

  const filteredGuilds = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return guilds;

    return guilds.filter((guild) => {
      return (
        String(guild.name || '').toLowerCase().includes(value) ||
        String(guild.description || '').toLowerCase().includes(value)
      );
    });
  }, [guilds, search]);

  const createGuild = async () => {
    const cleanName = guildName.trim();

    if (!cleanName) {
      toast.error('Enter a guild name');
      return;
    }

    if (cleanName.length < 3) {
      toast.error('Guild name must be at least 3 characters');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('create_guild', {
        p_name: cleanName,
        p_description: guildDescription.trim(),
      });

      if (error) throw error;

      toast.success(`👑 Guild created: ${cleanName}`);
      setGuildName('');
      setGuildDescription('');
      setShowCreate(false);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guilds'] }),
        queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not create guild');
    } finally {
      setProcessing(false);
    }
  };

  const joinGuild = async (guild) => {
    if (!guild?.id) return;

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('join_guild', {
        p_guild_id: guild.id,
      });

      if (error) throw error;

      toast.success(`🛡️ Joined ${guild.name}`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guilds'] }),
        queryClient.invalidateQueries({ queryKey: ['guildMembers'] }),
        queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not join guild');
    } finally {
      setProcessing(false);
    }
  };

  const leaveGuild = async () => {
    if (!myGuild?.id) return;

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('leave_guild', {
        p_guild_id: myGuild.id,
      });

      if (error) throw error;

      toast.success(`Left ${myGuild.name}`);

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['guilds'] }),
        queryClient.invalidateQueries({ queryKey: ['guildMembers'] }),
        queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] }),
        queryClient.invalidateQueries({ queryKey: ['myGuild'] }),
      ]);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not leave guild');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Guilds" />

      <div className="px-4 py-4 space-y-4">
        {myGuild ? (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 p-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-14 h-14 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <Crown className="w-7 h-7 text-primary" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-display text-xl font-black text-primary truncate">
                  {myGuild.name}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  {myGuild.description || 'No guild description yet.'}
                </p>

                <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                  <span className="rounded-full bg-background/60 px-2 py-0.5">
                    Lv.{myGuild.level || 1}
                  </span>
                  <span className="rounded-full bg-background/60 px-2 py-0.5">
                    {myGuild.member_count || 0}/{myGuild.max_members || 30} members
                  </span>
                  <span className="rounded-full bg-background/60 px-2 py-0.5 capitalize">
                    {myMembership?.role || 'member'}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Members
                </p>

                <Users className="w-4 h-4 text-muted-foreground" />
              </div>

              <div className="space-y-2">
                {guildMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                      {member.role === 'leader' ? (
                        <Crown className="w-4 h-4 text-primary" />
                      ) : (
                        <Shield className="w-4 h-4 text-blue-300" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold truncate">
                        {member.email || 'Unknown Player'}
                      </p>
                      <p className="text-[10px] text-muted-foreground capitalize">
                        {member.role}
                      </p>
                    </div>
                  </div>
                ))}

                {guildMembers.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No members found.
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/70 p-3">
              <div className="flex items-start gap-2">
                <Swords className="w-4 h-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-primary">
                    Guild Features Coming Soon
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Guild raids, donations, rankings, and shared expedition bosses will build from this foundation.
                  </p>
                </div>
              </div>
            </div>

            <Button
              variant="destructive"
              onClick={leaveGuild}
              disabled={processing}
              className="w-full gap-2"
            >
              <LogOut className="w-4 h-4" />
              {processing ? 'Leaving…' : 'Leave Guild'}
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>

                <div className="flex-1">
                  <p className="font-display text-lg font-black text-primary">
                    Join the War Beyond the Veil
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create a guild or join another player. Guild raids and shared boss battles will unlock later.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreate((prev) => !prev)}
                className="flex-1 gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Guild
              </Button>
            </div>

            <AnimatePresence>
              {showCreate && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-border bg-card p-4 space-y-3"
                >
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Guild Name
                    </p>
                    <input
                      value={guildName}
                      onChange={(e) => setGuildName(e.target.value)}
                      maxLength={24}
                      placeholder="Example: Ironveil Order"
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">
                      Description
                    </p>
                    <textarea
                      value={guildDescription}
                      onChange={(e) => setGuildDescription(e.target.value)}
                      maxLength={140}
                      placeholder="Describe your guild..."
                      className="w-full min-h-20 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
                    />
                  </div>

                  <Button
                    onClick={createGuild}
                    disabled={processing}
                    className="w-full"
                  >
                    {processing ? 'Creating…' : 'Create Guild'}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search guilds..."
                className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="space-y-3">
              {guildsLoading ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  Loading guilds...
                </div>
              ) : filteredGuilds.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-6 text-center">
                  <Users className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <p className="font-display text-lg text-muted-foreground">
                    No guilds found
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create the first guild in Veilbreak.
                  </p>
                </div>
              ) : (
                filteredGuilds.map((guild, i) => {
                  const full =
                    Number(guild.member_count || 0) >=
                    Number(guild.max_members || 30);

                  return (
                    <motion.div
                      key={guild.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      className="rounded-2xl border border-border bg-card p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <Crown className="w-6 h-6 text-primary" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="font-display font-black text-primary truncate">
                            {guild.name}
                          </p>

                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {guild.description || 'No guild description.'}
                          </p>

                          <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              Lv.{guild.level || 1}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              {guild.member_count || 0}/{guild.max_members || 30}
                            </span>
                            <span className="rounded-full bg-muted px-2 py-0.5">
                              {guild.is_open ? 'Open' : 'Closed'}
                            </span>
                          </div>
                        </div>

                        <Button
                          size="sm"
                          onClick={() => joinGuild(guild)}
                          disabled={processing || full || !guild.is_open}
                        >
                          {full ? 'Full' : 'Join'}
                        </Button>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}