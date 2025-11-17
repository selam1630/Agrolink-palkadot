import { Request, Response } from "express";
import axios from "axios";
import prisma from "../prisma/prisma";
import { sendSMSNotification } from "../src/utils/sendFarmerNotification";
import { generateVoiceFromText } from "../src/utils/voiceGenerator";


const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || "";
const CHAPA_VERIFY_URL = "https://api.chapa.co/v1/transaction/verify/";
const CHAPA_INITIATE_URL = "https://api.chapa.co/v1/transaction/initialize";
export const createPayment = async (req: Request, res: Response) => {
  const { amount, currency } = req.body;
  const userId = req.user?.id;

  if (!userId) return res.status(401).json({ error: "User not authenticated." });
  if (!amount) return res.status(400).json({ error: "Missing payment amount." });

  try {
    const cartItems = await prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    if (cartItems.length === 0) return res.status(400).json({ error: "Cart is empty." });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.phone) return res.status(400).json({ error: "User phone number not found." });

    const txRef = `order_${Date.now()}`;
    await prisma.$transaction(async (prisma) => {
      const newOrder = await prisma.order.create({
        data: {
          userId,
          status: "pending",
          txRef,
          orderItems: {
            createMany: {
              data: cartItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                priceAtTime: item.product.price || 0,
              })),
            },
          },
        },
      });

      await prisma.transaction.create({
        data: {
          txRef,
          amount: parseFloat(amount),
          userId,
          orderId: newOrder.id,
          status: "pending",
        },
      });

      await prisma.cartItem.deleteMany({ where: { userId } });
    });
    const response = await axios.post(
      CHAPA_INITIATE_URL,
      {
        amount,
        currency,
        phone_number: user.phone,
        first_name: user.name?.split(" ")[0] || "Customer",
        last_name: user.name?.split(" ")[1] || "",
        tx_ref: txRef,
        callback_url: "http://localhost:5000/api/payment/verify",
        return_url: "http://localhost:5173/payment-success?tx_ref=" + txRef,
        customizations: {
          title: "Your Store Name",
          description: "Payment for your shopping cart",
        },
      },
      {
        headers: {
          Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    return res.status(200).json(response.data);
  } catch (err: any) {
    console.error("Chapa payment error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to initiate payment." });
  }
};
export const getProducts = async (req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isSold: false },
    });
    return res.status(200).json(products);
  } catch (err: any) {
    console.error("Error fetching products:", err.message);
    return res.status(500).json({ error: "Failed to fetch products." });
  }
};
export const verifyPayment = async (req: Request, res: Response) => {
  const { tx_ref } = req.query;
  if (!tx_ref) return res.status(400).json({ error: "Transaction reference missing" });

  try {
    const response = await axios.get(`${CHAPA_VERIFY_URL}${tx_ref}`, {
      headers: { Authorization: `Bearer ${CHAPA_SECRET_KEY}` },
    });

    const paymentStatus = response.data.data.status;
    const transaction = await prisma.transaction.findUnique({
      where: { txRef: tx_ref as string },
      include: {
        order: { include: { orderItems: { include: { product: true } } } },
      },
    });

    if (!transaction || !transaction.order)
      return res.status(404).json({ error: "Transaction or order not found." });

    if (paymentStatus === "success" && transaction.status === "pending") {
      const productIds = transaction.order.orderItems.map((item) => item.productId);

      // ✅ Mark products as sold and transaction as successful
      await prisma.$transaction([
        prisma.transaction.update({
          where: { txRef: tx_ref as string },
          data: { status: "successful" },
        }),
        prisma.order.update({
          where: { id: transaction.orderId },
          data: { status: "completed" },
        }),
        ...productIds.map((id) =>
          prisma.product.update({
            where: { id },
            data: { isSold: true, status: "sold" },
          })
        ),
      ]);

      console.log("✅ Payment verified and products marked as sold.");
      
      // Initialize supply chain traces for sold products
      for (const productId of productIds) {
        try {
          const product = await prisma.product.findUnique({
            where: { id: productId } as any,
            include: { user: true }
          });

          if (product) {
            // Check if trace already exists
            const existingTrace = await prisma.supplyChainTrace.findUnique({
              where: { productId } as any
            });

            if (!existingTrace) {
              // Generate verification hash for cross-chain verification
              const crypto = require('crypto');
              const verificationData = {
                productId: product.id,
                onchainId: product.onchainId,
                timestamp: new Date().toISOString(),
                seller: product.seller || product.user?.walletAddress
              };
              const verificationHash = crypto
                .createHash('sha256')
                .update(JSON.stringify(verificationData))
                .digest('hex');

              // Create supply chain trace
              await prisma.supplyChainTrace.create({
                data: {
                  productId: product.id,
                  onchainId: product.onchainId || undefined,
                  farmRegion: product.user?.name || 'Unknown',
                  harvestDate: new Date(),
                  currentStage: 'harvested',
                  verificationHash,
                  verifiedOnChains: ['polkadot'],
                  events: {
                    create: {
                      eventType: 'harvested',
                      location: product.user?.name || 'Farm',
                      description: `Product harvested by ${product.farmerName || 'Farmer'}`,
                      verified: true,
                      metadata: {
                        farmerName: product.farmerName,
                        farmerPhone: product.farmerPhone,
                        productName: product.name
                      }
                    }
                  }
                }
              });
              console.log(`✅ Supply chain trace initialized for product ${productId}`);
            }
          }
        } catch (traceErr) {
          console.error(`Error initializing supply chain trace for product ${productId}:`, traceErr);
          // Don't fail the payment verification if trace initialization fails
        }
      }

      for (const item of transaction.order.orderItems) {
        const product = item.product;
        if (product.farmerPhone) {
          const farmerName = product.farmerName || "Farmer";
          const productName = product.name || "your product";
          const messageText = `Hello ${farmerName}, your product "${productName}" has been successfully sold. Please check your account for updates.`;
          const voiceFileName = `sale_alert_${product.id}_${Date.now()}`;
          const voiceUrl = await generateVoiceFromText(
            messageText,
            "en", 
            voiceFileName
          );
          const finalMessage = voiceUrl
            ? `${messageText}\n\n🔊 Listen to alert: ${voiceUrl}`
            : messageText;
          await sendSMSNotification(product.farmerPhone, finalMessage);
        }
      }
    }

    return res.status(200).json(response.data);
  } catch (err: any) {
    console.error("❌ Chapa verification error:", err.response?.data || err.message);
    return res.status(500).json({ error: "Failed to verify payment." });
  }
};
