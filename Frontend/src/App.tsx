import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import ExecutiveOverview     from './pages/ExecutiveOverview';
import ContractorMatrix      from './pages/ContractorMatrix';
import ConstituencyFunds     from './pages/ConstituencyFunds';
import MasterWorksDirectory  from './pages/MasterWorksDirectory';
import FlagshipAgenda        from './pages/FlagshipAgenda';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index          element={<ExecutiveOverview />}    />
          <Route path="contractors"    element={<ContractorMatrix />}     />
          <Route path="constituencies" element={<ConstituencyFunds />}    />
          <Route path="works"          element={<MasterWorksDirectory />} />
          <Route path="flagship"       element={<FlagshipAgenda />}       />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
