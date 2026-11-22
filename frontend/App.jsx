import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Layout.jsx';
import LegacyRedirect from './routes/LegacyRedirect.jsx';
import Home from './pages/Home/Home.jsx';
import Login from './pages/Login/Login.jsx';
import Register from './pages/Register/Register.jsx';
import Account from './pages/Account/Account.jsx';
import Admin from './pages/Admin/Admin.jsx';
import Roadmap from './pages/Roadmap/Roadmap.jsx';
import NotFound from './pages/NotFound/NotFound.jsx';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="account" element={<Account />} />
        <Route path="admin" element={<Admin />} />
        <Route path="roadmap" element={<Roadmap />} />
        <Route path="roadmap/:slug" element={<Roadmap />} />

        {/* Old *.html URLs used by the legacy pages */}
        <Route path="index.html" element={<LegacyRedirect to="/" />} />
        <Route path="login.html" element={<LegacyRedirect to="/login" />} />
        <Route path="register.html" element={<LegacyRedirect to="/register" />} />
        <Route path="account.html" element={<LegacyRedirect to="/account" />} />
        <Route path="admin.html" element={<LegacyRedirect to="/admin" />} />
        <Route path="roadmap.html" element={<LegacyRedirect to="/roadmap" />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
