import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Workouts from './pages/Workouts'
import WorkoutPlan from './pages/WorkoutPlan'
import Exercises from './pages/Exercises'
import Profile from './pages/Profile'
import AICoach from './pages/AICoach'
import MeuTreino from './pages/MeuTreino'
import Login from './pages/Login'
import ResetPassword from './pages/ResetPassword'
import SupabaseDiagnostic from './pages/SupabaseDiagnostic'
import AdminUsers from './pages/AdminUsers'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/diagnostic" element={<SupabaseDiagnostic />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="treinos" element={<Workouts />} />
          <Route path="treino/:id" element={<WorkoutPlan />} />
          <Route path="meu-treino" element={<MeuTreino />} />
          <Route path="exercicios" element={<Exercises />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="coach" element={<AICoach />} />
          <Route path="diagnostic" element={<SupabaseDiagnostic />} />
          <Route path="admin/users" element={<AdminUsers />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
