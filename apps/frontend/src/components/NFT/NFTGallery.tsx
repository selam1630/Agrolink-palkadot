import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, Award, MapPin, Calendar, ExternalLink } from 'lucide-react';
import toast from 'react-hot-toast';

interface NFTCertificate {
  id: string;
  productId: string;
  certificateHash: string;
  metadataUri?: string;
  imageUri?: string;
  productName: string;
  farmerName?: string;
  farmerAddress?: string;
  region?: string;
  qualityGrade?: string;
  organicCertified: boolean;
  harvestDate?: string;
  transactionHash?: string;
  createdAt: string;
  product?: {
    imageUrl?: string;
  };
}

const NFTGallery: React.FC = () => {
  const { token } = useAuth();
  const [certificates, setCertificates] = useState<NFTCertificate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCertificates();
  }, [token]);

  const fetchCertificates = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/nft/user/certificates', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch certificates');
      }

      const data = await response.json();
      setCertificates(data.certificates || []);
    } catch (error) {
      console.error('Error fetching certificates:', error);
      toast.error('Failed to load NFT certificates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p className="text-gray-500">Loading NFT certificates...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-8 h-8 text-green-600" />
        <h1 className="text-2xl font-bold text-gray-900">My NFT Certificates</h1>
      </div>

      {certificates.length === 0 ? (
        <Card className="p-8 text-center">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No NFT certificates yet</p>
          <p className="text-gray-400 text-sm mt-2">
            Certificates are automatically generated when you purchase products on-chain
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {certificates.map((cert) => (
            <Card key={cert.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div className="relative h-48 bg-gradient-to-br from-green-100 to-green-200">
                {cert.product?.imageUrl ? (
                  <img
                    src={cert.product.imageUrl}
                    alt={cert.productName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <Shield className="w-16 h-16 text-green-600" />
                  </div>
                )}
                {cert.organicCertified && (
                  <Badge className="absolute top-2 right-2 bg-green-600">
                    Organic
                  </Badge>
                )}
              </div>
              
              <div className="p-4">
                <h3 className="font-semibold text-lg mb-2">{cert.productName}</h3>
                
                <div className="space-y-2 text-sm">
                  {cert.farmerName && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Award className="w-4 h-4" />
                      <span>Farmer: {cert.farmerName}</span>
                    </div>
                  )}
                  
                  {cert.region && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{cert.region}</span>
                    </div>
                  )}
                  
                  {cert.qualityGrade && (
                    <Badge variant="outline">Grade: {cert.qualityGrade}</Badge>
                  )}
                  
                  {cert.harvestDate && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Harvested: {new Date(cert.harvestDate).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-gray-500 font-mono break-all">
                    Hash: {cert.certificateHash.slice(0, 16)}...
                  </p>
                  {cert.transactionHash && (
                    <a
                      href={`#`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-green-600 hover:underline flex items-center gap-1 mt-1"
                    >
                      View Transaction <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default NFTGallery;

