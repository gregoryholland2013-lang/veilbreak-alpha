import React, { useState } from 'react';
import PageHeader from '@/components/game/PageHeader';
import FriendsList from '@/components/social/FriendsList';
import ReferralPanel from '@/components/social/ReferralPanel';
import BazaarTab from '@/components/social/BazaarTab';
import PrivateTradesTab from '@/components/social/PrivateTradesTab';
import { ArrowLeftRight, Share2, Store, Users } from 'lucide-react';

const tabs = [
  {
    key: 'friends',
    label: 'Friends',
    subtitle: 'Add allies and manage Veil Bonds',
    icon: Users,
  },
  {
    key: 'referrals',
    label: 'Referrals',
    subtitle: 'Invite players and earn milestone rewards',
    icon: Share2,
  },
  {
    key: 'bazaar',
    label: 'Bazaar',
    subtitle: 'Public player marketplace',
    icon: Store,
  },
  {
    key: 'private',
    label: 'Private Trades',
    subtitle: 'Direct player-to-player trades',
    icon: ArrowLeftRight,
  },
];

export default function Social() {
  const [activeTab, setActiveTab] = useState('friends');

  const active = tabs.find((tab) => tab.key === activeTab) || tabs[0];

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto w-full max-w-7xl space-y-5 p-4 md:p-6">
        <PageHeader title="Social & Trade" subtitle="Friends, referrals, Bazaar, and private trades" />

        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card/90 p-4 shadow-2xl md:p-5">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-primary">
              Social Hub
            </p>

            <h1 className="mt-1 font-display text-2xl font-black text-primary text-glow-gold md:text-4xl">
              {active.label}
            </h1>

            <p className="mt-1 text-sm text-muted-foreground">
              {active.subtitle}
            </p>
          </div>

          <div className="relative mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
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
                      : 'border-border bg-background/45 hover:border-primary/35 hover:bg-primary/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border ${
                        selected
                          ? 'border-primary/40 bg-primary/15'
                          : 'border-white/10 bg-black/20'
                      }`}
                    >
                      <Icon
                        className={`h-4.5 w-4.5 ${
                          selected ? 'text-primary' : 'text-muted-foreground'
                        }`}
                      />
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`truncate font-display text-sm font-black ${
                          selected ? 'text-primary' : 'text-foreground'
                        }`}
                      >
                        {tab.label}
                      </p>

                      <p className="hidden truncate text-[10px] text-muted-foreground sm:block">
                        {tab.subtitle}
                      </p>
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
          {activeTab === 'bazaar' && <BazaarTab />}
          {activeTab === 'private' && <PrivateTradesTab />}
        </section>
      </div>
    </div>
  );
}
