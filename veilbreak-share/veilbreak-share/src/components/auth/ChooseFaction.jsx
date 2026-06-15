import React, { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Cpu, Flame, Waves, Leaf, Sun } from 'lucide-react';

const FACTIONS = [
  {
    id: 'ironveil',
    name: 'Ironveil',
    icon: Cpu,
    emoji: '⚙️',
    color: 'from-slate-800/90 to-blue-950/90 border-blue-400/50',
    iconColor: 'text-blue-300',
    tagline: 'Machine-born warriors of steel, strategy, and impossible technology.',
    bonus: '+5% deck defense later',
  },
  {
    id: 'embercourt',
    name: 'Embercourt',
    icon: Flame,
    emoji: '🔥',
    color: 'from-red-950/90 to-orange-950/90 border-red-400/50',
    iconColor: 'text-red-300',
    tagline: 'Demonic nobles fueled by fire, ambition, and destructive power.',
    bonus: '+5% attack power later',
  },
  {
    id: 'tideborn',
    name: 'Tideborn',
    icon: Waves,
    emoji: '💧',
    color: 'from-cyan-950/90 to-blue-950/90 border-cyan-400/50',
    iconColor: 'text-cyan-300',
    tagline: 'Water-bound mystics who control flow, survival, and battlefield tempo.',
    bonus: '+5% stamina recovery later',
  },
  {
    id: 'verdant',
    name: 'Verdant',
    icon: Leaf,
    emoji: '🌿',
    color: 'from-emerald-950/90 to-green-950/90 border-emerald-400/50',
    iconColor: 'text-emerald-300',
    tagline: 'Ancient nature guardians who endure, regenerate, and overwhelm slowly.',
    bonus: '+5% HP scaling later',
  },
  {
    id: 'aurelion',
    name: 'Aurelion',
    icon: Sun,
    emoji: '✨',
    color: 'from-yellow-950/90 to-amber-950/90 border-yellow-400/50',
    iconColor: 'text-yellow-300',
    tagline: 'Divine lightbearers tied to gods, judgment, and legendary ascension.',
    bonus: '+5% XP gain later',
  },
];

const HERO_IMAGE =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/12dd112d1_generated_image.png';

export default function ChooseFaction({ profile, onChosen }) {
  const [selectedFaction, setSelectedFaction] = useState(null);
  const [saving, setSaving] = useState(false);

  const chooseFaction = async () => {
    if (!selectedFaction) {
      toast.error('Choose a faction first');
      return;
    }

    if (!profile?.id) {
      toast.error('Profile not loaded yet');
      return;
    }

    setSaving(true);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({
          faction: selectedFaction,
          faction_chosen_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      toast.success('Faction chosen!');
      onChosen?.(data);
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not choose faction');
    } finally {
      setSaving(false);
    }
  };

  const selected = FACTIONS.find((f) => f.id === selectedFaction);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt=""
          className="w-full h-full object-cover object-top opacity-40"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-background/70 to-background" />
      </div>

      <div className="relative z-10 max-w-lg mx-auto min-h-screen px-4 py-8 pb-24">
        <div className="text-center mb-6">
          <h1 className="font-display text-3xl font-black text-primary text-glow-gold tracking-widest">
            CHOOSE YOUR FACTION
          </h1>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            Your faction shapes your identity in Veilbreak. This choice will be
            tied to your account.
          </p>
        </div>

        <div className="space-y-3">
          {FACTIONS.map((faction) => {
            const Icon = faction.icon;
            const isSelected = selectedFaction === faction.id;

            return (
              <button
                key={faction.id}
                type="button"
                onClick={() => setSelectedFaction(faction.id)}
                className={`w-full text-left relative overflow-hidden rounded-2xl border p-4 bg-gradient-to-br ${faction.color} transition-all ${
                  isSelected
                    ? 'scale-[1.02] ring-2 ring-primary shadow-xl'
                    : 'opacity-85 hover:opacity-100 hover:scale-[1.01]'
                }`}
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-primary/25 to-transparent rounded-bl-2xl" />

                <div className="relative flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-background/40 border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-6 h-6 ${faction.iconColor}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-display font-black text-lg text-foreground">
                        {faction.emoji} {faction.name}
                      </p>

                      {isSelected && (
                        <span className="text-[10px] text-primary font-bold uppercase tracking-wider">
                          Selected
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-foreground/75 mt-1 leading-relaxed">
                      {faction.tagline}
                    </p>

                    <p className="text-[10px] text-muted-foreground mt-2">
                      Future bonus: {faction.bonus}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="sticky bottom-4 mt-6">
          <div className="rounded-2xl border border-primary/30 bg-background/75 backdrop-blur-md p-4 shadow-2xl">
            <p className="text-xs text-muted-foreground mb-3">
              {selected
                ? `You selected ${selected.name}.`
                : 'Select one faction to begin your journey.'}
            </p>

            <Button
              onClick={chooseFaction}
              disabled={!selectedFaction || saving}
              className="w-full"
            >
              {saving ? 'Saving Faction…' : 'Begin Journey'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}