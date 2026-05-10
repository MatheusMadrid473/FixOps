import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/axios';

interface Log {
  id: string;
  description: string;
  technicianName: string;
  equipmentName: string;
  groupName: string;
  quantity: number;
  totalCost: number;
  createdAt: string;
}

export function LogsTable() {
  const { data: logs, isLoading } = useQuery<Log[]>({
    queryKey: ['logs'],
    queryFn: () => api.get('/logs').then(res => res.data),
  });

  if (isLoading) return <p className="text-grayscale-400 italic">Carregando histórico...</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead className="bg-grayscale-50 border-b border-grayscale-200">
          <tr>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-grayscale-400">Data</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-grayscale-400">Técnico/Grupo</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-grayscale-400">Equipamento</th>
            <th className="px-4 py-3 text-[10px] font-bold uppercase text-grayscale-400">Custo Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-grayscale-100">
          {logs?.map((log) => (
            <tr key={log.id} className="hover:bg-grayscale-50/50">
              <td className="px-4 py-4 text-xs text-grayscale-500">
                {new Date(log.createdAt).toLocaleDateString('pt-BR')}
              </td>
              <td className="px-4 py-4">
                <p className="text-sm font-semibold text-grayscale-600">{log.technicianName}</p>
                <p className="text-[10px] text-grayscale-400 uppercase">{log.groupName}</p>
              </td>
              <td className="px-4 py-4">
                <p className="text-sm text-grayscale-600">{log.equipmentName}</p>
                <p className="text-[10px] text-grayscale-400">Qtd: {log.quantity}</p>
              </td>
              <td className="px-4 py-4 text-sm font-bold text-blue-base">
                {(log.totalCost / 100).toLocaleString('pt-br', { style: 'currency', currency: 'BRL' })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}