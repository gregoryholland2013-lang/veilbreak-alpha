import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Swords, Trophy, Shield } from 'lucide-react';

const rankColors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
const rankEmojis = ['🥇', '🥈', '🥉'];

export default function Leaderboard({ opponents, myProfile, onChallenge, loading }) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse h-16" />
        ))}
      </div>
    );
  }

  if (opponents.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="font-display text-lg">No opponents yet</p>
        <p className="text-sm mt-1">Other players haven't set up their decks yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {opponents.map((opp, i) => {
        const isMe = opp.id === myProfile?.id;
        const rank = i + 1;
        return (
          <motion.div
            key={opp.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className={`bg-card rounded-xl border p-4 flex items-center gap-3 ${isMe ? 'border-primary/40 bg-primary/5' : 'border-border'}`}
          >
            {/* Rank */}
            <div className="w-8 text-center flex-shrink-0">
              {rank <= 3
                ? <span className="text-xl">{rankEmojis[rank - 1]}</span>
                : <span className={`font-display font-black text-sm ${rankColors[rank - 1] || 'text-muted-foreground'}`}>#{rank}</span>
              }
            </div>

            {/* Avatar */}
            <div className="w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center flex-shrink-0">
              <Trophy className="w-4 h-4 text-primary" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-sm truncate">
                {opp.display_name || 'Unknown'}
                {isMe && <span className="text-primary text-xs ml-1">(You)</span>}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Lv.{opp.level || 1} · {opp.wins || 0}W / {opp.losses || 0}L · Power: {opp.deckPower || '—'}
              </p>
            </div>

            {/* Challenge */}
            {!isMe && (
              <Button
                size="sm"
                variant="outline"
                className="flex-shrink-0 gap-1.5 border-red-500/40 text-red-400 hover:bg-red-500/10"
                onClick={() => onChallenge(opp)}
              >
                <Swords className="w-3.5 h-3.5" /> Attack
              </Button>
            )}
            {isMe && (
              <span className="text-xs text-primary font-semibold flex-shrink-0">⚔️ You</span>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}