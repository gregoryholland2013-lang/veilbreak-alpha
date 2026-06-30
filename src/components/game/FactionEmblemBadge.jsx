import React from 'react';
import { Shield } from 'lucide-react';
import { getFactionEmblemMeta } from '@/utils/factionEmblems';

const sizeClasses = {
  sm: {
    wrap: 'h-7 w-7 rounded-lg',
    img: 'h-6 w-6',
    icon: 'h-3.5 w-3.5',
  },
  md: {
    wrap: 'h-9 w-9 rounded-xl',
    img: 'h-8 w-8',
    icon: 'h-4 w-4',
  },
  lg: {
    wrap: 'h-11 w-11 rounded-2xl',
    img: 'h-10 w-10',
    icon: 'h-5 w-5',
  },
};

export default function FactionEmblemBadge({
  card,
  faction,
  size = 'md',
  className = '',
}) {
  const meta = getFactionEmblemMeta(faction || card);
  const classes = sizeClasses[size] || sizeClasses.md;

  if (!meta) {
    return (
      <div
        title="Faction"
        className={`flex ${classes.wrap} items-center justify-center border border-white/10 bg-black/65 backdrop-blur-md ${className}`}
      >
        <Shield className={`${classes.icon} text-muted-foreground`} />
      </div>
    );
  }

  return (
    <div
      title={`Faction: ${meta.label}`}
      className={`flex ${classes.wrap} items-center justify-center border ${meta.border} ${meta.bg} ${meta.glow} bg-black/65 backdrop-blur-md ${className}`}
    >
      <img
        src={meta.url}
        alt={`${meta.label} emblem`}
        className={`${classes.img} object-contain drop-shadow-[0_0_8px_rgba(255,255,255,0.18)]`}
        loading="lazy"
        draggable={false}
      />
    </div>
  );
}
