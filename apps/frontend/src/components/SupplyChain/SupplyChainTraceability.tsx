import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  MapPin, 
  Package, 
  Truck, 
  Warehouse, 
  CheckCircle2, 
  Clock, 
  Thermometer, 
  Droplets,
  Link as LinkIcon,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SupplyChainEvent {
  id: string;
  eventType: string;
  location?: string;
  description?: string;
  verified: boolean;
  verificationTxHash?: string;
  createdAt: string;
}

interface SupplyChainReading {
  id: string;
  readingType: string;
  value: number;
  location?: string;
  timestamp: string;
}

interface SupplyChainTrace {
  id: string;
  productId: string;
  onchainId?: number;
  farmLocation?: string;
  farmRegion?: string;
  harvestDate?: string;
  currentStage: string;
  currentLocation?: string;
  estimatedDelivery?: string;
  verificationHash?: string;
  verifiedOnChains: string[];
  product: {
    id: string;
    name: string;
    onchainId?: number;
    farmerName?: string;
    buyer?: string;
    seller?: string;
  };
  events: SupplyChainEvent[];
  readings: SupplyChainReading[];
}

const SupplyChainTraceability: React.FC = () => {
  const { t } = useTranslation();
  const { token, role } = useAuth();
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [trace, setTrace] = useState<SupplyChainTrace | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (productId && token) {
      fetchTrace();
    }
  }, [productId, token]);

  const fetchTrace = async () => {
    if (!productId || !token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/supply-chain/trace/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          // Trace doesn't exist yet, try to initialize it
          await initializeTrace();
          return;
        }
        throw new Error('Failed to fetch supply chain trace');
      }

      const data = await response.json();
      setTrace(data);
    } catch (err) {
      console.error('Error fetching trace:', err);
      toast.error('Failed to load supply chain trace');
    } finally {
      setLoading(false);
    }
  };

  const initializeTrace = async () => {
    if (!productId || !token) return;

    try {
      const response = await fetch('http://localhost:5000/api/supply-chain/initialize', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize trace');
      }

      const data = await response.json();
      setTrace(data);
      toast.success('Supply chain trace initialized');
    } catch (err) {
      console.error('Error initializing trace:', err);
      toast.error('Failed to initialize supply chain trace');
    }
  };

  const updateStage = async (stage: string) => {
    if (!productId || !token) return;

    setUpdating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/supply-chain/update-stage/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          stage,
          description: `Product moved to ${stage} stage`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update stage');
      }

      const data = await response.json();
      setTrace(data.trace);
      toast.success(`Stage updated to ${stage}`);
    } catch (err) {
      console.error('Error updating stage:', err);
      toast.error('Failed to update stage');
    } finally {
      setUpdating(false);
    }
  };

  const simulateUpdate = async () => {
    if (!productId || !token) return;

    setUpdating(true);
    try {
      const response = await fetch(`http://localhost:5000/api/supply-chain/simulate-update/${productId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to simulate update');
      }

      const data = await response.json();
      setTrace(data.trace);
      toast.success('Tracking data updated');
    } catch (err) {
      console.error('Error simulating update:', err);
      toast.error('Failed to simulate update');
    } finally {
      setUpdating(false);
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'harvested':
        return <Package className="w-5 h-5" />;
      case 'packaged':
        return <Package className="w-5 h-5" />;
      case 'shipped':
      case 'in_transit':
        return <Truck className="w-5 h-5" />;
      case 'at_warehouse':
        return <Warehouse className="w-5 h-5" />;
      case 'delivered':
        return <CheckCircle2 className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'harvested':
        return 'bg-green-500';
      case 'packaged':
        return 'bg-blue-500';
      case 'shipped':
      case 'in_transit':
        return 'bg-yellow-500';
      case 'at_warehouse':
        return 'bg-purple-500';
      case 'delivered':
        return 'bg-green-600';
      default:
        return 'bg-gray-500';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading supply chain trace...</p>
      </div>
    );
  }

  if (!trace) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <p className="text-gray-500 mb-4">No supply chain trace found for this product.</p>
          <Button onClick={initializeTrace}>Initialize Trace</Button>
        </Card>
      </div>
    );
  }

  const stages = ['harvested', 'packaged', 'shipped', 'in_transit', 'at_warehouse', 'delivered'];
  const currentStageIndex = stages.indexOf(trace.currentStage);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Supply Chain Traceability</h1>
            <p className="text-gray-500">{trace.product.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={simulateUpdate}
            disabled={updating}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${updating ? 'animate-spin' : ''}`} />
            Simulate Update
          </Button>
        </div>
      </div>

      {/* Product Info */}
      <Card className="p-6 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-gray-500 text-sm">Product</p>
            <p className="font-semibold">{trace.product.name}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Farmer</p>
            <p className="font-semibold">{trace.product.farmerName || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Current Stage</p>
            <Badge className={getStageColor(trace.currentStage)}>
              {trace.currentStage.replace('_', ' ').toUpperCase()}
            </Badge>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Harvest Date</p>
            <p className="font-semibold">{formatDate(trace.harvestDate)}</p>
          </div>
        </div>
      </Card>

      {/* Cross-Chain Verification */}
      {trace.verifiedOnChains && trace.verifiedOnChains.length > 0 && (
        <Card className="p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <LinkIcon className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold">Cross-Chain Verification</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {trace.verifiedOnChains.map((chain) => (
              <Badge key={chain} className="bg-blue-500">
                {chain.toUpperCase()}
              </Badge>
            ))}
          </div>
          {trace.verificationHash && (
            <p className="text-xs text-gray-500 mt-2 font-mono">
              Hash: {trace.verificationHash.slice(0, 20)}...
            </p>
          )}
        </Card>
      )}

      {/* Supply Chain Timeline */}
      <Card className="p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Supply Chain Journey</h2>
        <div className="relative">
          {stages.map((stage, index) => {
            const isCompleted = index <= currentStageIndex;
            const isCurrent = index === currentStageIndex;
            const event = trace.events?.find(e => e.eventType === stage);

            return (
              <div key={stage} className="flex items-start gap-4 mb-6">
                <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                  isCompleted ? getStageColor(stage) : 'bg-gray-300'
                } text-white`}>
                  {getStageIcon(stage)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold capitalize">{stage.replace('_', ' ')}</h3>
                    {isCurrent && <Badge className="bg-yellow-500">Current</Badge>}
                    {event?.verified && (
                      <Badge className="bg-green-500 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </Badge>
                    )}
                  </div>
                  {event && (
                    <div className="text-sm text-gray-600">
                      {event.location && (
                        <p className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {event.location}
                        </p>
                      )}
                      {event.description && <p>{event.description}</p>}
                      <p className="text-xs text-gray-500 mt-1">{formatDate(event.createdAt)}</p>
                    </div>
                  )}
                  {!event && isCompleted && (
                    <p className="text-sm text-gray-500">Stage completed</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Sensor Readings */}
      {trace.readings && trace.readings.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Temperature Readings */}
          {trace.readings.filter(r => r.readingType === 'temperature').length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Thermometer className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold">Temperature Monitoring</h2>
              </div>
              <div className="space-y-2">
                {trace.readings
                  .filter(r => r.readingType === 'temperature')
                  .slice(0, 10)
                  .map((reading) => (
                    <div key={reading.id} className="flex justify-between items-center text-sm">
                      <span>{reading.value}°C</span>
                      <span className="text-gray-500">{formatDate(reading.timestamp)}</span>
                    </div>
                  ))}
              </div>
            </Card>
          )}

          {/* Humidity Readings */}
          {trace.readings.filter(r => r.readingType === 'humidity').length > 0 && (
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-semibold">Humidity Monitoring</h2>
              </div>
              <div className="space-y-2">
                {trace.readings
                  .filter(r => r.readingType === 'humidity')
                  .slice(0, 10)
                  .map((reading) => (
                    <div key={reading.id} className="flex justify-between items-center text-sm">
                      <span>{reading.value}%</span>
                      <span className="text-gray-500">{formatDate(reading.timestamp)}</span>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Admin Controls */}
      {(role === 'admin' || role === 'superAdmin') && (
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Admin Controls</h2>
          <div className="flex flex-wrap gap-2">
            {stages.map((stage) => (
              <Button
                key={stage}
                variant="outline"
                onClick={() => updateStage(stage)}
                disabled={updating || trace.currentStage === stage}
                size="sm"
              >
                Set to {stage.replace('_', ' ')}
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SupplyChainTraceability;

