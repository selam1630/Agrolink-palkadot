import prisma from '../../prisma/prisma';
import crypto from 'crypto';

interface CertificateData {
  productId: string;
  productName: string;
  farmerName?: string;
  farmerAddress?: string;
  region?: string;
  qualityGrade?: string;
  organicCertified?: boolean;
  harvestDate?: Date;
  transactionHash?: string;
  imageUrl?: string;
  ownerAddress?: string;
  ownerId?: string;
}

/**
 * Generate a unique certificate hash for the product
 */
export function generateCertificateHash(productId: string, productName: string, farmerAddress?: string): string {
  const data = `${productId}-${productName}-${farmerAddress || ''}-${Date.now()}`;
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Create NFT certificate for a sold product
 */
export async function createNFTCertificate(data: CertificateData) {
  try {
    const certificateHash = generateCertificateHash(data.productId, data.productName, data.farmerAddress);
    
    // Generate metadata URI (in production, this would be uploaded to IPFS)
    const metadata = {
      name: `AgroLink Certificate: ${data.productName}`,
      description: `Authentic product certificate for ${data.productName} from ${data.farmerName || 'Ethiopian Farmer'}`,
      image: data.imageUrl || '',
      attributes: [
        { trait_type: 'Product Name', value: data.productName },
        { trait_type: 'Farmer', value: data.farmerName || 'Unknown' },
        { trait_type: 'Region', value: data.region || 'Ethiopia' },
        { trait_type: 'Quality Grade', value: data.qualityGrade || 'Standard' },
        { trait_type: 'Organic Certified', value: data.organicCertified ? 'Yes' : 'No' },
        { trait_type: 'Harvest Date', value: data.harvestDate?.toISOString() || 'N/A' },
      ],
      certificateHash,
      transactionHash: data.transactionHash,
      createdAt: new Date().toISOString(),
    };

    // In production, upload to IPFS and get URI
    const metadataUri = `ipfs://metadata/${certificateHash}`; // Placeholder
    
    // Generate certificate image URI (in production, generate actual certificate image)
    const imageUri = data.imageUrl || `https://agrolink.app/certificates/${certificateHash}.png`;

    const certificate = await prisma.nFTCertificate.create({
      data: {
        productId: data.productId,
        certificateHash,
        metadataUri,
        imageUri,
        productName: data.productName,
        farmerName: data.farmerName,
        farmerAddress: data.farmerAddress,
        region: data.region,
        qualityGrade: data.qualityGrade,
        organicCertified: data.organicCertified || false,
        harvestDate: data.harvestDate,
        transactionHash: data.transactionHash,
        ownerAddress: data.ownerAddress,
        ownerId: data.ownerId,
      },
    });

    console.log(`✅ Created NFT certificate for product ${data.productId}: ${certificateHash}`);
    return certificate;
  } catch (error) {
    console.error('Error creating NFT certificate:', error);
    throw error;
  }
}

/**
 * Get NFT certificate for a product
 */
export async function getNFTCertificate(productId: string) {
  return await prisma.nFTCertificate.findUnique({
    where: { productId },
    include: {
      product: true,
      owner: true,
    },
  });
}

/**
 * Get all NFT certificates for a user
 */
export async function getUserCertificates(ownerId: string) {
  return await prisma.nFTCertificate.findMany({
    where: { ownerId },
    include: {
      product: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Transfer NFT certificate ownership
 */
export async function transferCertificate(certificateId: string, newOwnerAddress: string, newOwnerId?: string) {
  return await prisma.nFTCertificate.update({
    where: { id: certificateId },
    data: {
      ownerAddress: newOwnerAddress,
      ownerId: newOwnerId,
    },
  });
}

