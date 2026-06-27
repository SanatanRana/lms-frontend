import React, { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';
import AdminDashboard from './AdminDashboard';

const Dashboard = () => {
  const { user } = useContext(AuthContext);

  if (!user) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-white font-bold text-xl">Access Denied</h2>
        <p className="text-slate-400 text-sm mt-2">Please login to view your dashboard.</p>
      </div>
    );
  }

  // Renders the specific dashboard layout based on the user's role
  switch (user.role) {
    case 'ADMIN':
      return <AdminDashboard />;
    case 'TEACHER':
      return <TeacherDashboard />;
    case 'STUDENT':
    default:
      return <StudentDashboard />;
  }
};

export default Dashboard;
