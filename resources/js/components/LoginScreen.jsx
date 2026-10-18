import React, { useState } from 'react';
import {
  Wrench,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Globe,
  Building2,
  ChevronLeft
} from 'lucide-react';

export default function LoginScreen({
  onLogin,
  onForgotPassword,
  onResetPassword,
  domainInfo = null
}) {
  // Mode: 'login' | 'forgot' | 'reset'
  const [authMode, setAuthMode] = useState('login');

  // Form states (Only Email & Password; Domain is automatically taken from the URL)
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Forgot / Reset password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [demoToken, setDemoToken] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Handle Login submission
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      await onLogin({
        email: email.trim(),
        password,
        remember
      });
    } catch (err) {
      const msg = err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        'Invalid credentials. Please verify your email and password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for demo credentials
  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setErrorMessage('');
  };

  // Forgot password request
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    setIsLoading(true);

    try {
      const res = await onForgotPassword(forgotEmail);
      if (res && res.demo_token) {
        setDemoToken(res.demo_token);
        setResetToken(res.demo_token);
      }
      setSuccessMessage('Password reset token generated! Please set your new password below.');
      setAuthMode('reset');
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to generate reset token. Check email address.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset password submission
  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    setErrorMessage('');
    setIsLoading(true);

    try {
      await onResetPassword({
        email: forgotEmail,
        token: resetToken,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/85 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans selection:bg-amber-400 selection:text-slate-950">

      {/* Background Decorative Ambient Warm Glows */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-amber-400/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

      {/* Main Container Card */}
      <div className="relative w-full max-w-md z-10">

        {/* Top Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/25 mb-3.5">
            <Wrench className="w-8 h-8 stroke-[2.5]" />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {domainInfo?.name || 'MotoService Pro'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 font-medium flex items-center justify-center gap-1.5">
            <span>Motor Service POS & Garage Management</span>
          </p>
        </div>

        {/* Auth Card: Light Theme Design (No Domain Input Field) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/70 relative">

          {/* Status / Error Alert */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{successMessage}</div>
            </div>
          )}

          {/* VIEW 1: LIGHT THEME LOGIN FORM */}
          {authMode === 'login' && (
            <div>
              <div className="mb-5">
                <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">Sign In to Workstation</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your email and password to access the register</p>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">

                {/* 1. Tenant Email Address Field */}
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Tenant Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@speedywheels.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 font-medium focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                  </div>
                </div>

                {/* 2. Password Field */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-slate-700 font-bold text-[11px]">
                      Password *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotEmail(email || domainInfo?.email || '');
                        setErrorMessage('');
                        setSuccessMessage('');
                        setAuthMode('forgot');
                      }}
                      className="text-amber-600 hover:text-amber-700 font-bold transition-colors cursor-pointer text-[11px]"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-10 py-2.5 text-slate-900 placeholder:text-slate-400 font-mono font-medium focus:outline-none focus:border-amber-500 focus:bg-white focus:ring-2 focus:ring-amber-500/20 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 3. Keep signed in checkbox */}
                <div className="flex items-center gap-2 pt-0.5">
                  <input
                    type="checkbox"
                    id="remember_me"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 bg-slate-50 text-amber-500 focus:ring-amber-500/30 cursor-pointer accent-amber-500"
                  />
                  <label htmlFor="remember_me" className="text-slate-600 font-medium select-none cursor-pointer">
                    Keep me signed in on this station
                  </label>
                </div>

                {/* 4. Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Authenticating Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to POS Station</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* VIEW 2: FORGOT PASSWORD (REQUEST TOKEN) */}
          {authMode === 'forgot' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setAuthMode('login');
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Forgot Password</h2>
                  <p className="text-xs text-slate-500">Request password reset token</p>
                </div>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Registered Tenant Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="owner@speedywheels.com"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2.5 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Generating Reset Token...</span>
                    </>
                  ) : (
                    <>
                      <span>Generate Reset Token</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* VIEW 3: RESET PASSWORD FORM */}
          {authMode === 'reset' && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage('');
                    setAuthMode('login');
                  }}
                  className="p-1 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div>
                  <h2 className="text-base font-bold text-slate-900 tracking-tight">Set New Password</h2>
                  <p className="text-xs text-slate-500">Account: {forgotEmail}</p>
                </div>
              </div>

              {demoToken && (
                <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <div className="text-amber-900 font-bold text-[11px] mb-1">Generated Reset Token (Auto-filled):</div>
                  <div className="font-mono text-slate-800 text-[10px] break-all bg-white p-2 rounded-lg border border-slate-200">
                    {demoToken}
                  </div>
                </div>
              )}

              <form onSubmit={handleResetSubmit} className="space-y-3.5 text-xs">
                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Reset Token
                  </label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste 64-character token"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-[11px] focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    New Password (Min 6 chars)
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="New secure password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1 text-[11px]">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black text-xs shadow-md shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <span>Save New Password & Sign In</span>
                  )}
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Footer Security Badges */}
        <div className="mt-6 text-center text-slate-400 text-[11px] flex items-center justify-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Domain Automatically Verified from URL &bull; TLS 1.3</span>
        </div>

      </div>
    </div>
  );
}
