import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from './components/Toaster';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';

import { Equipments } from './pages/Equipments';
import { Groups } from './pages/Groups';
import { UsersList } from './pages/UsersList';
import { Services } from './pages/Services';
import { Layout } from './components/Layout';

export function App() {
  return (
    <BrowserRouter>
      <Toaster />
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Rotas com Menu */}
        <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
        <Route path="/equipments" element={<Layout><Equipments /></Layout>} />
        <Route path="/groups" element={<Layout><Groups /></Layout>} />
        <Route path="/services" element={<Layout><Services /></Layout>} />
        <Route path="/users" element={<Layout><UsersList /></Layout>} />
        
        <Route path="/" element={<Navigate to="/dashboard" />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}