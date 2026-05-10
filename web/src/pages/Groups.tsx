import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Users, Plus, X, Trash2, Edit3, Search, ShieldCheck, UserCircle, UserPlus, UserMinus, Filter, AlertTriangle } from "lucide-react";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { api } from "../lib/axios";
import { Input } from "../components/Input";
import { toast } from "sonner";
import { AdvancedFilter, type FilterOption } from "../components/AdvancedFilter";

// --- Tipagem e Validação ---

interface Group {
  id: string;
  name: string;
  specialties: string[];
  leaderId?: string | null;
}

interface User {
  id: string;
  name: string;
  role: string;
  groupId?: string | null;
}

interface ApiError {
  message: string;
}

const groupSchema = z.object({
  name: z.string().min(3, "O nome do time deve ter no mínimo 3 caracteres"),
  specialties: z.array(z.string()).min(1, "Selecione ao menos uma especialidade"),
  leaderId: z.string().optional().nullable(),
});

type GroupFormData = z.infer<typeof groupSchema>;

const SPECIALTIES = ["MECÂNICA PESADA", "MECÂNICA LEVE", "ELÉTRICA", "BORRACHARIA", "LUBRIFICAÇÃO", "APOIO/RESGATE"];

const filterOptions: FilterOption[] = [
  { id: "specialty", label: "Especialidade", options: SPECIALTIES },
];

export function Groups() {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});
  
  const [selectedNewMemberId, setSelectedNewMemberId] = useState<string>("");

  // Estado para o Modal de Confirmação Customizado
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmar",
    onConfirm: () => {}
  });

  const { data: groups, isLoading } = useQuery<Group[]>({
    queryKey: ['groups'],
    queryFn: () => api.get('/groups').then(res => res.data),
  });

  const { data: users } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
  });

  const filteredGroups = groups?.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = item.name.toLowerCase().includes(searchLower);

    const matchesAdvancedFilters = Object.entries(activeFilters).every(([key, value]) => {
      if (key === 'specialty') {
        return item.specialties?.includes(value);
      }
      return String(item[key as keyof Group]) === value;
    });

    return matchesSearch && matchesAdvancedFilters;
  });

  const { register, handleSubmit, reset, setValue, control, formState: { errors } } = useForm<GroupFormData>({
    resolver: zodResolver(groupSchema) as Resolver<GroupFormData>,
    defaultValues: { name: '', specialties: [], leaderId: '' }
  });

  const currentSpecialties = useWatch({ control, name: "specialties" }) || [];
  const currentLeaderId = useWatch({ control, name: "leaderId" });

  // --- Mutações ---
  const mutation = useMutation({
    mutationFn: async (data: GroupFormData) => {
      const payload = {
        ...data,
        leaderId: data.leaderId || null,
      };

      if (editingId) return api.put(`/groups/${editingId}`, payload);
      return api.post('/groups', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(editingId ? "Equipe atualizada!" : "Equipe cadastrada!");
      handleCloseModal();
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao processar solicitação");
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/groups/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Equipe removida!");
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao remover equipe.");
    }
  });

  const updateMemberMutation = useMutation({
    mutationFn: async ({ userId, groupId }: { userId: string; groupId: string | null }) => {
      return api.patch(`/users/${userId}/group`, { groupId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Quadro de membros atualizado!");
      setSelectedNewMemberId("");
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao atualizar membro.");
    }
  });

  // --- Lógica de Membros ---
  const currentMembers = users?.filter(u => u.groupId === editingId) || [];
  const availableUsers = users?.filter(u => u.groupId !== editingId) || [];

  function handleAddMember() {
    if (!selectedNewMemberId || !editingId) return;
    updateMemberMutation.mutate({ userId: selectedNewMemberId, groupId: editingId });
  }

  // --- Handlers Customizados de Confirmação ---
  function handleRemoveMember(userId: string, userName: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Remover Técnico",
      message: `Deseja realmente remover ${userName} desta equipe?`,
      confirmText: "Remover",
      onConfirm: () => {
        updateMemberMutation.mutate({ userId, groupId: null });
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  function handleDelete(id: string) {
    setConfirmDialog({
      isOpen: true,
      title: "Excluir Equipe",
      message: "Deseja realmente excluir esta equipe? Os técnicos vinculados perderão a associação atual.",
      confirmText: "Excluir Equipe",
      onConfirm: () => {
        deleteMutation.mutate(id);
        setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      }
    });
  }

  // --- Handlers de Formulário ---
  function handleOpenEdit(group: Group) {
    setEditingId(group.id);
    setValue("name", group.name);
    setValue("specialties", group.specialties);
    setValue("leaderId", group.leaderId || "");
    setSelectedNewMemberId("");
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setEditingId(null);
    setSelectedNewMemberId("");
    reset();
  }

  function getLeaderName(leaderId?: string | null) {
    if (!leaderId || !users) return "Sem líder definido";
    const leader = users.find(u => u.id === leaderId);
    return leader ? leader.name : "Líder não encontrado";
  }

  function toggleSpecialty(spec: string) {
    if (currentSpecialties.includes(spec)) {
      setValue("specialties", currentSpecialties.filter(s => s !== spec), { shouldValidate: true });
    } else {
      setValue("specialties", [...currentSpecialties, spec], { shouldValidate: true });
    }
  }

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
            <Users className="text-blue-base" /> Equipes de Trabalho
          </h1>
          <p className="text-grayscale-400 text-sm">Gerencie os times de manutenção e suas responsabilidades</p>
        </div>
        
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all shadow-md cursor-pointer">
          <Plus size={20} /> Nova Equipe
        </button>
      </header>

      {/* --- AÇÕES DE PESQUISA E FILTRO --- */}
      <div className="mb-6 flex flex-col gap-4 w-full">
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-grayscale-400" size={20} />
            <input
              type="text"
              placeholder="Buscar pelo nome da equipe..."
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
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Nome da Equipe</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Especialidades</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Líder Responsável</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Membros</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grayscale-200">
            {isLoading ? (
              <tr><td colSpan={5} className="px-6 py-10 text-center text-grayscale-400 font-medium">Carregando equipes...</td></tr>
            ) : filteredGroups?.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center text-grayscale-400 italic">
                  Nenhuma equipe encontrada.
                </td>
              </tr>
            ) : filteredGroups?.map((item) => {
              const memberCount = users?.filter(u => u.groupId === item.id).length || 0;
              return (
                <tr key={item.id} className="hover:bg-grayscale-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-grayscale-600 flex items-center gap-2">
                      <ShieldCheck size={16} className="text-blue-base" />
                      {item.name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1.5">
                      {item.specialties?.map(spec => (
                        <span key={spec} className="px-2 py-1 bg-grayscale-100 border border-grayscale-200 rounded text-[10px] font-bold text-grayscale-500 uppercase">
                          {spec}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-grayscale-500 font-medium">
                      <UserCircle size={16} className={item.leaderId ? "text-blue-base/70" : "text-grayscale-300"} />
                      {getLeaderName(item.leaderId)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-grayscale-500">{memberCount}</span>
                    <span className="text-xs text-grayscale-400 ml-1">técnicos</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                     <div className="flex justify-end gap-2">
                      <button onClick={() => handleOpenEdit(item)} className="text-grayscale-400 hover:text-blue-base p-2 transition-colors cursor-pointer"><Edit3 size={18} /></button>
                      <button onClick={() => handleDelete(item.id)} className="text-grayscale-400 hover:text-feedback-danger p-2 transition-colors cursor-pointer"><Trash2 size={18} /></button>
                     </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE CADASTRO/EDIÇÃO --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center z-40 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50 shrink-0">
              <h2 className="font-bold text-grayscale-600 text-lg">
                {editingId ? 'Gerenciar Equipe' : 'Nova Equipe'}
              </h2>
              <button onClick={handleCloseModal} className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer transition-colors"><X size={20}/></button>
            </div>

            <div className="overflow-y-auto p-8 flex flex-col gap-6">
              <form id="groupForm" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-6">
                
                <div className="grid grid-cols-2 gap-5">
                  <Input 
                    label="Nome da Equipe" 
                    placeholder="Ex: Oficina Móvel Alpha" 
                    {...register('name')} 
                    error={errors.name?.message} 
                  />

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-grayscale-500 uppercase">Líder da Equipe</label>
                    <select 
                      {...register('leaderId')} 
                      className="h-12 px-4 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-grayscale-50"
                    >
                      <option value="">Sem líder definido</option>
                      {users?.map(user => (
                        <option key={user.id} value={user.id}>{user.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-grayscale-500 uppercase">
                    Especialidades <span className="text-feedback-danger">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SPECIALTIES.map(spec => {
                      const isSelected = currentSpecialties.includes(spec);
                      return (
                        <button
                          type="button"
                          key={spec}
                          onClick={() => toggleSpecialty(spec)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-base text-white border-blue-base shadow-sm' 
                              : 'bg-white text-grayscale-500 border-grayscale-200 hover:bg-grayscale-50'
                          }`}
                        >
                          {spec}
                        </button>
                      )
                    })}
                  </div>
                  {errors.specialties && (
                    <span className="text-xs text-feedback-danger mt-1">{errors.specialties.message}</span>
                  )}
                </div>
              </form>

              {/* --- GESTÃO DE MEMBROS (Apenas na Edição) --- */}
              {editingId && (
                <div className="mt-2 pt-6 border-t border-grayscale-200 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-grayscale-500" />
                    <h3 className="font-bold text-grayscale-600">Quadro de Membros</h3>
                  </div>

                  {/* Adicionar novo membro */}
                  <div className="flex gap-3 items-end p-4 bg-grayscale-50 rounded-xl border border-grayscale-200">
                    <div className="flex flex-col gap-1.5 flex-1">
                      <label className="text-[10px] font-bold text-grayscale-400 uppercase">Adicionar Técnico à Equipe</label>
                      <select 
                        value={selectedNewMemberId}
                        onChange={(e) => setSelectedNewMemberId(e.target.value)}
                        className="h-10 px-3 rounded-lg border border-grayscale-200 text-sm focus:outline-blue-base bg-white"
                      >
                        <option value="">Selecione um técnico disponível...</option>
                        {availableUsers.map(u => (
                          <option key={u.id} value={u.id}>{u.name} {u.groupId ? '(Mover de outra equipe)' : ''}</option>
                        ))}
                      </select>
                    </div>
                    <button 
                      type="button"
                      onClick={handleAddMember}
                      disabled={!selectedNewMemberId || updateMemberMutation.isPending}
                      className="h-10 px-4 bg-blue-base text-white rounded-lg text-sm font-bold hover:bg-blue-dark transition-all disabled:opacity-50 cursor-pointer flex items-center gap-2"
                    >
                      <UserPlus size={16} /> Adicionar
                    </button>
                  </div>

                  {/* Lista de Membros Atuais */}
                  <div className="flex flex-col gap-2 mt-2">
                    {currentMembers.length === 0 ? (
                      <div className="text-center py-6 text-grayscale-400 text-sm italic bg-white border border-grayscale-100 rounded-xl">
                        Nenhum técnico alocado nesta equipe.
                      </div>
                    ) : (
                      currentMembers.map(member => (
                        <div key={member.id} className="flex justify-between items-center p-3 bg-white border border-grayscale-200 rounded-xl hover:border-blue-base/30 transition-colors shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-base/10 flex items-center justify-center text-blue-base font-bold text-xs uppercase">
                              {member.name.substring(0, 2)}
                            </div>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-grayscale-600">{member.name}</span>
                              <span className="text-[10px] font-bold text-grayscale-400 uppercase">{member.role}</span>
                            </div>
                          </div>
                          
                          {/* Verifica se o membro é o líder usando a constante memoizada */}
                          {member.id === currentLeaderId ? (
                            <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded uppercase">Líder</span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRemoveMember(member.id, member.name)}
                              disabled={updateMemberMutation.isPending}
                              className="text-grayscale-400 hover:text-feedback-danger p-2 transition-colors cursor-pointer disabled:opacity-50"
                              title="Remover da equipe"
                            >
                              <UserMinus size={16} />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé fixo com os botões de ação do formulário principal */}
            <div className="p-6 border-t border-grayscale-100 bg-grayscale-50 flex gap-3 shrink-0">
              <button type="button" onClick={handleCloseModal} className="flex-1 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-white transition-all cursor-pointer bg-transparent">Cancelar</button>
              <button type="submit" form="groupForm" disabled={mutation.isPending} className="flex-1 py-3 bg-blue-base text-white rounded-lg font-bold hover:bg-blue-dark transition-all shadow-md cursor-pointer">
                {mutation.isPending ? 'Salvando...' : 'Salvar Equipe'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE CONFIRMAÇÃO CUSTOMIZADO --- */}
      {confirmDialog.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all">
            <div className="p-6 border-b border-grayscale-100 flex items-center gap-3 bg-feedback-danger/10 text-feedback-danger">
              <AlertTriangle size={24} />
              <h2 className="font-bold text-lg">{confirmDialog.title}</h2>
            </div>
            
            <div className="p-6">
              <p className="text-grayscale-600 font-medium">{confirmDialog.message}</p>
            </div>
            
            <div className="p-6 border-t border-grayscale-100 bg-grayscale-50 flex gap-3">
              <button 
                type="button" 
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))} 
                className="flex-1 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-white transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="button" 
                onClick={confirmDialog.onConfirm} 
                className="flex-1 py-3 bg-feedback-danger text-white rounded-lg font-bold hover:bg-feedback-danger/90 transition-all shadow-md cursor-pointer"
              >
                {confirmDialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}