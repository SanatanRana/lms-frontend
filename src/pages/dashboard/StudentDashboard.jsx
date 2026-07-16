import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Toast from '../../components/common/Toast';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Dashboard datasets
  const [enrollments, setEnrollments] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter & Navigation
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'home';

  // Live class search & filtering state
  const [liveSearchQuery, setLiveSearchQuery] = useState('');
  const [liveStatusFilter, setLiveStatusFilter] = useState('ALL'); // 'ALL' | 'LIVE' | 'SCHEDULED'
  const [selectedLiveCourse, setSelectedLiveCourse] = useState('ALL');

  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Streak & Gamification State
  const [streak, setStreak] = useState(1);
  const [streakUpdated, setStreakUpdated] = useState(false);



  const [allAssignments, setAllAssignments] = useState([]);

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const enrolledResponse = await api.get('/enrollments/my-courses');
      const enrolledData = enrolledResponse.data.data || [];
      setEnrollments(enrolledData);

      const allResponse = await api.get('/courses/all');
      const coursesData = allResponse.data.data || [];
      setAllCourses(coursesData);

      const enrolledIds = enrolledData.map(e => e.course.id);
      const filteredRecommendations = coursesData.filter(c => !enrolledIds.includes(c.id));
      setRecommendations(filteredRecommendations);

      // Fetch live sessions
      const liveResponse = await api.get('/live/enrolled');
      setLiveSessions(liveResponse.data.data || []);

      // Fetch assignments in parallel for all enrolled courses
      if (enrolledData.length > 0) {
        const assignmentsPromises = enrolledData.map(async (enroll) => {
          try {
            const assignResp = await api.get(`/assignments/course/${enroll.course.id}`);
            return (assignResp.data?.data || []).map(assign => ({
              ...assign,
              courseId: enroll.course.id,
              courseTitle: enroll.course.title
            }));
          } catch (err) {
            console.error(`Failed to fetch assignments for course ${enroll.course.id}:`, err);
            return [];
          }
        });
        const assignmentsList = await Promise.all(assignmentsPromises);
        setAllAssignments(assignmentsList.flat());
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateStreak = () => {
    try {
      const today = new Date().toDateString();
      const userPrefix = user?.email || 'guest';
      const lastLoginKey = `${userPrefix}_last_login_date`;
      const streakKey = `${userPrefix}_learning_streak`;
      const lastLogin = localStorage.getItem(lastLoginKey);
      const savedStreak = parseInt(localStorage.getItem(streakKey) || '1');

      if (lastLogin === today) {
        setStreak(savedStreak);
      } else {
        let newStreak = savedStreak;
        if (lastLogin) {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          if (new Date(lastLogin).toDateString() === yesterday.toDateString()) {
            newStreak += 1;
            setStreakUpdated(true);
            showToast('success', `🎉 Learning Streak Extended! You are on a ${newStreak} day streak!`);
          } else {
            newStreak = 1;
          }
        }
        localStorage.setItem(streakKey, newStreak.toString());
        localStorage.setItem(lastLoginKey, today);
        setStreak(newStreak);
      }
    } catch (e) {
      console.error("Streak tracker error:", e);
    }
  };

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: '', message: '' }), 4000);
  };

  // Streak Update Logic
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDashboardData();
    updateStreak();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleJoinLive = async (sessionId, session) => {
    try {
      const joinResp = await api.post(`/live/${sessionId}/join`);
      const roomToken = joinResp.data.data.liveSession?.roomToken;
      if (!roomToken) {
        throw new Error("Room token not returned in response");
      }
      navigate(`/live/join/${roomToken}`);
    } catch (error) {
      console.error("Failed to join live session:", error);
      showToast('error', 'Failed to join live classroom. Try again.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 animate-fade-in">
        {/* Welcome HUD Skeleton */}
        <div className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-2.5 w-full md:w-1/2">
            <div className="h-4 skeleton rounded-lg w-1/4"></div>
            <div className="h-8 skeleton rounded-xl w-3/4"></div>
            <div className="h-3.5 skeleton rounded-md w-full"></div>
          </div>
          <div className="h-10 skeleton rounded-xl w-32 shrink-0"></div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Columns Skeleton */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
              <div className="h-6 skeleton rounded-lg w-1/3"></div>
              <div className="h-20 skeleton rounded-2xl w-full"></div>
            </div>

            <div className="space-y-4">
              <div className="h-6 skeleton rounded-lg w-1/4"></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {[1, 2].map(n => (
                  <div key={n} className="bg-card border border-border rounded-2xl overflow-hidden h-64">
                    <div className="h-32 skeleton"></div>
                    <div className="p-4 space-y-2">
                      <div className="h-4 skeleton rounded w-1/3"></div>
                      <div className="h-5 skeleton rounded w-3/4"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-6">
            <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
              <div className="h-6 skeleton rounded-lg w-1/2"></div>
              <div className="h-32 skeleton rounded-2xl w-full"></div>
            </div>
            <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
              <div className="h-6 skeleton rounded-lg w-1/3"></div>
              <div className="h-24 skeleton rounded-2xl w-full"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Streak & Achievements
  const completedCourses = enrollments.filter(e => e.progressPercent >= 100);
  const inProgressCourses = enrollments.filter(e => e.progressPercent > 0 && e.progressPercent < 100);
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / enrollments.length)
    : 0;

  // Continue Learning Logic
  let lastActiveCourse = null;
  const userPrefix = user?.email || 'guest';
  const lastActiveId = localStorage.getItem(`${userPrefix}_last_active_course_id`);
  if (lastActiveId) {
    lastActiveCourse = enrollments.find(e => e.course.id === parseInt(lastActiveId));
  }
  if (!lastActiveCourse && inProgressCourses.length > 0) {
    lastActiveCourse = inProgressCourses[0];
  } else if (!lastActiveCourse && enrollments.length > 0) {
    lastActiveCourse = enrollments[0];
  }

  // Categories list
  const categories = ['ALL', ...new Set(allCourses.map(c => c.category).filter(Boolean))];

  // Filters courses
  const filteredMyCourses = enrollments.filter(e => {
    if (selectedCategory === 'ALL') return true;
    return e.course.category === selectedCategory;
  });



  // Achievements Cabinet
  const achievements = [
    { id: 'first_step', title: 'First Step', desc: 'Enroll in any course', icon: '🚀', unlocked: enrollments.length > 0 },
    { id: 'streak_3', title: 'Consistency', desc: 'Reach a 3-day learning streak', icon: '🔥', unlocked: streak >= 3 },
    { id: 'active_learner', title: 'Committed', desc: 'Reach 50% in any course', icon: '💪', unlocked: enrollments.some(e => e.progressPercent >= 50) },
    { id: 'graduate', title: 'Graduate', desc: 'Complete your first course', icon: '🎓', unlocked: completedCourses.length > 0 },
    { id: 'scholarly', title: 'Syllabus Collector', desc: 'Enroll in 3+ courses', icon: '📚', unlocked: enrollments.length >= 3 }
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-4 md:py-6 animate-fade-in pb-16">

      {/* Toast Alert */}
      {toast.show && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      {/* Tabs Selector at the top */}
      <div className="flex space-x-6 border-b border-border overflow-x-auto scrollbar-none py-1 shrink-0">
        {[
          { id: 'home', label: '🏠 Home' },
          { id: 'my-courses', label: '📚 My Courses', count: enrollments.length },
          { id: 'live', label: '📹 Live Classes', count: liveSessions.length },
          { id: 'assignments', label: '📝 Assignments', count: allAssignments.length },
          { id: 'certificates', label: '🎓 Certificates', count: completedCourses.length },
          { id: 'achievements', label: '🏆 Achievements', count: achievements.filter(a => a.unlocked).length }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.id === 'home') {
                navigate('/dashboard');
              } else {
                navigate(`/dashboard?tab=${tab.id}`);
              }
            }}
            className={`pb-3 text-xs font-bold border-b-2 transition relative flex items-center space-x-1.5 cursor-pointer shrink-0 ${activeTab === tab.id
              ? 'border-primary-600 text-primary-400'
              : 'border-transparent text-text-muted hover:text-white'
              }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[9px] bg-surface-800 border border-border px-1.5 py-0.5 rounded-md font-semibold text-slate-400">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Panels */}
      <div className="space-y-6">

        {/* ══════════════════ TAB: HOME ══════════════════ */}
        {activeTab === 'home' && (
          <>
            {/* Visual HUD Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 -mx-4 md:mx-0">
              {/* Welcome Banner Card */}
              <div className="lg:col-span-2 bg-card border-y md:border border-border rounded-none md:rounded-3xl p-6 flex flex-col justify-between relative overflow-hidden min-h-[140px]">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl"></div>
                <div>
                  <span className="text-[10px] text-primary font-extrabold uppercase tracking-widest">WELCOME BACK</span>
                  <h2 className="text-2xl font-black text-white mt-1">Hello, {user?.name || 'Learner'}! 👋</h2>
                  <p className="text-xs text-text-muted mt-2 leading-relaxed max-w-md">
                    Keep up the great momentum! You've enrolled in <span className="text-white font-bold">{enrollments.length} courses</span> and achieved an average completion rate of <span className="text-white font-bold">{avgProgress}%</span>.
                  </p>
                </div>
                <div className="mt-4 flex items-center space-x-3.5 bg-background/50 border border-border/85 p-3 rounded-2xl w-full sm:w-fit shrink-0">
                  <div className="relative flex items-center justify-center w-10 h-10 bg-amber-500/10 border border-amber-500/25 rounded-xl">
                    <span className="text-xl">🔥</span>
                    {streakUpdated && (
                      <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>
                    )}
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold block">CURRENT STREAK</span>
                    <span className="text-xs font-extrabold text-white">{streak} Days learning</span>
                  </div>
                </div>
              </div>

              {/* SVG Radial Progress HUD Card */}
              <div className="bg-card border-y md:border border-border rounded-none md:rounded-3xl p-5 flex items-center justify-between relative overflow-hidden min-h-[140px]">
                <div className="space-y-1">
                  <span className="text-[10px] text-teal-400 font-extrabold uppercase tracking-widest">SYLLABUS PROGRESS</span>
                  <h4 className="text-white font-black text-base mt-1">Average Progress</h4>
                  <p className="text-[10px] text-text-muted mt-0.5 leading-tight">
                    Based on your active course enrollments
                  </p>
                  <div className="pt-3 flex space-x-3 text-[10px] font-bold text-slate-400">
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-teal-500 mr-1.5"></span>{completedCourses.length} Done</span>
                    <span className="flex items-center"><span className="w-2.5 h-2.5 rounded-full bg-primary mr-1.5"></span>{inProgressCourses.length} Learning</span>
                  </div>
                </div>

                {/* SVG Progress Ring */}
                <div className="relative w-24 h-24 shrink-0 flex items-center justify-center select-none">
                  <svg className="w-full h-full transform -rotate-90">
                    {/* Background track */}
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      strokeWidth="8"
                      stroke="rgba(255,255,255,0.05)"
                      fill="transparent"
                    />
                    {/* Animated progress overlay */}
                    <circle
                      cx="48"
                      cy="48"
                      r="38"
                      strokeWidth="8"
                      stroke="url(#progressGradient)"
                      strokeDasharray={2 * Math.PI * 38}
                      strokeDashoffset={2 * Math.PI * 38 * (1 - avgProgress / 100)}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-1000 ease-out"
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#14b8a6" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-lg font-black text-white">{avgProgress}%</span>
                    <span className="text-[7px] text-slate-400 font-extrabold uppercase tracking-wide">Avg</span>
                  </div>
                </div>
              </div>
            </div>

            {/* My Purchased Courses (Horizontal Scroll / Swipable) */}
            {enrollments.length > 0 ? (
              <section className="space-y-4 pt-1">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                      <span className="w-1.5 h-4.5 rounded bg-gradient-to-b from-teal-500 to-indigo-400"></span>
                      <span>My Purchased Courses</span>
                    </h3>
                    <p className="text-[11px] text-text-muted mt-1">
                      Swipe left/right to browse your active learning batches.
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider select-none animate-pulse">
                    Swipe ↔
                  </span>
                </div>

                <div className="flex space-x-5 overflow-x-auto pb-4 scrollbar-none snap-x snap-mandatory">
                  {enrollments.map(enroll => (
                    <div
                      key={enroll.id}
                      className="w-[280px] md:w-[320px] shrink-0 snap-start bg-card border border-border hover:border-slate-700/50 rounded-2xl overflow-hidden shadow transition flex flex-col justify-between"
                    >
                      <div>
                        <div className="relative h-32 bg-slate-900 border-b border-border overflow-hidden">
                          <img
                            src={enroll.course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"}
                            alt={enroll.course.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[8px] font-black text-primary-400 uppercase tracking-widest">
                            {enroll.course.category || "General"}
                          </div>
                        </div>
                        <div className="p-4 space-y-1.5">
                          <h4 className="text-white font-bold text-xs line-clamp-1">{enroll.course.title}</h4>
                          <p className="text-text-muted text-[10px] line-clamp-2 leading-relaxed">{enroll.course.description}</p>
                        </div>
                      </div>

                      <div className="p-4 pt-0 space-y-3.5">
                        <div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-slate-455 mb-1">
                            <span>Completed</span>
                            <span className={enroll.progressPercent >= 100 ? 'text-emerald-400' : 'text-teal-405'}>
                              {enroll.progressPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-surface-700 h-1 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${enroll.progressPercent >= 100
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                : 'bg-gradient-to-r from-primary-500 to-teal-400'
                                }`}
                              style={{ width: `${enroll.progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                        <Link
                          to={`/course/${enroll.course.id}/learn`}
                          onClick={() => localStorage.setItem(`${userPrefix}_last_active_course_id`, enroll.course.id.toString())}
                          className="w-full text-center block bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 py-2.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition select-none cursor-pointer"
                        >
                          {enroll.progressPercent >= 100 ? 'Review Lectures' : 'Resume Lesson 🚀'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : (
              <div className="bg-gradient-to-r from-teal-900/10 to-indigo-900/10 border border-border rounded-3xl p-8 text-center space-y-3 shadow-lg">
                <span className="text-3xl block">🎓</span>
                <h3 className="text-white font-extrabold text-sm">Start Your Learning Journey</h3>
                <p className="text-xs text-text-muted max-w-sm mx-auto">
                  You are not enrolled in any batches yet. Discover our top recommended courses below and enroll to get started!
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-primary hover:bg-primary-light text-white text-[10px] font-black uppercase px-5 py-2.5 rounded-xl transition cursor-pointer"
                >
                  Explore Batches
                </button>
              </div>
            )}
            {/* Recommended for You */}
            {recommendations.length > 0 && (
              <section className="space-y-6 pt-6 border-t border-border">
                <div className="flex justify-between items-end">
                  <div>
                    <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                      <span className="w-1.5 h-4.5 rounded bg-gradient-to-b from-teal-500 to-indigo-400"></span>
                      <span>Recommended for You</span>
                    </h3>
                    <p className="text-[11px] text-text-muted mt-1 leading-normal">
                      Curated syllabus paths tailored for your study history.
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/')}
                    className="text-xs text-primary-400 font-bold hover:text-white transition flex items-center space-x-1 cursor-pointer"
                  >
                    <span>Explore More Batches</span>
                    <span>→</span>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {recommendations.slice(0, 4).map(course => {
                    const ratingVal = '4.9';
                    const studentsVal = 180;
                    return (
                      <div
                        key={course.id}
                        className="bg-card border border-border hover:border-slate-700/50 rounded-2xl overflow-hidden shadow transition flex flex-col justify-between card-hover group"
                      >
                        <div>
                          <div className="relative h-40 bg-slate-900 overflow-hidden border-b border-border">
                            <img
                              src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"}
                              alt={course.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            />
                            <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[8px] font-black text-primary-400 uppercase tracking-widest">
                              {course.category || "General"}
                            </div>
                          </div>
                          <div className="p-4 space-y-2">
                            <div className="flex items-center space-x-1.5 text-[10px] text-slate-500 font-bold">
                              <span className="text-amber-400">⭐ {ratingVal}</span>
                              <span>•</span>
                              <span>👥 {studentsVal} Learners</span>
                            </div>
                            <h4 className="text-white font-extrabold text-sm group-hover:text-primary-400 transition line-clamp-1">
                              {course.title}
                            </h4>
                            <p className="text-text-muted text-[10px] line-clamp-2 leading-relaxed">{course.description}</p>
                          </div>
                        </div>
                        <div className="p-4 pt-0 space-y-3">
                          <div className="flex items-baseline justify-between border-t border-border/50 pt-3">
                            <div>
                              <span className="text-[9px] text-slate-500 uppercase tracking-wider block">Price</span>
                              <div className="flex items-baseline space-x-1">
                                <span className="text-white font-black text-sm">
                                  {(course.discountPrice || course.price) === 0 ? 'Free' : `₹${course.discountPrice || course.price}`}
                                </span>
                              </div>
                            </div>
                            <span className="text-[9px] text-teal-400 font-semibold font-bold">Recommended</span>
                          </div>
                          <Link
                            to={`/course/${course.id}`}
                            className="w-full text-center block bg-primary hover:bg-primary-light text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition"
                          >
                            View Details
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}

        {/* ══════════════════ TAB: MY COURSES ══════════════════ */}
        {activeTab === 'my-courses' && (
          <div className="space-y-6">
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none border-b border-border/40">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition whitespace-nowrap select-none cursor-pointer border shrink-0 ${selectedCategory === cat
                    ? 'bg-primary border-primary text-white shadow'
                    : 'bg-background border-border text-slate-400 hover:text-white'
                    }`}
                >
                  {cat === 'ALL' ? '💻 All Subjects' : cat}
                </button>
              ))}
            </div>

            <div>
              {filteredMyCourses.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-2xl">
                  <span className="text-5xl">📖</span>
                  <p className="text-white font-bold mt-4 text-sm">No enrolled courses in this category</p>
                  <p className="text-xs text-text-muted mt-1 mb-4">Explore the course catalog to start learning!</p>
                  <button
                    onClick={() => navigate('/')}
                    className="bg-primary hover:bg-primary-light text-white text-xs font-bold px-4 py-2 rounded-xl"
                  >
                    Browse Catalog
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {filteredMyCourses.map(enroll => (
                    <div
                      key={enroll.id}
                      className="bg-card border border-border hover:border-slate-700/50 rounded-2xl overflow-hidden shadow transition flex flex-col justify-between card-hover"
                    >
                      <div>
                        <div className="relative h-40 bg-slate-900 border-b border-border overflow-hidden">
                          <img
                            src={enroll.course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"}
                            alt={enroll.course.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-sm border border-white/10 px-2 py-0.5 rounded text-[8px] font-black text-primary-400 uppercase tracking-widest">
                            {enroll.course.category || "General"}
                          </div>
                        </div>
                        <div className="p-4 space-y-1.5">
                          <h4 className="text-white font-bold text-sm line-clamp-1">{enroll.course.title}</h4>
                          <p className="text-text-muted text-[10px] line-clamp-2 leading-relaxed">{enroll.course.description}</p>
                        </div>
                      </div>
                      <div className="p-4 pt-0 space-y-4">
                        <div>
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 mb-1">
                            <span>Completed</span>
                            <span className={enroll.progressPercent >= 100 ? 'text-success' : 'text-primary'}>
                              {enroll.progressPercent}%
                            </span>
                          </div>
                          <div className="w-full bg-surface-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${enroll.progressPercent >= 100
                                ? 'bg-gradient-to-r from-success to-emerald-400'
                                : 'bg-gradient-to-r from-primary-500 to-teal-400'
                                }`}
                              style={{ width: `${enroll.progressPercent}%` }}
                            ></div>
                          </div>
                        </div>
                        <Link
                          to={`/course/${enroll.course.id}/learn`}
                          onClick={() => localStorage.setItem(`${userPrefix}_last_active_course_id`, enroll.course.id.toString())}
                          className="w-full text-center block bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 py-2.5 rounded-xl text-[10px] font-black tracking-wide uppercase transition select-none cursor-pointer"
                        >
                          {enroll.progressPercent >= 100 ? 'Review Lectures' : 'Continue Learning'}
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════ TAB: LIVE CLASSES ══════════════════ */}
        {activeTab === 'live' && (() => {
          const uniqueCoursesInSessions = Array.from(
            new Map(
              liveSessions
                .filter(s => s.course)
                .map(s => [s.course.id, s.course])
            ).values()
          );

          const filteredLiveSessions = liveSessions.filter(session => {
            const matchesSearch = session.title.toLowerCase().includes(liveSearchQuery.toLowerCase()) ||
              (session.course?.title || '').toLowerCase().includes(liveSearchQuery.toLowerCase());
            if (!matchesSearch) return false;

            const matchesCourse = selectedLiveCourse === 'ALL' || session.course?.id?.toString() === selectedLiveCourse.toString();
            if (!matchesCourse) return false;

            const isPast = new Date(session.endTime || session.startTime) < new Date();

            if (liveStatusFilter === 'ALL') {
              return session.status === 'LIVE' || (session.status === 'SCHEDULED' && !isPast);
            }
            if (liveStatusFilter === 'LIVE') {
              return session.status === 'LIVE';
            }
            if (liveStatusFilter === 'SCHEDULED') {
              return session.status === 'SCHEDULED' && !isPast;
            }
            return false;
          });

          // Sort sessions by start time
          const sortedLiveSessions = [...filteredLiveSessions].sort((a, b) => new Date(a.startTime) - new Date(b.startTime));

          // Group by date
          const groupSessionsByDate = (sessions) => {
            const groups = {};
            sessions.forEach(s => {
              const d = new Date(s.startTime);
              const todayStr = new Date().toDateString();
              const tomorrowStr = new Date(Date.now() + 86400000).toDateString();
              const sessionDateStr = d.toDateString();

              let groupKey = sessionDateStr;
              if (sessionDateStr === todayStr) {
                groupKey = 'Today';
              } else if (sessionDateStr === tomorrowStr) {
                groupKey = 'Tomorrow';
              } else {
                groupKey = d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
              }

              if (!groups[groupKey]) {
                groups[groupKey] = [];
              }
              groups[groupKey].push(s);
            });
            return groups;
          };

          const sessionGroups = groupSessionsByDate(sortedLiveSessions);
          const groupKeys = Object.keys(sessionGroups);

          return (
            <div className="space-y-6">
              {/* Controls bar */}
              <div className="bg-card border border-border p-4 sm:p-5 rounded-3xl space-y-4 shadow-md">
                {/* Search & Status Filters */}
                <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-500 text-sm">
                      🔍
                    </span>
                    <input
                      type="text"
                      placeholder="Search live classes..."
                      value={liveSearchQuery}
                      onChange={(e) => setLiveSearchQuery(e.target.value)}
                      className="w-full bg-background border border-border rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-primary-500"
                    />
                  </div>

                  <div className="flex overflow-x-auto scrollbar-none max-w-full space-x-1.5 self-start md:self-auto bg-background/50 border border-border p-1 rounded-xl">
                    {[
                      { id: 'ALL', label: 'All Classes' },
                      { id: 'LIVE', label: '🔴 Live Now' },
                      { id: 'SCHEDULED', label: '📅 Upcoming' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setLiveStatusFilter(tab.id)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-extrabold uppercase transition whitespace-nowrap cursor-pointer select-none shrink-0 ${liveStatusFilter === tab.id
                            ? 'bg-primary text-white shadow'
                            : 'text-slate-400 hover:text-white'
                          }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Course Category Badge Filter (Horizontal scroll) */}
                {uniqueCoursesInSessions.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <span className="text-[9px] text-slate-500 font-bold uppercase tracking-wider block">Filter by enrolled course</span>
                    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
                      <button
                        type="button"
                        onClick={() => setSelectedLiveCourse('ALL')}
                        className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition whitespace-nowrap select-none cursor-pointer border-border ${selectedLiveCourse === 'ALL'
                            ? 'bg-teal-500 border-teal-500 text-white shadow'
                            : 'bg-background text-slate-450 hover:text-white'
                          }`}
                      >
                        All Courses
                      </button>
                      {uniqueCoursesInSessions.map(course => (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => setSelectedLiveCourse(course.id)}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition whitespace-nowrap select-none cursor-pointer border-border ${selectedLiveCourse.toString() === course.id.toString()
                              ? 'bg-teal-500 border-teal-500 text-white shadow'
                              : 'bg-background text-slate-450 hover:text-white'
                            }`}
                        >
                          {course.title}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Sessions List */}
              {liveSessions.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-2xl">
                  <span className="text-5xl">📹</span>
                  <p className="text-white font-bold mt-4 text-sm">No Live Classes Scheduled</p>
                  <p className="text-xs text-text-muted mt-1">Check back later for updates or announcements.</p>
                </div>
              ) : filteredLiveSessions.length === 0 ? (
                <div className="text-center py-16 bg-card border border-border rounded-2xl">
                  <span className="text-5xl">🔍</span>
                  <p className="text-white font-bold mt-4 text-sm">No live classes match your filters</p>
                  <p className="text-xs text-text-muted mt-1">Try adjusting your search query or filters.</p>
                </div>
              ) : (
                <div className="space-y-8 relative before:absolute before:inset-y-0 before:left-3 md:before:left-4 before:w-0.5 before:bg-border/20 before:pointer-events-none">
                  {groupKeys.map(dateKey => (
                    <div key={dateKey} className="space-y-4 relative">
                      {/* Timeline Header Badge */}
                      <div className="flex items-center space-x-3.5 z-10 relative">
                        <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-card border-2 border-border flex items-center justify-center text-[10px] text-primary-400 font-bold shrink-0 shadow-lg select-none">
                          📅
                        </div>
                        <h4 className="text-white font-extrabold text-xs tracking-wide uppercase bg-surface-900 pr-4">
                          {dateKey}
                        </h4>
                      </div>

                      {/* Sessions under this date */}
                      <div className="pl-9 md:pl-12 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {sessionGroups[dateKey].map(session => {
                          const isLive = session.status === 'LIVE';
                          return (
                            <div
                              key={session.id}
                              className={`border rounded-2xl p-5 flex flex-col justify-between transition-all bg-card/45 duration-300 relative overflow-hidden group ${isLive
                                  ? 'border-rose-500/35 bg-rose-500/5 shadow-lg shadow-rose-500/5'
                                  : 'border-border hover:border-slate-700/50 card-hover'
                                }`}
                              style={{
                                borderLeftWidth: '4px',
                                borderLeftColor: isLive ? 'var(--color-error)' : 'var(--color-primary-500)'
                              }}
                            >
                              {isLive && (
                                <div className="absolute top-0 right-0 bg-error text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-bl-xl animate-pulse flex items-center space-x-1">
                                  <span className="w-1.5 h-1.5 bg-white rounded-full inline-block animate-ping"></span>
                                  <span>Live Now</span>
                                </div>
                              )}
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <span className="text-[8px] bg-primary-600/10 text-primary-400 border border-primary-500/10 px-2 py-0.5 rounded font-black uppercase tracking-wider block truncate max-w-[160px]">
                                    {session.course?.title || 'Live Classroom'}
                                  </span>
                                </div>
                                <h4 className="text-white font-black text-sm group-hover:text-primary-400 transition-colors leading-snug line-clamp-1">
                                  {session.title}
                                </h4>
                                <div className="flex items-center space-x-1.5 text-text-muted text-[10px] pt-0.5">
                                  <svg className="w-3.5 h-3.5 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span className="font-semibold text-slate-400">
                                    {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3 gap-2">
                                <div className="flex items-center space-x-2 min-w-0">
                                  <div className="w-6 h-6 rounded-full bg-slate-700/80 border border-border flex items-center justify-center font-black text-white text-[9px] shrink-0">
                                    {getInitials(session.teacher?.name || 'TR')}
                                  </div>
                                  <span className="text-[10px] text-slate-300 font-bold truncate leading-none">
                                    {session.teacher?.name || 'Instructor'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleJoinLive(session.id, session)}
                                  className={`text-[9px] font-black px-4 py-2 rounded-xl transition cursor-pointer select-none shrink-0 tracking-wide uppercase ${isLive
                                      ? 'bg-error hover:bg-error/95 text-white shadow-md shadow-error/15 hover:scale-102'
                                      : 'bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 hover:scale-102'
                                    }`}
                                >
                                  {isLive ? 'Join Lecture' : 'Enter Lobby'}
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ══════════════════ TAB: ASSIGNMENTS ══════════════════ */}
        {activeTab === 'assignments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-baseline mb-2">
              <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                <span className="w-1.5 h-4.5 rounded bg-gradient-to-b from-amber-500 to-rose-400"></span>
                <span>Assignments & Homework Tasks</span>
              </h3>
              <span className="text-[10px] text-slate-500 font-semibold">Track your course assignments</span>
            </div>

            {allAssignments.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <span className="text-5xl">📝</span>
                <p className="text-white font-bold mt-4 text-sm">No Pending Assignments</p>
                <p className="text-xs text-text-muted mt-1">Your enrolled courses do not have scheduled homework currently.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {allAssignments.map(assign => (
                  <div key={assign.id} className="bg-card border border-border p-5 rounded-2xl flex flex-col justify-between hover:border-slate-700/50 transition duration-300 card-hover">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[9px] bg-primary-600/10 border border-primary-500/25 text-primary-400 font-extrabold uppercase px-2.5 py-0.5 rounded tracking-wider truncate max-w-[180px]">
                          {assign.courseTitle}
                        </span>
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/25 text-amber-400 font-extrabold uppercase px-2.5 py-0.5 rounded tracking-wider">
                          Due: {new Date(assign.dueDate).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-white font-black text-sm">{assign.title}</h4>
                      <p className="text-text-muted text-[11px] leading-relaxed line-clamp-3">
                        {assign.description || assign.instructions || 'No detailed instructions provided.'}
                      </p>
                    </div>
                    <button
                      onClick={() => navigate(`/course/${assign.courseId}/learn?tab=assignments`)}
                      className="mt-6 w-full text-center bg-primary hover:bg-primary-light text-white py-2.5 rounded-xl text-xs font-bold transition cursor-pointer select-none"
                    >
                      Go to Classroom to Submit 🚀
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB: CERTIFICATES ══════════════════ */}
        {activeTab === 'certificates' && (
          <div>
            {completedCourses.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <span className="text-5xl">🏆</span>
                <p className="text-white font-bold mt-4 text-sm">No Certificates Earned Yet</p>
                <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                  Complete 100% of any enrolled course syllabus to generate your verifiable learning certificate.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {completedCourses.map(enroll => (
                  <div
                    key={enroll.id}
                    className="bg-gradient-to-br from-card to-background border-2 border-amber-500/20 p-5 rounded-2xl shadow-xl flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <span className="text-[28px]">📜</span>
                        <span className="text-[9px] bg-amber-500/10 border border-amber-500/25 text-amber-400 font-extrabold uppercase px-2 py-0.5 rounded tracking-wider">
                          Verifiable
                        </span>
                      </div>
                      <h4 className="text-white font-black text-sm">{enroll.course.title}</h4>
                      <p className="text-text-muted text-[10px]">
                        Successfully completed on {new Date(enroll.enrolledAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        const win = window.open("", "_blank");
                        win.document.write(`
                          <html>
                            <head>
                              <title>Certificate of Completion - ${enroll.course.title}</title>
                              <style>
                                @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Montserrat:wght@400;600;700&family=Great+Vibes&display=swap');
                                @page { size: landscape; margin: 0; }
                                body { 
                                  background-color: #0c1222; 
                                  color: #fff; 
                                  font-family: 'Montserrat', sans-serif; 
                                  padding: 0; 
                                  margin: 0; 
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  min-height: 100vh;
                                  box-sizing: border-box;
                                }
                                .certificate-container {
                                  background: radial-gradient(circle, #1a2332 0%, #111827 100%);
                                  border: 12px double #d97706;
                                  padding: 40px 60px;
                                  width: 900px;
                                  height: 600px;
                                  border-radius: 12px;
                                  box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);
                                  display: flex;
                                  flex-direction: column;
                                  justify-content: space-between;
                                  align-items: center;
                                  position: relative;
                                  box-sizing: border-box;
                                }
                                .seal-bg {
                                  position: absolute;
                                  font-size: 260px;
                                  opacity: 0.04;
                                  top: 50%;
                                  left: 50%;
                                  transform: translate(-50%, -50%);
                                  user-select: none;
                                  pointer-events: none;
                                }
                                .header {
                                  text-align: center;
                                  margin-top: 10px;
                                }
                                .logo {
                                  font-family: 'Cinzel', serif;
                                  font-size: 28px;
                                  font-weight: 800;
                                  letter-spacing: 4px;
                                  color: #fbbf24;
                                  text-shadow: 0 2px 4px rgba(0,0,0,0.5);
                                }
                                .subtitle {
                                  font-size: 9px;
                                  text-transform: uppercase;
                                  letter-spacing: 3px;
                                  color: #94a3b8;
                                  margin-top: 6px;
                                }
                                .title-block {
                                  text-align: center;
                                }
                                h1 {
                                  font-family: 'Cinzel', serif;
                                  font-size: 32px;
                                  color: #fff;
                                  margin: 15px 0 5px 0;
                                  font-weight: 700;
                                  letter-spacing: 2px;
                                }
                                .recipient-block {
                                  text-align: center;
                                  width: 80%;
                                }
                                .presented-to {
                                  font-size: 11px;
                                  font-style: italic;
                                  color: #94a3b8;
                                }
                                .recipient-name {
                                  font-family: 'Great Vibes', cursive;
                                  font-size: 52px;
                                  color: #fbbf24;
                                  border-bottom: 2px solid #334155;
                                  padding-bottom: 5px;
                                  margin: 5px 0 15px 0;
                                }
                                .course-title {
                                  font-size: 16px;
                                  font-weight: 700;
                                  color: #fff;
                                }
                                .description {
                                  font-size: 11px;
                                  color: #cbd5e1;
                                  max-width: 550px;
                                  margin: 8px auto 0 auto;
                                  line-height: 1.6;
                                }
                                .footer {
                                  display: flex;
                                  justify-content: space-between;
                                  align-items: flex-end;
                                  width: 100%;
                                  margin-bottom: 10px;
                                }
                                .sign-block {
                                  text-align: center;
                                  width: 180px;
                                }
                                .signature {
                                  font-family: 'Great Vibes', cursive;
                                  font-size: 26px;
                                  color: #a5b4fc;
                                  border-bottom: 1px solid #475569;
                                  padding-bottom: 2px;
                                  margin-bottom: 4px;
                                  min-height: 35px;
                                }
                                .sign-label {
                                  font-size: 8px;
                                  font-weight: 700;
                                  color: #94a3b8;
                                  text-transform: uppercase;
                                  letter-spacing: 1px;
                                }
                                .badge-block {
                                  display: flex;
                                  flex-direction: column;
                                  align-items: center;
                                }
                                .gold-seal {
                                  width: 60px;
                                  height: 60px;
                                  background: radial-gradient(circle, #fcd34d 0%, #d97706 100%);
                                  border: 3px double #fff;
                                  border-radius: 50%;
                                  box-shadow: 0 0 15px rgba(217,119,6,0.3);
                                  display: flex;
                                  align-items: center;
                                  justify-content: center;
                                  font-size: 24px;
                                }
                                .verification {
                                  font-size: 8px;
                                  font-weight: 600;
                                  color: #64748b;
                                  text-transform: uppercase;
                                  letter-spacing: 1.5px;
                                  margin-top: 15px;
                                }
                                @media print {
                                  body { background: #fff; color: #000; }
                                  .certificate-container {
                                    box-shadow: none;
                                    page-break-inside: avoid;
                                    width: 100%;
                                    height: 100vh;
                                    border-radius: 0;
                                    border-width: 15px;
                                  }
                                }
                              </style>
                            </head>
                            <body>
                              <div class="certificate-container">
                                <div class="seal-bg">🎓</div>
                                <div class="header">
                                  <div class="logo">LEARNGEN</div>
                                  <div class="subtitle">Platform for Premium Education</div>
                                </div>
                                <div class="title-block">
                                  <h1>CERTIFICATE OF COMPLETION</h1>
                                  <div class="subtitle">This verifiable credential honors the dedication of</div>
                                </div>
                                <div class="recipient-block">
                                  <div class="recipient-name">${user?.name || 'LearnGen Learner'}</div>
                                  <p class="presented-to">for successfully mastering the curriculum and completing all requirements for</p>
                                  <div class="course-title">${enroll.course.title}</div>
                                  <p class="description">An intensive coursework path encompassing expert lectures, practical coding assessments, and collaborative doubt-resolution metrics.</p>
                                </div>
                                <div class="footer">
                                  <div class="sign-block">
                                    <div class="signature">L. G. Director</div>
                                    <div class="sign-label">Director, LearnGen</div>
                                  </div>
                                  <div class="badge-block">
                                    <div class="gold-seal">🏆</div>
                                    <div class="verification">ID: CERT_${enroll.id} | Date: ${new Date(enroll.enrolledAt).toLocaleDateString()}</div>
                                  </div>
                                  <div class="sign-block">
                                    <div class="signature">${enroll.course.teacherName || 'S. Rana'}</div>
                                    <div class="sign-label">Lead Instructor</div>
                                  </div>
                                </div>
                              </div>
                              <script>window.print();</script>
                            </body>
                          </html>
                        `);
                        win.document.close();
                      }}
                      className="mt-6 w-full text-center bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Download Certificate PDF 📥
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════ TAB: ACHIEVEMENTS ══════════════════ */}
        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {achievements.map(ach => (
              <div
                key={ach.id}
                className={`p-4.5 rounded-2xl border transition duration-300 flex items-center space-x-4 bg-card/65 ${ach.unlocked
                  ? 'border-teal-500/25 bg-teal-950/5'
                  : 'border-border opacity-50 grayscale'
                  }`}
              >
                <span className="text-3xl">{ach.icon}</span>
                <div>
                  <h4 className="text-white font-extrabold text-xs">{ach.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{ach.desc}</p>
                  <span className={`text-[8px] font-black uppercase mt-1.5 block tracking-widest ${ach.unlocked ? 'text-teal-400' : 'text-slate-500'
                    }`}>
                    {ach.unlocked ? 'Unlocked ✓' : 'Locked'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Simplified Portal Footer */}
      <footer className="pt-10 border-t border-border/50 text-center text-[10px] text-text-muted space-y-2">
        <p>© {new Date().getFullYear()} LearnGen Student Environment. Designed for high fidelity and one-handed layouts.</p>
        <p className="font-semibold text-primary-400">Streak Active • Live classrooms Connected • Doubt Solver Online</p>
      </footer>

    </div>
  );
};

// Helper utilities
const getInitials = (name) => {
  if (!name) return 'S';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export default StudentDashboard;
