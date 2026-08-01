import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Filter,
  Heart,
  Lock,
  Search,
  Shield,
  Sparkles,
  Sword,
  Zap,
} from 'lucide-react';
import {
  useCards,
  usePlayerCards,
  useProfile,
} from '@/hooks/useGameData';
import { supabase } from '@/lib/supabaseClient';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

const BASE_MAX_LEVEL = 10;
const FINAL_FORM_MAX_LEVEL = 20;
const MAX_EVOLVES = 3;
const STAT_GROWTH_PER_LEVEL = 0.1;
const SKILL_MAX_LEVEL = 10;
const SKILL_SHARD_COST_MULTIPLIER = 3;
const MAX_FODDER_SELECTION = 10;
const DEFAULT_FODDER_XP = 20;

const EVOLUTION_RATES = {
  base_plus: 0.4,
  base_plus_plus: 0.45,
  final: 0.5,
};

const RARITY_STYLES = {
  vessel: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
  awakened: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  ascendant: 'border-purple-400/40 bg-purple-400/10 text-purple-200',
  exalted: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  mythic: 'border-pink-400/40 bg-pink-400/10 text-pink-200',
  transcendent: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
  eclipse: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
  singularity: 'border-primary/50 bg-primary/15 text-primary',
  normal: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
  common: 'border-slate-400/40 bg-slate-400/10 text-slate-200',
  high_normal: 'border-blue-400/40 bg-blue-400/10 text-blue-200',
  rare: 'border-purple-400/40 bg-purple-400/10 text-purple-200',
  super_rare: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  ascended: 'border-amber-400/40 bg-amber-400/10 text-amber-200',
  super_super_rare: 'border-pink-400/40 bg-pink-400/10 text-pink-200',
  epic: 'border-pink-400/40 bg-pink-400/10 text-pink-200',
  legendary: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
  paragon: 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200',
  ultra_rare: 'border-violet-400/40 bg-violet-400/10 text-violet-200',
};

function cardCapacity(level) {
  return 50 + (level - 1) * 10;
}

function xpToNextLevel(level) {
  return level * 50;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().trim();
}

function normalizeKey(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function normalizeStage(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replaceAll('+', '_plus')
    .replaceAll(' ', '_')
    .replaceAll('-', '_');
}

function titleCaseFromKey(value) {
  return String(value || '')
    .replaceAll('_', ' ')
    .replace(/\w\S*/g, (word) => {
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    });
}

function inferLineFromName(value) {
  return normalizeText(value)
    .replace(/base\+\+/g, '')
    .replace(/base_plus_plus/g, '')
    .replace(/base\+/g, '')
    .replace(/base_plus/g, '')
    .replace(/final form/g, '')
    .replace(/final/g, '')
    .replace(/\bbase\b/g, '')
    .replace(/[,]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getDisplayName(card, playerCard) {
  return (
    String(
      card?.name ||
        card?.full_card_name ||
        card?.card_name ||
        playerCard?.card_name ||
        playerCard?.full_card_name ||
        ''
    ).trim() || 'Unknown Card'
  );
}

function getRarityRaw(card, playerCard) {
  return (
    card?.rarity ||
    card?.rarity_tier ||
    playerCard?.rarity ||
    playerCard?.rarity_tier ||
    'Vessel'
  );
}

function getRarityLabel(card, playerCard) {
  const raw = getRarityRaw(card, playerCard);
  const normalized = normalizeKey(raw);
  const labels = {
    common: 'Vessel',
    normal: 'Vessel',
    high_normal: 'Awakened',
    rare: 'Ascendant',
    super_rare: 'Exalted',
    ascended: 'Exalted',
    super_super_rare: 'Mythic',
    epic: 'Mythic',
    legendary: 'Transcendent',
    paragon: 'Transcendent',
    ultra_rare: 'Eclipse',
  };

  return labels[normalized] || titleCaseFromKey(raw || 'Vessel');
}

function getRarityStyle(card, playerCard) {
  const rawKey = normalizeKey(getRarityRaw(card, playerCard));
  const labelKey = normalizeKey(getRarityLabel(card, playerCard));
  return (
    RARITY_STYLES[labelKey] ||
    RARITY_STYLES[rawKey] ||
    'border-primary/40 bg-primary/10 text-primary'
  );
}

function getCardImageUrl(card) {
  return (
    card?.clean_art_url ||
    card?.image_url ||
    card?.artwork_url ||
    card?.image ||
    ''
  );
}

function getCardLineKey(card) {
  const explicitLine = normalizeText(card?.card_line);
  if (explicitLine) return explicitLine;
  return inferLineFromName(card?.full_card_name || card?.name || '');
}

function getCardLineLabel(card) {
  const explicitLine = String(card?.card_line || '').trim();
  if (explicitLine) return titleCaseFromKey(explicitLine);
  return getDisplayName(card).replace(/\s+/g, ' ').trim();
}

function inferStageFromName(card) {
  const text = normalizeText(`${card?.name || ''} ${card?.full_card_name || ''}`);
  if (text.includes('final form') || text.includes(' final') || text.endsWith('final')) return 'final';
  if (text.includes('base++') || text.includes('base_plus_plus') || text.includes('++')) return 'base_plus_plus';
  if (text.includes('base+') || text.includes('base_plus') || text.includes('+')) return 'base_plus';
  return 'base';
}

function getCardStage(card) {
  const evoForm = normalizeStage(card?.evo_form);
  const stage = normalizeStage(card?.evolution_stage);
  if (evoForm && evoForm !== 'base') return evoForm;
  if (stage && stage !== 'base') return stage;
  if (evoForm === 'base' || stage === 'base') return 'base';
  return inferStageFromName(card);
}

function getNextEvolutionStage(evolveCount) {
  if (evolveCount >= 3) return 'final';
  if (evolveCount === 2) return 'base_plus_plus';
  if (evolveCount === 1) return 'base_plus';
  return 'base';
}

function formatStageLabel(stage) {
  if (stage === 'base_plus') return 'Base+';
  if (stage === 'base_plus_plus') return 'Base++';
  if (stage === 'final') return 'Final Form';
  return 'Base';
}

function getEvolutionRate(nextEvolveCount) {
  const nextStage = getNextEvolutionStage(nextEvolveCount);
  return EVOLUTION_RATES[nextStage] || 0.4;
}

function getStageCountFromStage(stage) {
  const normalized = normalizeStage(stage);
  if (normalized === 'final') return 3;
  if (normalized === 'base_plus_plus') return 2;
  if (normalized === 'base_plus') return 1;
  return 0;
}

function getOwnedCardStageCount(playerCard, card) {
  const evolveCount = Number(playerCard?.evolve_count || 0);
  if (evolveCount > 0) return Math.min(evolveCount, MAX_EVOLVES);
  return getStageCountFromStage(playerCard?.evolution_stage || card?.evolution_stage || card?.evo_form);
}

function getNextEvolveCountFromTarget(targetPlayerCard, targetCard) {
  const targetStageCount = getOwnedCardStageCount(targetPlayerCard, targetCard);
  return Math.min(targetStageCount + 1, MAX_EVOLVES);
}

function isFinalForm(playerCard, card) {
  return getOwnedCardStageCount(playerCard, card) >= MAX_EVOLVES;
}

function getCardMaxLevel(playerCard, card) {
  return isFinalForm(playerCard, card) ? FINAL_FORM_MAX_LEVEL : BASE_MAX_LEVEL;
}

function isCardMaxed(playerCard, card) {
  return Number(playerCard?.level || 1) >= getCardMaxLevel(playerCard, card);
}

function isCardProtected(playerCard) {
  return Boolean(playerCard?.is_protected || playerCard?.locked);
}

function hasCardSkill(card) {
  return Boolean(String(card?.skill_name || '').trim());
}

function getSkillLevel(playerCard) {
  return Math.max(1, Number(playerCard?.skill_level || 1));
}

function getSkillShardCost(skillLevel) {
  return Math.max(1, Number(skillLevel || 1)) * SKILL_SHARD_COST_MULTIPLIER;
}

function isSkillMaxed(playerCard) {
  return getSkillLevel(playerCard) >= SKILL_MAX_LEVEL;
}

function getFodderXp(item) {
  return Math.max(1, Number(item?.playerCard?.enhance_xp ?? item?.card?.enhance_xp ?? item?.card?.xp_value ?? item?.card?.fodder_xp ?? DEFAULT_FODDER_XP));
}

function isValidEvolutionMaterial(targetPlayerCard, targetCard, consumedPlayerCard, consumedCard) {
  if (!targetPlayerCard || !targetCard || !consumedPlayerCard || !consumedCard) return false;
  if (targetPlayerCard.id === consumedPlayerCard.id) return false;
  if (isCardProtected(consumedPlayerCard)) return false;
  if (isFinalForm(targetPlayerCard, targetCard)) return false;
  return getCardLineKey(targetCard) === getCardLineKey(consumedCard);
}

function findNextStageCard({ cards, currentCard, nextStage }) {
  const currentLine = getCardLineKey(currentCard);
  const normalizedNextStage = normalizeStage(nextStage);
  const candidates = cards.filter((candidate) => {
    return getCardLineKey(candidate) === currentLine && getCardStage(candidate) === normalizedNextStage;
  });
  const withCleanArt = candidates.find((candidate) => candidate.clean_art_url && String(candidate.clean_art_url).trim() !== '');
  const withImage = candidates.find((candidate) => candidate.image_url && String(candidate.image_url).trim() !== '');
  return withCleanArt || withImage || candidates[0] || null;
}

function getStageBaseStat(playerCard, card, stat) {
  if (stat === 'attack') return Number(playerCard?.stage_base_attack ?? card?.base_attack ?? 0);
  if (stat === 'defense') return Number(playerCard?.stage_base_defense ?? card?.base_defense ?? 0);
  if (stat === 'hp') return Number(playerCard?.stage_base_hp ?? card?.base_hp ?? 0);
  return 0;
}

function getCurrentStat(playerCard, card, stat) {
  if (stat === 'attack') return Number(playerCard?.attack ?? playerCard?.stage_base_attack ?? card?.base_attack ?? 0);
  if (stat === 'defense') return Number(playerCard?.defense ?? playerCard?.stage_base_defense ?? card?.base_defense ?? 0);
  if (stat === 'hp') return Number(playerCard?.hp ?? playerCard?.max_hp ?? playerCard?.stage_base_hp ?? card?.base_hp ?? 0);
  return 0;
}

function levelMultiplier(level) {
  return 1 + (Math.max(1, Number(level || 1)) - 1) * STAT_GROWTH_PER_LEVEL;
}

function calculateEnhancedStat(stageBase, level) {
  return Math.round(Number(stageBase || 0) * levelMultiplier(level));
}

function calculateEvolvedStat({ previousStageBase, targetCurrent, consumedCurrent, rate }) {
  return Math.round(Number(previousStageBase || 0) + (Number(targetCurrent || 0) + Number(consumedCurrent || 0)) * Number(rate || 0));
}

function buildEnhanceStats({ card, playerCard, newLevel, levelsGained }) {
  const currentAttack = getCurrentStat(playerCard, card, 'attack');
  const currentDefense = getCurrentStat(playerCard, card, 'defense');
  const currentHp = getCurrentStat(playerCard, card, 'hp');
  const stageBaseAttack = getStageBaseStat(playerCard, card, 'attack');
  const stageBaseDefense = getStageBaseStat(playerCard, card, 'defense');
  const stageBaseHp = getStageBaseStat(playerCard, card, 'hp');
  const calculatedAttack = calculateEnhancedStat(stageBaseAttack, newLevel);
  const calculatedDefense = calculateEnhancedStat(stageBaseDefense, newLevel);
  const calculatedHp = calculateEnhancedStat(stageBaseHp, newLevel);

  if (levelsGained <= 0) {
    return { attack: currentAttack, defense: currentDefense, hp: currentHp, max_hp: currentHp };
  }

  return {
    attack: Math.max(currentAttack, calculatedAttack),
    defense: Math.max(currentDefense, calculatedDefense),
    hp: Math.max(currentHp, calculatedHp),
    max_hp: Math.max(currentHp, calculatedHp),
  };
}

function buildDisplayItem(item) {
  const card = item.card;
  const playerCard = item.playerCard;
  const displayName = getDisplayName(card, playerCard);
  const rarityLabel = getRarityLabel(card, playerCard);
  const stageCount = getOwnedCardStageCount(playerCard, card);
  const stage = getNextEvolutionStage(stageCount);
  const stageLabel = formatStageLabel(stage);
  const maxLevel = getCardMaxLevel(playerCard, card);
  const maxed = isCardMaxed(playerCard, card);
  const attack = getCurrentStat(playerCard, card, 'attack');
  const defense = getCurrentStat(playerCard, card, 'defense');
  const hp = getCurrentStat(playerCard, card, 'hp');

  return {
    ...item,
    card: { ...card, name: displayName, rarity: card?.rarity || card?.rarity_tier || rarityLabel },
    displayName,
    rarityLabel,
    rarityStyle: getRarityStyle(card, playerCard),
    lineKey: getCardLineKey(card),
    lineLabel: getCardLineLabel(card),
    stageCount,
    stage,
    stageLabel,
    maxLevel,
    maxed,
    attack,
    defense,
    hp,
    totalPower: attack + defense + hp,
    protected: isCardProtected(playerCard),
    imageUrl: getCardImageUrl(card),
    fodderXp: getFodderXp(item),
  };
}

function RarityBadge({ item, className = '' }) {
  return <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${item.rarityStyle} ${className}`}>{item.rarityLabel}</span>;
}

function StatLine({ item, compact = false }) {
  const textSize = compact ? 'text-[11px]' : 'text-xs';
  return (
    <div className={`flex flex-wrap items-center gap-2 ${textSize} font-bold`}>
      <span className="inline-flex items-center gap-1 text-red-400"><Sword className="h-3 w-3" />{item.attack}</span>
      <span className="inline-flex items-center gap-1 text-blue-400"><Shield className="h-3 w-3" />{item.defense}</span>
      <span className="inline-flex items-center gap-1 text-green-400"><Heart className="h-3 w-3" />{item.hp}</span>
    </div>
  );
}

function CardThumb({ item }) {
  return (
    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/50">
      {item.imageUrl ? <img src={item.imageUrl} alt={item.displayName} className="h-full w-full object-cover object-top" /> : <div className="flex h-full w-full items-center justify-center bg-muted text-lg">?</div>}
      {item.protected && <div className="absolute right-1 top-1 rounded-md bg-black/75 p-0.5"><Lock className="h-3 w-3 text-primary" /></div>}
    </div>
  );
}

function CardRow({ item, rightSlot = null, onClick, disabled = false, selected = false, detail = null }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`w-full rounded-2xl border p-3 text-left transition-all ${selected ? 'border-primary/70 bg-primary/15 shadow-[0_0_20px_rgba(250,189,50,0.16)]' : 'border-border bg-background/45 hover:border-primary/35 hover:bg-primary/10'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`}>
      <div className="flex items-center gap-3">
        <CardThumb item={item} />
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="min-w-0 truncate font-display text-base font-black text-foreground">{item.displayName}</p>
            <RarityBadge item={item} />
          </div>
          <p className="mt-1 text-xs font-semibold text-muted-foreground">Lv.{Number(item.playerCard?.level || 1)} · {item.stageLabel}{item.lineLabel && item.lineLabel !== item.displayName ? ` · ${item.lineLabel}` : ''}</p>
          <div className="mt-1"><StatLine item={item} compact /></div>
          {detail && <div className="mt-2">{detail}</div>}
        </div>
        {rightSlot && <div className="shrink-0">{rightSlot}</div>}
      </div>
    </button>
  );
}

function TargetSummary({ item, title = 'Selected Card' }) {
  if (!item) return null;
  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary">{title}</p>
          <h3 className="mt-1 font-display text-2xl font-black text-primary">{item.displayName}</h3>
        </div>
        <RarityBadge item={item} />
      </div>
      <div className="flex items-center gap-3">
        <CardThumb item={item} />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-muted-foreground">Lv.{Number(item.playerCard?.level || 1)} / {item.maxLevel} · {item.stageLabel}</p>
          <div className="mt-2"><StatLine item={item} /></div>
        </div>
      </div>
    </div>
  );
}

function FilterBar({ search, setSearch, lineFilter, setLineFilter, rarityFilter, setRarityFilter, sort, setSort, lineOptions, rarityOptions }) {
  return (
    <div className="rounded-2xl border border-border bg-background/45 p-3">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <label className="relative md:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search card name..." className="h-11 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary/60" />
        </label>
        <label className="relative">
          <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select value={lineFilter} onChange={(event) => setLineFilter(event.target.value)} className="h-11 w-full appearance-none rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none transition focus:border-primary/60">
            <option value="all">All Card Lines</option>
            {lineOptions.map((line) => <option key={line.key} value={line.key}>{line.label}</option>)}
          </select>
        </label>
        <select value={rarityFilter} onChange={(event) => setRarityFilter(event.target.value)} className="h-11 w-full rounded-xl border border-border bg-card px-3 text-sm outline-none transition focus:border-primary/60">
          <option value="all">All Rarity</option>
          {rarityOptions.map((rarity) => <option key={rarity.key} value={rarity.key}>{rarity.label}</option>)}
        </select>
      </div>
      <div className="mt-3">
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="h-10 w-full rounded-xl border border-border bg-card px-3 text-xs font-bold outline-none transition focus:border-primary/60 md:w-auto">
          <option value="total_desc">Best Power</option>
          <option value="level_desc">Highest Level</option>
          <option value="rarity_asc">Rarity A-Z</option>
          <option value="name_asc">Name A-Z</option>
          <option value="evolution_asc">Core Form Low-High</option>
          <option value="evolution_desc">Core Form High-Low</option>
        </select>
      </div>
    </div>
  );
}

function useFilteredCards(items, defaultSort = 'total_desc') {
  const [search, setSearch] = useState('');
  const [lineFilter, setLineFilter] = useState('all');
  const [rarityFilter, setRarityFilter] = useState('all');
  const [sort, setSort] = useState(defaultSort);

  const lineOptions = useMemo(() => {
    const map = new Map();
    items.forEach((item) => { if (item.lineKey) map.set(item.lineKey, item.lineLabel || item.displayName); });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const rarityOptions = useMemo(() => {
    const map = new Map();
    items.forEach((item) => { const key = normalizeKey(item.rarityLabel); map.set(key, item.rarityLabel); });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [items]);

  const filtered = useMemo(() => {
    const searchText = normalizeText(search);
    const result = items.filter((item) => {
      const matchesSearch = !searchText || normalizeText(`${item.displayName} ${item.lineLabel} ${item.rarityLabel} ${item.stageLabel}`).includes(searchText);
      const matchesLine = lineFilter === 'all' || item.lineKey === lineFilter;
      const matchesRarity = rarityFilter === 'all' || normalizeKey(item.rarityLabel) === rarityFilter;
      return matchesSearch && matchesLine && matchesRarity;
    });
    result.sort((a, b) => {
      if (sort === 'level_desc') return Number(b.playerCard?.level || 1) - Number(a.playerCard?.level || 1);
      if (sort === 'rarity_asc') return a.rarityLabel.localeCompare(b.rarityLabel);
      if (sort === 'name_asc') return a.displayName.localeCompare(b.displayName);
      if (sort === 'evolution_asc') return a.stageCount - b.stageCount || a.displayName.localeCompare(b.displayName);
      if (sort === 'evolution_desc') return b.stageCount - a.stageCount || a.displayName.localeCompare(b.displayName);
      return b.totalPower - a.totalPower;
    });
    return result;
  }, [items, search, lineFilter, rarityFilter, sort]);

  return { search, setSearch, lineFilter, setLineFilter, rarityFilter, setRarityFilter, sort, setSort, lineOptions, rarityOptions, filtered };
}

function EnhanceCardPicker({ enrichedCards, onSelect, title, subtitle, defaultSort = 'total_desc', mode = 'enhance' }) {
  const filters = useFilteredCards(enrichedCards, defaultSort);
  return (
    <div className="space-y-4">
      <div><h3 className="font-display text-2xl font-black text-primary">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>
      <FilterBar {...filters} />
      <div className="grid gap-3">
        {filters.filtered.map((item) => {
          const disabled = (mode === 'enhance' && item.maxed) || (mode === 'evolve' && isFinalForm(item.playerCard, item.card)) || (mode === 'skill' && item.skillMaxed);
          return <CardRow key={item.playerCard.id} item={item} disabled={disabled} onClick={() => onSelect(item)} rightSlot={<div className="text-right">{disabled ? <span className="rounded-full border border-white/10 bg-muted px-2 py-1 text-[10px] font-black text-muted-foreground">{mode === 'skill' ? 'MAX' : 'LOCKED'}</span> : <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-1 text-[10px] font-black text-primary">Select</span>}</div>} />;
        })}
        {filters.filtered.length === 0 && <div className="rounded-2xl border border-border bg-background/45 p-8 text-center text-sm text-muted-foreground">No cards match these filters.</div>}
      </div>
    </div>
  );
}

function FodderPicker({ target, enrichedCards, onConfirm, onBack, disabled }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const materialPool = useMemo(() => enrichedCards.filter((item) => item.playerCard.id !== target.playerCard.id), [enrichedCards, target]);
  const filters = useFilteredCards(materialPool, 'rarity_asc');
  const selectedItems = useMemo(() => materialPool.filter((item) => selectedIds.includes(item.playerCard.id)), [materialPool, selectedIds]);
  const totalXp = selectedItems.reduce((sum, item) => sum + item.fodderXp, 0);

  const toggleCard = (item) => {
    if (disabled || item.protected) return;
    setSelectedIds((current) => {
      if (current.includes(item.playerCard.id)) return current.filter((id) => id !== item.playerCard.id);
      if (current.length >= MAX_FODDER_SELECTION) { toast.error(`You can select up to ${MAX_FODDER_SELECTION} material cards.`); return current; }
      return [...current, item.playerCard.id];
    });
  };

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-60"><ArrowLeft className="h-4 w-4" />Back</button>
      <TargetSummary item={target} title="Enhance Target" />
      <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.25em] text-yellow-300">Material Selection</p><p className="mt-1 text-sm text-muted-foreground">Choose cards to consume. Names and rarity are shown before you confirm.</p></div><div className="text-right"><p className="font-display text-2xl font-black text-yellow-200">{selectedIds.length}/{MAX_FODDER_SELECTION}</p><p className="text-xs text-muted-foreground">+{totalXp.toLocaleString()} XP</p></div></div></div>
      <FilterBar {...filters} />
      <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
        {filters.filtered.map((item) => {
          const selected = selectedIds.includes(item.playerCard.id);
          return <CardRow key={item.playerCard.id} item={item} selected={selected} disabled={disabled || item.protected} onClick={() => toggleCard(item)} detail={item.protected ? <p className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-black text-primary"><Lock className="h-3 w-3" />Protected</p> : null} rightSlot={<div className="flex items-center gap-3"><div className="text-right"><p className="inline-flex items-center gap-1 font-display text-lg font-black text-yellow-300"><Zap className="h-4 w-4" />+{item.fodderXp}</p><p className="text-[10px] text-muted-foreground">XP</p></div><div className={`flex h-8 w-8 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60 bg-background'}`}>{selected && <CheckCircle2 className="h-5 w-5" />}</div></div>} />;
        })}
        {filters.filtered.length === 0 && <div className="rounded-2xl border border-border bg-background/45 p-8 text-center text-sm text-muted-foreground">No eligible material cards match these filters.</div>}
      </div>
      <button type="button" onClick={() => onConfirm(selectedIds, totalXp)} disabled={disabled || selectedIds.length === 0} className="w-full rounded-2xl bg-gradient-to-r from-primary to-yellow-400 px-4 py-4 font-display text-xl font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400">{disabled ? 'Enhancing...' : selectedIds.length === 0 ? `Select Material for ${target.displayName}` : `Enhance ${target.displayName} (+${totalXp.toLocaleString()} XP)`}</button>
    </div>
  );
}

function EvolvePanel({ target, enrichedCards, onEvolve, onBack, disabled }) {
  const [selectedId, setSelectedId] = useState('');
  const validMaterials = useMemo(() => enrichedCards.filter((item) => isValidEvolutionMaterial(target.playerCard, target.card, item.playerCard, item.card)), [enrichedCards, target]);
  const filters = useFilteredCards(validMaterials, 'evolution_asc');
  const selectedItem = validMaterials.find((item) => item.playerCard.id === selectedId);
  const currentStageCount = target.stageCount;
  const currentStage = getNextEvolutionStage(currentStageCount);
  const nextStage = getNextEvolutionStage(Math.min(currentStageCount + 1, MAX_EVOLVES));

  return (
    <div className="space-y-4">
      <button type="button" onClick={onBack} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-60"><ArrowLeft className="h-4 w-4" />Back</button>
      <TargetSummary item={target} title="Evolution Target" />
      <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4"><div className="grid gap-3 md:grid-cols-3"><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Current Form</p><p className="mt-1 font-display text-xl font-black text-foreground">{formatStageLabel(currentStage)}</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Next Form</p><p className="mt-1 font-display text-xl font-black text-primary">{formatStageLabel(nextStage)}</p></div><div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Stat Inheritance</p><p className="mt-1 font-display text-xl font-black text-yellow-200">{Math.round(getEvolutionRate(currentStageCount + 1) * 100)}%</p></div></div><p className="mt-3 text-sm text-muted-foreground">Consume a same-line card. The material name and rarity are shown here before it is used.</p></div>
      <FilterBar {...filters} />
      <div className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
        {filters.filtered.map((item) => {
          const selected = selectedId === item.playerCard.id;
          return <CardRow key={item.playerCard.id} item={item} selected={selected} disabled={disabled} onClick={() => setSelectedId(item.playerCard.id)} rightSlot={<div className={`flex h-8 w-8 items-center justify-center rounded-full border ${selected ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/60 bg-background'}`}>{selected && <CheckCircle2 className="h-5 w-5" />}</div>} />;
        })}
        {filters.filtered.length === 0 && <div className="rounded-2xl border border-border bg-background/45 p-8 text-center text-sm text-muted-foreground">No eligible same-line evolution material found.</div>}
      </div>
      {selectedItem && <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4"><p className="font-black text-destructive">Material to consume</p><p className="mt-1 text-sm text-muted-foreground">{selectedItem.displayName} · {selectedItem.rarityLabel} · Lv.{Number(selectedItem.playerCard?.level || 1)} · {selectedItem.stageLabel}</p></div>}
      <button type="button" onClick={() => onEvolve(selectedId)} disabled={disabled || !selectedId} className="w-full rounded-2xl bg-gradient-to-r from-primary to-yellow-400 px-4 py-4 font-display text-xl font-black text-black transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400">{disabled ? 'Evolving...' : selectedId ? `Evolve ${target.displayName}` : 'Select Evolution Material'}</button>
    </div>
  );
}

function SkillUpPanel({ target, skillShards, onUpgrade, onBack, disabled }) {
  const card = target?.card;
  const playerCard = target?.playerCard;
  const skillName = card?.skill_name || 'Unknown Skill';
  const currentSkillLevel = getSkillLevel(playerCard);
  const nextSkillLevel = Math.min(currentSkillLevel + 1, SKILL_MAX_LEVEL);
  const shardCost = getSkillShardCost(currentSkillLevel);
  const maxed = currentSkillLevel >= SKILL_MAX_LEVEL;
  const canAfford = Number(skillShards || 0) >= shardCost;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-4">
      <button type="button" onClick={onBack} disabled={disabled} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-bold text-muted-foreground transition hover:text-foreground disabled:opacity-60"><ArrowLeft className="h-4 w-4" />Back</button>
      <TargetSummary item={target} title="Skill Target" />
      <div><p className="text-xs font-bold uppercase tracking-widest text-blue-300">Skill Upgrade</p><h2 className="mt-1 font-display text-xl font-black">{target?.displayName || 'Selected Card'}</h2><p className="mt-1 text-sm text-muted-foreground">{skillName}</p></div>
      <div className="grid grid-cols-2 gap-3"><div className="rounded-xl border border-blue-400/30 bg-blue-400/10 p-3"><p className="text-[10px] uppercase tracking-widest text-blue-300">Current Skill</p><p className="mt-1 text-2xl font-black">Lv.{currentSkillLevel}</p></div><div className="rounded-xl border border-primary/30 bg-primary/10 p-3"><p className="text-[10px] uppercase tracking-widest text-primary">After Upgrade</p><p className="mt-1 text-2xl font-black">Lv.{nextSkillLevel}</p></div></div>
      <div className="rounded-xl border border-yellow-400/30 bg-yellow-400/10 p-3"><div className="flex items-center justify-between gap-3"><p className="text-xs font-black text-yellow-300">Skill Shard Cost</p><p className="text-lg font-black text-yellow-200">{maxed ? 'MAX' : shardCost}</p></div><p className="mt-1 text-[11px] text-muted-foreground">You own {Number(skillShards || 0).toLocaleString()} Skill Shards. Cost is current skill level × {SKILL_SHARD_COST_MULTIPLIER}.</p></div>
      {maxed && <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-3 text-sm text-green-200">This skill is already at the maximum level.</div>}
      {!maxed && !canAfford && <div className="rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">Not enough Skill Shards. You need {shardCost}, but only have {Number(skillShards || 0).toLocaleString()}.</div>}
      <button type="button" onClick={onUpgrade} disabled={disabled || maxed || !canAfford} className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-cyan-600 px-4 py-4 font-black text-white hover:from-blue-500 hover:to-cyan-500 disabled:cursor-not-allowed disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400">{disabled ? 'Upgrading...' : maxed ? 'Skill Maxed' : `Upgrade Skill - ${shardCost} Skill Shards`}</button>
    </div>
  );
}

export default function Enhance() {
  const { data: cards = [] } = useCards();
  const { data: playerCards = [] } = usePlayerCards();
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const [step, setStep] = useState('pick');
  const [selectedTarget, setSelectedTarget] = useState(null);
  const [tab, setTab] = useState('enhance');
  const [processing, setProcessing] = useState(false);
  const [skillShards, setSkillShards] = useState(0);

  useEffect(() => { loadItemBalances(); }, []);

  async function loadItemBalances() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) { setSkillShards(0); return; }
      const { data, error } = await supabase.from('player_items').select('item_key, quantity').eq('user_id', user.id).eq('item_key', 'skill_shard');
      if (error) throw error;
      setSkillShards(Number(data?.[0]?.quantity || 0));
    } catch (error) { console.error(error); setSkillShards(0); }
  }

  const enrichedCards = useMemo(() => playerCards.map((pc) => { const card = cards.find((c) => c.id === pc.card_id); return card ? buildDisplayItem({ card, playerCard: pc }) : null; }).filter(Boolean), [cards, playerCards]);
  const capacity = profile ? cardCapacity(profile.level || 1) : 50;
  const atCapacity = playerCards.length >= capacity;
  const resetFlow = () => { setStep('pick'); setSelectedTarget(null); };

  const handleEnhanceConfirm = async (fodderIds, totalXpGain) => {
    if (!selectedTarget) return;
    const { card, playerCard, displayName } = selectedTarget;
    const maxLevel = getCardMaxLevel(playerCard, card);
    const currentLevel = playerCard.level || 1;
    if (currentLevel >= maxLevel) { toast.error(`${displayName} is already MAX level (${maxLevel})`); return; }
    if (!fodderIds || fodderIds.length === 0) { toast.error('Select at least one material card'); return; }
    if (fodderIds.includes(playerCard.id)) { toast.error('You cannot sacrifice the target card'); return; }
    const protectedFodder = enrichedCards.filter((item) => fodderIds.includes(item.playerCard.id) && isCardProtected(item.playerCard));
    if (protectedFodder.length > 0) { toast.error('Protected cards cannot be used as enhancement material.'); return; }
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      let newXp = (playerCard.experience || 0) + totalXpGain;
      let newLevel = currentLevel;
      while (newLevel < maxLevel && newXp >= xpToNextLevel(newLevel)) { newXp -= xpToNextLevel(newLevel); newLevel += 1; }
      if (newLevel >= maxLevel) { newLevel = maxLevel; newXp = 0; }
      const levelsGained = newLevel - currentLevel;
      const enhancedStats = buildEnhanceStats({ card, playerCard, newLevel, levelsGained });
      const stageBaseAttack = playerCard.stage_base_attack ?? card.base_attack ?? enhancedStats.attack;
      const stageBaseDefense = playerCard.stage_base_defense ?? card.base_defense ?? enhancedStats.defense;
      const stageBaseHp = playerCard.stage_base_hp ?? card.base_hp ?? enhancedStats.hp;
      const updatePayload = { level: newLevel, experience: newXp, attack: enhancedStats.attack, defense: enhancedStats.defense, hp: enhancedStats.hp, max_hp: enhancedStats.max_hp, stage_base_attack: stageBaseAttack, stage_base_defense: stageBaseDefense, stage_base_hp: stageBaseHp, updated_at: now };
      const { data: updatedRows, error: updateError } = await supabase.from('player_cards').update(updatePayload).eq('id', playerCard.id).select();
      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) throw new Error('No player card was updated. Check RLS or card ownership.');
      const { data: deletedRows, error: deleteError } = await supabase.from('player_cards').delete().in('id', fodderIds).select('id');
      if (deleteError) throw deleteError;
      if (!deletedRows || deletedRows.length !== fodderIds.length) throw new Error('Some material cards were not consumed. Check RLS or card ownership.');
      queryClient.invalidateQueries({ queryKey: ['playerCards'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['playerItems'] });
      let msg = `${displayName} gained ${totalXpGain} XP!`;
      if (newLevel >= maxLevel) msg = `${displayName} reached MAX Lv.${maxLevel}!`;
      else if (levelsGained > 0) msg = `${displayName} reached Lv.${newLevel}!`;
      toast.success(`✨ ${msg}`);
      resetFlow();
    } catch (error) { console.error(error); toast.error(error.message || 'Could not enhance card'); }
    finally { setProcessing(false); }
  };

  const handleEvolve = async (consumedPcId) => {
    if (!selectedTarget) return;
    const { card, playerCard, displayName } = selectedTarget;
    if (!consumedPcId) { toast.error('Select a card to consume'); return; }
    if (consumedPcId === playerCard.id) { toast.error('You cannot consume the target card'); return; }
    if (isFinalForm(playerCard, card)) { toast.error(`${displayName} is already Final Form`); return; }
    const consumedItem = enrichedCards.find((item) => item.playerCard.id === consumedPcId);
    if (!consumedItem) { toast.error('Could not find selected evolution material'); return; }
    const consumedPlayerCard = consumedItem.playerCard;
    const consumedCard = consumedItem.card;
    if (isCardProtected(consumedPlayerCard)) { toast.error('Protected cards cannot be consumed for evolution.'); return; }
    if (!isValidEvolutionMaterial(playerCard, card, consumedPlayerCard, consumedCard)) { toast.error('Selected card is not valid evolution material'); return; }
    setProcessing(true);
    try {
      const now = new Date().toISOString();
      const currentStageCount = getOwnedCardStageCount(playerCard, card);
      const currentStage = getNextEvolutionStage(currentStageCount);
      const currentStageLabel = formatStageLabel(currentStage);
      const consumedStageCount = getOwnedCardStageCount(consumedPlayerCard, consumedCard);
      const consumedStage = getNextEvolutionStage(consumedStageCount);
      const consumedStageLabel = formatStageLabel(consumedStage);
      const newEvolveCount = getNextEvolveCountFromTarget(playerCard, card);
      const nextStage = getNextEvolutionStage(newEvolveCount);
      const nextStageLabel = formatStageLabel(nextStage);
      const rate = getEvolutionRate(newEvolveCount);
      const nextMasterCard = findNextStageCard({ cards, currentCard: card, nextStage });
      if (!nextMasterCard) console.warn('Missing next-stage master card row:', { currentCard: card, nextStage, currentLine: getCardLineKey(card), availableSameLineCards: cards.filter((candidate) => getCardLineKey(candidate) === getCardLineKey(card)) });
      const previousStageBaseAttack = getStageBaseStat(playerCard, card, 'attack');
      const previousStageBaseDefense = getStageBaseStat(playerCard, card, 'defense');
      const previousStageBaseHp = getStageBaseStat(playerCard, card, 'hp');
      const targetAttack = getCurrentStat(playerCard, card, 'attack');
      const targetDefense = getCurrentStat(playerCard, card, 'defense');
      const targetHp = getCurrentStat(playerCard, card, 'hp');
      const consumedAttack = getCurrentStat(consumedPlayerCard, consumedCard, 'attack');
      const consumedDefense = getCurrentStat(consumedPlayerCard, consumedCard, 'defense');
      const consumedHp = getCurrentStat(consumedPlayerCard, consumedCard, 'hp');
      const newStageBaseAttack = calculateEvolvedStat({ previousStageBase: previousStageBaseAttack, targetCurrent: targetAttack, consumedCurrent: consumedAttack, rate });
      const newStageBaseDefense = calculateEvolvedStat({ previousStageBase: previousStageBaseDefense, targetCurrent: targetDefense, consumedCurrent: consumedDefense, rate });
      const newStageBaseHp = calculateEvolvedStat({ previousStageBase: previousStageBaseHp, targetCurrent: targetHp, consumedCurrent: consumedHp, rate });
      const inheritedAttackGain = Math.max(0, newStageBaseAttack - previousStageBaseAttack);
      const inheritedDefenseGain = Math.max(0, newStageBaseDefense - previousStageBaseDefense);
      const inheritedHpGain = Math.max(0, newStageBaseHp - previousStageBaseHp);
      const updatePayload = { evolved: true, evolve_count: newEvolveCount, evolution_stage: nextStage, stage_base_attack: newStageBaseAttack, stage_base_defense: newStageBaseDefense, stage_base_hp: newStageBaseHp, attack: newStageBaseAttack, defense: newStageBaseDefense, hp: newStageBaseHp, max_hp: newStageBaseHp, inherited_attack: (playerCard.inherited_attack || 0) + inheritedAttackGain, inherited_defense: (playerCard.inherited_defense || 0) + inheritedDefenseGain, inherited_hp: (playerCard.inherited_hp || 0) + inheritedHpGain, level: 1, experience: 0, updated_at: now };
      if (nextMasterCard?.id) updatePayload.card_id = nextMasterCard.id;
      const { data: updatedRows, error: updateError } = await supabase.from('player_cards').update(updatePayload).eq('id', playerCard.id).select();
      if (updateError) throw updateError;
      if (!updatedRows || updatedRows.length === 0) throw new Error('No player card was updated. Check RLS or card ownership.');
      const { error: deleteError } = await supabase.from('player_cards').delete().eq('id', consumedPcId);
      if (deleteError) throw deleteError;
      queryClient.invalidateQueries({ queryKey: ['playerCards'] });
      const nextName = getDisplayName(nextMasterCard || card);
      const artNote = nextMasterCard?.id ? '' : ' Artwork row was not found, so art stayed the same for now.';
      toast.success(`🌟 ${nextName || displayName} evolved to ${nextStageLabel}! ${currentStageLabel} + ${consumedStageLabel} → ${nextStageLabel}. New base: ${newStageBaseAttack} ATK / ${newStageBaseDefense} DEF / ${newStageBaseHp} HP.${artNote}`);
      resetFlow();
    } catch (error) { console.error(error); toast.error(error.message || 'Could not evolve card'); }
    finally { setProcessing(false); }
  };

  const handleSkillUpgrade = async () => {
    if (!selectedTarget) return;
    const { card, playerCard, displayName } = selectedTarget;
    if (!hasCardSkill(card)) { toast.error('This card does not have a skill to upgrade.'); return; }
    const currentSkillLevel = getSkillLevel(playerCard);
    if (currentSkillLevel >= SKILL_MAX_LEVEL) { toast.error(`${displayName}'s skill is already Lv.${SKILL_MAX_LEVEL}.`); return; }
    const shardCost = getSkillShardCost(currentSkillLevel);
    if (skillShards < shardCost) { toast.error(`Not enough Skill Shards. Need ${shardCost}, you have ${skillShards}.`); return; }
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc('upgrade_card_skill_with_shards', { p_player_card_id: playerCard.id });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['playerCards'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['playerItems'] });
      setSkillShards(Number(data?.skill_shards_remaining || 0));
      toast.success(`🔷 ${displayName}'s ${data?.skill_name || card.skill_name} upgraded to Lv.${data?.new_skill_level || currentSkillLevel + 1}! Spent ${data?.skill_shards_spent || shardCost} Skill Shards.`);
      await loadItemBalances();
      resetFlow();
    } catch (error) { console.error(error); toast.error(error.message || 'Could not upgrade skill'); }
    finally { setProcessing(false); }
  };

  const handleSelectTarget = (item, mode) => {
    if (processing) return;
    if (mode === 'enhance' && isCardMaxed(item.playerCard, item.card)) { toast.error(`${item.displayName} is already MAX level (${getCardMaxLevel(item.playerCard, item.card)})`); return; }
    if (mode === 'evolve' && isFinalForm(item.playerCard, item.card)) { toast.error(`${item.displayName} is already Final Form`); return; }
    if (mode === 'skill') {
      if (!hasCardSkill(item.card)) { toast.error('This card does not have a skill to upgrade.'); return; }
      if (isSkillMaxed(item.playerCard)) { toast.error(`${item.displayName}'s skill is already Lv.${SKILL_MAX_LEVEL}.`); return; }
      setSelectedTarget(item); setStep('skill'); return;
    }
    setSelectedTarget(item); setStep(mode === 'evolve' ? 'evolve' : 'fodder');
  };

  const consumableCardsForPicker = useMemo(() => enrichedCards.filter((item) => !isCardProtected(item.playerCard)), [enrichedCards]);
  const skillCardsForPicker = useMemo(() => enrichedCards.filter((item) => hasCardSkill(item.card)).map((item) => { const skillLevel = getSkillLevel(item.playerCard); const skillMaxed = skillLevel >= SKILL_MAX_LEVEL; return { ...item, skillLevel, skillMaxed, skillShardCost: getSkillShardCost(skillLevel) }; }), [enrichedCards]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background pb-24">
      <div className="pointer-events-none absolute inset-0 opacity-80"><div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" /><div className="absolute -right-24 top-40 h-96 w-96 rounded-full bg-purple-700/20 blur-3xl" /><div className="absolute bottom-0 left-1/3 h-[520px] w-[520px] rounded-full bg-yellow-500/10 blur-3xl" /></div>
      <div className="relative mx-auto max-w-7xl space-y-6 p-4 md:p-6">
        <section className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card shadow-2xl">
          <img src="https://media.base44.com/images/public/69e667952dab314dabbd3859/2b48825a0_generated_image.png" alt="" className="absolute inset-0 h-full w-full object-cover object-center opacity-30" />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" /><div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
          <div className="relative p-6 md:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.3em] text-primary"><Sparkles className="h-4 w-4" />Card Forge</div><h1 className="text-glow-gold mt-3 font-display text-4xl font-black text-primary md:text-6xl">ENHANCE</h1><p className="mt-3 max-w-3xl text-muted-foreground">Level cards, evolve Core Forms, and upgrade skills while clearly showing the name and rarity of every card before it is consumed.</p></div><div className="grid grid-cols-3 gap-3 lg:min-w-[360px]"><div className="rounded-2xl border border-border bg-card/80 p-3"><div className="text-xs text-muted-foreground">Card Slots</div><p className="mt-1 font-display text-xl font-black">{playerCards.length}/{capacity}</p></div><div className="rounded-2xl border border-border bg-card/80 p-3"><div className="text-xs text-muted-foreground">Skill Shards</div><p className="mt-1 font-display text-xl font-black text-blue-200">{Number(skillShards || 0).toLocaleString()}</p></div><div className="rounded-2xl border border-border bg-card/80 p-3"><div className="text-xs text-muted-foreground">Mode</div><p className="mt-1 font-display text-xl font-black capitalize text-primary">{tab}</p></div></div></div></div>
        </section>
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <aside className="space-y-6 xl:col-span-4">
            {profile && <section className={`overflow-hidden rounded-3xl border shadow-2xl ${atCapacity ? 'border-destructive/50 bg-destructive/10' : 'border-primary/20 bg-card/90'}`}><div className="border-b border-border bg-primary/5 p-5"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary"><Sparkles className="h-4 w-4" />Capacity</div><h2 className="mt-2 font-display text-2xl font-black text-primary">Card Slots</h2></div><div className="p-5"><div className="mb-2 flex justify-between text-xs"><span className="text-muted-foreground">Owned Cards</span><span className={`font-bold ${atCapacity ? 'text-destructive' : 'text-foreground'}`}>{playerCards.length} / {capacity}</span></div><div className="h-3 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full transition-all ${atCapacity ? 'bg-destructive' : 'bg-gradient-to-r from-primary to-purple-400'}`} style={{ width: `${Math.min(100, (playerCards.length / capacity) * 100)}%` }} /></div><p className="mt-3 text-xs text-muted-foreground">Level up to increase your card capacity +10 per level.</p>{atCapacity && <div className="mt-4 flex gap-2 rounded-2xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-5 w-5 shrink-0" />Your card storage is full.</div>}</div></section>}
            <section className="overflow-hidden rounded-3xl border border-blue-400/30 bg-blue-400/10 shadow-2xl"><div className="p-5"><div className="flex items-center justify-between gap-3"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.25em] text-blue-300"><Sparkles className="h-4 w-4" />Skill Shards</p><p className="text-xl font-black text-blue-200">{Number(skillShards || 0).toLocaleString()}</p></div><p className="mt-3 text-sm leading-relaxed text-muted-foreground">Skill upgrades cost current skill level × {SKILL_SHARD_COST_MULTIPLIER} Skill Shards. Skill upgrades are guaranteed during Beta.</p></div></section>
            <section className="overflow-hidden rounded-3xl border border-primary/20 bg-card/90 shadow-2xl"><div className="border-b border-border bg-primary/5 p-5"><p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Progression Rules</p><h2 className="mt-2 font-display text-2xl font-black text-primary">Core Forms</h2></div><div className="space-y-4 p-5"><div className="rounded-2xl border border-border bg-background/50 p-4"><p className="text-xs font-bold text-primary">Enhancement Caps</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Base, Base+, and Base++ cards max at Lv.{BASE_MAX_LEVEL}. Final Form cards max at Lv.{FINAL_FORM_MAX_LEVEL}.</p></div><div className="rounded-2xl border border-primary/30 bg-primary/10 p-4"><p className="text-xs font-bold text-primary">Target-Driven Evolution</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">The selected target always evolves one form forward. Consumed same-line cards contribute stats only. Base becomes Base+, Base+ becomes Base++, and Base++ becomes Final Form.</p></div><div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 p-4"><p className="text-xs font-bold text-yellow-300">Consume Safety</p><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Material rows now display card name, rarity, level, form, stats, and XP value before anything is consumed.</p></div></div></section>
          </aside>
          <main className="xl:col-span-8"><section className="overflow-hidden rounded-3xl border border-primary/20 bg-card/90 shadow-2xl"><div className="border-b border-border bg-primary/5 p-5 md:p-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-primary"><Sparkles className="h-4 w-4" />Forge Actions</div><h2 className="mt-2 font-display text-2xl font-black text-primary md:text-3xl">Choose Upgrade Path</h2><p className="mt-2 text-sm text-muted-foreground">Pick a card, then choose the material or upgrade path.</p></div></div></div><div className="p-5 md:p-6"><AnimatePresence mode="wait">{step === 'pick' && <motion.div key="pick" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><Tabs value={tab} onValueChange={setTab}><TabsList className="mb-5 w-full border border-border bg-background/60"><TabsTrigger value="enhance" className="flex-1">⚡ Enhance</TabsTrigger><TabsTrigger value="evolve" className="flex-1">🌟 Evolve</TabsTrigger><TabsTrigger value="skill" className="flex-1">🔷 Skill</TabsTrigger></TabsList><TabsContent value="enhance"><EnhanceCardPicker enrichedCards={enrichedCards} onSelect={(item) => handleSelectTarget(item, 'enhance')} title="Choose a Card to Enhance" subtitle="Sort, search, and filter your cards before choosing a target." defaultSort="total_desc" mode="enhance" /></TabsContent><TabsContent value="evolve"><EnhanceCardPicker enrichedCards={enrichedCards} onSelect={(item) => handleSelectTarget(item, 'evolve')} title="Choose a Card to Evolve" subtitle="Select the target card first. It will evolve one stage forward." defaultSort="evolution_asc" mode="evolve" /></TabsContent><TabsContent value="skill"><EnhanceCardPicker enrichedCards={skillCardsForPicker} onSelect={(item) => handleSelectTarget(item, 'skill')} title="Choose a Skill to Upgrade" subtitle="Only cards with skills can use Skill Shards. Skill upgrades are guaranteed during Beta." defaultSort="total_desc" mode="skill" /></TabsContent></Tabs></motion.div>}{step === 'fodder' && selectedTarget && <motion.div key="fodder" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><FodderPicker target={selectedTarget} enrichedCards={consumableCardsForPicker} onConfirm={handleEnhanceConfirm} onBack={resetFlow} disabled={processing} /></motion.div>}{step === 'evolve' && selectedTarget && <motion.div key="evolve" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><EvolvePanel target={selectedTarget} enrichedCards={consumableCardsForPicker} onEvolve={handleEvolve} onBack={resetFlow} disabled={processing} /></motion.div>}{step === 'skill' && selectedTarget && <motion.div key="skill" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}><SkillUpPanel target={selectedTarget} skillShards={skillShards} onUpgrade={handleSkillUpgrade} onBack={resetFlow} disabled={processing} /></motion.div>}</AnimatePresence></div></section></main>
        </div>
      </div>
    </div>
  );
}
