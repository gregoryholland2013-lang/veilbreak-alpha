import React, { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Shield, Users, Swords, Crown, LogOut } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function GuildHome({ guild, myEmail, me }) {
  const queryClient = useQueryClient();

  const isLeader = guild?.leader_email === myEmail;

  /**
   * Supabase Realtime
   * Keeps guild applications and guild membership reactive.
   */
  useEffect(() => {
    const channel = supabase
      .channel('guild-home-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guilds',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guilds'] });
          queryClient.invalidateQueries({ queryKey: ['myGuild'] });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'guild_applications',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['guildApplications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: applications = [] } = useQuery({
    queryKey: ['guildApplications', guild?.id],
    enabled: !!guild?.id && isLeader,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guild_applications')
        .select('*')
        .eq('guild_id', guild.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  const acceptApp = async (app) => {
    if (!guild) return;

    const currentMembers = guild.member_emails || [];

    if (currentMembers.length >= guild.max_members) {
      toast.error('Guild is full');
      return;
    }

    if (currentMembers.includes(app.applicant_email)) {
      toast.error('Player is already in this guild');
      return;
    }

    try {
      const now = new Date().toISOString();

      const updatedMembers = [...currentMembers, app.applicant_email];

      const { error: guildError } = await supabase
        .from('guilds')
        .update({
          member_emails: updatedMembers,
          updated_at: now,
        })
        .eq('id', guild.id);

      if (guildError) {
        throw guildError;
      }

      const { error: applicationError } = await supabase
        .from('guild_applications')
        .update({
          status: 'accepted',
          updated_at: now,
        })
        .eq('id', app.id);

      if (applicationError) {
        throw applicationError;
      }

      /**
       * Optional but recommended:
       * Attach the guild_id to the accepted player's profile.
       */
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          guild_id: guild.id,
          updated_at: now,
        })
        .eq('email', app.applicant_email);

      if (profileError) {
        throw profileError;
      }

      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['myGuild'] });
      queryClient.invalidateQueries({ queryKey: ['guildApplications'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

      toast.success('Member accepted!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not accept member');
    }
  };

  const rejectApp = async (app) => {
    try {
      const { error } = await supabase
        .from('guild_applications')
        .update({
          status: 'rejected',
          updated_at: new Date().toISOString(),
        })
        .eq('id', app.id);

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['guildApplications'] });
      toast.success('Application rejected');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not reject application');
    }
  };

  const kickMember = async (email) => {
    if (!guild) return;

    if (email === guild.leader_email) {
      toast.error('You cannot kick the guild leader');
      return;
    }

    try {
      const now = new Date().toISOString();

      const updatedMembers = (guild.member_emails || []).filter(
        (memberEmail) => memberEmail !== email
      );

      const { error: guildError } = await supabase
        .from('guilds')
        .update({
          member_emails: updatedMembers,
          updated_at: now,
        })
        .eq('id', guild.id);

      if (guildError) {
        throw guildError;
      }

      /**
       * Optional but recommended:
       * Clear guild_id from the kicked player's profile.
       */
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          guild_id: null,
          updated_at: now,
        })
        .eq('email', email);

      if (profileError) {
        throw profileError;
      }

      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['myGuild'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

      toast.success('Member removed');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not remove member');
    }
  };

  const leaveGuild = async () => {
    if (!guild || !myEmail) return;

    const currentMembers = guild.member_emails || [];

    if (isLeader && currentMembers.length > 1) {
      toast.error('Transfer leadership first');
      return;
    }

    try {
      const now = new Date().toISOString();

      if (isLeader) {
        const { error: deleteError } = await supabase
          .from('guilds')
          .delete()
          .eq('id', guild.id);

        if (deleteError) {
          throw deleteError;
        }

        /**
         * Optional cleanup:
         * clear guild_id from your profile after disbanding.
         */
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            guild_id: null,
            updated_at: now,
          })
          .eq('email', myEmail);

        if (profileError) {
          throw profileError;
        }

        toast.success('Guild disbanded');
      } else {
        const updatedMembers = currentMembers.filter(
          (memberEmail) => memberEmail !== myEmail
        );

        const { error: guildError } = await supabase
          .from('guilds')
          .update({
            member_emails: updatedMembers,
            updated_at: now,
          })
          .eq('id', guild.id);

        if (guildError) {
          throw guildError;
        }

        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            guild_id: null,
            updated_at: now,
          })
          .eq('email', myEmail);

        if (profileError) {
          throw profileError;
        }

        toast.success('Left guild');
      }

      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['myGuild'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not leave guild');
    }
  };

  if (!guild) {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-3">
        <Shield className="w-14 h-14 mx-auto opacity-20" />
        <p className="font-display text-lg font-bold">No Guild</p>
        <p className="text-sm">
          Join or create a guild to unlock Guild Wars, raids, and more.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-5">
      {/* Guild banner */}
      <div className="bg-gradient-to-br from-secondary/60 to-accent/20 border border-border rounded-2xl p-5 text-center space-y-1">
        <p className="text-4xl">{guild.emblem || '🛡️'}</p>

        <h2 className="font-display font-black text-xl text-primary">
          {guild.name}
        </h2>

        {guild.description && (
          <p className="text-xs text-muted-foreground">
            {guild.description}
          </p>
        )}

        <div className="flex justify-center gap-6 pt-2 text-sm">
          <div className="text-center">
            <p className="font-bold text-foreground">
              {(guild.member_emails || []).length}
              <span className="text-muted-foreground">
                /{guild.max_members}
              </span>
            </p>
            <p className="text-[10px] text-muted-foreground">Members</p>
          </div>

          <div className="text-center">
            <p className="font-bold text-green-400">
              {guild.holy_war_wins || 0}
            </p>
            <p className="text-[10px] text-muted-foreground">War Wins</p>
          </div>

          <div className="text-center">
            <p className="font-bold text-primary">
              {(guild.total_power || 0).toLocaleString()}
            </p>
            <p className="text-[10px] text-muted-foreground">Power</p>
          </div>
        </div>
      </div>

      {/* Leader actions */}
      {isLeader && applications.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Join Requests ({applications.length})
          </p>

          {applications.map((app) => (
            <div
              key={app.id}
              className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {app.applicant_name || app.applicant_email}
                </p>

                {app.message && (
                  <p className="text-[10px] text-muted-foreground italic truncate">
                    "{app.message}"
                  </p>
                )}
              </div>

              <Button
                size="sm"
                className="h-7 text-xs"
                onClick={() => acceptApp(app)}
              >
                Accept
              </Button>

              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs text-destructive"
                onClick={() => rejectApp(app)}
              >
                Reject
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Member list */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Members
        </p>

        {(guild.member_emails || []).map((email) => (
          <div
            key={email}
            className="flex items-center gap-3 bg-card border border-border rounded-xl p-3"
          >
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center flex-shrink-0">
              {email === guild.leader_email ? (
                <Crown className="w-4 h-4 text-primary" />
              ) : (
                <Users className="w-4 h-4 text-muted-foreground" />
              )}
            </div>

            <p className="flex-1 text-sm truncate">{email}</p>

            {email === myEmail && (
              <span className="text-[10px] text-primary font-bold">
                You
              </span>
            )}

            {isLeader && email !== myEmail && (
              <Button
                size="sm"
                variant="ghost"
                className="h-6 text-[10px] text-destructive"
                onClick={() => kickMember(email)}
              >
                Kick
              </Button>
            )}
          </div>
        ))}
      </div>

      {/* Holy Wars link */}
      <Link to="/holy-wars">
        <Button
          variant="outline"
          className="w-full gap-2 border-primary/30 text-primary hover:bg-primary/10"
        >
          <Swords className="w-4 h-4" /> Holy Wars
        </Button>
      </Link>

      <Button
        variant="ghost"
        className="w-full gap-2 text-destructive text-xs"
        onClick={leaveGuild}
      >
        <LogOut className="w-3.5 h-3.5" />
        {isLeader ? 'Disband Guild' : 'Leave Guild'}
      </Button>
    </div>
  );
}