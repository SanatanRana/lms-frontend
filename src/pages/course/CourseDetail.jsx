import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';


const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [course, setCourse] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState({ type: '', msg: '' });
  const [discountPrice, setDiscountPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
  const showToast = (type, message) => {
    setToast({ show: true, message, type });
  };

  useEffect(() => {
    fetchCourseDetails();
    if (user) {
      checkEnrollment();
    }
  }, [id, user]);

  const fetchCourseDetails = async () => {
    try {
      const response = await api.get(`/courses/${id}`);
      setCourse(response.data.data);
    } catch (error) {
      console.error("Error fetching course:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const response = await api.get(`/enrollments/check/${id}`);
      setIsEnrolled(response.data.data);
    } catch (error) {
      console.error("Error checking enrollment status:", error);
    }
  };

  const handleApplyCoupon = () => {
    setCouponStatus({ type: '', msg: '' });
    if (!couponCode.trim()) return;

    // Simulate verification or just pass it to create-order
    if (couponCode.toUpperCase() === 'FIRST50') {
      const discounted = course.price * 0.5;
      setDiscountPrice(discounted);
      setCouponStatus({ type: 'success', msg: 'Coupon FIRST50 Applied! 50% discount.' });
    } else if (couponCode.toUpperCase() === 'WELCOME10') {
      const discounted = course.price * 0.9;
      setDiscountPrice(discounted);
      setCouponStatus({ type: 'success', msg: 'Coupon WELCOME10 Applied! 10% discount.' });
    } else {
      setCouponStatus({ type: 'error', msg: 'Invalid or expired coupon code' });
      setDiscountPrice(null);
    }
  };

  const handleLessonClick = (les) => {
    if (isEnrolled || user?.role === 'ADMIN') {
      navigate(`/course/${id}/learn`, { state: { initialLessonId: les.id } });
    } else {
      showToast('error', 'Please enroll in this course to watch the lectures!');
    }
  };

  const handleEnrollOrBuy = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    setPurchasing(true);
    try {
      const coursePrice = discountPrice !== null ? discountPrice : (course.discountPrice || course.price);

      if (coursePrice === 0 || !coursePrice) {
        // FREE course enrollment flow
        const response = await api.post(`/enrollments/enroll/${id}`);
        if (response.data.success) {
          navigate(`/course/${id}/learn`);
        } else {
          alert("Enrollment failed: " + response.data.message);
        }
      } else {
        // PAID course payment flow
        // 1. Create payment order
        const orderResponse = await api.post('/payments/create-order', {
          courseId: parseInt(id),
          couponCode: couponStatus.type === 'success' ? couponCode : null
        });

        const orderData = orderResponse.data.data; // orderId, amount, gateway, paymentId
        
        // 2. Simulate payment gateway verification
        // Generate mock transaction ID
        const mockTxnId = "TXN_" + Math.random().toString(36).substring(2, 10).toUpperCase();

        const verifyResponse = await api.post('/payments/verify', {
          orderId: orderData.orderId,
          transactionId: mockTxnId,
          gatewayData: {
            status: "SUCCESS",
            mode: "MOCK"
          }
        });

        if (verifyResponse.data.success) {
          navigate(`/course/${id}/learn`);
        } else {
          alert("Payment verification failed");
        }
      }
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.message || error.response?.data || "Transaction failed. Please try again.");
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading course details..." />;
  }


  if (!course) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
        <p className="text-slate-400 mb-6">The course you are looking for does not exist or has been removed.</p>
        <Link to="/" className="bg-surface-700 text-slate-200 border border-surface-500 px-6 py-2.5 rounded-xl text-sm font-semibold transition hover:bg-surface-600">
          Back to Catalog
        </Link>
      </div>
    );
  }

  const finalPrice = discountPrice !== null ? discountPrice : (course.discountPrice || course.price);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in pb-32 relative">
      
      {/* Toast popup */}
      {toast.show && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      {/* Back button */}
      <Link to="/" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white mb-8 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to course listing</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <span className="bg-primary-600/10 border border-primary-600/20 text-primary-400 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
              {course.category || "General"}
            </span>
            <h1 className="text-3xl md:text-5xl font-black text-white mt-4 mb-6 leading-tight">
              {course.title}
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-relaxed whitespace-pre-wrap">
              {course.description}
            </p>
          </div>

          {/* Curriculum Section */}
          <section className="space-y-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-base font-extrabold text-white">Course Curriculum</h3>
              <span className="text-[10px] text-slate-400 font-bold">{totalLessons} Video Lectures</span>
            </div>

            <div className="space-y-2.5">
              {sections.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4">No sections added to curriculum outline yet.</p>
              ) : (
                sections.map((sec, sIdx) => {
                  const isExpanded = expandedSection === sIdx;
                  return (
                    <div 
                      key={sec.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden transition"
                    >
                      <button
                        onClick={() => setExpandedSection(isExpanded ? null : sIdx)}
                        className="w-full text-left p-4 flex justify-between items-center bg-background/40 hover:bg-background/80 transition"
                      >
                        <div className="min-w-0 pr-4">
                          <span className="text-[9px] text-primary-400 font-extrabold uppercase tracking-widest block mb-0.5">
                            Chapter {sIdx + 1}
                          </span>
                          <h4 className="text-white font-bold text-sm truncate">{sec.title}</h4>
                        </div>
                        <svg className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-border p-4 bg-card-light/10 divide-y divide-border/40">
                          {(sec.lessons || []).length === 0 ? (
                            <p className="text-xs text-slate-500 italic py-2">No video lectures in this chapter.</p>
                          ) : (
                            (sec.lessons || []).map((les, lIdx) => (
                              <div 
                                key={les.id} 
                                onClick={() => handleLessonClick(les)}
                                className="py-2.5 px-3 first:pt-0 last:pb-0 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-700/20 rounded-xl transition cursor-pointer group"
                              >
                                <div className="flex items-center space-x-2.5 min-w-0 pr-4">
                                  <span className="text-slate-600 group-hover:text-teal-400 transition">📹</span>
                                  <span className="truncate font-medium text-slate-300 group-hover:text-white transition">
                                    {sIdx + 1}.{lIdx + 1} {les.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 group-hover:text-teal-400 group-hover:bg-teal-500/10 group-hover:border-teal-500/20 shrink-0 font-bold bg-background/60 px-2.5 py-1 rounded-lg border border-border transition">
                                  Play Lecture ▶
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Instructor Bio Panel */}
          <section className="bg-card border border-border p-6 rounded-3xl space-y-4">
            <h3 className="text-base font-extrabold text-white">Your Instructor</h3>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-indigo-500 flex items-center justify-center font-black text-white text-base shadow-lg shrink-0">
                {course.teacherName ? course.teacherName.substring(0, 2).toUpperCase() : 'TR'}
              </div>
              <div className="min-w-0">
                <h4 className="text-white font-extrabold text-sm">{course.teacherName || 'Professional Educator'}</h4>
                <p className="text-[10px] text-primary-400 font-bold uppercase tracking-wider">AuraLMS Certified Expert</p>
                <p className="text-xs text-text-muted mt-2 leading-relaxed">
                  Passionate industry professional dedicated to teaching students global standards. 10+ years of software design and teaching experience.
                </p>
              </div>
            </div>
          </section>
        </div>

        {/* Purchase Card */}
        <div className="bg-surface-800 border border-surface-600 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          {/* Glowing dot */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl"></div>

          <div className="relative">
            <img 
              src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} 
              alt={course.title}
              className="w-full h-40 object-cover rounded-xl border border-surface-600 mb-6"
            />

            <div className="mb-6">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Total Price</span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl font-black text-white">
                  ₹{finalPrice}
                </span>
                {course.discountPrice && discountPrice === null && (
                  <span className="text-slate-500 line-through text-sm">
                    ₹{course.price}
                  </span>
                )}
              </div>
            </div>

            {isEnrolled || user?.role === 'ADMIN' ? (
              <Link 
                to={`/course/${id}/learn`}
                className="w-full block text-center bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition"
              >
                Go to Learning Viewer
              </Link>
            ) : (
              <div className="space-y-4">
                {/* Coupon application (only if paid) */}
                {course.price > 0 && (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="Coupon Code (e.g. FIRST50)" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-surface-900/50 text-white border border-surface-600 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-primary-600 transition"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-surface-700 border border-surface-500 text-slate-200 hover:bg-surface-600 px-4 py-2 rounded-xl text-xs font-bold transition"
                      >
                        Apply
                      </button>
                    </div>
                    {couponStatus.msg && (
                      <p className={`text-[10px] ${couponStatus.type === 'success' ? 'text-success' : 'text-rose-400'}`}>
                        {couponStatus.msg}
                      </p>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleEnrollOrBuy}
                  disabled={purchasing}
                  className="w-full bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/10 hover:shadow-primary-600/25 transition flex items-center justify-center space-x-2"
                >
                  {purchasing ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span>{finalPrice === 0 ? 'Enroll Now (Free)' : 'Enroll & Pay'}</span>
                  )}
                </button>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-surface-600 space-y-3">
              <div className="flex items-center space-x-2.5 text-xs text-slate-400">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Full lifetime access to contents</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-400">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Self-paced learning structure</span>
              </div>
              <div className="flex items-center space-x-2.5 text-xs text-slate-400">
                <svg className="w-4 h-4 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Mock payment system support</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════ RELATED COURSES ══════════════════ */}
      {relatedCourses.length > 0 && (
        <section className="space-y-6 pt-12 border-t border-border/60 mt-12">
          <div>
            <h3 className="text-base font-extrabold text-white">Related Courses you may like</h3>
            <p className="text-xs text-text-muted mt-0.5">Explore matching topics in the same category.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {relatedCourses.map(rel => (
              <Link 
                to={`/course/${rel.id}`}
                key={rel.id}
                className="bg-card border border-border p-4.5 rounded-2xl shadow flex items-center space-x-3.5 hover:border-slate-700/50 transition card-hover"
              >
                <img 
                  src={rel.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} 
                  alt={rel.title}
                  className="w-14 h-14 object-cover rounded-xl border border-border shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-white font-bold text-xs truncate">{rel.title}</h4>
                  <p className="text-slate-500 text-[10px] truncate">{rel.category || 'General'}</p>
                  <span className="text-[10px] font-black text-white block mt-1">
                    {(rel.discountPrice || rel.price) === 0 ? 'Free' : `₹${rel.discountPrice || rel.price}`}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Mobile Sticky Bottom Action Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-surface-800 border-t border-border p-4.5 z-30 flex items-center justify-between shadow-2xl">
        <div className="space-y-0.5">
          <span className="text-[9px] text-slate-500 uppercase tracking-wider font-extrabold block">Enrollment Price</span>
          <span className="text-base font-black text-white">₹{finalPrice}</span>
        </div>
        <div className="w-1/2">
          {isEnrolled || user?.role === 'ADMIN' ? (
            <Link
              to={`/course/${id}/learn`}
              className="w-full block text-center bg-gradient-to-r from-teal-500 to-primary-600 hover:from-teal-400 hover:to-primary-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs shadow-lg transition select-none cursor-pointer"
            >
              Start Learning 🚀
            </Link>
          ) : (
            <button
              onClick={handleEnrollOrBuy}
              disabled={purchasing}
              className="w-full bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-black py-2.5 px-4 rounded-xl text-xs shadow-lg transition flex items-center justify-center space-x-1 cursor-pointer"
            >
              {purchasing ? (
                <span className="w-4 h-4 border-2 border-t-transparent border-white rounded-full animate-spin"></span>
              ) : (
                <span>{finalPrice === 0 ? 'Enroll Free' : 'Buy Now'}</span>
              )}
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export default CourseDetail;
