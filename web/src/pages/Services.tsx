import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ClipboardList, Plus, X, Trash2, Edit3, Search, Clock } from "lucide-react";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { api } from "../lib/axios";
import { Input } from "../components/Input";
import { toast } from "sonner";
import { AdvancedFilter, type FilterOption } from "../components/AdvancedFilter";

// --- Tipagem e Validação ---

interface Service {
  id: string;
  name: string;
  category: string;
  estimatedTime: number;
}

interface ApiError {
  message: string;
}

const serviceSchema = z.object({
  name: z.string().min(3, "O nome deve ter no mínimo 3 caracteres"),
  category: z.string().min(1, "Selecione uma categoria"),
  estimatedTime: z.coerce.number().min(1, "O tempo estimado deve ser maior que zero"),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

const CATEGORIES = ["PREVENTIVA", "CORRETIVA", "INSPEÇÃO", "LUBRIFICAÇÃO", "INSTALAÇÃO", "OUTROS"];

const filterOptions: FilterOption[] = [
  { id: "category", label: "Categoria", options: CATEGORIES },
];

export function Services() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(res => res.data),
  });

  const filteredServices = services?.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchLower);

    const matchesAdvancedFilters = Object.entries(activeFilters).every(([key, value]) => {
      return String(item[key as keyof Service]) === value;
    });

    return matchesSearch && matchesAdvancedFilters;
  });

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema) as Resolver<ServiceFormData>,
    defaultValues: { name: '', category: 'PREVENTIVA', estimatedTime: 60 }
  });

  const mutation = useMutation({
    mutationFn: async (data: ServiceFormData) => {
      if (editingId) return api.put(`/services/${editingId}`, data);
      return api.post('/services', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success(editingId ? "Serviço atualizado!" : "Serviço cadastrado!");
      handleCloseModal();
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao processar solicitação");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Serviço removido!");
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao remover serviço.");
    }
  });

  function handleOpenEdit(service: Service) {
    setEditingId(service.id);
    setValue("name", service.name);
    setValue("category", service.category);
    setValue("estimatedTime", service.estimatedTime);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    reset();
  }

  function handleDelete(id: string) {
    if (window.confirm("Deseja realmente excluir este serviço? O histórico de ordens não será afetado.")) {
      deleteMutation.mutate(id);
    }
  }

  // Helper para formatar os minutos em horas amigáveis
  function formatTime(minutes: number) {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
            <ClipboardList className="text-blue-base" /> Catálogo de Serviços
          </h1>
          <p className="text-grayscale-400 text-sm">Padronização de tarefas e tempos estimados para a equipe</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all shadow-md cursor-pointer">
          <Plus size={20} /> Novo Serviço
        </button>
      </header>

      {/* --- AÇÕES DE PESQUISA E FILTRO --- */}
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-grayscale-400" size={20} />
            <input
              type="text"
              placeholder="Buscar pelo nome do serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 rounded-xl border border-grayscale-200 bg-white shadow-sm focus:outline-none focus:border-blue-base focus:ring-1 focus:ring-blue-base transition-all text-sm box-border"
            />
          </div>
          
          <AdvancedFilter 
            fields={filterOptions} 
            activeFilters={activeFilters} 
            onFilterChange={setActiveFilters} 
          />
        </div>

        {Object.keys(activeFilters).length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-blue-base/20 shadow-sm w-full">
            <span className="text-[10px] text-grayscale-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <ClipboardList size={14} /> Aplicados:
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
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Nome do Serviço</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Categoria</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Tempo Estimado</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grayscale-200">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-grayscale-400 font-medium">Carregando serviços...</td></tr>
            ) : filteredServices?.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-20 text-center text-grayscale-400 italic">
                  Nenhum serviço encontrado.
                </td>
              </tr>
            ) : filteredServices?.map((item) => (
              <tr key={item.id} className="hover:bg-grayscale-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-medium text-grayscale-600">{item.name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-grayscale-100 rounded text-[10px] font-bold text-grayscale-500 uppercase">{item.category}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2 text-sm text-grayscale-500 font-medium">
                    <Clock size={16} className="text-blue-base/70" />
                    {formatTime(item.estimatedTime)}
                  </div>
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

      {/* --- MODAL DE CADASTRO/EDIÇÃO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50">
              <h2 className="font-bold text-grayscale-600 text-lg">
                {editingId ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button onClick={handleCloseModal} className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer transition-colors"><X size={20}/></button>
            </div>

            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-8 flex flex-col gap-5">
              
              <Input 
                label="Nome da Atividade" 
                placeholder="Ex: Troca de Óleo do Motor" 
                {...register('name')} 
                error={errors.name?.message} 
              />
              
              <div className="grid grid-cols-2 gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-grayscale-500 uppercase">Categoria</label>
                  <select {...register('category')} className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-grayscale-50">
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                <Input 
                  label="Tempo Estimado (Minutos)" 
                  type="number" 
                  placeholder="Ex: 60" 
                  {...register('estimatedTime')} 
                  error={errors.estimatedTime?.message} 
                />
              </div>

              <div className="flex gap-3 mt-4">
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