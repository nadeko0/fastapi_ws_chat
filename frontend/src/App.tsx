import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_ENDPOINTS } from './config';

// Components
import Auth from './components/Auth';
import Chat from './components/Chat';
import Header from './components/Header';

// Styles
import '@mantine/core/styles.css';
import './styles/mantine.css';

// Interfaces
interface User {
  id: number;
  username: string;
}

function App() {
  // User state
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await axios.get(API_ENDPOINTS.CHECK_SESSION, {
          withCredentials: true
        });
        setUser(response.data);
      } catch (error) {
        console.error('Session not found:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Logout handler
  const handleLogout = async () => {
    try {
      await axios.post(API_ENDPOINTS.LOGOUT, {}, {
        withCredentials: true
      });
      setUser(null);
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        backgroundColor: '#f8f9fa'
      }}>
        Loading...
      </div>
    );
  }

  return (
    <MantineProvider
      theme={{
        primaryColor: 'blue',
        fontFamily: 'Inter, sans-serif',
        defaultRadius: 'md',
        colors: {
          blue: [
            '#e7f5ff',
            '#d0ebff',
            '#a5d8ff',
            '#74c0fc',
            '#4dabf7',
            '#339af0',
            '#228be6',
            '#1c7ed6',
            '#1971c2',
            '#1864ab',
          ],
        },
      }}
    >
      <Router>
        <div style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
          {user && <Header user={user} onLogout={handleLogout} />}
          <main style={{ padding: user ? '0' : '2rem' }}>
            <Routes>
              <Route
                path="/login"
                element={
                  !user ? (
                    <Auth setUser={setUser} />
                  ) : (
                    <Navigate to="/chat" replace />
                  )
                }
              />
              <Route
                path="/chat"
                element={
                  user ? (
                    <Chat user={user} />
                  ) : (
                    <Navigate to="/login" replace />
                  )
                }
              />
              <Route
                path="/"
                element={
                  <Navigate to={user ? "/chat" : "/login"} replace />
                }
              />
            </Routes>
          </main>
        </div>
      </Router>
    </MantineProvider>
  );
}

export default App;