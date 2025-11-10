import React, { useEffect, useState } from 'react';
import { apiPath } from '../lib/api';
import { useAuth } from '../context/AuthContext';

type Product = {
  id: string;
  name: string;
  price: number;
  imageUrl?: string;
  onchainId?: number | null;
  metadataUri?: string | null;
  onchainPrice?: string | null;
};

const AdminListProducts: React.FC = () => {
  const { token } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // per-product status and explorer link
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [linkMap, setLinkMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchProducts = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(apiPath('/api/products?limit=200'), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed fetching products');
        }
        const data = await res.json();
        setProducts(data.products || data || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, [token]);

  const handleList = async (p: Product, overridePrice?: string, overrideMetadata?: string) => {
    try {
      setStatusMap((s) => ({ ...s, [p.id]: 'connecting' }));
      const { listOnchainProduct } = await import('../lib/web3');
      setStatusMap((s) => ({ ...s, [p.id]: 'sending' }));

      const metadataUri = overrideMetadata ?? p.metadataUri ?? p.imageUrl ?? '';
      const price = overridePrice ?? p.onchainPrice ?? String(p.price ?? '0');

      const res = await listOnchainProduct(metadataUri, price);
      setStatusMap((s) => ({ ...s, [p.id]: 'confirmed' }));
      if (res?.explorerUrl) setLinkMap((m) => ({ ...m, [p.id]: res.explorerUrl }));
      // watcher will update the product record; optionally refresh list
      setTimeout(() => {
        setProducts((prev) => prev.filter((x) => x.id !== p.id).concat(prev.filter((x) => x.id === p.id)));
      }, 2000);
    } catch (err: unknown) {
      setStatusMap((s) => ({ ...s, [p.id]: 'failed' }));
      console.error('List failed', err);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Admin — List Products On‑chain</h2>
        <div className="text-sm text-gray-600">Select products and list them using your wallet</div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded shadow text-center">Loading products…</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow p-4 flex flex-col">
              <div className="flex items-start gap-4">
                <img src={p.imageUrl} alt={p.name} className="w-20 h-20 object-cover rounded" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-600">Local price: ETB {p.price}</div>
                  <div className="text-sm text-gray-600">On-chain: {p.onchainId ? `#${p.onchainId}` : 'not listed'}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input defaultValue={p.onchainPrice ?? String(p.price ?? '')} className="flex-1 px-3 py-2 border rounded" placeholder="On-chain price (GLMR)" id={`price-${p.id}`} />
                <input defaultValue={p.metadataUri ?? ''} className="flex-1 px-3 py-2 border rounded" placeholder="metadata URI (optional)" id={`meta-${p.id}`} />
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    disabled={!!p.onchainId || statusMap[p.id] === 'sending'}
                    onClick={() => {
                      const priceInput = (document.getElementById(`price-${p.id}`) as HTMLInputElement)?.value;
                      const metaInput = (document.getElementById(`meta-${p.id}`) as HTMLInputElement)?.value;
                      handleList(p, priceInput, metaInput);
                    }}
                    className={`px-4 py-2 rounded font-medium ${p.onchainId ? 'bg-gray-300 text-gray-700' : 'bg-yellow-600 text-white hover:bg-yellow-700'}`}
                  >
                    {p.onchainId ? 'Listed' : (statusMap[p.id] === 'sending' ? 'Listing…' : 'List on chain')}
                  </button>
                  {statusMap[p.id] ? <span className="text-sm text-gray-600">Status: {statusMap[p.id]}</span> : null}
                </div>
                {linkMap[p.id] ? (
                  <a href={linkMap[p.id]} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">View tx</a>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminListProducts;
