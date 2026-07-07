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
  fire: 'bg-gradient-to-br from-red-950/90 to-orange-900/70',
  water: 'bg-gradient-to-br from-blue-950/90 to-cyan-900/70',
  earth: 'bg-gradient-to-br from-green-950/90 to-emerald-900/70',
  light: 'bg-gradient-to-br from-yellow-950/90 to-amber-900/70',
  dark: 'bg-gradient-to-br from-purple-950/90 to-slate-950',
  lightning: 'bg-gradient-to-br from-yellow-950/90 to-blue-950/80',
};

/*
  IMPORTANT:
  The faction emblem is intentionally rendered BEHIND the frame layer.
  This lets the frame's circular socket/ring sit on top of the emblem,
  which makes the emblem feel seated inside the frame instead of floating over it.
*/
const SIZE_ZONES = {
  sm: {
    radius: 'rounded-[16px]',
    innerRadius: 'rounded-[10px]',
    art: { top: '9.1%', left: '9.0%', right: '9.0%', bottom: '19.2%' },
    name: { left: '15.0%', right: '15.0%', bottom: '12.85%', height: '7.8%' },
    emblem: { top: '8.7%', right: '7.9%', width: '14.25%' },
    nameText: 'text-[8px]',
  },
  md: {
    radius: 'rounded-[20px]',
    innerRadius: 'rounded-[12px]',
    art: { top: '9.0%', left: '8.8%', right: '8.8%', bottom: '19.0%' },
    name: { left: '14.6%', right: '14.6%', bottom: '12.85%', height: '7.9%' },
    emblem: { top: '8.7%', right: '7.9%', width: '14.25%' },
    nameText: 'text-[12px]',
  },
  lg: {
    radius: 'rounded-[24px]',
    innerRadius: 'rounded-[14px]',
    art: { top: '8.9%', left: '8.6%', right: '8.6%', bottom: '18.8%' },
    name: { left: '14.3%', right: '14.3%', bottom: '12.85%', height: '8.1%' },
    emblem: { top: '8.7%', right: '7.9%', width: '14.25%' },
    nameText: 'text-[15px]',
  },
  detail: {
    radius: 'rounded-[26px]',
    innerRadius: 'rounded-[16px]',
    art: { top: '8.9%', left: '8.6%', right: '8.6%', bottom: '18.8%' },
    name: { left: '14.3%', right: '14.3%', bottom: '12.85%', height: '8.1%' },
    emblem: { top: '8.7%', right: '7.9%', width: '14.25%' },
    nameText: 'text-[20px] sm:text-[23px]',
  },
};

function getPrimaryArtUrl(card) {
  return (
    card?.clean_art_url ||
    card?.image_url ||
    card?.artwork_url ||
    card?.image ||
    null
  );
}

export default function CardCanvas({
  card,
  playerCard,
  size = 'md',
  className = '',
  children = null,
  showName = true,
  showFactionEmblem = true,
}) {
  const zones = SIZE_ZONES[size] || SIZE_ZONES.md;
  const artUrl = getPrimaryArtUrl(card);

  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden bg-black shadow-2xl ${zones.radius} ${className}`}
    >
      <div className="absolute inset-0 bg-[#02040a]" />
      <div className={`absolute inset-[2px] bg-[#070b12] ${zones.radius}`} />

      <div
        className={`absolute overflow-hidden bg-black ${zones.innerRadius}`}
        style={{
          top: zones.art.top,
          left: zones.art.left,
          right: zones.art.right,
          bottom: zones.art.bottom,
        }}
      >
        {artUrl ? (
          <img
            src={artUrl}
            alt={card?.name || 'Card art'}
            draggable={false}
            className="h-full w-full object-cover object-top"
          />
        ) : (
          <div
            className={`flex h-full w-full items-center justify-center ${
              elementBg[card?.element] || elementBg.dark
            }`}
          >
            <span className="text-5xl drop-shadow-lg">
              {elementIcons[card?.element] || '⚔️'}
            </span>
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/90 to-transparent" />
      </div>

      {showFactionEmblem && (
        <div
          className="absolute z-20 overflow-hidden rounded-full"
          style={{
            top: zones.emblem.top,
            right: zones.emblem.right,
            width: zones.emblem.width,
            aspectRatio: '1 / 1',
          }}
        >
          <FactionEmblemBadge card={card} size="fill" className="scale-[1.16]" />
        </div>
      )}

      <CardFrameOverlay card={card} playerCard={playerCard} />

      {showName && (
        <div
          className="absolute z-40 flex items-center justify-center px-2"
          style={{
            left: zones.name.left,
            right: zones.name.right,
            bottom: zones.name.bottom,
            height: zones.name.height,
          }}
        >
          <span
            className={`max-w-full truncate text-center font-display font-black uppercase tracking-[0.045em] text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.95)] ${zones.nameText}`}
          >
            {card?.name || 'Unknown Card'}
          </span>
        </div>
      )}

      {children}
    </div>
  );
}
