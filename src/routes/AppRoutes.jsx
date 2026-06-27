import React from 'react';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/ProtectedRoute';
import Login from '../pages/auth/Login';
import Register from '../pages/auth/Register';
import Home from '../pages/Home';
import Dashboard from '../pages/dashboard/Dashboard';
import CreateCourse from '../pages/course/CreateCourse';
import CourseDetail from '../pages/course/CourseDetail';
import CourseLearn from '../pages/course/CourseLearn';
import NotFound from '../pages/NotFound';


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
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<Home />} />
      <Route path="/courses" element={<Home />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      {/* Course Detail (Public/Protected check is done inside the component) */}
      <Route path="/course/:id" element={<CourseDetail />} />

      {/* Protected Routes (Any Authenticated User) */}
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />

      {/* Course Learn Room (Student Enrolled Only or Admin/Teacher) */}
      <Route 
        path="/course/:id/learn" 
        element={
          <ProtectedRoute>
            <CourseLearn />
          </ProtectedRoute>
        } 
      />
      
      {/* Role-Protected Routes (Teacher/Admin Only) */}
      <Route 
        path="/create-course" 
        element={
          <ProtectedRoute allowedRoles={['TEACHER', 'ADMIN']}>
            <CreateCourse />
          </ProtectedRoute>
        } 
      />
      
      {/* 404 Catch-All Route */}
      <Route path="*" element={<NotFound />} />
    </Routes>

  );
};

export default AppRoutes;