import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Sword, Shield, Heart, ChevronRight, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

const rarityColors = {
  common: 'border-muted-foreground/40',
  rare: 'border-blue-400',
  epic: 'border-purple-400',
  legendary: 'border-primary',
};
const rarityBg = {
  common: 'bg-muted/20',
  rare: 'bg-blue-900/20',
  epic: 'bg-purple-900/20',
  legendary: 'bg-primary/10',
};
const elementIcons = { fire: '🔥', water: '💧', earth: '🌿', light: '✨', dark: '🌑' };

export default function EnhanceCardPicker({ enrichedCards, onSelect }) {
  const [search, setSearch] = useState('');

  const filtered = enrichedCards.filter(({ card }) =>
    card.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-primary">Choose a Card to Enhance</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Select the card you want to level up or evolve.</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search cards..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div className="space-y-2">
        {filtered.map(({ card, playerCard }, i) => {
          const level = playerCard.level || 1;
          const mult = 1 + (level - 1) * 0.1;
          const evolveCount = playerCard.evolve_count || 0;
          return (
            <motion.button
              key={playerCard.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              onClick={() => onSelect({ card, playerCard })}
              className={`w-full flex items-center gap-3 rounded-xl border-2 ${rarityColors[card.rarity]} ${rarityBg[card.rarity]} p-3 hover:brightness-110 transition-all text-left`}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex items-center justify-center flex-shrink-0">
                {card.image_url
                  ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover" />
                  : <span className="text-2xl">{elementIcons[card.element] || '⚔️'}</span>
                }
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-display font-bold text-sm truncate">{card.name}</p>
                  {evolveCount > 0 && (
                    <span className="text-[9px] bg-primary/20 text-primary px-1.5 py-0.5 rounded-full font-bold">
                      +{evolveCount} Evo
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground capitalize">{card.rarity} · Lv.{level} · {evolveCount}/4 evolutions</p>
                <div className="flex gap-2 mt-1 text-[10px]">
                  <span className="text-red-400 flex items-center gap-0.5"><Sword className="w-2.5 h-2.5" />{Math.round(card.base_attack * mult)}</span>
                  <span className="text-blue-400 flex items-center gap-0.5"><Shield className="w-2.5 h-2.5" />{Math.round(card.base_defense * mult)}</span>
                  <span className="text-green-400 flex items-center gap-0.5"><Heart className="w-2.5 h-2.5" />{Math.round(card.base_hp * mult)}</span>
                </div>
              </div>

              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </motion.button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-muted-foreground py-8 text-sm">No cards found.</p>
      )}
    </div>
  );
}