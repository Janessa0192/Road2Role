import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { ThemeProvider } from './components/ThemeContext/ThemeContext.jsx';
import { AuthProvider } from './AuthContext/AuthContext.jsx';

// Shared stylesheets (loaded on every page in the old site) - reused as is.
import './styles.css';
import './components/ThemeContext/theme.css';
import './components/Navbar/navbar.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  </React.StrictMode>
);
