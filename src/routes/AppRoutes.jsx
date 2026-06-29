import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/navigation/ProtectedRoute';
import AppLayout from '../layouts/AppLayout';
import AuthLayout from '../layouts/AuthLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import AdaptiveLayout from '../layouts/AdaptiveLayout';
import LoadingSpinner from '../components/common/LoadingSpinner';

// Lazy load route pages
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/auth/Login'));
const Register = lazy(() => import('../pages/auth/Register'));
const Dashboard = lazy(() => import('../pages/dashboard/Dashboard'));
const CreateCourse = lazy(() => import('../pages/course/CreateCourse'));
const CourseDetail = lazy(() => import('../pages/course/CourseDetail'));
const CourseLearn = lazy(() => import('../pages/course/CourseLearn'));
const LiveJoinGate = lazy(() => import('../pages/live/LiveJoinGate'));
const LiveClassroom = lazy(() => import('../pages/live/LiveClassroom'));
const NotFound = lazy(() => import('../pages/NotFound'));

const Unauthorized = () => (
  <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4">
    <h2 className="text-3xl font-extrabold text-rose-500 mb-2">Unauthorized Access</h2>
    <p className="text-slate-400 text-sm max-w-md">
      You do not have the required permissions or role authorization level to access this dashboard page.
    </p>
  </div>
);

const AppRoutes = () => {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen bg-[#0c1222] flex items-center justify-center">
          <LoadingSpinner text="Retrieving workspace..." />
        </div>
      }
    >
      <Routes>
        {/* Adaptive Layout Routes (uses DashboardLayout if logged in, AppLayout if guest) */}
        <Route element={<AdaptiveLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/courses" element={<Home />} />
          <Route path="/unauthorized" element={<Unauthorized />} />
          <Route path="/course/:id" element={<CourseDetail />} />
          
          <Route 
            path="/create-course" 
            element={
              <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
                <CreateCourse />
              </ProtectedRoute>
            } 
          />
        </Route>

        {/* Dedicated Full Width AppLayout Routes */}
        <Route element={<AppLayout />}>
          <Route path="/live/join/:roomToken" element={<LiveJoinGate />} />
          <Route path="/live/classroom/:roomToken" element={<LiveClassroom />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Auth Pages (Clean Split Layout without site header/footer) */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Dashboard View Layout */}
        <Route element={<DashboardLayout />}>
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/course/:id/learn" 
            element={
              <ProtectedRoute>
                <CourseLearn />
              </ProtectedRoute>
            } 
          />
        </Route>
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;