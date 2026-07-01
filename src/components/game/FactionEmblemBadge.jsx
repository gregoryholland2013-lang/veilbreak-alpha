import React from 'react';
import { Shield } from 'lucide-react';
import { getFactionEmblemMeta } from '@/utils/factionEmblems';

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
  xl: 'h-14 w-14',
  fill: 'h-full w-full',
};

export default function FactionEmblemBadge({
  card,
  faction,
  size = 'md',
  className = '',
}) {
  const meta = getFactionEmblemMeta(faction || card);
  const src = meta?.url || meta?.src;

  if (!src) {
    return (
      <div
        className={`pointer-events-none flex select-none items-center justify-center ${sizeClasses[size] || sizeClasses.md} ${className}`}
        title="Faction"
      >
        <Shield className="h-4 w-4 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className={`pointer-events-none select-none ${sizeClasses[size] || sizeClasses.md} ${className}`}
      title={meta.label || faction || 'Faction'}
    >
      <img
        src={src}
        alt={`${meta.label || faction || 'Faction'} emblem`}
        draggable={false}
        className="h-full w-full object-contain opacity-100 drop-shadow-[0_0_8px_rgba(0,0,0,0.75)]"
      />
    </div>
  );
}
