import React, { useEffect } from 'react';
import { apiRequest } from '../utils/api';
import { MdPerson, MdCalendarToday, MdSchool, MdFavoriteBorder } from 'react-icons/md';

function Dashboard({ user, setUser }) {
  // Load user profile details on load to ensure sync
  useEffect(() => {
    const fetchUserData = async () => {
      const data = await apiRequest('/profile');
      if (data.success) {
        setUser(data.user);
      }
    };
    fetchUserData();
  }, [setUser]);

  return (
    <div className="animate-fade-in py-5 text-center">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <h1 className="display-4 fw-bold text-dark mb-2">Hello, {user.name}!</h1>
          <p className="text-muted lead mb-4">You have successfully logged in.</p>

          <div className="glass-card p-4 text-start bg-white border border-light-subtle">
            <h5 className="fw-bold mb-3 text-dark border-bottom pb-2">Active Profile Details</h5>
            <div className="d-flex flex-column gap-3 mt-3">
              <div className="d-flex align-items-center gap-2 text-muted">
                <MdPerson className="fs-5 text-primary" />
                <span><strong>Email Username:</strong> {user.email}</span>
              </div>
              <div className="d-flex align-items-center gap-2 text-muted">
                <MdCalendarToday className="fs-5 text-primary" />
                <span><strong>Date of Birth:</strong> {user.dob}</span>
              </div>
              <div className="d-flex align-items-center gap-2 text-muted">
                <MdSchool className="fs-5 text-primary" />
                <span><strong>College:</strong> {user.collegeName}</span>
              </div>
              <div className="d-flex align-items-center gap-2 text-muted">
                <MdFavoriteBorder className="fs-5 text-primary" />
                <span><strong>Favorite Word:</strong> {user.favoriteWord}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
