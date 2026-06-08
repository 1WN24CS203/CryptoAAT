import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { apiRequest } from '../utils/api';
import { MdOutlineSecurity, MdOutlineTerminal, MdOutlineCheckCircle, MdOutlineHighlightOff, MdOutlineArrowForward } from 'react-icons/md';

function JtrRecovery() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const email = location.state?.email || '';
  const otp = location.state?.otp || '';

  const [mode, setMode] = useState('select'); // 'select', 'running', 'cracked', 'failed'
  const [logs, setLogs] = useState([]);
  const [visibleLogs, setVisibleLogs] = useState([]);
  const [crackedPassword, setCrackedPassword] = useState('');
  const [winner, setWinner] = useState('');
  const [timeTaken, setTimeTaken] = useState('0.0');
  const [error, setError] = useState('');
  const [permission, setPermission] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!email || !otp) {
      navigate('/forgot-password');
    }
  }, [email, otp, navigate]);

  // Terminal log typing effect simulation
  useEffect(() => {
    if (logs.length > 0) {
      let currentLine = 0;
      setVisibleLogs([]);
      
      const interval = setInterval(() => {
        if (currentLine < logs.length) {
          setVisibleLogs((prev) => [...prev, logs[currentLine]]);
          currentLine++;
        } else {
          clearInterval(interval);
          if (crackedPassword) {
            setMode('cracked');
          } else {
            setMode('failed');
          }
        }
      }, 350); // Delay between terminal output lines for realism

      return () => clearInterval(interval);
    }
  }, [logs, crackedPassword]);

  // Countdown timer for cracked password visibility
  useEffect(() => {
    if (mode === 'cracked') {
      setCountdown(30);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            setCrackedPassword('');
            setMode('select');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode]);

  const handleStartJtr = async () => {
    setMode('running');
    setError('');
    
    try {
      const data = await apiRequest('/jtr-recover', 'POST', { email, otp });
      if (data.success) {
        setLogs(data.logs || []);
        setTimeTaken(data.timeTaken || '0.0');
        if (data.cracked) {
          setCrackedPassword(data.password);
          setWinner(data.winner || '');
        } else {
          setCrackedPassword('');
          setWinner('');
        }
      } else {
        setError(data.message || 'Audit run failed.');
        setMode('select');
      }
    } catch (err) {
      setError('Connection error occurred.');
      setMode('select');
    }
  };

  const handleGoToReset = () => {
    navigate('/reset-password', { state: { email, otp } });
  };

  return (
    <div className="animate-fade-in row justify-content-center align-items-center min-h-center py-4">
      <div className="col-sm-10 col-md-8 col-lg-6">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark">Password Recovery Audit</h2>
            <p className="text-muted small">Identity Verified: <strong>{email}</strong></p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger mb-4 text-center" role="alert">
              {error}
            </div>
          )}

          {mode === 'select' && (
            <div className="d-flex flex-column gap-4 mt-2">
              {/* Option A: John the Ripper */}
              <div className="border rounded p-4 bg-light">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MdOutlineTerminal className="fs-4 text-primary" />
                  <h4 className="h5 fw-bold text-dark mb-0">Cryptographic Recovery (JTR)</h4>
                </div>
                <p className="text-muted small mb-3">
                  Run automated cryptographic JTR attacks to decrypt and recover your current password using personal profile dictionaries, standard dictionary, and brute-force rules.
                </p>
                
                <div className="form-check text-start mb-3">
                  <input 
                    type="checkbox" 
                    className="form-check-input" 
                    id="permissionCheck"
                    checked={permission}
                    onChange={(e) => setPermission(e.target.checked)}
                  />
                  <label className="form-check-label text-muted small" htmlFor="permissionCheck" style={{ cursor: 'pointer', lineHeight: '1.2' }}>
                    I authorize the system to attempt to decrypt my password hash.
                  </label>
                </div>

                <button 
                  onClick={handleStartJtr} 
                  disabled={!permission}
                  className="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  Run JTR Recovery Audit <MdOutlineArrowForward />
                </button>
              </div>

              {/* Option B: Standard Reset */}
              <div className="border rounded p-4">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MdOutlineSecurity className="fs-4 text-secondary" />
                  <h4 className="h5 fw-bold text-dark mb-0">Standard Password Reset</h4>
                </div>
                <p className="text-muted small mb-3">
                  Perform a traditional password override. Set a completely new password immediately without running security verification checks on your old credential.
                </p>
                <button 
                  onClick={handleGoToReset} 
                  className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-1"
                >
                  Reset Password Directly <MdOutlineArrowForward />
                </button>
              </div>
            </div>
          )}

          {mode === 'running' && (
            <div>
              <div className="d-flex align-items-center gap-2 mb-3">
                <span className="spinner-border spinner-border-sm text-primary" role="status"></span>
                <span className="text-muted small">Executing John the Ripper session...</span>
              </div>
              <div className="bg-dark text-light p-3 rounded font-monospace" style={{ minHeight: '220px', fontSize: '0.85rem', whiteSpace: 'pre-line' }}>
                {visibleLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
                <span className="animate-blink">|</span>
              </div>
            </div>
          )}

          {mode === 'cracked' && (
            <div className="text-center py-4">
              <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-3 border border-danger border-opacity-25">
                <MdOutlineHighlightOff className="display-4" />
              </div>
              <h3 className="h4 fw-bold text-dark mb-2">Credential Cracked & Recovered!</h3>
              <p className="text-muted mx-auto" style={{ maxWidth: '500px' }}>
                Your password was successfully recovered in <strong>{timeTaken}s</strong> using the <strong>{winner || 'custom targeted wordlist'}</strong> attack. This indicates your password is <strong>highly vulnerable</strong>.
              </p>
              
              <div className="bg-light border rounded p-3 my-4">
                <div className="text-muted small text-uppercase mb-1">Recovered Password:</div>
                <div className="fs-3 fw-bold text-danger font-monospace">{crackedPassword}</div>
                <div className="text-danger small mt-2 fw-semibold">
                  ⏱️ For security, this password will be hidden on screen in {countdown}s
                </div>
              </div>

              <div className="d-flex justify-content-center gap-3">
                <Link to="/login" className="btn btn-primary px-4">
                  Proceed to Login
                </Link>
                <button onClick={handleGoToReset} className="btn btn-outline-secondary px-4">
                  Reset Password Anyway
                </button>
              </div>
            </div>
          )}

          {mode === 'failed' && (
            <div className="text-center py-4">
              <div className="d-inline-flex p-3 rounded-circle bg-success bg-opacity-10 text-success mb-3 border border-success border-opacity-25">
                <MdOutlineCheckCircle className="display-4" />
              </div>
              <h3 className="h4 fw-bold text-dark mb-2">Recovery Search Exhausted</h3>
              <p className="text-muted mx-auto mb-4" style={{ maxWidth: '500px' }}>
                John the Ripper generated and scanned all candidate variations in the wordlist but was **unable** to crack your password. Your password is cryptographically secure.
              </p>

              <div className="bg-dark text-light p-3 rounded font-monospace text-start mb-4" style={{ fontSize: '0.85rem' }}>
                {logs.slice(-5).map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>

              <div className="d-flex justify-content-center gap-2 flex-wrap">
                <button onClick={handleGoToReset} className="btn btn-primary px-3 d-flex align-items-center gap-1">
                  Change Password via Reset <MdOutlineArrowForward />
                </button>
                <button onClick={() => setMode('select')} className="btn btn-outline-primary px-3">
                  Retry Audit
                </button>
                <Link to="/login" className="btn btn-outline-secondary px-3">
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JtrRecovery;
