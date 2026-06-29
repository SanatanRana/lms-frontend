import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

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
    if (!pwd) return { label: '', color: 'bg-surface-700', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { label: 'Weak Password', color: 'bg-error', width: '20%' };
    if (score <= 2) return { label: 'Fair Password', color: 'bg-warning', width: '40%' };
    if (score <= 3) return { label: 'Good Password', color: 'bg-accent-500', width: '60%' };
    if (score <= 4) return { label: 'Strong Password', color: 'bg-success', width: '85%' };
    return { label: 'Extremely Strong Password', color: 'bg-success', width: '100%' };
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
    <div className="w-full min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      {/* Background blobs for visual depth */}
      <div className="absolute top-[-10%] right-[-10%] w-[350px] md:w-[500px] h-[350px] md:h-[500px] bg-primary-600/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] md:w-[450px] h-[300px] md:h-[450px] bg-teal-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '2.5s' }}></div>

      {/* Register Auth Card */}
      <div className="w-full max-w-[460px] bg-surface-900/60 backdrop-blur-xl border border-surface-600/30 rounded-2xl md:rounded-3xl shadow-2xl p-6 md:p-10 relative z-10 transition duration-300">
        
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-teal-500 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-primary-600/30 mb-3 transform hover:rotate-3 transition duration-300">
            A
          </div>
          <span className="text-2xl font-black text-white tracking-tight">AuraLMS</span>
          <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest mt-1">Premium Learning Network</span>
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight mb-2">Create Account</h2>
          <p className="text-slate-400 text-sm">Join AuraLMS to start learning today</p>
        </div>

        {errorMsg && (
          <div className="mb-5 p-3.5 bg-error/10 border border-error/20 text-error text-xs rounded-xl flex items-center space-x-2.5 animate-scale-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-5 p-3.5 bg-success/10 border border-success/20 text-success text-xs rounded-xl flex items-center space-x-2.5 animate-scale-in">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Full Name</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name}
              onChange={handleChange} 
              placeholder="John Doe"
              className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Email Address</label>
            <input 
              type="email" 
              name="email" 
              value={formData.email}
              onChange={handleChange} 
              placeholder="john@example.com"
              className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
              required 
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Phone Number</label>
            <input 
              type="tel" 
              name="phone" 
              value={formData.phone}
              onChange={handleChange} 
              placeholder="+91 9876543210"
              className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                name="password" 
                value={formData.password}
                onChange={handleChange} 
                placeholder="Min. 6 characters"
                className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200 pr-12"
                required 
                minLength={6}
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
            {/* Password strength meter */}
            {formData.password && (
              <div className="mt-2.5">
                <div className="w-full bg-surface-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${passwordStrength.color}`} style={{ width: passwordStrength.width }}></div>
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">
                  Strength: <span className="text-primary-400 font-extrabold">{passwordStrength.label}</span>
                </span>
              </div>
            )}
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-primary-600 to-teal-500 hover:from-primary-500 hover:to-teal-400 text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 hover:shadow-primary-600/35 transition-all duration-300 flex items-center justify-center space-x-2 disabled:opacity-60 cursor-pointer active:scale-[0.99] pt-0.5"
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
  );
};

export default Register;