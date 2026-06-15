import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  CARD_SORT_OPTIONS,
  formatStageLabel,
} from '@/utils/cardOrganization';

export default function CardOrganizerControls({
  search,
  setSearch,
  sortBy,
  setSortBy,
  filters,
  setFilters,
  filterOptions,
  compact = false,
}) {
  const safeFilters = {
    rarity: filters?.rarity || 'all',
    faction: filters?.faction || 'all',
    stage: filters?.stage || 'all',
    line: filters?.line || 'all',
  };

  const safeFilterOptions = {
    rarities: filterOptions?.rarities || [],
    factions: filterOptions?.factions || [],
    stages: filterOptions?.stages || [],
    lines: filterOptions?.lines || [],
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-2 rounded-xl border border-border bg-card/70 p-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />

        <Input
          placeholder="Search cards..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-sm"
        />
      </div>

      <div
        className={`grid gap-2 ${
          compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'
        }`}
      >
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          {CARD_SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              Sort: {option.label}
            </option>
          ))}
        </select>

        <select
          value={safeFilters.rarity}
          onChange={(e) => updateFilter('rarity', e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="all">All Rarities</option>
          {safeFilterOptions.rarities.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </select>

        <select
          value={safeFilters.faction}
          onChange={(e) => updateFilter('faction', e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="all">All Factions</option>
          {safeFilterOptions.factions.map((faction) => (
            <option key={faction} value={faction}>
              {faction}
            </option>
          ))}
        </select>

        <select
          value={safeFilters.stage}
          onChange={(e) => updateFilter('stage', e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground"
        >
          <option value="all">All Evolutions</option>
          {safeFilterOptions.stages.map((stage) => (
            <option key={stage} value={stage}>
              {formatStageLabel(stage)}
            </option>
          ))}
        </select>

        <select
          value={safeFilters.line}
          onChange={(e) => updateFilter('line', e.target.value)}
          className="h-9 rounded-md border border-border bg-background px-2 text-xs text-foreground col-span-2 md:col-span-1"
        >
          <option value="all">All Card Lines</option>
          {safeFilterOptions.lines.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
