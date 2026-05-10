import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/axios';
import { Input } from '../components/Input';

const loginSchema = z.object({
  username: z.string().min(3, 'Usuário muito curto'), // Validação simplificada
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
});

type LoginData = z.infer<typeof loginSchema>;

export function Login() {
  const navigate = useNavigate();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  async function handleLogin(data: LoginData) {
    try {
      const response = await api.post('/login', data);
      const { token, user } = response.data;

      localStorage.setItem('fixops:token', token);
      localStorage.setItem('fixops:user', JSON.stringify(user));

      navigate('/dashboard');
    } catch (error) {
      console.error('[Login Error]:', error);
      alert('Usuário ou senha incorretos.');
    }
  }

  return (
    <main className="min-h-screen bg-grayscale-100 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-sm border border-grayscale-200 max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-grayscale-600 mb-2 tracking-tight">FixOps</h1>
        <p className="text-sm text-grayscale-400 mb-8">Acesso rápido para oficina</p>

        <form onSubmit={handleSubmit(handleLogin)} className="flex flex-col gap-6">
          <Input 
            label="Usuário" 
            type="text" // Mudamos de email para text
            placeholder="Ex: matheus.costa" 
            autoComplete="off"
            {...register('username')} 
            error={errors.username?.message} 
          />
          
          <Input 
            label="Senha" 
            type="password" 
            placeholder="••••••" 
            autoComplete="current-password"
            {...register('password')} 
            error={errors.password?.message} 
          />
          
          <button 
            type="submit" 
            className="bg-blue-base text-white font-bold py-3.5 rounded-lg hover:bg-blue-dark transition-all active:scale-[0.98] shadow-md cursor-pointer"
          >
            Entrar no sistema
          </button>
        </form>
      </div>
    </main>
  );
}