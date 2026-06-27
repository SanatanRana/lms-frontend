import React, { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../api/axiosConfig';

const NavBar = () => {
  const { user, logout } = useContext(AuthContext);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const notifRef = useRef(null);

  // Scroll detection for nav background
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowNotifications(false);
  }, [location.pathname]);

  // Fetch notifications
  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      fetchNotifications();
    }
  }, [user]);

  // Close notification dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.data);
    } catch (error) {
      console.error("Error fetching unread notifications count:", error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await api.get('/notifications');
      setNotifications(response.data.data.slice(0, 5));
    } catch (error) {
      console.error("Error fetching notifications:", error);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error("Error marking all read:", error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getUserInitial = () => {
    if (user?.name) return user.name.charAt(0).toUpperCase();
    if (user?.role) return user.role.charAt(0);
    return 'U';
  };

  const getGreetingName = () => {
    if (user?.name) return user.name.split(' ')[0];
    return user?.role || 'User';
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-surface-900/95 backdrop-blur-xl shadow-lg shadow-black/20 border-b border-surface-600/50' 
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-lg shadow-lg shadow-primary-600/20 group-hover:shadow-primary-600/40 transition">
            A
          </div>
          <span className="text-xl font-extrabold text-white">
            Aura<span className="text-primary-400">LMS</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          <Link 
            to="/courses" 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              location.pathname === '/courses' 
                ? 'text-primary-400 bg-primary-600/10' 
                : 'text-slate-300 hover:text-white hover:bg-surface-700/50'
            }`}
          >
            Browse Courses
          </Link>

          {user && (
            <Link 
              to="/dashboard" 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                location.pathname === '/dashboard' 
                  ? 'text-primary-400 bg-primary-600/10' 
                  : 'text-slate-300 hover:text-white hover:bg-surface-700/50'
              }`}
            >
              Dashboard
            </Link>
          )}

          {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && (
            <Link 
              to="/create-course" 
              className="ml-1 bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              + New Course
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center space-x-3">
          {!user ? (
            <div className="flex items-center space-x-3">
              <Link to="/login" className="text-slate-300 hover:text-white transition font-medium text-sm px-3 py-2">
                Sign In
              </Link>
              <Link to="/register" className="bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 transition">
                Get Started
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 text-slate-400 hover:text-white rounded-xl bg-surface-700/50 hover:bg-surface-700 transition relative"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-error text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-surface-800 border border-surface-600 rounded-2xl shadow-2xl py-3 px-4 z-50 animate-scale-in">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-surface-600">
                      <h4 className="font-bold text-sm text-white">Notifications</h4>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-slate-500 py-6">No notifications yet.</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={`p-2.5 rounded-xl transition ${n.read ? 'bg-transparent' : 'bg-surface-700/40 border border-surface-600'}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-xs text-slate-200">{n.title}</span>
                              {!n.read && (
                                <button 
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="text-[10px] text-primary-400 hover:text-primary-300 font-semibold"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                            <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-3 pl-2 border-l border-surface-600">
                <div 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2.5 cursor-pointer hover:opacity-80 transition"
                  title="Go to Dashboard"
                >
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center text-white text-xs font-bold">
                    {getUserInitial()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-white leading-tight">{getGreetingName()}</span>
                    <span className="text-[10px] text-slate-400">{user.role}</span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="bg-error/10 hover:bg-error/20 text-error px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                >
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-slate-400 hover:text-white transition"
        >
          {mobileMenuOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-surface-800 border-t border-surface-600 animate-slide-up">
          <div className="px-4 py-4 space-y-2">
            <Link to="/courses" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 transition">
              Browse Courses
            </Link>
            
            {user && (
              <>
                <Link to="/dashboard" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 transition">
                  Dashboard
                </Link>
                {(user.role === 'TEACHER' || user.role === 'ADMIN') && (
                  <Link to="/create-course" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 transition">
                    + New Course
                  </Link>
                )}
              </>
            )}

            <div className="pt-3 mt-3 border-t border-surface-600">
              {!user ? (
                <div className="space-y-2">
                  <Link to="/login" className="block px-4 py-3 rounded-xl text-sm font-medium text-slate-300 hover:text-white hover:bg-surface-700/50 transition text-center">
                    Sign In
                  </Link>
                  <Link to="/register" className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-primary-600 to-teal-500 text-center">
                    Get Started
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <div 
                    onClick={() => { navigate('/dashboard'); setMobileMenuOpen(false); }}
                    className="flex items-center space-x-3 px-4 py-2 cursor-pointer hover:opacity-85 transition"
                    title="Go to Dashboard"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center text-white text-sm font-bold">
                      {getUserInitial()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{getGreetingName()}</p>
                      <p className="text-xs text-slate-400">{user.role}</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="w-full px-4 py-3 rounded-xl text-sm font-semibold text-error bg-error/10 hover:bg-error/20 transition"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
