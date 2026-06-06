import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom';
import Home from './pages/Home';
import Register from './pages/Register';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import VerifyOtp from './pages/VerifyOtp';
import ResetPassword from './pages/ResetPassword';
import JtrRecovery from './pages/JtrRecovery';
import Dashboard from './pages/Dashboard';
import { MdLogout, MdDashboard, MdLogin, MdPersonAdd } from 'react-icons/md';

function AppContent({ user, setUser }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('cryptoaat_token');
    setUser(null);
    navigate('/login');
  };

  return (
    <>
      {/* Navigation Bar */}
      <nav className="navbar navbar-expand-lg custom-navbar sticky-top">
        <div className="container">
          <Link className="navbar-brand fw-bold text-dark" to="/">
            CryptoAAT
          </Link>
          
          <button 
            className="navbar-toggler border-0 text-dark" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav" 
            aria-controls="navbarNav" 
            aria-expanded="false" 
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto gap-2 mt-3 mt-lg-0">
              <li className="nav-item">
                <Link className="nav-link text-dark" to="/">Home</Link>
              </li>
              {user ? (
                <>
                  <li className="nav-item">
                    <Link className="nav-link text-dark d-flex align-items-center gap-1" to="/dashboard">
                      <MdDashboard /> Dashboard
                    </Link>
                  </li>
                  <li className="nav-item">
                    <button onClick={handleLogout} className="btn btn-outline-danger btn-sm d-flex align-items-center gap-1 ms-lg-2">
                      <MdLogout /> Logout
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li className="nav-item">
                    <Link className="btn btn-outline-primary btn-sm d-flex align-items-center gap-1" to="/login">
                      <MdLogin /> Login
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link className="btn gradient-button btn-sm d-flex align-items-center gap-1 text-white" to="/register">
                      <MdPersonAdd /> Register
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </nav>

      {/* Pages Container */}
      <div className="container py-4">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route 
            path="/register" 
            element={!user ? <Register setUser={setUser} /> : <Navigate to="/dashboard" />} 
          />
          <Route 
            path="/login" 
            element={!user ? <Login setUser={setUser} /> : <Navigate to="/dashboard" />} 
          />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<VerifyOtp />} />
          <Route path="/jtr-recover" element={<JtrRecovery />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} setUser={setUser} /> : <Navigate to="/login" />} 
          />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if token exists on mount
  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('cryptoaat_token');
      if (token) {
        try {
          const res = await fetch('http://localhost:5000/api/auth/profile', {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          const data = await res.json();
          if (data.success) {
            setUser(data.user);
          } else {
            localStorage.removeItem('cryptoaat_token');
          }
        } catch (err) {
          console.error('Failed to authenticate token', err);
        }
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppContent user={user} setUser={setUser} />
    </Router>
  );
}

export default App;
