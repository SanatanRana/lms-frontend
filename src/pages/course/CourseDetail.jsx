import { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Toast from '../../components/common/Toast';

const CourseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // Course & Purchase State
  const [course, setCourse] = useState(null);
  const [sections, setSections] = useState([]);
  const [relatedCourses, setRelatedCourses] = useState([]);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [couponStatus, setCouponStatus] = useState({ type: '', msg: '' });
  const [discountPrice, setDiscountPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [toast, setToast] = useState({ show: false, type: 'success', message: '' });

  // Interactive details state
  const [expandedSection, setExpandedSection] = useState(0); // Index of expanded section
  const [expandedFaq, setExpandedFaq] = useState(null);

  // Hardcoded FAQs
  const faqs = [
    { q: "Is there a certificate awarded upon completion?", a: "Yes, once you complete 100% of the syllabus materials and lectures, you can instantly download a verifiable completion certificate from your dashboard." },
    { q: "Do I get lifetime access to the course content?", a: "Absolutely! Once enrolled or purchased, you have lifetime, unlimited access to all lessons, resources, and live classroom lobby access." },
    { q: "What is the refund policy?", a: "We offer a 7-day money-back guarantee. If you are not satisfied with the syllabus quality, contact support@auralms.com for a full refund." },
    { q: "Can I ask questions or resolve doubts directly?", a: "Yes, every course includes an integrated Aura AI Doubt Assistant available 24/7. You can ask code doubts directly inside the learning viewer." }
  ];

  // Hardcoded reviews
  const reviews = [
    { author: "Suresh Patel", rating: 5, date: "3 days ago", comment: "Excellent course! The syllabus is structured perfectly. The explanation of advanced topics is crystal clear." },
    { author: "Anjali Rao", rating: 4, date: "1 week ago", comment: "Very detailed lectures. The instructor code examples are practical. Highly recommend to anyone starting web dev." },
    { author: "Vikram Singh", rating: 5, date: "2 weeks ago", comment: "Aura AI Doubt Solver was a game changer for me. Resolved all my syntax issues instantly while coding." }
  ];

  const fetchCourseData = async () => {
    try {
      // 1. Fetch Course details
      const response = await api.get(`/courses/${id}`);
      const courseData = response.data.data;
      setCourse(courseData);

      // 2. Fetch Syllabus Sections
      try {
        const sectionsResp = await api.get(`/courses/${id}/sections`);
        setSections(sectionsResp.data.data || []);
      } catch (err) {
        console.error("Failed to load sections, falling back to empty:", err);
      }

      // 3. Fetch Related Courses
      try {
        const allResp = await api.get('/courses/all');
        const filtered = (allResp.data.data || []).filter(c => c.id !== parseInt(id) && c.category === courseData.category);
        setRelatedCourses(filtered.slice(0, 3));
      } catch (err) {
        console.error("Failed to load related courses:", err);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    fetchCourseData();
    if (user) {
      checkEnrollment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const showToast = (type, message) => {
    setToast({ show: true, type, message });
    setTimeout(() => setToast({ show: false, type: 'success', message: '' }), 4000);
  };

  const handleApplyCoupon = () => {
    setCouponStatus({ type: '', msg: '' });
    if (!couponCode.trim()) return;

    if (couponCode.toUpperCase() === 'FIRST50') {
      const discounted = course.price * 0.5;
      setDiscountPrice(discounted);
      setCouponStatus({ type: 'success', msg: 'Coupon FIRST50 Applied! 50% discount.' });
      showToast('success', 'Coupon Applied successfully! 50% discount applied.');
    } else if (couponCode.toUpperCase() === 'WELCOME10') {
      const discounted = course.price * 0.9;
      setDiscountPrice(discounted);
      setCouponStatus({ type: 'success', msg: 'Coupon WELCOME10 Applied! 10% discount.' });
      showToast('success', 'Coupon Applied successfully! 10% discount applied.');
    } else {
      setCouponStatus({ type: 'error', msg: 'Invalid or expired coupon code' });
      setDiscountPrice(null);
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
        // FREE enrollment
        const response = await api.post(`/enrollments/enroll/${id}`);
        if (response.data.success) {
          showToast('success', 'Successfully Enrolled!');
          setTimeout(() => navigate(`/course/${id}/learn`), 1000);
        } else {
          showToast('error', "Enrollment failed: " + response.data.message);
        }
      } else {
        // PAID payment flow
        const orderResponse = await api.post('/payments/create-order', {
          courseId: parseInt(id),
          couponCode: couponStatus.type === 'success' ? couponCode : null
        });
        const orderData = orderResponse.data.data;
        const mockTxnId = "TXN_" + Math.random().toString(36).substring(2, 10).toUpperCase();

        const verifyResponse = await api.post('/payments/verify', {
          orderId: orderData.orderId,
          transactionId: mockTxnId,
          status: 'SUCCESS'
        });

        if (verifyResponse.data.success) {
          showToast('success', 'Payment Successful! Redirecting to learn portal...');
          setTimeout(() => navigate(`/course/${id}/learn`), 1500);
        } else {
          showToast('error', 'Payment verification failed.');
        }
      }
    } catch (error) {
      console.error("Purchase error:", error);
      showToast('error', error.response?.data?.message || 'Failed to complete transaction.');
    } finally {
      setPurchasing(false);
    }
  };

  if (loading) return <LoadingSpinner text="Analyzing syllabus details..." />;

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
  const totalLessons = sections.reduce((sum, s) => sum + (s.lessons?.length || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-fade-in pb-20 relative">
      
      {/* Toast popup */}
      {toast.show && (
        <Toast type={toast.type} message={toast.message} onClose={() => setToast({ show: false, message: '', type: 'success' })} />
      )}

      {/* Back button */}
      <Link to="/dashboard" className="inline-flex items-center space-x-2 text-xs text-slate-400 hover:text-white mb-6 transition">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        <span>Back to Student Portal</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* ══════════════════ LEFT COLUMN: DETAILS & ACCORDIONS ══════════════════ */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Header titles */}
          <div className="space-y-4">
            <span className="bg-primary-600/10 border border-primary-600/25 text-primary-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {course.category || "General"}
            </span>
            <h1 className="text-2xl md:text-4xl font-black text-white leading-tight">
              {course.title}
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {course.description}
            </p>

            <div className="flex items-center space-x-4 text-xs font-bold text-slate-400 pt-2 border-b border-border/50 pb-4">
              <span className="text-amber-400">⭐ 4.9 Rating</span>
              <span>•</span>
              <span>{sections.length} Chapters</span>
              <span>•</span>
              <span>{totalLessons} Lectures</span>
            </div>
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
                              <div key={les.id} className="py-2.5 first:pt-0 last:pb-0 flex items-center justify-between text-xs text-slate-400">
                                <div className="flex items-center space-x-2.5 min-w-0 pr-4">
                                  <span className="text-slate-600">📹</span>
                                  <span className="truncate font-medium text-slate-300">
                                    {sIdx + 1}.{lIdx + 1} {les.title}
                                  </span>
                                </div>
                                <span className="text-[10px] text-slate-500 shrink-0 font-bold bg-background/60 px-2 py-0.5 rounded border border-border">
                                  Lecture
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

          {/* Prerequisites & FAQ Accordions */}
          <section className="space-y-4">
            <h3 className="text-base font-extrabold text-white">Frequently Asked Questions</h3>
            <div className="space-y-2">
              {faqs.map((faq, idx) => {
                const isFaqExpanded = expandedFaq === idx;
                return (
                  <div key={idx} className="bg-card border border-border rounded-xl overflow-hidden">
                    <button
                      onClick={() => setExpandedFaq(isFaqExpanded ? null : idx)}
                      className="w-full text-left p-4 flex justify-between items-center bg-background/30 hover:bg-background/50 transition"
                    >
                      <span className="text-white font-bold text-xs pr-4">{faq.q}</span>
                      <svg className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 ${isFaqExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isFaqExpanded && (
                      <div className="p-4 border-t border-border text-xs text-text-muted leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Reviews & Ratings */}
          <section className="space-y-4">
            <h3 className="text-base font-extrabold text-white">Student Reviews</h3>
            
            {/* Reviews display list */}
            <div className="space-y-3">
              {reviews.map((rev, idx) => (
                <div key={idx} className="bg-card border border-border p-4 rounded-2xl space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-xs text-slate-300">{rev.author}</span>
                    <span className="text-[10px] text-slate-600">{rev.date}</span>
                  </div>
                  <div className="text-amber-400 text-xs">
                    {Array.from({ length: rev.rating }).map((_, i) => (
                      <span key={i}>★</span>
                    ))}
                  </div>
                  <p className="text-xs text-text-muted leading-relaxed">{rev.comment}</p>
                </div>
              ))}
            </div>
          </section>

        </div>

        {/* ══════════════════ RIGHT COLUMN: PRICE & PURCHASE CARD ══════════════════ */}
        <div className="space-y-6">
          
          <div className="bg-card border border-border rounded-3xl p-6 shadow-xl relative overflow-hidden sticky top-24">
            {/* Gloss decor */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary-600/10 rounded-full blur-2xl"></div>

            {/* Thumbnail preview */}
            <div className="relative h-44 bg-slate-900 border border-border rounded-2xl overflow-hidden mb-6">
              <img 
                src={course.thumbnailUrl || "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800"} 
                alt={course.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                <span className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white text-base shadow-lg animate-pulse">
                  ▶
                </span>
              </div>
            </div>

            {/* Price tag */}
            <div className="space-y-1 mb-6">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider font-extrabold">Course Enrollment Price</span>
              <div className="flex items-baseline space-x-2.5">
                <span className="text-2xl md:text-3xl font-black text-white">
                  ₹{finalPrice}
                </span>
                {course.price > 0 && finalPrice !== course.price && (
                  <span className="text-slate-500 line-through text-xs font-semibold">
                    ₹{course.price}
                  </span>
                )}
              </div>
            </div>

            {/* Actions button */}
            {isEnrolled || user?.role === 'ADMIN' ? (
              <Link 
                to={`/course/${id}/learn`}
                className="w-full block text-center bg-gradient-to-r from-teal-500 to-primary-600 hover:from-teal-400 hover:to-primary-500 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg transition select-none cursor-pointer"
              >
                Go to learning viewer 🚀
              </Link>
            ) : (
              <div className="space-y-4">
                {/* Coupon application (only if paid) */}
                {course.price > 0 && (
                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      <input 
                        type="text" 
                        placeholder="Promo Code (e.g. FIRST50)" 
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 bg-background/60 text-white border border-border rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-primary-600 transition"
                      />
                      <button 
                        onClick={handleApplyCoupon}
                        className="bg-surface-700 border border-surface-500 text-slate-200 hover:bg-surface-600 px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                    {couponStatus.msg && (
                      <p className={`text-[10px] font-bold ${couponStatus.type === 'success' ? 'text-teal-400' : 'text-rose-400'}`}>
                        {couponStatus.msg}
                      </p>
                    )}
                  </div>
                )}

                <button 
                  onClick={handleEnrollOrBuy}
                  disabled={purchasing}
                  className="w-full bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-black py-3.5 px-4 rounded-xl shadow-lg shadow-primary-600/10 hover:shadow-primary-600/25 transition flex items-center justify-center space-x-2 select-none cursor-pointer"
                >
                  {purchasing ? (
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  ) : (
                    <span>{finalPrice === 0 ? 'Enroll Now (Free)' : 'Buy Now & Access'}</span>
                  )}
                </button>
              </div>
            )}

            {/* Lifetime access info */}
            <div className="mt-6 pt-5 border-t border-border space-y-2.5 text-[10px] text-slate-500 font-semibold">
              <div className="flex items-center space-x-2">
                <span className="text-teal-400">✓</span>
                <span>Includes {totalLessons} lecture chapters</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-teal-400">✓</span>
                <span>Verifiable learning certificate</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-teal-400">✓</span>
                <span>Lifetime unlimited access</span>
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

    </div>
  );
};

export default CourseDetail;
