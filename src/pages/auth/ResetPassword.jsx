import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const [token] = useState(searchParams.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [tokenValid, setTokenValid] = useState(null); // null = checking
  const navigate = useNavigate();

  // Validate token on load
  useEffect(() => {
    if (!token) {
      setTokenValid(false);
      return;
    }
    api.get(`/auth/reset-password?token=${token}`)
      .then(res => setTokenValid(res.data?.success === true))
      .catch(() => setTokenValid(false));
  }, [token]);

  const getPasswordStrength = () => {
    const pwd = newPassword;
    if (!pwd) return { label: '', color: 'bg-surface-700', width: '0%' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    if (score <= 1) return { label: 'Weak', color: 'bg-error', width: '20%' };
    if (score <= 2) return { label: 'Fair', color: 'bg-warning', width: '40%' };
    if (score <= 3) return { label: 'Good', color: 'bg-accent-500', width: '60%' };
    if (score <= 4) return { label: 'Strong', color: 'bg-success', width: '85%' };
    return { label: 'Very Strong', color: 'bg-success', width: '100%' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      if (res.data?.success) {
        setSuccessMsg('Password reset successful! Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setErrorMsg(res.data?.message || 'Failed to reset password');
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Failed to reset password. Token may be expired.');
    } finally {
      setLoading(false);
    }
  };

  const pwdStrength = getPasswordStrength();

  // Loading state — checking token validity
  if (tokenValid === null) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary-600/30 border-t-primary-600 animate-spin" />
      </div>
    );
  }

  // Invalid or expired token
  if (tokenValid === false) {
    return (
      <div className="w-full min-h-screen bg-background flex flex-col items-center justify-center px-4">
        <div className="w-16 h-16 rounded-full bg-error/15 border border-error/30 flex items-center justify-center mb-6 text-error">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-3">Invalid Reset Link</h2>
        <p className="text-slate-400 text-sm text-center mb-6 max-w-sm">
          This password reset link is invalid or has expired (links expire after 30 minutes).
          Please request a new one.
        </p>
        <Link to="/login" className="px-6 py-3 bg-primary-600 hover:bg-primary-500 text-white font-bold rounded-xl transition">
          Back to Login
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-background flex flex-col justify-center items-center px-4 py-8 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[450px] h-[450px] bg-teal-500/5 rounded-full blur-3xl animate-float" style={{ animationDelay: '3.5s' }} />

      <div className="w-full max-w-[450px] bg-surface-900/60 backdrop-blur-xl border border-surface-600/30 rounded-3xl shadow-2xl p-10 relative z-10">
        <Link to="/" className="flex flex-col items-center mb-8 group cursor-pointer">
          <img src="/logo-icon.jpg" alt="Logo" className="w-12 h-12 rounded-xl object-cover shadow-lg mb-3 transform group-hover:rotate-3 transition duration-300" />
          <span className="text-2xl font-black text-white group-hover:text-primary transition duration-300">LearnGen</span>
          <span className="text-[10px] text-primary-400 font-bold uppercase tracking-widest mt-1">Premium Learning Network</span>
        </Link>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-extrabold text-white mb-2">Reset Password</h2>
          <p className="text-slate-400 text-sm">Enter your new password below</p>
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

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min. 6 characters"
                className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 pr-12 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
                required
                minLength={6}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1">
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" /></svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                )}
              </button>
            </div>
            {newPassword && (
              <div className="mt-2.5">
                <div className="w-full bg-surface-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-300 ${pwdStrength.color}`} style={{ width: pwdStrength.width }} />
                </div>
                <span className="text-[10px] font-bold text-slate-400 mt-1 block">Strength: <span className="text-primary-400 font-extrabold">{pwdStrength.label}</span></span>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Confirm Password</label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your password"
              className="block w-full h-12 bg-surface-800/40 text-white placeholder-slate-500 border border-surface-600 rounded-xl px-4 text-sm focus:outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/30 transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 bg-gradient-to-r from-primary-600 to-primary-light hover:from-primary-500 hover:to-primary-light text-white font-bold rounded-xl shadow-lg shadow-primary-600/20 transition-all duration-300 flex items-center justify-center disabled:opacity-60 cursor-pointer"
          >
            {loading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : <span>Reset Password</span>}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-400">
          Remembered your password?{' '}
          <Link to="/login" className="text-primary-400 hover:text-primary-300 font-bold hover:underline transition">Sign In</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
