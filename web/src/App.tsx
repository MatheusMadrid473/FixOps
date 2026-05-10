import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/Toaster';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

import { Equipments } from './pages/Equipments';
import { Groups } from './pages/Groups';
import { UsersList } from './pages/UsersList';
import { Services } from './pages/Services';

export function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rotas Protegidas */}
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/equipments" element={<Equipments />} />
        <Route path="/groups" element={<Groups />} />
        <Route path="/services" element={<Services />} />
        <Route path="/users" element={<UsersList />} />
        
        {/* Redirecionamento padrão */}
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}