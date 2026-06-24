import React, { useState } from 'react';
import PageHeader from '@/components/game/PageHeader';
import FriendsList from '@/components/social/FriendsList';
import ReferralPanel from '@/components/social/ReferralPanel';
import BazaarTab from '@/components/social/BazaarTab';
import PrivateTradesTab from '@/components/social/PrivateTradesTab';
import {
  ArrowLeftRight,
  ExternalLink,
  MessageCircle,
  Share2,
  Store,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const DISCORD_INVITE_URL =
  import.meta.env.VITE_DISCORD_INVITE_URL || 'https://discord.gg/6GepRHPCbe';

const tabs = [
  { key: 'friends', label: 'Friends', subtitle: 'Add allies and manage Veil Bonds', icon: Users },
  { key: 'referrals', label: 'Referrals', subtitle: 'Invite players and earn milestone rewards', icon: Share2 },
  { key: 'discord', label: 'Discord', subtitle: 'Join the Veilbreak community', icon: MessageCircle },
  { key: 'bazaar', label: 'Bazaar', subtitle: 'Public player marketplace', icon: Store },
  { key: 'private', label: 'Private Trades', subtitle: 'Direct player-to-player trades', icon: ArrowLeftRight },
];

function DiscordPanel() {
  const openDiscord = () => {
    window.open(DISCORD_INVITE_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-5 p-4 pb-28">
      <section className="relative overflow-hidden rounded-3xl border border-indigo-400/35 bg-gradient-to-br from-indigo-500/15 via-card/80 to-primary/10 p-5 shadow-2xl">
        <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-indigo-300/40 bg-indigo-500/15">
            <MessageCircle className="h-7 w-7 text-indigo-300" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.28em] text-indigo-200/80">Community</p>
            <h2 className="font-display text-2xl font-black text-primary">Join the Veilbreak Discord</h2>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Talk with other players, follow updates, report bugs, share pulls, coordinate trades, and help shape the alpha.
            </p>
          </div>
        </div>
        <Button type="button" onClick={openDiscord} className="relative mt-5 w-full gap-2 bg-indigo-500 text-white hover:bg-indigo-400">
          <MessageCircle className="h-4 w-4" />
          Join Discord
          <ExternalLink className="h-4 w-4" />
        </Button>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-3xl border border-border bg-card/70 p-4">
          <p className="font-display text-sm font-black text-primary">Game Updates</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">See patch notes, reward updates, and upcoming event previews.</p>
        </div>
        <div className="rounded-3xl border border-border bg-card/70 p-4">
          <p className="font-display text-sm font-black text-primary">Trading & Community</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Find players, discuss trades, and build your Veilbreak network.</p>
        </div>
        <div className="rounded-3xl border border-border bg-card/70 p-4">
          <p className="font-display text-sm font-black text-primary">Bug Reports</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Help improve the alpha by posting issues, screenshots, and feedback.</p>
        </div>
      </section>
    </div>
  );
}

export default function Social() {
  const [activeTab, setActiveTab] = useState('friends');
  const active = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
        <PageHeader title="Social & Trade" subtitle="Friends, referrals, Discord, Bazaar, and private trades" />
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/90 p-4 shadow-2xl md:p-5">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">Social Hub</p>
            <h1 className="mt-1 font-display text-2xl font-black text-primary text-glow-gold md:text-4xl">{active.label}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{active.subtitle}</p>
          </div>
          <div className="relative mt-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const selected = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    selected
                      ? 'border-primary/60 bg-primary/15 shadow-[0_0_20px_rgba(250,189,50,0.18)]'
                      : tab.key === 'discord'
                        ? 'border-indigo-400/25 bg-indigo-500/10 hover:border-indigo-300/50 hover:bg-indigo-500/15'
                        : 'border-border bg-background/45 hover:border-primary/35 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${selected ? 'border-primary/40 bg-primary/15' : 'border-white/10 bg-black/20'}`}>
                      <Icon className={`h-4.5 w-4.5 ${selected ? 'text-primary' : tab.key === 'discord' ? 'text-indigo-300' : 'text-muted-foreground'}`} />
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate font-display text-sm font-black ${selected ? 'text-primary' : 'text-foreground'}`}>{tab.label}</p>
                      <p className="hidden truncate text-[10px] text-muted-foreground sm:block">{tab.subtitle}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-border bg-card/70 shadow-xl">
          {activeTab === 'friends' && <FriendsList />}
          {activeTab === 'referrals' && <ReferralPanel />}
          {activeTab === 'discord' && <DiscordPanel />}
          {activeTab === 'bazaar' && <BazaarTab />}
          {activeTab === 'private' && <PrivateTradesTab />}
        </section>
      </div>
    </div>
  );
}
