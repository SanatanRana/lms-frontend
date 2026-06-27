import React, { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/axiosConfig';
import { AuthContext } from '../../context/AuthContext';

const Login = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
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
        login({ token: apiResp.data.token, role: apiResp.data.role, name: apiResp.data.name, email: formData.email });
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
          <h2 className="text-3xl font-extrabold text-white mb-4">Welcome back to AuraLMS</h2>
          <p className="text-slate-400 text-base leading-relaxed mb-8">
            Continue your learning journey. Access your courses, track progress, and join live sessions.
          </p>
          
          <div className="space-y-4 text-left">
            {[
              { icon: '📚', text: 'Access your enrolled courses instantly' },
              { icon: '📊', text: 'Track learning progress and completion' },
              { icon: '🎥', text: 'Join scheduled live sessions' }
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

          <h2 className="text-3xl font-extrabold mb-2 text-white tracking-tight">Sign in to your account</h2>
          <p className="text-slate-400 text-sm mb-8">Enter your credentials to access your dashboard</p>

          {errorMsg && (
            <div className="mb-4 p-3.5 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2 animate-scale-in">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email address</label>
              <input 
                type="email" 
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
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
                  placeholder="••••••••"
                  className="block w-full bg-surface-800/50 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition pr-12"
                  required 
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
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/30 transition flex items-center justify-center space-x-2 disabled:opacity-50"
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
      </div>
    </div>
  );
};

export default Login;
