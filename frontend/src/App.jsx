import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { Protected } from './layouts/AppLayout.jsx';
import ActivitiesPage from './pages/ActivitiesPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import InternReportsPage from './pages/InternReportsPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import MentorReportsPage from './pages/MentorReportsPage.jsx';
import PlacementPage from './pages/PlacementPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import SignaturePage from './pages/SignaturePage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/magang/dashboard" element={<Protected role="MAGANG"><DashboardPage role="MAGANG" /></Protected>} />
        <Route path="/magang/penempatan" element={<Protected role="MAGANG"><PlacementPage /></Protected>} />
        <Route path="/magang/kegiatan" element={<Protected role="MAGANG"><ActivitiesPage /></Protected>} />
        <Route path="/magang/laporan" element={<Protected role="MAGANG"><InternReportsPage /></Protected>} />
        <Route path="/mentor/dashboard" element={<Protected role="MENTOR"><DashboardPage role="MENTOR" /></Protected>} />
        <Route path="/mentor/validasi" element={<Protected role="MENTOR"><MentorReportsPage /></Protected>} />
        <Route path="/mentor/tanda-tangan" element={<Protected role="MENTOR"><SignaturePage /></Protected>} />
        <Route path="/mentor/laporan" element={<Protected role="MENTOR"><MentorReportsPage signedOnly /></Protected>} />
        <Route path="/profil" element={<Protected><ProfilePage /></Protected>} />
        <Route path="*" element={<RootRedirect />} />
      </Routes>
    </AuthProvider>
  );
}

function RootRedirect() {
  const { user } = useAuth();
  const destination = user
    ? (user.role === 'MAGANG' ? '/magang/dashboard' : '/mentor/dashboard')
    : '/login';
  return <Navigate to={destination} replace />;
}

