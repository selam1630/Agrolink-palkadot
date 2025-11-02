import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Check, Upload } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

interface FarmerProductRecord {
  id: string;
  farmerName: string;
  farmerPhone: string;
  bankAccount: string;
  productName: string;
  productImage: string;
  amount: number;
  pricePerUnit: number;
  isPosted: boolean;
}

const RecordedProductsPage: React.FC = () => {
  const { t } = useTranslation();
  const { token, loading: authLoading } = useAuth();

  const [records, setRecords] = useState<FarmerProductRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [postingIds, setPostingIds] = useState<string[]>([]);
  const [postingAll, setPostingAll] = useState<boolean>(false);

  useEffect(() => {
    const fetchRecords = async () => {
      if (authLoading || !token) return;

      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/farmer-products', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || 'Failed to fetch records');
        }
        const data = await response.json();
        setRecords(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecords();
  }, [token, authLoading]);

  const handlePost = async (recordId: string) => {
    try {
      setPostingIds((prev) => [...prev, recordId]);
      const response = await fetch('http://localhost:5000/api/farmer-products/post', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recordId }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to post product');
      }
      const data = await response.json();
      setRecords((prev) =>
        prev.map((r) => (r.id === recordId ? { ...r, isPosted: true } : r))
      );
      alert(data.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPostingIds((prev) => prev.filter((id) => id !== recordId));
    }
  };

  const handlePostAll = async () => {
    try {
      setPostingAll(true);
      const response = await fetch('http://localhost:5000/api/farmer-products/post', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ postAll: true }),
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to post all products');
      }
      const data = await response.json();
      setRecords((prev) =>
        prev.map((r) => (r.isPosted ? r : { ...r, isPosted: true }))
      );
      alert(data.message);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPostingAll(false);
    }
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
  };
  const itemVariants: Variants = {
    hidden: { y: 50, opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1 },
  };

  if (isLoading || authLoading) return <p className="text-center mt-12">{t('loading')}</p>;
  if (error) return <p className="text-center mt-12 text-red-500">{error}</p>;

  // Filter only unposted records
  const unpostedRecords = records.filter((r) => !r.isPosted);
  if (unpostedRecords.length === 0) return <p className="text-center mt-12">{t('No unposted records found')}</p>;

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-green-800 mb-4">{t('Recorded Products')}</h1>
      <Button
        className="mb-6 bg-green-600 hover:bg-green-700 text-white rounded-xl"
        onClick={handlePostAll}
        disabled={postingAll || unpostedRecords.length === 0}
      >
        <Upload className="mr-2 h-4 w-4" />
        {postingAll ? t('Posting...') : t('Post All Unposted')}
      </Button>

      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {unpostedRecords.map((record) => (
          <motion.div key={record.id} variants={itemVariants}>
            <Card className="rounded-xl shadow-lg overflow-hidden flex flex-col h-full">
              <CardHeader className="flex-grow p-4">
                <CardTitle className="text-xl font-bold">{record.productName}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <img
                  src={record.productImage || 'https://placehold.co/400x300'}
                  alt={record.productName}
                  className="w-full h-48 object-cover rounded-lg mb-4"
                />
                <p><span className="font-semibold">{t('Farmer')}:</span> {record.farmerName}</p>
                <p><span className="font-semibold">{t('Phone')}:</span> {record.farmerPhone}</p>
                <p><span className="font-semibold">{t('Amount')}:</span> {record.amount}</p>
                <p><span className="font-semibold">{t('Price per Unit')}:</span> {record.pricePerUnit}</p>
                <p><span className="font-semibold">{t('Bank Account')}:</span> {record.bankAccount}</p>
              </CardContent>
              <CardFooter className="p-4 pt-0">
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-xl"
                  onClick={() => handlePost(record.id)}
                  disabled={postingIds.includes(record.id)}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {postingIds.includes(record.id) ? t('Posting...') : t('Post')}
                </Button>
              </CardFooter>
            </Card>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default RecordedProductsPage;
