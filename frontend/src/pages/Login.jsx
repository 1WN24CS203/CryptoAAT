import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { MdVisibility, MdVisibilityOff, MdErrorOutline } from 'react-icons/md';

function Login({ setUser }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('Please fill in all the fields');
      return;
    }

    setLoading(true);
    const data = await apiRequest('/login', 'POST', formData);
    setLoading(false);

    if (data.success) {
      localStorage.setItem('cryptoaat_token', data.token);
      
      const profileData = await apiRequest('/profile', 'GET', null, data.token);
      if (profileData.success) {
        setUser(profileData.user);
      } else {
        setUser({
          _id: data._id,
          name: data.name,
          email: data.email,
          analysis: data.analysis
        });
      }
      navigate('/dashboard');
    } else {
      setError(data.message || 'Invalid email or password');
    }
  };

  return (
    <div className="animate-fade-in row justify-content-center align-items-center min-h-center py-4">
      <div className="col-sm-10 col-md-8 col-lg-5">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Welcome Back</h2>
            <p className="text-secondary small">Access your security profile dashboard</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center gap-2 mb-4" role="alert">
              <MdErrorOutline className="fs-5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-secondary small">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-control custom-input"
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-1">
                <label className="form-label text-secondary small mb-0">Password</label>
                <Link to="/forgot-password" className="small text-decoration-none animate-color" style={{ color: 'var(--primary-color)', fontSize: '0.8rem' }}>
                  Forgot Password?
                </Link>
              </div>
              <div className="position-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="form-control custom-input pe-5"
                  placeholder="••••••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="btn position-absolute top-50 end-0 translate-middle-y text-secondary border-0 bg-transparent pe-3"
                >
                  {showPassword ? <MdVisibilityOff className="fs-5" /> : <MdVisibility className="fs-5" />}
                </button>
              </div>
            </div>

            <div className="mt-4 d-grid">
              <button
                type="submit"
                disabled={loading}
                className="btn gradient-button py-2 text-white"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </div>
          </form>

          <div className="text-center mt-3">
            <span className="text-secondary small">Don't have an account? </span>
            <Link to="/register" className="small text-decoration-none animate-color" style={{ color: 'var(--primary-color)' }}>
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
