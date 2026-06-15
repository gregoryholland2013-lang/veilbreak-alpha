import React from 'react';
import { Search } from 'lucide-react';
import { SORT_OPTIONS } from '@/utils/cardOrganization';

export default function CardSortFilterBar({
  search,
  setSearch,
  sortBy,
  setSortBy,
  filters,
  setFilters,
  filterOptions,
  showCardLine = true,
}) {
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/70 p-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search card name, line, or skill..."
          className="w-full rounded-lg border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <select
          value={filters.rarity || 'all'}
          onChange={(e) => updateFilter('rarity', e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Rarities</option>
          {filterOptions.rarities.map((rarity) => (
            <option key={rarity} value={rarity}>
              {rarity}
            </option>
          ))}
        </select>

        <select
          value={filters.faction || 'all'}
          onChange={(e) => updateFilter('faction', e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Factions</option>
          {filterOptions.factions.map((faction) => (
            <option key={faction} value={faction}>
              {faction}
            </option>
          ))}
        </select>

        <select
          value={filters.evolution || 'all'}
          onChange={(e) => updateFilter('evolution', e.target.value)}
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          <option value="all">All Evolutions</option>
          {filterOptions.evolutions.map((evolution) => (
            <option key={evolution} value={evolution}>
              {evolution}
            </option>
          ))}
        </select>

        {showCardLine && (
          <select
            value={filters.cardLine || 'all'}
            onChange={(e) => updateFilter('cardLine', e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="all">All Card Lines</option>
            {filterOptions.cardLines.map((line) => (
              <option key={line} value={line}>
                {line}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}