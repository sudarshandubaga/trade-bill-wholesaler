import React, { useState } from 'react';
import {
  Lock,
  Mail,
  KeyRound,
  X,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export default function AuthModals({
  loginOpen,
  changePasswordOpen,
  forgotPasswordOpen,
  onCloseAll,
  onLogin,
  onChangePassword,
  onForgotPassword,
  onResetPassword,
  activeTenant
}) {
  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changePasswordLoading, setChangePasswordLoading] = useState(false);

  // Forgot password form state
  const [forgotStep, setForgotStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [demoTokenGenerated, setDemoTokenGenerated] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      await onLogin({ email: loginEmail, password: loginPassword });
      onCloseAll();
    } finally {
      setLoginLoading(false);
    }
  };

  const handleChangePasswordSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('New password and confirmation do not match.');
      return;
    }
    setChangePasswordLoading(true);
    try {
      await onChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: confirmPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onCloseAll();
    } finally {
      setChangePasswordLoading(false);
    }
  };

  const handleForgotEmailSubmit = async (e) => {
    e.preventDefault();
    setForgotLoading(true);
    try {
      const res = await onForgotPassword(forgotEmail);
      if (res && res.demo_token) {
        setDemoTokenGenerated(res.demo_token);
        setResetToken(res.demo_token);
      }
      setForgotStep(2);
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (resetPassword !== resetConfirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    setForgotLoading(true);
    try {
      await onResetPassword({
        email: forgotEmail,
        token: resetToken,
        password: resetPassword,
        password_confirmation: resetConfirmPassword,
      });
      onCloseAll();
      setForgotStep(1);
      setForgotEmail('');
      setResetToken('');
      setResetPassword('');
      setResetConfirmPassword('');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <>
      {/* 1. Login Modal */}
      {loginOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-900 text-lg tracking-tight">Garage Admin Login</h3>
                <p className="text-xs text-slate-500">Sign in to your motor service counter</p>
              </div>
              <button onClick={onCloseAll} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="owner@speedywheels.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-700 font-bold text-[11px]">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      onCloseAll();
                      setForgotStep(1);
                      setForgotEmail(loginEmail || activeTenant?.email || '');
                    }}
                    className="text-amber-600 hover:text-amber-700 font-bold cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loginLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to POS Station</span>
                  )}
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
                <p className="font-bold text-slate-700">Demo Login Credentials:</p>
                <p>Email: <span className="text-amber-800 font-mono font-bold">owner@speedywheels.com</span></p>
                <p>Password: <span className="text-amber-800 font-mono font-bold">password123</span></p>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {changePasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">Change Password</h3>
                  <p className="text-xs text-slate-500">{activeTenant?.email}</p>
                </div>
              </div>
              <button onClick={onCloseAll} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">Current Password *</label>
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">New Password * (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 font-bold text-[11px]">Confirm New Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onCloseAll}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordLoading}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all cursor-pointer shadow-sm"
                >
                  {changePasswordLoading ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Forgot & Reset Password Modal */}
      {forgotPasswordOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    {forgotStep === 1 ? 'Forgot Password' : 'Reset Password'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {forgotStep === 1
                      ? 'We will generate a reset token for your email'
                      : 'Enter token and set your new password'}
                  </p>
                </div>
              </div>
              <button onClick={onCloseAll} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotEmailSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">Registered Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="owner@speedywheels.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-black text-xs shadow-md shadow-amber-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Sending Request...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5 text-xs">
                {demoTokenGenerated && (
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] space-y-1">
                    <div className="flex items-center gap-1 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Reset Token Generated!</span>
                    </div>
                    <p className="text-slate-600">
                      Token auto-filled for instant testing:
                    </p>
                    <p className="font-mono text-emerald-800 bg-white p-1.5 rounded border border-emerald-200 truncate select-all">
                      {demoTokenGenerated}
                    </p>
                  </div>
                )}

                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">Reset Token *</label>
                  <input
                    type="text"
                    required
                    value={resetToken}
                    onChange={(e) => setResetToken(e.target.value)}
                    placeholder="Paste 64-char reset token"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">New Password * (Min 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetPassword}
                    onChange={(e) => setResetPassword(e.target.value)}
                    placeholder="Enter new secure password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 font-bold text-[11px]">Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={resetConfirmPassword}
                    onChange={(e) => setResetConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:border-amber-500 focus:bg-white"
                  />
                </div>

                <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                  >
                    &larr; Back to Email
                  </button>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black transition-all shadow-sm cursor-pointer"
                  >
                    {forgotLoading ? 'Resetting...' : 'Set Password & Login'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
