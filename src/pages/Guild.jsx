import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowUpCircle,
  Coins,
  Crown,
  Eye,
  LogOut,
  Medal,
  Plus,
  Search,
  Shield,
  ShoppingBag,
  Sparkles,
  Store,
  Swords,
  Trash2,
  Trophy,
  UserCheck,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';

const GUILD_BG =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png';

const ROLE_META = {
  guild_leader: {
    label: 'Guild Leader',
    short: 'Guild Leader',
    icon: Crown,
    badge: 'border-primary/50 bg-primary/15 text-primary',
  },
  leader: {
    label: 'Guild Leader',
    short: 'Guild Leader',
    icon: Crown,
    badge: 'border-primary/50 bg-primary/15 text-primary',
  },
  vice_leader: {
    label: 'Vice Leader',
    short: 'Vice',
    icon: Shield,
    badge: 'border-purple-400/50 bg-purple-400/15 text-purple-200',
  },
  attack_leader: {
    label: 'Attack Leader',
    short: 'Attack',
    icon: Swords,
    badge: 'border-red-400/50 bg-red-400/15 text-red-200',
  },
  defense_leader: {
    label: 'Defense Leader',
    short: 'Defense',
    icon: Shield,
    badge: 'border-blue-400/50 bg-blue-400/15 text-blue-200',
  },
  member: {
    label: 'Member',
    short: 'Member',
    icon: Users,
    badge: 'border-border bg-background/70 text-muted-foreground',
  },
};

const ROLE_OPTIONS = [
  { value: 'member', label: 'Member' },
  { value: 'vice_leader', label: 'Vice Leader' },
  { value: 'attack_leader', label: 'Attack Leader' },
  { value: 'defense_leader', label: 'Defense Leader' },
];

const DONATION_PRESETS = [500, 1000, 5000, 10000];

const COST_LABELS = {
  guild_medal: 'Guild Medals',
};

function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

function normalizeRole(role) {
  const clean = String(role || 'member').toLowerCase().trim();
  return clean === 'leader' ? 'guild_leader' : clean || 'member';
}

function isGuildLeader(role) {
  return normalizeRole(role) === 'guild_leader';
}

function getRoleMeta(role) {
  return ROLE_META[normalizeRole(role)] || ROLE_META.member;
}

function titleCaseKey(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
}

async function getAuthUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

function PageGlow() {
  return (
    <div className="pointer-events-none absolute inset-0 opacity-80">
      <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-emerald-700/20 blur-3xl" />
      <div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" />
    </div>
  );
}

function QuestPanel({ children, className = '' }) {
  return (
    <section
      className={`overflow-hidden rounded-3xl border border-primary/20 bg-card/90 shadow-2xl ${className}`}
    >
      {children}
    </section>
  );
}

function HeroStat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </div>
      <p className="mt-1 font-display text-xl font-black">{value}</p>
    </div>
  );
}

function GuildStat({ label, value }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3 text-center">
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-display text-lg font-black capitalize text-primary">
        {value}
      </p>
    </div>
  );
}

function RoleBadge({ role }) {
  const meta = getRoleMeta(role);
  const Icon = meta.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${meta.badge}`}
    >
      <Icon className="h-3 w-3" />
      {meta.short}
    </span>
  );
}

function TabButton({ active, icon: Icon, label, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border p-3 text-left transition-all ${
        active
          ? 'border-primary/60 bg-primary/15 shadow-[0_0_18px_rgba(250,189,50,0.16)]'
          : 'border-border bg-background/45 hover:border-primary/35 hover:bg-primary/10'
      }`}
    >
      <div className="flex items-center gap-2">
        <Icon className={active ? 'h-4 w-4 text-primary' : 'h-4 w-4 text-muted-foreground'} />
        <span className={active ? 'font-display text-sm font-black text-primary' : 'font-display text-sm font-black'}>
          {label}
        </span>
      </div>
    </button>
  );
}

function RoleCaps({ caps }) {
  const used = Number(caps?.assignable_leaders?.used || 0);
  const max = Number(caps?.assignable_leaders?.max || 0);

  const rows = [
    ['assignable', 'Assignable Roles', `${used}/${max}`],
    ['vice', 'Vice Leaders', Number(caps?.vice_leader?.used || 0)],
    ['attack', 'Attack Leaders', Number(caps?.attack_leader?.used || 0)],
    ['defense', 'Defense Leaders', Number(caps?.defense_leader?.used || 0)],
  ];

  return (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
      {rows.map(([key, label, value]) => (
        <div key={key} className="rounded-2xl border border-border bg-background/50 p-3">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 font-display text-xl font-black text-primary">
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

function MemberRow({ member, canManageRoles, onRoleChange, onTransferLeadership, processing }) {
  const meta = getRoleMeta(member.role);
  const Icon = meta.icon;
  const memberIsGuildLeader = isGuildLeader(member.role);

  return (
    <div className="rounded-2xl border border-border bg-background/50 p-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card">
            <Icon className={memberIsGuildLeader ? 'h-5 w-5 text-primary' : 'h-5 w-5 text-blue-300'} />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black">
              {member.display_name || member.email || 'Unknown Player'}
            </p>

            <div className="mt-1 flex flex-wrap items-center gap-2">
              <RoleBadge role={member.role} />
              <span className="text-[10px] text-muted-foreground">
                {member.title || getRoleMeta(member.role).label}
              </span>
            </div>
          </div>
        </div>

        {canManageRoles && !memberIsGuildLeader && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={normalizeRole(member.role)}
              onChange={(event) => onRoleChange(member, event.target.value)}
              disabled={processing}
              className="h-9 rounded-xl border border-border bg-card px-2 text-xs font-bold outline-none focus:border-primary"
            >
              {ROLE_OPTIONS.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>

            <Button
              size="sm"
              variant="outline"
              onClick={() => onTransferLeadership(member)}
              disabled={processing}
              className="gap-1"
            >
              <UserCheck className="h-4 w-4" />
              Transfer
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function GuildCard({ guild, selected, isMyGuild, onView, onJoin, processing, canJoin }) {
  const full = Number(guild.member_count || 0) >= Number(guild.max_members || 5);

  return (
    <motion.div
      layout
      className={`rounded-3xl border p-4 transition-all ${
        selected
          ? 'border-primary/60 bg-primary/10'
          : 'border-border bg-background/50 hover:border-primary/35'
      }`}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-card">
          <Crown className="h-7 w-7 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-display text-xl font-black text-primary">
              {guild.name}
            </p>

            {isMyGuild && (
              <span className="rounded-full border border-green-400/40 bg-green-400/10 px-2 py-0.5 text-[10px] font-black uppercase text-green-300">
                Your Guild
              </span>
            )}
          </div>

          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {guild.description || 'No guild description.'}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
            <span className="rounded-full bg-card px-2 py-0.5">
              Lv.{guild.level || 1}
            </span>
            <span className="rounded-full bg-card px-2 py-0.5">
              {guild.member_count || 0}/{guild.max_members || 5}
            </span>
            <span className="rounded-full bg-card px-2 py-0.5">
              {guild.is_open ? 'Open' : 'Closed'}
            </span>
            <span className="rounded-full bg-card px-2 py-0.5">
              Bank {formatNumber(guild.guild_gold_bank || 0)}
            </span>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-2">
          <Button size="sm" variant="outline" onClick={() => onView(guild)}>
            <Eye className="mr-1 h-4 w-4" />
            View
          </Button>

          {canJoin && (
            <Button
              size="sm"
              onClick={() => onJoin(guild)}
              disabled={processing || full || !guild.is_open}
            >
              {full ? 'Full' : 'Join'}
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function DonationPanel({ guild, profile, nextLevelConfig, nextLevelLoading, onDonate, onLevelUp, processing }) {
  const [amount, setAmount] = useState('1000');

  const bank = Number(guild?.guild_gold_bank || 0);
  const totalDonated = Number(guild?.total_gold_donated || 0);
  const userGold = Number(profile?.gold || 0);
  const nextCost = Number(nextLevelConfig?.upgrade_gold_cost || 0);
  const canLevel = Boolean(nextLevelConfig) && bank >= nextCost;
  const progress = nextLevelConfig
    ? Math.min(100, Math.round((bank / Math.max(nextCost, 1)) * 100))
    : 100;

  const submitDonation = (rawAmount = amount) => {
    const cleanAmount = Math.floor(Number(rawAmount || 0));

    if (!cleanAmount || cleanAmount < 100) {
      toast.error('Minimum donation is 100 gold');
      return;
    }

    if (cleanAmount > userGold) {
      toast.error('You do not have enough gold for that donation.');
      return;
    }

    onDonate(cleanAmount);
  };

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-primary">
            <ArrowUpCircle className="h-4 w-4" />
            Guild Donations
          </p>

          <p className="mt-2 text-sm text-muted-foreground">
            Members donate personal gold into the guild bank. Level ups consume
            the bank, while extra donations remain open as a permanent gold sink.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <GuildStat label="Bank" value={formatNumber(bank)} />
            <GuildStat label="Donated" value={formatNumber(totalDonated)} />
            <GuildStat label="Next Cost" value={nextLevelLoading ? '...' : nextLevelConfig ? formatNumber(nextCost) : 'MAX'} />
            <GuildStat label="Progress" value={nextLevelConfig ? `${progress}%` : nextLevelLoading ? '...' : '100%'} />
          </div>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/35">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary via-yellow-300 to-green-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {nextLevelConfig ? (
            <p className="mt-3 text-xs font-bold text-yellow-200">
              Next: Lv.{nextLevelConfig.level} · {nextLevelConfig.milestone_label}
            </p>
          ) : (
            <p className="mt-3 text-xs font-bold text-green-300">
              {nextLevelLoading
                ? 'Checking next guild level...'
                : 'Max configured level reached. Donations still work.'}
            </p>
          )}
        </div>

        <div className="w-full rounded-2xl border border-border bg-background/50 p-3 lg:w-[280px]">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Your Gold
          </p>
          <p className="mt-1 flex items-center gap-2 font-display text-2xl font-black text-yellow-200">
            <Coins className="h-5 w-5" />
            {formatNumber(userGold)}
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2">
            {DONATION_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className="rounded-xl border border-border bg-card px-2 py-2 text-xs font-black hover:border-primary/40"
              >
                {formatNumber(preset)}
              </button>
            ))}
          </div>

          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            inputMode="numeric"
            placeholder="Gold amount"
            className="mt-3 h-10 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none focus:border-primary"
          />

          <Button onClick={() => submitDonation()} disabled={processing} className="mt-3 w-full gap-2">
            <Coins className="h-4 w-4" />
            Donate Gold
          </Button>

          <Button
            onClick={onLevelUp}
            disabled={processing || nextLevelLoading || !canLevel}
            variant={canLevel ? 'default' : 'outline'}
            className="mt-2 w-full gap-2"
          >
            <ArrowUpCircle className="h-4 w-4" />
            {nextLevelLoading
              ? 'Checking...'
              : !nextLevelConfig
                ? 'Max Level'
                : canLevel
                  ? `Level Up to Lv.${nextLevelConfig.level}`
                  : 'Bank Too Low'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function GuildDetailPanel({
  guild,
  members,
  myGuildId,
  myMembership,
  roleCaps,
  onDonate,
  onLevelUp,
  onLeave,
  onRoleChange,
  onTransferLeadership,
  onDisbandGuild,
  processing,
  nextLevelConfig,
  nextLevelLoading,
  profile,
}) {
  if (!guild) {
    return (
      <QuestPanel>
        <div className="p-8 text-center">
          <Shield className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
          <p className="font-display text-lg text-muted-foreground">
            Select a guild to view details.
          </p>
        </div>
      </QuestPanel>
    );
  }

  const isMyGuild = guild.id === myGuildId;
  const canManageRoles = isMyGuild && isGuildLeader(myMembership?.role);

  return (
    <QuestPanel>
      <div className="border-b border-border bg-primary/5 p-5 md:p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/30 bg-primary/20">
            <Crown className="h-8 w-8 text-primary" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
              <Crown className="h-4 w-4" />
              {isMyGuild ? 'Active Guild' : 'Guild Preview'}
            </div>

            <h2 className="mt-2 truncate font-display text-3xl font-black text-primary md:text-4xl">
              {guild.name}
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              {guild.description || 'No guild description yet.'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-5 p-5 md:p-6">
        <div className="grid grid-cols-3 gap-3">
          <GuildStat label="Level" value={`Lv.${guild.level || 1}`} />
          <GuildStat label="Members" value={`${guild.member_count || members.length || 0}/${guild.max_members || 5}`} />
          <GuildStat label={isMyGuild ? 'Your Role' : 'Status'} value={isMyGuild ? getRoleMeta(myMembership?.role).short : 'View Only'} />
        </div>

        <RoleCaps caps={roleCaps} />

        {isMyGuild && (
          <DonationPanel
            guild={guild}
            profile={profile}
            nextLevelConfig={nextLevelConfig}
            nextLevelLoading={nextLevelLoading}
            onDonate={onDonate}
            onLevelUp={onLevelUp}
            processing={processing}
          />
        )}

        <div>
          <div className="mb-3">
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-primary">
              <Users className="h-4 w-4" />
              Members
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Anyone can view a guild roster. The Guild Leader can assign battle
              roles, transfer ownership, or disband the guild.
            </p>
          </div>

          <div className="space-y-2">
            {members.map((member) => (
              <MemberRow
                key={member.id}
                member={member}
                canManageRoles={canManageRoles}
                onRoleChange={onRoleChange}
                onTransferLeadership={onTransferLeadership}
                processing={processing}
              />
            ))}

            {members.length === 0 && (
              <div className="rounded-2xl border border-border bg-background/50 p-8 text-center text-sm text-muted-foreground">
                No members found.
              </div>
            )}
          </div>
        </div>

        {isMyGuild && (
          <div className="space-y-3">
            {!canManageRoles ? (
              <Button variant="destructive" onClick={onLeave} disabled={processing} className="w-full gap-2">
                <LogOut className="h-4 w-4" />
                {processing ? 'Leaving…' : 'Leave Guild'}
              </Button>
            ) : (
              <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-primary">
                  <Crown className="h-4 w-4" />
                  Guild Leader Lock
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  The Guild Leader cannot leave like a normal member. Transfer
                  Guild Leader control to another member, or disband the guild.
                </p>
              </div>
            )}

            {canManageRoles && (
              <div className="rounded-2xl border border-red-500/35 bg-red-500/10 p-4">
                <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-red-300">
                  <AlertTriangle className="h-4 w-4" />
                  Danger Zone
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Disbanding removes every member and hides the guild from the
                  game. This cannot be undone.
                </p>
                <Button
                  variant="destructive"
                  onClick={onDisbandGuild}
                  disabled={processing}
                  className="mt-3 w-full gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Disband Guild
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </QuestPanel>
  );
}

function GuildStorePanel({ myGuild, storeItems, guildMedals, onPurchase, processing }) {
  if (!myGuild) {
    return (
      <QuestPanel>
        <div className="p-8 text-center">
          <Store className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
          <p className="font-display text-xl font-black text-muted-foreground">
            Join a guild to use the Guild Store.
          </p>
        </div>
      </QuestPanel>
    );
  }

  return (
    <QuestPanel>
      <div className="border-b border-border bg-primary/5 p-5 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-primary">
              <ShoppingBag className="h-4 w-4" />
              Guild Store
            </p>
            <h2 className="mt-2 font-display text-3xl font-black text-primary">
              Event Rewards
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Spend Guild Medals from future guild events. Items unlock based on
              your guild level.
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-right">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-300">
              Guild Medals
            </p>
            <p className="font-display text-2xl font-black text-yellow-200">
              {formatNumber(guildMedals)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 md:grid-cols-2 md:p-6">
        {storeItems.map((item) => {
          const locked = Number(myGuild.level || 1) < Number(item.required_guild_level || 1);
          const canAfford = Number(guildMedals || 0) >= Number(item.cost_quantity || 0);
          const costLabel = COST_LABELS[item.cost_item_key] || titleCaseKey(item.cost_item_key);

          return (
            <div
              key={item.id}
              className={`rounded-3xl border p-4 ${
                locked
                  ? 'border-border bg-background/35 opacity-65'
                  : 'border-primary/20 bg-background/50'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-yellow-400/30 bg-yellow-400/10">
                  <Medal className="h-6 w-6 text-yellow-300" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-black text-primary">
                    {item.name}
                  </p>

                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.description || 'Guild store reward.'}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                    <span className="rounded-full bg-card px-2 py-0.5">
                      Requires Guild Lv.{item.required_guild_level || 1}
                    </span>
                    <span className="rounded-full bg-card px-2 py-0.5">
                      {formatNumber(item.cost_quantity)} {costLabel}
                    </span>
                  </div>
                </div>
              </div>

              <Button
                onClick={() => onPurchase(item)}
                disabled={processing || locked || !canAfford}
                className="mt-4 w-full gap-2"
              >
                <Store className="h-4 w-4" />
                {locked
                  ? `Unlocks Lv.${item.required_guild_level}`
                  : !canAfford
                    ? 'Need More Medals'
                    : 'Purchase'}
              </Button>
            </div>
          );
        })}

        {storeItems.length === 0 && (
          <div className="rounded-2xl border border-border bg-background/50 p-8 text-center text-sm text-muted-foreground md:col-span-2">
            No guild store items configured.
          </div>
        )}
      </div>
    </QuestPanel>
  );
}


function DisbandGuildModal({
  guild,
  confirmText,
  setConfirmText,
  onCancel,
  onConfirm,
  processing,
}) {
  if (!guild) return null;

  const expectedName = String(guild.name || '').trim();
  const typedName = String(confirmText || '').trim();
  const canConfirm = typedName.toLowerCase() === expectedName.toLowerCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-red-500/40 bg-card p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-red-400/40 bg-red-500/15">
            <AlertTriangle className="h-6 w-6 text-red-300" />
          </div>

          <div>
            <p className="font-display text-2xl font-black text-red-300">
              Disband Guild
            </p>

            <p className="mt-2 text-sm text-muted-foreground">
              This will remove every member from{' '}
              <span className="font-bold text-foreground">{guild.name}</span>{' '}
              and hide the guild from the game. This cannot be undone.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
          <p className="text-xs font-bold text-red-200">
            Type the guild name to confirm:
          </p>

          <p className="mt-1 font-display text-lg font-black text-primary">
            {guild.name}
          </p>

          <input
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoFocus
            placeholder="Enter guild name"
            className="mt-3 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus:border-red-400"
          />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={processing}
          >
            Cancel
          </Button>

          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            disabled={processing || !canConfirm}
            className="gap-2"
          >
            <Trash2 className="h-4 w-4" />
            {processing ? 'Disbanding...' : 'Confirm Disband'}
          </Button>
        </div>
      </div>
    </div>
  );
}


export default function Guilds() {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState('my');
  const [showCreate, setShowCreate] = useState(false);
  const [guildName, setGuildName] = useState('');
  const [guildDescription, setGuildDescription] = useState('');
  const [search, setSearch] = useState('');
  const [selectedGuildId, setSelectedGuildId] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [disbandModalOpen, setDisbandModalOpen] = useState(false);
  const [disbandConfirmText, setDisbandConfirmText] = useState('');

  const refreshGuildData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['guilds'] }),
      queryClient.invalidateQueries({ queryKey: ['myGuild'] }),
      queryClient.invalidateQueries({ queryKey: ['myGuildMembership'] }),
      queryClient.invalidateQueries({ queryKey: ['guildMembersPublic'] }),
      queryClient.invalidateQueries({ queryKey: ['guildRoleCaps'] }),
      queryClient.invalidateQueries({ queryKey: ['guildNextLevelConfig'] }),
      queryClient.invalidateQueries({ queryKey: ['guildProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['playerProfile'] }),
      queryClient.invalidateQueries({ queryKey: ['guildMedals'] }),
      queryClient.invalidateQueries({ queryKey: ['inventory'] }),
      queryClient.invalidateQueries({ queryKey: ['playerItems'] }),
    ]);
  };

  useEffect(() => {
    const channel = supabase
      .channel('guilds-realtime-v4')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guilds' }, refreshGuildData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_members' }, refreshGuildData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'guild_gold_donations' }, refreshGuildData)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const { data: authUser = null } = useQuery({
    queryKey: ['authUser'],
    queryFn: getAuthUser,
  });

  const userId = authUser?.id || null;

  const { data: profile = null } = useQuery({
    queryKey: ['guildProfile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, gold, gems, display_name, email')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { data: guilds = [], isLoading: guildsLoading } = useQuery({
    queryKey: ['guilds'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .eq('is_disbanded', false)
        .order('level', { ascending: false })
        .order('member_count', { ascending: false })
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: myMembership = null } = useQuery({
    queryKey: ['myGuildMembership', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guild_members')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const myGuildId = myMembership?.guild_id || null;

  const { data: myGuild = null } = useQuery({
    queryKey: ['myGuild', myGuildId],
    enabled: !!myGuildId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guilds')
        .select('*')
        .eq('id', myGuildId)
        .eq('is_disbanded', false)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (myGuildId && activeTab === 'my') {
      setSelectedGuildId(myGuildId);
    } else if (!selectedGuildId && guilds[0]?.id) {
      setSelectedGuildId(guilds[0].id);
    }
  }, [activeTab, guilds, myGuildId, selectedGuildId]);

  const selectedGuild = useMemo(() => {
    return guilds.find((guild) => guild.id === selectedGuildId) || myGuild || null;
  }, [guilds, selectedGuildId, myGuild]);

  const { data: selectedMembers = [] } = useQuery({
    queryKey: ['guildMembersPublic', selectedGuild?.id],
    enabled: !!selectedGuild?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_public_guild_members', {
        p_guild_id: selectedGuild.id,
      });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: roleCaps = null } = useQuery({
    queryKey: ['guildRoleCaps', selectedGuild?.id],
    enabled: !!selectedGuild?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_guild_role_caps', {
        p_guild_id: selectedGuild.id,
      });

      if (error) throw error;
      return data;
    },
  });

  const {
    data: nextLevelConfig = null,
    isLoading: nextLevelLoading,
  } = useQuery({
    queryKey: ['guildNextLevelConfig', myGuild?.id, myGuild?.level],
    enabled: !!myGuild?.id,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_guild_next_level_config', {
        p_guild_id: myGuild.id,
      });

      if (error) throw error;
      return data || null;
    },
  });

  const { data: storeItems = [] } = useQuery({
    queryKey: ['guildStoreItems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guild_store_items')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const { data: guildMedals = 0 } = useQuery({
    queryKey: ['guildMedals', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('player_items')
        .select('quantity')
        .eq('user_id', userId)
        .eq('item_key', 'guild_medal')
        .maybeSingle();

      if (error) throw error;
      return Number(data?.quantity || 0);
    },
  });

  const filteredGuilds = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return guilds;

    return guilds.filter((guild) => {
      return (
        String(guild.name || '').toLowerCase().includes(value) ||
        String(guild.description || '').toLowerCase().includes(value)
      );
    });
  }, [guilds, search]);

  const createGuild = async () => {
    const cleanName = guildName.trim();

    if (!cleanName) {
      toast.error('Enter a guild name');
      return;
    }

    if (cleanName.length < 3) {
      toast.error('Guild name must be at least 3 characters');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('create_guild', {
        p_name: cleanName,
        p_description: guildDescription.trim(),
      });

      if (error) throw error;

      toast.success(`👑 Guild created: ${cleanName}`);
      setGuildName('');
      setGuildDescription('');
      setShowCreate(false);
      setActiveTab('my');

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not create guild');
    } finally {
      setProcessing(false);
    }
  };

  const joinGuild = async (guild) => {
    if (!guild?.id) return;

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('join_guild', {
        p_guild_id: guild.id,
      });

      if (error) throw error;

      toast.success(`🛡️ Joined ${guild.name}`);
      setSelectedGuildId(guild.id);
      setActiveTab('my');

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not join guild');
    } finally {
      setProcessing(false);
    }
  };

  const leaveGuild = async () => {
    if (!myGuild?.id) return;

    if (isGuildLeader(myMembership?.role)) {
      toast.error('Guild Leaders must transfer leadership or disband the guild.');
      return;
    }

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('leave_guild', {
        p_guild_id: myGuild.id,
      });

      if (error) throw error;

      toast.success(`Left ${myGuild.name}`);
      setSelectedGuildId(null);
      setActiveTab('discover');

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not leave guild');
    } finally {
      setProcessing(false);
    }
  };

  const donateGold = async (amount) => {
    if (!myGuild?.id) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.rpc('donate_gold_to_guild', {
        p_guild_id: myGuild.id,
        p_amount: amount,
      });

      if (error) throw error;

      toast.success(`💰 Donated ${formatNumber(data?.donated || amount)} gold to ${myGuild.name}`);

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not donate gold');
    } finally {
      setProcessing(false);
    }
  };

  const levelUpGuild = async () => {
    if (!myGuild?.id) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.rpc('level_up_guild', {
        p_guild_id: myGuild.id,
      });

      if (error) throw error;

      toast.success(
        `⬆️ ${myGuild.name} reached Lv.${data?.new_level || Number(myGuild.level || 1) + 1}!`
      );

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not level up guild');
    } finally {
      setProcessing(false);
    }
  };

  const changeMemberRole = async (member, role) => {
    if (!myGuild?.id || !member?.id) return;

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('set_guild_member_role', {
        p_guild_id: myGuild.id,
        p_member_id: member.id,
        p_role: role,
      });

      if (error) throw error;

      toast.success(
        `${member.display_name || member.email || 'Member'} is now ${getRoleMeta(role).label}`
      );

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not update role');
    } finally {
      setProcessing(false);
    }
  };

  const transferLeadership = async (member) => {
    if (!myGuild?.id || !member?.id) return;

    const memberName = member.display_name || member.email || 'this member';
    const confirmed = window.confirm(
      `Transfer Guild Leader control to ${memberName}? You will become a regular member.`
    );

    if (!confirmed) return;

    setProcessing(true);

    try {
      const { error } = await supabase.rpc('transfer_guild_leadership', {
        p_guild_id: myGuild.id,
        p_new_leader_member_id: member.id,
      });

      if (error) throw error;

      toast.success(`👑 ${memberName} is now Guild Leader.`);

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not transfer guild leadership');
    } finally {
      setProcessing(false);
    }
  };

  const openDisbandModal = () => {
    if (!myGuild?.id) return;

    if (!isGuildLeader(myMembership?.role)) {
      toast.error('Only the Guild Leader can disband the guild.');
      return;
    }

    setDisbandConfirmText('');
    setDisbandModalOpen(true);
  };

  const closeDisbandModal = () => {
    if (processing) return;

    setDisbandModalOpen(false);
    setDisbandConfirmText('');
  };

  const confirmDisbandGuild = async () => {
    if (!myGuild?.id) return;

    const expectedName = String(myGuild.name || '').trim();
    const typedName = String(disbandConfirmText || '').trim();

    if (typedName.toLowerCase() !== expectedName.toLowerCase()) {
      toast.error('Guild name does not match.');
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.rpc('disband_guild', {
        p_guild_id: myGuild.id,
      });

      if (error) throw error;

      toast.success(`🧨 ${data?.guild_name || myGuild.name} was disbanded.`);
      setDisbandModalOpen(false);
      setDisbandConfirmText('');
      setSelectedGuildId(null);
      setActiveTab('discover');

      await refreshGuildData();
    } catch (error) {
      console.error('Disband guild failed:', error);
      toast.error(error.message || 'Could not disband guild');
    } finally {
      setProcessing(false);
    }
  };

  const purchaseGuildStoreItem = async (item) => {
    if (!item?.id) return;

    setProcessing(true);

    try {
      const { data, error } = await supabase.rpc('purchase_guild_store_item', {
        p_item_id: item.id,
      });

      if (error) throw error;

      toast.success(`🛒 Purchased ${data?.name || item.name}`);

      await refreshGuildData();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Could not purchase guild item');
    } finally {
      setProcessing(false);
    }
  };

  const viewGuild = (guild) => {
    setSelectedGuildId(guild.id);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <PageGlow />

      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img
            src={GUILD_BG}
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-center opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />

          <div className="relative p-6 md:p-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary">
                  <Shield className="h-4 w-4" />
                  Guild Hall
                </div>

                <h1 className="text-glow-gold mt-3 font-display text-4xl font-black text-primary md:text-6xl">
                  GUILDS
                </h1>

                <p className="mt-3 max-w-3xl text-muted-foreground">
                  Donate gold, level guilds, unlock member slots, assign battle
                  roles, transfer Guild Leader control, or disband inactive guilds.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 lg:min-w-[360px]">
                <HeroStat icon={Crown} label="Your Guild" value={myGuild ? 'Joined' : 'None'} />
                <HeroStat icon={Users} label="Members" value={myGuild?.member_count || 0} />
                <HeroStat icon={Trophy} label="Guilds" value={guilds.length} />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-primary/20 bg-card/90 p-4 shadow-2xl">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <TabButton
              active={activeTab === 'my'}
              icon={Crown}
              label="My Guild"
              onClick={() => {
                setActiveTab('my');
                if (myGuildId) setSelectedGuildId(myGuildId);
              }}
            />

            <TabButton
              active={activeTab === 'discover'}
              icon={Search}
              label="Discover Guilds"
              onClick={() => setActiveTab('discover')}
            />

            <TabButton
              active={activeTab === 'store'}
              icon={Store}
              label="Guild Store"
              onClick={() => setActiveTab('store')}
            />
          </div>
        </section>

        {activeTab === 'my' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <aside className="space-y-6 xl:col-span-4">
              <QuestPanel>
                <div className="border-b border-border bg-primary/5 p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                    <Sparkles className="h-4 w-4" />
                    Guild Entry
                  </div>

                  <h2 className="mt-2 font-display text-2xl font-black text-primary">
                    {myGuild ? 'Guild Commands' : 'Join the War Beyond the Veil'}
                  </h2>

                  <p className="mt-2 text-sm text-muted-foreground">
                    {myGuild
                      ? 'Donate gold, level the guild, and manage its role structure.'
                      : 'Create a guild or join another player from Discover.'}
                  </p>
                </div>

                <div className="space-y-4 p-5">
                  {!myGuild && (
                    <>
                      <Button onClick={() => setShowCreate((prev) => !prev)} className="w-full gap-2">
                        <Plus className="h-4 w-4" />
                        {showCreate ? 'Close Create Form' : 'Create Guild'}
                      </Button>

                      <AnimatePresence>
                        {showCreate && (
                          <motion.div
                            initial={{ opacity: 0, y: -8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="space-y-3 rounded-2xl border border-border bg-background/50 p-4"
                          >
                            <div>
                              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Guild Name
                              </p>
                              <input
                                value={guildName}
                                onChange={(e) => setGuildName(e.target.value)}
                                maxLength={24}
                                placeholder="Example: Ironveil Order"
                                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                              />
                            </div>

                            <div>
                              <p className="mb-1 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Description
                              </p>
                              <textarea
                                value={guildDescription}
                                onChange={(e) => setGuildDescription(e.target.value)}
                                maxLength={140}
                                placeholder="Describe your guild..."
                                className="min-h-20 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                              />
                            </div>

                            <Button onClick={createGuild} disabled={processing} className="w-full">
                              {processing ? 'Creating…' : 'Create Guild'}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <Button variant="outline" onClick={() => setActiveTab('discover')} className="w-full gap-2">
                        <Search className="h-4 w-4" />
                        Browse Guilds
                      </Button>
                    </>
                  )}

                  {myGuild && (
                    <>
                      <div className="rounded-2xl border border-border bg-background/50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                          Your Gold
                        </p>
                        <p className="mt-1 flex items-center gap-2 font-display text-3xl font-black text-yellow-200">
                          <Coins className="h-6 w-6" />
                          {formatNumber(profile?.gold || 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                          Guild Bank
                        </p>
                        <p className="mt-1 flex items-center gap-2 font-display text-3xl font-black text-yellow-200">
                          <Coins className="h-6 w-6" />
                          {formatNumber(myGuild.guild_gold_bank || 0)}
                        </p>
                      </div>

                      <div className="rounded-2xl border border-border bg-background/50 p-4">
                        <p className="text-xs font-black uppercase tracking-[0.25em] text-primary">
                          Guild Medals
                        </p>
                        <p className="mt-1 flex items-center gap-2 font-display text-3xl font-black text-yellow-200">
                          <Medal className="h-6 w-6" />
                          {formatNumber(guildMedals)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </QuestPanel>
            </aside>

            <main className="xl:col-span-8">
              <GuildDetailPanel
                guild={myGuild}
                members={selectedGuild?.id === myGuildId ? selectedMembers : []}
                myGuildId={myGuildId}
                myMembership={myMembership}
                roleCaps={roleCaps}
                onDonate={donateGold}
                onLevelUp={levelUpGuild}
                onLeave={leaveGuild}
                onRoleChange={changeMemberRole}
                onTransferLeadership={transferLeadership}
                onDisbandGuild={openDisbandModal}
                processing={processing}
                nextLevelConfig={nextLevelConfig}
                nextLevelLoading={nextLevelLoading}
                profile={profile}
              />
            </main>
          </div>
        )}

        {activeTab === 'discover' && (
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <aside className="space-y-6 xl:col-span-5">
              <QuestPanel>
                <div className="border-b border-border bg-primary/5 p-5 md:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary">
                        <Users className="h-4 w-4" />
                        Guild Registry
                      </div>

                      <h2 className="mt-2 font-display text-2xl font-black text-primary md:text-3xl">
                        Search Guilds
                      </h2>
                    </div>

                    <p className="text-xs text-muted-foreground">
                      {filteredGuilds.length} shown
                    </p>
                  </div>

                  <div className="relative mt-4">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search guilds..."
                      className="w-full rounded-xl border border-border bg-background py-3 pl-9 pr-3 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>

                <div className="max-h-[720px] space-y-3 overflow-y-auto p-5 md:p-6">
                  {guildsLoading ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Loading guilds...
                    </div>
                  ) : filteredGuilds.length === 0 ? (
                    <div className="rounded-2xl border border-border bg-background/50 p-8 text-center">
                      <Users className="mx-auto mb-2 h-10 w-10 text-muted-foreground opacity-50" />
                      <p className="font-display text-lg text-muted-foreground">
                        No guilds found
                      </p>
                    </div>
                  ) : (
                    filteredGuilds.map((guild) => (
                      <GuildCard
                        key={guild.id}
                        guild={guild}
                        selected={guild.id === selectedGuild?.id}
                        isMyGuild={guild.id === myGuildId}
                        onView={viewGuild}
                        onJoin={joinGuild}
                        processing={processing}
                        canJoin={!myGuildId}
                      />
                    ))
                  )}
                </div>
              </QuestPanel>
            </aside>

            <main className="xl:col-span-7">
              <GuildDetailPanel
                guild={selectedGuild}
                members={selectedMembers}
                myGuildId={myGuildId}
                myMembership={myMembership}
                roleCaps={roleCaps}
                onDonate={donateGold}
                onLevelUp={levelUpGuild}
                onLeave={leaveGuild}
                onRoleChange={changeMemberRole}
                onTransferLeadership={transferLeadership}
                onDisbandGuild={openDisbandModal}
                processing={processing}
                nextLevelConfig={selectedGuild?.id === myGuildId ? nextLevelConfig : null}
                nextLevelLoading={selectedGuild?.id === myGuildId ? nextLevelLoading : false}
                profile={profile}
              />
            </main>
          </div>
        )}

        {activeTab === 'store' && (
          <GuildStorePanel
            myGuild={myGuild}
            storeItems={storeItems}
            guildMedals={guildMedals}
            onPurchase={purchaseGuildStoreItem}
            processing={processing}
          />
        )}
      </div>

      {disbandModalOpen && (
        <DisbandGuildModal
          guild={myGuild}
          confirmText={disbandConfirmText}
          setConfirmText={setDisbandConfirmText}
          onCancel={closeDisbandModal}
          onConfirm={confirmDisbandGuild}
          processing={processing}
        />
      )}
    </div>
  );
}
