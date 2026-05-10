import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, Legend 
} from "recharts";
import { 
  LayoutDashboard, Clock, Wrench, TrendingUp, Filter, AlertCircle, FileText, X, Eye, Users
} from "lucide-react";

// --- Tipagem ---
interface ServiceLog {
  id: string;
  osNumber: string;
  equipmentName: string;
  serviceName: string;
  technicianName: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  costCenter: string;
  notes?: string;
  groupId?: string;
}

interface Equipment { id: string; name: string; }

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#6366F1'];

export function Dashboard() {
  const navigate = useNavigate();
  const [filterTeam, setFilterTeam] = useState<string>("all");
  
  // Estado para visualização de detalhes da OS
  const [selectedLog, setSelectedLog] = useState<ServiceLog | null>(null);

  const [user] = useState(() => {
    const savedUser = localStorage.getItem("fixops:user");
    if (!savedUser) return null;
    return JSON.parse(savedUser);
  });

  const { data: logs } = useQuery<ServiceLog[]>({
    queryKey: ['logs'],
    queryFn: () => api.get('/logs').then(res => res.data),
  });

  const { data: equipments } = useQuery<Equipment[]>({
    queryKey: ['equipments'],
    queryFn: () => api.get('/equipments').then(res => res.data),
  });

  // --- Lógica de Filtro Dinâmica ---
  const dashboardData = useMemo(() => {
    if (!logs || !user) return [];
    
    let filtered = [...logs];

    // Trava de segurança: Gestor só vê a própria equipe
    if (user.role === 'MANAGER' && user.groupId) {
      filtered = filtered.filter(log => log.groupId === user.groupId);
    }

    // Filtro de UI para Admin
    if (filterTeam !== "all") {
      filtered = filtered.filter(log => log.groupId === filterTeam);
    }

    return filtered;
  }, [logs, user, filterTeam]);

  // --- Cálculos de KPIs e Gráficos ---
  const stats = useMemo(() => {
    const totalOS = dashboardData.length;
    const totalEquipments = equipments?.length || 0;
    
    const totalMinutes = dashboardData.reduce((acc, log) => {
      const start = new Date(`${log.startDate}T${log.startTime}`);
      const end = new Date(`${log.endDate}T${log.endTime}`);
      const diff = (end.getTime() - start.getTime()) / 60000;
      return acc + (isNaN(diff) ? 0 : diff);
    }, 0);

    const avgTime = totalOS > 0 ? Math.round(totalMinutes / totalOS) : 0;

    const serviceMap: Record<string, number> = {};
    dashboardData.forEach(log => {
      const name = log.serviceName || "Não Informado";
      serviceMap[name] = (serviceMap[name] || 0) + 1;
    });
    
    const pieData = Object.entries(serviceMap).map(([name, value]) => ({ 
      name: name.toUpperCase(), 
      value 
    }));

    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = dashboardData.filter(log => log.startDate === dateStr).length;
      return { date: dateStr.split('-').reverse().slice(0, 2).join('/'), count };
    }).reverse();

    return { totalOS, totalEquipments, avgTime, pieData, last7Days };
  }, [dashboardData, equipments]);

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto bg-grayscale-50 min-h-screen">
      <header className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LayoutDashboard className="text-blue-base" size={20} />
            <span className="text-[10px] font-bold text-blue-base uppercase tracking-widest">Painel de Gestão</span>
          </div>
          <h1 className="text-3xl font-bold text-grayscale-600 tracking-tight">Olá, {user.name}</h1>
          <p className="text-grayscale-400 text-sm italic">Status em tempo real das operações de manutenção</p>
        </div>

        <div className="flex items-center gap-4">
          {user.role === 'ADMIN' && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-lg border border-grayscale-200 shadow-sm">
              <Filter size={16} className="text-grayscale-400" />
              <select 
                value={filterTeam}
                onChange={(e) => setFilterTeam(e.target.value)}
                className="text-xs font-bold text-grayscale-500 outline-none cursor-pointer"
              >
                <option value="all">Todas as Equipes</option>
                <option value="mech">Oficina Mecânica</option>
                <option value="eletr">Elétrica / Implementos</option>
              </select>
            </div>
          )}
          <div className="bg-blue-base text-white px-4 py-2 rounded-lg shadow-md flex items-center gap-2">
             <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
             <span className="text-xs font-bold uppercase">{user.role}</span>
          </div>
        </div>
      </header>

      {/* --- CARDS DE KPI --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <CardKpi title="Total de OS" value={stats.totalOS} icon={<Wrench size={20}/>} color="blue" />
        <CardKpi title="Tempo Médio OS" value={`${stats.avgTime} min`} icon={<Clock size={20}/>} color="orange" />
        <CardKpi title="Equipamentos" value={stats.totalEquipments} icon={<AlertCircle size={20}/>} color="green" />
        <CardKpi title="Produtividade" value="+8.4%" icon={<TrendingUp size={20}/>} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
        {/* GRÁFICO DE TENDÊNCIA */}
        <div className="lg:col-span-2 bg-white p-8 rounded-2xl border border-grayscale-200 shadow-sm">
          <h2 className="font-bold text-grayscale-600 flex items-center gap-2 mb-8">
            <TrendingUp size={18} className="text-blue-base" /> Histórico de Aberturas (7 dias)
          </h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94A3B8', fontSize: 11}} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={4} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* GRÁFICO DE ROSQUINHA (PIZZA) */}
        <div className="bg-white p-8 rounded-2xl border border-grayscale-200 shadow-sm">
          <h2 className="font-bold text-grayscale-600 mb-8">Distribuição de Serviços</h2>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.pieData}
                  innerRadius={65}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  nameKey="name"
                >
                  {stats.pieData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip />
                <Legend verticalAlign="bottom" layout="horizontal" iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 'bold', paddingTop: '20px'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* --- LISTA DINÂMICA DE ORDENS DE SERVIÇO --- */}
      <section className="bg-white rounded-2xl border border-grayscale-200 shadow-sm overflow-hidden mb-10">
        <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50/50">
          <h2 className="font-bold text-grayscale-600 flex items-center gap-2">
            <FileText size={18} className="text-blue-base" /> Monitoramento de Ordens de Serviço
          </h2>
          <span className="text-[10px] font-bold text-grayscale-400 uppercase bg-white px-3 py-1 rounded-full border border-grayscale-200">
            {dashboardData.length} registros encontrados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-grayscale-50">
              <tr>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">OS</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Equipamento</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Serviço</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Técnico</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Data</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Duração</th>
                <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-grayscale-100">
              {dashboardData.map((log) => {
                const startDt = new Date(`${log.startDate}T${log.startTime}`);
                const endDt = new Date(`${log.endDate}T${log.endTime}`);
                const durationMinutes = Math.round((endDt.getTime() - startDt.getTime()) / 60000);
                const hours = Math.floor(durationMinutes / 60);
                const mins = durationMinutes % 60;
                const durationText = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
                
                return (
                  <tr key={log.id} className="hover:bg-blue-50/30 transition-colors group">
                    <td className="px-6 py-4">
                      <span className="font-bold text-grayscale-600">OS-{log.osNumber}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-grayscale-500 font-medium">{log.equipmentName}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-grayscale-100 text-grayscale-600 text-[10px] font-bold rounded uppercase">
                        {log.serviceName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-grayscale-600 font-medium">{log.technicianName}</td>
                    <td className="px-6 py-4 text-sm text-grayscale-400 italic">
                      {log.startDate.split('-').reverse().join('/')}
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-blue-base">{durationText}</td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => setSelectedLog(log)}
                        className="p-2 text-grayscale-400 hover:text-blue-base transition-colors cursor-pointer"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* --- MODAL DE DETALHES (READ-ONLY) --- */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-blue-base text-white">
              <div>
                <h3 className="font-bold text-lg">Detalhes da Ordem</h3>
                <p className="text-[10px] uppercase opacity-80 font-bold tracking-widest">Protocolo OS-{selectedLog.osNumber}</p>
              </div>
              <button onClick={() => setSelectedLog(null)} className="hover:bg-white/20 p-2 rounded-lg transition-colors cursor-pointer">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-8 grid grid-cols-2 gap-6">
              <DetailItem label="Técnico" value={selectedLog.technicianName} icon={<Users size={14}/>} />
              <DetailItem label="Centro de Custo" value={selectedLog.costCenter} icon={<Filter size={14}/>} />
              <DetailItem label="Início" value={`${selectedLog.startDate} ${selectedLog.startTime}`} />
              <DetailItem label="Fim" value={`${selectedLog.endDate} ${selectedLog.endTime}`} />
              
              <div className="col-span-2 bg-grayscale-50 p-4 rounded-xl border border-grayscale-100">
                <label className="text-[10px] font-bold text-grayscale-400 uppercase block mb-2">Observações Técnicas</label>
                <p className="text-sm text-grayscale-600 italic leading-relaxed">
                  {selectedLog.notes || "Nenhuma observação registrada para este apontamento."}
                </p>
              </div>
            </div>

            <div className="p-6 bg-grayscale-50 border-t border-grayscale-100 flex justify-end">
              <button 
                onClick={() => setSelectedLog(null)}
                className="px-6 py-2 bg-grayscale-600 text-white rounded-lg text-sm font-bold hover:bg-grayscale-700 transition-colors cursor-pointer"
              >
                Fechar Visualização
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string, value: string, icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-grayscale-400 uppercase flex items-center gap-1">
        {icon} {label}
      </span>
      <span className="text-sm font-bold text-grayscale-600">{value}</span>
    </div>
  );
}

function CardKpi({ title, value, icon, color }: CardKpiProps) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    green: "bg-green-50 text-green-600 border-green-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-grayscale-200 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-widest">{title}</p>
        <h3 className="text-2xl font-bold text-grayscale-600">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
        {icon}
      </div>
    </div>
  );
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-grayscale-600 text-white p-3 rounded-lg shadow-lg border-none text-xs">
        <p className="font-bold mb-1">{label}</p>
        <p><span className="opacity-70">OS abertas:</span> {payload[0].value}</p>
      </div>
    );
  }
  return null;
}

interface CardKpiProps { title: string; value: string | number; icon: React.ReactNode; color: 'blue' | 'orange' | 'green' | 'purple'; }
interface CustomTooltipProps { active?: boolean; payload?: Array<{ value: number }>; label?: string; }