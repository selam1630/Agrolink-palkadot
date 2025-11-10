import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiPath } from '../lib/api';

type Tx = {
  id: string;
  txHash: string;
  onchainProductId: number;
  buyer: string;
  seller?: string | null;
  amount: string;
  blockNumber?: number | null;
  logIndex?: number | null;
  createdAt?: string | null;
};

const AdminTransactions: React.FC = () => {
  const { token } = useAuth();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTxs = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const res = await fetch(apiPath('/api/onchain/transactions?limit=200'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        // If the server responds with non-JSON (HTML error page, etc.), avoid crashing
        const contentType = res.headers.get('content-type') || '';
        if (!res.ok) {
          // try to parse a JSON error body, otherwise include text
          if (contentType.includes('application/json')) {
            const err = await res.json();
            throw new Error(err.error || 'Failed fetching transactions');
          }
          const text = await res.text();
          throw new Error(`Request failed: ${res.status} ${res.statusText} - ${text.slice(0, 300)}`);
        }

        let data: { transactions?: Tx[] } | undefined;
        try {
          data = (await res.json()) as { transactions?: Tx[] };
        } catch {
          const text = await res.text();
          throw new Error(`Invalid JSON response (content-type=${contentType}): ${text.slice(0, 300)}`);
        }
        setTxs(data.transactions || []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    };
    fetchTxs();
  }, [token]);

  const explorerBase = (import.meta.env.VITE_TX_EXPLORER_URL as string) || '';
  const shorten = (s?: string | null, len = 10) => {
    if (!s) return '-';
    if (s.length <= len) return s;
    return `${s.slice(0, len)}...${s.slice(-4)}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // small visual acknowledgement could be added later (toast)
    } catch {
      // ignore, non-critical
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold">On-chain Transactions</h2>
        <div className="text-sm text-gray-600">Displaying latest {txs.length} transactions</div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded shadow text-center">Loading transactions…</div>
      ) : error ? (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>
      ) : txs.length === 0 ? (
        <div className="p-6 bg-white rounded shadow text-center">No transactions found.</div>
      ) : (
        <div className="grid gap-4">
          {txs.map((t) => (
            <div key={t.id} className="bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow overflow-hidden">
              <div className="p-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900 truncate">{shorten(t.txHash, 12)}</h3>
                    <span className="text-xs text-gray-500">{t.onchainProductId ? `Product #${t.onchainProductId}` : ''}</span>
                  </div>
                  <div className="mt-2 text-sm text-gray-600">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Buyer</span>
                        <span className="font-mono text-sm text-gray-800">{shorten(t.buyer, 12)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Seller</span>
                        <span className="font-mono text-sm text-gray-800">{t.seller ? shorten(t.seller, 12) : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Amount</span>
                        <span className="font-medium text-gray-900">{t.amount} GLMR</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-2">
                    {explorerBase ? (
                      <a href={`${explorerBase.replace(/\/$/, '')}/${t.txHash}`} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                        View on explorer
                      </a>
                    ) : null}
                    <button
                      onClick={() => copyToClipboard(t.txHash)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                      title="Copy tx hash"
                    >
                      Copy
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">Block {t.blockNumber ?? '-'}</span>
                    <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded">Log {t.logIndex ?? '-'}</span>
                  </div>

                  <div className="text-xs text-gray-500">{t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</div>
                </div>
              </div>

              <div className="border-t border-gray-50 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">Tx Hash</span>
                    <span className="font-mono text-xs text-gray-800">{t.txHash}</span>
                  </div>
                  <div className="text-xs text-gray-500">ID: {t.id}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminTransactions;
