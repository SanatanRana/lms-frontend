import { useContext, useState, useEffect, useRef } from 'react';
import { Outlet, Navigate, Link, useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Avatar from '../components/common/Avatar';
import Button from '../components/common/Button';
import api from '../services/api';

const DashboardLayout = () => {
  const { user, loading, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const notifRef = useRef(null);
  const profileRef = useRef(null);

  // Pull to refresh gesture states
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const touchStartRef = useRef(0);

  const handleTouchStart = (e) => {
    const container = e.currentTarget;
    if (container.scrollTop === 0) {
      touchStartRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    const distance = currentY - touchStartRef.current;
    if (distance > 0) {
      setPullDistance(Math.min(distance * 0.45, 70));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 55) {
      window.location.reload();
    }
    setPullDistance(0);
    setIsPulling(false);
  };

  // Close menus on path changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDrawerOpen(false);
    setShowNotifications(false);
    setShowProfileMenu(false);
  }, [location.pathname, location.search]);

  // Fetch notifications
  const fetchUnreadCount = async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      setUnreadCount(response.data.data);
    } catch (error) {
      console.error("Error fetching unread count:", error);
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

  useEffect(() => {
    if (user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchUnreadCount();
      fetchNotifications();
    }
  }, [user]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner text="Authenticating user session..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const handleLogout = () => {
    logout();
    navigate('/');
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

  const handleMarkAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      fetchUnreadCount();
      fetchNotifications();
    } catch (error) {
      console.error("Error marking notification read:", error);
    }
  };

  // Nav Links based on Role
  const getNavLinks = () => {
    const common = [
      {
        label: 'Explore Courses',
        path: '/',
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )
      }
    ];

    if (user.role === 'STUDENT') {
      return [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          )
        },
        ...common,
        {
          label: 'My Courses',
          path: '/dashboard?tab=my-courses',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        },
        {
          label: 'Live Classes',
          path: '/dashboard?tab=live',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          label: 'Certificates',
          path: '/dashboard?tab=certificates',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )
        },
        {
          label: 'Achievements',
          path: '/dashboard?tab=achievements',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          )
        }
      ];
    }

    if (user.role === 'TEACHER') {
      return [
        {
          label: 'Dashboard',
          path: '/dashboard',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          )
        },
        {
          label: 'Create Course',
          path: '/create-course',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        ...common
      ];
    }

    if (user.role === 'ADMIN') {
      return [
        {
          label: 'Overview',
          path: '/dashboard?tab=overview',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" />
            </svg>
          )
        },
        {
          label: 'Manage Users',
          path: '/dashboard?tab=users',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          )
        },
        {
          label: 'Manage Courses',
          path: '/dashboard?tab=courses',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          )
        },
        {
          label: 'Enrollments',
          path: '/dashboard?tab=enrollments',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )
        },
        {
          label: 'Transactions',
          path: '/dashboard?tab=transactions',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          )
        },
        {
          label: 'Manage Coupons',
          path: '/dashboard?tab=coupons',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )
        },
        {
          label: 'Create Course',
          path: '/create-course',
          icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )
        },
        ...common
      ];
    }

    return common;
  };

  // Bottom Navigation tabs for Mobile
  const getBottomLinks = () => {
    if (user.role === 'STUDENT') {
      return [
        { 
          label: 'Home', 
          path: '/dashboard', 
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> 
        },
        { 
          label: 'Explore', 
          path: '/', 
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> 
        },
        { 
          label: 'My Courses', 
          path: '/dashboard?tab=my-courses', 
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> 
        },
        { 
          label: 'Live Classes', 
          path: '/dashboard?tab=live', 
          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /> 
        }
      ];
    }
    if (user.role === 'TEACHER') {
      return [
        { label: 'Home', path: '/dashboard', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
        { label: 'Create', path: '/create-course', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /> },
        { label: 'Explore', path: '/', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /> }
      ];
    }
    if (user.role === 'ADMIN') {
      return [
        { label: 'Overview', path: '/dashboard?tab=overview', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /> },
        { label: 'Users', path: '/dashboard?tab=users', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
        { label: 'Courses', path: '/dashboard?tab=courses', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
        { label: 'Coupons', path: '/dashboard?tab=coupons', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /> }
      ];
    }
    return [];
  };

  const navLinks = getNavLinks();
  const bottomLinks = getBottomLinks();

  const isLearnPage = location.pathname.includes('/learn');

  let titleStr = 'Dashboard';
  if (location.pathname === '/' || location.pathname === '/courses') {
    titleStr = 'Explore Courses';
  } else if (location.pathname.includes('/learn')) {
    titleStr = 'Learning Center';
  } else if (location.pathname.startsWith('/course/')) {
    titleStr = 'Course Details';
  } else if (location.pathname === '/create-course') {
    titleStr = 'Create New Course';
  } else if (location.search.includes('tab=')) {
    const tabName = location.search.split('tab=')[1].split('&')[0];
    if (tabName === 'my-courses') titleStr = 'My Courses';
    else if (tabName === 'live') titleStr = 'Live Classes';
    else if (tabName === 'certificates') titleStr = 'Certificates';
    else if (tabName === 'achievements') titleStr = 'Achievements';
    else titleStr = tabName.charAt(0).toUpperCase() + tabName.slice(1);
  } else if (location.pathname.substring(1)) {
    titleStr = location.pathname.substring(1);
  }

  return (
    <div className="min-h-screen bg-background text-text-main flex overflow-hidden">
      
      {/* ═══════════════════ DESKTOP SIDEBAR ═══════════════════ */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-card border-r border-border shrink-0 z-30">
        {/* Brand Header */}
        <div className="h-16 flex items-center px-6 border-b border-border">
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-base">
              A
            </div>
            <span className="text-lg font-black text-white tracking-tight">AuraLMS</span>
          </Link>
        </div>

        {/* User Mini Profile */}
        <div className="p-4 border-b border-border bg-card-light/25">
          <div className="flex items-center space-x-3">
            <Avatar name={user.name || user.role} size="md" />
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold text-white truncate">{user.name || 'User'}</span>
              <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-wider">{user.role}</span>
            </div>
          </div>
        </div>

        {/* Sidebar Nav links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {navLinks.map((link, idx) => {
            const isActive = location.pathname + location.search === link.path || 
                             (link.path === '/dashboard' && location.pathname === '/dashboard' && !location.search);
            return (
              <Link
                key={idx}
                to={link.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition duration-150 ${
                  isActive 
                    ? 'bg-primary-600/10 border border-primary-600/20 text-primary-400' 
                    : 'text-text-muted hover:bg-card-light/40 hover:text-white border border-transparent'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-4 border-t border-border">
          <Button
            onClick={handleLogout}
            variant="ghost"
            className="w-full text-error bg-error/10 hover:bg-error/20 border-transparent py-2.5 rounded-xl font-bold text-xs"
          >
            <svg className="w-4.5 h-4.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span>Log Out</span>
          </Button>
        </div>
      </aside>

      {/* ═══════════════════ MAIN CONTENT AREA ═══════════════════ */}
      <div 
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto pb-20 lg:pb-0 h-screen"
      >
        {/* Pull to refresh mobile indicator */}
        {pullDistance > 10 && (
          <div 
            className="flex items-center justify-center bg-card border-b border-border transition-all overflow-hidden shrink-0" 
            style={{ height: `${pullDistance}px` }}
          >
            <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-widest animate-pulse">
              {pullDistance > 55 ? 'Release to Refresh ⚡' : 'Pull to Refresh ⬇'}
            </span>
          </div>
        )}
        
        {/* ── Top Navbar (Mobile & Desktop) ── */}
        <header className="h-16 bg-card/85 backdrop-blur-md border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
          
          <div className="flex items-center space-x-4">
            {isLearnPage ? (
              <button
                onClick={() => navigate('/dashboard?tab=my-courses')}
                className="p-2 text-text-muted hover:text-white rounded-xl hover:bg-card-light transition cursor-pointer flex items-center space-x-1"
                aria-label="Go back to courses"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="hidden sm:inline text-xs font-bold">Back</span>
              </button>
            ) : (
              /* Hamburger Button (Mobile Only) */
              <button
                onClick={() => setIsDrawerOpen(true)}
                className="lg:hidden p-2 text-text-muted hover:text-white rounded-xl hover:bg-card-light transition cursor-pointer"
                aria-label="Open sidebar menu"
                aria-expanded={isDrawerOpen}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}

            {/* View Title */}
            <h1 className="text-base md:text-lg font-extrabold text-white tracking-tight capitalize">
              {titleStr}
            </h1>
          </div>

          {/* Top Bar Actions */}
          <div className="flex items-center space-x-3">
            
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2.5 text-text-muted hover:text-white rounded-xl bg-card-light/45 hover:bg-card-light transition relative cursor-pointer"
                aria-label="Toggle notifications menu"
                aria-expanded={showNotifications}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full animate-ping"></span>
                )}
              </button>

              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2.5 w-80 bg-card border border-border rounded-2xl shadow-2xl py-3 px-4 z-50 animate-scale-in">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-border">
                    <h4 className="font-extrabold text-xs text-white uppercase tracking-wider">Notifications</h4>
                    {unreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] text-primary hover:text-primary-light font-bold cursor-pointer"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <p className="text-center text-xs text-text-muted py-6 italic">No new alerts.</p>
                    ) : (
                      notifications.map(n => (
                        <div
                          key={n.id}
                          className={`p-2.5 rounded-xl transition ${n.read ? 'bg-transparent' : 'bg-card-light border border-border/50'}`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs text-text-main leading-tight">{n.title}</span>
                            {!n.read && (
                              <button
                                onClick={() => handleMarkAsRead(n.id)}
                                className="text-[9px] text-primary hover:text-primary-light font-bold cursor-pointer shrink-0"
                              >
                                Mark read
                              </button>
                            )}
                          </div>
                          <p className="text-text-muted text-[10px] mt-1 leading-normal">{n.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="relative border-l border-border pl-3 flex items-center" ref={profileRef}>
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center space-x-2.5 cursor-pointer hover:opacity-85 transition shrink-0"
              >
                <Avatar name={user.name || user.role} size="sm" />
                <svg className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 hidden md:block ${showProfileMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Profile Dropdown Box */}
              {showProfileMenu && (
                <div className="absolute right-0 top-11 w-48 bg-card border border-border rounded-xl shadow-2xl py-2 z-50 animate-scale-in">
                  <div className="px-4 py-2 border-b border-border">
                    <p className="text-xs font-bold text-white truncate">{user.name || 'User'}</p>
                    <p className="text-[10px] text-text-muted truncate">{user.email}</p>
                  </div>
                  <Link to="/dashboard" className="block px-4 py-2 text-xs text-text-main hover:bg-card-light transition">
                    My Account
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2 text-xs text-error hover:bg-error/10 transition cursor-pointer"
                  >
                    Log Out
                  </button>
                </div>
              )}
            </div>

          </div>
        </header>

        {/* ── Main Scroll Content ── */}
        <main className={`flex-grow w-full mx-auto ${isLearnPage ? 'p-0 max-w-none' : 'p-4 md:p-6 lg:p-8 max-w-7xl'}`}>
          <Outlet />
        </main>
      </div>

      {/* ═══════════════════ MOBILE DRAWER OVERLAY ═══════════════════ */}
      {isDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Blur */}
          <div
            onClick={() => setIsDrawerOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-fade-in"
          ></div>

          {/* Drawer Container */}
          <div className="relative flex flex-col w-72 max-w-xs bg-card border-r border-border h-full shadow-2xl transform transition-transform duration-300 z-50 animate-slide-in">
            {/* Header */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-border">
              <Link to="/" className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-base">
                  A
                </div>
                <span className="text-base font-black text-white tracking-tight">AuraLMS</span>
              </Link>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 text-text-muted hover:text-white rounded-lg hover:bg-card-light cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile */}
            <div className="p-4 border-b border-border bg-card-light/10">
              <div className="flex items-center space-x-3">
                <Avatar name={user.name || user.role} size="md" />
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-bold text-white truncate">{user.name || 'User'}</span>
                  <span className="text-[10px] text-primary-400 font-extrabold uppercase tracking-wider">{user.role}</span>
                </div>
              </div>
            </div>

            {/* Links */}
            <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
              {navLinks.map((link, idx) => {
                const isActive = (link.path.includes('tab=my-courses') && location.pathname.includes('/learn')) ||
                                 (link.path.includes('tab=') 
                                   ? (location.pathname === '/dashboard' && location.search.includes(link.path.split('?')[1]))
                                   : (link.path === '/dashboard' 
                                       ? (location.pathname === '/dashboard' && !location.search.includes('tab=')) 
                                       : (location.pathname === link.path)));
                return (
                  <Link
                    key={idx}
                    to={link.path}
                    className={`flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition duration-150 ${
                      isActive 
                        ? 'bg-primary-600/10 border border-primary-600/20 text-primary-400' 
                        : 'text-text-muted hover:bg-card-light/40 hover:text-white border border-transparent'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-border">
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full text-error bg-error/10 hover:bg-error/20 border-transparent py-2.5 rounded-xl font-bold text-xs"
              >
                <svg className="w-4.5 h-4.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Log Out</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════ MOBILE STICKY BOTTOM NAVIGATION ═══════════════════ */}
      {bottomLinks.length > 0 && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border z-45 flex items-center justify-around px-2 shadow-2xl">
          {bottomLinks.map((link, idx) => {
            const isActive = (link.path.includes('tab=my-courses') && location.pathname.includes('/learn')) ||
                             (link.path.includes('tab=') 
                               ? (location.pathname === '/dashboard' && location.search.includes(link.path.split('?')[1]))
                               : (link.path === '/dashboard' 
                                   ? (location.pathname === '/dashboard' && !location.search.includes('tab=')) 
                                   : (location.pathname === link.path)));
            return (
              <Link
                key={idx}
                to={link.path}
                className={`flex flex-col items-center justify-center w-14 h-12 transition transform active:scale-95 duration-200 relative ${
                  isActive ? 'text-primary' : 'text-text-muted hover:text-white'
                }`}
              >
                <svg className="w-5.5 h-5.5 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {link.icon}
                </svg>
                <span className="text-[9px] font-bold mt-1 tracking-tight">{link.label}</span>
                {isActive && (
                  <span className="absolute -bottom-1.5 w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                )}
              </Link>
            );
          })}
        </nav>
      )}

    </div>
  );
};

export default DashboardLayout;
