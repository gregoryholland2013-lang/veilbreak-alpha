import React from 'react';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight } from 'lucide-react';

function ItemPills({ trade, prefix }) {
  const items = [];
  if (trade[`${prefix}_gold`] > 0) items.push({ icon: '🪙', label: `${trade[`${prefix}_gold`]} Gold` });
  if (trade[`${prefix}_gems`] > 0) items.push({ icon: '💎', label: `${trade[`${prefix}_gems`]} Gems` });
  if (trade[`${prefix}_aether_dust`] > 0) items.push({ icon: '✨', label: `${trade[`${prefix}_aether_dust`]} Aether Dust` });
  if (trade[`${prefix}_spirit_water`] > 0) items.push({ icon: '💧', label: `${trade[`${prefix}_spirit_water`]} Spirit Water` });
  if (trade[`${prefix}_skill_shards`] > 0) items.push({ icon: '⚗️', label: `${trade[`${prefix}_skill_shards`]} Shards` });
  if (trade[`${prefix}_fodder`] > 0) items.push({ icon: '🃏', label: `${trade[`${prefix}_fodder`]} Fodder` });
  if (prefix === 'offer' && trade.offer_card_name) items.push({ icon: '🎴', label: trade.offer_card_name });
  if (prefix === 'want' && trade.want_card_rarity && trade.want_card_rarity !== 'any') items.push({ icon: '🎴', label: `${trade.want_card_rarity} card` });

  if (items.length === 0) return <span className="text-[10px] text-muted-foreground italic">nothing</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span key={i} className="inline-flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-0.5 text-[10px] font-semibold">
          {item.icon} {item.label}
        </span>
      ))}
    </div>
  );
}

const statusColors = { open: 'text-green-400', completed: 'text-blue-400', cancelled: 'text-muted-foreground' };

export default function TradeCard({ trade, isOwn, isHistory, onAccept, onCancel }) {
  return (
    <div className={`bg-card border rounded-xl p-3 space-y-2 ${isOwn ? 'border-primary/30 bg-primary/5' : 'border-border'}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-foreground truncate">
          {trade.trade_type === 'private' && trade.target_email
            ? `🔒 ${trade.poster_email} → ${trade.target_email}`
            : `🏪 ${trade.poster_display_name || trade.poster_email}`}
        </p>
        {isHistory && (
          <span className={`text-[10px] font-bold ${statusColors[trade.status] || 'text-muted-foreground'}`}>
            {trade.status}
          </span>
        )}
      </div>
      {trade.note && <p className="text-[10px] text-muted-foreground italic">"{trade.note}"</p>}
      <div className="flex items-center gap-2">
        <div className="flex-1 space-y-0.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Offers</p>
          <ItemPills trade={trade} prefix="offer" />
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div className="flex-1 space-y-0.5">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Wants</p>
          <ItemPills trade={trade} prefix="want" />
        </div>
      </div>
      {!isHistory && (
        <div className="flex gap-2 pt-1">
          {!isOwn && onAccept && (
            <Button size="sm" className="flex-1 h-7 gap-1 text-xs" onClick={onAccept}>
              <Check className="w-3.5 h-3.5" /> Accept
            </Button>
          )}
          {onCancel && (
            <Button size="sm" variant="ghost" className={`h-7 gap-1 text-xs text-destructive ${!isOwn && onAccept ? '' : 'flex-1'}`} onClick={onCancel}>
              <X className="w-3.5 h-3.5" /> {isOwn ? 'Cancel' : 'Decline'}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}