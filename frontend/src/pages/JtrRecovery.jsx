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
      }, 150); // Speed up slightly for improved UX while retaining realistic logging feel

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
      <div className="col-sm-10 col-md-8 col-lg-7">
        <div className="glass-card p-4 p-md-5">
          <div className="text-center mb-4">
            <h2 className="fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Cryptographic Recovery Console</h2>
            <p className="text-secondary small">Target Account: <strong className="text-primary">{email}</strong></p>
          </div>

          {error && (
            <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger mb-4 text-center" role="alert">
              {error}
            </div>
          )}

          {mode === 'select' && (
            <div className="d-flex flex-column gap-4 mt-2">
              {/* Option A: John the Ripper */}
              <div className="border rounded p-4 bg-dark bg-opacity-20" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MdOutlineTerminal className="fs-4 text-primary animate-pulse" />
                  <h4 className="h5 fw-bold text-white mb-0">Parallel John the Ripper Audit</h4>
                </div>
                <p className="text-secondary small mb-3">
                  This executes the JTR cryptographic binary directly in the backend terminal. It attempts to decrypt the MD5Crypt/Bcrypt hash using three concurrent strategies: a targeted personal wordlist, the standard rockyou list, and incremental rules.
                </p>
                
                <div className="form-check text-start mb-4">
                  <input 
                    type="checkbox" 
                    className="form-check-input" 
                    id="permissionCheck"
                    checked={permission}
                    onChange={(e) => setPermission(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  <label className="form-check-label text-secondary small" htmlFor="permissionCheck" style={{ cursor: 'pointer', lineHeight: '1.3' }}>
                    I authorize the platform to execute cryptographic attacks on my credential hash.
                  </label>
                </div>

                <button 
                  onClick={handleStartJtr} 
                  disabled={!permission}
                  className="btn gradient-button w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  Run JTR Cryptographic Recovery <MdOutlineArrowForward />
                </button>
              </div>

              {/* Option B: Standard Reset */}
              <div className="border rounded p-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MdOutlineSecurity className="fs-4 text-secondary" />
                  <h4 className="h5 fw-bold text-white mb-0">Direct Password Reset Override</h4>
                </div>
                <p className="text-secondary small mb-3">
                  Skip hash auditing entirely. Proceed to override the current credential with a new secure password immediately using standard OTP authorization rules.
                </p>
                <button 
                  onClick={handleGoToReset} 
                  className="btn btn-outline-secondary w-100 d-flex align-items-center justify-content-center gap-2"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}
                >
                  Directly Modify Password <MdOutlineArrowForward />
                </button>
              </div>
            </div>
          )}

          {mode === 'running' && (
            <div>
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green animate-blink"></span>
                </div>
                <div className="terminal-title">jtr_session@cryptoaat_kali</div>
                <div style={{ width: '42px' }}></div>
              </div>
              <div className="terminal-block" style={{ minHeight: '260px', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
                {visibleLogs.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
                <span className="animate-blink text-success fw-bold">█</span>
              </div>
            </div>
          )}

          {mode === 'cracked' && (
            <div className="text-center py-4 glow-card-danger rounded border p-4">
              <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-3 border border-danger border-opacity-25">
                <MdOutlineHighlightOff className="display-4 animate-bounce" />
              </div>
              <h3 className="h4 fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Credential Decrypted Successfully!</h3>
              <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '500px' }}>
                Your account password hash was cracked in <strong className="text-white">{timeTaken}s</strong> using the <strong className="text-primary">{winner}</strong> attack. This proves the current password is highly weak and vulnerable.
              </p>
              
              <div className="bg-dark bg-opacity-40 border border-danger border-opacity-30 rounded p-4 my-4">
                <div className="text-muted small text-uppercase mb-2">Cracked Password Result:</div>
                <div className="fs-3 fw-bold text-danger font-monospace tracking-wide">{crackedPassword}</div>
                <div className="text-danger small mt-3 fw-semibold">
                  ⏱️ For confidentiality, this panel will lock and mask in {countdown}s
                </div>
              </div>

              <div className="d-flex justify-content-center gap-3">
                <Link to="/login" className="btn btn-primary px-4 py-2">
                  Proceed to Login
                </Link>
                <button onClick={handleGoToReset} className="btn btn-outline-secondary px-4 py-2" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  Override Password
                </button>
              </div>
            </div>
          )}

          {mode === 'failed' && (
            <div className="text-center py-4 glow-card-success rounded border p-4">
              <div className="d-inline-flex p-3 rounded-circle bg-success bg-opacity-10 text-success mb-3 border border-success border-opacity-25">
                <MdOutlineCheckCircle className="display-4" />
              </div>
              <h3 className="h4 fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>Cryptographic Strength Verified</h3>
              <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '500px' }}>
                All JTR search rules (custom wordlists, standard rockyou list, and incremental patterns) were exhausted. The active password hash could not be cracked within the execution window.
              </p>

              <div className="terminal-header text-start">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green"></span>
                </div>
                <div className="terminal-title">jtr_dump@cryptoaat_kali</div>
                <div></div>
              </div>
              <div className="terminal-block text-start mb-4" style={{ maxHeight: '120px', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
                {logs.slice(-4).map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>

              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button onClick={handleGoToReset} className="btn gradient-button px-4 py-2 d-flex align-items-center gap-2">
                  Force Reset Password <MdOutlineArrowForward />
                </button>
                <button onClick={() => setMode('select')} className="btn btn-outline-primary px-4 py-2">
                  Re-run Audit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default JtrRecovery;
