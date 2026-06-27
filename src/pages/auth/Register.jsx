import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', password: '', role: 'STUDENT' });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Clear any existing session token/role when opening the registration page
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const getPasswordStrength = () => {
    const pwd = formData.password;
    if (!pwd) return { label: '', color: '', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: 'Weak', color: 'bg-error', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-warning', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-accent-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-success', width: '80%' };
    return { label: 'Very Strong', color: 'bg-success', width: '100%' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);
    try {
      const response = await api.post('/auth/register', formData);
      const apiResp = response.data;
      if (apiResp.success) {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('userName');
        
        setSuccessMsg(apiResp.message || "Registration successful! Redirecting to login...");
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        setErrorMsg(apiResp.message || "Registration failed");
      }
    } catch (error) {
      console.error(error);
      setErrorMsg(error.response?.data?.message || error.response?.data || "Failed to register. Email may already be in use.");
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength();

  return (
    <div className="min-h-[90vh] flex animate-fade-in">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-surface-900 via-primary-900/20 to-surface-900 items-center justify-center p-12">
        <div className="absolute top-20 left-20 w-64 h-64 bg-primary-600/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-20 right-20 w-48 h-48 bg-accent-500/8 rounded-full blur-3xl animate-float" style={{ animationDelay: '3s' }}></div>
        
        <div className="relative max-w-md text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-2xl shadow-2xl shadow-primary-600/30 mx-auto mb-8">
            A
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-4">Join AuraLMS Today</h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Start your learning journey with access to premium courses, expert instructors, and cutting-edge learning tools.
          </p>
          
          <div className="space-y-4 text-left">
            {[
              { icon: '🚀', text: 'Get started in under 2 minutes' },
              { icon: '🎓', text: 'Access 500+ expert-led courses' },
              { icon: '🤖', text: 'AI-powered doubt resolution 24/7' },
              { icon: '📱', text: 'Learn anytime, anywhere' }
            ].map((item, idx) => (
              <div key={idx} className="flex items-center space-x-3 glass rounded-xl px-4 py-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-slate-300 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel — Form */}
      <div className="w-full lg:w-1/2 flex justify-center items-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center space-x-2 mb-8">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-lg">A</div>
            <span className="text-xl font-extrabold text-white">AuraLMS</span>
          </div>

          <h2 className="text-3xl font-extrabold mb-2 text-white tracking-tight">Create your account</h2>
          <p className="text-slate-400 text-sm mb-8">Sign up to start learning or teaching today</p>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2 animate-scale-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3.5 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-center space-x-2 animate-scale-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Full Name</label>
              <input 
                type="text" 
                name="name" 
                value={formData.name}
                onChange={handleChange} 
                placeholder="John Doe"
                className="block w-full bg-surface-800/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email}
                onChange={handleChange} 
                placeholder="john@example.com"
                className="block w-full bg-surface-800/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                required 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Phone Number</label>
              <input 
                type="tel" 
                name="phone" 
                value={formData.phone}
                onChange={handleChange} 
                placeholder="+91 9876543210"
                className="block w-full bg-surface-800/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition"
                required 
              />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? 'text' : 'password'} 
                  name="password" 
                  value={formData.password}
                  onChange={handleChange} 
                  placeholder="Min. 6 characters"
                  className="block w-full bg-surface-800/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition pr-12"
                  required 
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
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
              {/* Password strength indicator */}
              {formData.password && (
                <div className="mt-2">
                  <div className="w-full bg-surface-700 h-1.5 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }}></div>
                  </div>
                  <span className={`text-[10px] font-semibold mt-1 block ${
                    passwordStrength.label === 'Weak' ? 'text-error' :
                    passwordStrength.label === 'Fair' ? 'text-warning' :
                    'text-success'
                  }`}>
                    {passwordStrength.label}
                  </span>
                </div>
              )}
            </div>



            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
              ) : (
                <span>Create Account</span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold hover:underline transition">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;