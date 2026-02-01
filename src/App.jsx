import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Workouts from './pages/Workouts'
import Exercises from './pages/Exercises'
import Profile from './pages/Profile'
import AICoach from './pages/AICoach'
import MeuTreino from './pages/MeuTreino'
import SupabaseDiagnostic from './pages/SupabaseDiagnostic'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="treinos" element={<Workouts />} />
          <Route path="meu-treino" element={<MeuTreino />} />
          <Route path="exercicios" element={<Exercises />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="coach" element={<AICoach />} />
          <Route path="diagnostic" element={<SupabaseDiagnostic />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
