import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
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
  // quick-list form state
  const [quickName, setQuickName] = useState('');
  const [quickPrice, setQuickPrice] = useState('0.1');
  const [quickMetadata, setQuickMetadata] = useState('');
  const [quickStatus, setQuickStatus] = useState<'idle'|'sending'|'confirmed'|'failed'>('idle');
  const [quickLink, setQuickLink] = useState<string | null>(null);

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
      if (res?.explorerUrl) {
        setLinkMap((m) => ({ ...m, [p.id]: res.explorerUrl }));
        toast.success('Listed on-chain: tx pending/confirmed', { duration: 6000 });
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">View tx</a>
          </div>
        ), { duration: 10000 });
      }
      // watcher will update the product record; optionally refresh list
      setTimeout(() => {
        // refresh products after a short delay to allow watcher to ingest
        (async () => {
          if (!token) return;
          try {
            const res = await fetch(apiPath('/products?limit=200'), { headers: { Authorization: `Bearer ${token}` } });
            if (res.ok) {
              const data = await res.json();
              setProducts(data.products || data || []);
            }
          } catch {
            // ignore
          }
        })();
      }, 4000);
    } catch (err: unknown) {
      setStatusMap((s) => ({ ...s, [p.id]: 'failed' }));
      console.error('List failed', err);
      toast.error('Listing failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  const handleQuickList = async () => {
    try {
      setQuickStatus('sending');
      const { listOnchainProduct } = await import('../lib/web3');
      const res = await listOnchainProduct(quickMetadata || '', quickPrice || '0');
      setQuickStatus('confirmed');
      if (res?.explorerUrl) {
        setQuickLink(res.explorerUrl);
        toast.success('Quick-list submitted', { duration: 6000 });
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">View tx</a>
          </div>
        ), { duration: 10000 });
        // optimistic UI: insert a temporary product row until watcher ingests the event
        const tempId = `optimistic-${Date.now()}`;
        const optimisticProduct: Product = {
          id: tempId,
          name: quickName || `onchain#pending`,
          price: Number(quickPrice) || 0,
          imageUrl: '',
          onchainId: undefined,
          metadataUri: quickMetadata || undefined,
          onchainPrice: quickPrice || undefined,
        };
        setProducts((prev) => [optimisticProduct, ...prev]);
      }
      // refresh products after a short delay to let watcher ingest the event
      setTimeout(async () => {
        if (!token) return;
        try {
          const r = await fetch(apiPath('/products?limit=200'), { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) {
            const data = await r.json();
            setProducts(data.products || data || []);
          }
        } catch {
          // ignore
        }
      }, 4000);
    } catch (err) {
      setQuickStatus('failed');
      console.error('Quick list failed', err);
      toast.error('Quick list failed: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">Admin — List Products On‑chain</h2>
        <div className="text-sm text-gray-600">Select products and list them using your wallet</div>
      </div>

      {/* Quick list form: allows admin to create an on-chain listing directly (watcher will ingest and create DB record) */}
      <div className="mb-6 p-4 bg-white rounded shadow">
        <h3 className="font-medium mb-2">Quick list a new on-chain product</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input value={quickName} onChange={(e) => setQuickName(e.target.value)} placeholder="Name (optional)" className="px-3 py-2 border rounded" />
          <input value={quickPrice} onChange={(e) => setQuickPrice(e.target.value)} placeholder="Price (GLMR)" className="px-3 py-2 border rounded" />
          <input value={quickMetadata} onChange={(e) => setQuickMetadata(e.target.value)} placeholder="Metadata URI (ipfs://...)" className="px-3 py-2 border rounded" />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button onClick={handleQuickList} disabled={quickStatus === 'sending'} className="px-4 py-2 bg-green-600 text-white rounded">
            {quickStatus === 'sending' ? 'Listing…' : 'List on chain'}
          </button>
          {quickStatus !== 'idle' ? <span className="text-sm text-gray-600">Status: {quickStatus}</span> : null}
          {quickLink ? <a href={quickLink} target="_blank" rel="noreferrer" className="text-blue-600 underline text-sm">View tx</a> : null}
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded shadow text-center">Loading products…</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {products.map((p) => (
            <div key={p.id} className="bg-white rounded-lg shadow p-4 flex flex-col h-full min-h-[180px] overflow-hidden">
              <div className="flex items-start gap-4">
                <img src={p.imageUrl} alt={p.name} className="flex-none w-24 h-24 object-cover rounded" />
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-600">Local price: ETB {p.price}</div>
                  <div className="text-sm text-gray-600">On-chain: {p.onchainId ? `#${p.onchainId}` : 'not listed'}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-col md:flex-row items-stretch gap-2">
                <input defaultValue={p.onchainPrice ?? String(p.price ?? '')} className="w-full md:flex-1 px-3 py-2 border rounded" placeholder="On-chain price (GLMR)" id={`price-${p.id}`} />
                <input defaultValue={p.metadataUri ?? ''} className="w-full md:flex-1 px-3 py-2 border rounded" placeholder="metadata URI (optional)" id={`meta-${p.id}`} />
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
