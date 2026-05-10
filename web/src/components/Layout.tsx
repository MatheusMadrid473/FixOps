import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  Settings, 
  Wrench, 
  Users, 
  LogOut, 
  ClipboardList, 
  UserPlus
} from "lucide-react";
import { ResetPasswordModal } from "./ResetPasswordModal";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const [user] = useState<{ name: string; role: string } | null>(() => {
    const savedUser = localStorage.getItem("fixops:user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  function handleLogout() {
    localStorage.removeItem("fixops:token");
    localStorage.removeItem("fixops:user");
    navigate("/login");
  }

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex bg-grayscale-100">
      {/* Sidebar Fixa */}
      <aside className="w-64 bg-grayscale-600 text-white flex flex-col p-6 fixed h-full z-20">
        <h2 className="text-2xl font-bold mb-10 px-2 tracking-tight text-blue-base">FixOps</h2>
        
        <nav className="flex flex-col gap-1 flex-1">
          <button 
            onClick={() => navigate('/dashboard')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-left cursor-pointer transition-all ${isActive('/dashboard') ? 'bg-blue-base shadow-md' : 'hover:bg-grayscale-500'}`}
          >
            <LayoutDashboard size={20} /> Dashboard
          </button>

          <div className="mt-4 mb-2 px-4">
            <p className="text-[10px] font-bold text-grayscale-400 uppercase tracking-widest">Cadastros</p>
          </div>
          
          <button 
            onClick={() => navigate('/equipments')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-left cursor-pointer ${isActive('/equipments') ? 'bg-blue-base' : 'hover:bg-grayscale-500'}`}
          >
            <Wrench size={18} /> Equipamentos
          </button>
          
          <button 
            onClick={() => navigate('/services')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-left cursor-pointer ${isActive('/services') ? 'bg-blue-base' : 'hover:bg-grayscale-500'}`}
          >
            <ClipboardList size={18} /> Serviços
          </button>

          <button 
            onClick={() => navigate('/groups')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-left cursor-pointer ${isActive('/groups') ? 'bg-blue-base' : 'hover:bg-grayscale-500'}`}
          >
            <Users size={18} /> Grupos/Times
          </button>

          <button 
            onClick={() => navigate('/users')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-left cursor-pointer ${isActive('/users') ? 'bg-blue-base' : 'hover:bg-grayscale-500'}`}
          >
            <UserPlus size={18} /> Usuários
          </button>

          <button 
            onClick={() => navigate('/apontamentos')}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium text-left cursor-pointer ${isActive('/apontamentos') ? 'bg-blue-base' : 'hover:bg-grayscale-500'}`}
          >
            <ClipboardList size={18} /> Apontamentos
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

        {/* Rodapé da Sidebar */}
        <div className="mt-auto border-t border-grayscale-500 pt-6 flex flex-col gap-4">
          {user && (
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-blue-base flex items-center justify-center text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col overflow-hidden">
                <span className="text-sm font-bold truncate">{user.name}</span>
                <span className="text-[10px] text-grayscale-400 uppercase tracking-wider">{user.role}</span>
              </div>
            </div>
          )}
          
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-grayscale-300 hover:text-feedback-danger transition-colors font-medium cursor-pointer"
          >
            <LogOut size={20} /> Sair do sistema
          </button>
        </div>
      </aside>

      {/* Conteúdo das páginas */}
      <main className="flex-1 ml-64 min-h-screen">
        {children}
      </main>

      <ResetPasswordModal isOpen={isResetModalOpen} onClose={() => setIsResetModalOpen(false)} />
    </div>
  );
}