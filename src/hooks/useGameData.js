import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabaseClient';

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;

  return user;
}

export function useProfile() {
  return useQuery({
    queryKey: ['playerProfile'],
    queryFn: async () => {
      const user = await getAuthUser();

      if (!user) {
        return null;
      }

      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (!existingProfile) {
        const now = new Date().toISOString();

        const { error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            display_name:
              user.user_metadata?.full_name ||
              user.user_metadata?.name ||
              user.email?.split('@')[0] ||
              'Adventurer',
            level: 1,
            experience: 0,
            gold: 1000,
            gems: 50,
            stamina: 100,
            max_stamina: 100,
            attack_energy: 100,
            max_attack_energy: 100,
            defense_energy: 100,
            max_defense_energy: 100,
            wins: 0,
            losses: 0,
            quests_completed: 0,
            stats_regen_at: now,
            created_at: now,
            updated_at: now,
          });

        if (createError) {
          throw createError;
        }
      }

      const { data: regeneratedProfile, error: regenError } = await supabase
        .rpc('regen_current_user_stats');

      if (regenError) {
        throw regenError;
      }

      return regeneratedProfile;
    },
  });
}

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        throw error;
      }

      return data || [];
    },
    initialData: [],
  });
}

export function usePlayerCards() {
  return useQuery({
    queryKey: ['playerCards'],
    queryFn: async () => {
      const user = await getAuthUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('player_cards')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(200);

      if (error) {
        throw error;
      }

      return data || [];
    },
    initialData: [],
  });
}

export function useDecks() {
  return useQuery({
    queryKey: ['decks'],
    queryFn: async () => {
      const user = await getAuthUser();

      if (!user) {
        return [];
      }

      const { data, error } = await supabase
        .from('decks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    },
    initialData: [],
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updatedProfile, error } = await supabase
        .from('profiles')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updatedProfile;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playerProfile'] });
    },
  });
}

export function useCreatePlayerCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (data) => {
      const user = await getAuthUser();

      if (!user) {
        throw new Error('You must be logged in to create a player card');
      }

      const now = new Date().toISOString();

      const { data: createdCard, error } = await supabase
        .from('player_cards')
        .insert({
          ...data,
          user_id: data.user_id || user.id,
          owner_email: data.owner_email || user.email,
          created_at: now,
          updated_at: now,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return createdCard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playerCards'] });
    },
  });
}

export function useUpdatePlayerCard() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }) => {
      const { data: updatedCard, error } = await supabase
        .from('player_cards')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return updatedCard;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['playerCards'] });
    },
  });
}