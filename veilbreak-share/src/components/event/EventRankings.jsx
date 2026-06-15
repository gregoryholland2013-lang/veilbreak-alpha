import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Trophy, Skull } from 'lucide-react';

const rankEmojis = ['🥇', '🥈', '🥉'];

export default function EventRankings({ eventId, myEmail }) {
  const {
    data: allProgress = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['eventRankings', eventId],
    enabled: !!eventId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_event_progress')
        .select('*')
        .eq('event_id', eventId)
        .order('event_rank_score', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 text-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">
          Failed to load event rankings.
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        Event Rankings
      </p>

      {allProgress.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
          <p className="text-sm">No rankings yet</p>
        </div>
      )}

      {allProgress.map((p, i) => {
        const isMe = p.created_by === myEmail;

        return (
          <div
            key={p.id || `${p.event_id}-${p.created_by}`}
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              isMe
                ? 'border-primary/40 bg-primary/5'
                : 'border-border bg-card'
            }`}
          >
            <div className="w-8 text-center flex-shrink-0">
              {i < 3 ? (
                <span className="text-xl">{rankEmojis[i]}</span>
              ) : (
                <span className="font-display font-black text-sm text-muted-foreground">
                  #{i + 1}
                </span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">
                {p.created_by}
                {isMe && ' (You)'}
              </p>

              <p className="text-[10px] text-muted-foreground">
                Floor {p.current_floor || 1} ·{' '}
                {p.prestige_count > 0 ? `⭐P${p.prestige_count} · ` : ''}
                <Skull className="inline w-3 h-3" />{' '}
                {p.total_bosses_killed || 0} killed
              </p>
            </div>

            <div className="text-right flex-shrink-0">
              <p className="font-bold text-sm text-primary">
                {(p.event_rank_score || 0).toLocaleString()}
              </p>
              <p className="text-[9px] text-muted-foreground">pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}