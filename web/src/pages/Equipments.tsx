import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Wrench, Plus, X, Trash2, Edit3, Search, Filter } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { api } from "../lib/axios";
import { Input } from "../components/Input";
import { toast } from "sonner";
import { AdvancedFilter, type FilterOption } from "../components/AdvancedFilter";

// --- Tipagem e Validação ---

interface Equipment {
  id: string;
  name: string;
  sku: string;
  category: string;
  unit: string;
  unitCost: number;
}

interface ApiError {
  message: string;
}

const equipmentSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  sku: z.string().min(1, "SKU obrigatório"),
  category: z.string().min(1, "Selecione uma categoria"),
  unit: z.string().min(1, "Selecione a unidade"),
  unitCost: z.coerce.number().min(0, "Custo inválido"),
});

type EquipmentFormData = z.infer<typeof equipmentSchema>;

const CATEGORIES = ["PNEUS", "LUBRIFICANTES", "FILTROS", "HIDRAULICA", "ELETRICA", "OUTROS"];
const UNITS = ["UN", "L", "KG", "M", "PAR"];

const filterOptions: FilterOption[] = [
  { id: "category", label: "Categoria", options: CATEGORIES },
  { id: "unit", label: "Unidade de Medida", options: UNITS },
];

export function Equipments() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const { data: equipments, isLoading } = useQuery<Equipment[]>({
    queryKey: ['equipments'],
    queryFn: () => api.get('/equipments').then(res => res.data),
  });

  const filteredEquipments = equipments?.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      item.name.toLowerCase().includes(searchLower) ||
      item.sku.toLowerCase().includes(searchLower);

    const matchesAdvancedFilters = Object.entries(activeFilters).every(([key, value]) => {
      return String(item[key as keyof Equipment]) === value;
    });

    return matchesSearch && matchesAdvancedFilters;
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentSchema) as Resolver<EquipmentFormData>,
    defaultValues: { name: '', sku: '', category: 'OUTROS', unit: 'UN', unitCost: 0 }
  });

  const mutation = useMutation({
    mutationFn: async (data: EquipmentFormData) => {
      const payload = { ...data, unitCost: Math.round(Number(data.unitCost) * 100) };
      if (editingId) return api.put(`/equipments/${editingId}`, payload);
      return api.post('/equipments', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success(editingId ? "Equipamento atualizado!" : "Equipamento cadastrado!");
      handleCloseModal();
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao processar solicitação");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/equipments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['equipments'] });
      toast.success("Equipamento removido!");
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao remover equipamento.");
    }
  });

  function handleOpenEdit(equipment: Equipment) {
    setEditingId(equipment.id);
    setValue("name", equipment.name);
    setValue("sku", equipment.sku);
    setValue("category", equipment.category);
    setValue("unit", equipment.unit);
    setValue("unitCost", equipment.unitCost / 100);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  }

  function handleDelete(id: string) {
    if (window.confirm("Deseja realmente excluir este equipamento?")) {
      deleteMutation.mutate(id);
    }
  }

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
            <Wrench className="text-blue-base" /> Catálogo de Peças
          </h1>
          <p className="text-grayscale-400 text-sm">Gerencie insumos e custos unitários para manutenção</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all shadow-md cursor-pointer">
          <Plus size={20} /> Adicionar Item
        </button>
      </header>

      {/* --- AÇÕES DE PESQUISA E FILTRO (100% da Tela) --- */}
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          {/* Pesquisa toma todo o espaço restante (flex-1) */}
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-grayscale-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nome ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 rounded-xl border border-grayscale-200 bg-white shadow-sm focus:outline-none focus:border-blue-base focus:ring-1 focus:ring-blue-base transition-all text-sm box-border"
            />
          </div>
          
          {/* Botão de Filtro e seu Modal encapsulado */}
          <AdvancedFilter 
            fields={filterOptions} 
            activeFilters={activeFilters} 
            onFilterChange={setActiveFilters} 
          />
        </div>

        {/* PAINEL DE FILTROS ATIVOS (Só aparece se houver filtro) */}
        {Object.keys(activeFilters).length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-blue-base/20 shadow-sm w-full">
            <span className="text-[10px] text-grayscale-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} /> Aplicados:
            </span>
            
            {Object.entries(activeFilters).map(([key, value]) => {
              const fieldLabel = filterOptions.find((f) => f.id === key)?.label || key;
              return (
                <div
                  key={key}
                  className="flex items-center gap-2 bg-blue-base/10 text-blue-base border border-blue-base/20 px-3 py-1.5 rounded-lg text-xs font-bold"
                >
                  <span>{fieldLabel}: <span className="text-grayscale-600 font-medium ml-1">{value}</span></span>
                  <button
                    onClick={() => {
                      const newFilters = { ...activeFilters };
                      delete newFilters[key];
                      setActiveFilters(newFilters);
                    }}
                    className="hover:text-feedback-danger transition-colors cursor-pointer ml-1"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            
            <button
              onClick={() => setActiveFilters({})}
              className="text-xs font-bold text-grayscale-400 hover:text-grayscale-600 underline cursor-pointer ml-auto"
            >
              Limpar todos
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden mt-2">
        <table className="w-full text-left">
          <thead className="bg-grayscale-50 border-b border-grayscale-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">SKU / Peça</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Unidade</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Custo Unit.</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grayscale-200">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-grayscale-400 font-medium">Carregando catálogo...</td></tr>
            ) : filteredEquipments?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-grayscale-400 italic">
                  Nenhum item encontrado com os filtros aplicados.
                </td>
              </tr>
            ) : filteredEquipments?.map((item) => (
              <tr key={item.id} className="hover:bg-grayscale-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="text-[10px] text-blue-base font-mono font-bold uppercase tracking-wider">{item.sku}</div>
                  <div className="font-medium text-grayscale-600">{item.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-grayscale-100 rounded text-[10px] font-bold text-grayscale-500 uppercase">{item.category}</span>
                </td>
                <td className="px-6 py-4 text-sm text-grayscale-500">{item.unit}</td>
                <td className="px-6 py-4 text-sm text-grayscale-600 font-bold">
                  {(item.unitCost / 100).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
                </td>
                <td className="px-6 py-4 text-right">
                   <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenEdit(item)} className="text-grayscale-400 hover:text-blue-base p-2 transition-colors cursor-pointer"><Edit3 size={18} /></button>
                    <button onClick={() => handleDelete(item.id)} className="text-grayscale-400 hover:text-feedback-danger p-2 transition-colors cursor-pointer"><Trash2 size={18} /></button>
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50">
              <h2 className="font-bold text-grayscale-600 text-lg">
                {editingId ? 'Editar Insumo' : 'Novo Insumo'}
              </h2>
              <button onClick={handleCloseModal} className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-8 grid grid-cols-2 gap-5">
              <div className="col-span-2">
                <Input label="Nome da Peça / Equipamento" placeholder="Ex: Pneu 295/80 R22.5" {...register('name')} error={errors.name?.message} />
              </div>
              <Input label="SKU / Código Interno" placeholder="ID-12345" {...register('sku')} error={errors.sku?.message} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-grayscale-500 uppercase">Categoria</label>
                <select {...register('category')} className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-grayscale-50">
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-grayscale-500 uppercase">Unidade de Medida</label>
                <select {...register('unit')} className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-grayscale-50">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <Input label="Custo Unitário (R$)" type="number" step="0.01" {...register('unitCost')} error={errors.unitCost?.message} />
              <div className="col-span-2 flex gap-3 mt-4">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-grayscale-50 transition-all cursor-pointer">Cancelar</button>
                <button type="submit" disabled={mutation.isPending} className="flex-1 py-3 bg-blue-base text-white rounded-lg font-bold hover:bg-blue-dark transition-all shadow-md cursor-pointer">
                  {mutation.isPending ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}