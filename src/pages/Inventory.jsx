import { useEffect, useMemo, useState } from 'react';
import {
  Package,
  Sparkles,
  Search,
  Gem,
  Coins,
  Ticket,
  FlaskConical,
  Shield,
  Sword,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import PageHeader from '@/components/game/PageHeader';
import { Input } from '@/components/ui/input';

const rarityStyles = {
  common: 'border-slate-500/40 bg-slate-900/80 text-slate-200',
  uncommon: 'border-green-400/40 bg-green-950/30 text-green-200',
  rare: 'border-blue-400/40 bg-blue-950/30 text-blue-200',
  epic: 'border-purple-400/40 bg-purple-950/30 text-purple-200',
  legendary: 'border-yellow-400/40 bg-yellow-950/30 text-yellow-200',
};

const typeIcons = {
  material: Sparkles,
  event: Ticket,
  summon: Gem,
  consumable: FlaskConical,
  currency: Coins,
  attack: Sword,
  defense: Shield,
};

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    setMessage('');

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        setMessage('You must be logged in to view inventory.');
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProfile(profileData || null);

      const { data: itemRows, error: itemError } = await supabase
        .from('player_items')
        .select(`
          id,
          item_key,
          quantity,
          updated_at,
          item_definitions (
            item_key,
            name,
            description,
            item_type,
            rarity,
            icon,
            sort_order,
            is_active
          )
        `)
        .eq('user_id', user.id)
        .gt('quantity', 0);

      if (itemError) throw itemError;

      const normalized = (itemRows || [])
        .map((row) => {
          const definition = row.item_definitions || {};

          return {
            id: row.id,
            item_key: row.item_key,
            quantity: Number(row.quantity || 0),
            name: definition.name || row.item_key,
            description: definition.description || '',
            item_type: definition.item_type || 'material',
            rarity: definition.rarity || 'common',
            icon: definition.icon || '✨',
            sort_order: Number(definition.sort_order || 100),
          };
        })
        .sort((a, b) => {
          if (a.sort_order !== b.sort_order) {
            return a.sort_order - b.sort_order;
          }

          return a.name.localeCompare(b.name);
        });

      setItems(normalized);
    } catch (error) {
      console.error(error);
      setMessage(error.message || 'Could not load inventory.');
    } finally {
      setLoading(false);
    }
  }

  const types = useMemo(() => {
    const unique = new Set(items.map((item) => item.item_type));
    return ['all', ...Array.from(unique)];
  }, [items]);

  const filteredItems = useMemo(() => {
    const value = search.trim().toLowerCase();

    return items.filter((item) => {
      if (typeFilter !== 'all' && item.item_type !== typeFilter) {
        return false;
      }

      if (!value) return true;

      return (
        item.name.toLowerCase().includes(value) ||
        item.description.toLowerCase().includes(value) ||
        item.item_key.toLowerCase().includes(value) ||
        item.item_type.toLowerCase().includes(value)
      );
    });
  }, [items, search, typeFilter]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center text-muted-foreground">
        Loading inventory…
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <PageHeader title="Inventory" />

      <div className="px-4 space-y-4">
        {message && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {message}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <CurrencyCard label="Gold" value={profile?.gold || 0} icon={Coins} />
          <CurrencyCard label="Gems" value={profile?.gems || 0} icon={Gem} />
        </div>

        <div className="rounded-2xl border border-border bg-card p-3 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search items..."
              className="pl-9 h-9 text-sm"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {types.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={`px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap capitalize ${
                  typeFilter === type
                    ? 'border-primary bg-primary/15 text-primary'
                    : 'border-border bg-background/60 text-muted-foreground'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          {filteredItems.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>

        {filteredItems.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-display font-bold">No items found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Event rewards, materials, and consumables will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function CurrencyCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-primary text-xs font-bold uppercase tracking-widest">
        <Icon className="w-4 h-4" />
        {label}
      </div>

      <p className="text-2xl font-black mt-2">
        {Number(value || 0).toLocaleString()}
      </p>
    </div>
  );
}

function ItemCard({ item }) {
  const Icon = typeIcons[item.item_type] || Package;
  const style = rarityStyles[item.rarity] || rarityStyles.common;

  return (
    <div className={`rounded-2xl border p-4 ${style}`}>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl border border-white/10 bg-black/30 flex items-center justify-center text-2xl">
          {item.icon || <Icon className="w-6 h-6" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display font-black truncate">{item.name}</p>
              <p className="text-[10px] uppercase tracking-widest opacity-70">
                {item.rarity.replaceAll('_', ' ')} · {item.item_type}
              </p>
            </div>

            <p className="text-xl font-black">
              x{Number(item.quantity || 0).toLocaleString()}
            </p>
          </div>

          {item.description && (
            <p className="text-xs opacity-75 mt-2 leading-snug">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}