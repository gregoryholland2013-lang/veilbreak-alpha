import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Shield } from 'lucide-react';

const EMBLEMS = [
  '🛡️',
  '⚔️',
  '🔥',
  '💧',
  '🌿',
  '✨',
  '🌑',
  '🐉',
  '🦅',
  '🗡️',
  '🏹',
  '🧙',
  '🦁',
  '🐺',
  '⚡',
];

const CREATE_COST_GOLD = 5000;

export default function GuildCreate({ myGuild, myEmail, me }) {
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [emblem, setEmblem] = useState('🛡️');
  const [saving, setSaving] = useState(false);

  const create = async () => {
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();

    if (!myEmail) {
      toast.error('You need to be logged in to create a guild');
      return;
    }

    if (!trimmedName) {
      toast.error('Enter a guild name');
      return;
    }

    if (myGuild) {
      toast.error('Leave your current guild first');
      return;
    }

    if ((me?.gold || 0) < CREATE_COST_GOLD) {
      toast.error(`You need ${CREATE_COST_GOLD.toLocaleString()} gold to create a guild`);
      return;
    }

    setSaving(true);

    try {
      const now = new Date().toISOString();

      const { data: existingGuild, error: existingGuildError } = await supabase
        .from('guilds')
        .select('id')
        .ilike('name', trimmedName)
        .maybeSingle();

      if (existingGuildError) {
        throw existingGuildError;
      }

      if (existingGuild) {
        toast.error('That guild name is already taken');
        return;
      }

      const { data: createdGuild, error: guildError } = await supabase
        .from('guilds')
        .insert({
          name: trimmedName,
          description: trimmedDescription,
          emblem,
          leader_email: myEmail,
          member_emails: [myEmail],
          max_members: 30,
          total_power: 0,
          holy_war_wins: 0,
          holy_war_losses: 0,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (guildError) {
        throw guildError;
      }

      /**
       * Optional but recommended:
       * deduct gold from the player's profile after creating the guild.
       *
       * This assumes your player profile table is called profiles
       * and has an email column plus a gold column.
       */
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          gold: (me?.gold || 0) - CREATE_COST_GOLD,
          guild_id: createdGuild.id,
          updated_at: now,
        })
        .eq('email', myEmail);

      if (profileError) {
        throw profileError;
      }

      queryClient.invalidateQueries({ queryKey: ['guilds'] });
      queryClient.invalidateQueries({ queryKey: ['myGuild'] });
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] });

      toast.success(`Guild "${trimmedName}" created!`);

      setName('');
      setDescription('');
      setEmblem('🛡️');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not create guild');
    } finally {
      setSaving(false);
    }
  };

  if (myGuild) {
    return (
      <div className="p-8 text-center text-muted-foreground space-y-2">
        <Shield className="w-10 h-10 mx-auto opacity-20" />
        <p className="text-sm">
          You're already in a guild. Leave it first to create a new one.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Choose Emblem
        </p>

        <div className="flex flex-wrap gap-2">
          {EMBLEMS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmblem(e)}
              className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center border-2 transition-all ${
                emblem === e
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-card hover:border-border/80'
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Guild Name
        </p>

        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter guild name…"
          className="h-9"
          maxLength={30}
        />
      </div>

      <div className="space-y-1">
        <p className="text-xs font-semibold text-muted-foreground">
          Description optional
        </p>

        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your guild…"
          className="h-9"
          maxLength={100}
        />
      </div>

      <Button onClick={create} disabled={saving} className="w-full gap-2">
        <Shield className="w-4 h-4" />
        {saving ? 'Creating…' : `Create Guild - ${CREATE_COST_GOLD.toLocaleString()} Gold`}
      </Button>
    </div>
  );
}