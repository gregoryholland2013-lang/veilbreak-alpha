import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { PayPalScriptProvider } from '@paypal/react-paypal-js';
import {
  ShoppingBag,
  Sparkles,
  Gem,
  Zap,
  Crown,
  ChevronRight,
  Coins,
  Flame,
  RefreshCw,
} from 'lucide-react';

import PageHeader from '@/components/game/PageHeader';
import PayPalPurchaseButton from '@/components/game/PayPalPurchaseButton';

const summonOptions = [
  {
    title: 'Summon Portal',
    desc: 'Use gold, gems, or summon tickets to pull new cards.',
    path: '/summon',
    icon: Sparkles,
    accent: 'text-purple-300',
    border: 'border-purple-400/40 bg-purple-500/10',
    details: ['Gold summons', 'Gem summons', 'Ticket summons'],
  },
];

const featuredPacks = [
  {
    sku: 'starter_veil_pack',
    title: 'Starter Veil Pack',
    tag: 'Best Start',
    price: '$4.99',
    desc: 'Summon Tickets, Gems, Gold, and stamina items for new players.',
    icon: Crown,
    iconClass: 'text-primary',
    contents: ['5 Summon Tickets', '150 Gems', '5,000 Gold', '3 Stamina Potions'],
  },
  {
    sku: 'singularity_bundle',
    title: 'Singularity Bundle',
    tag: 'Summon',
    price: '$9.99',
    desc: 'Built for players chasing stronger cards and duplicate materials.',
    icon: Sparkles,
    iconClass: 'text-purple-300',
    contents: ['15 Summon Tickets', '300 Gems', '10,000 Gold', '10 Stamina Potions'],
  },
];

const shopItems = [
  {
    sku: 'veil_recalibration_token',
    title: 'Veil Recalibration Token',
    price: '$1.99',
    desc: 'Fully reset allocated Attributes and rebuild your Stamina, ATK, and DEF spread.',
    icon: RefreshCw,
    iconClass: 'text-primary',
  },
  {
    sku: 'gem_cache',
    title: 'Gem Cache',
    price: '$4.99',
    desc: 'Premium currency for summons and future shop features.',
    icon: Gem,
    iconClass: 'text-blue-300',
  },
  {
    sku: 'gold_chest',
    title: 'Gold Chest',
    price: '$2.99',
    desc: 'Gold for upgrades, enhancement, and card progression.',
    icon: Coins,
    iconClass: 'text-yellow-300',
  },
  {
    sku: 'stamina_potions',
    title: 'Stamina Potions',
    price: '$1.99',
    desc: 'Restore stamina and keep pushing through expeditions.',
    icon: Zap,
    iconClass: 'text-emerald-300',
  },
  {
    sku: 'raid_bundle',
    title: 'Raid Bundle',
    price: '$3.99',
    desc: 'Raid tickets for weekend boss battles',
    icon: Flame,
    iconClass: 'text-orange-300',
  },
];

export default function Shop() {
  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;

  const handlePurchaseSuccess = () => {
    window.dispatchEvent(new Event('veilbreak-purchase-complete'));
  };

  const shopContent = (
    <div className="max-w-lg mx-auto">
      <PageHeader title="Veil Shop" subtitle="Summons, packs, and items" />

      <div className="px-4 pb-28 pt-4 space-y-5">
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl border border-primary/35 bg-gradient-to-br from-primary/15 via-card/80 to-purple-500/10 p-5 shadow-2xl"
        >
          <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-primary/40 bg-primary/15 shadow-[0_0_24px_rgba(250,189,50,0.18)]">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>

            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-primary/80">
                Market
              </p>

              <h1 className="font-display text-2xl font-black text-primary">
                Veil Shop
              </h1>

              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Summon cards, buy packs, refill stamina, and prepare for events.
              </p>
            </div>
          </div>
        </motion.section>

        {!paypalClientId && (
          <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
            Missing VITE_PAYPAL_CLIENT_ID in .env.local. PayPal purchases cannot
            load until this is added.
          </div>
        )}

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-black text-primary">
              Summons
            </h2>

            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Portal Access
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {summonOptions.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + index * 0.05 }}
              >
                <Link
                  to={item.path}
                  className={`group flex items-center gap-4 rounded-3xl border p-4 transition-all hover:scale-[1.01] hover:brightness-110 ${item.border}`}
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                    <item.icon className={`h-7 w-7 ${item.accent}`} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-black text-foreground">
                      {item.title}
                    </p>

                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>

                    {item.details && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.details.map((detail) => (
                          <span
                            key={detail}
                            className="rounded-full border border-purple-400/25 bg-purple-500/10 px-2 py-1 text-[10px] font-bold text-purple-200"
                          >
                            {detail}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-all group-hover:translate-x-1 group-hover:text-primary" />
                </Link>
              </motion.div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-black text-primary">
              Featured Packs
            </h2>

            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Secure Checkout
            </p>
          </div>

          {featuredPacks.map((pack, index) => (
            <motion.div
              key={pack.sku}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.06 }}
              className="rounded-3xl border border-border/70 bg-card/70 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                  <pack.icon className={`h-7 w-7 ${pack.iconClass}`} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-display text-base font-black text-foreground">
                        {pack.title}
                      </p>

                      <p className="mt-1 text-xs text-muted-foreground">
                        {pack.desc}
                      </p>
                    </div>

                    <div className="rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-black text-primary">
                      {pack.tag}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {pack.contents.map((content) => (
                      <div
                        key={content}
                        className="rounded-xl border border-border/60 bg-background/35 px-2 py-1.5 text-[11px] text-muted-foreground"
                      >
                        {content}
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/10 px-3 py-2">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-black text-primary">
                        {pack.price}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        Secure Checkout
                      </span>
                    </div>

                    {paypalClientId && (
                      <PayPalPurchaseButton
                        sku={pack.sku}
                        onSuccess={handlePurchaseSuccess}
                      />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-lg font-black text-primary">
            Items & Currency
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {shopItems.map((item, index) => (
              <motion.div
                key={item.sku}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.16 + index * 0.04 }}
                className="rounded-3xl border border-border/70 bg-card/70 p-4 text-left transition-all hover:border-primary/40 hover:bg-primary/10"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-black/20">
                  <item.icon className={`h-5 w-5 ${item.iconClass}`} />
                </div>

                <p className="mt-3 font-display text-sm font-black text-foreground">
                  {item.title}
                </p>

                <p className="mt-1 min-h-[44px] text-[11px] leading-relaxed text-muted-foreground">
                  {item.desc}
                </p>

                <p className="mt-3 text-sm font-black text-primary">
                  {item.price}
                </p>

                {paypalClientId && (
                  <PayPalPurchaseButton
                    sku={item.sku}
                    onSuccess={handlePurchaseSuccess}
                  />
                )}
              </motion.div>
            ))}
          </div>
        </section>

        <div className="rounded-2xl border border-yellow-400/25 bg-yellow-400/10 p-3 text-xs text-muted-foreground">
          Secure PayPal checkout is active. Purchases are captured through Paypal
          and rewards are delivered to your Veilbreak account after confirmation.
        </div>
      </div>
    </div>
  );

  if (!paypalClientId) {
    return shopContent;
  }

  return (
    <PayPalScriptProvider
      options={{
        clientId: paypalClientId,
        currency: 'USD',
        intent: 'capture',
      }}
    >
      {shopContent}
    </PayPalScriptProvider>
  );
}