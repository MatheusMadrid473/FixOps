import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ClipboardList, Plus, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import { Input } from '../components/Input';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  description: string;
}

const serviceSchema = z.object({
  name: z.string().min(3, "Nome do serviço é obrigatório"),
  description: z.string().optional(),
});

type ServiceData = z.infer<typeof serviceSchema>;

export function Services() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ServiceData>({
    resolver: zodResolver(serviceSchema),
  });

  const { data: services, isLoading } = useQuery<Service[]>({
    queryKey: ['services'],
    queryFn: () => api.get('/services').then(res => res.data),
  });

  const mutation = useMutation({
    mutationFn: (data: ServiceData) => api.post('/services', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success("Serviço cadastrado!");
      reset();
    },
  });

  return (
    <div className="min-h-screen bg-grayscale-100 p-10">
      <div className="max-w-4xl mx-auto">
        <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-grayscale-400 hover:text-grayscale-600 mb-8 transition-colors cursor-pointer">
          <ArrowLeft size={20} /> Voltar ao Dashboard
        </button>

        <header className="mb-10">
          <h1 className="text-3xl font-bold text-grayscale-600 flex items-center gap-3">
            <ClipboardList className="text-blue-base" /> Catálogo de Serviços
          </h1>
          <p className="text-grayscale-400">Defina os tipos de manutenção realizados na oficina</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-xl border border-grayscale-200 shadow-sm h-fit">
            <h2 className="font-bold text-grayscale-600 mb-6 flex items-center gap-2"><Plus size={18} /> Novo Serviço</h2>
            <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="flex flex-col gap-4">
              <Input label="Nome do Serviço" placeholder="Ex: Lavagem Técnica" {...register('name')} error={errors.name?.message} />
              <Input label="Descrição (Opcional)" placeholder="Ex: Limpeza interna e externa" {...register('description')} />
              <button type="submit" disabled={mutation.isPending} className="bg-blue-base text-white font-bold py-3 rounded-lg hover:bg-blue-dark transition-all disabled:opacity-50 cursor-pointer">
                {mutation.isPending ? 'Salvando...' : 'Cadastrar'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl border border-grayscale-200 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-grayscale-50 border-b border-grayscale-200">
                <tr>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Serviço</th>
                  <th className="px-6 py-4 text-[10px] font-bold uppercase text-grayscale-400">Descrição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-grayscale-200">
                {isLoading ? (
                  <tr><td colSpan={2} className="px-6 py-10 text-center text-grayscale-400">Carregando...</td></tr>
                ) : services?.map((s) => (
                  <tr key={s.id} className="hover:bg-grayscale-50/50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-grayscale-600">{s.name}</td>
                    <td className="px-6 py-4 text-sm text-grayscale-500">{s.description || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}