import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Workouts from './pages/Workouts'
import Login from './pages/Login'
import './App.css'
import ToastContainer from './components/ToastContainer'
import SplashScreen from './components/SplashScreen'

// Páginas fora do caminho inicial (login → home → treinos) carregam sob demanda.
const WorkoutEditor = lazy(() => import('./pages/WorkoutEditor'))
const WorkoutPlan = lazy(() => import('./pages/WorkoutPlan'))
const WorkoutDayDetails = lazy(() => import('./pages/WorkoutDayDetails'))
const Exercises = lazy(() => import('./pages/Exercises'))
const Profile = lazy(() => import('./pages/Profile'))
const AICoach = lazy(() => import('./pages/AICoach'))
const Dieta = lazy(() => import('./pages/Dieta'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const SupabaseDiagnostic = lazy(() => import('./pages/SupabaseDiagnostic'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const AdminMedia = lazy(() => import('./pages/AdminMedia'))
const ActivityHistoryPage = lazy(() => import('./pages/ActivityHistoryPage'))
const SharedKnowledge = lazy(() => import('./pages/SharedKnowledge'))

function App() {
  return (
    <BrowserRouter>
      <SplashScreen />
      <ToastContainer />
      <Suspense fallback={null}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/diagnostic" element={<SupabaseDiagnostic />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="treinos" element={<Workouts />} />
          <Route path="treinos/novo" element={<WorkoutEditor />} />
          <Route path="treinos/:id/editar" element={<WorkoutEditor />} />
          <Route path="treino/:id" element={<WorkoutPlan />} />
          <Route path="treino/:id/dia/:dayId" element={<WorkoutDayDetails />} />
          {/* Meu Treino foi unificado no Início (v2) */}
          <Route path="meu-treino" element={<Navigate to="/" replace />} />
          <Route path="dieta" element={<Dieta />} />
          <Route path="exercicios" element={<Exercises />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="historico" element={<ActivityHistoryPage />} />
          <Route path="historico/:userId" element={<ActivityHistoryPage />} />
          <Route path="coach" element={<AICoach />} />
          <Route path="diagnostic" element={<SupabaseDiagnostic />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/midias" element={<AdminMedia />} />
          <Route path="conhecimento" element={<SharedKnowledge />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App
