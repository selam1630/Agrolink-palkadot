import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, AlertTriangle, XCircle, Shield } from 'lucide-react';
import { confirmDelivery, releaseEscrow, raiseDispute, resolveDispute } from '../../lib/web3';

interface EscrowStatus {
  productId: string;
  onchainId?: number;
  escrowStatus: string;
  deliveryConfirmed: boolean;
  disputeRaised: boolean;
  escrowReleaseTime?: string;
  buyer?: string;
  seller?: string;
  price?: number;
  onchainPrice?: string;
  canConfirmDelivery: boolean;
  canReleaseEscrow: boolean;
  canRaiseDispute: boolean;
}

interface EscrowManagementProps {
  productId?: string;
  onUpdate?: () => void;
}

const EscrowManagement: React.FC<EscrowManagementProps> = ({ productId: propProductId, onUpdate }) => {
  const { t } = useTranslation();
  const { token, role } = useAuth();
  const params = useParams<{ productId: string }>();
  const productId = propProductId || params.productId || '';
  const [escrowStatus, setEscrowStatus] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      fetchEscrowStatus();
    } else {
      setLoading(false);
    }
  }, [productId, token]);

  const fetchEscrowStatus = async () => {
    if (!token || !productId) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/escrow/status/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch escrow status');
      }

      const data = await response.json();
      setEscrowStatus(data);
    } catch (err) {
      console.error('Error fetching escrow status:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to fetch escrow status');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (!escrowStatus?.onchainId) {
      toast.error('Product not on-chain');
      return;
    }

    setActionLoading('confirm');
    try {
      const res = await confirmDelivery(escrowStatus.onchainId);
      toast.success('Delivery confirmed! Funds released to seller.', {
        duration: 6000,
      });
      if (res?.explorerUrl) {
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">
              View transaction
            </a>
          </div>
        ), { duration: 10000 });
      }
      await fetchEscrowStatus();
      onUpdate?.();
    } catch (err) {
      console.error('Confirm delivery failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to confirm delivery');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReleaseEscrow = async () => {
    if (!escrowStatus?.onchainId) {
      toast.error('Product not on-chain');
      return;
    }

    setActionLoading('release');
    try {
      const res = await releaseEscrow(escrowStatus.onchainId);
      toast.success('Escrow released! Funds sent to seller.', {
        duration: 6000,
      });
      if (res?.explorerUrl) {
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">
              View transaction
            </a>
          </div>
        ), { duration: 10000 });
      }
      await fetchEscrowStatus();
      onUpdate?.();
    } catch (err) {
      console.error('Release escrow failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to release escrow');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRaiseDispute = async () => {
    if (!escrowStatus?.onchainId) {
      toast.error('Product not on-chain');
      return;
    }

    const confirmed = window.confirm('Are you sure you want to raise a dispute? This will freeze the escrow until resolved by an admin.');
    if (!confirmed) return;

    setActionLoading('dispute');
    try {
      const res = await raiseDispute(escrowStatus.onchainId);
      toast.success('Dispute raised successfully. An admin will review it.', {
        duration: 6000,
      });
      if (res?.explorerUrl) {
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">
              View transaction
            </a>
          </div>
        ), { duration: 10000 });
      }
      await fetchEscrowStatus();
      onUpdate?.();
    } catch (err) {
      console.error('Raise dispute failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to raise dispute');
    } finally {
      setActionLoading(null);
    }
  };

  const handleResolveDispute = async (favorBuyer: boolean) => {
    if (!escrowStatus?.onchainId) {
      toast.error('Product not on-chain');
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to resolve this dispute in favor of ${favorBuyer ? 'the buyer' : 'the seller'}?`
    );
    if (!confirmed) return;

    setActionLoading('resolve');
    try {
      const res = await resolveDispute(escrowStatus.onchainId, favorBuyer);
      toast.success(`Dispute resolved in favor of ${favorBuyer ? 'buyer' : 'seller'}.`, {
        duration: 6000,
      });
      if (res?.explorerUrl) {
        toast(() => (
          <div>
            <a href={res.explorerUrl} target="_blank" rel="noreferrer" className="text-blue-500 underline">
              View transaction
            </a>
          </div>
        ), { duration: 10000 });
      }
      await fetchEscrowStatus();
      onUpdate?.();
    } catch (err) {
      console.error('Resolve dispute failed:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to resolve dispute');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = () => {
    if (!escrowStatus) return null;

    const status = escrowStatus.escrowStatus?.toLowerCase();
    if (status === 'confirmed') {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" />Confirmed</Badge>;
    }
    if (status === 'released') {
      return <Badge className="bg-blue-500"><CheckCircle2 className="w-3 h-3 mr-1" />Released</Badge>;
    }
    if (status === 'disputed') {
      return <Badge className="bg-red-500"><AlertTriangle className="w-3 h-3 mr-1" />Disputed</Badge>;
    }
    if (status === 'resolved') {
      return <Badge className="bg-purple-500"><Shield className="w-3 h-3 mr-1" />Resolved</Badge>;
    }
    return <Badge className="bg-yellow-500"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
  };

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-gray-500">Loading escrow status...</p>
      </Card>
    );
  }

  if (!escrowStatus) {
    return (
      <Card className="p-6">
        <p className="text-gray-500">No escrow information available for this product.</p>
      </Card>
    );
  }

  if (!escrowStatus.onchainId) {
    return (
      <Card className="p-6">
        <p className="text-gray-500">This product is not listed on-chain. Escrow is only available for on-chain products.</p>
      </Card>
    );
  }

  const releaseTime = escrowStatus.escrowReleaseTime 
    ? new Date(escrowStatus.escrowReleaseTime)
    : null;
  const canRelease = releaseTime && releaseTime <= new Date() && !escrowStatus.disputeRaised && !escrowStatus.deliveryConfirmed;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Escrow Status
        </h3>
        {getStatusBadge()}
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Status</p>
          <p className="font-medium capitalize">{escrowStatus.escrowStatus || 'pending'}</p>
        </div>
        <div>
          <p className="text-gray-500">Price</p>
          <p className="font-medium">
            {escrowStatus.onchainPrice || escrowStatus.price ? 
              `${escrowStatus.onchainPrice || escrowStatus.price} ETH` : 
              'N/A'}
          </p>
        </div>
        {releaseTime && (
          <div>
            <p className="text-gray-500">Release Time</p>
            <p className="font-medium">{releaseTime.toLocaleString()}</p>
          </div>
        )}
        {escrowStatus.buyer && (
          <div>
            <p className="text-gray-500">Buyer</p>
            <p className="font-mono text-xs">{escrowStatus.buyer.slice(0, 10)}...{escrowStatus.buyer.slice(-8)}</p>
          </div>
        )}
      </div>

      {escrowStatus.disputeRaised && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="w-5 h-5" />
            <p className="font-semibold">Dispute Active</p>
          </div>
          <p className="text-sm text-red-600 mt-2">
            A dispute has been raised. An admin will review and resolve it.
          </p>
          {(role === 'admin' || role === 'superAdmin') && (
            <div className="mt-4 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveDispute(true)}
                disabled={actionLoading === 'resolve'}
              >
                Favor Buyer
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleResolveDispute(false)}
                disabled={actionLoading === 'resolve'}
              >
                Favor Seller
              </Button>
            </div>
          )}
        </div>
      )}

      {escrowStatus.deliveryConfirmed && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <p className="font-semibold">Delivery Confirmed</p>
          </div>
          <p className="text-sm text-green-600 mt-2">
            Buyer has confirmed delivery. Funds have been released to the seller.
          </p>
        </div>
      )}

      {!escrowStatus.deliveryConfirmed && !escrowStatus.disputeRaised && (
        <div className="space-y-2">
          {escrowStatus.canConfirmDelivery && (
            <Button
              className="w-full"
              onClick={handleConfirmDelivery}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'confirm' ? 'Confirming...' : 'Confirm Delivery'}
            </Button>
          )}

          {canRelease && (
            <Button
              variant="outline"
              className="w-full"
              onClick={handleReleaseEscrow}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'release' ? 'Releasing...' : 'Release Escrow'}
            </Button>
          )}

          {escrowStatus.canRaiseDispute && (
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleRaiseDispute}
              disabled={actionLoading !== null}
            >
              {actionLoading === 'dispute' ? 'Raising...' : 'Raise Dispute'}
            </Button>
          )}
        </div>
      )}

      {!escrowStatus.deliveryConfirmed && !escrowStatus.disputeRaised && !canRelease && !escrowStatus.canConfirmDelivery && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <Clock className="w-5 h-5" />
            <p className="font-semibold">Waiting</p>
          </div>
          <p className="text-sm text-yellow-600 mt-2">
            Escrow is active. Funds will be released automatically after 7 days if no action is taken.
          </p>
        </div>
      )}
    </Card>
  );
};

export default EscrowManagement;

