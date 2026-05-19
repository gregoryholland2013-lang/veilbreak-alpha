import React, { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Users, Search } from 'lucide-react';

export default function GuildSearch({ guilds = [], myGuild, myEmail, me }) {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [applying, setApplying] = useState(null);

  const filtered = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    if (!searchText) {
      return guilds;
    }

    return guilds.filter((g) =>
      g.name?.toLowerCase().includes(searchText)
    );
  }, [guilds, search]);

  const apply = async (guild) => {
    if (!myEmail) {
      toast.error('You need to be logged in to apply');
      return;
    }

    if (myGuild) {
      toast.error('Leave your current guild first');
      return;
    }

    if (!guild?.id) {
      toast.error('Guild not found');
      return;
    }

    const isFull = (guild.member_emails || []).length >= guild.max_members;

    if (isFull) {
      toast.error('This guild is full');
      return;
    }

    setApplying(guild.id);

    try {
      const now = new Date().toISOString();

      /**
       * Check for existing pending application.
       */
      const { data: existingApplication, error: existingError } = await supabase
        .from('guild_applications')
        .select('id, status')
        .eq('guild_id', guild.id)
        .eq('applicant_email', myEmail)
        .in('status', ['pending', 'accepted'])
        .maybeSingle();

      if (existingError) {
        throw existingError;
      }

      if (existingApplication?.status === 'pending') {
        toast.error('You already applied to this guild');
        return;
      }

      if (existingApplication?.status === 'accepted') {
        toast.error('You are already accepted into this guild');
        return;
      }

      const { error } = await supabase
        .from('guild_applications')
        .insert({
          guild_id: guild.id,
          applicant_email: myEmail,
          applicant_name: me?.full_name || me?.username || myEmail,
          status: 'pending',
          message: message.trim(),
          created_at: now,
          updated_at: now,
        });

      if (error) {
        throw error;
      }

      queryClient.invalidateQueries({ queryKey: ['guildApplications'] });
      queryClient.invalidateQueries({ queryKey: ['guilds'] });

      toast.success(`Applied to ${guild.name}!`);
      setMessage('');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not apply to guild');
    } finally {
      setApplying(null);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <Input
        placeholder="Search guilds…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-9 text-sm"
      />

      <Input
        placeholder="Application message optional…"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="h-9 text-sm"
        maxLength={100}
      />

      {filtered.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Search className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No guilds found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((g) => {
          const isMember = g.member_emails?.includes(myEmail);
          const isFull = (g.member_emails || []).length >= g.max_members;
          const isApplying = applying === g.id;

          return (
            <div
              key={g.id}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3"
            >
              <p className="text-3xl flex-shrink-0">
                {g.emblem || '🛡️'}
              </p>

              <div className="flex-1 min-w-0">
                <p className="font-display font-bold text-sm">
                  {g.name}
                </p>

                <p className="text-[10px] text-muted-foreground">
                  <Users className="inline w-3 h-3 mr-0.5" />
                  {(g.member_emails || []).length}/{g.max_members} · ⚔️{' '}
                  {g.holy_war_wins || 0}W
                </p>

                {g.description && (
                  <p className="text-[10px] text-muted-foreground truncate italic">
                    {g.description}
                  </p>
                )}
              </div>

              {isMember ? (
                <span className="text-xs text-primary font-bold">
                  Member
                </span>
              ) : isFull ? (
                <span className="text-xs text-muted-foreground">
                  Full
                </span>
              ) : (
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={!!applying || !!myGuild}
                  onClick={() => apply(g)}
                >
                  {isApplying ? 'Applying…' : 'Apply'}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}