import { useContext } from 'react';
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

  // Renders the specific dashboard based on the user's role
  switch (user.role) {
    case 'ADMIN':
      return (
        <div className="admin-portal-layout w-full page-transition">
          <AdminDashboard />
        </div>
      );
    case 'TEACHER':
      return (
        <div className="teacher-portal-layout w-full page-transition">
          <TeacherDashboard />
        </div>
      );
    case 'STUDENT':
    default:
      return (
        <div className="student-portal-layout w-full page-transition">
          <StudentDashboard />
        </div>
      );
  }
};

export default Dashboard;
