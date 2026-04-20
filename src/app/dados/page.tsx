"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FilterBar } from "@/components/FilterBar";
import { useTable } from "@/context/TableContext";
import { Search, Download, Filter, ChevronLeft, ChevronRight, RefreshCcw, Table as TableIcon, Code, Play, Terminal, Layers } from "lucide-react";

export default function DadosPage() {
  const { selectedTable, selectedDatabase, isLoadingTables } = useTable();
  
  // PINNED SETTINGS
  const PINNED_DATABASE = selectedDatabase || "nfecorp";
  const PINNED_TABLE = selectedTable || "combustivel";

  // Table 1 State (Raw Data)
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error1, setError1] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});

  // Table 2 State (Pinned temp_combustivel)
  const [detailData, setDetailData] = useState<any[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(true);
  const [error2, setError2] = useState<string | null>(null);

  // Custom SQL Editor State
  const [customSql, setCustomSql] = useState(`SELECT * FROM "${selectedDatabase || 'nfecorp'}"."${selectedTable || 'combustivel'}"\nLIMIT 50`);
  const [customData, setCustomData] = useState<any[]>([]);
  const [loadingCustom, setLoadingCustom] = useState(false);
  const [errorCustom, setErrorCustom] = useState<string | null>(null);

  const fetchData = async (currentFilters = filters) => {
    setLoading(true);
    setError1(null);
    try {
      const response = await fetch('/api/athena/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: `SELECT *, date_format(try_cast(dt_emissao as date), '%Y-W%v') as semana_emissao FROM "${PINNED_DATABASE}"."${PINNED_TABLE}" LIMIT 500`,
          database: PINNED_DATABASE,
          filters: currentFilters
        }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setData(result.data || []);
    } catch (err: any) {
      console.error(err);
      setError1(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDetailData = async () => {
    setLoadingDetail(true);
    setError2(null);
    try {
      const sql = `
        SELECT "combustivel"."ano" AS "ano",
          "combustivel"."chave" AS "chave",
          "combustivel"."cod_cfop" AS "cod_cfop",
          "combustivel"."cod_cnpj_emitente" AS "cod_cnpj_emitente",
          "combustivel"."cod_ncm" AS "cod_ncm",
          "combustivel"."dsc_limpa" AS "dsc_limpa",
          "combustivel"."dsc_municipio" AS "dsc_municipio",
          "combustivel"."dsc_original" AS "dsc_original",
          "combustivel"."dsc_razao_social" AS "dsc_razao_social",
          "combustivel"."dt_emissao" AS "dt_emissao",
          "combustivel"."fonte" AS "fonte",
          "combustivel"."qtd_com" AS "qtd_com",
          "combustivel"."semana" AS "semana",
          "combustivel"."tipo_prod" AS "tipo_prod",
          "combustivel"."vlr_prod" AS "vlr_prod",
          "combustivel"."vlr_unit_com" AS "vlr_unit_com",
          date_format(try_cast("combustivel"."dt_emissao" as date), '%Y-W%v') as semana_emissao,
          -- Aggregates using window functions to keep row level detail
          COUNT(*) OVER() as qtd_itens,
          SUM(TRY_CAST("combustivel"."qtd_com" AS DOUBLE)) OVER() as volume,
          (SUM(TRY_CAST("combustivel"."vlr_unit_com" AS DOUBLE)) OVER() / 
           NULLIF(SUM(TRY_CAST("combustivel"."qtd_com" AS DOUBLE)) OVER(), 0)) * 10 as media_ponderada
        FROM "temp_combustivel"."combustivel" "combustivel"
        LIMIT 100
      `;

      const response = await fetch('/api/athena/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql, 
          database: "temp_combustivel" 
        }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setDetailData(result.data || []);
    } catch (err: any) {
      console.error(err);
      setError2(err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const executeCustomSql = async () => {
    if (!customSql.trim()) return;
    setLoadingCustom(true);
    setErrorCustom(null);
    try {
      const response = await fetch('/api/athena/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          sql: customSql, 
          database: PINNED_DATABASE 
        }),
      });
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setCustomData(result.data || []);
    } catch (err: any) {
      console.error(err);
      setErrorCustom(err.message);
    } finally {
      setLoadingCustom(false);
    }
  };

  useEffect(() => {
    if (selectedDatabase && selectedTable) {
      setFilters({});
      fetchData({});
      fetchDetailData();
    }
  }, [selectedDatabase, selectedTable]);

  const handleFilterChange = (newFilters: Record<string, string>) => {
    setFilters(newFilters);
    fetchData(newFilters);
  };

  const handleExportCSV = (tableData: any[], filename: string) => {
    if (!tableData || tableData.length === 0) return;
    
    const headers = Object.keys(tableData[0]).join(";");
    const rows = tableData.map(row => 
      Object.values(row).map(val => `"${String(val).replace(/"/g, '""')}"`).join(";")
    );
    
    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredData = data.filter(row => 
    Object.values(row).some(val => 
      String(val).toLowerCase().includes(search.toLowerCase())
    )
  );

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Exploração de Dados</h2>
            <p className="text-white/50">Pesquisa interativa e tabelas detalhadas do banco `{PINNED_DATABASE}`.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => handleExportCSV(filteredData, `dados_${PINNED_TABLE}`)}
              className="glass px-4 py-2 flex items-center gap-2 hover:bg-white/5 transition-all active:scale-95"
            >
              <Download size={18} />
              <span className="text-sm font-medium">Exportar CSV</span>
            </button>
            <button 
              onClick={() => fetchData()}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
            >
              <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
              <span className="text-sm font-medium">Sincronizar</span>
            </button>
          </div>
        </header>

        {/* SQL Sandbox Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2 text-indigo-400">
              <Terminal size={20} />
              <h3 className="text-xl font-bold tracking-tight">Pesquisa SQL Avançada</h3>
            </div>
            {customData.length > 0 && (
              <button 
                onClick={() => handleExportCSV(customData, "resultado_sql")}
                className="glass px-3 py-1.5 flex items-center gap-2 hover:bg-indigo-500/10 text-indigo-400 transition-all text-xs font-bold border border-indigo-500/20 rounded-lg active:scale-95"
              >
                <Download size={14} />
                Exportar Resultado
              </button>
            )}
          </div>
          
          <div className="glass overflow-hidden flex flex-col xl:flex-row border border-white/10">
            {/* Editor */}
            <div className="xl:w-1/3 border-r border-white/10 flex flex-col bg-black/40">
              <div className="p-3 border-b border-white/10 flex gap-2 items-center bg-white/5">
                <Code size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Editor de Query (Athena)</span>
              </div>
              <textarea 
                value={customSql}
                onChange={(e) => setCustomSql(e.target.value)}
                spellCheck={false}
                className="w-full flex-1 min-h-[200px] bg-transparent text-emerald-400 font-mono text-sm p-4 focus:outline-none resize-none"
              />
              <div className="p-3 border-t border-white/10 bg-white/5">
                <button 
                  onClick={executeCustomSql}
                  disabled={loadingCustom}
                  className="w-full bg-indigo-600 text-white px-4 py-2 flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all rounded shadow disabled:opacity-50"
                >
                  {loadingCustom ? <RefreshCcw size={16} className="animate-spin" /> : <Play size={16} />}
                  <span className="font-bold text-sm">Rodar Query</span>
                </button>
              </div>
            </div>
            {/* Results Table */}
            <div className="xl:w-2/3 flex-1 bg-white/5 min-h-[300px] overflow-hidden flex flex-col">
              <div className="p-3 border-b border-white/10 flex gap-2 items-center">
                <TableIcon size={14} className="text-white/40" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/50">Saída SQL</span>
              </div>
              <div className="flex-1 overflow-auto bg-black/20">
                {errorCustom ? (
                   <div className="p-6 text-red-500 font-mono text-xs whitespace-pre-wrap">{errorCustom}</div>
                ) : customData.length > 0 ? (
                  <table className="w-full text-left">
                    <thead className="bg-white/5 border-b border-white/10 text-white/40 text-[10px] uppercase tracking-wider font-bold">
                      <tr>
                        {Object.keys(customData[0]).map(h => <th key={h} className="px-4 py-3 whitespace-nowrap">{h}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {customData.map((row, i) => (
                        <tr key={i} className="hover:bg-white/5 transition-colors">
                          {Object.values(row).map((val: any, j) => (
                            <td key={j} className="px-4 py-2 text-xs text-white/70 font-mono">{val || '-'}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-12 text-center text-white/30 text-sm font-mono flex flex-col items-center justify-center h-full gap-4">
                    {loadingCustom ? (
                      <RefreshCcw size={24} className="animate-spin opacity-50" />
                    ) : (
                      "Nenhum resultado processado."
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Raw Table */}
        <div className="flex items-center gap-2 text-blue-500 mb-4 px-2">
          <Layers size={20} />
          <h3 className="text-xl font-bold tracking-tight">Tabela Bruta ({PINNED_DATABASE}.{PINNED_TABLE})</h3>
        </div>

        {/* Filter Bar */}
        {data.length > 0 && (
          <FilterBar 
            tableName={PINNED_TABLE} 
            columns={Object.keys(data[0])} 
            onFilterChange={handleFilterChange} 
          />
        )}

        <div className="glass overflow-hidden mb-12">
          <div className="p-4 border-b border-white/10 flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" size={18} />
              <input 
                type="text" 
                placeholder="Pesquisar..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 border-b border-white/10 text-white/40 text-[10px] uppercase tracking-wider font-bold">
                <tr>
                  {data.length > 0 && Object.keys(data[0]).map(header => (
                    <th key={header} className="px-6 py-4 whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan={10} className="px-6 py-6"><div className="h-4 bg-white/5 rounded animate-pulse w-full" /></td>
                    </tr>
                  ))
                ) : error1 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-red-500 bg-red-500/5 font-mono text-xs">
                      {error1}
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((row, i) => (
                    <tr key={i} className="hover:bg-white/5 transition-colors group">
                      {Object.values(row).map((val: any, j) => (
                        <td key={j} className="px-6 py-4 text-sm text-white/70">{val || '-'}</td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center text-white/30 italic">Sem registros no momento.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 2: Precise Query Table */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="flex items-center gap-2 text-emerald-500">
              <TableIcon size={20} />
              <h3 className="text-xl font-bold tracking-tight">Consulta Detalhada (temp_combustivel)</h3>
            </div>
            <button 
              onClick={() => handleExportCSV(detailData, "consulta_detalhada_sefaz")}
              className="glass px-3 py-1.5 flex items-center gap-2 hover:bg-emerald-500/10 text-emerald-500 transition-all text-xs font-bold border border-emerald-500/20 rounded-lg active:scale-95"
            >
              <Download size={14} />
              Exportar CSV Detalhado
            </button>
          </div>
          
          <div className="glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-emerald-500/5 border-b border-white/10 text-white/40 text-[10px] uppercase tracking-wider font-bold">
                  <tr>
                    {detailData.length > 0 && Object.keys(detailData[0]).map(header => (
                      <th key={header} className="px-6 py-4 whitespace-nowrap text-emerald-500/80">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {loadingDetail ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i}><td colSpan={16} className="px-6 py-6"><div className="h-4 bg-white/5 rounded animate-pulse w-full" /></td></tr>
                    ))
                  ) : error2 ? (
                    <tr>
                      <td colSpan={20} className="px-6 py-12 text-center text-red-500 bg-red-500/5 font-mono text-xs">
                        {error2}
                      </td>
                    </tr>
                  ) : detailData.length > 0 ? (
                    detailData.map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        {Object.values(row).map((val: any, j) => (
                          <td key={j} className="px-6 py-4 text-xs text-white/60 font-mono">{val || '-'}</td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={16} className="px-6 py-12 text-center text-white/30 italic">Nenhum dado encontrado para temp_combustivel.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
