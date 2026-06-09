import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { MdEmail, MdErrorOutline } from 'react-icons/md';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setLoading(true);
    const data = await apiRequest('/forgot-password', 'POST', { email });
    setLoading(false);

    if (data.success) {
      navigate('/verify-otp', { state: { email } });
    } else {
      setError(data.message || 'Error occurred. Please try again.');
    }
  };

  return (
    <div className="animate-fade-in row justify-content-center align-items-center min-h-center py-4">
      <div className="col-sm-10 col-md-8 col-lg-5">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Recover Password</h2>
            <p className="text-secondary small">Enter your email to receive a password reset OTP code</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center gap-2 mb-4" role="alert">
              <MdErrorOutline className="fs-5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label text-secondary small">Email Address</label>
              <div className="position-relative">
                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-control custom-input ps-5"
                  placeholder="john@example.com"
                  required
                />
                <MdEmail className="position-absolute top-50 start-0 translate-middle-y text-secondary ms-3 fs-5" />
              </div>
            </div>

            <div className="d-grid">
              <button
                type="submit"
                disabled={loading}
                className="btn gradient-button py-2 text-white"
              >
                {loading ? 'Sending OTP...' : 'Send Verification OTP'}
              </button>
            </div>
          </form>

          <div className="text-center mt-3">
            <Link to="/login" className="small text-decoration-none animate-color" style={{ color: 'var(--primary-color)' }}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ForgotPassword;
