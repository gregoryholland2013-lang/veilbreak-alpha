import { Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';

export default function CardProtectionButton({
  playerCard,
  onUpdated,
  size = 'sm',
}) {
  const isProtected = Boolean(playerCard?.is_protected);

  async function toggleProtection(event) {
    event.preventDefault();
    event.stopPropagation();

    if (!playerCard?.id) return;

    const { data, error } = await supabase.rpc('toggle_card_protection', {
      p_player_card_id: playerCard.id,
      p_is_protected: !isProtected,
    });

    if (error) {
      console.error(error);
      toast.error(error.message || 'Could not update card protection.');
      return;
    }

    toast.success(!isProtected ? 'Card protected' : 'Card protection removed');

    if (onUpdated) {
      onUpdated(data);
    }
  }

  const buttonSize = size === 'md' ? 'w-10 h-10' : 'w-8 h-8';
  const iconSize = size === 'md' ? 'w-5 h-5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={toggleProtection}
      title={isProtected ? 'Unprotect card' : 'Protect card'}
      className={`${buttonSize} rounded-xl border flex items-center justify-center transition-all ${
        isProtected
          ? 'border-yellow-400/60 bg-yellow-400/20 text-yellow-300 shadow-lg shadow-yellow-900/30'
          : 'border-slate-600 bg-slate-950/90 text-slate-400 hover:text-yellow-300 hover:border-yellow-400/50'
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