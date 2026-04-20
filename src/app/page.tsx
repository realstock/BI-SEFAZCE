"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Legend, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, BarChart3, RefreshCcw, AlertCircle, 
  Layers, ShoppingCart, Fuel, DollarSign, Activity, PieChart as PieChartIcon
} from "lucide-react";
import { Sidebar } from "@/components/Sidebar";
import { useTable } from "@/context/TableContext";

// Modern KPI Card
function KpiCard({ title, value, icon: Icon, color, suffix = "" }: any) {
  return (
    <div className="glass p-6 group transition-all duration-300 hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-2xl bg-${color}-500/10 text-${color}-500 group-hover:bg-${color}-500 group-hover:text-white transition-all shadow-lg shadow-${color}-500/10`}>
          <Icon size={24} />
        </div>
      </div>
      <div>
        <p className="text-white/40 text-xs font-bold uppercase tracking-widest mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-white/90">
          {value}{suffix}
        </h3>
      </div>
    </div>
  );
}

export default function Home() {
  const { selectedTable, selectedDatabase, isLoadingTables } = useTable();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PINNED_DATABASE = "temp_combustivel";
  const PINNED_TABLE = "combustivel";

  const fetchOverviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const sql = `
        SELECT 
            date_format(try_cast(dt_emissao as date), '%Y-W%v') as semana_emissao,
            tipo_prod,
            AVG(TRY_CAST(vlr_unit_com AS DOUBLE)) as avg_vlr,
            MAX(TRY_CAST(vlr_unit_com AS DOUBLE)) as max_vlr,
            SUM(TRY_CAST(qtd_com AS DOUBLE)) as volume_total,
            SUM(TRY_CAST(vlr_prod AS DOUBLE)) as valor_total,
            COUNT(*) as total_registros
        FROM "${PINNED_DATABASE}"."${PINNED_TABLE}"
        WHERE dt_emissao IS NOT NULL AND tipo_prod IS NOT NULL
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `;

      const response = await fetch('/api/athena/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, database: PINNED_DATABASE }),
      });
      
      const result = await response.json();
      if (result.error) throw new Error(result.error);
      setData(result.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  // Process data for charts
  const weeklyChartData = useMemo(() => {
    const weeks: Record<string, any> = {};
    data.forEach(item => {
      const week = item.semana_emissao;
      const type = item.tipo_prod;
      if (!weeks[week]) weeks[week] = { semana_emissao: week, total_volume: 0, total_venda: 0 };
      weeks[week][type] = parseFloat(item.avg_vlr);
      weeks[week][`${type}_vol`] = parseFloat(item.volume_total);
      weeks[week].total_volume += parseFloat(item.volume_total);
      weeks[week].total_venda += parseFloat(item.valor_total);
    });
    return Object.values(weeks);
  }, [data]);

  const productShareData = useMemo(() => {
    const shares: Record<string, number> = {};
    data.forEach(item => {
      shares[item.tipo_prod] = (shares[item.tipo_prod] || 0) + parseFloat(item.volume_total);
    });
    return Object.entries(shares).map(([name, value]) => ({ name, value }));
  }, [data]);

  const stats = useMemo(() => {
    const totalRecords = data.reduce((acc, curr) => acc + parseInt(curr.total_registros), 0);
    const totalVolume = data.reduce((acc, curr) => acc + parseFloat(curr.volume_total), 0);
    const avgPrice = data.length > 0 ? (data.reduce((acc, curr) => acc + parseFloat(curr.avg_vlr), 0) / data.length) : 0;
    const totalValue = data.reduce((acc, curr) => acc + parseFloat(curr.valor_total), 0);

    return { totalRecords, totalVolume, avgPrice, totalValue };
  }, [data]);

  const productTypes = useMemo(() => {
    const types = new Set<string>();
    data.forEach(item => types.add(item.tipo_prod));
    return Array.from(types);
  }, [data]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="flex min-h-screen bg-[#050505]">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-end mb-10">
          <div>
            <div className="flex items-center gap-2 text-blue-500 mb-2">
              <Activity size={18} />
              <span className="text-xs font-bold uppercase tracking-widest">Dashboard Executivo</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-1">Visão Geral</h2>
            <p className="text-white/50 text-sm">Resumo consolidado das operações de combustíveis.</p>
          </div>
          <button 
            onClick={fetchOverviewData}
            className="glass px-4 py-2 flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95"
          >
            <RefreshCcw size={18} className={loading ? "animate-spin" : ""} />
            <span className="text-sm font-medium">Sincronizar Dados</span>
          </button>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-white/50 animate-pulse text-center text-sm tracking-wider">
              CARREGANDO QUADRANTES...
            </p>
          </div>
        ) : error ? (
          <div className="glass border-red-500/20 bg-red-500/5 p-8 flex flex-col items-center gap-4 text-center">
            <AlertCircle size={48} className="text-red-500" />
            <h3 className="text-xl font-bold text-red-400 font-mono">CONNECTION_ERROR</h3>
            <p className="text-white/50 text-sm max-w-md">{error}</p>
            <button onClick={fetchOverviewData} className="bg-red-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-600 transition-all">Tentar Novamente</button>
          </div>
        ) : (
          <div className="space-y-8 animate-fade-in">
            {/* KPI Quadrants */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <KpiCard title="Registros Totais" value={stats.totalRecords.toLocaleString()} icon={Layers} color="blue" />
              <KpiCard title="Volume Acumulado" value={stats.totalVolume.toLocaleString()} suffix=" L" icon={Fuel} color="emerald" />
              <KpiCard title="Preço Médio Global" value={`R$ ${stats.avgPrice.toFixed(2)}`} icon={TrendingUp} color="amber" />
              <KpiCard title="Venda Total" value={`R$ ${stats.totalValue.toLocaleString()}`} icon={DollarSign} color="indigo" />
            </div>

            {/* Main Chart Quadrants */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Q1: Price Trend */}
              <div className="glass p-8 group">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><TrendingUp size={20} /></div>
                    <h3 className="font-bold tracking-tight">Tendência de Preços</h3>
                  </div>
                  <span className="text-[10px] bg-white/5 px-2 py-1 rounded text-white/30 uppercase tracking-widest font-bold">Semanal</span>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={weeklyChartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="semana_emissao" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} hide />
                      <Tooltip contentStyle={{ background: '#0a0a0a', border: 'none', borderRadius: '12px' }} />
                      {productTypes.map((type, i) => (
                        <Area key={type} type="monotone" dataKey={type} stroke={COLORS[i % COLORS.length]} fill={`url(#colorPrice)`} strokeWidth={2} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Q2: Consumption Bar */}
              <div className="glass p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500"><ShoppingCart size={20} /></div>
                    <h3 className="font-bold tracking-tight">Evolução do Volume</h3>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="semana_emissao" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#0a0a0a', border: 'none', borderRadius: '12px' }} />
                      <Bar dataKey="total_volume" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Q3: Statistical Metrics */}
              <div className="glass p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500"><BarChart3 size={20} /></div>
                    <h3 className="font-bold tracking-tight">Sazonalidade Estatística</h3>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weeklyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
                      <XAxis dataKey="semana_emissao" stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis stroke="#444" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={{ background: '#0a0a0a', border: 'none', borderRadius: '12px' }} />
                      <Legend verticalAlign="top" height={36}/>
                      <Line type="monotone" dataKey="total_venda" name="Venda Total" stroke="#f59e0b" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Q4: Market Share */}
              <div className="glass p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500"><PieChartIcon size={20} /></div>
                    <h3 className="font-bold tracking-tight">Share por Produto</h3>
                  </div>
                </div>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={productShareData}
                        innerRadius={80}
                        outerRadius={110}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {productShareData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0a0a0a', border: 'none', borderRadius: '12px' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
