"use client";

import { useEffect, useState } from "react";
import { ChevronDown, Filter, X, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FilterBarProps {
  tableName: string;
  columns: string[];
  onFilterChange: (filters: Record<string, string>) => void;
}

export function FilterBar({ tableName, columns, onFilterChange }: FilterBarProps) {
  const [columnValues, setColumnValues] = useState<Record<string, string[]>>({});
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string>>({});
  const [loadingColumns, setLoadingColumns] = useState<Record<string, boolean>>({});
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Fetch unique values for a column
  const fetchUniqueValues = async (column: string) => {
    if (columnValues[column] || loadingColumns[column]) return;
    
    setLoadingColumns(prev => ({ ...prev, [column]: true }));
    try {
      const response = await fetch('/api/athena/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: `SELECT DISTINCT "${column}" FROM "${tableName}" WHERE "${column}" IS NOT NULL LIMIT 50` 
        }),
      });
      const result = await response.json();
      const values = result.data?.map((row: any) => row[column]).filter(Boolean) || [];
      setColumnValues(prev => ({ ...prev, [column]: values }));
    } catch (err) {
      console.error(`Error fetching values for ${column}:`, err);
    } finally {
      setLoadingColumns(prev => ({ ...prev, [column]: false }));
    }
  };

  const handleSelect = (column: string, value: string) => {
    const newFilters = { ...selectedFilters, [column]: value };
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
    setOpenDropdown(null);
  };

  const clearFilter = (column: string) => {
    const newFilters = { ...selectedFilters };
    delete newFilters[column];
    setSelectedFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearAll = () => {
    setSelectedFilters({});
    onFilterChange({});
  };

  // Only show top 5 categorical columns as filters to avoid clutter
  const visibleColumns = columns.slice(0, 5);

  return (
    <div className="flex flex-wrap gap-3 items-center mb-8">
      <div className="flex items-center gap-2 mr-2 text-white/50 text-sm font-medium">
        <Filter size={18} />
        Filtros:
      </div>

      {visibleColumns.map((col) => (
        <div key={col} className="relative">
          <button
            onClick={() => {
              setOpenDropdown(openDropdown === col ? null : col);
              fetchUniqueValues(col);
            }}
            className={cn(
              "px-4 py-2 glass flex items-center gap-2 text-sm transition-all",
              selectedFilters[col] ? "border-blue-500/50 bg-blue-500/10 text-blue-400" : "hover:bg-white/5"
            )}
          >
            <span className="opacity-50">{(col.charAt(0).toUpperCase() + col.slice(1)).replace(/_/g, " ")}:</span>
            <span className="font-semibold">{selectedFilters[col] || "Todos"}</span>
            <ChevronDown size={14} className={cn("transition-transform", openDropdown === col && "rotate-180")} />
          </button>

          {selectedFilters[col] && (
            <button 
              onClick={(e) => { e.stopPropagation(); clearFilter(col); }} 
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-colors shadow-lg"
            >
              <X size={10} strokeWidth={3} />
            </button>
          )}

          {openDropdown === col && (
            <div className="absolute top-full left-0 mt-2 w-56 glass border-white/10 rounded-xl shadow-2xl z-50 animate-fade-in">
              <div className="p-2 max-h-64 overflow-y-auto">
                {loadingColumns[col] ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={20} className="text-blue-500 animate-spin" />
                  </div>
                ) : columnValues[col]?.length > 0 ? (
                  columnValues[col].map(val => (
                    <button
                      key={val}
                      onClick={() => handleSelect(col, val)}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-white/5 transition-colors truncate"
                    >
                      {val}
                    </button>
                  ))
                ) : (
                  <div className="text-center py-4 text-white/30 text-xs">Nenhum valor encontrado</div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}

      {Object.keys(selectedFilters).length > 0 && (
        <button 
          onClick={clearAll}
          className="text-xs font-semibold text-white/30 hover:text-red-400 transition-colors uppercase tracking-wider underline underline-offset-4"
        >
          Limpar Tudo
        </button>
      )}
    </div>
  );
}
