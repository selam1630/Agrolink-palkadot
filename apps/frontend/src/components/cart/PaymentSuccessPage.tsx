import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const PaymentSuccessPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { token, loading: authLoading } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tx_ref = params.get("tx_ref");

    if (tx_ref) {
      console.log("Verifying payment for tx_ref:", tx_ref);
      fetch(`http://localhost:5000/api/payment/verify?tx_ref=${tx_ref}`)
        .then((res) => res.json())
        .then((data) => {
          console.log("Verification result:", data);
          if (data?.data?.status === "success") {
            setVerificationStatus("success");
          } else {
            setVerificationStatus("failed");
          }
        })
        .catch((err) => {
          console.error("Verify error:", err);
          setVerificationStatus("failed");
        })
        .finally(() => setVerifying(false));
    } else {
      console.warn("No tx_ref found in URL.");
      setVerifying(false);
    }
  }, []);
  useEffect(() => {
    if (!authLoading && token && verificationStatus === "success") {
      const timer = setTimeout(() => {
        navigate('/products');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [authLoading, token, verificationStatus, navigate]);

  return (
    <motion.div
      className="container mx-auto px-4 py-12 flex items-center justify-center min-h-[calc(100vh-8rem)]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Card className="max-w-md w-full rounded-2xl shadow-xl border-green-400 border-2 text-center">
        <CardContent className="p-8 flex flex-col items-center">
          {verifying ? (
            <>
              <motion.h1
                className="text-2xl font-semibold text-gray-700"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
              >
                Verifying your payment...
              </motion.h1>
              <motion.p
                className="text-gray-500 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                Please wait a moment.
              </motion.p>
            </>
          ) : verificationStatus === "success" ? (
            <>
              <motion.div
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 100, delay: 0.2 }}
              >
                <CheckCircle className="text-green-500 mb-4" size={96} />
              </motion.div>

              <motion.h1
                className="text-4xl font-bold text-green-700 mb-2"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                {t("paymentSuccess.title")}
              </motion.h1>

              <motion.p
                className="text-lg text-gray-600 mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                {t("paymentSuccess.message")}
              </motion.p>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
              >
                <Link to="/products">
                  <Button className="bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-300">
                    {t("paymentSuccess.backToProducts")}
                  </Button>
                </Link>
              </motion.div>
            </>
          ) : (
            <>
              <motion.h1
                className="text-3xl font-bold text-red-600 mb-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                Payment Verification Failed
              </motion.h1>
              <motion.p
                className="text-gray-600 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Please contact support if you’ve been charged but the product wasn’t marked as sold.
              </motion.p>
              <Link to="/products">
                <Button className="bg-gray-700 text-white rounded-xl hover:bg-gray-800 transition-colors duration-300">
                  Back to Products
                </Button>
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default PaymentSuccessPage;
