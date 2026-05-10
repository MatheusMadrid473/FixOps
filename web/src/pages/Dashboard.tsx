import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/axios";
import { MaintenanceForm } from "../components/MaintenanceForm";
import { LogsTable } from "../components/LogsTable";

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

  const [user] = useState<{ name: string; role: string } | null>(() => {
    const savedUser = localStorage.getItem("fixops:user");
    if (!savedUser) return null;
    return JSON.parse(savedUser);
  });

  const { data: logs } = useQuery<Log[]>({
    queryKey: ['logs'],
    queryFn: () => api.get('/logs').then(res => res.data),
  });

  const { data: equipments } = useQuery<Equipment[]>({
    queryKey: ['equipments'],
    queryFn: () => api.get('/equipments').then(res => res.data),
  });

  const totalOS = logs?.length || 0;
  const totalCost = logs?.reduce((acc, log) => acc + log.totalCost, 0) || 0;
  const totalEquipments = equipments?.length || 0;

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-bold text-grayscale-600 tracking-tight">
            Bem-vindo, {user.name}
          </h1>
          <p className="text-grayscale-400 text-sm italic">Status operacional da oficina</p>
        </div>
        <div className="bg-blue-base/10 px-4 py-2 rounded-full border border-blue-base/20">
          <span className="text-blue-base font-bold text-[10px] uppercase tracking-widest">
            Perfil: {user.role}
          </span>
        </div>
      </header>

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
        <div className="lg:col-span-1">
          <section className="bg-white p-8 rounded-xl border border-grayscale-200 shadow-sm sticky top-10">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-grayscale-600">Novo Apontamento</h2>
              <p className="text-xs text-grayscale-400">Registre saídas e tempos de manutenção</p>
            </div>
            <MaintenanceForm />
          </section>
        </div>

        <div className="lg:col-span-2">
          <section className="bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-grayscale-200 bg-grayscale-50/50">
              <h2 className="text-lg font-bold text-grayscale-600">Histórico de Manutenções</h2>
            </div>
            <LogsTable />
          </section>
        </div>
      </div>
    </div>
  );
}