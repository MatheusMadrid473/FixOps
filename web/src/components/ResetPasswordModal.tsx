import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { X } from 'lucide-react';
import { api } from '../lib/axios';
import { Input } from './Input';
import { AxiosError } from 'axios';
import { toast } from 'sonner';

const resetSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z.string().min(6, "A nova senha deve ter no mínimo 6 caracteres"),
  confirmPassword: z.string()
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não conferem",
  path: ["confirmPassword"],
});

type ResetData = z.infer<typeof resetSchema>;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface ApiError {
  message: string;
}

export function ResetPasswordModal({ isOpen, onClose }: Props) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ResetData>({
    resolver: zodResolver(resetSchema),
  });

  const mutation = useMutation({
    mutationFn: (data: ResetData) => {
      const savedUser = localStorage.getItem("fixops:user");
      const user = savedUser ? JSON.parse(savedUser) : null;

      if (!user?.username) {
        throw new Error("Usuário não identificado. Tente fazer login novamente.");
      }

      return api.patch('/users/update-password', {
        username: user.username,
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
      reset();
      onClose();
    },
    onError: (err: AxiosError<ApiError>) => {
      const message = err.response?.data?.message || err.message || "Erro ao alterar senha.";
      toast.error(message);
    }
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-grayscale-200 overflow-hidden">
        <div className="p-6 border-b border-grayscale-100 flex justify-between items-center bg-grayscale-50">
          <h2 className="font-bold text-grayscale-600 text-lg tracking-tight">Alterar minha senha</h2>
          <button 
            onClick={onClose} 
            className="text-grayscale-400 hover:text-grayscale-600 cursor-pointer p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-6 flex flex-col gap-4">
          <Input 
            label="Senha Atual" 
            type="password" 
            placeholder="••••••" 
            {...register('currentPassword')} 
            error={errors.currentPassword?.message} 
          />
          
          <div className="h-px bg-grayscale-100 my-1 w-full" />

          <Input 
            label="Nova Senha" 
            type="password" 
            placeholder="••••••" 
            {...register('newPassword')} 
            error={errors.newPassword?.message} 
          />

          <Input 
            label="Confirmar Nova Senha" 
            type="password" 
            placeholder="••••••" 
            {...register('confirmPassword')} 
            error={errors.confirmPassword?.message} 
          />

          <div className="flex gap-3 mt-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-4 py-3 border border-grayscale-200 rounded-lg font-bold text-grayscale-500 hover:bg-grayscale-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={mutation.isPending} 
              className="flex-1 px-4 py-3 bg-blue-base text-white rounded-lg font-bold hover:bg-blue-dark transition-all disabled:opacity-50 cursor-pointer shadow-md"
            >
              {mutation.isPending ? 'Salvando...' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}