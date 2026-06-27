import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';

const StudentDashboard = () => {
  const { user } = useContext(AuthContext);
  const [enrollments, setEnrollments] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const enrolledResponse = await api.get('/enrollments/my-courses');
      const enrolledData = enrolledResponse.data.data;
      setEnrollments(enrolledData);

      const allResponse = await api.get('/courses/all');
      const allCourses = allResponse.data.data;
      const enrolledIds = enrolledData.map(e => e.course.id);
      const filteredRecommendations = allCourses.filter(c => !enrolledIds.includes(c.id));
      setRecommendations(filteredRecommendations.slice(0, 3));

      // Fetch live sessions
      const liveResponse = await api.get('/live/enrolled');
      setLiveSessions(liveResponse.data.data || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLive = async (sessionId, meetingLink) => {
    try {
      await api.post(`/live/${sessionId}/join`);
      window.open(meetingLink, '_blank');
    } catch (error) {
      console.error("Failed to join live session:", error);
    }
  };

  if (loading) return <LoadingSpinner text="Loading your dashboard..." />;

  const completedCourses = enrollments.filter(e => e.progressPercent >= 100).length;
  const avgProgress = enrollments.length > 0
    ? Math.round(enrollments.reduce((sum, e) => sum + (e.progressPercent || 0), 0) / enrollments.length)
    : 0;

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 py-6 animate-fade-in">
      {/* Welcome Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary-900/40 via-teal-900/30 to-surface-800 border border-surface-600 p-8 md:p-10 shadow-lg">
        <div className="absolute top-0 right-0 w-40 h-40 bg-primary-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent-500/8 rounded-full blur-3xl"></div>
        
        <div className="relative">
          <span className="text-xs font-bold text-primary-400 uppercase tracking-widest">Student Portal</span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-white mt-1 mb-2">
            {getGreeting()}, {user?.name ? user.name.split(' ')[0] : 'Student'}! 👋
          </h2>
          <p className="text-slate-300 text-sm md:text-base max-w-xl">
            Track your learning progress, resume courses, or explore new topics.
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Enrolled Courses', value: enrollments.length, icon: '📚', color: 'primary' },
          { label: 'Completed', value: completedCourses, icon: '✅', color: 'success' },
          { label: 'Average Progress', value: `${avgProgress}%`, icon: '📊', color: 'accent' },
          { label: 'In Progress', value: enrollments.length - completedCourses, icon: '🔄', color: 'info' }
        ].map((stat, idx) => (
          <div key={idx} className="glass rounded-2xl p-5 card-hover">
            <span className="text-2xl mb-2 block">{stat.icon}</span>
            <span className="text-2xl font-extrabold text-white block">{stat.value}</span>
            <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Live & Upcoming Classes */}
      {liveSessions.length > 0 && (
        <section className="animate-fade-in">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-rose-500 to-red-400"></span>
            <span>📅 Live & Upcoming Classrooms</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {liveSessions.map(session => (
              <div 
                key={session.id} 
                className={`glass border rounded-3xl p-5 shadow flex flex-col justify-between transition-all duration-300 card-hover ${
                  session.status === 'LIVE' 
                    ? 'border-error/30 bg-error/5 hover:border-error/50' 
                    : 'border-surface-600/60 hover:border-slate-700/60'
                }`}
              >
                <div className="flex justify-between items-start gap-4">
                  <div>
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block mb-1">
                      {session.course?.title || "Course Session"}
                    </span>
                    <h4 className="text-white font-bold text-base mb-1.5 flex items-center gap-2">
                      <span>{session.title}</span>
                      <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                        session.status === 'LIVE' 
                          ? 'bg-error/15 text-error border border-error/20 animate-pulse' 
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {session.status}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Scheduled: {new Date(session.startTime).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-2xl">{session.status === 'LIVE' ? '🔴' : '📅'}</span>
                </div>

                <div className="mt-5 pt-4 border-t border-surface-600/40 flex justify-between items-center gap-4">
                  <span className="text-[10px] text-slate-500 font-semibold font-mono">
                    Instructor: {session.teacher?.name || "Expert Teacher"}
                  </span>
                  
                  <button
                    onClick={() => handleJoinLive(session.id, session.meetingLink)}
                    className={`text-xs font-bold px-5 py-2 rounded-xl transition cursor-pointer shadow ${
                      session.status === 'LIVE' 
                        ? 'bg-error hover:bg-error/95 text-white animate-pulse shadow-error/15' 
                        : 'bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500'
                    }`}
                  >
                    {session.status === 'LIVE' ? 'Join Live Now' : 'Enter Lobby'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Enrolled Courses */}
      <section>
        <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
          <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
          <span>My Enrolled Courses ({enrollments.length})</span>
        </h3>

        {enrollments.length === 0 ? (
          <div className="text-center py-14 glass rounded-2xl">
            <div className="text-5xl mb-4">📖</div>
            <p className="text-slate-300 font-semibold mb-2 text-lg">You haven't enrolled in any courses yet</p>
            <p className="text-slate-500 text-sm mb-6">Explore our catalog and start your learning journey today!</p>
            <Link to="/" className="inline-block bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition">
              Explore Courses
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {enrollments.map(enroll => (
              <div 
                key={enroll.id}
                className="glass rounded-2xl p-5 shadow card-hover flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-extrabold text-primary-400 bg-primary-600/10 px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                      {enroll.course.category || "General"}
                    </span>
                    <span className="text-[11px] text-slate-500 font-semibold">
                      Enrolled: {new Date(enroll.enrolledAt).toLocaleDateString()}
                    </span>
                  </div>
                  <h4 className="text-white font-bold text-lg mb-2 line-clamp-1">{enroll.course.title}</h4>
                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">{enroll.course.description}</p>
                </div>

                <div className="space-y-4 pt-4 border-t border-surface-600">
                  <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-400 mb-1.5">
                      <span>Progress</span>
                      <span className={`${enroll.progressPercent >= 100 ? 'text-success' : 'text-primary-400'}`}>
                        {enroll.progressPercent}%
                      </span>
                    </div>
                    <div className="w-full bg-surface-700 h-2 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
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
                    className="w-full block text-center bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 py-2.5 px-4 rounded-xl text-xs font-bold transition"
                  >
                    {enroll.progressPercent >= 100 ? '✅ Review Course' : '▶ Resume Learning'}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Recommended Courses */}
      {recommendations.length > 0 && (
        <section>
          <h3 className="text-xl font-bold text-white mb-6 flex items-center space-x-2">
            <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-accent-500 to-amber-400"></span>
            <span>Recommended for You</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map(course => (
              <Link 
                to={`/course/${course.id}`} 
                key={course.id}
                className="group glass hover:border-primary-600/40 rounded-2xl overflow-hidden shadow transition flex flex-col justify-between card-hover"
              >
                <div className="h-36 bg-surface-900 relative overflow-hidden">
                  <img 
                    src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 to-transparent"></div>
                  <span className="absolute top-2.5 left-2.5 glass px-2 py-0.5 rounded-md text-[9px] font-extrabold text-primary-400 uppercase tracking-widest">
                    {course.category || "General"}
                  </span>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <h4 className="text-white font-bold text-sm mb-2 group-hover:text-primary-400 transition line-clamp-1">{course.title}</h4>
                  <p className="text-slate-400 text-[11px] line-clamp-2 mb-4 leading-relaxed">{course.description}</p>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-surface-600">
                    <span className="text-white font-extrabold text-xs">
                      {(course.discountPrice || course.price) === 0 ? 'Free' : `₹${course.discountPrice || course.price}`}
                    </span>
                    <span className="text-[10px] text-primary-400 font-bold group-hover:translate-x-0.5 transition flex items-center space-x-0.5">
                      <span>Enroll</span>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default StudentDashboard;
