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
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

const GUILD_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-emerald-700/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {label}
      </div>
      <p className="font-display text-xl font-black mt-1">{value}</p>
    </div>
  );
}

function QuestPanel({ children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden ${className}`}>
      {children}
    </section>
  );
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
        { event: '*', schema: 'public', table: 'guilds' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
          queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guild_members' },
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
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={GUILD_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <Shield className="w-4 h-4" />
                  Guild Hall
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  GUILDS
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  Create a guild, join other players, and prepare for shared raids, rankings, and Holy Wars.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat
                  icon={Crown}
                  label="Your Guild"
                  value={myGuild ? 'Joined' : 'None'}
                />
                <HeroStat
                  icon={Users}
                  label="Members"
                  value={myGuild?.member_count || guildMembers.length || 0}
                />
                <HeroStat
                  icon={Trophy}
                  label="Guilds"
                  value={guilds.length}
                />
              </div>
            </div>
          </div>
        </section>

        {myGuild ? (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <main className="xl:col-span-8 space-y-6">
              <QuestPanel>
                <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                  <div className="flex items-start gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                      <Crown className="w-8 h-8 text-primary" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                        <Crown className="w-4 h-4" />
                        Active Guild
                      </div>

                      <h2 className="font-display text-3xl md:text-4xl font-black text-primary mt-2 truncate">
                        {myGuild.name}
                      </h2>

                      <p className="text-sm text-muted-foreground mt-2">
                        {myGuild.description || 'No guild description yet.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 md:p-6 space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <GuildStat label="Level" value={`Lv.${myGuild.level || 1}`} />
                    <GuildStat
                      label="Members"
                      value={`${myGuild.member_count || 0}/${myGuild.max_members || 30}`}
                    />
                    <GuildStat label="Role" value={myMembership?.role || 'member'} />
                  </div>

                  <div className="rounded-2xl border border-border bg-background/50 p-4">
                    <div className="flex items-start gap-3">
                      <Swords className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="font-display font-black text-primary">
                          Guild Features Coming Soon
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
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
              </QuestPanel>
            </main>

            <aside className="xl:col-span-4">
              <QuestPanel>
                <div className="p-5 border-b border-border bg-primary/5">
                  <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                    <Users className="w-4 h-4" />
                    Members
                  </div>
                  <h2 className="font-display text-2xl font-black text-primary mt-2">
                    Roster
                  </h2>
                </div>

                <div className="p-5 space-y-2">
                  {guildMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 rounded-2xl border border-border bg-background/50 px-3 py-2"
                    >
                      <div className="w-9 h-9 rounded-xl bg-card flex items-center justify-center">
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
              </QuestPanel>
            </aside>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            <aside className="xl:col-span-4 space-y-6">
              <QuestPanel>
                <div className="p-5 border-b border-border bg-primary/5">
                  <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                    <Sparkles className="w-4 h-4" />
                    Guild Entry
                  </div>

                  <h2 className="font-display text-2xl font-black text-primary mt-2">
                    Join the War Beyond the Veil
                  </h2>

                  <p className="text-sm text-muted-foreground mt-2">
                    Create a guild or join another player. Guild raids and shared boss battles will unlock later.
                  </p>
                </div>

                <div className="p-5 space-y-4">
                  <Button
                    onClick={() => setShowCreate((prev) => !prev)}
                    className="w-full gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {showCreate ? 'Close Create Form' : 'Create Guild'}
                  </Button>

                  <AnimatePresence>
                    {showCreate && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className="rounded-2xl border border-border bg-background/50 p-4 space-y-3"
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
                </div>
              </QuestPanel>
            </aside>

            <main className="xl:col-span-8">
              <QuestPanel>
                <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                        <Users className="w-4 h-4" />
                        Guild Registry
                      </div>

                      <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                        Available Guilds
                      </h2>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {filteredGuilds.length} shown
                    </p>
                  </div>
                </div>

                <div className="p-5 md:p-6 space-y-3">
                  {guildsLoading ? (
                    <div className="text-center text-sm text-muted-foreground py-8">
                      Loading guilds...
                    </div>
                  ) : filteredGuilds.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background/50 p-8 text-center">
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
                          className="rounded-3xl border border-border bg-background/50 p-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center flex-shrink-0">
                              <Crown className="w-7 h-7 text-primary" />
                            </div>

                            <div className="flex-1 min-w-0">
                              <p className="font-display text-xl font-black text-primary truncate">
                                {guild.name}
                              </p>

                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {guild.description || 'No guild description.'}
                              </p>

                              <div className="flex flex-wrap items-center gap-2 mt-3 text-[10px] text-muted-foreground">
                                <span className="rounded-full bg-card px-2 py-0.5">
                                  Lv.{guild.level || 1}
                                </span>
                                <span className="rounded-full bg-card px-2 py-0.5">
                                  {guild.member_count || 0}/{guild.max_members || 30}
                                </span>
                                <span className="rounded-full bg-card px-2 py-0.5">
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
              </QuestPanel>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

function GuildStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="font-display text-lg font-black text-primary mt-1 capitalize">
        {value}
      </p>
    </div>
  );
}
