import React from 'react';
import { Sparkles } from 'lucide-react';

export default function SkillTriggerLog({ triggers = [] }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="font-display font-bold text-sm text-primary">
          Skill Triggers
        </p>
      </div>

      {triggers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          No skills triggered this battle.
        </p>
      ) : (
        <div className="space-y-2">
          {triggers.map((trigger, index) => (
            <div
              key={`${trigger.cardName}-${index}`}
              className="rounded-xl border border-border bg-background/40 p-2"
            >
              <p className="text-xs font-bold">
                {trigger.side === 'attacker' ? 'Your' : 'Opponent'}{' '}
                {trigger.cardName}
              </p>

              <p className="text-[10px] text-primary font-semibold">
                {trigger.skillName}
              </p>

              <p className="text-[10px] text-muted-foreground">
                {trigger.description}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}