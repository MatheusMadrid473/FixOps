import { useNavigate } from "react-router-dom";
import { ArrowLeft, Wrench, Plus } from "lucide-react";

export function Equipments() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-grayscale-100 p-10 ml-64">
      <div className="max-w-6xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-grayscale-400 hover:text-grayscale-600 mb-8 cursor-pointer">
          <ArrowLeft size={20} /> Voltar ao Dashboard
        </button>
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3">
              <Wrench className="text-blue-base" /> Equipamentos
            </h1>
            <p className="text-grayscale-400">Gerencie o catálogo de máquinas e implementos</p>
          </div>
          <button className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all cursor-pointer">
            <Plus size={20} /> Novo Equipamento
          </button>
        </header>
        <div className="bg-white rounded-xl border border-grayscale-200 shadow-sm p-20 text-center text-grayscale-400 italic">
          Lista de equipamentos em desenvolvimento...
        </div>
      </div>
    </div>
  );
}