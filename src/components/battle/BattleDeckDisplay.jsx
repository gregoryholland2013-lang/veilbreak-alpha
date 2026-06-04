import React from 'react';
import { Swords, Shield, Heart } from 'lucide-react';
import GameCard from '@/components/game/GameCard';

function formatNum(value) {
  return Math.round(value || 0).toLocaleString();
}

export default function BattleDeckDisplay({
  title,
  deckCards = [],
  stats,
  side = 'left',
}) {
  const hasDeck = deckCards.length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="font-display font-bold text-sm text-primary">
            {title}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {hasDeck ? `${deckCards.length} cards ready` : 'No active deck'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-[10px] text-muted-foreground">Deck Power</p>
          <p className="font-display font-bold text-sm">
            {formatNum(stats?.power)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg border border-border bg-background/40 p-2">
          <Swords className="w-3.5 h-3.5 mx-auto mb-1 text-red-400" />
          <p className="text-[10px] font-bold">{formatNum(stats?.attack)}</p>
          <p className="text-[9px] text-muted-foreground">ATK</p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-2">
          <Shield className="w-3.5 h-3.5 mx-auto mb-1 text-blue-400" />
          <p className="text-[10px] font-bold">{formatNum(stats?.defense)}</p>
          <p className="text-[9px] text-muted-foreground">DEF</p>
        </div>

        <div className="rounded-lg border border-border bg-background/40 p-2">
          <Heart className="w-3.5 h-3.5 mx-auto mb-1 text-green-400" />
          <p className="text-[10px] font-bold">{formatNum(stats?.hp)}</p>
          <p className="text-[9px] text-muted-foreground">HP</p>
        </div>
      </div>

      {hasDeck ? (
        <div
          className={`flex gap-2 overflow-x-auto pb-1 ${
            side === 'right' ? 'justify-end' : 'justify-start'
          }`}
        >
          {deckCards.map(({ card, playerCard }) => (
            <div key={playerCard.id} className="flex-shrink-0">
              <GameCard
                card={card}
                playerCard={playerCard}
                size="sm"
                showStats
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border bg-background/30 p-4 text-center">
          <p className="text-xs text-muted-foreground">
            This player has no active deck. They can still be attacked, but they
            give very low arena points.
          </p>
        </div>
      )}
    </div>
  );
}