import React, { useState, useEffect } from "react";
import toast from 'react-hot-toast';
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ShoppingCart, ArrowLeft, Check, Phone, Shield, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "../cart/CartContext";
import { useAuth } from "../../context/AuthContext";

type Product = {
  id: string;
  name: string;
  quantity: number;
  description?: string;
  price: number;
  imageUrl: string;
  user: {
    name: string;
    phone: string;
  };
  // on-chain metadata
  onchainId?: number | null;
  seller?: string | null;
  onchainPrice?: string | null; // formatted ether string (GLMR)
  metadataUri?: string | null;
  isSold?: boolean;
};

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { cartItems, addToCart } = useCart();
  const { token, loading: authLoading, role } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getErrorMessage = (err: unknown) => {
    if (err instanceof Error) return err.message;
    return String(err);
  };

  useEffect(() => {
    const fetchProduct = async () => {
      if (authLoading || !token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `http://localhost:5000/api/products/${id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || "Failed to fetch product details."
          );
        }
        const data = await response.json();
        setProduct(data);
      } catch (err: unknown) {
        const msg = getErrorMessage(err);
        setError(msg);
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id, token, authLoading]);

  const handleAddToCart = () => {
    if (product) {
      addToCart(product.id);
      console.log(`${product.name} added to cart!`);
    }
  };

  const [txStatus, setTxStatus] = useState<'idle'|'connecting'|'sending'|'confirmed'|'failed'>('idle');
  const [txLink, setTxLink] = useState<string | null>(null);

  const [listStatus, setListStatus] = useState<'idle'|'connecting'|'sending'|'confirmed'|'failed'>('idle');
  const [listLink, setListLink] = useState<string | null>(null);

  const handleBuyOnChain = async () => {
    if (!product?.onchainId) {
      toast.error('This product is not listed on-chain.');
      return;
    }
    try {
      setTxStatus('connecting');
      const { buyOnchainProduct } = await import('../../lib/web3');
      setTxStatus('sending');
      const res = await buyOnchainProduct(product.onchainId as number, product.onchainPrice ?? String(product.price ?? '0'));
      console.log('tx result', res);
      setTxStatus('confirmed');
      if (res?.explorerUrl) setTxLink(res.explorerUrl);
      toast.success('Buy transaction confirmed', {
        duration: 6000,
      });
      toast('View transaction', {
        icon: '🔗',
        duration: 10000,
        action: {
          // react-hot-toast doesn't support action in this way; instead provide link in subsequent toast
        }
      });
      if (res?.explorerUrl) {
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">View tx</a>
          </div>
        ), { duration: 10000 });
      }
    } catch (err: unknown) {
      console.error('Buy on-chain failed', err);
      setTxStatus('failed');
      toast.error('Buy failed: ' + getErrorMessage(err));
    }
  };

  const handleListOnChain = async () => {
    if (!product) return;
    try {
      setListStatus('connecting');
      const { listOnchainProduct } = await import('../../lib/web3');
      setListStatus('sending');
      const metadataUri = product.metadataUri || product.imageUrl || '';
      const price = product.onchainPrice ?? String(product.price ?? '0');
      const res = await listOnchainProduct(metadataUri, price);
      setListStatus('confirmed');
      if (res?.explorerUrl) setListLink(res.explorerUrl);
      toast.success('List transaction confirmed', { duration: 6000 });
      if (res?.explorerUrl) {
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">View list tx</a>
          </div>
        ), { duration: 10000 });
      }
    } catch (err: unknown) {
      console.error('List on-chain failed', err);
      setListStatus('failed');
      toast.error('List failed: ' + getErrorMessage(err));
    }
  };

  if (loading || authLoading) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <p>{t("product.detail.loading")}</p>
      </div>
    );
  }
  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-12 text-center text-red-500">
        <h3 className="text-2xl font-semibold mb-2">
          {t("product.detail.notFound")}
        </h3>
        <p>{t("product.detail.errorMessage", { error })}</p>
        <Link
          to="/products"
          className="mt-4 inline-flex items-center gap-2 text-green-600 hover:text-green-800"
        >
          <ArrowLeft size={16} /> {t("product.detail.backToProducts")}
        </Link>
      </div>
    );
  }

  const isProductInCart = cartItems.some(
    (item) => item.product.id === product.id
  );

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="md:flex">
          <div className="md:flex-shrink-0">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-96 w-full object-cover md:w-96"
            />
          </div>
          <div className="p-8 flex-1 flex flex-col">
            {/* Product Info */}
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {product.name}
            </h1>
            <p className="text-2xl font-bold text-green-700 mb-4">
              {product.onchainPrice ? `${product.onchainPrice} GLMR` : `ETB ${product.price.toFixed(2)}`}
            </p>
            <p className="text-gray-600 mb-6 flex-1">
              {product.description || t("product.detail.noDescription")}
            </p>

            {/* Stock Info */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-gray-700">
                  {t("product.detail.inStock")}:
                </span>
                <span className="text-lg font-bold text-green-600">
                  {product.quantity}
                </span>
              </div>
            </div>

            {/* Farmer Info */}
            <div className="bg-green-50 p-4 rounded-xl border border-green-200 mb-6">
              <h2 className="text-xl font-semibold text-green-700 mb-2">
                {t("farmer")} {t("product.detail.info")}
              </h2>
              <p className="text-gray-800 font-medium">
                👩‍🌾 {product.user?.name || t("product.detail.unknownFarmer")}
              </p>
              <p className="text-gray-600 flex items-center gap-2">
                <Phone size={16} /> {product.user?.phone || "-"}
              </p>
              <p className="text-gray-500 mt-2 italic">
                {t("product.detail.farmerDescription")}
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-col gap-4">
              {isProductInCart ? (
                <Button
                  className="flex items-center gap-2 w-full bg-gray-400 text-white rounded-xl cursor-not-allowed"
                  disabled
                >
                  <Check size={20} /> {t("cart.addedToCart")}
                </Button>
              ) : (
                <Button
                  className="flex items-center gap-2 w-full bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors duration-300 font-medium"
                  onClick={handleAddToCart}
                >
                  <ShoppingCart size={20} /> {t("product.detail.addToCart")}
                </Button>
              )}
              {/* Admin: List on chain if not already listed */}
              {role === 'admin' && !product?.onchainId ? (
                <>
                  <Button
                    className="flex items-center gap-2 w-full bg-yellow-600 text-white rounded-xl hover:bg-yellow-700 transition-colors duration-300 font-medium"
                    onClick={handleListOnChain}
                    disabled={listStatus !== 'idle'}
                  >
                    {listStatus === 'sending' || listStatus === 'connecting' ? 'Listing...' : 'List on chain'}
                  </Button>
                  {listStatus !== 'idle' ? (
                    <div className="text-sm text-gray-600 mt-2">Status: {listStatus}</div>
                  ) : null}
                  {listLink ? (
                    <div className="text-sm mt-2">
                      <a href={listLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">View list tx</a>
                    </div>
                  ) : null}
                </>
              ) : null}
              {product?.onchainId ? (
                <>
                  <Button
                    className="flex items-center gap-2 w-full bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors duration-300 font-medium"
                    onClick={handleBuyOnChain}
                    disabled={product.isSold || txStatus !== 'idle'}
                  >
                    {product.isSold ? 'Sold' : (txStatus === 'connecting' || txStatus === 'sending') ? 'Processing...' : 'Buy on chain'}
                  </Button>
                  {txStatus !== 'idle' ? (
                    <div className="text-sm text-gray-600 mt-2">Status: {txStatus}</div>
                  ) : null}
                  {txLink ? (
                    <div className="text-sm mt-2">
                      <a href={txLink} target="_blank" rel="noreferrer" className="text-blue-600 underline">View transaction</a>
                    </div>
                  ) : null}
                </>
              ) : null}
              
              {/* View Escrow for sold products */}
              {product?.isSold && product?.onchainId ? (
                <Link to={`/EscrowManagement/${product.id}`}>
                  <Button
                    className="w-full bg-blue-600 text-white hover:bg-blue-700 transition-colors duration-300"
                  >
                    <Shield size={16} className="mr-2" />
                    View Escrow Status
                  </Button>
                </Link>
              ) : null}
              
              {/* View Supply Chain Traceability */}
              {product?.isSold ? (
                <Link to={`/supply-chain/${product.id}`}>
                  <Button
                    className="w-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-300"
                  >
                    <Package size={16} className="mr-2" />
                    Track Supply Chain
                  </Button>
                </Link>
              ) : null}
              
              <Link to="/products">
                <Button
                  variant="outline"
                  className="w-full text-green-600 border-green-600 hover:bg-green-50 transition-colors duration-300"
                >
                  <ArrowLeft size={16} className="mr-2" />{" "}
                  {t("product.detail.backToProducts")}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
