import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import DashboardLayout from './layouts/DashboardLayout'
import DashboardHome from './pages/DashboardHome'
import Workouts from './pages/Workouts'
import Profile from './pages/Profile'
import AICoach from './pages/AICoach'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<DashboardHome />} />
          <Route path="treinos" element={<Workouts />} />
          <Route path="perfil" element={<Profile />} />
          <Route path="coach" element={<AICoach />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
