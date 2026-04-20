"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Table as TableIcon, BarChart3, Settings, 
  Fuel, Database, ChevronDown, Loader2 
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { useTable } from "@/context/TableContext";
import { useState } from "react";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { name: "Visão Geral", icon: LayoutDashboard, href: "/" },
  { name: "Tabela de Dados", icon: TableIcon, href: "/dados" },
  { name: "Análises", icon: BarChart3, href: "/analises" },
  { name: "Configurações", icon: Settings, href: "/config" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { 
    selectedDatabase, setSelectedDatabase, availableDatabases, isLoadingDatabases,
    selectedTable, setSelectedTable, availableTables, isLoadingTables 
  } = useTable();
  
  const [isDbOpen, setIsDbOpen] = useState(false);
  const [isTableOpen, setIsTableOpen] = useState(false);

  return (
    <div className="w-64 h-screen glass border-r border-white/10 flex flex-col fixed left-0 top-0 z-50">
      <div className="p-6 flex items-center gap-3 border-b border-white/10">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Fuel className="text-white" size={24} />
        </div>
        <div>
          <h1 className="font-bold text-lg tracking-tight">BI-SEFAZ-CE</h1>
          <p className="text-[10px] text-white/50 uppercase tracking-widest font-semibold">Análise de Dados</p>
        </div>
      </div>
      
      {/* Database Selector */}
      <div className="p-4 px-6 border-b border-white/5">
        <label className="text-[10px] uppercase font-bold text-white/30 tracking-wider mb-2 block">
          Banco de Dados
        </label>
        <div className="relative">
          <button 
            onClick={() => { setIsDbOpen(!isDbOpen); setIsTableOpen(false); }}
            className="w-full glass-hover bg-white/5 border border-white/10 rounded-xl px-4 py-2 flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-2 truncate">
              {isLoadingDatabases ? (
                <Loader2 size={16} className="text-blue-500 animate-spin" />
              ) : (
                <Database size={16} className="text-emerald-500" />
              )}
              <span className="text-sm font-semibold truncate text-white/80">
                {isLoadingDatabases ? "Carregando..." : selectedDatabase}
              </span>
            </div>
            <ChevronDown size={14} className={cn("text-white/30 transition-transform", isDbOpen && "rotate-180")} />
          </button>

          {isDbOpen && !isLoadingDatabases && (
            <div className="absolute top-full left-0 w-full mt-2 glass border-white/10 rounded-xl overflow-hidden shadow-2xl z-50 animate-fade-in">
              <div className="max-h-48 overflow-y-auto py-2">
                {availableDatabases.map((db) => (
                  <button
                    key={db.name}
                    onClick={() => {
                      setSelectedDatabase(db.name);
                      setIsDbOpen(false);
                    }}
                    className={cn(
                      "w-full text-left px-4 py-2 text-sm transition-colors",
                      selectedDatabase === db.name 
                        ? "bg-emerald-600 text-white" 
                        : "text-white/60 hover:text-white hover:bg-white/10"
                    )}
                  >
                    {db.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Static Table Label */}
      <div className="p-4 px-6 border-b border-white/5">
        <label className="text-[10px] uppercase font-bold text-white/30 tracking-wider mb-2 block">
          Tabela Ativa
        </label>
        <div className="flex items-center gap-2 px-1">
          <Database size={16} className="text-blue-500" />
          <span className="text-sm font-bold text-white/90">combustivel</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                  : "text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon size={20} className={cn(isActive ? "text-white" : "group-hover:text-white")} />
              <span className="font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
        <div className="bg-white/5 p-4 rounded-xl border border-white/5">
          <p className="text-xs text-white/40 mb-1">Status da Conexão</p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">Athena Conectado</span>
          </div>
        </div>
      </div>
    </div>
  );
}
