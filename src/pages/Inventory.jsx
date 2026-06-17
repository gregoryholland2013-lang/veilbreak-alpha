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
  Crown,
  Gift,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const INVENTORY_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

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

const DIRECT_USE_ITEMS = new Set([
  'stamina_potion',
  'attack_refill',
  'defense_refill',
]);

const DISABLED_ITEMS = new Set([
  'aether_dust',
]);

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-cyan-700/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 w-[520px] h-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
    </div>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="w-4 h-4 text-primary" />
        {label}
      </div>
      <p className="font-display text-xl font-black mt-1">{value}</p>
    </div>
  );
}

function QuestPanel({ children, className = '' }) {
  return (
    <section className={`rounded-3xl border border-primary/20 bg-card/90 shadow-2xl overflow-hidden ${className}`}>
      {children}
    </section>
  );
}

export default function Inventory() {
  const [items, setItems] = useState([]);
  const [profile, setProfile] = useState(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [usingItemKey, setUsingItemKey] = useState(null);
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
        .filter((row) => {
          const definition = row.item_definitions || {};
          const itemKey = String(row.item_key || definition.item_key || '').toLowerCase();
          const itemName = String(definition.name || '').toLowerCase();

          if (DISABLED_ITEMS.has(itemKey)) return false;
          if (itemName === 'aether dust') return false;
          if (definition.is_active === false) return false;

          return true;
        })
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
            is_active: definition.is_active !== false,
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

  async function useItem(item) {
    const itemKey = String(item?.item_key || '').toLowerCase();

    if (DISABLED_ITEMS.has(itemKey) || item?.is_active === false) {
      toast.error(`${item?.name || 'This item'} is currently disabled.`);
      return;
    }

    if (!DIRECT_USE_ITEMS.has(item.item_key)) {
      toast.error(`${item.name} is used inside another game system.`);
      return;
    }

    setUsingItemKey(item.item_key);
    setMessage('');

    try {
      const { data, error } = await supabase.rpc('consume_player_item', {
        p_item_key: item.item_key,
        p_quantity: 1,
      });

      if (error) throw error;

      toast.success(data?.message || `${item.name} used.`);
      setMessage(data?.message || `${item.name} used.`);

      await loadInventory();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not use item.');
      setMessage(error.message || 'Could not use item.');
    } finally {
      setUsingItemKey(null);
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
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin mx-auto mb-4" />
          <p className="text-primary font-bold tracking-widest uppercase text-sm">
            Loading Inventory...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={INVENTORY_BG}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.3em] text-xs font-bold">
                  <Package className="w-4 h-4" />
                  Vault Inventory
                </div>

                <h1 className="font-display text-4xl md:text-6xl font-black mt-3 text-primary text-glow-gold">
                  INVENTORY
                </h1>

                <p className="text-muted-foreground mt-3 max-w-3xl">
                  View currencies, materials, consumables, tickets, and event rewards earned across Veilbreak.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat
                  icon={Coins}
                  label="Gold"
                  value={Number(profile?.gold || 0).toLocaleString()}
                />
                <HeroStat
                  icon={Gem}
                  label="Gems"
                  value={Number(profile?.gems || 0).toLocaleString()}
                />
                <HeroStat
                  icon={Package}
                  label="Items"
                  value={items.length.toLocaleString()}
                />
              </div>
            </div>
          </div>
        </section>

        {message && (
          <div className="rounded-2xl border border-primary/40 bg-primary/10 px-5 py-4 text-sm text-primary">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          <aside className="xl:col-span-4 space-y-6">
            <QuestPanel>
              <div className="p-5 border-b border-border bg-primary/5">
                <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                  <Search className="w-4 h-4" />
                  Inventory Filter
                </div>
                <h2 className="font-display text-2xl font-black text-primary mt-2">
                  Search Vault
                </h2>
              </div>

              <div className="p-5 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search items..."
                    className="pl-9 h-10 text-sm"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
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

                <div className="rounded-2xl border border-border bg-background/50 p-4">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    Showing
                  </p>
                  <p className="font-display text-3xl font-black text-primary mt-1">
                    {filteredItems.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Matching inventory rows
                  </p>
                </div>
              </div>
            </QuestPanel>

            <QuestPanel>
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <Gift className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-display font-black text-primary">
                      Item Rule Active
                    </p>
                    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                      Some materials are used inside other systems like Enhance,
                      Summon, Quests, or Events. Direct-use items show a Use button.
                    </p>
                  </div>
                </div>
              </div>
            </QuestPanel>
          </aside>

          <main className="xl:col-span-8">
            <QuestPanel>
              <div className="p-5 md:p-6 border-b border-border bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-primary uppercase tracking-[0.25em] text-xs font-bold">
                      <Crown className="w-4 h-4" />
                      Stored Items
                    </div>

                    <h2 className="font-display text-2xl md:text-3xl font-black text-primary mt-2">
                      Item Vault
                    </h2>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    {filteredItems.length} shown
                  </p>
                </div>
              </div>

              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredItems.map((item) => (
                    <ItemCard
                      key={item.id}
                      item={item}
                      using={usingItemKey === item.item_key}
                      onUse={() => useItem(item)}
                    />
                  ))}
                </div>

                {filteredItems.length === 0 && (
                  <div className="rounded-2xl border border-border bg-background/50 p-8 text-center">
                    <Package className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="font-display font-bold">No items found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Event rewards, materials, and consumables will appear here.
                    </p>
                  </div>
                )}
              </div>
            </QuestPanel>
          </main>
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onUse, using }) {
  const Icon = typeIcons[item.item_type] || Package;
  const style = rarityStyles[item.rarity] || rarityStyles.common;
  const canUseDirectly = DIRECT_USE_ITEMS.has(item.item_key);

  return (
    <div className={`rounded-3xl border p-4 ${style}`}>
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-2xl border border-white/10 bg-black/30 flex items-center justify-center text-3xl flex-shrink-0">
          {item.icon || <Icon className="w-7 h-7" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-lg font-black truncate">
                {item.name}
              </p>
              <p className="text-[10px] uppercase tracking-widest opacity-70">
                {item.rarity.replaceAll('_', ' ')} · {item.item_type}
              </p>
            </div>

            <p className="font-display text-2xl font-black">
              x{Number(item.quantity || 0).toLocaleString()}
            </p>
          </div>

          {item.description && (
            <p className="text-xs opacity-75 mt-2 leading-snug">
              {item.description}
            </p>
          )}

          {canUseDirectly ? (
            <button
              type="button"
              onClick={onUse}
              disabled={using}
              className="mt-4 w-full rounded-xl bg-primary/90 hover:bg-primary disabled:bg-muted disabled:text-muted-foreground disabled:cursor-wait text-primary-foreground px-3 py-2 text-xs font-black"
            >
              {using ? 'Using…' : 'Use'}
            </button>
          ) : (
            <p className="mt-4 text-[10px] uppercase tracking-widest opacity-60">
              Used inside game systems
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
