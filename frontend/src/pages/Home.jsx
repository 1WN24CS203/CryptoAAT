import React from 'react';
import { Link } from 'react-router-dom';
import { MdSecurity, MdSpeed, MdTerminal, MdCheckCircle } from 'react-icons/md';

function Home() {
  return (
    <div className="animate-fade-in py-5">
      {/* Hero Section */}
      <div className="row justify-content-center text-center py-5">
        <div className="col-lg-8 py-4">
          <div className="d-inline-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-primary bg-opacity-10 border border-primary border-opacity-20 text-primary mb-3">
            <span className="d-block w-2 h-2 rounded-circle bg-primary animate-ping" style={{ width: '8px', height: '8px' }}></span>
            <span className="small fw-semibold">🔐 Advanced Password Cryptographic Auditor</span>
          </div>
          <h1 className="display-4 fw-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Evaluate Password Strength Against <br />
            <span className="text-primary">Real-world Dictionary Attacks</span>
          </h1>
          <p className="text-secondary fs-5 mb-5 mx-auto" style={{ maxWidth: '650px' }}>
            CryptoAAT utilizes profile-targeted custom wordlists and executes parallel standard dictionary (rockyou.txt) attacks to discover if your passwords can be cracked by actual security auditing tools.
          </p>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn gradient-button px-4 py-3 text-white">
              Get Started Now
            </Link>
            <Link to="/login" className="btn btn-outline-secondary px-4 py-3" style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--text-secondary)' }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="row g-4 mt-4">
        <div className="col-md-4">
          <div className="glass-card p-4 h-100">
            <div className="d-inline-flex p-3 rounded bg-primary bg-opacity-10 text-primary mb-3">
              <MdSecurity className="fs-3" />
            </div>
            <h3 className="h5 fw-bold mb-2">Complexity Analyzer</h3>
            <p className="text-secondary small">
              Checks length, character sets, and scans for personal profile variables (dob, name, college) to prevent easy social-engineering cracking.
            </p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="glass-card p-4 h-100">
            <div className="d-inline-flex p-3 rounded bg-primary bg-opacity-10 text-primary mb-3">
              <MdSpeed className="fs-3" />
            </div>
            <h3 className="h5 fw-bold mb-2">Concurrent Attacks</h3>
            <p className="text-secondary small">
              Runs parallel John the Ripper (JTR) pipelines—simultaneously testing personalized mutations, standard dictionary lists, and incremental brute force.
            </p>
          </div>
        </div>
        <div className="col-md-4">
          <div className="glass-card p-4 h-100">
            <div className="d-inline-flex p-3 rounded bg-primary bg-opacity-10 text-primary mb-3">
              <MdTerminal className="fs-3" />
            </div>
            <h3 className="h5 fw-bold mb-2">Real Backend Cracking</h3>
            <p className="text-secondary small">
              No mock simulations. The platform runs actual JTR binaries in the Kali Linux terminal and streams real-time stdout logs to your browser.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
