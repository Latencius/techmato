"use client";

import type { BroadcastMode } from "@techmato/pipeline";

export type ArchiveModeFilter = BroadcastMode | "all";
export type ArchiveFavoriteFilter = "all" | "favorite_only";

type Props = {
  modeFilter: ArchiveModeFilter;
  favoriteFilter: ArchiveFavoriteFilter;
  onModeChange: (value: ArchiveModeFilter) => void;
  onFavoriteChange: (value: ArchiveFavoriteFilter) => void;
};

export function ArchiveFilters({
  modeFilter,
  favoriteFilter,
  onModeChange,
  onFavoriteChange,
}: Props) {
  return (
    <div className="flex flex-col gap-4 border border-[#171717] bg-[#fffaf0] p-4 shadow-[7px_7px_0_#ded4c1]">
      <FilterGroup label="放送尺">
        <FilterButton selected={modeFilter === "all"} onClick={() => onModeChange("all")}>
          すべて
        </FilterButton>
        <FilterButton selected={modeFilter === "short"} onClick={() => onModeChange("short")}>
          1分版
        </FilterButton>
        <FilterButton selected={modeFilter === "long"} onClick={() => onModeChange("long")}>
          5分版
        </FilterButton>
      </FilterGroup>

      <FilterGroup label="お気に入り">
        <FilterButton selected={favoriteFilter === "all"} onClick={() => onFavoriteChange("all")}>
          すべて
        </FilterButton>
        <FilterButton
          selected={favoriteFilter === "favorite_only"}
          onClick={() => onFavoriteChange("favorite_only")}
        >
          お気に入り
        </FilterButton>
      </FilterGroup>
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#756b5e]">{label}</p>
      <div className="inline-flex w-fit border border-[#171717] bg-[#f6f4ef] p-1" role="radiogroup">
        {children}
      </div>
    </div>
  );
}

function FilterButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`min-h-10 px-4 text-sm font-semibold transition ${
        selected ? "bg-[#171717] text-[#fffaf0]" : "text-[#171717] hover:bg-[#efe6d7]"
      }`}
    >
      {children}
    </button>
  );
}
