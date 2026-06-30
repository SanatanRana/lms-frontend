import { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import Avatar from '../../components/common/Avatar';
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

  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Streak & Gamification State
  const [streak, setStreak] = useState(1);
  const [streakUpdated, setStreakUpdated] = useState(false);

  // Hardcoded Top Teachers
  const teachers = [
    { name: 'Dr. Angela Yu', role: 'Lead Web Instructor', courses: 14, rating: '4.9', avatar: 'Angela Yu', bg: 'from-purple-500 to-indigo-500' },
    { name: 'Colt Steele', role: 'JavaScript Expert', courses: 9, rating: '4.8', avatar: 'Colt Steele', bg: 'from-rose-500 to-red-500' },
    { name: 'Maximilian Schwarzmüller', role: 'React Core Developer', courses: 18, rating: '4.9', avatar: 'Maximilian S', bg: 'from-emerald-500 to-teal-500' },
    { name: 'Jonas Schmedtmann', role: 'CSS & Design Specialist', courses: 6, rating: '4.9', avatar: 'Jonas S', bg: 'from-amber-500 to-orange-500' }
  ];

  // Hardcoded Testimonials
  const testimonials = [
    { text: "LearnGen completely changed how I learn programming. The AI doubt assistant is like having a private tutor 24/7!", author: "Rohan Gupta", role: "Web Dev Student", rating: 5 },
    { text: "The live classes feel so personal and lag-free. Being able to interact directly with instructors in real-time is amazing.", author: "Neha Sharma", role: "Data Science Student", rating: 5 },
    { text: "Earned my React Certificate last week and just landed my first internship! Highly recommend this premium platform.", author: "Aman Verma", role: "Frontend Intern", rating: 5 }
  ];

  // Fetch Dashboard Data
  const fetchDashboardData = async () => {
    try {
      const enrolledResponse = await api.get('/enrollments/my-courses');
      const enrolledData = enrolledResponse.data.data;
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
      const { roomToken } = joinResp.data.data;
      navigate(`/live/classroom/${roomToken}`, {
        state: {
          sessionId: session.id,
          micEnabled: true,
          camEnabled: true,
          role: 'STUDENT',
          name: user?.name || 'Student',
          title: session.title,
          courseName: session.course?.title || 'Live Classroom',
          teacherName: session.teacher?.name || 'Instructor'
        }
      });
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

  const filteredCatalog = allCourses.filter(c => {
    const isNotEnrolled = !enrollments.some(e => e.course.id === c.id);
    if (!isNotEnrolled) return false;
    if (selectedCategory === 'ALL') return true;
    return c.category === selectedCategory;
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
            className={`pb-3 text-xs font-bold border-b-2 transition relative flex items-center space-x-1.5 cursor-pointer ${
              activeTab === tab.id 
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
            {/* Welcome Banner */}
            <div className="bg-card border border-border rounded-3xl p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/5 rounded-full blur-2xl"></div>
              <div>
                <span className="text-[10px] text-primary font-extrabold uppercase tracking-wider">Welcome Back</span>
                <h2 className="text-2xl font-black text-white mt-1">Hello, {user?.name || 'Learner'}! 👋</h2>
                <p className="text-xs text-text-muted mt-1 leading-normal max-w-md">
                  Let's keep learning today. You have completed {avgProgress}% of your syllabus.
                </p>
              </div>
              <div className="flex items-center space-x-4 bg-background/60 border border-border p-3.5 rounded-2xl w-full lg:w-auto relative shrink-0">
                <div className="relative flex items-center justify-center w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <span className="text-2xl">🔥</span>
                  {streakUpdated && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping"></span>
                  )}
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">Learning Streak</span>
                  <span className="text-lg font-black text-white">{streak} Days active</span>
                  <span className="text-[9px] text-teal-400 block mt-0.5 font-semibold">Keep it up! Log in daily.</span>
                </div>
              </div>
            </div>

            {/* Resume Last Active HUD */}
            {lastActiveCourse && (
              <div className="bg-gradient-to-r from-teal-900/10 to-indigo-900/10 border border-border rounded-3xl p-6 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-56 h-full bg-gradient-to-l from-primary-600/5 to-transparent"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative">
                  <div className="space-y-3 flex-grow">
                    <span className="text-[10px] bg-teal-500/10 border border-teal-500/20 text-teal-400 font-black px-2.5 py-0.5 rounded uppercase tracking-wider">
                      Resume Course
                    </span>
                    <h3 className="text-lg md:text-xl font-extrabold text-white leading-snug">{lastActiveCourse.course.title}</h3>
                    <p className="text-xs text-text-muted line-clamp-1">{lastActiveCourse.course.description}</p>
                    <div className="max-w-md">
                      <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-400 mb-1">
                        <span>Current Progress</span>
                        <span className="text-teal-400">{lastActiveCourse.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-surface-700 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-gradient-to-r from-teal-500 to-primary-600 h-full rounded-full" style={{ width: `${lastActiveCourse.progressPercent}%` }}></div>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      localStorage.setItem(`${userPrefix}_last_active_course_id`, lastActiveCourse.course.id.toString());
                      navigate(`/course/${lastActiveCourse.course.id}/learn`);
                    }}
                    className="bg-gradient-to-r from-teal-500 to-primary-600 hover:from-teal-400 hover:to-primary-500 text-white font-extrabold px-6 py-3.5 rounded-xl shadow-lg shadow-teal-500/10 w-full md:w-auto text-center transition select-none cursor-pointer hover:scale-102"
                  >
                    Resume Lesson 🚀
                  </button>
                </div>
              </div>
            )}

            {/* Today's Schedule (Live Classrooms) */}
            {liveSessions.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-base font-extrabold text-white flex items-center space-x-2">
                  <span className="w-1.5 h-4 rounded bg-gradient-to-b from-rose-500 to-red-400"></span>
                  <span>Today's Classroom Schedule</span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {liveSessions.map(session => {
                    const isLive = session.status === 'LIVE';
                    return (
                      <div 
                        key={session.id} 
                        className={`border rounded-2xl p-4 flex flex-col justify-between transition-all bg-card/45 duration-300 relative overflow-hidden ${
                          isLive ? 'border-error/35 bg-error/5' : 'border-border'
                        }`}
                      >
                        {isLive && (
                          <div className="absolute top-0 right-0 bg-error text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl animate-pulse">
                            Live Now
                          </div>
                        )}
                        <div className="space-y-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                            {session.course?.title || 'Live Classroom'}
                          </span>
                          <h4 className="text-white font-bold text-sm leading-snug">{session.title}</h4>
                          <div className="flex items-center space-x-1.5 text-text-muted text-[10px] mt-1.5">
                            <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>
                              {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-black text-white text-[9px]">
                              {getInitials(session.teacher?.name || 'TR')}
                            </div>
                            <span className="text-[10px] text-slate-300 font-medium">{session.teacher?.name || 'Instructor'}</span>
                          </div>
                          <button
                            onClick={() => handleJoinLive(session.id, session)}
                            className={`text-[10px] font-black px-4 py-2 rounded-xl transition ${
                              isLive 
                                ? 'bg-error hover:bg-error/95 text-white shadow shadow-error/15' 
                                : 'bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500'
                            }`}
                          >
                            {isLive ? 'Join Lecture' : 'Enter Lobby'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
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
                  className={`px-4 py-1.5 rounded-xl text-[10px] font-bold transition whitespace-nowrap select-none cursor-pointer border ${
                    selectedCategory === cat
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
                              className={`h-full rounded-full transition-all duration-300 ${
                                enroll.progressPercent >= 100 
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
        {activeTab === 'live' && (
          <div>
            {liveSessions.length === 0 ? (
              <div className="text-center py-16 bg-card border border-border rounded-2xl">
                <span className="text-5xl">📹</span>
                <p className="text-white font-bold mt-4 text-sm">No Live Classes Scheduled Today</p>
                <p className="text-xs text-text-muted mt-1">Check back later for updates or announcements.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {liveSessions.map(session => {
                  const isLive = session.status === 'LIVE';
                  return (
                    <div 
                      key={session.id} 
                      className={`border rounded-2xl p-5 flex flex-col justify-between transition-all bg-card/45 duration-300 relative overflow-hidden ${
                        isLive ? 'border-error/35 bg-error/5' : 'border-border'
                      }`}
                    >
                      {isLive && (
                        <div className="absolute top-0 right-0 bg-error text-white text-[8px] font-black uppercase tracking-widest px-3 py-1 rounded-bl-xl animate-pulse">
                          Live Now
                        </div>
                      )}
                      <div className="space-y-1">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">
                          {session.course?.title || 'Live Classroom'}
                        </span>
                        <h4 className="text-white font-bold text-sm leading-snug">{session.title}</h4>
                        <div className="flex items-center space-x-1.5 text-text-muted text-[10px] mt-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>
                            {new Date(session.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(session.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center font-black text-white text-[9px]">
                            {getInitials(session.teacher?.name || 'TR')}
                          </div>
                          <span className="text-[10px] text-slate-300 font-medium">{session.teacher?.name || 'Instructor'}</span>
                        </div>
                        <button
                          onClick={() => handleJoinLive(session.id, session)}
                          className={`text-[10px] font-black px-4 py-2 rounded-xl transition ${
                            isLive 
                              ? 'bg-error hover:bg-error/95 text-white shadow shadow-error/15' 
                              : 'bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500'
                          }`}
                        >
                          {isLive ? 'Join Lecture' : 'Enter Lobby'}
                        </button>
                      </div>
                    </div>
                  );
                })}
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
                              <title>Certificate of Completion</title>
                              <style>
                                body { background: #0c1222; color: #fff; font-family: sans-serif; text-align: center; padding: 50px; }
                                .cert { border: 15px solid #111827; padding: 50px; background: #111827; max-width: 800px; margin: auto; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                                h1 { font-size: 40px; color: #3b82f6; margin-bottom: 5px; }
                                h3 { font-size: 20px; color: #94a3b8; font-weight: normal; margin-top: 0; }
                                .recipient { font-size: 28px; font-weight: bold; margin: 30px 0; border-bottom: 2px dashed #334155; display: inline-block; padding-bottom: 5px; }
                                .details { color: #94a3b8; font-size: 14px; margin-top: 40px; }
                              </style>
                            </head>
                            <body>
                              <div class="cert">
                                <h1>LearnGen</h1>
                                <h3>Certificate of Completion</h3>
                                <p>This is to certify that</p>
                                <div class="recipient">${user?.name || 'LearnGen Learner'}</div>
                                <p>has successfully completed the syllabus for course</p>
                                <h2>${enroll.course.title}</h2>
                                <p class="details">Date: ${new Date().toLocaleDateString()} | Verification Code: CERT_${enroll.id}</p>
                              </div>
                            </body>
                          </html>
                        `);
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
                className={`p-4.5 rounded-2xl border transition duration-300 flex items-center space-x-4 bg-card/65 ${
                  ach.unlocked 
                    ? 'border-teal-500/25 bg-teal-950/5' 
                    : 'border-border opacity-50 grayscale'
                }`}
              >
                <span className="text-3xl">{ach.icon}</span>
                <div>
                  <h4 className="text-white font-extrabold text-xs">{ach.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">{ach.desc}</p>
                  <span className={`text-[8px] font-black uppercase mt-1.5 block tracking-widest ${
                    ach.unlocked ? 'text-teal-400' : 'text-slate-500'
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
