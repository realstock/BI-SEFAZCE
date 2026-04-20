"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, BarChart, Bar
} from 'recharts';
import { 
  TrendingUp, BarChart3, RefreshCcw, AlertCircle, 
  Calendar, Layers, Info, Fuel, ShoppingCart
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useTable } from "@/context/TableContext";

type AnalysisTab = "valores" | "precos" | "consumo";

export default function AnalisesPage() {
  const { selectedTable, selectedDatabase, isLoadingTables } = useTable();
  const [activeTab, setActiveTab] = useState<AnalysisTab>("valores");
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeMetric, setActiveMetric] = useState("avg_vlr");

  const PINNED_DATABASE = selectedDatabase || "nfecorp";
  const PINNED_TABLE = selectedTable || "combustivel";



  const tabs = [
    { id: "valores", label: "Valores Semanais", icon: BarChart3 },
    { id: "precos", label: "Evolução dos Preços", icon: TrendingUp },
    { id: "consumo", label: "Evolução do Consumo", icon: ShoppingCart },
  ];

  const metrics = {
    valores: [
      { id: "avg_vlr", label: "Média Valor", color: "#3b82f6" },
      { id: "median_vlr", label: "Mediana Valor", color: "#f59e0b" },
      { id: "max_vlr", label: "Máxima Valor", color: "#10b981" },
      { id: "min_vlr", label: "Mínima Valor", color: "#ef4444" },
      { id: "qtd_itens", label: "Qtd Itens", color: "#8b5cf6" },
      { id: "volume_total", label: "Volume Total", color: "#ec4899" },
      { id: "valor_total", label: "Venda Total", color: "#f97316" },
    ],
    precos: [
      { id: "preco_medio", label: "Preço Médio", color: "#3b82f6" },
    ],
    consumo: [
      { id: "volume_total", label: "Consumo Total", color: "#f59e0b" },
      { id: "valor_total", label: "Venda Total (R$)", color: "#8b5cf6" },
    ]
  };

  const fetchAnalysis = async () => {
    if (!selectedDatabase || !selectedTable) return;
    setLoading(true);
    setError(null);
    try {
      let sql = "";
      
      // All queries target "temp_combustivel"."combustivel" explicitly
      if (activeTab === "valores") {
        sql = `
          SELECT 
              date_format(try_cast(dt_emissao as date), '%Y-W%v') as semana_emissao,
              tipo_prod,
              MAX(TRY_CAST(vlr_unit_com AS DOUBLE)) as max_vlr,
              AVG(TRY_CAST(vlr_unit_com AS DOUBLE)) as avg_vlr,
              APPROX_PERCENTILE(TRY_CAST(vlr_unit_com AS DOUBLE), 0.5) as median_vlr,
              MIN(TRY_CAST(vlr_unit_com AS DOUBLE)) as min_vlr,
              STDDEV(TRY_CAST(vlr_unit_com AS DOUBLE)) as stddev_vlr,
              COUNT(*) as qtd_itens,
              SUM(TRY_CAST(qtd_com AS DOUBLE)) as volume_total,
              SUM(TRY_CAST(vlr_prod AS DOUBLE)) as valor_total
          FROM "${PINNED_DATABASE}"."${PINNED_TABLE}"
          WHERE dt_emissao IS NOT NULL AND tipo_prod IS NOT NULL
          GROUP BY 1, 2
          ORDER BY 1 ASC
        `;
      } else if (activeTab === "precos") {
        sql = `
          SELECT 
              date_format(try_cast(dt_emissao as date), '%Y-W%v') as semana_emissao,
              tipo_prod,
              AVG(TRY_CAST(vlr_unit_com AS DOUBLE)) as preco_medio
          FROM "${PINNED_DATABASE}"."${PINNED_TABLE}"
          WHERE dt_emissao IS NOT NULL AND tipo_prod IS NOT NULL
          GROUP BY 1, 2
          ORDER BY 1 ASC
        `;
      } else if (activeTab === "consumo") {
        sql = `
          SELECT 
              date_format(try_cast(dt_emissao as date), '%Y-W%v') as semana_emissao,
              tipo_prod,
              SUM(TRY_CAST(qtd_com AS DOUBLE)) as volume_total,
              SUM(TRY_CAST(vlr_prod AS DOUBLE)) as valor_total
          FROM "${PINNED_DATABASE}"."${PINNED_TABLE}"
          WHERE dt_emissao IS NOT NULL AND tipo_prod IS NOT NULL
          GROUP BY 1, 2
          ORDER BY 1 ASC
        `;
      }

      const response = await fetch('/api/athena/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, database: PINNED_DATABASE }),
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setData(result.data || []);
      
      const currentMetrics = metrics[activeTab];
      if (currentMetrics.length > 0) {
        setActiveMetric(currentMetrics[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedDatabase && selectedTable) {
      fetchAnalysis();
    }
  }, [activeTab, selectedDatabase, selectedTable]);

  const chartData = useMemo(() => {
    const weeks: Record<string, any> = {};
    data.forEach(item => {
      const week = item.semana_emissao;
      const type = item.tipo_prod;
      const val = parseFloat(item[activeMetric]) || 0;
      
      if (!weeks[week]) {
        weeks[week] = { semana_emissao: week };
      }
      weeks[week][type] = val;
    });
    return Object.values(weeks).sort((a: any, b: any) => a.semana_emissao.localeCompare(b.semana_emissao));
  }, [data, activeMetric]);

  const productTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(item => {
      if (item.tipo_prod) types.add(item.tipo_prod);
    });
    return Array.from(types);
  }, [data]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <Layers size={18} />
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600">Base: {PINNED_DATABASE}</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Análises Consolidadas</h2>
            <p className="text-white/50 text-sm">Dashboards fixados na tabela técnica selecionada ({PINNED_TABLE}).</p>
          </div>
          <button 
            onClick={fetchAnalysis}
            className="glass px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            <span className="text-sm font-medium">Recarregar Dashboard</span>
          </button>
        </header>

        {/* Tab Selector */}
        <div className="flex gap-4 border-b border-white/10 mb-8 overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AnalysisTab)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all border-b-2 relative ${
                activeTab === tab.id 
                  ? "border-emerald-500 text-emerald-500" 
                  : "border-transparent text-white/30 hover:text-white/60"
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
              {activeTab === tab.id && <div className="absolute inset-0 bg-emerald-500/5 blur-xl -z-10" />}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 animate-pulse text-center">
              Consultando {PINNED_DATABASE}.{PINNED_TABLE}...<br/>
              <span className="text-[10px] opacity-70 uppercase tracking-widest mt-2 block tracking-[0.2em]">Processando dados complexos</span>
            </p>
          </div>
        ) : error ? (
          <div className="glass border-red-500/20 bg-red-500/5 p-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle size={48} className="text-red-500" />
            <h3 className="text-xl font-bold mb-1 font-mono text-red-400">SCHEMA_ERROR</h3>
            <p className="text-white/50 max-w-md text-sm">{error}</p>
            <div className="p-4 bg-white/5 rounded-lg text-left text-[10px] font-mono opacity-60">
              Database: {PINNED_DATABASE}<br/>
              Table: {PINNED_TABLE}
            </div>
            <button onClick={fetchAnalysis} className="bg-red-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 transition-all">Reconectar</button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* Metric Selector Tabs */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                {metrics[activeTab].map(m => (
                  <button
                    key={m.id}
                    onClick={() => setActiveMetric(m.id)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                      activeMetric === m.id 
                        ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20" 
                        : "bg-white/5 border-white/10 text-white/40 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Visual Chart */}
            <div className="glass p-8">
              <div className="flex items-center gap-2 mb-8 border-l-4 border-emerald-500 pl-4">
                <h3 className="font-bold text-xl uppercase tracking-tighter text-white/90">
                  {tabs.find(t => t.id === activeTab)?.label}
                </h3>
              </div>
              
              <div className="h-[450px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {activeTab === "consumo" ? (
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="semana_emissao" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => v.toLocaleString()} />
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Legend iconType="square" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                      {productTypes.map((type, i) => (
                        <Bar key={type} dataKey={type} fill={COLORS[i % COLORS.length]} radius={[2, 2, 0, 0]} />
                      ))}
                    </BarChart>
                  ) : activeTab === "precos" ? (
                    <AreaChart data={chartData}>
                      <defs>
                        {COLORS.map((color, i) => (
                          <linearGradient key={`grad-${i}`} id={`color-${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                            <stop offset="95%" stopColor={color} stopOpacity={0}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="semana_emissao" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                      {productTypes.map((type, i) => (
                        <Area 
                          key={type} 
                          type="monotone" 
                          dataKey={type} 
                          stroke={COLORS[i % COLORS.length]} 
                          fillOpacity={1} 
                          fill={`url(#color-${i})`} 
                          strokeWidth={2}
                        />
                      ))}
                    </AreaChart>
                  ) : (
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="semana_emissao" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ background: '#0a0a0a', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '11px', fontWeight: 'bold' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase' }} />
                      {productTypes.map((type, i) => (
                        <Line key={type} type="monotone" dataKey={type} stroke={COLORS[i % COLORS.length]} strokeWidth={3} dot={{ r: 3 }} />
                      ))}
                    </LineChart>
                  )}
                </ResponsiveContainer>
              </div>
            </div>

            {/* Summary Statistics Table */}
            <div className="glass p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Info size={18} className="text-emerald-500/50" />
                  <h3 className="font-bold text-lg">Resumo Estatístico</h3>
                </div>
                <div className="text-[10px] font-mono text-white/30 truncate">
                  SQL: SELECT * FROM "{PINNED_DATABASE}"."{PINNED_TABLE}" WHERE ...
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-white/10 text-white/20 text-[10px] uppercase tracking-[0.2em] font-bold">
                    <tr>
                      <th className="px-4 py-4">Semana</th>
                      <th className="px-4 py-4">Produto</th>
                      {activeTab === "valores" ? (
                        <>
                          <th className="px-4 py-4 text-right">Média</th>
                          <th className="px-4 py-4 text-right">Mediana</th>
                          <th className="px-4 py-4 text-right">Máxima</th>
                          <th className="px-4 py-4 text-right">Desvio</th>
                          <th className="px-4 py-4 text-right">Qtd Itens</th>
                          <th className="px-4 py-4 text-right">Volume</th>
                          <th className="px-4 py-4 text-right text-emerald-500">Venda Total</th>
                        </>
                      ) : activeTab === "precos" ? (
                        <th className="px-4 py-4 text-right">Preço Médio</th>
                      ) : (
                        <>
                          <th className="px-4 py-4 text-right">Volume</th>
                          <th className="px-4 py-4 text-right">Venda Total</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {data.slice(0, 20).map((row, i) => (
                      <tr key={i} className="hover:bg-white/5 transition-colors group">
                        <td className="px-4 py-4 text-sm font-medium text-white/80">{row.semana_emissao}</td>
                        <td className="px-4 py-4">
                          <span className="px-2 py-1 rounded bg-emerald-500/5 text-emerald-400 text-[9px] font-bold border border-emerald-500/10 uppercase tracking-wider">
                            {row.tipo_prod}
                          </span>
                        </td>
                        {activeTab === "valores" ? (
                          <>
                            <td className="px-4 py-4 text-right text-sm text-white/60">{parseFloat(row.avg_vlr).toFixed(3)}</td>
                            <td className="px-4 py-4 text-right text-sm text-white/60">{parseFloat(row.median_vlr).toFixed(3)}</td>
                            <td className="px-4 py-4 text-right text-sm text-white/60">{parseFloat(row.max_vlr).toFixed(3)}</td>
                            <td className="px-4 py-4 text-right text-sm font-mono text-emerald-400/70">{parseFloat(row.stddev_vlr || 0).toFixed(4)}</td>
                            <td className="px-4 py-4 text-right text-sm text-white/60">{parseInt(row.qtd_itens || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-right text-sm text-white/60">{parseFloat(row.volume_total || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-right text-sm text-emerald-400">R$ {parseFloat(row.valor_total || 0).toLocaleString()}</td>
                          </>
                        ) : activeTab === "precos" ? (
                          <td className="px-4 py-4 text-right text-sm text-white/60">{parseFloat(row.preco_medio).toFixed(3)}</td>
                        ) : (
                          <>
                            <td className="px-4 py-4 text-right text-sm font-mono text-white/60">{parseFloat(row.volume_total || 0).toLocaleString()}</td>
                            <td className="px-4 py-4 text-right text-sm text-emerald-400/80">R$ {parseFloat(row.valor_total || 0).toLocaleString()}</td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
