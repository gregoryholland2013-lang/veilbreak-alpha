import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Layers,
  Sparkles,
  Swords,
  Trophy,
  ScrollText,
  Zap,
  Users,
  Shield,
  Flame,
} from 'lucide-react';
import { useProfile, usePlayerCards, useCards } from '@/hooks/useGameData';
import MailboxButton from '@/components/game/MailboxButton';

const HERO_IMAGE =
  'https://media.base44.com/images/public/69e667952dab314dabbd3859/12dd112d1_generated_image.png';

const menuItems = [
  {
    path: '/summon',
    icon: Sparkles,
    label: 'Summon',
    desc: 'Draw powerful cards',
    color: 'from-purple-900/75 to-purple-950/85 border-purple-500/50',
    iconColor: 'text-purple-300',
  },
  {
    path: '/collection',
    icon: Layers,
    label: 'Collection',
    desc: 'View your cards',
    color: 'from-blue-900/75 to-blue-950/85 border-blue-500/50',
    iconColor: 'text-blue-300',
  },
  {
    path: '/quests',
    icon: ScrollText,
    label: 'Quests',
    desc: 'Go on adventures',
    color: 'from-amber-900/75 to-amber-950/85 border-amber-500/50',
    iconColor: 'text-amber-300',
  },
  {
    path: '/enhance',
    icon: Zap,
    label: 'Enhance',
    desc: 'Level up & evolve',
    color: 'from-yellow-900/75 to-yellow-950/85 border-yellow-500/50',
    iconColor: 'text-yellow-300',
  },
  {
    path: '/battle',
    icon: Swords,
    label: 'Battle',
    desc: 'Fight for glory',
    color: 'from-red-900/75 to-red-950/85 border-red-500/50',
    iconColor: 'text-red-300',
  },
  {
    path: '/social',
    icon: Users,
    label: 'Social',
    desc: 'Friends & Trading',
    color: 'from-cyan-900/75 to-cyan-950/85 border-cyan-500/50',
    iconColor: 'text-cyan-300',
  },
  {
    path: '/guild',
    icon: Shield,
    label: 'Guild',
    desc: 'Your guild home',
    color: 'from-emerald-900/75 to-emerald-950/85 border-emerald-500/50',
    iconColor: 'text-emerald-300',
  },
  {
    path: '/event',
    icon: Flame,
    label: 'Event',
    desc: 'Raid & dungeon event',
    color: 'from-orange-900/75 to-orange-950/85 border-orange-500/50',
    iconColor: 'text-orange-300',
  },
];

export default function Home() {
  const { data: profile } = useProfile();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: cards = [] } = useCards();

  const legendaryCount = playerCards.filter((pc) => {
    const card = cards.find((c) => c.id === pc.card_id);
    return card?.rarity === 'legendary';
  }).length;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* ── FULL PAGE BACKGROUND UNDERLAY ── */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <img
          src={HERO_IMAGE}
          alt=""
          className="w-full h-full object-cover object-top opacity-45"
        />

        {/* Main dark overlay for readability */}
        <div className="absolute inset-0 bg-background/55" />

        {/* Bottom fade so nav and profile area stay readable */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/10 via-background/55 to-background" />

        {/* Side vignette */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-background/80" />

        {/* Gold top accent */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent" />
      </div>

      {/* ── PAGE CONTENT OVERLAY ── */}
      <div className="relative z-10 max-w-lg mx-auto min-h-screen pb-24">
        {/* Mailbox button */}
        <div className="absolute top-3 right-3 z-20">
          <MailboxButton />
        </div>

        {/* ── TITLE SECTION ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-10 pb-8 px-4 text-center"
        >
          <h1 className="font-display text-3xl font-black text-primary text-glow-gold tracking-widest drop-shadow-2xl">
            VEILBREAK
          </h1>

          <p className="text-[11px] tracking-[0.3em] uppercase text-foreground/70 mt-1">
            Into the Singularity
          </p>

          <div className="mt-6">
            <h2 className="font-display text-3xl font-black text-primary text-glow-gold tracking-wider drop-shadow-2xl">
              REALM OF LEGENDS
            </h2>

            <p className="text-[11px] tracking-[0.25em] uppercase text-foreground/60 mt-1">
              Into the Singularity
            </p>
          </div>
        </motion.div>

        {/* ── GLASS PANEL WRAPPER ── */}
        <div className="mx-3 rounded-2xl border border-border/60 bg-background/45 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* ── STATS ROW ── */}
          <div className="flex justify-center gap-4 px-4 py-3 border-b border-border/40 bg-background/25">
            {[
              {
                label: 'Cards',
                value: playerCards.length,
                color: 'text-blue-300',
              },
              {
                label: 'Legendary',
                value: legendaryCount,
                color: 'text-primary',
              },
              {
                label: 'Wins',
                value: profile?.wins || 0,
                color: 'text-green-300',
              },
            ].map(({ label, value, color }) => (
              <div key={label} className="text-center flex-1">
                <p className={`font-display font-black text-xl ${color}`}>
                  {value}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {label}
                </p>
              </div>
            ))}
          </div>

          {/* ── MENU GRID ── */}
          <div className="px-3 py-4 grid grid-cols-2 gap-2.5">
            {menuItems.map((item, i) => (
              <motion.div
                key={item.path}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.06 }}
              >
                <Link to={item.path}>
                  <div
                    className={`relative overflow-hidden bg-gradient-to-br ${item.color} border rounded-xl p-4 hover:scale-[1.03] hover:brightness-110 transition-all duration-200 group shadow-lg`}
                  >
                    {/* subtle shine on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-white/0 group-hover:from-white/5 transition-all duration-300 rounded-xl" />

                    {/* Gold corner accent */}
                    <div className="absolute top-0 right-0 w-8 h-8 bg-gradient-to-bl from-primary/30 to-transparent rounded-bl-xl" />

                    <item.icon
                      className={`w-7 h-7 ${item.iconColor} mb-2.5 drop-shadow-lg`}
                    />

                    <h3 className="font-display font-bold text-sm text-foreground">
                      {item.label}
                    </h3>

                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {item.desc}
                    </p>
                  </div>
                </Link>
              </motion.div>
            ))}

            {/* Wide banner for level / profile */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="col-span-2"
            >
              <div className="relative overflow-hidden border border-primary/30 rounded-xl p-3 bg-gradient-to-r from-primary/10 via-secondary/30 to-accent/10 flex items-center gap-3">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent" />

                <div className="relative w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>

                <div className="relative flex-1 min-w-0">
                  <p className="font-display text-sm font-bold text-foreground">
                    {profile?.display_name || 'Adventurer'} · Lv.
                    {profile?.level || 1}
                  </p>

                  <p className="text-[11px] text-muted-foreground truncate">
                    {profile?.quests_completed || 0} quests completed ·{' '}
                    {profile?.wins || 0} battles won
                  </p>
                </div>

                <div className="relative text-right flex-shrink-0">
                  <p className="text-xs text-yellow-400 font-bold">
                    ⚡ {profile?.stamina ?? '—'}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Stamina</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}