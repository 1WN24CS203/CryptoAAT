import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { MdOutlineSecurity, MdOutlineTerminal, MdOutlineCheckCircle, MdOutlineHighlightOff, MdOutlineArrowForward, MdStop } from 'react-icons/md';

const API_BASE = 'http://localhost:5000/api/auth';

function JtrRecovery() {
  const location  = useLocation();
  const navigate  = useNavigate();

  const email = location.state?.email || '';
  const otp   = location.state?.otp   || '';

  const [mode, setMode]                   = useState('select'); // 'select' | 'running' | 'cracked' | 'failed'
  const [lines, setLines]                 = useState([]);       // live log lines
  const [crackedPassword, setCrackedPassword] = useState('');
  const [winner, setWinner]               = useState('');
  const [timeTaken, setTimeTaken]         = useState('0.0');
  const [error, setError]                 = useState('');
  const [permission, setPermission]       = useState(false);
  const [countdown, setCountdown]         = useState(30);

  const terminalRef = useRef(null);
  const esRef       = useRef(null);  // holds the EventSource instance

  useEffect(() => {
    if (!email || !otp) navigate('/forgot-password');
  }, [email, otp, navigate]);

  // Auto-scroll terminal to bottom whenever a new line arrives
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [lines]);

  // Countdown after cracked
  useEffect(() => {
    if (mode === 'cracked') {
      setCountdown(30);
      const t = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(t);
            setCrackedPassword('');
            setMode('select');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(t);
    }
  }, [mode]);

  // Clean up SSE on unmount
  useEffect(() => {
    return () => {
      if (esRef.current) esRef.current.close();
    };
  }, []);

  const appendLine = (line) => {
    setLines(prev => [...prev, line]);
  };

  const handleAbort = () => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setLines(prev => [...prev, '', '⛔ Attack aborted by user.']);
    setError('Attack was manually aborted.');
    setMode('select');
  };

  const handleStartJtr = () => {
    setMode('running');
    setLines([]);
    setError('');
    setCrackedPassword('');
    setWinner('');

    // Close any existing SSE connection
    if (esRef.current) esRef.current.close();

    // Open SSE connection to real JTR stream endpoint
    const url = `${API_BASE}/jtr-stream?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}`;
    const es = new EventSource(url);
    esRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'log') {
          // Append line exactly as it comes from the real john binary
          appendLine(data.line);

        } else if (data.type === 'done') {
          es.close();
          esRef.current = null;
          setTimeTaken(data.timeTaken || '0.0');
          if (data.cracked && data.password) {
            setCrackedPassword(data.password);
            setWinner(data.winner || '');
            setMode('cracked');
          } else {
            setMode('failed');
          }

        } else if (data.type === 'error') {
          es.close();
          esRef.current = null;
          setError(data.message || 'An error occurred during JTR execution.');
          setMode('select');
        }
      } catch (e) {
        console.error('SSE parse error:', e);
      }
    };

    es.onerror = () => {
      es.close();
      esRef.current = null;
      if (mode === 'running') {
        setError('Connection to JTR stream lost. Check that the backend is running.');
        setMode('select');
      }
    };
  };

  const handleGoToReset = () => {
    if (esRef.current) esRef.current.close();
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

          {/* ── Mode: select ─────────────────────────────────────────────── */}
          {mode === 'select' && (
            <div className="d-flex flex-column gap-4 mt-2">

              {/* Option A: Live JTR */}
              <div className="border rounded p-4 bg-dark bg-opacity-20" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MdOutlineTerminal className="fs-4 text-primary animate-pulse" />
                  <h4 className="h5 fw-bold text-white mb-0">John the Ripper — Live Execution</h4>
                </div>
                <p className="text-secondary small mb-1">
                  Runs the <strong className="text-white">real <code>john</code> binary</strong> on your stored md5crypt hash from the database.
                  Output is streamed live from the process stdout/stderr — no simulation.
                </p>
                <p className="text-secondary small mb-3">
                  Three sequential strategies: <span className="text-primary">Custom Wordlist</span> →{' '}
                  <span className="text-primary">rockyou.txt</span> →{' '}
                  <span className="text-primary">Incremental Brute Force</span>
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
                    I authorise cryptographic attacks to be executed against my credential hash.
                  </label>
                </div>

                <button
                  onClick={handleStartJtr}
                  disabled={!permission}
                  className="btn gradient-button w-100 d-flex align-items-center justify-content-center gap-2"
                >
                  Launch JTR Live Attack <MdOutlineArrowForward />
                </button>
              </div>

              {/* Option B: Standard Reset */}
              <div className="border rounded p-4" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <div className="d-flex align-items-center gap-2 mb-2">
                  <MdOutlineSecurity className="fs-4 text-secondary" />
                  <h4 className="h5 fw-bold text-white mb-0">Direct Password Reset Override</h4>
                </div>
                <p className="text-secondary small mb-3">
                  Skip hash auditing entirely. Proceed to override the current credential with a new secure password immediately.
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

          {/* ── Mode: running — live terminal ────────────────────────────── */}
          {mode === 'running' && (
            <div>
              <div className="terminal-header">
                <div className="terminal-dots">
                  <span className="terminal-dot dot-red"></span>
                  <span className="terminal-dot dot-yellow"></span>
                  <span className="terminal-dot dot-green animate-blink"></span>
                </div>
                <div className="terminal-title">john@kali: live cracking session</div>
                <div style={{ width: '42px' }}></div>
              </div>

              <div
                ref={terminalRef}
                className="terminal-block"
                style={{
                  minHeight: '320px',
                  maxHeight: '420px',
                  overflowY: 'auto',
                  borderTopLeftRadius: '0',
                  borderTopRightRadius: '0',
                }}
              >
                {lines.map((line, i) => (
                  <div key={i} className="mb-1" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                    {line || '\u00a0'}
                  </div>
                ))}
                <span className="animate-blink text-success fw-bold">█</span>
              </div>

              <div className="d-flex justify-content-center mt-3">
                <button
                  onClick={handleAbort}
                  className="btn btn-outline-danger d-flex align-items-center gap-2 px-4"
                  style={{ borderColor: 'rgba(220,53,69,0.5)', fontSize: '0.85rem' }}
                >
                  <MdStop /> Abort Attack
                </button>
              </div>
              <p className="text-secondary small text-center mt-2">
                ⚡ Live output from <code>john</code> process — this is not a simulation
              </p>
            </div>
          )}

          {/* ── Mode: cracked ────────────────────────────────────────────── */}
          {mode === 'cracked' && (
            <div className="text-center py-4 glow-card-danger rounded border p-4">
              <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mb-3 border border-danger border-opacity-25">
                <MdOutlineHighlightOff className="display-4 animate-bounce" />
              </div>
              <h3 className="h4 fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Credential Decrypted!
              </h3>
              <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '500px' }}>
                Password hash cracked in <strong className="text-white">{timeTaken}s</strong> using{' '}
                <strong className="text-primary">{winner}</strong>. This proves the password is highly vulnerable.
              </p>

              <div className="bg-dark bg-opacity-40 border border-danger border-opacity-30 rounded p-4 my-4">
                <div className="text-muted small text-uppercase mb-2">Recovered Password:</div>
                <div className="fs-3 fw-bold text-danger font-monospace tracking-wide">{crackedPassword}</div>
                <div className="text-danger small mt-3 fw-semibold">
                  ⏱️ Panel locks in {countdown}s
                </div>
              </div>

              {/* Show last few terminal lines */}
              {lines.length > 0 && (
                <div className="text-start mb-4">
                  <div className="terminal-header">
                    <div className="terminal-dots">
                      <span className="terminal-dot dot-red"></span>
                      <span className="terminal-dot dot-yellow"></span>
                      <span className="terminal-dot dot-green"></span>
                    </div>
                    <div className="terminal-title">session log (last 5 lines)</div>
                    <div></div>
                  </div>
                  <div className="terminal-block text-start" style={{ maxHeight: '120px', borderTopLeftRadius: '0', borderTopRightRadius: '0', overflowY: 'auto' }}>
                    {lines.slice(-5).map((line, i) => (
                      <div key={i} className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>{line || '\u00a0'}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-center gap-3">
                <Link to="/login" className="btn btn-primary px-4 py-2">
                  Proceed to Login
                </Link>
                <button onClick={handleGoToReset} className="btn btn-outline-secondary px-4 py-2"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
                  Override Password
                </button>
              </div>
            </div>
          )}

          {/* ── Mode: failed ─────────────────────────────────────────────── */}
          {mode === 'failed' && (
            <div className="text-center py-4 glow-card-success rounded border p-4">
              <div className="d-inline-flex p-3 rounded-circle bg-success bg-opacity-10 text-success mb-3 border border-success border-opacity-25">
                <MdOutlineCheckCircle className="display-4" />
              </div>
              <h3 className="h4 fw-bold text-white mb-2" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Cryptographic Strength Verified
              </h3>
              <p className="text-secondary mx-auto mb-4" style={{ maxWidth: '500px' }}>
                All JTR attacks exhausted — custom wordlist, rockyou.txt dictionary, and incremental brute force.
                Password hash could not be cracked in <strong className="text-white">{timeTaken}s</strong>.
              </p>

              {lines.length > 0 && (
                <div className="text-start mb-4">
                  <div className="terminal-header">
                    <div className="terminal-dots">
                      <span className="terminal-dot dot-red"></span>
                      <span className="terminal-dot dot-yellow"></span>
                      <span className="terminal-dot dot-green"></span>
                    </div>
                    <div className="terminal-title">jtr session log (last 6 lines)</div>
                    <div></div>
                  </div>
                  <div className="terminal-block text-start" style={{ maxHeight: '140px', borderTopLeftRadius: '0', borderTopRightRadius: '0', overflowY: 'auto' }}>
                    {lines.slice(-6).map((line, i) => (
                      <div key={i} className="mb-1" style={{ whiteSpace: 'pre-wrap' }}>{line || '\u00a0'}</div>
                    ))}
                  </div>
                </div>
              )}

              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button onClick={handleGoToReset} className="btn gradient-button px-4 py-2 d-flex align-items-center gap-2">
                  Force Reset Password <MdOutlineArrowForward />
                </button>
                <button onClick={() => { setLines([]); setMode('select'); }} className="btn btn-outline-primary px-4 py-2">
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
