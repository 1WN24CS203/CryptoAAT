import React from 'react';
import { Link } from 'react-router-dom';
import { MdSecurity, MdLockReset, MdAssessment, MdOutlineVerified } from 'react-icons/md';

function Home() {
  return (
    <div className="animate-fade-in py-5 text-center">
      {/* Hero Section */}
      <div className="row justify-content-center py-5">
        <div className="col-lg-8 py-5">
          <div className="badge bg-light text-dark border px-3 py-2 mb-3">
            🔐 Password Security Analyzer
          </div>
          <h1 className="display-5 fw-bold mb-4 text-dark">
            Analyze Your Password Risk. <br />
            <span className="text-primary">Secure Your Identity.</span>
          </h1>
          <div className="d-flex justify-content-center gap-3">
            <Link to="/register" className="btn btn-primary px-4 py-2 text-white">
              Get Started
            </Link>
            <Link to="/login" className="btn btn-outline-secondary px-4 py-2">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
