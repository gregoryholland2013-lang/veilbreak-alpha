import React, { useEffect, useMemo, useState } from 'react';
import {
  Dumbbell,
  HeartHandshake,
  Minus,
  RefreshCw,
  Shield,
  Sparkles,
  Sword,
  Users,
  Zap,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STAT_META = {
  stamina: { label: 'Stamina', short: 'STA', icon: Zap, color: 'text-emerald-300', border: 'border-emerald-400/25', bg: 'bg-emerald-500/10' },
  attack: { label: 'Attack', short: 'ATK', icon: Sword, color: 'text-red-300', border: 'border-red-400/25', bg: 'bg-red-500/10' },
  defense: { label: 'Defense', short: 'DEF', icon: Shield, color: 'text-blue-300', border: 'border-blue-400/25', bg: 'bg-blue-500/10' },
};

function numberValue(value) {
  return Number(value || 0);
}

function totalDraft(draft) {
  return numberValue(draft.stamina) + numberValue(draft.attack) + numberValue(draft.defense);
}

function StatPreview({ stat, value }) {
  const meta = STAT_META[stat];
  const Icon = meta.icon;

  return (
    <div className={`rounded-xl border ${meta.border} ${meta.bg} p-3 text-center`}>
      <Icon className={`mx-auto mb-1 h-4 w-4 ${meta.color}`} />
      <p className={`font-display text-lg font-black ${meta.color}`}>{Number(value || 0).toLocaleString()}</p>
      <p className="text-[10px] text-muted-foreground">{meta.short}</p>
    </div>
  );
}

function AllocationRow({ stat, value, canAdd, onAdd, onRemove }) {
  const meta = STAT_META[stat];
  const Icon = meta.icon;

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/40 p-2">
      <div className="flex min-w-0 items-center gap-2">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${meta.border} ${meta.bg}`}>
          <Icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <div>
          <p className="text-xs font-black text-foreground">{meta.label}</p>
          <p className="text-[10px] text-muted-foreground">Allocated points</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button type="button" onClick={onRemove} disabled={value <= 0} className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card disabled:opacity-35">
          <Minus className="h-3.5 w-3.5" />
        </button>
        <div className="min-w-10 rounded-lg border border-border bg-black/25 px-2 py-1 text-center text-sm font-black">{value}</div>
        <button type="button" onClick={onAdd} disabled={!canAdd} className="flex h-8 w-8 items-center justify-center rounded-lg border border-primary/35 bg-primary/10 text-primary disabled:opacity-35">
          +
        </button>
      </div>
    </div>
  );
}

function AllocationSection({ title, subtitle, icon: Icon, state, draft, setDraft, onSave, saving, accent = 'text-primary' }) {
  const used = totalDraft(draft);
  const available = Math.max(numberValue(state?.total) - used, 0);
  const overLimit = used > numberValue(state?.total);

  const adjust = (stat, amount) => {
    setDraft((current) => {
      const next = { ...current, [stat]: Math.max(numberValue(current[stat]) + amount, 0) };
      if (totalDraft(next) > numberValue(state?.total)) return current;
      return next;
    });
  };

  return (
    <section className="rounded-2xl border border-border bg-background/35 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10">
            <Icon className={`h-4.5 w-4.5 ${accent}`} />
          </div>
          <div>
            <p className="font-display text-sm font-black text-foreground">{title}</p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-primary/25 bg-primary/10 px-2 py-1 text-right">
          <p className="text-[10px] text-muted-foreground">Available</p>
          <p className="font-display text-lg font-black text-primary">{available}</p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="rounded-xl border border-border bg-card/60 p-2 text-center"><p className="text-[10px] text-muted-foreground">Total</p><p className="font-display text-base font-black">{numberValue(state?.total)}</p></div>
        <div className="rounded-xl border border-border bg-card/60 p-2 text-center"><p className="text-[10px] text-muted-foreground">Used</p><p className="font-display text-base font-black">{used}</p></div>
        <div className="rounded-xl border border-border bg-card/60 p-2 text-center"><p className="text-[10px] text-muted-foreground">Left</p><p className="font-display text-base font-black text-primary">{available}</p></div>
      </div>

      <div className="mt-3 space-y-2">
        {['stamina', 'attack', 'defense'].map((stat) => (
          <AllocationRow key={stat} stat={stat} value={numberValue(draft[stat])} canAdd={available > 0} onAdd={() => adjust(stat, 1)} onRemove={() => adjust(stat, -1)} />
        ))}
      </div>

      {overLimit && <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 p-2 text-xs text-red-200">This allocation is over the allowed limit.</div>}

      <Button type="button" onClick={onSave} disabled={saving || overLimit} className="mt-3 w-full">
        {saving ? 'Saving…' : `Save ${title}`}
      </Button>
    </section>
  );
}

export default function AttributePanel({ compact = false }) {
  const queryClient = useQueryClient();
  const [levelDraft, setLevelDraft] = useState({ stamina: 0, attack: 0, defense: 0 });
  const [friendDraft, setFriendDraft] = useState({ stamina: 0, attack: 0, defense: 0 });
  const [savingSource, setSavingSource] = useState(null);
  const [resetting, setResetting] = useState(false);

  const { data: state = null, isLoading, refetch } = useQuery({
    queryKey: ['attributeState'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_current_user_attribute_state');
      if (error) throw error;
      return data;
    },
    staleTime: 0,
  });

  useEffect(() => {
    if (!state) return;
    setLevelDraft({ stamina: numberValue(state.level?.stamina), attack: numberValue(state.level?.attack), defense: numberValue(state.level?.defense) });
    setFriendDraft({ stamina: numberValue(state.friends?.stamina), attack: numberValue(state.friends?.attack), defense: numberValue(state.friends?.defense) });
  }, [state]);

  const finalStats = useMemo(() => state?.finalStats || { stamina: 100, attack: 100, defense: 100, total: 300 }, [state]);

  const invalidateProfile = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['attributeState'] }),
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['profile'] }),
    ]);
  };

  const saveAllocation = async (source) => {
    const draft = source === 'level' ? levelDraft : friendDraft;
    setSavingSource(source);
    try {
      const { error } = await supabase.rpc('allocate_current_user_attributes', {
        p_source: source,
        p_stamina: numberValue(draft.stamina),
        p_attack: numberValue(draft.attack),
        p_defense: numberValue(draft.defense),
      });
      if (error) throw error;
      toast.success(source === 'level' ? 'Core Attributes saved.' : 'Friend Attributes saved.');
      await invalidateProfile();
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not save Attributes');
    } finally {
      setSavingSource(null);
    }
  };

  const resetAttributes = async () => {
    if (!window.confirm('Use 1 Veil Recalibration Token to reset all Attributes?')) return;
    setResetting(true);
    try {
      const { error } = await supabase.rpc('reset_current_user_attributes');
      if (error) throw error;
      toast.success('Attributes recalibrated.');
      await invalidateProfile();
      await refetch();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not recalibrate Attributes');
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) return <div className="rounded-2xl border border-border bg-background/40 p-4 text-center text-sm text-muted-foreground">Loading Attributes…</div>;
  if (!state) return <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-200">Attributes are not ready. Run the Attributes SQL first.</div>;

  const tokenCount = numberValue(state.recalibrationTokens);

  return (
    <div className={compact ? 'space-y-4' : 'space-y-5'}>
      <section className="relative overflow-hidden rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-primary/20 blur-3xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-black/25"><Dumbbell className="h-5 w-5 text-primary" /></div>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg font-black text-primary">Attributes</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Allocate points from leveling and friends into Stamina, ATK, or DEF.</p>
          </div>
        </div>
        <div className="relative mt-4 grid grid-cols-3 gap-2">
          <StatPreview stat="stamina" value={finalStats.stamina} />
          <StatPreview stat="attack" value={finalStats.attack} />
          <StatPreview stat="defense" value={finalStats.defense} />
        </div>
        <div className="relative mt-3 rounded-xl border border-border/70 bg-background/45 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Total Account Stats</p>
            <p className="font-display text-xl font-black text-primary">{numberValue(finalStats.total).toLocaleString()}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <AllocationSection title="Core Attributes" subtitle={`Level ${state.level?.playerLevel || 1} · +3 per level above Level 1`} icon={Sparkles} state={state.level} draft={levelDraft} setDraft={setLevelDraft} onSave={() => saveAllocation('level')} saving={savingSource === 'level'} accent="text-primary" />
        <AllocationSection title="Friend Attributes" subtitle={`${state.friends?.countedFriends || 0}/${state.friends?.friendSlots || 0} friends counted · +5 per accepted friend`} icon={HeartHandshake} state={state.friends} draft={friendDraft} setDraft={setFriendDraft} onSave={() => saveAllocation('friend')} saving={savingSource === 'friend'} accent="text-purple-300" />
      </div>

      <section className="rounded-2xl border border-border bg-background/35 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-purple-400/30 bg-purple-500/10"><Users className="h-4.5 w-4.5 text-purple-300" /></div>
            <div>
              <p className="font-display text-sm font-black text-foreground">Friend Slots</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Friends over your cap can still exist, but only capped friends give Attribute points.</p>
            </div>
          </div>
          <div className="rounded-xl border border-purple-400/25 bg-purple-500/10 px-3 py-2 text-right">
            <p className="text-[10px] text-muted-foreground">Counted</p>
            <p className="font-display text-lg font-black text-purple-200">{state.friends?.countedFriends || 0}/{state.friends?.friendSlots || 0}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-yellow-400/25 bg-yellow-500/10 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-sm font-black text-yellow-200">Veil Recalibration Token</p>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Full reset for Core and Friend Attributes. Removing friends only partially adjusts Friend Attributes.</p>
            <p className="mt-2 text-xs font-black text-primary">Owned: {tokenCount}</p>
          </div>
          <Button type="button" onClick={resetAttributes} disabled={resetting || tokenCount < 1} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            {resetting ? 'Recalibrating…' : 'Recalibrate'}
          </Button>
        </div>
      </section>
    </div>
  );
}
