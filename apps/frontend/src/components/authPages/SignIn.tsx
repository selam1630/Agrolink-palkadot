import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import agriIcon from '@/assets/images/agriIcon.png'; 
import { useAuth } from '@/context/AuthContext'; 
import { useTranslation } from 'react-i18next'; 

interface SignInData {
  phoneNumber: string;
  password: string;
}

const SignIn: React.FC = () => {
  const { setAuth } = useAuth();
  const { t } = useTranslation();

  const [formData, setFormData] = useState<SignInData>({
    phoneNumber: '',
    password: '',
  });
  const [otp, setOtp] = useState<string>('');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp' | 'otpInput'>('password');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };
const handleLoginSuccess = (data: any) => {
  setSuccessMessage(t('signIn.loginSuccess') as string);

  // Set everything in one go (localStorage + context)
  localStorage.setItem('authToken', data.token);
  localStorage.setItem('user-id', data.userId);
  localStorage.setItem('role', data.role);

  // ✅ Make sure to update context with all 3 arguments
  setAuth(data.token, data.userId, data.role);

  // Delay navigation slightly to allow context to update
  setTimeout(() => {
    if (data.role === 'super_admin') {
      navigate('/admin-dashboard');
    } else if (data.role === 'admin') {
      navigate('/dashboard');
    } else if (data.role === 'buyer') {
      navigate('/products');
    }
  }, 100); 
};

  const handlePasswordLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    const payload = {
      phone: formData.phoneNumber,
      password: formData.password,
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        handleLoginSuccess(data);
      } else {
        setError(data.error || (t('signIn.loginFailed') as string));
      }
    } catch (err) {
      console.error('Error during password login:', err);
      setError(t('signIn.networkError') as string);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    const payload = {
      phone: formData.phoneNumber,
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/login-with-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        setLoginMethod('otpInput');
      } else {
        setError(data.error || (t('signIn.loginFailed') as string));
      }
    } catch (err) {
      console.error('Error requesting OTP:', err);
      setError(t('signIn.networkError') as string);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    const payload = {
      phone: formData.phoneNumber,
      otp,
    };

    try {
      const response = await fetch('http://localhost:5000/api/auth/verify-login-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        handleLoginSuccess(data);
      } else {
        setError(data.error || (t('signIn.loginFailed') as string));
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError(t('signIn.networkError') as string);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-100 p-4">
      <div className="relative bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-lg">
        <img src={agriIcon} alt="AgroTech Logo" className="absolute top-6 left-6 w-20 h-20 p-2" />

        <div className="text-center mb-8">
          {/* Using translation key for title and description */}
          <h1 className="text-3xl md:text-4xl font-bold text-green-700">{t('signIn.title')}</h1>
          <p className="text-gray-600 mt-2">{t('signIn.description')}</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}
        {successMessage && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
            <span className="block sm:inline">{successMessage}</span>
          </div>
        )}

        {loginMethod === 'password' && (
          <form onSubmit={handlePasswordLogin}>
            <div className="mb-6">
              {/* Using translation key for label and placeholder */}
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-800 mb-2">
                {t('signIn.phoneLabel')}
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                placeholder={t('signIn.phonePlaceholder') as string}
                required
              />
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-center">
                {/* Using translation key for label */}
                <label htmlFor="password" className="block text-sm font-medium text-gray-800 mb-2">
                  {t('signIn.passwordLabel')}
                </label>
                {/* Using translation key for forgot password link */}
                <Link to="/forgot-password" className="text-xs text-green-600 hover:text-green-800 transition-colors duration-300">
                  {t('auth.forgotPassword')}
                </Link>
              </div>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                placeholder={t('signIn.passwordPlaceholder') as string}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50"
              disabled={isLoading}
            >
              {/* Using translation key for button text */}
              {isLoading ? '...' : (t('signIn.signInButton') as string)}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setLoginMethod('otp')}
                className="text-sm font-medium text-green-600 hover:text-green-800 transition-colors duration-300"
              >
                {/* Hard-coded text to be fixed */}
                Or, {t('signIn.signInButton')} with OTP
              </button>
            </div>
          </form>
        )}

        {loginMethod === 'otp' && (
          <form onSubmit={handleRequestOtp}>
            <div className="mb-6">
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-800 mb-2">
                {t('signIn.phoneLabel')}
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                placeholder={t('signIn.phonePlaceholder') as string}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50"
              disabled={isLoading}
            >
              {/* Hard-coded text to be fixed */}
              {isLoading ? '...' : 'Send OTP'}
            </button>
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className="text-sm font-medium text-green-600 hover:text-green-800 transition-colors duration-300"
              >
                {/* Hard-coded text to be fixed */}
                Or, {t('signIn.signInButton')} with Password
              </button>
            </div>
          </form>
        )}

        {loginMethod === 'otpInput' && (
          <form onSubmit={handleVerifyOtp}>
            <p className="text-center text-gray-600 mb-6">{t('signIn.sendOtpMessage')}</p>
            <div className="mb-6">
              <label htmlFor="otp" className="block text-sm font-medium text-gray-800 mb-2">
                {t('signIn.enterOtpLabel')}
              </label>
              <input
                type="text"
                id="otp"
                name="otp"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300 text-center tracking-widest text-xl"
                placeholder="000000"
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50"
              disabled={isLoading}
            >
              {/* Hard-coded text to be fixed */}
              {isLoading ? '...' : 'Verify OTP'}
            </button>
          </form>
        )}

        <div className="text-center mt-6 text-sm text-gray-600">
          {t('signIn.noAccount')}{' '}
          <Link to="/sign-up" className="font-medium text-green-600 hover:text-green-800 transition-colors duration-300 ml-1">
            {t('signIn.signUpNow')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default SignIn;