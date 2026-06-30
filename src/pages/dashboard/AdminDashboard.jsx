import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

// CSV Exporter Utility (defined outside to ensure hook purity)
const exportToCSV = (data, filename, onSuccess, onError) => {
  if (!data.length) {
    if (onError) onError('No data to export.');
    return;
  }
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => 
    Object.values(row).map(val => {
      if (val === null || val === undefined) return '';
      if (typeof val === 'object') return `"${JSON.stringify(val).replace(/"/g, '""')}"`;
      return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
    }).join(',')
  );
  const csvContent = "data:text/csv;charset=utf-8," + [headers, ...rows].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `${filename}_export_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  if (onSuccess) onSuccess('Data exported to CSV successfully!');
};

const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';

  // Datasets
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter State
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [courseSearch, setCourseSearch] = useState('');
  const [enrollSearch, setEnrollSearch] = useState('');
  const [txnSearch, setTxnSearch] = useState('');
  const [txnStatusFilter, setTxnStatusFilter] = useState('ALL');
  const [couponSearch, setCouponSearch] = useState('');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Sorting State
  const [sortField, setSortField] = useState('id');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'

  // Modals & Details State
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ studentId: '', courseId: '' });
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');
  const [submittingEnroll, setSubmittingEnroll] = useState(false);

  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [submittingCoupon, setSubmittingCoupon] = useState(false);

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState({ type: '', msg: '' });

  const showToast = (type, msg) => {
    setNotification({ type, msg });
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [userResp, analyticsResp, coursesResp, enrollmentsResp, txnResp, couponsResp] = await Promise.all([
        api.get('/admin/users'),
        api.get('/admin/analytics'),
        api.get('/admin/courses'),
        api.get('/admin/enrollments'),
        api.get('/admin/transactions'),
        api.get('/admin/coupons')
      ]);
      setUsers(userResp.data.data || []);
      setAnalytics(analyticsResp.data.data || null);
      setCourses(coursesResp.data.data || []);
      setEnrollments(enrollmentsResp.data.data || []);
      setTransactions(txnResp.data.data || []);
      setCoupons(couponsResp.data.data || []);
    } catch (error) {
      console.error("Error fetching admin data:", error);
      showToast('error', 'Failed to retrieve admin details from server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAdminData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reset pagination on tab changes
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
    setSortField('id');
    setSortOrder('desc');
  }, [activeTab]);

  const handleToggleUserActive = async (id) => {
    try {
      const response = await api.patch(`/admin/users/${id}/toggle-active`);
      if (response.data.success) {
        setUsers(users.map(u => u.id === id ? response.data.data : u));
        showToast('success', `User status changed to ${response.data.data.active ? 'Active' : 'Suspended'}`);
        if (selectedUser && selectedUser.id === id) {
          setSelectedUser(prev => ({ ...prev, active: response.data.data.active }));
        }
      }
    } catch (error) {
      console.error("Failed to toggle active state:", error);
      showToast('error', 'Failed to update user status.');
    }
  };

  const handleDeleteUser = async (id, role) => {
    if (!window.confirm(`Are you sure you want to permanently delete this ${role.toLowerCase()} account? This action will cascade-delete all their courses, enrollments, payments, and messaging records, and CANNOT be undone.`)) return;
    try {
      const response = await api.delete(`/admin/users/${id}`);
      if (response.data.success) {
        setUsers(users.filter(u => u.id !== id));
        showToast('success', 'User account deleted successfully.');
        
        // Refresh dashboard statistics
        const [analyticsResp, coursesResp, enrollmentsResp, txnResp] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/courses'),
          api.get('/admin/enrollments'),
          api.get('/admin/transactions')
        ]);
        setAnalytics(analyticsResp.data.data);
        setCourses(coursesResp.data.data);
        setEnrollments(enrollmentsResp.data.data);
        setTransactions(txnResp.data.data);
      }
    } catch (error) {
      console.error("Failed to delete user:", error);
      showToast('error', 'Failed to delete user account.');
    }
  };

  const handleViewUserDetails = async (userId) => {
    setModalLoading(true);
    setShowUserModal(true);
    setSelectedUser(null);
    try {
      const response = await api.get(`/admin/users/${userId}`);
      setSelectedUser(response.data.data);
    } catch (error) {
      console.error("Error retrieving detailed profile:", error);
      showToast('error', 'Failed to load user detailed profile.');
      setShowUserModal(false);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRevokeEnrollment = async (enrollmentId) => {
    if (!window.confirm("Are you sure you want to revoke this student's access? The enrollment will be deleted permanently.")) return;
    try {
      const response = await api.delete(`/admin/enrollments/${enrollmentId}`);
      if (response.data.success) {
        setEnrollments(enrollments.filter(e => e.id !== enrollmentId));
        showToast('success', 'Enrollment revoked successfully.');
        
        // Refresh analytics, courses, and transactions
        const [analyticsResp, coursesResp, txnResp] = await Promise.all([
          api.get('/admin/analytics'),
          api.get('/admin/courses'),
          api.get('/admin/transactions')
        ]);
        setAnalytics(analyticsResp.data.data);
        setCourses(coursesResp.data.data);
        setTransactions(txnResp.data.data);
      }
    } catch (error) {
      console.error("Failed to revoke enrollment:", error);
      showToast('error', 'Failed to revoke course enrollment.');
    }
  };

  const handleManualEnrollSubmit = async (e) => {
    e.preventDefault();
    setEnrollError('');
    setEnrollSuccess('');
    
    if (!enrollForm.studentId || !enrollForm.courseId) {
      setEnrollError('Please select both a student and a course.');
      return;
    }

    setSubmittingEnroll(true);
    try {
      const response = await api.post('/admin/enrollments', {
        studentId: parseInt(enrollForm.studentId),
        courseId: parseInt(enrollForm.courseId)
      });
      
      if (response.data.success) {
        setEnrollSuccess('Student enrolled successfully!');
        showToast('success', 'Enrollment completed successfully!');
        
        // Refresh listings
        const [enrollmentsResp, coursesResp, analyticsResp, txnResp] = await Promise.all([
          api.get('/admin/enrollments'),
          api.get('/admin/courses'),
          api.get('/admin/analytics'),
          api.get('/admin/transactions')
        ]);
        setEnrollments(enrollmentsResp.data.data);
        setCourses(coursesResp.data.data);
        setAnalytics(analyticsResp.data.data);
        setTransactions(txnResp.data.data);
        
        setEnrollForm({ studentId: '', courseId: '' });
        setTimeout(() => {
          setShowEnrollModal(false);
          setEnrollSuccess('');
        }, 1200);
      }
    } catch (error) {
      console.error(error);
      setEnrollError(error.response?.data?.message || 'Failed to manually enroll student. Check if already enrolled.');
    } finally {
      setSubmittingEnroll(false);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    setCouponError('');
    setCouponSuccess('');

    if (!couponForm.code.trim()) {
      setCouponError('Coupon code is required.');
      return;
    }
    if (!couponForm.discountPercent || parseInt(couponForm.discountPercent) < 1 || parseInt(couponForm.discountPercent) > 100) {
      setCouponError('Discount percent must be between 1 and 100.');
      return;
    }

    setSubmittingCoupon(true);
    try {
      const payload = {
        code: couponForm.code.trim().toUpperCase(),
        discountPercent: parseInt(couponForm.discountPercent),
        expiryDate: couponForm.expiryDate || null,
        maxUses: couponForm.maxUses ? parseInt(couponForm.maxUses) : null,
        active: couponForm.active
      };

      let response;
      if (editingCoupon) {
        response = await api.put(`/admin/coupons/${editingCoupon.id}`, payload);
      } else {
        response = await api.post('/admin/coupons', payload);
      }

      if (response.data.success) {
        setCouponSuccess(`Coupon ${editingCoupon ? 'updated' : 'created'} successfully!`);
        showToast('success', `Coupon code ${editingCoupon ? 'updated' : 'created'} successfully!`);
        const couponsResp = await api.get('/admin/coupons');
        setCoupons(couponsResp.data.data);

        setTimeout(() => {
          setShowCouponModal(false);
          setEditingCoupon(null);
          setCouponForm({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
          setCouponSuccess('');
        }, 1200);
      }
    } catch (error) {
      console.error(error);
      setCouponError(error.response?.data?.message || 'Failed to save coupon campaign.');
    } finally {
      setSubmittingCoupon(false);
    }
  };

  const handleOpenEditCoupon = (coupon) => {
    setEditingCoupon(coupon);
    setCouponForm({
      code: coupon.code,
      discountPercent: coupon.discountPercent,
      expiryDate: coupon.expiryDate || '',
      maxUses: coupon.maxUses || '',
      active: coupon.active
    });
    setCouponError('');
    setCouponSuccess('');
    setShowCouponModal(true);
  };

  const handleDeleteCoupon = async (couponId) => {
    if (!window.confirm("Are you sure you want to permanently delete this coupon code? Any active marketing campaigns will stop immediately.")) return;
    try {
      const response = await api.delete(`/admin/coupons/${couponId}`);
      if (response.data.success) {
        setCoupons(coupons.filter(c => c.id !== couponId));
        showToast('success', 'Coupon code deleted successfully.');
      }
    } catch (error) {
      console.error("Failed to delete coupon:", error);
      showToast('error', 'Failed to delete coupon.');
    }
  };

  const handleRegisterTeacherSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    setRegisterSuccess('');

    if (!registerForm.name.trim() || !registerForm.email.trim() || !registerForm.password.trim()) {
      setRegisterError('Name, email, and password are required.');
      return;
    }

    setSubmittingRegister(true);
    try {
      const response = await api.post('/admin/users/register-teacher', {
        name: registerForm.name.trim(),
        email: registerForm.email.trim(),
        phone: registerForm.phone.trim(),
        password: registerForm.password
      });

      if (response.data.success) {
        setRegisterSuccess('Teacher registered successfully!');
        showToast('success', 'Teacher account created successfully!');
        const userResp = await api.get('/admin/users');
        setUsers(userResp.data.data);

        setRegisterForm({ name: '', email: '', phone: '', password: '' });
        setTimeout(() => {
          setShowRegisterModal(false);
          setRegisterSuccess('');
        }, 1200);
      }
    } catch (error) {
      console.error("Failed to register teacher:", error);
      setRegisterError(error.response?.data?.message || 'Failed to register teacher account.');
    } finally {
      setSubmittingRegister(false);
    }
  };



  // Sorting Helper
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const getSortedData = (data) => {
    return [...data].sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      // Safe objects or nested values check
      if (typeof valA === 'object' && valA !== null) valA = valA.name || valA.title || '';
      if (typeof valB === 'object' && valB !== null) valB = valB.name || valB.title || '';

      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === 'string') {
        return sortOrder === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      }
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
        {/* Welcome HUD Skeleton */}
        <div className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2.5 w-full md:w-1/2">
            <div className="h-4 skeleton rounded-lg w-1/4"></div>
            <div className="h-8 skeleton rounded-xl w-3/4"></div>
          </div>
          <div className="h-10 skeleton rounded-xl w-48 shrink-0"></div>
        </div>

        {/* Stats Grid Skeleton */}
        <div className="flex overflow-x-auto snap-x snap-mandatory flex-nowrap gap-4 scrollbar-none pb-4 md:grid md:grid-cols-5 md:overflow-x-visible md:pb-0">
          {[1, 2, 3, 4, 5].map(n => (
            <div key={n} className="bg-card border border-border rounded-2xl p-5 space-y-3 w-[200px] shrink-0 snap-start md:w-auto md:shrink">
              <div className="h-3 skeleton rounded w-1/2"></div>
              <div className="h-7 skeleton rounded-lg w-3/4"></div>
              <div className="h-2.5 skeleton rounded w-2/3"></div>
            </div>
          ))}
        </div>

        {/* Dashboard Panels Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card border border-border rounded-3xl p-6 space-y-4">
            <div className="h-6 skeleton rounded-lg w-1/3"></div>
            <div className="h-36 skeleton rounded-2xl w-full"></div>
          </div>
          <div className="bg-card border border-border rounded-3xl p-6 space-y-4">
            <div className="h-6 skeleton rounded-lg w-1/2"></div>
            <div className="h-32 skeleton rounded-2xl w-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // 1. Filters Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
                          u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                          (u.phone && u.phone.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    return matchesSearch && matchesRole;
  });
  const sortedUsers = getSortedData(filteredUsers);
  const paginatedUsers = sortedUsers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 2. Filters Courses
  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.category.toLowerCase().includes(courseSearch.toLowerCase()) ||
    (c.teacherName && c.teacherName.toLowerCase().includes(courseSearch.toLowerCase()))
  );
  const sortedCourses = getSortedData(filteredCourses);
  const paginatedCourses = sortedCourses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 3. Filters Enrollments
  const filteredEnrollments = enrollments.filter(e => {
    const sName = e.student?.name || '';
    const sEmail = e.student?.email || '';
    const cTitle = e.course?.title || '';
    return sName.toLowerCase().includes(enrollSearch.toLowerCase()) ||
           sEmail.toLowerCase().includes(enrollSearch.toLowerCase()) ||
           cTitle.toLowerCase().includes(enrollSearch.toLowerCase());
  });
  const sortedEnrollments = getSortedData(filteredEnrollments);
  const paginatedEnrollments = sortedEnrollments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 4. Filters Transactions
  const filteredTransactions = transactions.filter(t => {
    const sName = t.user?.name || '';
    const sEmail = t.user?.email || '';
    const cTitle = t.course?.title || '';
    const txnId = t.transactionId || '';
    const matchesSearch = sName.toLowerCase().includes(txnSearch.toLowerCase()) ||
                          sEmail.toLowerCase().includes(txnSearch.toLowerCase()) ||
                          cTitle.toLowerCase().includes(txnSearch.toLowerCase()) ||
                          txnId.toLowerCase().includes(txnSearch.toLowerCase());
    const matchesStatus = txnStatusFilter === 'ALL' || t.paymentStatus === txnStatusFilter;
    return matchesSearch && matchesStatus;
  });
  const sortedTransactions = getSortedData(filteredTransactions);
  const paginatedTransactions = sortedTransactions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // 5. Filters Coupons
  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(couponSearch.toLowerCase())
  );
  const sortedCoupons = getSortedData(filteredCoupons);
  const paginatedCoupons = sortedCoupons.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Stats summary for widgets
  const studentsOnly = users.filter(u => u.role === 'STUDENT' && u.active);
  const totalPages = (totalItems) => Math.ceil(totalItems / itemsPerPage) || 1;

  // Chart setup
  const chartHeight = 140;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;
  const graphHeight = chartHeight - paddingY * 2;
  const graphWidth = chartWidth - paddingX * 2;
  const statsList = analytics?.monthlyStats || [];
  const maxVal = statsList.length > 0 ? Math.max(...statsList.map(s => s.amount), 500) : 500;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 animate-fade-in relative pb-16">
      
      <Toast 
        type={notification.type} 
        message={notification.msg} 
        onClose={() => setNotification({ type: '', msg: '' })} 
      />

      {/* ══════════════════ WELCOME SAAS HEADER ══════════════════ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-primary-950/40 via-card to-primary-950/10 border border-border p-6 rounded-3xl relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl animate-pulse"></div>
        <div>
          <span className="text-[10px] bg-primary-600/15 border border-primary-600/35 text-primary-400 font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider">
            SaaS Administration Console
          </span>
          <h2 className="text-xl md:text-2xl font-black text-white mt-1.5">Platform Administration</h2>
          <p className="text-xs text-text-muted mt-1 leading-normal max-w-md font-medium">
            Monitor real-time revenue stats, user profiles, enrollments, transaction ledgers, and coupon rules.
          </p>
        </div>

        {/* Tab switcher buttons */}
        <div className="flex flex-wrap items-center gap-1.5 border border-border/80 p-1 bg-background/50 rounded-xl w-full md:w-auto z-10">
          {[
            { id: 'overview', label: '📊 HUD Overview' },
            { id: 'users', label: '👥 Users' },
            { id: 'courses', label: '📚 Courses' },
            { id: 'enrollments', label: '💳 Enrollments' },
            { id: 'transactions', label: '🧾 Ledger' },
            { id: 'coupons', label: '📢 Coupons' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSearchParams({ tab: tab.id })}
              className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition cursor-pointer select-none ${
                activeTab === tab.id
                  ? 'bg-primary text-white shadow shadow-primary/20'
                  : 'text-slate-400 hover:text-white hover:bg-card-light/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ══════════════════ STATS CARDSHUD (Overview Only) ══════════════════ */}
      {analytics && activeTab === 'overview' && (
        <section className="flex overflow-x-auto snap-x snap-mandatory flex-nowrap gap-4 scrollbar-none pb-4 md:grid md:grid-cols-5 md:overflow-x-visible md:pb-0">
          {[
            { label: 'Total Revenue', value: `₹${analytics.totalRevenue || 0}`, desc: 'Net historical sales', icon: '💰', color: 'text-success' },
            { label: 'Monthly Revenue', value: `₹${analytics.monthlyRevenue || 0}`, desc: 'Current calendar month', icon: '📅', color: 'text-teal-400' },
            { label: 'Yearly Revenue', value: `₹${analytics.yearlyRevenue || 0}`, desc: 'Current calendar year', icon: '🗓️', color: 'text-amber-400' },
            { label: 'Students', value: analytics.totalStudents, desc: 'Registered accounts', icon: '👥', color: 'text-primary-400' },
            { label: 'Courses', value: analytics.totalCourses, desc: 'Syllabus courses', icon: '📚', color: 'text-white' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-card border border-border rounded-2xl p-5 shadow card-hover relative overflow-hidden w-[200px] shrink-0 snap-start md:w-auto md:shrink">
              <div className="absolute top-0 right-0 w-12 h-12 bg-white/5 rounded-bl-full flex items-center justify-center text-xs shrink-0 select-none">
                {stat.icon}
              </div>
              <span className="text-[10px] text-slate-500 font-bold block uppercase tracking-wider">{stat.label}</span>
              <span className={`text-xl lg:text-2xl font-black ${stat.color} block mt-2.5`}>{stat.value}</span>
              <span className="text-[9px] text-slate-400 block mt-1">{stat.desc}</span>
            </div>
          ))}
        </section>
      )}

      {/* ══════════════════ TAB 1: OVERVIEW TAB CONTENT ══════════════════ */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Interactive Revenue Trend Chart */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden">
              <h3 className="text-sm font-extrabold text-white flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <span>📈 Monthly Revenue Trends</span>
                <span className="text-[9px] bg-primary-600/10 text-primary-400 px-2 py-0.5 rounded uppercase tracking-wider font-bold">Last 6 Months (INR)</span>
              </h3>
              
              <div className="pt-2 flex justify-center">
                {statsList.length > 0 ? (
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-xl h-auto">
                    <defs>
                      <linearGradient id="columnGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0.1" />
                      </linearGradient>
                    </defs>

                    {/* Horizontal helper lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                      const yPos = paddingY + graphHeight - ratio * graphHeight;
                      const labelVal = Math.round(ratio * maxVal);
                      return (
                        <g key={gridIdx}>
                          <line x1={paddingX} y1={yPos} x2={chartWidth - paddingX} y2={yPos} stroke="#1e293b" strokeWidth="1" strokeDasharray="4 4" />
                          <text x={paddingX - 8} y={yPos + 3} fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="end">
                            ₹{labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {/* Bars */}
                    {statsList.map((stat, sIdx) => {
                      const colWidth = 24;
                      const spacing = graphWidth / statsList.length;
                      const xPos = paddingX + sIdx * spacing + (spacing - colWidth) / 2;
                      const barHeight = (stat.amount / maxVal) * graphHeight;
                      const yPos = paddingY + graphHeight - barHeight;
                      
                      return (
                        <g key={sIdx} className="group">
                          <rect x={xPos} y={yPos} width={colWidth} height={barHeight} rx="4" fill="url(#columnGradient)" className="transition-all duration-300 hover:brightness-110 cursor-pointer" />
                          <text x={xPos + colWidth / 2} y={yPos - 5} fill="#e2e8f0" fontSize="8" fontWeight="bold" textAnchor="middle" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            ₹{stat.amount}
                          </text>
                          <text x={xPos + colWidth / 2} y={chartHeight - 4} fill="#64748b" fontSize="8" fontWeight="bold" textAnchor="middle">
                            {stat.month}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  <p className="text-xs text-slate-500 italic py-10">No monthly revenue trends recorded.</p>
                )}
              </div>
            </div>

            {/* Pending Requests & Approvals */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center space-x-2 mb-4 pb-3 border-b border-border/50">
                <span className="w-1.5 h-3 rounded bg-amber-500"></span>
                <span>📋 Pending Teacher Approvals</span>
              </h3>
              <div className="space-y-3">
                {users.filter(u => u.role === 'TEACHER' && !u.active).length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4">No pending teacher approvals at this time.</p>
                ) : (
                  users.filter(u => u.role === 'TEACHER' && !u.active).map(t => (
                    <div key={t.id} className="p-3.5 bg-background/55 border border-border rounded-xl flex items-center justify-between">
                      <div className="min-w-0 pr-3">
                        <span className="text-[9px] text-amber-500 font-bold uppercase tracking-wider block">Approval Pending</span>
                        <h4 className="text-white font-bold text-xs truncate mt-0.5">{t.name}</h4>
                        <span className="text-[10px] text-slate-500 block truncate">{t.email}</span>
                      </div>
                      <div className="flex space-x-2 shrink-0">
                        <button
                          onClick={() => handleToggleUserActive(t.id)}
                          className="bg-teal-500 hover:bg-teal-400 text-white text-[10px] font-black px-3.5 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Approve Profile
                        </button>
                        <button
                          onClick={() => handleDeleteUser(t.id, t.role)}
                          className="text-error bg-error/10 hover:bg-error/20 text-[10px] font-black px-3 py-1.5 rounded-lg transition cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Quick Actions FAB Menu & Activity */}
          <div className="space-y-6">
            
            {/* Quick Actions Panel */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold text-white mb-4 pb-3 border-b border-border/50">⚡ Quick Actions</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setRegisterForm({ name: '', email: '', phone: '', password: '' });
                    setRegisterError('');
                    setRegisterSuccess('');
                    setShowRegisterModal(true);
                  }}
                  className="p-3 bg-background/60 hover:bg-background border border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <span className="text-lg">👨‍🏫</span>
                  <span className="text-[9px] font-black text-white mt-1 uppercase tracking-wider">Add Teacher</span>
                </button>
                
                <button
                  onClick={() => {
                    setCouponForm({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
                    setCouponError('');
                    setCouponSuccess('');
                    setEditingCoupon(null);
                    setShowCouponModal(true);
                  }}
                  className="p-3 bg-background/60 hover:bg-background border border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <span className="text-lg">🎟️</span>
                  <span className="text-[9px] font-black text-white mt-1 uppercase tracking-wider">New Coupon</span>
                </button>

                <button
                  onClick={() => {
                    setEnrollForm({ studentId: '', courseId: '' });
                    setEnrollError('');
                    setEnrollSuccess('');
                    setShowEnrollModal(true);
                  }}
                  className="p-3 bg-background/60 hover:bg-background border border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <span className="text-lg">💳</span>
                  <span className="text-[9px] font-black text-white mt-1 uppercase tracking-wider">Manual Enroll</span>
                </button>

                <Link
                  to="/create-course"
                  className="p-3 bg-background/60 hover:bg-background border border-border rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition"
                >
                  <span className="text-lg">📚</span>
                  <span className="text-[9px] font-black text-white mt-1 uppercase tracking-wider">Add Course</span>
                </Link>
              </div>
            </div>

            {/* Recent Payments Feed */}
            <div className="bg-card border border-border rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-extrabold text-white mb-4 pb-3 border-b border-border/50">💵 Recent Transactions</h3>
              <div className="space-y-3.5">
                {transactions.slice(0, 4).map(txn => (
                  <div key={txn.id} className="flex justify-between items-center text-xs border-b border-border/40 pb-2.5 last:border-b-0 last:pb-0">
                    <div className="min-w-0 pr-3">
                      <h4 className="text-white font-bold truncate">{txn.user?.name || 'Student User'}</h4>
                      <p className="text-[9px] text-slate-500 font-mono mt-0.5 truncate">{txn.transactionId}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="font-extrabold text-emerald-400 block">₹{txn.amountPaid}</span>
                      <span className="text-[8px] font-bold uppercase text-slate-400 mt-0.5 block">{txn.paymentStatus}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ══════════════════ TAB 2: USERS MANAGER ══════════════════ */}
      {activeTab === 'users' && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Users Directory</h3>
              <p className="text-[11px] text-slate-500 font-medium">Manage and audit student and teacher registrations.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search by name, email, phone..."
                value={userSearch}
                onChange={(e) => { setUserSearch(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 flex-grow md:w-64"
              />
              <select
                value={userRoleFilter}
                onChange={(e) => { setUserRoleFilter(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="STUDENT">Students</option>
                <option value="TEACHER">Teachers</option>
                <option value="ADMIN">Admins</option>
              </select>
              <button
                onClick={() => exportToCSV(filteredUsers, 'users', (msg) => showToast('success', msg), (msg) => showToast('error', msg))}
                className="bg-surface-700 hover:bg-surface-600 border border-surface-500 text-slate-200 text-xs font-bold px-4.5 py-2.5 rounded-xl cursor-pointer transition select-none"
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* DESKTOP VIEWPORT TABLE */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th onClick={() => handleSort('name')} className="pb-3 cursor-pointer hover:text-white">Name {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('email')} className="pb-3 px-4 cursor-pointer hover:text-white">Email {sortField === 'email' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 px-4">Phone</th>
                  <th onClick={() => handleSort('role')} className="pb-3 px-4 cursor-pointer hover:text-white">Role {sortField === 'role' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('active')} className="pb-3 px-4 cursor-pointer hover:text-white">Status {sortField === 'active' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs text-slate-300">
                {paginatedUsers.map(u => (
                  <tr key={u.id} className="hover:bg-card-light/20 transition">
                    <td className="py-3.5 font-bold text-white cursor-pointer hover:text-teal-400" onClick={() => handleViewUserDetails(u.id)}>{u.name}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3.5 px-4">{u.phone || 'N/A'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                        u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 
                        u.role === 'TEACHER' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 
                        'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                      }`}>{u.role}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${u.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {u.active ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleToggleUserActive(u.id)}
                        className={`text-[10px] font-extrabold px-2.5 py-1.5 rounded-lg border transition ${
                          u.active 
                            ? 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20' 
                            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                        }`}
                      >
                        {u.active ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.role)}
                        className="text-[10px] font-bold bg-error/10 border border-error/20 text-error hover:bg-error/20 px-2.5 py-1.5 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 italic">No users matching filter credentials.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE VIEWPORT CARDS */}
          <div className="block md:hidden space-y-4">
            {paginatedUsers.map(u => (
              <div key={u.id} className="bg-background/45 border border-border p-4.5 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-extrabold text-sm cursor-pointer hover:text-teal-400" onClick={() => handleViewUserDetails(u.id)}>{u.name}</h4>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{u.email}</span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                    u.role === 'ADMIN' ? 'bg-purple-500/10 text-purple-400' : 
                    u.role === 'TEACHER' ? 'bg-indigo-500/10 text-indigo-400' : 
                    'bg-teal-500/10 text-teal-400'
                  }`}>{u.role}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span>Phone: {u.phone || 'N/A'}</span>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${u.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {u.active ? 'Active' : 'Suspended'}
                  </span>
                </div>

                <div className="flex gap-2 pt-2.5 border-t border-border/40">
                  <button
                    onClick={() => handleToggleUserActive(u.id)}
                    className="flex-grow text-center text-[10px] font-bold bg-surface-700 border border-surface-600 text-slate-200 py-2 rounded-xl"
                  >
                    {u.active ? 'Suspend Account' : 'Activate Account'}
                  </button>
                  <button
                    onClick={() => handleDeleteUser(u.id, u.role)}
                    className="text-error bg-error/10 border border-error/20 hover:bg-error/20 text-[10px] font-bold px-4 py-2 rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {filteredUsers.length === 0 && (
              <p className="text-center text-xs text-slate-500 italic py-6">No users matching search filters.</p>
            )}
          </div>

          {/* Pagination Controls */}
          {filteredUsers.length > 0 && (
            <div className="flex justify-between items-center border-t border-border/40 pt-4 text-xs font-semibold text-slate-500 select-none">
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredUsers.length)} of {filteredUsers.length} records</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(filteredUsers.length)))}
                  disabled={currentPage === totalPages(filteredUsers.length)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════ TAB 3: COURSES METRICS ══════════════════ */}
      {activeTab === 'courses' && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Courses Catalog Dashboard</h3>
              <p className="text-[11px] text-slate-500 font-medium">Verify course syllabus details and enrollment statistics.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search course, instructor, category..."
                value={courseSearch}
                onChange={(e) => { setCourseSearch(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 flex-grow md:w-64"
              />
              <button
                onClick={() => exportToCSV(filteredCourses, 'courses', (msg) => showToast('success', msg), (msg) => showToast('error', msg))}
                className="bg-surface-700 hover:bg-surface-600 border border-surface-500 text-slate-200 text-xs font-bold px-4.5 py-2.5 rounded-xl cursor-pointer transition select-none"
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th onClick={() => handleSort('title')} className="pb-3 cursor-pointer hover:text-white">Course Title {sortField === 'title' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('category')} className="pb-3 px-4 cursor-pointer hover:text-white">Category {sortField === 'category' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 px-4">Instructor</th>
                  <th onClick={() => handleSort('price')} className="pb-3 px-4 cursor-pointer hover:text-white">Price {sortField === 'price' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('enrolledStudentsCount')} className="pb-3 px-4 text-right cursor-pointer hover:text-white">Students {sortField === 'enrolledStudentsCount' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs text-slate-300">
                {paginatedCourses.map(c => (
                  <tr key={c.id} className="hover:bg-card-light/20 transition">
                    <td className="py-3.5 font-bold text-white">{c.title}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-background border border-border rounded text-slate-400 text-[10px] font-semibold">{c.category}</span>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">{c.teacherName || 'Not Assigned'}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {c.price === 0 ? <span className="text-success text-[10px] font-black">Free</span> : `₹${c.price}`}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-100">{c.enrolledStudentsCount}</td>
                    <td className="py-3.5 text-right">
                      <Link
                        to={`/course/${c.id}/learn`}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-border bg-background/55 text-slate-300 hover:text-white hover:bg-card-light/45 transition inline-block"
                      >
                        Open Viewer
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 italic">No courses found matching criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block md:hidden space-y-4">
            {paginatedCourses.map(c => (
              <div key={c.id} className="bg-background/45 border border-border p-4.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <h4 className="text-white font-extrabold text-sm line-clamp-1">{c.title}</h4>
                  <span className="px-2 py-0.5 bg-background border border-border rounded text-slate-400 text-[9px] font-bold uppercase shrink-0">{c.category}</span>
                </div>
                <p className="text-[10px] text-slate-400">Instructor: {c.teacherName || 'Not Assigned'}</p>
                <div className="flex justify-between items-center text-[10px] font-bold">
                  <span className="text-white">Price: {c.price === 0 ? 'Free' : `₹${c.price}`}</span>
                  <span className="text-teal-400">{c.enrolledStudentsCount} Enrolled</span>
                </div>
                <Link
                  to={`/course/${c.id}/learn`}
                  className="w-full text-center block bg-surface-700 border border-surface-600 text-slate-200 py-2 rounded-xl text-[10px] font-bold mt-2"
                >
                  Open Learning Viewer
                </Link>
              </div>
            ))}
            {filteredCourses.length === 0 && (
              <p className="text-center text-xs text-slate-500 italic py-6">No matching courses catalog.</p>
            )}
          </div>

          {/* Pagination */}
          {filteredCourses.length > 0 && (
            <div className="flex justify-between items-center border-t border-border/40 pt-4 text-xs font-semibold text-slate-500">
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredCourses.length)} of {filteredCourses.length} courses</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(filteredCourses.length)))}
                  disabled={currentPage === totalPages(filteredCourses.length)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════ TAB 4: ENROLLMENTS REGISTRY ══════════════════ */}
      {activeTab === 'enrollments' && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Enrollments Log</h3>
              <p className="text-[11px] text-slate-500 font-medium">Verify active student course enrollments and syllabus progress.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search student, course, email..."
                value={enrollSearch}
                onChange={(e) => { setEnrollSearch(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 flex-grow md:w-64"
              />
              <button
                onClick={() => exportToCSV(filteredEnrollments, 'enrollments', (msg) => showToast('success', msg), (msg) => showToast('error', msg))}
                className="bg-surface-700 hover:bg-surface-600 border border-surface-500 text-slate-200 text-xs font-bold px-4.5 py-2.5 rounded-xl cursor-pointer transition select-none"
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th onClick={() => handleSort('id')} className="pb-3 cursor-pointer hover:text-white">Enrollment ID {sortField === 'id' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 px-4">Student</th>
                  <th className="pb-3 px-4">Course</th>
                  <th onClick={() => handleSort('progressPercent')} className="pb-3 px-4 cursor-pointer hover:text-white">Progress {sortField === 'progressPercent' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('enrolledAt')} className="pb-3 px-4 cursor-pointer hover:text-white">Date {sortField === 'enrolledAt' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs text-slate-300">
                {paginatedEnrollments.map(e => (
                  <tr key={e.id} className="hover:bg-card-light/20 transition">
                    <td className="py-3.5 font-mono text-[10px] text-slate-400">ENR_{e.id}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{e.student?.name}</span>
                      <span className="block text-[9px] text-slate-500 font-normal">{e.student?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-300">{e.course?.title}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-extrabold text-[10px] text-teal-400 w-8">{e.progressPercent}%</span>
                        <div className="w-20 bg-surface-700 h-1.5 rounded-full overflow-hidden">
                          <div className="h-full bg-teal-500 rounded-full" style={{ width: `${e.progressPercent}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{new Date(e.enrolledAt).toLocaleDateString()}</td>
                    <td className="py-3.5 text-right">
                      <button
                        onClick={() => handleRevokeEnrollment(e.id)}
                        className="text-[10px] font-bold bg-error/10 border border-error/20 text-error hover:bg-error/20 px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Revoke Access
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 italic">No enrollments match search.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block md:hidden space-y-4">
            {paginatedEnrollments.map(e => (
              <div key={e.id} className="bg-background/45 border border-border p-4.5 rounded-2xl space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-extrabold text-sm">{e.student?.name}</h4>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{e.student?.email}</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">ENR_{e.id}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-semibold">{e.course?.title}</p>
                
                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 mb-1">
                    <span>Syllabus Completed</span>
                    <span className="text-teal-400">{e.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-surface-700 h-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-teal-500" style={{ width: `${e.progressPercent}%` }}></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Date: {new Date(e.enrolledAt).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleRevokeEnrollment(e.id)}
                    className="text-error bg-error/10 border border-error/20 px-3.5 py-1.5 rounded-xl font-bold transition"
                  >
                    Revoke Access
                  </button>
                </div>
              </div>
            ))}
            {filteredEnrollments.length === 0 && (
              <p className="text-center text-xs text-slate-500 italic py-6">No matching enrollments.</p>
            )}
          </div>

          {/* Pagination */}
          {filteredEnrollments.length > 0 && (
            <div className="flex justify-between items-center border-t border-border/40 pt-4 text-xs font-semibold text-slate-500">
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredEnrollments.length)} of {filteredEnrollments.length} enrollments</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(filteredEnrollments.length)))}
                  disabled={currentPage === totalPages(filteredEnrollments.length)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════ TAB 5: TRANSACTIONS LEDGER ══════════════════ */}
      {activeTab === 'transactions' && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Transactions Ledger</h3>
              <p className="text-[11px] text-slate-500 font-medium">Verify mock checkout transactions and payment states.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search txn ID, student name..."
                value={txnSearch}
                onChange={(e) => { setTxnSearch(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 flex-grow md:w-64"
              />
              <select
                value={txnStatusFilter}
                onChange={(e) => { setTxnStatusFilter(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="SUCCESS">Success</option>
                <option value="PENDING">Pending</option>
                <option value="FAILED">Failed</option>
              </select>
              <button
                onClick={() => exportToCSV(filteredTransactions, 'transactions', (msg) => showToast('success', msg), (msg) => showToast('error', msg))}
                className="bg-surface-700 hover:bg-surface-600 border border-surface-500 text-slate-200 text-xs font-bold px-4.5 py-2.5 rounded-xl cursor-pointer transition select-none"
              >
                📥 Export CSV
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th onClick={() => handleSort('transactionId')} className="pb-3 cursor-pointer hover:text-white">Transaction ID {sortField === 'transactionId' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 px-4">Student</th>
                  <th className="pb-3 px-4">Course Item</th>
                  <th onClick={() => handleSort('amountPaid')} className="pb-3 px-4 cursor-pointer hover:text-white">Paid Amount {sortField === 'amountPaid' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('createdAt')} className="pb-3 px-4 cursor-pointer hover:text-white">Timestamp {sortField === 'createdAt' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('paymentStatus')} className="pb-3 px-4 cursor-pointer hover:text-white text-right">Status {sortField === 'paymentStatus' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs text-slate-300">
                {paginatedTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-card-light/20 transition">
                    <td className="py-3.5 font-mono text-[10px] text-slate-400">{t.transactionId}</td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      <span>{t.user?.name}</span>
                      <span className="block text-[9px] text-slate-500 font-normal">{t.user?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-300">{t.course?.title}</td>
                    <td className="py-3.5 px-4 font-bold text-teal-400">₹{t.amountPaid}</td>
                    <td className="py-3.5 px-4 font-mono text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                    <td className="py-3.5 px-4 text-right">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                        t.paymentStatus === 'SUCCESS' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                      }`}>{t.paymentStatus}</span>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 italic">No transaction records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block md:hidden space-y-4">
            {paginatedTransactions.map(t => (
              <div key={t.id} className="bg-background/45 border border-border p-4.5 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-white font-extrabold text-xs">{t.user?.name}</h4>
                    <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{t.user?.email}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                    t.paymentStatus === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                  }`}>{t.paymentStatus}</span>
                </div>
                <p className="text-[11px] text-slate-300 font-semibold leading-relaxed">{t.course?.title}</p>
                <div className="flex justify-between items-center text-[10px] font-mono text-slate-500">
                  <span className="text-teal-400 font-extrabold text-sm">₹{t.amountPaid}</span>
                  <span>ID: {t.transactionId}</span>
                </div>
              </div>
            ))}
            {filteredTransactions.length === 0 && (
              <p className="text-center text-xs text-slate-500 italic py-6">No matching transactions ledger.</p>
            )}
          </div>

          {/* Pagination */}
          {filteredTransactions.length > 0 && (
            <div className="flex justify-between items-center border-t border-border/40 pt-4 text-xs font-semibold text-slate-500">
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} of {filteredTransactions.length} transactions</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(filteredTransactions.length)))}
                  disabled={currentPage === totalPages(filteredTransactions.length)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════ TAB 6: PROMO COUPONS ══════════════════ */}
      {activeTab === 'coupons' && (
        <section className="bg-card border border-border rounded-3xl p-6 shadow-xl space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border/50 pb-5">
            <div>
              <h3 className="text-base font-extrabold text-white">Promo Coupons Directory</h3>
              <p className="text-[11px] text-slate-500 font-medium">Configure discount campaigns and access codes.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search coupon code..."
                value={couponSearch}
                onChange={(e) => { setCouponSearch(e.target.value); setCurrentPage(1); }}
                className="bg-background/60 text-white border border-border rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-teal-500 flex-grow md:w-64"
              />
              <button
                onClick={() => {
                  setCouponForm({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
                  setCouponError('');
                  setCouponSuccess('');
                  setEditingCoupon(null);
                  setShowCouponModal(true);
                }}
                className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2.5 rounded-xl cursor-pointer shadow-md shadow-primary/10 transition whitespace-nowrap"
              >
                ➕ Create Coupon
              </button>
            </div>
          </div>

          {/* DESKTOP TABLE */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <th onClick={() => handleSort('code')} className="pb-3 cursor-pointer hover:text-white">Coupon Code {sortField === 'code' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('discountPercent')} className="pb-3 px-4 cursor-pointer hover:text-white">Discount {sortField === 'discountPercent' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('expiryDate')} className="pb-3 px-4 cursor-pointer hover:text-white">Expires On {sortField === 'expiryDate' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('maxUses')} className="pb-3 px-4 cursor-pointer hover:text-white">Campaign Uses {sortField === 'maxUses' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th onClick={() => handleSort('active')} className="pb-3 px-4 cursor-pointer hover:text-white">Status {sortField === 'active' && (sortOrder === 'asc' ? '▲' : '▼')}</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs text-slate-300">
                {paginatedCoupons.map(c => (
                  <tr key={c.id} className="hover:bg-card-light/20 transition">
                    <td className="py-3.5 font-bold text-white font-mono">{c.code}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 font-black rounded-md text-[10px]">{c.discountPercent}% OFF</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">{c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never'}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {c.maxUses ? `${c.usesCount || 0} / ${c.maxUses}` : `${c.usesCount || 0} / Unlimited`}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${c.active ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                        {c.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEditCoupon(c)}
                        className="text-[10px] font-bold bg-surface-750 hover:bg-surface-700 border border-surface-600 text-slate-300 px-2.5 py-1.5 rounded-lg transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteCoupon(c.id)}
                        className="text-[10px] font-bold bg-error/10 border border-error/20 text-error hover:bg-error/20 px-2.5 py-1.5 rounded-lg transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-slate-500 italic">No coupons found matching criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* MOBILE CARDS */}
          <div className="block md:hidden space-y-4">
            {paginatedCoupons.map(c => (
              <div key={c.id} className="bg-background/45 border border-border p-4.5 rounded-2xl space-y-3.5">
                <div className="flex justify-between items-start">
                  <h4 className="text-white font-extrabold text-sm font-mono">{c.code}</h4>
                  <span className="px-2 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 font-black rounded text-[9px]">{c.discountPercent}% OFF</span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-semibold text-slate-500">
                  <span>Expiry: {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : 'Never'}</span>
                  <span>Uses: {c.maxUses ? `${c.usesCount || 0} / ${c.maxUses}` : `${c.usesCount || 0} / ∞`}</span>
                </div>
                <div className="flex justify-between items-center pt-2.5 border-t border-border/40">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase ${c.active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                    {c.active ? 'Active' : 'Inactive'}
                  </span>
                  <div className="space-x-1.5">
                    <button onClick={() => handleOpenEditCoupon(c)} className="text-[10px] font-bold bg-surface-750 px-3 py-1.5 rounded-xl border border-surface-600 text-slate-300">Edit</button>
                    <button onClick={() => handleDeleteCoupon(c.id)} className="text-error bg-error/10 border border-error/20 text-[10px] font-bold px-3 py-1.5 rounded-xl">Delete</button>
                  </div>
                </div>
              </div>
            ))}
            {filteredCoupons.length === 0 && (
              <p className="text-center text-xs text-slate-500 italic py-6">No coupons listed.</p>
            )}
          </div>

          {/* Pagination */}
          {filteredCoupons.length > 0 && (
            <div className="flex justify-between items-center border-t border-border/40 pt-4 text-xs font-semibold text-slate-500">
              <span>Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredCoupons.length)} of {filteredCoupons.length} coupons</span>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages(filteredCoupons.length)))}
                  disabled={currentPage === totalPages(filteredCoupons.length)}
                  className="px-3.5 py-1.5 rounded-lg border border-border bg-background/45 hover:text-white disabled:opacity-40 transition cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ══════════════════ MODAL: USER DETAILS ══════════════════ */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative overflow-hidden animate-scale-in">
            <div className="flex justify-between items-start border-b border-border/50 pb-3 mb-4">
              <h3 className="font-extrabold text-base text-white">Detailed profile</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            {modalLoading ? (
              <div className="py-8 flex justify-center"><LoadingSpinner text="Reading profile details..." /></div>
            ) : selectedUser ? (
              <div className="space-y-4">
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center font-black text-white text-base">
                    {selectedUser.name.substring(0,2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-white font-extrabold text-sm">{selectedUser.name}</h4>
                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{selectedUser.email}</span>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-4 space-y-2.5 text-xs text-slate-300">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">User Role</span>
                    <span className="font-bold text-white uppercase">{selectedUser.role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Phone Contact</span>
                    <span className="font-bold text-white">{selectedUser.phone || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Account State</span>
                    <span className={`font-extrabold uppercase ${selectedUser.active ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedUser.active ? 'Active' : 'Suspended'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-semibold">Registered At</span>
                    <span className="font-mono text-slate-400">{new Date(selectedUser.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex justify-end space-x-2.5">
                  <button
                    onClick={() => { handleToggleUserActive(selectedUser.id); setShowUserModal(false); }}
                    className="px-4.5 py-2 border border-border bg-surface-700 hover:bg-surface-600 rounded-xl text-xs font-bold text-white transition cursor-pointer"
                  >
                    {selectedUser.active ? 'Suspend Account' : 'Activate Account'}
                  </button>
                  <button
                    onClick={() => setShowUserModal(false)}
                    className="px-4.5 py-2 bg-primary hover:bg-primary-light rounded-xl text-xs font-black text-white cursor-pointer"
                  >
                    Close Profile
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">Failed to load detailed profile.</p>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL: MANUAL ENROLLMENT ══════════════════ */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-start border-b border-border/50 pb-3 mb-4">
              <h3 className="font-extrabold text-base text-white">Manual Course Enrollment</h3>
              <button onClick={() => setShowEnrollModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleManualEnrollSubmit} className="space-y-4">
              {enrollError && <p className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl font-bold">{enrollError}</p>}
              {enrollSuccess && <p className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-xl font-bold">{enrollSuccess}</p>}
              
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Select Student</label>
                <select
                  value={enrollForm.studentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                >
                  <option value="">-- Choose student --</option>
                  {studentsOnly.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Select Course Item</label>
                <select
                  value={enrollForm.courseId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                >
                  <option value="">-- Choose course catalog --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="px-4.5 py-2 border border-border bg-transparent hover:text-white rounded-xl text-xs font-bold text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEnroll}
                  className="px-4.5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  {submittingEnroll ? 'Enrolling...' : 'Enroll Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL: COUPON CAMPAIGN ══════════════════ */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-start border-b border-border/50 pb-3 mb-4">
              <h3 className="font-extrabold text-base text-white">{editingCoupon ? 'Edit Coupon Campaign' : 'Create Coupon Access'}</h3>
              <button onClick={() => setShowCouponModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleCouponSubmit} className="space-y-4">
              {couponError && <p className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl font-bold">{couponError}</p>}
              {couponSuccess && <p className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-xl font-bold">{couponSuccess}</p>}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. FIRST50"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500 font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Discount %</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 50"
                    value={couponForm.discountPercent}
                    onChange={(e) => setCouponForm({ ...couponForm, discountPercent: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Max Uses</label>
                  <input
                    type="number"
                    placeholder="e.g. 100 (optional)"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Expiry Date</label>
                <input
                  type="date"
                  value={couponForm.expiryDate}
                  onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex items-center space-x-2.5 pt-2 select-none">
                <input
                  type="checkbox"
                  id="couponActive"
                  checked={couponForm.active}
                  onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                  className="h-4 w-4 bg-background border-border rounded accent-teal-500"
                />
                <label htmlFor="couponActive" className="text-xs text-slate-300 font-semibold cursor-pointer">Active Campaign</label>
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4.5 py-2 border border-border bg-transparent hover:text-white rounded-xl text-xs font-bold text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCoupon}
                  className="px-4.5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  {submittingCoupon ? 'Saving...' : editingCoupon ? 'Update Campaign' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════ MODAL: TEACHER REGISTRATION ══════════════════ */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
            <div className="flex justify-between items-start border-b border-border/50 pb-3 mb-4">
              <h3 className="font-extrabold text-base text-white">Register Platform Teacher</h3>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleRegisterTeacherSubmit} className="space-y-4">
              {registerError && <p className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl font-bold">{registerError}</p>}
              {registerSuccess && <p className="p-3 bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs rounded-xl font-bold">{registerSuccess}</p>}

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Email Address</label>
                <input
                  type="email"
                  placeholder="john.doe@learngen.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Phone Contact</label>
                <input
                  type="tel"
                  placeholder="e.g. +91 99999 88888"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold block">Sign-in Password</label>
                <input
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  required
                />
              </div>

              <div className="pt-4 border-t border-border/40 flex justify-end space-x-2.5">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4.5 py-2 border border-border bg-transparent hover:text-white rounded-xl text-xs font-bold text-slate-400 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRegister}
                  className="px-4.5 py-2 bg-primary hover:bg-primary-light text-white rounded-xl text-xs font-black cursor-pointer"
                >
                  {submittingRegister ? 'Registering...' : 'Register Instructor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
