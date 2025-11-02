import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';

interface FarmerFormData {
  name: string;
  phone: string;
  region: string;
}

const AdminDashboard2: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const [formData, setFormData] = useState<FarmerFormData>({
    name: '',
    phone: '',
    region: '',
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const role = localStorage.getItem('role');
    if (role === 'admin') {
      setIsAdmin(true);
    } else {
      navigate('/sign-in');
    }
  }, [navigate]);

  const handleLogout = () => {
    signOut();
    navigate('/sign-in');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
      setError(t('auth.notAuthenticated') as string);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/admin/farmers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(t('adminDashboard.farmerAddedSuccess') as string);
        setFormData({ name: '', phone: '', region: '' });
      } else {
        setError(data.error || (t('adminDashboard.failedMessage') as string));
      }
    } catch (err) {
      console.error('Error adding farmer:', err);
      setError(t('adminDashboard.networkError') as string);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-green-100 p-4">
      <div className="bg-white p-8 md:p-10 rounded-xl shadow-2xl w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-green-700">{t('adminDashboard.title')}</h1>
          <p className="text-gray-600 mt-2">{t('adminDashboard.description')}</p>
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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="name" className="block text-sm font-medium text-gray-800 mb-2">
              {t('adminDashboard.farmerNameLabel')}
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              placeholder={t('adminDashboard.farmerNamePlaceholder') as string}
              required
            />
          </div>
          <div className="mb-4">
            <label htmlFor="phone" className="block text-sm font-medium text-gray-800 mb-2">
              {t('adminDashboard.phoneLabel')}
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              placeholder={t('adminDashboard.phonePlaceholder') as string}
              required
            />
          </div>
          <div className="mb-6">
            <label htmlFor="region" className="block text-sm font-medium text-gray-800 mb-2">
              {t('adminDashboard.regionLabel')}
            </label>
            <input
              type="text"
              id="region"
              name="region"
              value={formData.region}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
              placeholder={t('adminDashboard.regionPlaceholder') as string}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-all duration-300 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading ? '...' : (t('adminDashboard.addFarmerButton') as string)}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard2;
