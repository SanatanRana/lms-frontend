import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';
import LoadingSpinner from '../../components/LoadingSpinner';


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
    <div className="max-w-6xl mx-auto px-6 py-12">
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

          {/* Video Preview */}
          <div className="border border-surface-600 bg-surface-800 rounded-2xl p-5 overflow-hidden">
            <h3 className="text-white font-extrabold text-lg mb-4 flex items-center space-x-2">
              <span className="w-2 h-4 rounded bg-primary-500"></span>
              <span>Course Introduction Video</span>
            </h3>
            {course.introVideoUrl ? (
              <div className="aspect-video bg-black rounded-xl overflow-hidden relative border border-surface-600">
                <iframe 
                  className="w-full h-full"
                  src={course.introVideoUrl.replace("watch?v=", "embed/")}
                  title="Course Introduction"
                  allowFullScreen
                ></iframe>
              </div>
            ) : (
              <div className="aspect-video bg-surface-900 rounded-xl flex flex-col items-center justify-center border border-surface-600/50 text-slate-500">
                <svg className="w-12 h-12 text-slate-700 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">No preview video available.</span>
              </div>
            )}
          </div>
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
    </div>
  );
};

export default CourseDetail;
