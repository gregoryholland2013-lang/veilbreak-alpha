import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';
import { Mail } from 'lucide-react';

function getWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);

  monday.setDate(now.getDate() + diff);
  monday.setHours(0, 0, 0, 0);

  return monday.toISOString().split('T')[0];
}

function getTodayDayNum() {
  const d = new Date().getDay();
  return d === 0 ? 7 : d;
}

export default function MailboxButton() {
  const queryClient = useQueryClient();

  const weekStart = getWeekStart();
  const todayDay = getTodayDayNum();
  const todayStr = new Date().toISOString().split('T')[0];

  const { data: loginRecord = null } = useQuery({
    queryKey: ['loginRecord', weekStart],
    staleTime: 30000,
    queryFn: async () => {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        return null;
      }

      const { data, error } = await supabase
        .from('player_login_records')
        .select('*')
        .eq('user_id', user.id)
        .eq('week_start', weekStart)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel('mailbox-login-record-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'player_login_records',
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['loginRecord'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const claimedDays = loginRecord?.claimed_days || [];

  const hasUnclaimed =
    !!loginRecord &&
    !claimedDays.includes(todayDay) &&
    loginRecord.last_claim_date !== todayStr;

  return (
    <Link to="/mailbox">
      <div className="relative flex flex-col items-center justify-center w-12 h-12 rounded-xl bg-card/80 border border-border hover:border-primary/50 transition-all">
        <Mail className="w-5 h-5 text-muted-foreground" />

        {hasUnclaimed && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center">
            1
          </span>
        )}
      </div>
    </Link>
  );
}