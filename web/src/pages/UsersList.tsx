import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Plus, X, ShieldCheck, UserCog, Hammer } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { api } from "../lib/axios";
import { Input } from "../components/Input";
import { toast } from "sonner";

interface User {
  id: string;
  name: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'TECHNICIAN';
}

interface ApiError {
  message: string;
}

const userSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  username: z.string().min(3, "Username muito curto"),
  email: z.string().email("E-mail inválido"),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN']),
});

const createUserSchema = userSchema.extend({
  password: z.string().min(6, "Mínimo 6 caracteres"),
});

type UserFormData = z.infer<typeof createUserSchema>;
type EditFormData = z.infer<typeof userSchema>;

export function UsersList() {
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
  });

  const createForm = useForm<UserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: 'TECHNICIAN' }
  });

  const editForm = useForm<EditFormData>({
    resolver: zodResolver(userSchema),
  });

  const createMutation = useMutation({
    mutationFn: (data: UserFormData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Usuário cadastrado!");
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao cadastrar");
    }
  });

  const updateMutation = useMutation({
    mutationFn: (data: EditFormData) => api.put(`/users/${editingUser?.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Informações atualizadas!");
      setEditingUser(null);
    },
    onError: (err: AxiosError<ApiError>) => {
      toast.error(err.response?.data?.message || "Erro ao atualizar");
    }
  });

  function handleOpenEdit(user: User) {
    setEditingUser(user);
    editForm.reset({
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role
    });
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <span className="flex items-center gap-1 text-blue-base font-bold text-[10px]"><ShieldCheck size={12}/> ADMIN</span>;
      case 'MANAGER': return <span className="flex items-center gap-1 text-grayscale-500 font-bold text-[10px]"><UserCog size={12}/> GESTOR</span>;
      default: return <span className="flex items-center gap-1 text-grayscale-400 font-bold text-[10px]"><Hammer size={12}/> TÉCNICO</span>;
    }
  };

  return (
    <div className="p-10 w-full max-w-[1600px] mx-auto">
      <header className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
            <UserPlus className="text-blue-base" /> Gestão de Usuários
          </h1>
          <p className="text-grayscale-400 text-sm">Gerencie acessos e permissões da equipe FixOps</p>
        </div>
        
        <button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all cursor-pointer shadow-md"
        >
          <Plus size={20} /> Novo Colaborador
        </button>
      </header>

      <div className="bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-grayscale-50 border-b border-grayscale-200">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Nome</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Username</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Cargo</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grayscale-200">
            {isLoading ? (
              <tr><td colSpan={4} className="px-6 py-10 text-center text-grayscale-400">Carregando...</td></tr>
            ) : users?.map((u) => (
              <tr key={u.id} className="hover:bg-grayscale-50/50 transition-colors text-sm">
                <td className="px-6 py-4">
                  <div className="font-medium text-grayscale-600">{u.name}</div>
                  <div className="text-xs text-grayscale-400">{u.email}</div>
                </td>
                <td className="px-6 py-4 text-grayscale-500 font-mono">@{u.username}</td>
                <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                <td className="px-6 py-4 text-right">
                  <button onClick={() => handleOpenEdit(u)} className="text-grayscale-400 hover:text-blue-base transition-colors p-2 cursor-pointer">
                    <UserCog size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Cadastro */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center">
              <h2 className="font-bold text-grayscale-600 text-lg">Novo Usuário</h2>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-grayscale-400 cursor-pointer"><X size={20}/></button>
            </div>
            <form onSubmit={createForm.handleSubmit((data) => createMutation.mutate(data))} className="p-8 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Nome Completo" {...createForm.register('name')} error={createForm.formState.errors.name?.message} />
              </div>
              <Input label="Username" {...createForm.register('username')} error={createForm.formState.errors.username?.message} />
              <Input label="E-mail" {...createForm.register('email')} error={createForm.formState.errors.email?.message} />
              <Input label="Senha" type="password" {...createForm.register('password')} error={createForm.formState.errors.password?.message} />
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-grayscale-500 uppercase">Cargo</label>
                <select {...createForm.register('role')} className="h-11 px-4 rounded-lg border border-grayscale-200 bg-grayscale-50 text-sm outline-none focus:border-blue-base">
                  <option value="TECHNICIAN">Técnico</option>
                  <option value="MANAGER">Gestor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={createMutation.isPending} className="col-span-2 bg-blue-base text-white py-3 rounded-lg font-bold mt-4 cursor-pointer hover:bg-blue-dark">
                {createMutation.isPending ? 'Salvando...' : 'Cadastrar'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edição */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center">
              <h2 className="font-bold text-grayscale-600 text-lg">Editar Colaborador</h2>
              <button onClick={() => setEditingUser(null)} className="text-grayscale-400 cursor-pointer"><X size={20}/></button>
            </div>
            <form onSubmit={editForm.handleSubmit((data) => updateMutation.mutate(data))} className="p-8 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Nome Completo" {...editForm.register('name')} error={editForm.formState.errors.name?.message} />
              </div>
              <Input label="Username" {...editForm.register('username')} error={editForm.formState.errors.username?.message} />
              <Input label="E-mail" {...editForm.register('email')} error={editForm.formState.errors.email?.message} />
              <div className="flex flex-col gap-2 col-span-2">
                <label className="text-xs font-bold text-grayscale-500 uppercase">Cargo</label>
                <select {...editForm.register('role')} className="h-11 px-4 rounded-lg border border-grayscale-200 bg-grayscale-50 text-sm outline-none focus:border-blue-base">
                  <option value="TECHNICIAN">Técnico</option>
                  <option value="MANAGER">Gestor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>
              <button type="submit" disabled={updateMutation.isPending} className="col-span-2 bg-blue-base text-white py-3 rounded-lg font-bold mt-4 cursor-pointer hover:bg-blue-dark">
                {updateMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}