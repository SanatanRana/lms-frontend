import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../context/AuthContext';

const Home = () => {
  const { user } = useContext(AuthContext);
  const [courses, setCourses] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [loading, setLoading] = useState(true);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/courses/all');
      setCourses(response.data.data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchCourses();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      fetchCourses();
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`/courses/search?keyword=${searchQuery}`);
      setCourses(response.data.data);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterByCategory = async (category) => {
    setCategoryFilter(category);
    if (category === 'All') {
      fetchCourses();
      return;
    }
    setLoading(true);
    try {
      const response = await api.get(`/courses/category/${category}`);
      setCourses(response.data.data);
    } catch (error) {
      console.error("Category filter failed:", error);
      const allResp = await api.get('/courses/all');
      const localFiltered = (allResp.data.data || []).filter(c => c.category === category);
      setCourses(localFiltered);
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    { name: 'All', icon: '🔥' },
    { name: 'Engineering', icon: '⚙️' },
    { name: 'Business', icon: '💼' },
    { name: 'Design', icon: '🎨' },
    { name: 'Marketing', icon: '📈' },
    { name: 'Science', icon: '🔬' }
  ];

  if (user) {
    return (
      <div className="min-h-screen pb-16">
        {/* Compact Portal View Header */}
        <div className="pt-6 pb-2 px-4 md:px-6 max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">Explore Courses</h1>
          <p className="text-slate-400 text-xs mt-1">Discover premium courses, lessons, and classrooms to expand your syllabus.</p>
        </div>

        {/* Search Bar */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto mt-4 mb-6">
          <form onSubmit={handleSearch} className="flex items-center bg-surface-800 border border-surface-600 rounded-2xl p-1.5 shadow-xl shadow-black/20">
            <svg className="w-5 h-5 text-slate-500 ml-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="What do you want to learn today?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-3 py-2.5 text-white placeholder-slate-500 text-sm focus:outline-none"
            />
            <button 
              type="submit"
              className="bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white px-6 py-2.5 rounded-xl text-sm font-semibold transition"
            >
              Search
            </button>
          </form>
        </div>

        {/* Category Filters */}
        <div className="px-4 md:px-6 max-w-7xl mx-auto flex flex-wrap gap-2 mb-6">
          {categories.map(cat => (
            <button
              key={cat.name}
              onClick={() => filterByCategory(cat.name)}
              className={`px-4 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
                categoryFilter === cat.name 
                  ? 'bg-primary-600/15 border-primary-600 text-primary-400 shadow-md shadow-primary-600/10' 
                  : 'bg-surface-800 border-surface-600 text-slate-400 hover:border-surface-500 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Courses Grid */}
        <section className="px-4 md:px-6 max-w-7xl mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(n => (
                <div key={n} className="bg-surface-800 border border-surface-600 rounded-2xl overflow-hidden">
                  <div className="h-44 skeleton animate-pulse rounded-2xl bg-slate-700 mb-4"></div>
                  <div className="p-5 space-y-3">
                    <div className="h-4 skeleton rounded w-1/3"></div>
                    <div className="h-5 skeleton rounded w-3/4"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-16 bg-card border border-border rounded-3xl max-w-lg mx-auto p-8 shadow-xl">
              <div className="w-16 h-16 bg-slate-900 border border-border rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5">
                🔍
              </div>
              <h3 className="text-white font-extrabold text-base mb-2">No matching courses</h3>
              <p className="text-slate-500 text-xs mb-6 max-w-sm mx-auto leading-relaxed">
                We couldn't find any courses matching your search criteria.
              </p>
              <button 
                onClick={() => { setSearchQuery(''); setCategoryFilter('All'); fetchCourses(); }} 
                className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition cursor-pointer"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {courses.map(course => (
                <Link 
                  to={`/course/${course.id}`} 
                  key={course.id}
                  className="group bg-surface-800 border border-surface-600 hover:border-primary-600/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary-600/5 transition duration-300 flex flex-col card-hover"
                >
                  <div className="h-44 bg-surface-900 relative overflow-hidden">
                    <img 
                      src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} 
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 to-transparent"></div>
                    <span className="absolute top-3 left-3 glass px-3 py-1 rounded-lg text-[10px] font-extrabold text-primary-400 uppercase tracking-widest">
                      {course.category || "General"}
                    </span>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-white font-bold text-base group-hover:text-primary-400 transition leading-snug mb-2 line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-slate-400 text-[11px] line-clamp-2 leading-relaxed mb-4">
                        {course.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-4 border-t border-surface-600">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider font-semibold">Price</span>
                        <div className="flex items-center space-x-1.5">
                          <span className="text-white font-extrabold text-sm">
                            {(course.discountPrice || course.price) === 0 ? 'Free' : `₹${course.discountPrice || course.price}`}
                          </span>
                        </div>
                      </div>
                      <span className="text-xs font-bold text-primary-400 group-hover:translate-x-1 transition flex items-center space-x-1">
                        <span>View Details</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* ═══════════════════ HERO SECTION ═══════════════════ */}
      <section className="relative py-20 md:py-28 px-6 overflow-hidden text-center max-w-6xl mx-auto">
        {/* Decorative blobs */}
        <div className="absolute top-10 left-1/4 w-72 h-72 bg-primary-600/8 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-10 right-1/4 w-64 h-64 bg-accent-500/6 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        <div className="absolute top-1/2 left-10 w-3 h-3 bg-primary-400 rounded-full animate-glow-pulse"></div>
        <div className="absolute top-1/3 right-16 w-2 h-2 bg-accent-400 rounded-full animate-glow-pulse" style={{ animationDelay: '1s' }}></div>

        <div className="relative animate-fade-in">
          <span className="inline-block bg-primary-600/10 border border-primary-600/20 text-primary-400 text-xs font-bold px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            India's Premium Learning Platform
          </span>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            Learn without limits.
            <br />
            <span className="gradient-text">
              Empower your future.
            </span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Access premium courses by industry experts, join interactive live classes, 
            and leverage AI-powered doubt solving — all in one platform.
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto flex items-center bg-surface-800 border border-surface-600 rounded-2xl p-1.5 shadow-xl shadow-black/20 mb-6">
            <svg className="w-5 h-5 text-slate-500 ml-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="What do you want to learn today?" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent px-3 py-3 text-white placeholder-slate-500 text-sm focus:outline-none"
            />
            <button 
              type="submit"
              className="bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white px-6 py-3 rounded-xl text-sm font-semibold transition shadow-lg shadow-primary-600/20"
            >
              Search
            </button>
          </form>

          {/* Category Filters */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => filterByCategory(cat.name)}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
                  categoryFilter === cat.name 
                    ? 'bg-primary-600/15 border-primary-600 text-primary-400 shadow-md shadow-primary-600/10' 
                    : 'bg-surface-800 border-surface-600 text-slate-400 hover:border-surface-500 hover:text-white'
                }`}
              >
                <span>{cat.icon}</span>
                <span>{cat.name}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ STATS BAR ═══════════════════ */}
      <section className="max-w-5xl mx-auto px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { number: '10,000+', label: 'Active Students', icon: '👥' },
            { number: '500+', label: 'Premium Courses', icon: '📚' },
            { number: '50+', label: 'Expert Instructors', icon: '🎓' },
            { number: '95%', label: 'Satisfaction Rate', icon: '⭐' }
          ].map((stat, idx) => (
            <div key={idx} className="glass rounded-2xl p-5 text-center card-hover">
              <span className="text-2xl mb-2 block">{stat.icon}</span>
              <span className="text-xl md:text-2xl font-extrabold text-white block">{stat.number}</span>
              <span className="text-xs text-slate-400 font-medium">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════ COURSES GRID ═══════════════════ */}
      <section className="px-6 py-8 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <span className="w-1.5 h-7 rounded-full bg-gradient-to-b from-primary-500 to-teal-400"></span>
            <span>Explore Premium Courses</span>
          </h2>
          <span className="text-sm text-slate-400 font-medium">{courses.length} courses</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[1, 2, 3, 4, 5, 6].map(n => (
              <div key={n} className="bg-surface-800 border border-surface-600 rounded-2xl overflow-hidden">
                <div className="h-44 skeleton"></div>
                <div className="p-5 space-y-3">
                  <div className="h-4 skeleton rounded w-1/3"></div>
                  <div className="h-5 skeleton rounded w-3/4"></div>
                  <div className="h-3 skeleton rounded w-full"></div>
                  <div className="h-3 skeleton rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-3xl max-w-lg mx-auto p-8 shadow-xl">
            <div className="w-16 h-16 bg-slate-900 border border-border rounded-2xl flex items-center justify-center text-2xl mx-auto mb-5">
              🔍
            </div>
            <h3 className="text-white font-extrabold text-base mb-2">No matching courses</h3>
            <p className="text-slate-500 text-xs mb-6 max-w-sm mx-auto leading-relaxed">
              We couldn't find any courses matching your search criteria. Try removing search keywords or selecting another category filter.
            </p>
            <button 
              onClick={() => { setSearchQuery(''); setCategoryFilter('All'); fetchCourses(); }} 
              className="bg-primary hover:bg-primary-light text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase transition duration-200 cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-4 gap-6 snap-x snap-mandatory flex-nowrap md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:overflow-x-visible md:pb-0 scrollbar-none">
            {courses.map(course => (
              <Link 
                to={`/course/${course.id}`} 
                key={course.id}
                className="group bg-surface-800 border border-surface-600 hover:border-primary-600/40 rounded-2xl overflow-hidden shadow-lg hover:shadow-primary-600/5 transition duration-300 flex flex-col card-hover w-[290px] shrink-0 snap-start md:w-auto md:shrink"
              >
                {/* Thumbnail */}
                <div className="h-44 bg-surface-900 relative overflow-hidden">
                  <img 
                    src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} 
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-900/60 to-transparent"></div>
                  <span className="absolute top-3 left-3 glass px-3 py-1 rounded-lg text-[10px] font-extrabold text-primary-400 uppercase tracking-widest">
                    {course.category || "General"}
                  </span>
                </div>

                {/* Content */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="text-white font-bold text-lg group-hover:text-primary-400 transition leading-snug mb-2 line-clamp-2">
                      {course.title}
                    </h3>
                    <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                      {course.description}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-surface-600">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Price</span>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-white font-extrabold text-base">
                          {(course.discountPrice || course.price) === 0 ? 'Free' : `₹${course.discountPrice || course.price}`}
                        </span>
                        {course.discountPrice && course.discountPrice !== course.price && (
                          <span className="text-slate-500 line-through text-xs">
                            ₹{course.price}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-primary-400 group-hover:translate-x-1 transition flex items-center space-x-1">
                      <span>View Course</span>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
                      </svg>
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ═══════════════════ WHY CHOOSE US ═══════════════════ */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
            Why students love <span className="gradient-text">AuraLMS</span>
          </h2>
          <p className="text-slate-400 text-base max-w-xl mx-auto">
            Everything you need for a world-class learning experience, all in one platform.
          </p>
        </div>

        <div className="flex overflow-x-auto pb-4 gap-6 snap-x snap-mandatory flex-nowrap md:grid md:grid-cols-3 md:overflow-x-visible md:pb-0 scrollbar-none">
          {[
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Interactive Live Classes',
              description: 'Join real-time sessions with expert instructors. Ask questions, participate in discussions, and learn collaboratively.',
              color: 'primary'
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              ),
              title: 'AI-Powered Doubt Solving',
              description: 'Get instant answers to your questions with our AI tutor. Available 24/7 to help you understand complex concepts.',
              color: 'accent'
            },
            {
              icon: (
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              ),
              title: 'Assignments & Tracking',
              description: 'Structured assignments with progress tracking help you stay on course and measure your learning outcomes.',
              color: 'success'
            }
          ].map((feature, idx) => {
            const colorMap = {
              primary: { bg: 'bg-primary-600/10', border: 'border-primary-600/20', text: 'text-primary-400' },
              accent: { bg: 'bg-accent-500/10', border: 'border-accent-500/20', text: 'text-accent-400' },
              success: { bg: 'bg-success/10', border: 'border-success/20', text: 'text-success' }
            };
            const c = colorMap[feature.color];
            
            return (
              <div key={idx} className="glass rounded-2xl p-7 card-hover group w-[290px] shrink-0 snap-start md:w-auto md:shrink">
                <div className={`w-14 h-14 rounded-xl ${c.bg} border ${c.border} ${c.text} flex items-center justify-center mb-5 group-hover:scale-110 transition`}>
                  {feature.icon}
                </div>
                <h3 className="text-white font-bold text-lg mb-3">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════ CTA SECTION ═══════════════════ */}
      <section className="px-6 py-16 max-w-4xl mx-auto mb-8">
        <div className="relative glass rounded-3xl p-10 md:p-14 text-center overflow-hidden">
          <div className="absolute top-0 left-0 w-40 h-40 bg-primary-600/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-40 h-40 bg-accent-500/10 rounded-full blur-3xl"></div>
          
          <div className="relative">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4">
              Ready to start learning?
            </h2>
            <p className="text-slate-400 text-base mb-8 max-w-lg mx-auto">
              Join thousands of students who are already building their future with AuraLMS. 
              Start your journey today — it's free to get started.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register" className="bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-xl shadow-primary-600/20 hover:shadow-primary-600/30 transition">
                Create Free Account
              </Link>
              <Link to="/courses" className="bg-surface-700 hover:bg-surface-600 text-slate-200 border border-surface-500 px-8 py-3.5 rounded-xl text-sm font-semibold transition">
                Browse Courses
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
