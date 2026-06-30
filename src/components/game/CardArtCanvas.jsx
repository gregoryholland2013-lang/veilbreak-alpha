import React from 'react';
import FactionEmblemBadge from '@/components/game/FactionEmblemBadge';
import CardFrameOverlay from '@/components/game/CardFrameOverlay';

const elementIcons = {
  fire: '🔥',
  water: '💧',
  earth: '🌿',
  light: '✨',
  dark: '🌑',
  lightning: '⚡',
};

const elementBg = {
  fire: 'bg-gradient-to-br from-red-900/80 to-orange-900/60',
  water: 'bg-gradient-to-br from-blue-900/80 to-cyan-900/60',
  earth: 'bg-gradient-to-br from-green-900/80 to-emerald-900/60',
  light: 'bg-gradient-to-br from-yellow-900/80 to-amber-900/60',
  dark: 'bg-gradient-to-br from-purple-900/80 to-slate-900/60',
  lightning: 'bg-gradient-to-br from-yellow-900/80 to-blue-900/60',
};

function getCardImageUrl(card) {
  return (
    card?.clean_art_url ||
    card?.image_url ||
    card?.artwork_url ||
    card?.image ||
    ''
  );
}

const sizeConfig = {
  sm: {
    artInset: 'left-[9%] right-[9%] top-[10%] bottom-[27%]',
    emblem: 'right-[8.8%] top-[8.8%]',
    emblemSize: 'sm',
    nameWrap: 'left-[14%] right-[14%] bottom-[12.1%]',
    name: 'text-[9px]',
  },
  md: {
    artInset: 'left-[9%] right-[9%] top-[10%] bottom-[26%]',
    emblem: 'right-[8.8%] top-[8.8%]',
    emblemSize: 'sm',
    nameWrap: 'left-[13%] right-[13%] bottom-[12.1%]',
    name: 'text-[11px]',
  },
  lg: {
    artInset: 'left-[9%] right-[9%] top-[10%] bottom-[25%]',
    emblem: 'right-[8.8%] top-[8.8%]',
    emblemSize: 'md',
    nameWrap: 'left-[12%] right-[12%] bottom-[12.1%]',
    name: 'text-xs',
  },
  detail: {
    artInset: 'left-[9%] right-[9%] top-[10%] bottom-[25%]',
    emblem: 'right-[8.8%] top-[9.1%]',
    emblemSize: 'lg',
    nameWrap: 'left-[13%] right-[13%] bottom-[12.1%]',
    name: 'text-xl sm:text-2xl',
  },
};

export default function CardArtCanvas({
  card,
  playerCard,
  size = 'md',
  className = '',
  children = null,
}) {
  const config = sizeConfig[size] || sizeConfig.md;
  const imageUrl = getCardImageUrl(card);

  return (
    <div
      className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-black shadow-2xl ${className}`}
    >
      <div
        className={`absolute ${
          config.artInset
        } z-10 overflow-hidden rounded-lg bg-black/75`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={card?.name || 'Card art'}
            className="h-full w-full object-cover object-top"
            draggable={false}
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${
              elementBg[card?.element] || elementBg.dark
            }`}
          >
            <span className="text-6xl drop-shadow-lg">
              {elementIcons[card?.element] || '⚔️'}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/80 to-transparent" />
      </div>

      <CardFrameOverlay card={card} playerCard={playerCard} />

      <div className={`absolute ${config.emblem} z-50`}>
        <FactionEmblemBadge card={card} size={config.emblemSize} />
      </div>

      <div
        className={`absolute ${
          config.nameWrap
        } z-50 flex min-h-[9%] items-center justify-center px-2 text-center`}
      >
        <p
          className={`max-w-full truncate font-display ${config.name} font-black tracking-wide text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]`}
        >
          {card?.name || 'Unknown Card'}
        </p>
      </div>

      {children}
    </div>
  );
}
