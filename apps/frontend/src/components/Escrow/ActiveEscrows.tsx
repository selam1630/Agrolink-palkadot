import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EscrowProduct {
  id: string;
  name: string;
  onchainId?: number;
  escrowStatus: string;
  deliveryConfirmed: boolean;
  disputeRaised: boolean;
  escrowReleaseTime?: string;
  buyer?: string;
  seller?: string;
  price?: number;
}

const ActiveEscrows: React.FC = () => {
  const { t } = useTranslation();
  const { token, role } = useAuth();
  const [escrows, setEscrows] = useState<EscrowProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchActiveEscrows();
  }, [token, statusFilter]);

  const fetchActiveEscrows = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const url = statusFilter === 'all' 
        ? 'http://localhost:5000/api/escrow/active'
        : `http://localhost:5000/api/escrow/active?status=${statusFilter}`;
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch active escrows');
      }

      const data = await response.json();
      setEscrows(data.products || []);
    } catch (err) {
      console.error('Error fetching active escrows:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch escrows');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string, disputeRaised: boolean, deliveryConfirmed: boolean) => {
    if (disputeRaised) {
      return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Disputed</Badge>;
    }
    if (deliveryConfirmed) {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
    }
    if (status === 'released') {
      return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Released</Badge>;
    }
    return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading active escrows...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-700">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Active Escrows</h1>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'all' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'pending' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setStatusFilter('disputed')}
            className={`px-4 py-2 rounded-lg ${
              statusFilter === 'disputed' 
                ? 'bg-green-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Disputed
          </button>
        </div>
      </div>

      {escrows.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No active escrows found</p>
          <p className="text-gray-400 text-sm mt-2">
            {statusFilter !== 'all' 
              ? `No escrows with status "${statusFilter}"`
              : 'All escrows have been resolved'}
          </p>
        </Card>
      ) : (
        <div className="grid gap-4">
          {escrows.map((escrow) => (
            <Card key={escrow.id} className="p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-gray-900">{escrow.name}</h3>
                    {getStatusBadge(escrow.escrowStatus, escrow.disputeRaised, escrow.deliveryConfirmed)}
                    {escrow.onchainId && (
                      <Badge variant="outline" className="text-xs">
                        On-chain #{escrow.onchainId}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Price</p>
                      <p className="font-medium">{escrow.price ? `${escrow.price} ETH` : 'N/A'}</p>
                    </div>
                    {escrow.buyer && (
                      <div>
                        <p className="text-gray-500">Buyer</p>
                        <p className="font-mono text-xs">
                          {escrow.buyer.slice(0, 8)}...{escrow.buyer.slice(-6)}
                        </p>
                      </div>
                    )}
                    {escrow.seller && (
                      <div>
                        <p className="text-gray-500">Seller</p>
                        <p className="font-mono text-xs">
                          {escrow.seller.slice(0, 8)}...{escrow.seller.slice(-6)}
                        </p>
                      </div>
                    )}
                    {escrow.escrowReleaseTime && (
                      <div>
                        <p className="text-gray-500">Release Time</p>
                        <p className="font-medium text-xs">{formatDate(escrow.escrowReleaseTime)}</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-4">
                  <Link
                    to={`/EscrowManagement/${escrow.id}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    View Details
                  </Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ActiveEscrows;

