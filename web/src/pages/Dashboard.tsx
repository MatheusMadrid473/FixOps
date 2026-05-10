import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { 
  LayoutDashboard, 
  Settings, 
  Wrench, 
  Users, 
  LogOut, 
  ClipboardList, 
  UserPlus 
} from "lucide-react";
import { api } from "../lib/axios";
import { MaintenanceForm } from "../components/MaintenanceForm";
import { LogsTable } from "../components/LogsTable";
import { ResetPasswordModal } from "../components/ResetPasswordModal";

// Interfaces para tipagem rigorosa (ESLint safe)
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

  // Recupera dados do usuário logado (deve conter o username para o reset de senha)
  const [user] = useState<{ name: string; role: string; username: string } | null>(() => {
    const savedUser = localStorage.getItem("fixops:user");
    if (!savedUser) return null;
    return JSON.parse(savedUser);
  });

  // Consultas de dados para os indicadores do topo
  const { data: logs } = useQuery<Log[]>({
    queryKey: ['logs'],
    queryFn: () => api.get('/logs').then(res => res.data),
  });

  const { data: equipments } = useQuery<Equipment[]>({
    queryKey: ['equipments'],
    queryFn: () => api.get('/equipments').then(res => res.data),
  });

  // Cálculos automáticos para os Cards
  const totalOS = logs?.length || 0;
  const totalCost = logs?.reduce((acc, log) => acc + log.totalCost, 0) || 0;
  const totalEquipments = equipments?.length || 0;

  // Proteção de rota: Se não houver user no storage, manda para o login
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
      <div className="min-h-screen flex bg-grayscale-100">
        {/* Sidebar Fixa Lateral */}
        <aside className="w-64 bg-grayscale-600 text-white flex flex-col p-6 fixed h-full z-20">
          <h2 className="text-2xl font-bold mb-10 px-2 tracking-tight text-blue-base">FixOps</h2>
          
          <nav className="flex flex-col gap-1 flex-1">
            <button 
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-3 px-4 py-3 bg-blue-base rounded-lg font-medium text-left cursor-pointer transition-all shadow-md mb-4"
            >
              <LayoutDashboard size={20} /> Dashboard
            </button>

            {/* Seção de Cadastros - ERP Style */}
            <div className="mt-4 mb-2 px-4">
              <p className="text-[10px] font-bold text-grayscale-400 uppercase tracking-widest">Cadastros</p>
            </div>
            
            <button 
              onClick={() => navigate('/equipments')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <Wrench size={18} /> Equipamentos
            </button>
            
            <button 
              onClick={() => navigate('/services')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <ClipboardList size={18} /> Serviços
            </button>

            <button 
              onClick={() => navigate('/groups')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <Users size={18} /> Grupos/Times
            </button>

            <button 
              onClick={() => navigate('/users')}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <UserPlus size={18} /> Usuários
            </button>

            <div className="mt-6 mb-2 px-4 border-t border-grayscale-500 pt-4">
              <p className="text-[10px] font-bold text-grayscale-400 uppercase tracking-widest">Sistema</p>
            </div>

            <button 
              onClick={() => setIsResetModalOpen(true)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-grayscale-500 rounded-lg transition-colors font-medium text-left cursor-pointer"
            >
              <Settings size={18} /> Configurações
            </button>
          </nav>

          {/* Botão de Logout no Rodapé da Sidebar */}
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-grayscale-300 hover:text-feedback-danger transition-colors font-medium mt-auto cursor-pointer border-t border-grayscale-500 pt-6"
          >
            <LogOut size={20} /> Sair do sistema
          </button>
        </aside>

        {/* Conteúdo Principal (Margem à esquerda devido à sidebar fixa) */}
        <main className="flex-1 ml-64 p-10 min-h-screen">
          <header className="flex justify-between items-center mb-10">
            <div>
              <h1 className="text-2xl font-bold text-grayscale-600 tracking-tight">Bem-vindo, {user.name}</h1>
              <p className="text-grayscale-400 text-sm italic">Status operacional da oficina</p>
            </div>
            <div className="bg-blue-base/10 px-4 py-2 rounded-full border border-blue-base/20">
              <span className="text-blue-base font-bold text-[10px] uppercase tracking-widest">
                Perfil: {user.role}
              </span>
            </div>
          </header>

          {/* Cards de Indicadores Financeiros e Quantitativos */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm">
              <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Ordens de Serviço</p>
              <h3 className="text-3xl font-bold text-grayscale-600">{totalOS}</h3>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm">
              <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Custo Total de Insumos</p>
              <h3 className="text-3xl font-bold text-grayscale-600">
                {(totalCost / 100).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
              </h3>
            </div>
            
            <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm">
              <p className="text-grayscale-400 text-[10px] font-bold uppercase mb-2 tracking-wider">Itens no Catálogo</p>
              <h3 className="text-3xl font-bold text-grayscale-600">{totalEquipments}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Seção Lateral: Novo Apontamento (Sticky) */}
            <div className="lg:col-span-1">
              <section className="bg-white p-8 rounded-xl border border-grayscale-200 shadow-sm sticky top-10">
                <div className="mb-6">
                  <h2 className="text-lg font-bold text-grayscale-600">Novo Apontamento</h2>
                  <p className="text-xs text-grayscale-400">Registre saídas e tempos de manutenção</p>
                </div>
                <MaintenanceForm />
              </section>
            </div>

            {/* Seção Central: Histórico de OS */}
            <div className="lg:col-span-2">
              <section className="bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-grayscale-200 bg-grayscale-50/50">
                  <h2 className="text-lg font-bold text-grayscale-600">Histórico de Manutenções</h2>
                </div>
                <LogsTable />
              </section>
            </div>
          </div>
        </main>
      </div>

      {/* Modal para alteração de senha do usuário logado */}
      <ResetPasswordModal 
        isOpen={isResetModalOpen} 
        onClose={() => setIsResetModalOpen(false)} 
      />
    </>
  );
}