import React from 'react';
import { getCardFrameMeta } from '@/utils/cardFrames';

export default function CardFrameOverlay({
  card,
  playerCard,
  className = '',
}) {
  const frame = getCardFrameMeta(card, playerCard);

  return (
    <img
      src={frame.url}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pointer-events-none absolute inset-0 z-30 h-full w-full select-none object-fill ${className}`}
    />
  );
}
