import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { FiMail, FiLock, FiKey, FiArrowRight } from 'react-icons/fi';
import './Auth.css'; // Assuming your Auth.css has general styles

import logo from '../../assets/logo.png'; // Import the logo

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP, 3: New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await axios.post('/auth/forgot-password', { email });
      
      // Check if OTP is in response (development mode)
      if (response.data.devOtp) {
        toast.warning(`Development Mode: OTP is ${response.data.devOtp}. Check server console for details.`, {
          autoClose: 10000
        });
      } else {
        toast.success('OTP sent to your email if the account exists.');
      }
      
      setStep(2);
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to send OTP.';
      toast.error(errorMessage);
      
      // If there's a devOtp in error response, show it
      if (error.response?.data?.devOtp) {
        toast.info(`Development OTP: ${error.response.data.devOtp}`, {
          autoClose: 15000
        });
        setStep(2); // Still proceed to OTP step
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('/auth/verify-otp', { email, otp });
      toast.success('OTP verified. You can now reset your password.');
      setStep(3);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid or expired OTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.');
      setLoading(false);
      return;
    }

    try {
      await axios.post('/auth/reset-password', { email, otp, newPassword });
      toast.success('Password reset successfully! You can now log in with your new password.');
      setStep(1); // Optionally navigate to sign-in page
      // navigate('/signin'); // If using react-router-dom navigate
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleForgotPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Sending OTP...' : (<><FiMail /> Send OTP</>)}
            </button>
          </form>
        );
      case 2:
        return (
          <form onSubmit={handleVerifyOtp} className="auth-form">
            <div className="form-group">
              <label className="form-label">OTP</label>
              <input
                type="text"
                className="form-input"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength="6"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Verifying...' : (<><FiKey /> Verify OTP</>)}
            </button>
            <p className="auth-link" style={{marginTop: '1rem'}}>
              Didn't receive OTP? <a href="#" onClick={handleForgotPassword}>Resend OTP</a>
            </p>
          </form>
        );
      case 3:
        return (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label className="form-label">New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm New Password</label>
              <input
                type="password"
                className="form-input"
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Resetting...' : (<><FiLock /> Reset Password</>)}
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  return (
    <div className="auth-container">
      <div className="glass-card auth-card">
        <div className="auth-header">
          <img src={logo} alt="Jayakody Auto Electricals Logo" className="auth-logo" />
          <h1 className="auth-title">Jayakody Auto Electricals</h1>
          <p className="auth-subtitle">Forgot Password</p>
        </div>
        {renderStep()}
        <p className="auth-link" style={{marginTop: '2rem'}}>
            Remember your password? <a href="/signin">Sign In</a>
        </p>
      </div>
    </div>
  );
};

export default ForgotPassword;