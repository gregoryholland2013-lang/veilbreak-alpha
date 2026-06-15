import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Layers,
  Swords,
  Sparkles,
  Zap,
  ScrollText,
  BookOpen,
  Mail,
  Grid3X3,
  X,
  Users,
  Shield,
  Flame,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Package } from 'lucide-react';

const primaryNav = [
  { path: '/', icon: Home, label: 'Hub' },
  { path: '/collection', icon: Layers, label: 'Cards' },
  { path: '/battle', icon: Swords, label: 'Battle' },
  { path: '/raid-event', icon: Flame, label: 'Raid' },
];

const allMenuItems = [
  {
    path: '/',
    icon: Home,
    label: 'Hub',
    desc: 'Home screen',
    color: 'text-foreground',
  },
  {
    path: '/raid-event',
    icon: Flame,
    label: 'Weekend Raid',
    desc: 'Live raid boss event',
    color: 'text-orange-300',
  },
  {
    path: '/collection',
    icon: Layers,
    label: 'Collection',
    desc: 'Your card inventory',
    color: 'text-blue-300',
  },
  {
    path: '/summon',
    icon: Sparkles,
    label: 'Summon',
    desc: 'Draw new cards',
    color: 'text-purple-300',
  },
  {
    path: '/inventory',
    icon: Package,
    label: 'Inventory',
    desc: 'Items & materials',
    color: 'text-yellow-300',
  },
  {
    path: '/enhance',
    icon: Zap,
    label: 'Enhance',
    desc: 'Level up & evolve cards',
    color: 'text-yellow-300',
  },
  {
    path: '/deck-builder',
    icon: BookOpen,
    label: 'Deck Builder',
    desc: 'Build your battle decks',
    color: 'text-green-300',
  },
  {
    path: '/quests',
    icon: ScrollText,
    label: 'Quests',
    desc: 'Go on adventures',
    color: 'text-amber-300',
  },
  {
    path: '/battle',
    icon: Swords,
    label: 'Battle',
    desc: 'PvP arena',
    color: 'text-red-300',
  },
  {
    path: '/mailbox',
    icon: Mail,
    label: 'Mailbox',
    desc: 'Daily login rewards',
    color: 'text-pink-300',
  },
  {
    path: '/social',
    icon: Users,
    label: 'Social',
    desc: 'Friends & Trading',
    color: 'text-cyan-300',
  },
  {
    path: '/guild',
    icon: Shield,
    label: 'Guild',
    desc: 'Guild management',
    color: 'text-emerald-300',
  },
  {
    path: '/event',
    icon: Flame,
    label: 'Event Dungeon',
    desc: 'Event dungeon content',
    color: 'text-orange-300',
  },
  {
    path: '/holy-wars',
    icon: Swords,
    label: 'Holy Wars',
    desc: 'Guild vs Guild battles',
    color: 'text-red-400',
  },
];

export default function NavBar() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      {/* Full-screen menu overlay */}
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
              className="fixed bottom-20 left-0 right-0 z-50 max-w-lg mx-auto px-4"
            >
              <div className="bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <p className="font-display font-bold text-sm text-primary">
                    All Features
                  </p>

                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-7 h-7 rounded-lg bg-muted/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 p-3">
                  {allMenuItems.map(({ path, icon: Icon, label, desc, color }) => {
                    const active = location.pathname === path;

                    return (
                      <Link
                        key={path + label}
                        to={path}
                        onClick={() => setMenuOpen(false)}
                        className={`flex items-center gap-3 rounded-xl p-3 transition-all
                          ${
                            active
                              ? 'bg-primary/10 border border-primary/30'
                              : 'bg-muted/30 hover:bg-muted/60 border border-transparent'
                          }`}
                      >
                        <div
                          className={`w-8 h-8 rounded-lg bg-card flex items-center justify-center flex-shrink-0 ${
                            active ? 'border border-primary/40' : ''
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${color}`} />
                        </div>

                        <div className="min-w-0">
                          <p
                            className={`font-display font-bold text-xs ${
                              active ? 'text-primary' : 'text-foreground'
                            }`}
                          >
                            {label}
                          </p>

                          <p className="text-[9px] text-muted-foreground truncate">
                            {desc}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom nav bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-md border-t border-border safe-area-inset-bottom">
        <div className="max-w-lg mx-auto flex justify-around items-center py-1 pb-3">
          {primaryNav.map(({ path, icon: Icon, label }) => {
            const active = location.pathname === path;

            return (
              <Link
                key={path}
                to={path}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200
                  ${
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
              >
                <Icon
                  className={`w-5 h-5 transition-all ${
                    active
                      ? 'drop-shadow-[0_0_8px_hsl(45,80%,55%,0.8)]'
                      : ''
                  }`}
                />

                <span
                  className={`text-[10px] font-bold tracking-wider uppercase ${
                    active ? 'text-primary' : ''
                  }`}
                >
                  {label}
                </span>
              </Link>
            );
          })}

          {/* More button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-200
              ${
                menuOpen
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
          >
            <Grid3X3
              className={`w-5 h-5 ${
                menuOpen ? 'drop-shadow-[0_0_8px_hsl(45,80%,55%,0.8)]' : ''
              }`}
            />

            <span
              className={`text-[10px] font-bold tracking-wider uppercase ${
                menuOpen ? 'text-primary' : ''
              }`}
            >
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}