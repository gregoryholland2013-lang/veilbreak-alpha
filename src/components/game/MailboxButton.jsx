import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Mail } from 'lucide-react';

export default function MailboxButton() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel('mailbox-button-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mailbox_messages',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['mailboxUnreadCount'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: claimableCount = 0 } = useQuery({
    queryKey: ['mailboxUnreadCount'],
    staleTime: 30000,
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) return 0;

      const { count, error } = await supabase
        .from('mailbox_messages')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'claimable');

      if (error) throw error;

      return count || 0;
    },
  });

  return (
    <Link to="/mailbox" aria-label="Open mailbox">
      <div className="relative flex h-12 w-12 flex-col items-center justify-center rounded-xl border border-border bg-card/80 transition-all hover:border-primary/50 hover:bg-primary/10">
        <Mail
          className={`h-5 w-5 ${
            claimableCount > 0 ? 'text-primary' : 'text-muted-foreground'
          }`}
        />

        {claimableCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black text-white">
            {claimableCount > 9 ? '9+' : claimableCount}
          </span>
        )}
      </div>
    </Link>
  );
}
