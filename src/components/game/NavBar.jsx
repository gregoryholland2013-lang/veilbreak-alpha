import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Layers,
  Swords,
  Zap,
  ScrollText,
  BookOpen,
  ShoppingBag,
  Mail,
  Grid3X3,
  X,
  Users,
  Shield,
  Flame,
  MessageCircle,
  ExternalLink,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';

const DISCORD_INVITE_URL =
  import.meta.env.VITE_DISCORD_INVITE_URL || 'https://discord.gg/6GepRHPCbe';

const primaryNav = [
  { path: '/', icon: Home, label: 'Hub' },
  { path: '/collection', icon: Layers, label: 'Cards' },
  { path: '/battle', icon: Swords, label: 'Battle' },
  { path: '/raid-event', icon: Flame, label: 'Raid' },
];

const allMenuItems = [
  { path: '/', icon: Home, label: 'Hub', desc: 'Home screen', color: 'text-foreground' },
  { path: '/raid-event', icon: Flame, label: 'Weekend Raid', desc: 'Live raid boss event', color: 'text-orange-300' },
  { path: '/collection', icon: Layers, label: 'Collection', desc: 'Your card inventory', color: 'text-blue-300' },
  { path: '/shop', icon: ShoppingBag, label: 'Veil Shop', desc: 'Packs & bundles', color: 'text-primary' },
  { path: '/inventory', icon: Package, label: 'Inventory', desc: 'Items & materials', color: 'text-yellow-300' },
  { path: '/enhance', icon: Zap, label: 'Enhance', desc: 'Level up & evolve cards', color: 'text-yellow-300' },
  { path: '/deck-builder', icon: BookOpen, label: 'Deck Builder', desc: 'Build your battle decks', color: 'text-green-300' },
  { path: '/quests', icon: ScrollText, label: 'Quests', desc: 'Go on adventures', color: 'text-amber-300' },
  { path: '/battle', icon: Swords, label: 'Battle', desc: 'PvP arena', color: 'text-red-300' },
  { path: '/mailbox', icon: Mail, label: 'Mailbox', desc: 'Daily login rewards', color: 'text-pink-300' },
  { path: '/social', icon: Users, label: 'Social', desc: 'Friends & Trading', color: 'text-cyan-300' },
  { href: DISCORD_INVITE_URL, external: true, icon: MessageCircle, label: 'Discord', desc: 'Join the community', color: 'text-indigo-300' },
  { path: '/guild', icon: Shield, label: 'Guild', desc: 'Guild management', color: 'text-emerald-300' },
  { path: '/event', icon: Flame, label: 'Event Dungeon', desc: 'Event dungeon content', color: 'text-orange-300' },
  { path: '/holy-wars', icon: Swords, label: 'Holy Wars', desc: 'Guild vs Guild battles', color: 'text-red-400' },
];

export default function NavBar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const openExternal = (href) => {
    if (!href) return;
    window.open(href, '_blank', 'noopener,noreferrer');
    setMenuOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 60 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="fixed bottom-20 left-0 right-0 z-50 mx-auto max-w-lg px-4"
            >
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <p className="font-display text-sm font-bold text-primary">All Features</p>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid max-h-[65vh] grid-cols-2 gap-2 overflow-y-auto p-3">
                  {allMenuItems.map(({ path, href, external, icon: Icon, label, desc, color }) => {
                    const active = path && location.pathname === path;
                    const className = `flex items-center gap-3 rounded-xl border p-3 transition-all ${
                      active
                        ? 'border-primary/30 bg-primary/10'
                        : external
                          ? 'border-indigo-400/25 bg-indigo-500/10 hover:border-indigo-300/50 hover:bg-indigo-500/15'
                          : 'border-transparent bg-muted/30 hover:bg-muted/60'
                    }`;

                    const content = (
                      <>
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-card ${active ? 'border border-primary/40' : ''}`}>
                          <Icon className={`h-4 w-4 ${color}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-display text-xs font-bold ${active ? 'text-primary' : 'text-foreground'}`}>{label}</p>
                          <p className="truncate text-[9px] text-muted-foreground">{desc}</p>
                        </div>
                        {external && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
                      </>
                    );

                    if (external) {
                      return <button key={label} type="button" onClick={() => openExternal(href)} className={`${className} text-left`}>{content}</button>;
                    }

                    return <Link key={path + label} to={path} onClick={() => setMenuOpen(false)} className={className}>{content}</Link>;
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="safe-area-inset-bottom fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-around py-1 pb-3">
          {primaryNav.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${
                  active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}
              >
                <Icon className={`h-5 w-5 transition-all ${active ? 'drop-shadow-[0_0_8px_hsl(45,80%,55%,0.8)]' : ''}`} />
                <span className={`text-[10px] font-bold uppercase tracking-wider ${active ? 'text-primary' : ''}`}>{label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex flex-col items-center gap-1 rounded-xl px-3 py-2 transition-all duration-200 ${
              menuOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            }`}
          >
            <Grid3X3 className={`h-5 w-5 ${menuOpen ? 'drop-shadow-[0_0_8px_hsl(45,80%,55%,0.8)]' : ''}`} />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${menuOpen ? 'text-primary' : ''}`}>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
