import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Tools from './pages/Tools';
import Skills from './pages/Skills';
import Settings from './pages/Settings';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/tools" element={<Tools />} />
        <Route path="/skills" element={<Skills />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Layout>
  );
}

export default App;
