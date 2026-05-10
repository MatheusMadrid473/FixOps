import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  UserPlus, 
  Plus, 
  X, 
  ShieldCheck, 
  UserCog, 
  Hammer 
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AxiosError } from "axios";
import { api } from "../lib/axios";
import { Input } from "../components/Input";
import { toast } from "sonner";

// --- Tipagem e Validação ---

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
  password: z.string().min(6, "Mínimo 6 caracteres"),
  role: z.enum(['ADMIN', 'MANAGER', 'TECHNICIAN']),
});

type UserFormData = z.infer<typeof userSchema>;

export function UsersList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // --- Queries & Mutations ---

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => api.get('/users').then(res => res.data),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: { role: 'TECHNICIAN' }
  });

  const mutation = useMutation({
    mutationFn: (data: UserFormData) => api.post('/users', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success("Usuário cadastrado com sucesso!");
      setIsModalOpen(false);
      reset();
    },
    onError: (err: AxiosError<ApiError>) => {
      const message = err.response?.data?.message || "Erro ao cadastrar usuário";
      toast.error(message);
    }
  });

  // --- UI Helpers ---

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN': return <span className="flex items-center gap-1 text-blue-base font-bold text-[10px]"><ShieldCheck size={12}/> ADMIN</span>;
      case 'MANAGER': return <span className="flex items-center gap-1 text-grayscale-500 font-bold text-[10px]"><UserCog size={12}/> GESTOR</span>;
      default: return <span className="flex items-center gap-1 text-grayscale-400 font-bold text-[10px]"><Hammer size={12}/> TÉCNICO</span>;
    }
  };

  return (
    <div className="min-h-screen bg-grayscale-100 p-10 ml-64">
      <div className="max-w-6xl mx-auto">
        <button 
          onClick={() => navigate('/dashboard')} 
          className="flex items-center gap-2 text-grayscale-400 hover:text-grayscale-600 mb-8 transition-colors cursor-pointer font-medium"
        >
          <ArrowLeft size={20} /> Painel Principal
        </button>

        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3 tracking-tight">
              <UserPlus className="text-blue-base" /> Gestão de Usuários
            </h1>
            <p className="text-grayscale-400 text-sm">Gerencie acessos e permissões da equipe FixOps</p>
          </div>
          
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-base text-white px-6 py-3 rounded-lg font-bold flex items-center gap-2 hover:bg-blue-dark transition-all cursor-pointer shadow-md"
          >
            <Plus size={20} /> Novo Colaborador
          </button>
        </header>

        {/* Tabela de Usuários */}
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
                <tr><td colSpan={4} className="px-6 py-10 text-center text-grayscale-400">Carregando usuários...</td></tr>
              ) : users?.map((u) => (
                <tr key={u.id} className="hover:bg-grayscale-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-grayscale-600">{u.name}</div>
                    <div className="text-xs text-grayscale-400">{u.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-grayscale-500 font-mono">@{u.username}</td>
                  <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-grayscale-400 hover:text-blue-base transition-colors p-2 cursor-pointer">
                      <UserCog size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-grayscale-200 overflow-hidden">
            <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50">
              <h2 className="font-bold text-grayscale-600 text-lg">Cadastrar Novo Usuário</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-8 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Input label="Nome Completo" placeholder="Ex: João Silva" {...register('name')} error={errors.name?.message} />
              </div>
              <Input label="Username" placeholder="joao.silva" {...register('username')} error={errors.username?.message} />
              <Input label="E-mail" type="email" placeholder="joao@empresa.com" {...register('email')} error={errors.email?.message} />
              <Input label="Senha Inicial" type="password" placeholder="••••••" {...register('password')} error={errors.password?.message} />
              
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-grayscale-500 uppercase">Cargo / Role</label>
                <select 
                  {...register('role')}
                  className="h-11 px-4 rounded-lg border border-grayscale-200 bg-grayscale-50 text-sm outline-none focus:border-blue-base transition-all"
                >
                  <option value="TECHNICIAN">Técnico</option>
                  <option value="MANAGER">Gestor</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div className="col-span-2 flex gap-3 mt-6">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-grayscale-50 cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex-1 px-4 py-3 bg-blue-base text-white rounded-lg font-bold hover:bg-blue-dark transition-all disabled:opacity-50 cursor-pointer"
                >
                  {mutation.isPending ? 'Salvando...' : 'Cadastrar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}