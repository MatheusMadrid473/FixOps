import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Clock, Plus, X, Trash2, Edit3, Search, Calendar, FileText, Filter, AlertTriangle } from "lucide-react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { api } from "../lib/axios";
import { Input } from "../components/Input";
import { toast } from "sonner";
import { AdvancedFilter, type FilterOption } from "../components/AdvancedFilter";

// --- Tipagens ---

interface ServiceLog {
  id: string;
  osNumber?: number; // Agora é um número auto-increment no banco
  costCenter?: string;
  equipmentId: string;
  serviceId: string;
  userId: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  notes?: string;
}

interface Equipment { id: string; name: string; sku: string; }
interface Service { id: string; name: string; estimatedTime: number; }
interface User { id: string; name: string; role: string; groupId?: string | null; }
interface ApiError { message: string; }

const CURRENT_USER_MOCK = {
  id: "id-do-usuario-logado-aqui", 
  role: "MANAGER", 
  groupId: "id-do-grupo"
};

const MOCK_COST_CENTERS = [
  "101.01 - Preparação de Solo", "101.02 - Plantio", "101.03 - Tratos Culturais", "101.04 - Colheita",
  "102.01 - Manutenção Automotiva", "102.02 - Manutenção Industrial", "103.01 - Logística Interna",
  "103.02 - Transporte Externo", "104.01 - Almoxarifado", "104.02 - Compras",
  "105.01 - Administração", "105.02 - RH", "106.01 - TI", "106.02 - Segurança do Trabalho"
];

// Zod schema sem o osNumber (banco gera)
const logSchema = z.object({
  costCenter: z.string().min(1, "Selecione um Centro de Custo"),
  equipmentId: z.string().min(1, "Selecione o equipamento/peça"),
  serviceId: z.string().min(1, "Selecione o serviço realizado"),
  userId: z.string().min(1, "Técnico responsável é obrigatório"),
  startDate: z.string().min(1, "Data de início obrigatória"),
  startTime: z.string().min(1, "Hora de início obrigatória"),
  endDate: z.string().min(1, "Data de fim obrigatória"),
  endTime: z.string().min(1, "Hora de fim obrigatória"),
  notes: z.string().optional(),
});

type LogFormData = z.infer<typeof logSchema>;

export function Apontamentos() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOsNumber, setEditingOsNumber] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false, title: "", message: "", onConfirm: () => {}
  });

  const todayDate = new Date().toISOString().split('T')[0];

  // --- Queries ---
  const { data: logs, isLoading: loadingLogs } = useQuery<ServiceLog[]>({
    queryKey: ['logs'], queryFn: () => api.get('/logs').then(res => res.data),
  });
  const { data: equipments } = useQuery<Equipment[]>({
    queryKey: ['equipments'], queryFn: () => api.get('/equipments').then(res => res.data),
  });
  const { data: services } = useQuery<Service[]>({
    queryKey: ['services'], queryFn: () => api.get('/services').then(res => res.data),
  });
  const { data: users } = useQuery<User[]>({
    queryKey: ['users'], queryFn: () => api.get('/users').then(res => res.data),
  });

  const availableUsers = CURRENT_USER_MOCK.role === 'MANAGER' || CURRENT_USER_MOCK.role === 'ADMIN'
    ? users 
    : users?.filter(u => u.id === CURRENT_USER_MOCK.id);

  // --- Filtros Dinâmicos ---
  const filterOptions: FilterOption[] = [
    { id: "equipmentId", label: "Equipamento", options: equipments?.map(e => e.name) || [] },
    { id: "serviceId", label: "Serviço", options: services?.map(s => s.name) || [] },
  ];

  const filteredLogs = logs?.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const osMatch = String(item.osNumber || "").includes(searchLower);
    const notesMatch = item.notes?.toLowerCase().includes(searchLower) || false;
    
    const equipName = equipments?.find(e => e.id === item.equipmentId)?.name.toLowerCase() || "";
    const matchesSearch = osMatch || notesMatch || equipName.includes(searchLower);

    const matchesAdvancedFilters = Object.entries(activeFilters).every(([key, value]) => {
      if (key === 'equipmentId') return equipments?.find(e => e.name === value)?.id === item.equipmentId;
      if (key === 'serviceId') return services?.find(s => s.name === value)?.id === item.serviceId;
      return String(item[key as keyof ServiceLog]) === value;
    });

    return matchesSearch && matchesAdvancedFilters;
  });

  // --- Form ---
  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<LogFormData>({
    resolver: zodResolver(logSchema),
    defaultValues: { 
      equipmentId: '', serviceId: '', costCenter: '', notes: '',
      userId: CURRENT_USER_MOCK.id, 
      startDate: todayDate, endDate: todayDate, startTime: '', endTime: ''
    }
  });

  const selectedServiceId = useWatch({ control, name: "serviceId" });
  const selectedServiceDetails = services?.find(s => s.id === selectedServiceId);

  // --- Mutações ---
  const mutation = useMutation({
    mutationFn: async (data: LogFormData) => {
      if (editingId) return api.put(`/logs/${editingId}`, data);
      return api.post('/logs', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success(editingId ? "Apontamento atualizado!" : "Apontamento salvo!");
      handleCloseModal();
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao processar solicitação");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/logs/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      toast.success("Apontamento removido!");
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao remover apontamento.");
    }
  });

  // --- Handlers ---
  function handleOpenEdit(log: ServiceLog) {
    setEditingId(log.id);
    setEditingOsNumber(log.osNumber || null);
    setValue("costCenter", log.costCenter || "");
    setValue("equipmentId", log.equipmentId);
    setValue("serviceId", log.serviceId);
    setValue("userId", log.userId);
    setValue("startDate", log.startDate);
    setValue("startTime", log.startTime);
    setValue("endDate", log.endDate);
    setValue("endTime", log.endTime);
    setValue("notes", log.notes || "");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setEditingOsNumber(null);
    reset({
      userId: CURRENT_USER_MOCK.id, startDate: todayDate, endDate: todayDate, costCenter: '', equipmentId: '', serviceId: '', startTime: '', endTime: '', notes: ''
    });
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Apontamento",
      message: "Deseja realmente excluir este registro? Isso pode impactar relatórios e custos.",
      onConfirm: () => {
        deleteMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  // Helpers Visuais
  const getEquipName = (id: string) => equipments?.find(e => e.id === id)?.name || "Desconhecido";
  const getServiceName = (id: string) => services?.find(s => s.id === id)?.name || "Desconhecido";
  const getUserName = (id: string) => users?.find(u => u.id === id)?.name || "Desconhecido";

  function formatTimeDiff(startD: string, startT: string, endD: string, endT: string) {
    const start = new Date(`${startD}T${startT}`);
    const end = new Date(`${endD}T${endT}`);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0 || isNaN(diffMs)) return "Inválido";
    
    const diffMins = Math.floor(diffMs / 60000);
    const h = Math.floor(diffMins / 60);
    const m = diffMins % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
            <Clock className="text-blue-base" /> Apontamentos de Mão de Obra
          </h1>
          <p className="text-grayscale-400 text-sm">Registre e acompanhe as execuções de ordens de serviço</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all shadow-md cursor-pointer">
          <Plus size={20} /> Novo Apontamento
        </button>
      </header>

      {/* --- PESQUISA E FILTROS --- */}
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-grayscale-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por OS, equipamento ou observações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 h-12 rounded-xl border border-grayscale-200 bg-white shadow-sm focus:outline-none focus:border-blue-base focus:ring-1 focus:ring-blue-base transition-all text-sm box-border"
            />
          </div>
          
          <AdvancedFilter fields={filterOptions} activeFilters={activeFilters} onFilterChange={setActiveFilters} />
        </div>

        {Object.keys(activeFilters).length > 0 && (
          <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-blue-base/20 shadow-sm w-full">
            <span className="text-[10px] text-grayscale-400 font-bold uppercase tracking-widest flex items-center gap-2">
              <Filter size={14} /> Aplicados:
            </span>
            {Object.entries(activeFilters).map(([key, value]) => {
              const fieldLabel = filterOptions.find((f) => f.id === key)?.label || key;
              return (
                <div key={key} className="flex items-center gap-2 bg-blue-base/10 text-blue-base border border-blue-base/20 px-3 py-1.5 rounded-lg text-xs font-bold">
                  <span>{fieldLabel}: <span className="text-grayscale-600 font-medium ml-1">{value}</span></span>
                  <button onClick={() => { const newF = { ...activeFilters }; delete newF[key]; setActiveFilters(newF); }} className="hover:text-feedback-danger transition-colors cursor-pointer ml-1">
                    <X size={14} />
                  </button>
                </div>
              );
            })}
            <button onClick={() => setActiveFilters({})} className="text-xs font-bold text-grayscale-400 hover:text-grayscale-600 underline cursor-pointer ml-auto">
              Limpar todos
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden mt-2">
        <table className="w-full text-left">
          <thead className="bg-grayscale-50 border-b border-grayscale-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">OS / Data</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Equipamento</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Serviço Realizado</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Técnico</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Tempo Executado</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grayscale-200">
            {loadingLogs ? (
              <tr><td colSpan={6} className="px-6 py-10 text-center text-grayscale-400 font-medium">Carregando histórico...</td></tr>
            ) : filteredLogs?.length === 0 ? (
              <tr><td colSpan={6} className="px-6 py-20 text-center text-grayscale-400 italic">Nenhum apontamento encontrado.</td></tr>
            ) : filteredLogs?.map((item) => (
              <tr key={item.id} className="hover:bg-grayscale-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="font-bold text-grayscale-600">{item.osNumber ? `OS-${item.osNumber}` : 'Gerando...'}</div>
                  <div className="text-xs text-grayscale-400 flex items-center gap-1 mt-1">
                    <Calendar size={12} /> {item.startDate.split('-').reverse().join('/')}
                  </div>
                </td>
                <td className="px-6 py-4 font-medium text-sm text-grayscale-600">{getEquipName(item.equipmentId)}</td>
                <td className="px-6 py-4 text-sm text-grayscale-500">{getServiceName(item.serviceId)}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-blue-base/10 text-blue-base rounded text-xs font-bold uppercase">
                    {getUserName(item.userId).split(' ')[0]}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="font-bold text-grayscale-600">
                    {formatTimeDiff(item.startDate, item.startTime, item.endDate, item.endTime)}
                  </span>
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

      {/* --- MODAL DE APONTAMENTO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-40 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] flex flex-col">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50 shrink-0">
              <h2 className="font-bold text-grayscale-600 text-lg flex items-center gap-2">
                <FileText className="text-blue-base" /> {editingId ? 'Editar Apontamento' : 'Realizar Apontamento'}
              </h2>
              <button onClick={handleCloseModal} className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer transition-colors"><X size={20}/></button>
            </div>

            <div className="overflow-y-auto p-8">
              <form id="logForm" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-6">
                
                {/* Cabeçalho da Integração (Mostra CDC e, se for edição, a OS gerada) */}
                <div className="grid grid-cols-2 gap-5 p-5 bg-grayscale-50 rounded-xl border border-grayscale-200">
                  {editingId && editingOsNumber ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-grayscale-500 uppercase">Número da OS (Protheus)</label>
                      <div className="h-12 px-4 rounded-lg border border-grayscale-200 bg-grayscale-200 flex items-center text-sm font-bold text-grayscale-600">
                        OS-{editingOsNumber}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-grayscale-500 uppercase">Número da OS (Protheus)</label>
                      <div className="h-12 px-4 rounded-lg border border-dashed border-grayscale-300 bg-white flex items-center text-sm text-grayscale-400 italic">
                        Será gerado automaticamente ao salvar...
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-grayscale-500 uppercase">Centro de Custo <span className="text-feedback-danger">*</span></label>
                    <select {...register('costCenter')} className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-white">
                      <option value="">Selecione o CDC...</option>
                      {MOCK_COST_CENTERS.map(cdc => <option key={cdc} value={cdc}>{cdc}</option>)}
                    </select>
                    {errors.costCenter && <span className="text-xs text-feedback-danger">{errors.costCenter.message}</span>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-5">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-grayscale-500 uppercase">Equipamento / Peça <span className="text-feedback-danger">*</span></label>
                    <select {...register('equipmentId')} className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-white">
                      <option value="">Selecione...</option>
                      {equipments?.map(e => <option key={e.id} value={e.id}>{e.sku} - {e.name}</option>)}
                    </select>
                    {errors.equipmentId && <span className="text-xs text-feedback-danger">{errors.equipmentId.message}</span>}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-grayscale-500 uppercase">Técnico Executante <span className="text-feedback-danger">*</span></label>
                    <select 
                      {...register('userId')} 
                      disabled={CURRENT_USER_MOCK.role === 'TECHNICIAN'}
                      className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base disabled:bg-grayscale-100 disabled:opacity-70 bg-white"
                    >
                      {availableUsers?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
  <label className="text-xs font-bold text-grayscale-500 uppercase">
    Serviço Realizado <span className="text-feedback-danger">*</span>
  </label>
  <select 
    {...register('serviceId')} 
    className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-white"
  >
    {/* Debug visual para você saber se o array está chegando */}
    {!services || services.length === 0 ? (
      <option value="">Carregando serviços ou lista vazia...</option>
    ) : (
      <>
        <option value="">Selecione a atividade padrão...</option>
        {services.map(s => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </>
    )}
  </select>
  {errors.serviceId && <span className="text-xs text-feedback-danger">{errors.serviceId.message}</span>}
  
  {selectedServiceDetails && (
    <span className="text-[10px] text-blue-base font-bold mt-1 px-2">
      Tempo estimado no catálogo: {Math.floor(selectedServiceDetails.estimatedTime / 60)}h {selectedServiceDetails.estimatedTime % 60}m
    </span>
  )}
</div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                  <Input type="date" label="Data de Início" {...register('startDate')} error={errors.startDate?.message} />
                  <Input type="time" label="Hora de Início" {...register('startTime')} error={errors.startTime?.message} />
                  <Input type="date" label="Data de Fim" {...register('endDate')} error={errors.endDate?.message} />
                  <Input type="time" label="Hora de Fim" {...register('endTime')} error={errors.endTime?.message} />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-grayscale-500 uppercase">Observações / Justificativas</label>
                  <textarea 
                    {...register('notes')} 
                    placeholder="Descreva particularidades do serviço executado..."
                    className="p-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base min-h-[100px] resize-y bg-white"
                  />
                </div>
              </form>
            </div>

            <div className="p-6 border-t border-grayscale-100 bg-grayscale-50 flex gap-3 shrink-0">
              <button type="button" onClick={handleCloseModal} className="flex-1 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-white transition-all cursor-pointer">Cancelar</button>
              <button type="submit" form="logForm" disabled={mutation.isPending} className="flex-1 py-3 bg-blue-base text-white rounded-lg font-bold hover:bg-blue-dark transition-all shadow-md cursor-pointer">
                {mutation.isPending ? 'Salvando...' : 'Confirmar Apontamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL CONFIRMAÇÃO --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-grayscale-100 flex items-center gap-3 bg-feedback-danger/10 text-feedback-danger">
              <AlertTriangle size={24} /> <h2 className="font-bold text-lg">{confirmDialog.title}</h2>
            </div>
            <div className="p-6 text-grayscale-600 font-medium">{confirmDialog.message}</div>
            <div className="p-6 border-t border-grayscale-100 bg-grayscale-50 flex gap-3">
              <button type="button" onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} className="flex-1 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-white transition-all cursor-pointer">Cancelar</button>
              <button type="button" onClick={confirmDialog.onConfirm} className="flex-1 py-3 bg-feedback-danger text-white rounded-lg font-bold hover:bg-feedback-danger/90 transition-all shadow-md cursor-pointer">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}