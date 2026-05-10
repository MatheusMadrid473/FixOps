import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Settings, Wrench, Users, LogOut } from "lucide-react";
import { api } from "../lib/axios";
import { MaintenanceForm } from "../components/MaintenanceForm";
import { LogsTable } from "../components/LogsTable";
import { ResetPasswordModal } from "../components/ResetPasswordModal";

// Interfaces para tipagem e satisfação do ESLint
interface Log {
  id: string;
  totalCost: number;
  description: string;
}

interface Equipment {
  id: string;
  name: string;
}

export function Dashboard() {
  const navigate = useNavigate();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  // Lazy Initializer: Recupera dados do usuário logado
  const [user] = useState<{ name: string; role: string } | null>(() => {
    const savedUser = localStorage.getItem("fixops:user");
    if (!savedUser) return null;
    return JSON.parse(savedUser);
  });

  // Consultas de dados para os indicadores
  const { data: logs } = useQuery<Log[]>({
    queryKey: ['logs'],
    queryFn: () => api.get('/logs').then(res => res.data),
  });

  const { data: equipments } = useQuery<Equipment[]>({
    queryKey: ['equipments'],
    queryFn: () => api.get('/equipments').then(res => res.data),
  });

  // Cálculos dos indicadores
  const totalOS = logs?.length || 0;
  const totalCost = logs?.reduce((acc, log) => acc + log.totalCost, 0) || 0;
  const totalEquipments = equipments?.length || 0;

  // Proteção: Redireciona se não houver usuário logado
  if (!user) {
    navigate("/login");
    return null;
  }

  function handleLogout() {
    localStorage.removeItem("fixops:token");
    localStorage.removeItem("fixops:user");
    navigate("/login");
  }

  return (
    <>
      <div className="min-h-screen flex">
        {/* Sidebar Fixa */}
        <aside className="w-64 bg-grayscale-600 text-white flex flex-col p-6 fixed h-full z-20">
          <h2 className="text-2xl font-bold mb-10 px-2 tracking-tight">FixOps</h2>
          
          <nav className="flex flex-col gap-2 flex-1">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 px-4 py-3 bg-blue-base rounded-lg font-medium text-left cursor-pointer transition-all"
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>
            
            <button 
              onClick={() => navigate('/equipments')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <Wrench size={20} /> Equipamentos
            </button>
            
            <button 
              onClick={() => navigate('/groups')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <Users size={20} /> Grupos/Times
            </button>
            
            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <Settings size={20} /> Configurações
            </button>
          </nav>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-grayscale-300 hover:text-white transition-colors font-medium mt-auto cursor-pointer"
          >
            <LogOut size={20} /> Sair do sistema
          </button>
        </aside>

        {/* Conteúdo Principal */}
        <main className="flex-1 ml-64 p-10 bg-grayscale-100 min-h-screen">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-2xl font-bold text-grayscale-600 tracking-tight">Bem-vindo, {user.name}</h1>
              <p className="text-grayscale-400 text-sm">Resumo operacional e financeiro da frota</p>
            </div>
            <div className="bg-blue-base/10 px-4 py-2 rounded-full border border-blue-base/20">
              <span className="text-blue-base font-bold text-[10px] uppercase tracking-widest">
                {user.role}
              </span>
            </div>
          </header>

          {/* Grid de Indicadores */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm">
              <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Total de OS</p>
              <h3 className="text-3xl font-bold text-grayscale-600">{totalOS}</h3>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm">
              <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Custo Acumulado</p>
              <h3 className="text-3xl font-bold text-grayscale-600">
                {(totalCost / 100).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm">
              <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Catálogo de Itens</p>
              <h3 className="text-3xl font-bold text-grayscale-600">{totalEquipments}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Coluna do Formulário de Lançamento */}
            <div className="lg:col-span-1">
              <section className="bg-white p-8 rounded-xl border border-grayscale-200 shadow-sm sticky top-10">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-grayscale-600">Novo Apontamento</h2>
                  <p className="text-xs text-grayscale-400">Registre saídas de peças e serviços</p>
                </div>
                <MaintenanceForm />
              </section>
            </div>

            {/* Coluna da Tabela de Logs */}
            <div className="lg:col-span-2">
              <section className="bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-grayscale-200 bg-grayscale-50/50">
                  <h2 className="text-lg font-bold text-grayscale-600">Histórico Recente</h2>
                </div>
                <LogsTable />
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Modal de Gestão de Senhas */}
      <ResetPasswordModal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
      />
    </>
  );
}