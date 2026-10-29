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
        <Route element={<Protected role="MAGANG" />}>
          <Route path="/magang/dashboard" element={<DashboardPage role="MAGANG" />} />
          <Route path="/magang/penempatan" element={<PlacementPage />} />
          <Route path="/magang/kegiatan" element={<ActivitiesPage />} />
          <Route path="/magang/laporan" element={<InternReportsPage />} />
        </Route>
        <Route element={<Protected role="MENTOR" />}>
          <Route path="/mentor/dashboard" element={<DashboardPage role="MENTOR" />} />
          <Route path="/mentor/validasi" element={<MentorReportsPage />} />
          <Route path="/mentor/tanda-tangan" element={<SignaturePage />} />
          <Route path="/mentor/laporan" element={<MentorReportsPage signedOnly />} />
        </Route>
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

