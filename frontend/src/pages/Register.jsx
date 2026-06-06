import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { MdVisibility, MdVisibilityOff, MdErrorOutline } from 'react-icons/md';

function Register({ setUser }) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    birthYear: '',
    collegeName: '',
    favoriteWord: '',
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

    // Extra validation
    if (!formData.name || !formData.email || !formData.password || !formData.birthYear || !formData.collegeName || !formData.favoriteWord) {
      setError('Please fill in all the fields');
      return;
    }

    setLoading(true);
    const data = await apiRequest('/register', 'POST', formData);
    setLoading(false);

    if (data.success) {
      localStorage.setItem('cryptoaat_token', data.token);
      // Construct user object matches state
      setUser({
        _id: data._id,
        name: data.name,
        email: data.email,
        birthYear: formData.birthYear,
        collegeName: formData.collegeName,
        favoriteWord: formData.favoriteWord,
        analysis: data.analysis
      });
      navigate('/dashboard');
    } else {
      setError(data.message || 'Registration failed');
    }
  };


  return (
    <div className="animate-fade-in row justify-content-center align-items-center min-h-center py-4">
      <div className="col-sm-10 col-md-8 col-lg-6">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark">Create Account</h2>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center gap-2 mb-4" role="alert">
              <MdErrorOutline className="fs-5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-muted small">Full Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-control custom-input"
                placeholder="John Doe"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small">Email Address</label>
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
              <label className="form-label text-muted small">Birth Year</label>
              <input
                type="number"
                name="birthYear"
                value={formData.birthYear}
                onChange={handleChange}
                className="form-control custom-input"
                placeholder="e.g. 1998"
                min="1900"
                max="2026"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small">College/University Name</label>
              <input
                type="text"
                name="collegeName"
                value={formData.collegeName}
                onChange={handleChange}
                className="form-control custom-input"
                placeholder="e.g. BMSCE"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small">Favorite Word</label>
              <input
                type="text"
                name="favoriteWord"
                value={formData.favoriteWord}
                onChange={handleChange}
                className="form-control custom-input"
                placeholder="e.g. Skyline"
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label text-muted small">Password</label>
              <div className="position-relative mb-2">
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
                  className="btn position-absolute top-50 end-0 translate-middle-y text-muted border-0 bg-transparent pe-3"
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
                {loading ? 'Creating Account...' : 'Register'}
              </button>
            </div>
          </form>

          <div className="text-center mt-3">
            <span className="text-muted small">Already have an account? </span>
            <Link to="/login" className="small text-decoration-none" style={{ color: '#4f46e5' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
