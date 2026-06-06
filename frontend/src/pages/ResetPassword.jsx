import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { MdVisibility, MdVisibilityOff, MdErrorOutline, MdCheckCircleOutline } from 'react-icons/md';

function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';
  const otp = location.state?.otp || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if credentials not present
  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password');
    }
  }, [email, otp, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!newPassword) {
      setError('Please enter your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const data = await apiRequest('/reset-password', 'POST', {
      email,
      otp,
      newPassword,
    });
    setLoading(false);

    if (data.success) {
      setSuccess('Your password has been reset successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } else {
      setError(data.message || 'Failed to reset password');
    }
  };


  return (
    <div className="animate-fade-in row justify-content-center align-items-center min-h-center py-4">
      <div className="col-sm-10 col-md-8 col-lg-5">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark">New Password</h2>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center gap-2 mb-4" role="alert">
              <MdErrorOutline className="fs-5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="alert alert-success border-0 bg-success bg-opacity-10 text-success d-flex align-items-center gap-2 mb-4" role="alert">
              <MdCheckCircleOutline className="fs-5" />
              <div>{success} Redirectioning to Login...</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label text-muted small">New Password</label>
              <div className="position-relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

            <div className="mb-3">
              <label className="form-label text-muted small">Confirm New Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="form-control custom-input"
                placeholder="••••••••••••"
                required
              />
            </div>



            <div className="d-grid mt-4">
              <button
                type="submit"
                disabled={loading || !!success}
                className="btn gradient-button py-2 text-white"
              >
                {loading ? 'Updating Password...' : 'Reset Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
