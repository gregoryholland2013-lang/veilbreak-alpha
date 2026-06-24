import React from 'react';

function formatStage(stage) {
  const map = {
    base: 'Base',
    base_plus: 'Base+',
    base_plus_plus: 'Base++',
    final: 'Final',
  };

  return map[stage] || stage || 'Base';
}

export default function CardBack({ card, lore }) {
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-2xl border border-blue-300/30 bg-slate-950 p-5 text-white shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-950/80 via-black to-slate-950" />

      <div className="absolute inset-0 opacity-10">
        <div className="flex h-full items-center justify-center text-center text-5xl font-bold tracking-[0.25em] text-white">
          VEILBREAK
        </div>
      </div>

      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-blue-500/20 blur-3xl" />
      <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-blue-700/20 blur-3xl" />

      <div className="relative z-10 flex h-full flex-col">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.35em] text-blue-300">
            Veilbreak Archive
          </div>

          <h2 className="mt-4 text-3xl font-serif">{card?.name || 'Unknown Card'}</h2>

          <p className="mt-1 text-sm text-blue-200">
            {card?.faction || 'Unknown'} · {formatStage(card?.evolution_stage)}
          </p>
        </div>

        <div className="my-5 h-px bg-blue-300/30" />

        {lore?.quote && (
          <p className="text-center text-sm italic leading-relaxed text-blue-100">
            “{lore.quote}”
          </p>
        )}

        <div className="mt-5 rounded-xl border border-blue-300/20 bg-black/35 p-4">
          <div className="mb-2 text-xs uppercase tracking-[0.25em] text-blue-300">
            {lore?.title || 'Lore Locked'}
          </div>

          <p className="text-sm leading-relaxed text-slate-200">
            {lore?.body || 'No lore has been discovered for this card yet.'}
          </p>
        </div>

        <div className="mt-auto pt-4 text-center text-xs uppercase tracking-[0.25em] text-slate-500">
          {card?.rarity || 'Veilbreak'}
        </div>
      </div>
    </div>
  );
}