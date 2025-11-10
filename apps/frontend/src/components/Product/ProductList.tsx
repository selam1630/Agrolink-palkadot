import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../cart/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Plus, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import type { Variants } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface Product {
  id: string;
  name: string;
  price?: number;
  imageUrl: string;
  isSold: boolean;
  farmerName: string;
  farmerPhone: string;
    // on-chain metadata (optional)
    onchainId?: number | null;
    seller?: string | null;
    onchainPrice?: string | null; // in GLMR as string (formatted ether)
    metadataUri?: string | null;
}


const ProductList: React.FC = () => {
    const { t } = useTranslation();
    const { cartItems, addToCart } = useCart();
    const { token, loading: authLoading } = useAuth();
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const getErrorMessage = (err: unknown) => {
        if (err instanceof Error) return err.message;
        return String(err);
    };

    useEffect(() => {
        const fetchProducts = async () => {
            if (authLoading || !token) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            try {
                const response = await fetch('http://localhost:5000/api/products', {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                    },
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || (t('productList.fetchError') as string));
                }
                const data = await response.json();
setProducts(data.filter((p: Product) => !p.isSold));

            } catch (err: unknown) {
                setError(getErrorMessage(err));
            } finally {
                setIsLoading(false);
            }
        };
        fetchProducts();
    }, [token, authLoading, t]);

    const handleAddToCart = (productId: string) => {
        addToCart(productId);
    };

    const [txStatus, setTxStatus] = useState<Record<string, string>>({});
    const [txLinks, setTxLinks] = useState<Record<string, string>>({});

    const handleBuyOnChain = async (product: Product) => {
        if (!product.onchainId) return alert('This product is not listed on-chain.');
        try {
            setTxStatus(prev => ({ ...prev, [product.id]: 'connecting' }));
            const { buyOnchainProduct } = await import('../../lib/web3');
            setTxStatus(prev => ({ ...prev, [product.id]: 'sending' }));
            const res = await buyOnchainProduct(product.onchainId as number, product.onchainPrice ?? String(product.price ?? '0'));
            console.log('tx result', res);
            setTxStatus(prev => ({ ...prev, [product.id]: 'confirmed' }));
            if (res?.explorerUrl) setTxLinks(prev => ({ ...prev, [product.id]: res.explorerUrl }));
            alert('Transaction sent: ' + res.hash);
        } catch (err: unknown) {
            console.error('Buy on-chain failed', err);
            setTxStatus(prev => ({ ...prev, [product.id]: 'failed' }));
            alert('Buy failed: ' + getErrorMessage(err));
        }
    };

    const containerVariants: Variants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.15,
            },
        },
    };

    const itemVariants: Variants = {
        hidden: { y: 50, opacity: 0, scale: 0.9 },
        visible: {
            y: 0,
            opacity: 1,
            scale: 1,
            transition: {
                type: 'spring',
                stiffness: 100,
            },
        },
    };

    if (isLoading || authLoading) {
        return (
            <div className="container mx-auto px-4 py-12 text-center text-gray-500">
                <p>{t('productList.loading')}</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="container mx-auto px-4 py-12 text-center text-red-500">
                <p>{t('productList.error')}: {error}</p>
            </div>
        );
    }

    if (products.length === 0) {
        return (
            <div className="container mx-auto px-4 py-12 text-center text-gray-500">
                <p>{t('productList.noProducts')}</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-12">
            <h1 className="text-4xl font-bold text-green-800 mb-2">{t('productList.title')}</h1>
            <p className="text-xl text-gray-600 mb-8">{t('productList.description')}</p>

            <motion.div
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                {products.map((product) => {
                    const isProductInCart = cartItems.some(item => item.product.id === product.id);

                    return (
                        <motion.div
                            key={product.id}
                            variants={itemVariants}
                            whileHover={{
                                scale: 1.05,
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                            }}
                            transition={{ duration: 0.2 }}
                        >
                            <Card className="rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden flex flex-col h-full">
                                <Link to={`/products/${product.id}`} className="relative pb-[75%] block">
                                    <img
                                        src={product.imageUrl || 'https://placehold.co/400x300'}
                                        alt={t('productList.imageAlt', { productName: product.name }) as string}
                                        className="absolute inset-0 w-full h-full object-cover"
                                    />
                                </Link>
                                <CardHeader className="flex-grow p-4">
                                    <CardTitle className="text-xl font-bold">{product.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                                                                <p className="text-2xl font-bold text-green-700">
                                                                                {product.onchainPrice
                                                                                    ? `${product.onchainPrice} GLMR`
                                                                                    : product.price
                                                                                        ? t('productList.price', { price: product.price.toFixed(2) })
                                                                                        : t('productList.priceUnavailable')}
                                                                                </p>
                                    <p className="text-sm text-gray-500 mt-1">{t('productList.priceUnit')}</p>
<div className="mt-3 text-sm text-gray-700">
  <p><span className="font-semibold">{t('productList.farmer')}:</span> {product.farmerName}</p>
  <p><span className="font-semibold">{t('productList.phone')}:</span> {product.farmerPhone}</p>
</div>
                                                                                                            {product.onchainId ? (
                                                                                                                <div className="mt-3 flex items-center justify-between">
                                                                                                                    <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">On‑chain #{product.onchainId}</span>
                                                                                                                    <div className="flex items-center gap-2">
                                                                                                                        <button
                                                                                                                            className="text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded text-sm"
                                                                                                                            onClick={() => handleBuyOnChain(product)}
                                                                                                                            disabled={product.isSold || txStatus[product.id] === 'sending' || txStatus[product.id] === 'connecting'}
                                                                                                                        >
                                                                                                                            {product.isSold ? 'Sold' : (txStatus[product.id] === 'sending' || txStatus[product.id] === 'connecting') ? 'Processing...' : 'Buy on chain'}
                                                                                                                        </button>
                                                                                                                        {txStatus[product.id] ? (
                                                                                                                            <span className="text-sm text-gray-600">{txStatus[product.id]}</span>
                                                                                                                        ) : null}
                                                                                                                        {txLinks[product.id] ? (
                                                                                                                            <a href={txLinks[product.id]} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">View tx</a>
                                                                                                                        ) : null}
                                                                                                                    </div>
                                                                                                                </div>
                                                                                                            ) : null}
                                </CardContent>
                                <CardFooter className="p-4 pt-0">
                                    {isProductInCart ? (
                                        <Button
                                            className="w-full bg-gray-400 text-white rounded-xl cursor-not-allowed"
                                            disabled
                                        >
                                            <Check className="mr-2 h-4 w-4" />
                                            {t('productList.addedToCart')}
                                        </Button>
                                    ) : (
                                        <Button
                                            className="w-full bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
                                            onClick={() => handleAddToCart(product.id)}
                                        >
                                            <Plus className="mr-2 h-4 w-4" />
                                            {t('productList.addToCart')}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </motion.div>
                    );
                })}
            </motion.div>
        </div>
    );
};

export default ProductList;