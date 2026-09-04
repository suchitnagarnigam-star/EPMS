import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { WorkModalProvider } from './context/WorkModalContext';
import ProtectedRoute        from './components/ProtectedRoute';
import Layout                from './components/Layout';
import Login                 from './pages/Login';
import ExecutiveOverview     from './pages/ExecutiveOverview';
import ContractorMatrix      from './pages/ContractorMatrix';
import ConstituencyFunds     from './pages/ConstituencyFunds';
import MasterWorksDirectory  from './pages/MasterWorksDirectory';
import FlagshipAgenda        from './pages/FlagshipAgenda';
import DataQuality           from './pages/DataQuality';
import ProfilePage           from './pages/ProfilePage';
import OfficerCommand        from './pages/OfficerCommand';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <WorkModalProvider>
          <BrowserRouter>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />

              {/* Protected — all dashboard pages sit under Layout */}
              <Route element={<ProtectedRoute />}>
                <Route element={<Layout />}>
                  <Route index                    element={<ExecutiveOverview />}    />
                  <Route path="contractors"       element={<ContractorMatrix />}     />
                  <Route path="constituencies"    element={<ConstituencyFunds />}    />
                  <Route path="works"             element={<MasterWorksDirectory />} />
                  <Route path="officers"          element={<OfficerCommand />}       />
                  <Route path="flagship"          element={<FlagshipAgenda />}       />
                  <Route path="quality"           element={<DataQuality />}          />
                  <Route path="profile"           element={<ProfilePage />}          />
                </Route>
              </Route>

              {/* Catch-all → login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </WorkModalProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
