import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';
import Toast from '../../components/Toast';

const AdminDashboard = () => {
  const { user } = useContext(AuthContext);
  const [users, setUsers] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Navigation tabs: 'overview' | 'users' | 'courses' | 'enrollments' | 'transactions' | 'coupons'
  const [activeTab, setActiveTab] = useState('overview');
  
  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [courseSearchTerm, setCourseSearchTerm] = useState('');
  const [enrollmentSearchTerm, setEnrollmentSearchTerm] = useState('');
  const [txnSearchTerm, setTxnSearchTerm] = useState('');
  const [txnStatusFilter, setTxnStatusFilter] = useState('ALL');
  const [couponSearchTerm, setCouponSearchTerm] = useState('');
  
  // User detail modal state
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  // Manual enrollment modal state
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ studentId: '', courseId: '' });
  const [enrollError, setEnrollError] = useState('');
  const [enrollSuccess, setEnrollSuccess] = useState('');
  const [submittingEnroll, setSubmittingEnroll] = useState(false);

  // Coupon create/edit modal state
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponForm, setCouponForm] = useState({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [submittingCoupon, setSubmittingCoupon] = useState(false);

  // Register teacher modal state
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerForm, setRegisterForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [registerError, setRegisterError] = useState('');
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [submittingRegister, setSubmittingRegister] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState({ type: '', msg: '' });

  useEffect(() => {
    fetchAdminData();
  }, []);

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
      setUsers(userResp.data.data);
      setAnalytics(analyticsResp.data.data);
      setCourses(coursesResp.data.data);
      setEnrollments(enrollmentsResp.data.data);
      setTransactions(txnResp.data.data);
      setCoupons(couponsResp.data.data);
    } catch (error) {
      console.error("Error fetching admin dashboard details:", error);
      showToast('error', 'Failed to retrieve admin details from server.');
    } finally {
      setLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setNotification({ type, msg });
  };

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
        }, 1500);
      }
    } catch (error) {
      console.error(error);
      setEnrollError(error.response?.data?.message || 'Failed to manually enroll student. Check if already enrolled.');
    } finally {
      setSubmittingEnroll(false);
    }
  };

  // ── Coupon CRUD Handlers ──

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
        // Reload coupons
        const couponsResp = await api.get('/admin/coupons');
        setCoupons(couponsResp.data.data);

        setTimeout(() => {
          setShowCouponModal(false);
          setEditingCoupon(null);
          setCouponForm({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
          setCouponSuccess('');
        }, 1500);
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
        
        // Refresh users list
        const userResp = await api.get('/admin/users');
        setUsers(userResp.data.data);

        setRegisterForm({ name: '', email: '', phone: '', password: '' });
        setTimeout(() => {
          setShowRegisterModal(false);
          setRegisterSuccess('');
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to register teacher:", error);
      setRegisterError(error.response?.data?.message || 'Failed to register teacher account.');
    } finally {
      setSubmittingRegister(false);
    }
  };

  if (loading) return <LoadingSpinner text="Loading admin administration console..." />;

  // Filter Users
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.phone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  // Filter Courses
  const filteredCourses = courses.filter(c => 
    c.title.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    c.category.toLowerCase().includes(courseSearchTerm.toLowerCase()) ||
    (c.teacherName && c.teacherName.toLowerCase().includes(courseSearchTerm.toLowerCase()))
  );

  // Filter Enrollments
  const filteredEnrollments = enrollments.filter(e => {
    const sName = e.student?.name || '';
    const sEmail = e.student?.email || '';
    const cTitle = e.course?.title || '';
    
    return sName.toLowerCase().includes(enrollmentSearchTerm.toLowerCase()) ||
           sEmail.toLowerCase().includes(enrollmentSearchTerm.toLowerCase()) ||
           cTitle.toLowerCase().includes(enrollmentSearchTerm.toLowerCase());
  });

  // Filter Transactions
  const filteredTransactions = transactions.filter(t => {
    const sName = t.user?.name || '';
    const sEmail = t.user?.email || '';
    const cTitle = t.course?.title || '';
    const txnId = t.transactionId || '';
    const gatewayId = t.gatewayOrderId || '';

    const matchesSearch = sName.toLowerCase().includes(txnSearchTerm.toLowerCase()) ||
                          sEmail.toLowerCase().includes(txnSearchTerm.toLowerCase()) ||
                          cTitle.toLowerCase().includes(txnSearchTerm.toLowerCase()) ||
                          txnId.toLowerCase().includes(txnSearchTerm.toLowerCase()) ||
                          gatewayId.toLowerCase().includes(txnSearchTerm.toLowerCase());
                          
    const matchesStatus = txnStatusFilter === 'ALL' || t.paymentStatus === txnStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter Coupons
  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(couponSearchTerm.toLowerCase())
  );

  const studentsOnly = users.filter(u => u.role === 'STUDENT' && u.active);

  // SVG Bar Chart Calculations
  const chartHeight = 130;
  const chartWidth = 500;
  const paddingX = 40;
  const paddingY = 20;
  const graphHeight = chartHeight - paddingY * 2;
  const graphWidth = chartWidth - paddingX * 2;
  
  const statsList = analytics?.monthlyStats || [];
  const maxVal = statsList.length > 0 ? Math.max(...statsList.map(s => s.amount), 500) : 500;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 animate-fade-in relative">
      
      <Toast 
        type={notification.type} 
        message={notification.msg} 
        onClose={() => setNotification({ type: '', msg: '' })} 
      />

      {/* Welcome Hero */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary-900/40 via-teal-900/30 to-surface-800 border border-surface-600 p-8 shadow">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl"></div>
        <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Admin Control Panel</span>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1 mb-2">Platform Administration</h2>
        <p className="text-slate-300 text-sm max-w-xl font-medium">
          Monitor platform metrics, manage user configurations, audit transaction logs, and configure discount coupon campaigns.
        </p>
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-2 mt-8 border-t border-surface-600/40 pt-4">
          {[
            { id: 'overview', label: '📊 Overview' },
            { id: 'users', label: '👥 User Controls' },
            { id: 'courses', label: '📚 Course Metrics' },
            { id: 'enrollments', label: '💳 Enrollments Registry' },
            { id: 'transactions', label: '🧾 Transactions Ledger' },
            { id: 'coupons', label: '📢 Promo Coupons' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSearchTerm('');
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-500/15'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Widgets (Overview Tab Only) */}
      {analytics && activeTab === 'overview' && (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Revenue', value: `₹${analytics.totalRevenue || 0}`, description: 'All-time net sales', icon: '💰', color: 'text-success' },
            { label: 'Monthly Revenue', value: `₹${analytics.monthlyRevenue || 0}`, description: 'Current month net', icon: '📅', color: 'text-info' },
            { label: 'Yearly Revenue', value: `₹${analytics.yearlyRevenue || 0}`, description: 'Current calendar year', icon: '🗓️', color: 'text-amber-400' },
            { label: 'Active Students', value: analytics.totalStudents, description: 'Registered students', icon: '👥', color: 'text-primary-400' },
            { label: 'Courses Published', value: analytics.totalCourses, description: 'Catalog courses', icon: '📚', color: 'text-white' }
          ].map((stat, idx) => (
            <div key={idx} className="glass rounded-2xl p-5 shadow card-hover border border-surface-600/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{stat.label}</span>
                <span className="text-base">{stat.icon}</span>
              </div>
              <span className={`text-xl lg:text-2xl font-black ${stat.color} block`}>{stat.value}</span>
              <span className="text-[9px] text-slate-400 block mt-1">{stat.description}</span>
            </div>
          ))}
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 1: OVERVIEW TAB CONTENT
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Visual Revenue Trend Chart */}
            <div className="glass rounded-2xl p-6 border border-surface-600">
              <h3 className="text-sm font-bold text-white mb-2 flex items-center space-x-2">
                <span>📈 Monthly Revenue Trends</span>
                <span className="text-[10px] bg-primary-600/10 text-primary-400 px-2 py-0.5 rounded font-medium">Last 6 Months (INR)</span>
              </h3>
              
              <div className="pt-4 flex justify-center">
                {statsList.length > 0 ? (
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-xl h-auto">
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio, gridIdx) => {
                      const yPos = paddingY + graphHeight - ratio * graphHeight;
                      const labelVal = Math.round(ratio * maxVal);
                      return (
                        <g key={gridIdx}>
                          <line 
                            x1={paddingX} 
                            y1={yPos} 
                            x2={chartWidth - paddingX} 
                            y2={yPos} 
                            stroke="#1e293b" 
                            strokeWidth="1" 
                            strokeDasharray="4 4"
                          />
                          <text 
                            x={paddingX - 8} 
                            y={yPos + 3} 
                            fill="#64748b" 
                            fontSize="8" 
                            fontWeight="bold" 
                            textAnchor="end"
                          >
                            ₹{labelVal}
                          </text>
                        </g>
                      );
                    })}

                    {statsList.map((stat, sIdx) => {
                      const colWidth = 24;
                      const spacing = graphWidth / statsList.length;
                      const xPos = paddingX + sIdx * spacing + (spacing - colWidth) / 2;
                      const barHeight = (stat.amount / maxVal) * graphHeight;
                      const yPos = paddingY + graphHeight - barHeight;
                      
                      return (
                        <g key={sIdx} className="group">
                          <rect
                            x={xPos}
                            y={yPos}
                            width={colWidth}
                            height={barHeight}
                            rx="4"
                            fill="url(#columnGradient)"
                            className="transition-all duration-300 hover:brightness-110 cursor-pointer"
                          />
                          <text
                            x={xPos + colWidth / 2}
                            y={yPos - 5}
                            fill="#e2e8f0"
                            fontSize="8"
                            fontWeight="bold"
                            textAnchor="middle"
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                          >
                            ₹{Math.round(stat.amount)}
                          </text>
                          <text
                            x={xPos + colWidth / 2}
                            y={chartHeight - paddingY + 13}
                            fill="#94a3b8"
                            fontSize="8"
                            fontWeight="semibold"
                            textAnchor="middle"
                          >
                            {stat.month.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}

                    <defs>
                      <linearGradient id="columnGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0d9488" />
                        <stop offset="100%" stopColor="#115e59" stopOpacity="0.7" />
                      </linearGradient>
                    </defs>
                  </svg>
                ) : (
                  <p className="text-xs text-slate-500 py-8">No billing history available to plot.</p>
                )}
              </div>
            </div>

            {/* Quick Operations Shortcuts */}
            <div className="glass rounded-2xl p-6 border border-surface-600">
              <h3 className="text-base font-bold text-white mb-4">Quick Operations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => setShowEnrollModal(true)}
                  className="p-4 rounded-xl border border-surface-600 hover:border-primary-500 bg-surface-800/40 hover:bg-primary-600/5 transition text-left cursor-pointer"
                >
                  <span className="text-lg block mb-1">✍️</span>
                  <strong className="text-white text-xs block">Manual Student Enrollment</strong>
                  <span className="text-[10px] text-slate-400">Instantly grant course access to any student profile.</span>
                </button>
                <button 
                  onClick={() => { setActiveTab('coupons'); }}
                  className="p-4 rounded-xl border border-surface-600 hover:border-primary-500 bg-surface-800/40 hover:bg-primary-600/5 transition text-left cursor-pointer"
                >
                  <span className="text-lg block mb-1">📢</span>
                  <strong className="text-white text-xs block">Create Discount Coupon</strong>
                  <span className="text-[10px] text-slate-400">Issue custom promotional codes for campaigns.</span>
                </button>
              </div>
            </div>

            {/* Recent Payments Logs */}
            <div className="glass rounded-2xl p-6 border border-surface-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-white">Recent Transactions</h3>
                <button onClick={() => setActiveTab('transactions')} className="text-xs text-primary-400 hover:underline">View All Ledger</button>
              </div>
              <div className="divide-y divide-surface-600 space-y-3">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="pt-3 first:pt-0 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">{t.user?.name || 'Unknown'}</p>
                      <p className="text-[9.5px] text-slate-400 font-mono mt-0.5">{t.transactionId || 'No Txn ID'}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-white">₹{t.amount}</span>
                      <span className={`block text-[8px] font-bold uppercase tracking-wider ${
                        t.paymentStatus === 'SUCCESS' ? 'text-success' :
                        t.paymentStatus === 'PENDING' ? 'text-warning' : 'text-error'
                      }`}>
                        {t.paymentStatus}
                      </span>
                    </div>
                  </div>
                ))}
                {transactions.length === 0 && (
                  <p className="text-slate-500 text-xs py-4 text-center">No transaction records found.</p>
                )}
              </div>
            </div>
          </div>

          {/* Right Column sidebar */}
          <div className="space-y-6">
            
            {/* Quick Coupons List Summary */}
            <div className="glass rounded-2xl p-6 border border-surface-600">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-bold text-white">📢 Active Coupons</h3>
                <button onClick={() => setActiveTab('coupons')} className="text-xs text-primary-400 hover:underline">Manage</button>
              </div>
              <div className="space-y-3">
                {coupons.slice(0, 3).map(c => {
                  const percentUsed = c.maxUses ? Math.min(Math.round((c.currentUses / c.maxUses) * 100), 100) : 100;
                  return (
                    <div key={c.id} className="p-3 bg-surface-900/30 border border-surface-600/50 rounded-xl space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black font-mono text-primary-400 bg-primary-600/10 px-2 py-0.5 rounded border border-primary-500/20">{c.code}</span>
                        <span className="text-[10px] text-slate-300 font-bold">{c.discountPercent}% Off</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                          <span>Uses: {c.currentUses} / {c.maxUses || '∞'}</span>
                          <span>{percentUsed}%</span>
                        </div>
                        <div className="w-full h-1 bg-surface-700 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-primary-600 to-teal-400" style={{ width: `${percentUsed}%` }}></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {coupons.length === 0 && (
                  <p className="text-slate-500 text-xs py-2 text-center">No promotional codes found.</p>
                )}
              </div>
            </div>

            {/* Categories list */}
            <div className="glass rounded-2xl p-6 border border-surface-600">
              <h3 className="text-sm font-bold text-white mb-4">Course Categories</h3>
              <div className="space-y-2">
                {['Engineering', 'Business', 'Design', 'Marketing', 'Science'].map(cat => {
                  const count = courses.filter(c => c.category === cat).length;
                  return (
                    <div key={cat} className="flex justify-between items-center text-xs text-slate-300">
                      <span>{cat}</span>
                      <span className="bg-surface-700 px-2 py-0.5 rounded font-mono font-bold text-[10px]">{count} courses</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 2: USER ACCESS CONTROL
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'users' && (
        <section className="glass rounded-2xl p-6 overflow-hidden border border-surface-600">
          <div className="flex flex-col space-y-4 mb-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
                <span>User Access Registry ({filteredUsers.length})</span>
              </h3>

              <div className="flex items-center space-x-3 w-full md:w-auto">
                {/* Search */}
                <div className="relative w-full md:w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search name, email, phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-surface-800/50 text-white border border-surface-600 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  />
                </div>

                <button
                  onClick={() => {
                    setRegisterForm({ name: '', email: '', phone: '', password: '' });
                    setRegisterError('');
                    setRegisterSuccess('');
                    setShowRegisterModal(true);
                  }}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer shadow-md shadow-primary-500/10"
                >
                  <span>➕ Register Teacher</span>
                </button>
              </div>
            </div>

            {/* Sub Filter Tab Bar */}
            <div className="flex items-center space-x-1.5 border-b border-surface-600/50 pb-2">
              {[
                { filter: 'ALL', label: 'All Roles' },
                { filter: 'STUDENT', label: 'Students' },
                { filter: 'TEACHER', label: 'Teachers' },
                { filter: 'ADMIN', label: 'Admins' }
              ].map(roleItem => (
                <button
                  key={roleItem.filter}
                  onClick={() => setRoleFilter(roleItem.filter)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition cursor-pointer ${
                    roleFilter === roleItem.filter
                      ? 'bg-surface-600 text-white border border-surface-500'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {roleItem.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-600 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Name</th>
                  <th className="pb-3 px-4">Email</th>
                  <th className="pb-3 px-4 hidden md:table-cell">Phone</th>
                  <th className="pb-3 px-4">Role</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600 text-slate-300 text-xs">
                {filteredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-surface-700/30 transition">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{u.name}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{u.email}</td>
                    <td className="py-3.5 px-4 text-slate-400 hidden md:table-cell">{u.phone}</td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider text-[8px] ${
                        u.role === 'ADMIN' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        u.role === 'TEACHER' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-primary-600/10 text-primary-400 border border-primary-500/20'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center space-x-1.5 ${u.active ? 'text-success' : 'text-slate-500'}`}>
                        <span className={`w-2 h-2 rounded-full ${u.active ? 'bg-success animate-pulse' : 'bg-slate-600'}`}></span>
                        <span>{u.active ? 'Active' : 'Suspended'}</span>
                      </span>
                    </td>
                    <td className="py-3.5 pl-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => handleViewUserDetails(u.id)}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-surface-600 bg-surface-800 text-slate-300 hover:text-white hover:bg-surface-700 transition cursor-pointer"
                      >
                        Details
                      </button>
                      <button
                        onClick={() => handleToggleUserActive(u.id)}
                        disabled={user?.email && u.email.toLowerCase() === user.email.toLowerCase()}
                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                          u.active 
                            ? 'bg-error/10 border-error/20 text-error hover:bg-error/20' 
                            : 'bg-success/10 border-success/20 text-success hover:bg-success/20'
                        }`}
                        title={user?.email && u.email.toLowerCase() === user.email.toLowerCase() ? "You cannot suspend your own account" : ""}
                      >
                        {u.active ? 'Suspend' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.id, u.role)}
                        disabled={user?.email && u.email.toLowerCase() === user.email.toLowerCase()}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 disabled:opacity-40 disabled:cursor-not-allowed transition cursor-pointer"
                        title={user?.email && u.email.toLowerCase() === user.email.toLowerCase() ? "You cannot delete your own account" : ""}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">No users match your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 3: COURSE METRICS
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'courses' && (
        <section className="glass rounded-2xl p-6 overflow-hidden border border-surface-600">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <h3 className="text-lg font-bold text-white flex items-center space-x-2">
              <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
              <span>Course Catalog Statistics ({filteredCourses.length})</span>
            </h3>

            {/* Course Search */}
            <div className="relative w-full md:w-64">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search course title, teacher, category..."
                value={courseSearchTerm}
                onChange={(e) => setCourseSearchTerm(e.target.value)}
                className="w-full bg-surface-800/50 text-white border border-surface-600 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-600 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Course Details</th>
                  <th className="pb-3 px-4">Category</th>
                  <th className="pb-3 px-4">Instructor</th>
                  <th className="pb-3 px-4">Price</th>
                  <th className="pb-3 px-4 text-right">Enrolled Students</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600 text-slate-300 text-xs">
                {filteredCourses.map(c => (
                  <tr key={c.id} className="hover:bg-surface-700/30 transition">
                    <td className="py-3.5 pr-4">
                      <span className="font-bold text-white block">{c.title}</span>
                      <span className="text-[9px] text-slate-500 font-mono">ID: {c.id}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 bg-surface-700 rounded text-slate-300 text-[10px]">{c.category}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      <span className="block font-semibold">{c.teacherName || 'Not Assigned'}</span>
                      <span className="block text-[9px] text-slate-500 font-mono">{c.teacherEmail}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">
                      {c.price === 0 ? (
                        <span className="text-success uppercase text-[10px] font-black">Free</span>
                      ) : (
                        <span>₹{c.price}</span>
                      )}
                      {c.discountPrice && <span className="text-[9.5px] text-slate-500 line-through block font-normal">₹{c.discountPrice}</span>}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-slate-100 text-sm">
                      {c.enrolledStudentsCount}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link
                        to={`/course/${c.id}/learn`}
                        className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-surface-600 bg-surface-800 text-slate-300 hover:text-white hover:bg-surface-700 transition inline-block cursor-pointer"
                      >
                        Inspect Material
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredCourses.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">No courses match search criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 4: ENROLLMENTS REGISTRY
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'enrollments' && (
        <section className="glass rounded-2xl p-6 overflow-hidden border border-surface-600">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
                <span>Active Enrollments Registry ({filteredEnrollments.length})</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Audit active course memberships and student learning progression.</p>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search student, email, course..."
                  value={enrollmentSearchTerm}
                  onChange={(e) => setEnrollmentSearchTerm(e.target.value)}
                  className="w-full bg-surface-800/50 text-white border border-surface-600 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                />
              </div>

              <button 
                onClick={() => {
                  setEnrollError('');
                  setEnrollSuccess('');
                  setEnrollForm({ studentId: '', courseId: '' });
                  setShowEnrollModal(true);
                }}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer shadow-md shadow-primary-500/10"
              >
                <span>➕ Enroll Student</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-600 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Student Details</th>
                  <th className="pb-3 px-4">Course Enrolled</th>
                  <th className="pb-3 px-4">Enrolled At</th>
                  <th className="pb-3 px-4">Course Progress</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600 text-slate-300 text-xs">
                {filteredEnrollments.map(e => (
                  <tr key={e.id} className="hover:bg-surface-700/30 transition">
                    <td className="py-3.5 pr-4">
                      <span className="font-bold text-white block">{e.student?.name || 'Unknown student'}</span>
                      <span className="text-[10px] text-slate-400 font-mono block">{e.student?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200 font-medium">
                      {e.course?.title || 'Unknown Course'}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      {e.enrolledAt ? new Date(e.enrolledAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4 min-w-[150px]">
                      <div className="flex items-center space-x-2">
                        <div className="flex-1 h-1.5 bg-surface-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary-500 to-teal-400 rounded-full" 
                            style={{ width: `${e.progressPercent || 0}%` }}
                          ></div>
                        </div>
                        <span className="font-bold text-[10px] text-slate-200">{e.progressPercent || 0}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <button
                        onClick={() => handleRevokeEnrollment(e.id)}
                        className="text-[10px] font-bold px-2.5 py-1.5 border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-lg transition cursor-pointer"
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredEnrollments.length === 0 && (
                  <tr>
                    <td colSpan="5" className="text-center py-8 text-slate-500">No enrollment records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 5: TRANSACTIONS LEDGER
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'transactions' && (
        <section className="glass rounded-2xl p-6 overflow-hidden border border-surface-600">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
                <span>Audit Billing & Payments Ledger ({filteredTransactions.length})</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Check transaction logs, gateway order IDs, and troubleshooting steps.</p>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <select
                value={txnStatusFilter}
                onChange={(e) => setTxnStatusFilter(e.target.value)}
                className="bg-surface-800 text-white border border-surface-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-600 transition"
              >
                <option value="ALL">All Payments</option>
                <option value="SUCCESS">Success Only</option>
                <option value="PENDING">Pending Only</option>
                <option value="FAILED">Failed Only</option>
              </select>

              <div className="relative w-full md:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search student, txn ID, course..."
                  value={txnSearchTerm}
                  onChange={(e) => setTxnSearchTerm(e.target.value)}
                  className="w-full bg-surface-800/50 text-white border border-surface-600 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-600 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Transaction ID / Gateway</th>
                  <th className="pb-3 px-4">Student</th>
                  <th className="pb-3 px-4">Course</th>
                  <th className="pb-3 px-4">Amount</th>
                  <th className="pb-3 px-4">Date</th>
                  <th className="pb-3 pl-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600 text-slate-300 text-xs">
                {filteredTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-surface-700/30 transition">
                    <td className="py-3.5 pr-4">
                      <span className="font-bold text-white block font-mono text-[11px]">{t.transactionId || 'PENDING ORDER'}</span>
                      <span className="text-[9px] text-slate-500 block font-mono">Gateway Order: {t.gatewayOrderId}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-200 block">{t.user?.name || 'Unknown User'}</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{t.user?.email}</span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">{t.course?.title || 'Unknown Course'}</td>
                    <td className="py-3.5 px-4 font-black text-white text-sm">₹{t.amount}</td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono">
                      {t.createdAt ? new Date(t.createdAt).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold uppercase tracking-wider ${
                        t.paymentStatus === 'SUCCESS' ? 'bg-success/10 text-success border border-success/20' :
                        t.paymentStatus === 'PENDING' ? 'bg-warning/10 text-warning border border-warning/20' : 'bg-error/10 text-error border border-error/20'
                      }`}>
                        {t.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">No payment logs match filter parameters.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          TAB 6: PROMO COUPONS MANAGEMENT
          ──────────────────────────────────────────────────────── */}
      {activeTab === 'coupons' && (
        <section className="glass rounded-2xl p-6 overflow-hidden border border-surface-600">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center space-x-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
                <span>Promotional Coupons Dashboard ({filteredCoupons.length})</span>
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Manage promotional discount codes for seasonal campaigns.</p>
            </div>

            <div className="flex items-center space-x-3 w-full md:w-auto">
              <div className="relative w-full md:w-64">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search code..."
                  value={couponSearchTerm}
                  onChange={(e) => setCouponSearchTerm(e.target.value)}
                  className="w-full bg-surface-800/50 text-white border border-surface-600 rounded-xl pl-10 pr-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                />
              </div>

              <button 
                onClick={() => {
                  setEditingCoupon(null);
                  setCouponForm({ code: '', discountPercent: '', expiryDate: '', maxUses: '', active: true });
                  setCouponError('');
                  setCouponSuccess('');
                  setShowCouponModal(true);
                }}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 transition whitespace-nowrap cursor-pointer shadow-md shadow-primary-500/10"
              >
                <span>➕ Create Coupon</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-600 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                  <th className="pb-3 pr-4">Code</th>
                  <th className="pb-3 px-4">Discount</th>
                  <th className="pb-3 px-4">Expiry Date</th>
                  <th className="pb-3 px-4">Redemption Count</th>
                  <th className="pb-3 px-4">Status</th>
                  <th className="pb-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-600 text-slate-300 text-xs">
                {filteredCoupons.map(c => {
                  const percentUsed = c.maxUses ? Math.min(Math.round((c.currentUses / c.maxUses) * 100), 100) : 100;
                  return (
                    <tr key={c.id} className="hover:bg-surface-700/30 transition">
                      <td className="py-3.5 pr-4">
                        <span className="font-mono font-black text-primary-400 bg-primary-600/10 px-3 py-1 rounded border border-primary-500/20 text-xs inline-block">
                          {c.code}
                        </span>
                        <span className="text-[9px] text-slate-500 block mt-1 font-mono">ID: {c.id}</span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white text-sm">
                        {c.discountPercent}% Off
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {c.expiryDate ? new Date(c.expiryDate).toLocaleDateString() : <span className="text-slate-500 italic">No Expiry</span>}
                      </td>
                      <td className="py-3.5 px-4 min-w-[150px]">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[9px] text-slate-400 font-semibold">
                            <span>Redeemed: {c.currentUses} / {c.maxUses || '∞'}</span>
                            <span>{percentUsed}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-primary-600 to-teal-400" style={{ width: `${percentUsed}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                          c.active ? 'bg-success/15 border-success/30 text-success' : 'bg-slate-700/50 border-slate-600 text-slate-400'
                        }`}>
                          {c.active ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td className="py-3.5 pl-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditCoupon(c)}
                          className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-surface-600 bg-surface-800 text-slate-300 hover:text-white hover:bg-surface-700 transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(c.id)}
                          className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredCoupons.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-8 text-slate-500">No promo coupons match your criteria.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL 1: VIEW USER DETAILS MODAL
          ──────────────────────────────────────────────────────── */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-surface-600 flex justify-between items-center bg-surface-900/40">
              <h4 className="text-base font-extrabold text-white">Profile Details</h4>
              <button 
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {modalLoading ? (
                <div className="py-12">
                  <LoadingSpinner text="Retrieving detailed profile stats..." />
                </div>
              ) : selectedUser ? (
                <>
                  <div className="flex items-center space-x-4 pb-4 border-b border-surface-600/50">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center text-white text-lg font-bold shadow-md shadow-primary-500/10">
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-white text-base font-bold flex items-center space-x-2">
                        <span>{selectedUser.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[8px] uppercase tracking-wider font-extrabold border ${
                          selectedUser.role === 'ADMIN' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                          selectedUser.role === 'TEACHER' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-primary-600/10 border-primary-500/20 text-primary-400'
                        }`}>
                          {selectedUser.role}
                        </span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">{selectedUser.email} | {selectedUser.phone}</p>
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">
                        Joined on: {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div>
                    {selectedUser.role === 'STUDENT' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Enrolled Courses ({selectedUser.enrolledCourses?.length || 0})
                        </h4>
                        <div className="space-y-2.5">
                          {selectedUser.enrolledCourses?.map(ec => (
                            <div key={ec.courseId} className="p-3 bg-surface-900/30 border border-surface-600/60 rounded-xl">
                              <div className="flex justify-between items-center text-xs font-semibold mb-1">
                                <span className="text-white">{ec.title}</span>
                                <span className="text-[10px] text-primary-400 font-bold">{ec.progressPercent}% Complete</span>
                              </div>
                              <div className="w-full h-1.5 bg-surface-700 rounded-full overflow-hidden mb-1.5">
                                <div className="h-full bg-gradient-to-r from-primary-500 to-teal-400 rounded-full" style={{ width: `${ec.progressPercent}%` }}></div>
                              </div>
                              <p className="text-[9px] text-slate-500">
                                Enrolled: {ec.enrolledAt ? new Date(ec.enrolledAt).toLocaleDateString() : 'N/A'}
                              </p>
                            </div>
                          ))}
                          {(!selectedUser.enrolledCourses || selectedUser.enrolledCourses.length === 0) && (
                            <p className="text-slate-500 text-xs py-4 text-center">Student has not enrolled in any courses yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedUser.role === 'TEACHER' && (
                      <div className="space-y-3">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Published Courses ({selectedUser.createdCourses?.length || 0})
                        </h4>
                        <div className="divide-y divide-surface-600/50">
                          {selectedUser.createdCourses?.map(cc => (
                            <div key={cc.courseId} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center text-xs">
                              <div>
                                <span className="font-bold text-white block">{cc.title}</span>
                                <span className="text-[9px] text-slate-500">{cc.category} | Price: ₹{cc.price}</span>
                              </div>
                              <span className="font-black text-slate-300 text-right">{cc.enrolledStudentsCount} Enrolled</span>
                            </div>
                          ))}
                          {(!selectedUser.createdCourses || selectedUser.createdCourses.length === 0) && (
                            <p className="text-slate-500 text-xs py-4 text-center">Teacher has not published any courses yet.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedUser.role === 'ADMIN' && (
                      <div className="p-4 bg-surface-900/20 border border-surface-600/40 rounded-xl text-center">
                        <p className="text-slate-400 text-xs">Administrative account overrides have full access across systems.</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p className="text-slate-400 text-center py-6 text-xs">Unable to load details.</p>
              )}
            </div>
            
            <div className="p-5 border-t border-surface-600 bg-surface-900/40 text-right flex justify-end space-x-2">
              {selectedUser && (
                <button
                  onClick={() => handleToggleUserActive(selectedUser.id)}
                  disabled={user?.email && selectedUser.email.toLowerCase() === user.email.toLowerCase()}
                  className={`text-xs font-bold px-4 py-2 rounded-xl border transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer ${
                    selectedUser.active 
                      ? 'bg-error/10 border-error/20 text-error hover:bg-error/20' 
                      : 'bg-success/10 border-success/20 text-success hover:bg-success/20'
                  }`}
                  title={user?.email && selectedUser.email.toLowerCase() === user.email.toLowerCase() ? "You cannot suspend your own account" : ""}
                >
                  {selectedUser.active ? 'Suspend Account' : 'Activate Account'}
                </button>
              )}
              <button 
                onClick={() => setShowUserModal(false)}
                className="bg-surface-700 hover:bg-surface-600 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL 2: MANUAL ENROLLMENT MODAL
          ──────────────────────────────────────────────────────── */}
      {showEnrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-surface-600 flex justify-between items-center bg-surface-900/40">
              <h4 className="text-base font-extrabold text-white">Manual Course Enrollment</h4>
              <button 
                onClick={() => setShowEnrollModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleManualEnrollSubmit} className="p-6 space-y-4">
              {enrollError && (
                <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{enrollError}</span>
                </div>
              )}

              {enrollSuccess && (
                <div className="p-3 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-center space-x-2">
                  <svg className="w-4 h-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{enrollSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Student</label>
                <select
                  value={enrollForm.studentId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, studentId: e.target.value })}
                  className="block w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  required
                >
                  <option value="">-- Choose active student --</option>
                  {studentsOnly.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Select Course</label>
                <select
                  value={enrollForm.courseId}
                  onChange={(e) => setEnrollForm({ ...enrollForm, courseId: e.target.value })}
                  className="block w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  required
                >
                  <option value="">-- Choose course to enroll in --</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.title} (₹{c.price})</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-surface-600 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowEnrollModal(false)}
                  className="bg-surface-700 hover:bg-surface-600 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEnroll}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-primary-500/10"
                >
                  {submittingEnroll ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Confirm Enrollment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL 3: CREATE / EDIT COUPON MODAL
          ──────────────────────────────────────────────────────── */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-surface-600 flex justify-between items-center bg-surface-900/40">
              <h4 className="text-base font-extrabold text-white">
                {editingCoupon ? 'Configure Discount Coupon' : 'Create Seasonal Coupon Campaign'}
              </h4>
              <button 
                onClick={() => setShowCouponModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCouponSubmit} className="p-6 space-y-4">
              {couponError && (
                <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{couponError}</span>
                </div>
              )}

              {couponSuccess && (
                <div className="p-3 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-center space-x-2">
                  <svg className="w-4 h-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{couponSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. DIWALI50 or NEWYEAR26"
                  value={couponForm.code}
                  onChange={(e) => setCouponForm({ ...couponForm, code: e.target.value })}
                  className="block w-full bg-surface-900 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition uppercase"
                  required
                  disabled={!!editingCoupon} // Disallow code change once created (standard practice)
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Discount (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    placeholder="e.g. 50"
                    value={couponForm.discountPercent}
                    onChange={(e) => setCouponForm({ ...couponForm, discountPercent: e.target.value })}
                    className="block w-full bg-surface-900 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Max Redemptions</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 100 (blank for infinite)"
                    value={couponForm.maxUses}
                    onChange={(e) => setCouponForm({ ...couponForm, maxUses: e.target.value })}
                    className="block w-full bg-surface-900 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Expiry Date</label>
                <input
                  type="date"
                  value={couponForm.expiryDate}
                  onChange={(e) => setCouponForm({ ...couponForm, expiryDate: e.target.value })}
                  className="block w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                />
              </div>

              <div className="flex items-center space-x-2 py-2">
                <input
                  type="checkbox"
                  id="couponActive"
                  checked={couponForm.active}
                  onChange={(e) => setCouponForm({ ...couponForm, active: e.target.checked })}
                  className="w-4 h-4 text-primary-600 bg-surface-900 border-surface-600 rounded focus:ring-primary-500 focus:ring-2 focus:ring-offset-0"
                />
                <label htmlFor="couponActive" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Activate this coupon code immediately
                </label>
              </div>

              <div className="pt-4 border-t border-surface-600 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="bg-surface-700 hover:bg-surface-600 text-slate-300 font-bold px-4 py-2 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingCoupon}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold px-4 py-2 rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-primary-500/10"
                >
                  {submittingCoupon ? (
                    <>
                      <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>{editingCoupon ? 'Save Campaign' : 'Launch Campaign'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────
          MODAL 4: REGISTER TEACHER MODAL
          ──────────────────────────────────────────────────────── */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-800 border border-surface-600 rounded-2xl w-full max-w-md shadow-2xl animate-scale-in">
            <div className="p-5 border-b border-surface-600 flex justify-between items-center bg-surface-900/40">
              <h4 className="text-base font-extrabold text-white">Register New Teacher</h4>
              <button 
                onClick={() => setShowRegisterModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleRegisterTeacherSubmit} className="p-6 space-y-4">
              {registerError && (
                <div className="p-3 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>{registerError}</span>
                </div>
              )}

              {registerSuccess && (
                <div className="p-3 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-center space-x-2">
                  <svg className="w-4 h-4 fill-none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{registerSuccess}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alakh Pandey"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
                <input
                  type="email"
                  placeholder="teacher@platform.com"
                  value={registerForm.email}
                  onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
                <input
                  type="text"
                  placeholder="e.g. 9876543210"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={registerForm.password}
                  onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                  className="w-full bg-surface-900 text-white border border-surface-600 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                  required
                />
              </div>

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="bg-surface-700 hover:bg-surface-600 text-slate-300 font-bold px-4 py-2.5 rounded-xl text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRegister}
                  className="bg-primary-600 hover:bg-primary-500 disabled:opacity-60 text-white font-bold px-5 py-2.5 rounded-xl text-xs transition flex items-center space-x-1.5 cursor-pointer shadow-md shadow-primary-500/10"
                >
                  {submittingRegister ? 'Registering...' : 'Register Teacher'}
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
