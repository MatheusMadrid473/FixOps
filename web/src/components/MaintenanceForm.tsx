import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';
import { Input } from './Input';

// Interfaces para tipagem rigorosa (Resolução de erros do ESLint)
interface User {
  id: string;
  name: string;
  role: string;
}

interface Equipment {
  id: string;
  name: string;
  unitCost: number;
}

interface Group {
  id: string;
  name: string;
  leaderId: string;
}

const logSchema = z.object({
  description: z.string().min(5, "Descreva brevemente a manutenção"),
  technicianId: z.string().uuid("Selecione um técnico"),
  groupId: z.string().uuid("Selecione um grupo"),
  equipmentId: z.string().uuid("Selecione um equipamento"),
  quantity: z.number().min(1, "Mínimo de 1 unidade"),
});

type LogData = z.infer<typeof logSchema>;

export function MaintenanceForm() {
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, reset, formState: { errors } } = useForm<LogData>({
    resolver: zodResolver(logSchema),
    defaultValues: {
      quantity: 1
    }
  });

  // Consultas de dados com tipagem explícita
  const { data: users } = useQuery<User[]>({ 
    queryKey: ['users'], 
    queryFn: () => api.get('/users').then(res => res.data) 
  });

  const { data: equipments } = useQuery<Equipment[]>({ 
    queryKey: ['equipments'], 
    queryFn: () => api.get('/equipments').then(res => res.data) 
  });

  const { data: groups } = useQuery<Group[]>({ 
    queryKey: ['groups'], 
    queryFn: () => api.get('/groups').then(res => res.data) 
  });

  // Mutação para salvar a Ordem de Serviço (OS)
  const mutation = useMutation({
    mutationFn: (data: LogData) => api.post('/logs', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['logs'] });
      reset();
      alert("Apontamento realizado com sucesso!");
    },
    onError: (error) => {
      console.error('[Mutation Error]:', error);
      alert("Erro ao salvar apontamento. Verifique o console.");
    }
  });

  return (
    <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="md:col-span-2">
        <Input 
          label="Descrição do Serviço" 
          placeholder="Ex: Troca de óleo, reparo na suspensão..." 
          {...register('description')} 
          error={errors.description?.message} 
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase text-grayscale-500 tracking-wider">
          Técnico Responsável
        </label>
        <select 
          {...register('technicianId')} 
          className="w-full px-4 py-3 rounded-lg border border-grayscale-200 bg-white text-sm text-grayscale-600 outline-none focus:border-blue-base transition-all"
        >
          <option value="">Selecione o técnico</option>
          {users?.map((u) => (
            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
          ))}
        </select>
        {errors.technicianId && <span className="text-feedback-danger text-xs font-semibold">{errors.technicianId.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase text-grayscale-500 tracking-wider">
          Equipamento / Implemento
        </label>
        <select 
          {...register('equipmentId')} 
          className="w-full px-4 py-3 rounded-lg border border-grayscale-200 bg-white text-sm text-grayscale-600 outline-none focus:border-blue-base transition-all"
        >
          <option value="">Selecione o item</option>
          {equipments?.map((e) => (
            <option key={e.id} value={e.id}>{e.name}</option>
          ))}
        </select>
        {errors.equipmentId && <span className="text-feedback-danger text-xs font-semibold">{errors.equipmentId.message}</span>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase text-grayscale-500 tracking-wider">
          Grupo / Equipe
        </label>
        <select 
          {...register('groupId')} 
          className="w-full px-4 py-3 rounded-lg border border-grayscale-200 bg-white text-sm text-grayscale-600 outline-none focus:border-blue-base transition-all"
        >
          <option value="">Selecione o grupo</option>
          {groups?.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>
        {errors.groupId && <span className="text-feedback-danger text-xs font-semibold">{errors.groupId.message}</span>}
      </div>

      <Input 
        label="Quantidade" 
        type="number" 
        {...register('quantity', { valueAsNumber: true })} 
        error={errors.quantity?.message} 
      />

      <button 
        type="submit" 
        disabled={mutation.isPending}
        className="md:col-span-2 bg-blue-base text-white font-bold py-4 rounded-lg hover:bg-blue-dark transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
      >
        {mutation.isPending ? 'Processando...' : 'Confirmar Apontamento'}
      </button>
    </form>
  );
}