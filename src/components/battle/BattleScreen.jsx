import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sword, Shield, Heart, Zap, Sparkles, Trophy, Skull } from 'lucide-react';

const elementIcons  = { fire: '🔥', water: '💧', earth: '🌿', light: '✨', dark: '🌑' };
const elementColors = {
  fire:  'from-red-900/80 to-orange-900/80 border-red-500/60',
  water: 'from-blue-900/80 to-cyan-900/80 border-blue-500/60',
  earth: 'from-green-900/80 to-emerald-900/80 border-green-500/60',
  light: 'from-yellow-900/80 to-amber-900/80 border-yellow-500/60',
  dark:  'from-purple-900/80 to-slate-900/80 border-purple-500/60',
};
const rarityGlow = {
  common:    '',
  rare:      'shadow-[0_0_12px_rgba(96,165,250,0.5)]',
  epic:      'shadow-[0_0_12px_rgba(192,132,252,0.6)]',
  legendary: 'shadow-[0_0_16px_rgba(250,189,50,0.7)]',
};
const rarityBorder = {
  common:    'border-slate-500/50',
  rare:      'border-blue-400',
  epic:      'border-purple-400',
  legendary: 'border-yellow-400',
};

function makeNpcCards(opponentName, deckPower) {
  const names    = ['Shadow Grunt', 'Iron Knight', 'Void Scout', 'Storm Mage', 'Bone Guard'];
  const elements = ['fire', 'water', 'earth', 'light', 'dark'];
  const types    = ['warrior', 'mage', 'archer', 'healer', 'tank'];
  const rarities = ['common', 'rare', 'epic'];
  const basePower = deckPower / 5;
  return names.map((name, i) => ({
    id: `npc-${i}`,
    card: {
      name,
      element: elements[i % elements.length],
      card_type: types[i % types.length],
      rarity: rarities[Math.floor(Math.random() * rarities.length)],
      base_attack: Math.round(basePower * 0.3 * (0.8 + Math.random() * 0.4)),
      base_defense: Math.round(basePower * 0.25 * (0.8 + Math.random() * 0.4)),
      base_hp: Math.round(basePower * 0.45 * (0.8 + Math.random() * 0.4)),
      skill_name: ['Shadow Slash', 'Iron Bulwark', 'Void Drain', 'Storm Surge', 'Bone Crush'][i],
      skill_description: ['Deals heavy damage', 'Reduces incoming damage', 'Drains enemy HP', 'Strikes all foes', 'Crushes armor'][i],
      skill_power: 1.2 + Math.random() * 0.8,
      image_url: null,
    },
    playerCard: { level: Math.ceil(1 + Math.random() * 4) },
    isNpc: true,
  }));
}

function pickSkillTriggers(deckCards) {
  const count = Math.floor(Math.random() * 3) + 1;
  return [...deckCards].sort(() => Math.random() - 0.5).slice(0, Math.min(count, deckCards.length)).map(c => c.card?.id || c.id);
}

function BattleCard({ item, triggeredSkill, delay = 0, side = 'left', isActive }) {
  const { card, playerCard } = item;
  const level = playerCard?.level || 1;
  const mult  = 1 + (level - 1) * 0.1;
  const elColors = elementColors[card.element] || elementColors.dark;

  return (
    <motion.div
      initial={{ opacity: 0, x: side === 'left' ? -50 : 50, rotateY: side === 'left' ? -15 : 15 }}
      animate={{ opacity: 1, x: 0, rotateY: 0 }}
      transition={{ delay, duration: 0.4, type: 'spring', stiffness: 200 }}
      className={`relative rounded-xl overflow-hidden border-2 ${rarityBorder[card.rarity] || rarityBorder.common} ${rarityGlow[card.rarity] || ''} transition-all duration-300`}
    >
      {/* Card art background */}
      <div className={`relative w-full h-20 bg-gradient-to-br ${elColors} flex items-center justify-center overflow-hidden`}>
        {card.image_url
          ? <img src={card.image_url} alt={card.name} className="w-full h-full object-cover opacity-80" />
          : (
            <motion.span
              animate={isActive ? { scale: [1, 1.2, 1] } : {}}
              transition={{ repeat: Infinity, duration: 2 }}
              className="text-4xl drop-shadow-lg"
            >
              {elementIcons[card.element] || '⚔️'}
            </motion.span>
          )
        }
        {/* Level badge */}
        <div className="absolute top-1 right-1 bg-black/60 rounded-md px-1 py-0.5 text-[9px] font-black text-primary font-display">
          Lv{level}
        </div>
        {/* Rarity shine */}
        {card.rarity === 'legendary' && (
          <motion.div
            animate={{ x: ['−100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: 'linear', repeatDelay: 1 }}
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12"
          />
        )}
      </div>

      {/* Card info */}
      <div className="bg-card/95 px-2 py-1.5">
        <p className="font-display text-[10px] font-bold truncate text-foreground leading-tight">{card.name}</p>
        <div className="flex gap-1.5 mt-1 text-[9px]">
          <span className="flex items-center gap-0.5 text-red-400 font-bold">
            <Sword className="w-2.5 h-2.5" />{Math.round(card.base_attack * mult)}
          </span>
          <span className="flex items-center gap-0.5 text-blue-400 font-bold">
            <Shield className="w-2.5 h-2.5" />{Math.round(card.base_defense * mult)}
          </span>
          <span className="flex items-center gap-0.5 text-green-400 font-bold">
            <Heart className="w-2.5 h-2.5" />{Math.round(card.base_hp * mult)}
          </span>
        </div>
      </div>

      {/* Skill triggered overlay */}
      <AnimatePresence>
        {triggeredSkill && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 rounded-xl border-2 border-yellow-400 bg-yellow-400/20 backdrop-blur-sm flex flex-col items-center justify-center gap-1 z-10"
          >
            <motion.div animate={{ rotate: 360, scale: [1, 1.3, 1] }} transition={{ duration: 0.6 }}>
              <Sparkles className="w-6 h-6 text-yellow-300 drop-shadow-lg" />
            </motion.div>
            <p className="text-[9px] font-black text-yellow-200 text-center px-1 leading-tight">{card.skill_name || 'SKILL!'}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function BattleScreen({ myDeckCards, opponent, onFinish }) {
  const [phase, setPhase]           = useState('show_decks');
  const [mySkills, setMySkills]     = useState([]);
  const [oppSkills, setOppSkills]   = useState([]);
  const [skillEvents, setSkillEvents] = useState([]);
  const [result, setResult]         = useState(null);
  const [clashFlash, setClashFlash] = useState(false);

  const enemyCards = opponent.activeDeck
    ? makeNpcCards(opponent.display_name, opponent.deckPower || 600)
    : makeNpcCards(opponent.display_name, opponent.deckPower || 600);

  const myPower  = myDeckCards.reduce((s, { card, playerCard }) => {
    const mult = 1 + ((playerCard?.level || 1) - 1) * 0.1;
    return s + card.base_attack * mult + card.base_defense * mult + card.base_hp * mult;
  }, 0);
  const oppPower = opponent.deckPower || myPower * (0.7 + Math.random() * 0.6);

  useEffect(() => {
    const run = async () => {
      await new Promise(r => setTimeout(r, 1800));

      const myTriggered  = pickSkillTriggers(myDeckCards);
      const oppTriggered = pickSkillTriggers(enemyCards);
      setMySkills(myTriggered);
      setOppSkills(oppTriggered);

      const events = [];
      myTriggered.forEach(id => {
        const item = myDeckCards.find(c => (c.card?.id || c.id) === id);
        if (item) events.push({ side: 'player', cardName: item.card.name, skillName: item.card.skill_name || 'Skill', power: item.card.skill_power || 1.3 });
      });
      oppTriggered.forEach(id => {
        const item = enemyCards.find(c => (c.card?.id || c.id) === id);
        if (item) events.push({ side: 'enemy', cardName: item.card.name, skillName: item.card.skill_name || 'Skill', power: item.card.skill_power || 1.3 });
      });
      setSkillEvents(events);
      setPhase('skills');

      // clash flash
      await new Promise(r => setTimeout(r, 1200));
      setClashFlash(true);
      await new Promise(r => setTimeout(r, 400));
      setClashFlash(false);

      await new Promise(r => setTimeout(r, 1600));

      const mySkillBonus  = myTriggered.length > 0
        ? myDeckCards.filter(c => myTriggered.includes(c.card?.id || c.id)).reduce((s, c) => s + (c.card?.skill_power || 1.3) * (c.card?.base_attack || 50) * (1 + ((c.playerCard?.level || 1) - 1) * 0.1), 0)
        : 0;
      const oppSkillBonus = oppTriggered.length > 0
        ? enemyCards.filter(c => oppTriggered.includes(c.card?.id || c.id)).reduce((s, c) => s + (c.card?.skill_power || 1.3) * (c.card?.base_attack || 50), 0)
        : 0;

      const myTotal  = myPower  + mySkillBonus  + Math.random() * myPower  * 0.15;
      const oppTotal = oppPower + oppSkillBonus + Math.random() * oppPower * 0.15;
      const won = myTotal > oppTotal;

      setResult({ won, myTotal: Math.round(myTotal), oppTotal: Math.round(oppTotal), mySkillsTriggered: myTriggered.length, oppSkillsTriggered: oppTriggered.length });
      setPhase('result');
      onFinish(won);
    };
    run();
  }, []);

  return (
    <div className="relative space-y-0 overflow-hidden">

      {/* Clash flash overlay */}
      <AnimatePresence>
        {clashFlash && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/30 pointer-events-none" />
        )}
      </AnimatePresence>

      {/* ── ARENA HEADER ── */}
      <div className="relative overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 border border-purple-500/20 pt-4 pb-2 px-3">
        {/* atmospheric particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/60"
            style={{ left: `${15 + i * 14}%`, top: `${20 + (i % 3) * 25}%` }}
            animate={{ y: [-4, 4, -4], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2 + i * 0.3, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}

        <div className="flex items-center justify-between">
          <div className="text-center">
            <p className="font-display text-[10px] uppercase tracking-widest text-green-400/80 mb-1">You</p>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500/30 to-green-900/60 border border-green-500/50 flex items-center justify-center mx-auto">
              <Sword className="w-5 h-5 text-green-300" />
            </div>
          </div>

          {/* VS orb */}
          <div className="flex flex-col items-center gap-1">
            <motion.div
              animate={{ scale: [1, 1.08, 1], boxShadow: ['0 0 10px rgba(250,189,50,0.3)', '0 0 25px rgba(250,189,50,0.7)', '0 0 10px rgba(250,189,50,0.3)'] }}
              transition={{ duration: 1.8, repeat: Infinity }}
              className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 border-2 border-primary flex items-center justify-center"
            >
              <span className="font-display font-black text-sm text-primary">VS</span>
            </motion.div>
            <p className="text-[9px] tracking-widest text-muted-foreground uppercase">
              {phase === 'show_decks' ? 'decks revealed' : phase === 'skills' ? '⚡ skills!' : ''}
            </p>
          </div>

          <div className="text-center">
            <p className="font-display text-[10px] uppercase tracking-widest text-red-400/80 mb-1">{opponent.display_name}</p>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500/30 to-red-900/60 border border-red-500/50 flex items-center justify-center mx-auto">
              <Skull className="w-5 h-5 text-red-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ── DECKS GRID ── */}
      <div className="relative bg-gradient-to-b from-slate-900/90 to-background border-x border-purple-500/20 px-3 pb-3">
        {/* Vertical divider */}
        <div className="absolute inset-y-0 left-1/2 w-px bg-gradient-to-b from-primary/30 via-primary/60 to-primary/30 transform -translate-x-1/2" />

        <div className="grid grid-cols-2 gap-3 pt-3">
          {/* My deck */}
          <div className="space-y-2">
            {myDeckCards.map((item, i) => (
              <BattleCard
                key={item.playerCard?.id || i}
                item={item}
                triggeredSkill={phase === 'skills' && mySkills.includes(item.card?.id)}
                delay={i * 0.08}
                side="left"
                isActive={phase === 'skills'}
              />
            ))}
          </div>
          {/* Enemy deck */}
          <div className="space-y-2">
            {enemyCards.map((item, i) => (
              <BattleCard
                key={item.id || i}
                item={item}
                triggeredSkill={phase === 'skills' && oppSkills.includes(item.card?.id || item.id)}
                delay={i * 0.08 + 0.04}
                side="right"
                isActive={phase === 'skills'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── SKILL LOG ── */}
      <AnimatePresence>
        {phase === 'skills' && skillEvents.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="border-x border-b border-purple-500/20 bg-slate-900/80 px-4 py-3 space-y-1.5">
            <p className="text-[9px] uppercase tracking-widest text-yellow-400/80 font-bold mb-1">⚡ Skills Activated!</p>
            {skillEvents.map((ev, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: ev.side === 'player' ? -12 : 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.25 }}
                className={`flex items-center gap-2 text-xs ${ev.side === 'player' ? 'text-green-300' : 'text-red-300'}`}>
                <Sparkles className="w-3 h-3 flex-shrink-0" />
                <span><span className="font-bold">{ev.cardName}</span> → <span className="font-bold">{ev.skillName}</span> <span className="text-muted-foreground">(×{ev.power.toFixed(1)})</span></span>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* calculating */}
      {phase === 'skills' && (
        <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1, repeat: Infinity }}
          className="text-center text-[11px] text-primary font-semibold py-2 bg-gradient-to-r from-transparent via-primary/5 to-transparent">
          ⚔️ Computing battle outcome…
        </motion.p>
      )}

      {/* ── RESULT ── */}
      <AnimatePresence>
        {phase === 'result' && result && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            className={`relative overflow-hidden rounded-b-2xl border-x border-b p-5 text-center space-y-4
              ${result.won
                ? 'border-primary/50 bg-gradient-to-br from-yellow-900/40 via-amber-900/20 to-background'
                : 'border-red-500/40 bg-gradient-to-br from-red-900/40 via-red-950/20 to-background'}`}
          >
            {/* Decorative rays */}
            {result.won && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(8)].map((_, i) => (
                  <motion.div key={i}
                    className="absolute top-1/2 left-1/2 w-0.5 bg-gradient-to-t from-primary/0 to-primary/30"
                    style={{ height: '120%', transformOrigin: 'bottom center', rotate: `${i * 45}deg`, translateX: '-50%' }}
                    animate={{ opacity: [0, 0.6, 0] }}
                    transition={{ duration: 2, repeat: Infinity, delay: i * 0.15 }}
                  />
                ))}
              </div>
            )}

            <div className="relative">
              <motion.div animate={{ scale: [1, 1.15, 1], rotate: result.won ? [0, 5, -5, 0] : [0] }}
                transition={{ duration: 0.8, ease: 'easeOut' }}>
                {result.won
                  ? <Trophy className="w-14 h-14 mx-auto text-primary drop-shadow-[0_0_20px_hsl(45,80%,55%,0.8)]" />
                  : <Skull className="w-14 h-14 mx-auto text-red-400 opacity-80" />}
              </motion.div>
              <h2 className={`font-display text-3xl font-black mt-2 ${result.won ? 'text-primary' : 'text-red-400'}`}>
                {result.won ? '⚔️ VICTORY!' : '💀 DEFEAT'}
              </h2>
            </div>

            {/* Power comparison bars */}
            <div className="space-y-2">
              {[
                { label: 'Your Power', value: result.myTotal, max: Math.max(result.myTotal, result.oppTotal), color: 'bg-green-500', won: result.won },
                { label: opponent.display_name, value: result.oppTotal, max: Math.max(result.myTotal, result.oppTotal), color: 'bg-red-500', won: !result.won },
              ].map(({ label, value, max, color, won: isWinner }) => (
                <div key={label} className="text-left">
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className={`font-semibold ${isWinner ? 'text-foreground' : 'text-muted-foreground'}`}>{label}</span>
                    <span className="text-muted-foreground font-mono">{value.toLocaleString()}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.3, ease: 'easeOut' }}
                      className={`h-full rounded-full ${color} ${isWinner ? 'opacity-100' : 'opacity-50'}`} />
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <span>🌟 My skills: <strong className="text-foreground">{result.mySkillsTriggered}</strong></span>
              <span>⚡ Their skills: <strong className="text-foreground">{result.oppSkillsTriggered}</strong></span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}