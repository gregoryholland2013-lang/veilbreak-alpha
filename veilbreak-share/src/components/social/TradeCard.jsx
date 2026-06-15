import React from 'react';
import { Button } from '@/components/ui/button';
import {
  Check,
  X,
  ArrowRight,
  PackageOpen,
  Clock,
  Gift,
} from 'lucide-react';

const RESOURCE_META = [
  { key: 'gold', icon: '🪙', label: 'Gold' },
  { key: 'aether_dust', icon: '✨', label: 'Aether Dust' },
  { key: 'spirit_water', icon: '💧', label: 'Spirit Water' },
  { key: 'skill_shards', icon: '⚗️', label: 'Skill Shards' },
  { key: 'fodder_cards', icon: '🃏', label: 'Fodder' },
  { key: 'ironveil_core_fragments', icon: '💠', label: 'Ironveil Core' },
  { key: 'ironveil_summon_shards', icon: '🔮', label: 'Ironveil Shard' },
];

function getData(trade, key) {
  return trade?.[key] || {};
}

function ItemPills({ data }) {
  const items = [];

  RESOURCE_META.forEach((resource) => {
    const amount = Number(data?.[resource.key] || 0);

    if (amount > 0) {
      items.push({
        icon: resource.icon,
        label: `${amount} ${resource.label}`,
      });
    }
  });

  const cards = Array.isArray(data?.cards) ? data.cards : [];

  cards.forEach((card) => {
    items.push({
      icon: '🎴',
      label:
        card.card_name ||
        card.name ||
        card.rarity ||
        card.card_id ||
        card.player_card_id ||
        'Card',
    });
  });

  if (items.length === 0) {
    return (
      <span className="text-[10px] text-muted-foreground italic">
        nothing
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item, i) => (
        <span
          key={`${item.label}-${i}`}
          className="inline-flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
        >
          {item.icon} {item.label}
        </span>
      ))}
    </div>
  );
}

const statusColors = {
  open: 'text-green-400',
  accepted: 'text-yellow-300',
  completed: 'text-blue-400',
  cancelled: 'text-muted-foreground',
};

export default function TradeCard({
  trade,
  claim,
  isOwn,
  isHistory,
  onAccept,
  onCancel,
  onClaim,
}) {
  const offerData = getData(trade, 'offer_data');
  const wantData = getData(trade, 'want_data');
  const status = trade?.status || claim?.status || 'open';
  const claimMode = Boolean(claim);

  return (
    <div
      className={`bg-card border rounded-xl p-3 space-y-2 ${
        isOwn || claimMode ? 'border-primary/30 bg-primary/5' : 'border-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-foreground truncate">
          {claimMode
            ? `🎁 Claim from ${trade?.title || 'Bazaar Trade'}`
            : `🏪 ${trade?.poster_display_name || trade?.poster_email || 'Bazaar'}`}
        </p>

        {(isHistory || status !== 'open' || claimMode) && (
          <span
            className={`text-[10px] font-bold ${
              statusColors[status] || 'text-muted-foreground'
            }`}
          >
            {claimMode ? claim.status : status}
          </span>
        )}
      </div>

      {trade?.title && !claimMode && (
        <p className="text-[11px] font-display text-primary truncate">
          {trade.title}
        </p>
      )}

      {trade?.note && (
        <p className="text-[10px] text-muted-foreground italic">
          "{trade.note}"
        </p>
      )}

      {claimMode ? (
        <div className="rounded-lg bg-muted/30 p-2">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">
            You will claim
          </p>
          <ItemPills data={claim.claim_data || {}} />
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 space-y-0.5">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Offers
            </p>
            <ItemPills data={offerData} />
          </div>

          <ArrowRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />

          <div className="flex-1 space-y-0.5">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              Wants
            </p>
            <ItemPills data={wantData} />
          </div>
        </div>
      )}

      {trade?.status === 'accepted' && !claimMode && (
        <div className="flex items-center gap-1 text-[10px] text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1">
          <Clock className="w-3 h-3" />
          Accepted — waiting for claims
        </div>
      )}

      <div className="flex gap-2 pt-1">
        {claimMode && onClaim && claim.status === 'pending' && (
          <Button
            size="sm"
            className="flex-1 h-7 gap-1 text-xs"
            onClick={onClaim}
          >
            <Gift className="w-3.5 h-3.5" />
            Claim
          </Button>
        )}

        {!claimMode && !isHistory && !isOwn && onAccept && trade?.status === 'open' && (
          <Button
            size="sm"
            className="flex-1 h-7 gap-1 text-xs"
            onClick={onAccept}
          >
            <Check className="w-3.5 h-3.5" />
            Accept
          </Button>
        )}

        {!claimMode && !isHistory && onCancel && trade?.status === 'open' && (
          <Button
            size="sm"
            variant="ghost"
            className={`h-7 gap-1 text-xs text-destructive ${
              !isOwn && onAccept ? '' : 'flex-1'
            }`}
            onClick={onCancel}
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
        )}

        {claimMode && claim.status === 'claimed' && (
          <div className="flex-1 h-7 rounded-md bg-muted/50 text-[10px] flex items-center justify-center gap-1 text-muted-foreground">
            <PackageOpen className="w-3 h-3" />
            Claimed
          </div>
        )}
      </div>
    </div>
  );
}