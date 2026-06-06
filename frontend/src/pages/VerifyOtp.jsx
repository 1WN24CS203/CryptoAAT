import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { MdOutlineSecurity, MdErrorOutline } from 'react-icons/md';

function VerifyOtp() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // References to the 6 input elements
  const inputRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null),
  ];

  // Redirect if email is not provided in route state
  useEffect(() => {
    if (!email) {
      navigate('/forgot-password');
    }
  }, [email, navigate]);

  const handleChange = (index, value) => {
    // Only allow single digit numbers
    if (isNaN(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Auto-focus next input if value is filled
    if (value && index < 5) {
      inputRefs[index + 1].current.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace navigation
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Clear previous box and focus it
        const newOtp = [...otp];
        newOtp[index - 1] = '';
        setOtp(newOtp);
        inputRefs[index - 1].current.focus();
      } else {
        // Clear current box
        const newOtp = [...otp];
        newOtp[index] = '';
        setOtp(newOtp);
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim();
    if (pasteData.length === 6 && !isNaN(pasteData)) {
      const newOtp = pasteData.split('');
      setOtp(newOtp);
      inputRefs[5].current.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const otpCode = otp.join('');
    if (otpCode.length < 6) {
      setError('Please enter all 6 digits of the OTP');
      return;
    }

    setLoading(true);
    const data = await apiRequest('/verify-otp', 'POST', { email, otp: otpCode });
    setLoading(false);

    if (data.success) {
      // Go to choice selection (Direct Reset or JTR Audited Recovery)
      navigate('/jtr-recover', { state: { email, otp: otpCode } });
    } else {
      setError(data.message || 'OTP verification failed');
    }
  };

  return (
    <div className="animate-fade-in row justify-content-center align-items-center min-h-center py-4">
      <div className="col-sm-10 col-md-8 col-lg-5">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark">Verify OTP</h2>
            <p className="text-muted">{email}</p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger d-flex align-items-center gap-2 mb-4" role="alert">
              <MdErrorOutline className="fs-5" />
              <div>{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="otp-container" onPaste={handlePaste}>
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  type="text"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="otp-box"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  autoFocus={idx === 0}
                  required
                />
              ))}
            </div>

            <div className="d-grid mt-4">
              <button
                type="submit"
                disabled={loading}
                className="btn gradient-button py-2 text-white"
              >
                {loading ? 'Verifying...' : 'Verify OTP Code'}
              </button>
            </div>
          </form>

          <div className="text-center mt-3">
            <Link to="/forgot-password" className="small text-decoration-none" style={{ color: '#4f46e5' }}>
              Change Email
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VerifyOtp;
