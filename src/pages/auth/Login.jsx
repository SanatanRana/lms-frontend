import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [view, setView] = useState('login'); // 'login' | 'forgot' | 'forgot-success'
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);
    try {
      const response = await api.post('/auth/login', formData);
      const apiResp = response.data;
      if (apiResp.success) {
        login({ 
          token: apiResp.data.token, 
          role: apiResp.data.role, 
          name: apiResp.data.name, 
          email: formData.email,
          userId: apiResp.data.userId
        });
        navigate('/dashboard');
      } else {
        setErrorMsg(apiResp.message || "Login failed");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || error.response?.data || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = (e) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg('Please enter your email address');
      return;
    }
    setErrorMsg('');
    setLoading(true);
    
    // Simulate API request for premium UX
    setTimeout(() => {
      setLoading(false);
      setSuccessMsg(`A password reset link has been sent to ${forgotEmail}`);
      setView('forgot-success');
    }, 1200);
  };

  return (
    <div className="w-full min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Dynamic Background Glowing Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-primary-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[300px] md:w-[450px] h-[300px] md:h-[450px] bg-teal-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3.5s' }}></div>

      {/* Main Auth Card Container */}
      <div className="w-full max-w-[450px] bg-surface-900/60 backdrop-blur-xl border border-surface-600/30 rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-10 relative z-10 transition duration-300">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-primary-600/30 mb-3 transform hover:rotate-3 transition duration-300">
            A
          </div>
          <span className="text-2xl font-black text-white tracking-tight">AuraLMS</span>
          <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest mt-1">Premium Learning Network</span>
        </div>

        {view === 'login' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Welcome Back</h2>
              <p className="text-slate-400 text-sm">Access your educational dashboard and resume learning</p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2.5 animate-scale-in">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="name@example.com"
                  className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
                  required 
                />
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Password</label>
                  <button 
                    type="button" 
                    onClick={() => { setView('forgot'); setErrorMsg(''); }}
                    className="text-xs text-primary-400 hover:text-primary-300 font-bold hover:underline transition"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="••••••••"
                    className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200 pr-12"
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                  >
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/35 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </form>

            <p className="mt-8 text-center text-sm text-slate-400">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary-400 hover:text-primary-300 font-bold hover:underline transition">
                Create an account
              </Link>
            </p>
          </div>
        )}

        {view === 'forgot' && (
          <div className="animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Forgot Password</h2>
              <p className="text-slate-400 text-sm">Enter your email and we'll send you a link to reset your password</p>
            </div>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2.5 animate-scale-in">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleForgotSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email" 
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
                  required 
                />
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/35 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer active:scale-[0.99]"
              >
                {loading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                ) : (
                  <span>Send Reset Link</span>
                )}
              </button>
            </form>

            <div className="mt-8 text-center">
              <button 
                onClick={() => { setView('login'); setErrorMsg(''); }}
                className="text-sm font-bold text-slate-400 hover:text-white transition flex items-center justify-center space-x-2 mx-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" />
                </svg>
                <span>Back to Login</span>
              </button>
            </div>
          </div>
        )}

        {view === 'forgot-success' && (
          <div className="animate-fade-in text-center">
            <div className="w-16 h-16 rounded-full bg-success/15 border border-success/30 flex items-center justify-center mx-auto mb-6 text-success animate-scale-in">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h2 className="text-2xl font-extrabold text-white tracking-tight mb-3">Reset Link Sent</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              {successMsg}
            </p>

            <button 
              onClick={() => { setView('login'); setForgotEmail(''); setSuccessMsg(''); setErrorMsg(''); }}
              className="w-full h-12 bg-surface-700 hover:bg-surface-600 text-white font-bold rounded-xl transition"
            >
              Back to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default Login;
