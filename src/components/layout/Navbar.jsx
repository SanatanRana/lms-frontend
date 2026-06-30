/* eslint-disable react-hooks/set-state-in-effect */
import { useContext, useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../services/api';
import Avatar from '../common/Avatar';
import Button from '../common/Button';

const Navbar = () => {
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

  const getGreetingName = () => {
    if (user?.name) return user.name.split(' ')[0];
    return user?.role || 'User';
  };

  return (
    <nav className={`sticky top-0 z-50 transition-all duration-300 ${
      scrolled 
        ? 'bg-background/95 backdrop-blur-xl shadow-lg border-b border-border' 
        : 'bg-transparent border-b border-transparent'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-between items-center">
        {/* Left Side: Mobile Hamburger Menu & Logo */}
        <div className="flex items-center space-x-2">
          {/* Mobile Hamburger Button */}
          <button 
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden p-2 text-text-muted hover:text-white rounded-xl hover:bg-card-light transition cursor-pointer shrink-0"
            aria-label="Open side menu"
            aria-expanded={mobileMenuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
            <img 
              src="/logo-icon.jpg" 
              alt="LearnGen Logo" 
              className="w-8.5 h-8.5 rounded-xl object-cover shadow-glow group-hover:opacity-90 transition"
            />
            <span className="text-lg font-extrabold text-white tracking-tight">
              Learn<span className="text-primary-light">Gen</span>
            </span>
          </Link>
        </div>

        {/* Desktop Navigation Links */}
        <div className="hidden md:flex items-center space-x-1">
          <Link 
            to="/courses" 
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              location.pathname === '/courses' 
                ? 'text-primary bg-primary/10' 
                : 'text-text-muted hover:text-white hover:bg-card-light/50'
            }`}
          >
            Browse Courses
          </Link>

          {user && (
            <Link 
              to="/dashboard" 
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                location.pathname === '/dashboard' 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-muted hover:text-white hover:bg-card-light/50'
              }`}
            >
              Dashboard
            </Link>
          )}

          {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && (
            <Link 
              to="/create-course" 
              className="ml-1 bg-card hover:bg-card-light text-text-main border border-border px-4 py-2 rounded-lg text-sm font-semibold transition"
            >
              + New Course
            </Link>
          )}
        </div>

        {/* Right Side Actions (Bell and ProfileDropdown) - Responsive */}
        <div className="flex items-center space-x-3">
          {!user ? (
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Link to="/login" className="text-text-muted hover:text-white transition font-medium text-xs sm:text-sm px-3 py-2">
                Sign In
              </Link>
              <Link to="/register" className="hidden sm:inline-block">
                <Button variant="primary" size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 text-text-muted hover:text-white rounded-xl bg-card-light/50 hover:bg-card-light transition relative cursor-pointer"
                  aria-expanded={showNotifications}
                  aria-haspopup="true"
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
                  <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-2xl shadow-2xl py-3 px-4 z-50 animate-scale-in">
                    <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                      <h4 className="font-bold text-sm text-white">Notifications</h4>
                      {unreadCount > 0 && (
                        <button 
                          onClick={handleMarkAllAsRead}
                          className="text-xs text-primary hover:text-primary-light font-semibold cursor-pointer"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <p className="text-center text-xs text-text-muted py-6">No notifications yet.</p>
                      ) : (
                        notifications.map(n => (
                          <div 
                            key={n.id} 
                            className={`p-2.5 rounded-xl transition ${n.read ? 'bg-transparent' : 'bg-card-light border border-border'}`}
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-xs text-text-main">{n.title}</span>
                              {!n.read && (
                                <button 
                                  onClick={() => handleMarkAsRead(n.id)}
                                  className="text-[10px] text-primary hover:text-primary-light font-semibold cursor-pointer"
                                >
                                  Mark read
                                </button>
                              )}
                            </div>
                            <p className="text-text-muted text-[11px] mt-1 leading-relaxed">{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* User Profile */}
              <div className="flex items-center space-x-2.5 pl-2 border-l border-border">
                <div 
                  onClick={() => navigate('/dashboard')}
                  className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition shrink-0"
                  title="Go to Dashboard"
                >
                  <Avatar name={user.name || user.role} size="sm" />
                  <div className="hidden md:flex flex-col">
                    <span className="text-xs font-semibold text-white leading-tight">{getGreetingName()}</span>
                    <span className="text-[10px] text-text-muted">{user.role}</span>
                  </div>
                </div>
                
                <Button 
                  onClick={handleLogout}
                  variant="ghost" 
                  size="sm"
                  className="hidden md:flex text-error bg-error/10 hover:bg-error/20 border-transparent px-3 py-1.5"
                >
                  Log Out
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════ MOBILE DRAWER SIDEBAR OVERLAY ═══════════════════ */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          ></div>

          {/* Drawer Container */}
          <div className="relative flex flex-col w-72 max-w-xs bg-card border-r border-border h-full shadow-2xl z-50 animate-slide-in">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <Link to="/" className="flex items-center space-x-2.5" onClick={() => setMobileMenuOpen(false)}>
                <img 
                  src="/logo-icon.jpg" 
                  alt="LearnGen Logo" 
                  className="w-8 h-8 rounded-xl object-cover shadow-glow" 
                />
                <span className="text-base font-black text-white tracking-tight">
                  Learn<span className="text-primary-light">Gen</span>
                </span>
              </Link>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-card-light cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Info Card */}
            {user && (
              <div className="p-4 border-b border-border bg-card-light/10">
                <div className="flex items-center space-x-3">
                  <Avatar name={user.name || user.role} size="md" />
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{user.name || 'User'}</span>
                    <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-wider">{user.role}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Navigation Links */}
            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
              <Link
                to="/courses"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold border transition ${
                  location.pathname === '/courses'
                    ? 'bg-primary-600/10 border-primary-600/20 text-primary-400'
                    : 'text-text-muted hover:bg-card-light/40 hover:text-white border-transparent'
                }`}
              >
                <span>Browse Courses</span>
              </Link>

              {user && (
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold border transition ${
                    location.pathname === '/dashboard'
                      ? 'bg-primary-600/10 border-primary-600/20 text-primary-400'
                      : 'text-text-muted hover:bg-card-light/40 hover:text-white border-transparent'
                  }`}
                >
                  <span>Dashboard</span>
                </Link>
              )}

              {user && (user.role === 'TEACHER' || user.role === 'ADMIN') && (
                <Link
                  to="/create-course"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold border transition ${
                    location.pathname === '/create-course'
                      ? 'bg-primary-600/10 border-primary-600/20 text-primary-400'
                      : 'text-text-muted hover:bg-card-light/40 hover:text-white border-transparent'
                  }`}
                >
                  <span>+ New Course</span>
                </Link>
              )}

              {!user && (
                <div className="pt-4 space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center w-full px-4 py-2.5 border border-border rounded-xl text-xs font-bold text-slate-300 hover:text-white"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-center w-full px-4 py-2.5 bg-primary hover:bg-primary-light rounded-xl text-xs font-bold text-white"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </nav>

            {/* Logout Footer (Only if logged in) */}
            {user && (
              <div className="p-4 border-t border-border">
                <Button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  variant="ghost"
                  className="w-full text-error bg-error/10 hover:bg-error/20 border-transparent py-2.5 rounded-xl font-bold text-xs"
                >
                  <svg className="w-4.5 h-4.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Log Out</span>
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
