import React, { useState, useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { MdPerson, MdCalendarToday, MdSchool, MdFavoriteBorder, MdWarning, MdCheckCircle, MdTerminal, MdSecurity, MdOutlineArrowForward, MdOutlineHighlightOff } from 'react-icons/md';

function Dashboard({ user, setUser }) {
  const [auditMode, setAuditMode] = useState('select'); // 'select', 'running', 'cracked', 'failed'
  const [auditLogs, setAuditLogs] = useState([]);
  const [visibleAuditLogs, setVisibleAuditLogs] = useState([]);
  const [auditPermission, setAuditPermission] = useState(false);
  const [auditResult, setAuditResult] = useState(null);
  const [auditError, setAuditError] = useState('');

  // Circular gauge settings
  const score = user.analysis?.score !== undefined ? user.analysis.score : (user.passwordScore || 0);
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  // Sync user profile details on load
  const fetchUserData = async () => {
    const data = await apiRequest('/profile');
    if (data.success) {
      setUser(data.user);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  // Terminal log typing animation for live JTR audit
  useEffect(() => {
    if (auditLogs.length > 0) {
      let currentLine = 0;
      setVisibleAuditLogs([]);
      
      const interval = setInterval(() => {
        if (currentLine < auditLogs.length) {
          setVisibleAuditLogs((prev) => [...prev, auditLogs[currentLine]]);
          currentLine++;
        } else {
          clearInterval(interval);
          if (auditResult?.cracked) {
            setAuditMode('cracked');
          } else {
            setAuditMode('failed');
          }
          // Refresh user dashboard stats to sync final DB states (score, etc.)
          fetchUserData();
        }
      }, 150);

      return () => clearInterval(interval);
    }
  }, [auditLogs, auditResult]);

  const handleStartAudit = async () => {
    setAuditMode('running');
    setAuditError('');
    setAuditResult(null);
    setAuditLogs([]);

    try {
      const data = await apiRequest('/jtr-audit', 'POST');
      if (data.success) {
        setAuditResult(data);
        setAuditLogs(data.logs || []);
      } else {
        setAuditError(data.message || 'Auditing pipeline execution failed.');
        setAuditMode('select');
      }
    } catch (err) {
      setAuditError('Connection failure.');
      setAuditMode('select');
    }
  };

  const getStrokeColor = () => {
    if (score >= 80) return 'var(--success-color)';
    if (score >= 40) return 'var(--warning-color)';
    return 'var(--danger-color)';
  };

  return (
    <div className="animate-fade-in py-4">
      {/* Header Info */}
      <div className="row mb-4">
        <div className="col-12 text-center text-md-start">
          <h1 className="display-6 fw-bold text-white mb-1" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Security Command Console
          </h1>
          <p className="text-secondary small">Registered Session: <strong className="text-primary">{user.email}</strong></p>
        </div>
      </div>

      <div className="row g-4">
        {/* Left Column: Account Details & Analyzer Score */}
        <div className="col-lg-5 col-md-6">
          <div className="d-flex flex-column gap-4 h-100">
            {/* Score Ring Card */}
            <div className="glass-card p-4 text-center">
              <h5 className="fw-bold mb-4 text-white text-start border-bottom pb-2 d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                <MdSecurity className="text-primary fs-5" /> Credential Health Level
              </h5>
              
              <div className="score-circle-container my-3">
                <svg className="score-circle-svg" width="140" height="140">
                  <circle className="score-circle-bg" cx="70" cy="70" r={radius} />
                  <circle 
                    className="score-circle-progress" 
                    cx="70" 
                    cy="70" 
                    r={radius} 
                    stroke={getStrokeColor()}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                  />
                </svg>
                <div className="score-text">
                  <span className="score-number" style={{ color: getStrokeColor() }}>{score}</span>
                  <div className="score-label">Score</div>
                </div>
              </div>

              <div className="mt-3">
                <span className="badge px-3 py-2 rounded" style={{ 
                  backgroundColor: score >= 80 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                  color: score >= 80 ? 'var(--success-color)' : 'var(--danger-color)',
                  border: `1px solid ${score >= 80 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}>
                  Complexity Rating: {user.analysis?.status || user.passwordStatus || 'Weak'}
                </span>
              </div>
            </div>

            {/* Profile Variables Panel */}
            <div className="glass-card p-4">
              <h5 className="fw-bold mb-3 text-white border-bottom pb-2" style={{ fontSize: '1rem' }}>
                Personal Profile Variables
              </h5>
              <p className="text-secondary small mb-3">These variables represent key data values utilized to build targeted personal wordlist dictionaries.</p>
              
              <div className="d-flex flex-column gap-3">
                <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark bg-opacity-20 border border-light border-opacity-5">
                  <span className="d-flex align-items-center gap-2 text-secondary small">
                    <MdPerson className="text-primary fs-5" /> Account Name:
                  </span>
                  <span className="fw-semibold small">{user.name}</span>
                </div>
                
                <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark bg-opacity-20 border border-light border-opacity-5">
                  <span className="d-flex align-items-center gap-2 text-secondary small">
                    <MdCalendarToday className="text-primary fs-5" /> Date of Birth:
                  </span>
                  <span className="fw-semibold small font-monospace">{user.dob}</span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark bg-opacity-20 border border-light border-opacity-5">
                  <span className="d-flex align-items-center gap-2 text-secondary small">
                    <MdSchool className="text-primary fs-5" /> College/Univ:
                  </span>
                  <span className="fw-semibold small">{user.collegeName}</span>
                </div>

                <div className="d-flex align-items-center justify-content-between p-2 rounded bg-dark bg-opacity-20 border border-light border-opacity-5">
                  <span className="d-flex align-items-center gap-2 text-secondary small">
                    <MdFavoriteBorder className="text-primary fs-5" /> Fav Word:
                  </span>
                  <span className="fw-semibold small">{user.favoriteWord}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Interactive JTR Auditing Terminal & Password Insights */}
        <div className="col-lg-7 col-md-6">
          <div className="d-flex flex-column gap-4 h-100">
            {/* Interactive JTR Auditing Panel */}
            <div className="glass-card p-4">
              <h5 className="fw-bold mb-3 text-white border-bottom pb-2 d-flex align-items-center gap-2" style={{ fontSize: '1rem' }}>
                <MdTerminal className="text-primary fs-5 animate-pulse" /> Live JTR Cryptographic Auditor
              </h5>

              {auditError && (
                <div className="alert alert-danger border-0 bg-danger bg-opacity-10 text-danger text-center small mb-3">
                  {auditError}
                </div>
              )}

              {auditMode === 'select' && (
                <div className="py-2">
                  <p className="text-secondary small mb-3">
                    Initiate an offline cryptanalysis audit. This instructs the Express server backend on Kali Linux to export your active credential hash and run parallel John the Ripper processes in real-time.
                  </p>
                  
                  <div className="form-check text-start mb-4">
                    <input 
                      type="checkbox" 
                      className="form-check-input" 
                      id="auditAuthCheck"
                      checked={auditPermission}
                      onChange={(e) => setAuditPermission(e.target.checked)}
                      style={{ cursor: 'pointer' }}
                    />
                    <label className="form-check-label text-secondary small" htmlFor="auditAuthCheck" style={{ cursor: 'pointer', lineHeight: '1.3' }}>
                      Authorize JTR backend to run parallel dictionary & brute force operations.
                    </label>
                  </div>

                  <button 
                    onClick={handleStartAudit}
                    disabled={!auditPermission}
                    className="btn gradient-button w-100 d-flex align-items-center justify-content-center gap-2"
                  >
                    Run Live JTR Hash Audit <MdOutlineArrowForward />
                  </button>
                </div>
              )}

              {auditMode === 'running' && (
                <div>
                  <div className="terminal-header">
                    <div className="terminal-dots">
                      <span className="terminal-dot dot-red"></span>
                      <span className="terminal-dot dot-yellow"></span>
                      <span className="terminal-dot dot-green animate-blink"></span>
                    </div>
                    <div className="terminal-title">jtr_audit@cryptoaat_kali</div>
                    <div style={{ width: '42px' }}></div>
                  </div>
                  <div className="terminal-block" style={{ minHeight: '200px', borderTopLeftRadius: '0', borderTopRightRadius: '0' }}>
                    {visibleAuditLogs.map((log, index) => (
                      <div key={index} className="mb-1">{log}</div>
                    ))}
                    <span className="animate-blink text-success fw-bold">█</span>
                  </div>
                </div>
              )}

              {auditMode === 'cracked' && (
                <div className="p-3 glow-card-danger rounded border text-center">
                  <div className="d-inline-flex p-2 rounded-circle bg-danger bg-opacity-10 text-danger mb-2">
                    <MdOutlineHighlightOff className="fs-3 animate-bounce" />
                  </div>
                  <h6 className="fw-bold text-white mb-2">AUDIT FAILURE: Hash Cracked Easily</h6>
                  <p className="text-secondary small mb-3">
                    JTR cracked your active password hash in <strong>{auditResult?.timeTaken}s</strong> using <strong>{auditResult?.winner}</strong> rules. Your account credentials are highly insecure.
                  </p>
                  
                  <div className="bg-dark bg-opacity-50 border border-danger border-opacity-20 rounded p-3 mb-3">
                    <div className="text-muted small text-uppercase mb-1" style={{ fontSize: '0.65rem' }}>Decrypted Plaintext Value:</div>
                    <div className="fs-5 fw-bold text-danger font-monospace">{auditResult?.password}</div>
                  </div>

                  <button onClick={() => setAuditMode('select')} className="btn btn-outline-danger btn-sm px-4">
                    Clear Logs & Re-run Audit
                  </button>
                </div>
              )}

              {auditMode === 'failed' && (
                <div className="p-3 glow-card-success rounded border text-center">
                  <div className="d-inline-flex p-2 rounded-circle bg-success bg-opacity-10 text-success mb-2">
                    <MdCheckCircle className="fs-3" />
                  </div>
                  <h6 className="fw-bold text-white mb-2">AUDIT SUCCESSFUL: Hash Secure</h6>
                  <p className="text-secondary small mb-3">
                    JTR ran full custom wordlists, standard rockyou list, and incremental attacks, but could **not** crack your password. It is secure against standard dictionary techniques.
                  </p>
                  <button onClick={() => setAuditMode('select')} className="btn btn-outline-success btn-sm px-4">
                    Clear Logs & Close
                  </button>
                </div>
              )}
            </div>

            {/* Diagnostic Logs / Insights Details */}
            <div className="glass-card p-4 flex-grow-1">
              <h5 className="fw-bold mb-3 text-white border-bottom pb-2" style={{ fontSize: '1rem' }}>
                Complexity Analysis Diagnostic Items
              </h5>
              
              <div className="mb-0">
                {/* Score reasons */}
                {user.analysis?.reasons && user.analysis.reasons.length > 0 ? (
                  <div className="mb-3">
                    <div className="text-danger small fw-bold mb-2 d-flex align-items-center gap-1">
                      <MdWarning /> Detected Vulnerability Reasons:
                    </div>
                    {user.analysis.reasons.map((reason, idx) => (
                      <div key={idx} className="reason-item">{reason}</div>
                    ))}
                  </div>
                ) : (
                  <div className="alert alert-success border-0 bg-success bg-opacity-5 text-success small mb-3 d-flex align-items-center gap-2">
                    <MdCheckCircle className="fs-5" />
                    <span>No personal complexity design flaws detected.</span>
                  </div>
                )}

                {/* Score recommendations */}
                {user.analysis?.recommendations && user.analysis.recommendations.length > 0 && (
                  <div>
                    <div className="text-success small fw-bold mb-2">
                      💡 Suggested Strengthening Steps:
                    </div>
                    {user.analysis.recommendations.map((rec, idx) => (
                      <div key={idx} className="recommendation-item">{rec}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
