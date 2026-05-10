import { Wrench, Plus } from "lucide-react";

export function Equipments() {
  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
            <Wrench className="text-blue-base" /> Equipamentos
          </h1>
          <p className="text-grayscale-400 text-sm">Gerencie máquinas, implementos e seus custos unitários</p>
        </div>
        
        <button className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all cursor-pointer shadow-md">
          <Plus size={20} /> Novo Equipamento
        </button>
      </header>

      <div className="bg-white rounded-xl border border-grayscale-200 shadow-sm p-20 text-center">
        <div className="max-w-xs mx-auto flex flex-col items-center">
          <Wrench size={48} className="text-grayscale-200 mb-4" />
          <p className="text-grayscale-400 font-medium">Nenhum equipamento cadastrado ainda.</p>
          <p className="text-xs text-grayscale-400 mt-2 italic">A lista de equipamentos permitirá o cálculo automático de custos nas Ordens de Serviço.</p>
        </div>
      </div>
    </div>
  );
}