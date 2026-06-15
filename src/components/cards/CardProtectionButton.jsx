import { useState } from 'react';
import { Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function CardProtectionButton({
  playerCard,
  onUpdated,
  size = 'sm',
}) {
  const [saving, setSaving] = useState(false);
  const isProtected = Boolean(playerCard?.is_protected);

  async function toggleProtection(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!playerCard?.id || saving) return;

    setSaving(true);

    try {
      const { data, error } = await supabase.rpc('toggle_card_protection', {
        p_player_card_id: playerCard.id,
        p_is_protected: !isProtected,
      });

      if (error) {
        throw error;
      }

      toast.success(!isProtected ? 'Card protected' : 'Card protection removed');

      if (onUpdated) {
        onUpdated(data);
      }
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not update card protection.');
    } finally {
      setSaving(false);
    }
  }

  const sizeClasses = {
    xs: {
      button: 'w-7 h-7',
      icon: 'w-3.5 h-3.5',
    },
    sm: {
      button: 'w-8 h-8',
      icon: 'w-4 h-4',
    },
    md: {
      button: 'w-10 h-10',
      icon: 'w-5 h-5',
    },
  };

  const buttonSize = sizeClasses[size]?.button || sizeClasses.sm.button;
  const iconSize = sizeClasses[size]?.icon || sizeClasses.sm.icon;

  return (
    <button
      type="button"
      onClick={toggleProtection}
      onPointerDown={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      disabled={saving}
      title={isProtected ? 'Unprotect card' : 'Protect card'}
      className={`${buttonSize} relative z-[100] rounded-lg border flex items-center justify-center transition-all disabled:opacity-60 disabled:cursor-wait ${
        isProtected
          ? 'border-primary/60 bg-primary/15 text-primary'
          : 'border-border bg-background/70 text-muted-foreground hover:text-primary hover:border-primary/50 hover:bg-primary/10'
      }`}
    >
      {isProtected ? (
        <Lock className={iconSize} />
      ) : (
        <Unlock className={iconSize} />
      )}
    </button>
  );
}