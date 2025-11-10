import { Request, Response } from "express";
import prisma from "../prisma/prisma";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret";

const getUserFromToken = (req: Request) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Authorization header missing or malformed");
  }
  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET) as {
    userId: string;
    role: string;
  };
  return decoded;
};
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { onchainOnly } = req.query;

    // fetch products and include user relation
    const products = await prisma.product.findMany({ include: { user: true } });

    // optionally filter to only on-chain products
    const filtered = onchainOnly === "true"
      ? products.filter(p => p.onchainId !== null && p.onchainId !== undefined)
      : products;

    // return products with on-chain fields (if present)
    const shaped = filtered.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      quantity: p.quantity,
      price: p.price,
      imageUrl: p.imageUrl,
      user: p.user,
      isSold: p.isSold ?? false,
      status: p.status ?? null,
      // on-chain metadata
      onchainId: p.onchainId ?? null,
      seller: p.seller ?? null,
      onchainPrice: p.onchainPrice ?? null,
      metadataUri: p.metadataUri ?? null,
      onchainTxHash: p.onchainTxHash ?? null,
      onchainLogIndex: p.onchainLogIndex ?? null,
      onchainBlockNumber: p.onchainBlockNumber ?? null,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    }));

    return res.status(200).json(shaped);
  } catch (error) {
    console.error("Error fetching all products:", error);
    return res.status(500).json({ error: "Server error fetching products." });
  }
};
export const getProductById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found." });
    }
    // shape response to explicitly expose on-chain fields
    const shaped = {
      id: product.id,
      name: product.name,
      description: product.description,
      quantity: product.quantity,
      price: product.price,
      imageUrl: product.imageUrl,
      user: product.user,
      isSold: product.isSold ?? false,
      status: product.status ?? null,
      onchainId: product.onchainId ?? null,
      seller: product.seller ?? null,
      onchainPrice: product.onchainPrice ?? null,
      metadataUri: product.metadataUri ?? null,
      onchainTxHash: product.onchainTxHash ?? null,
      onchainLogIndex: product.onchainLogIndex ?? null,
      onchainBlockNumber: product.onchainBlockNumber ?? null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };
    return res.status(200).json(shaped);
  } catch (error) {
    console.error("Error fetching product by ID:", error);
    return res.status(500).json({ error: "Server error fetching product." });
  }
};
export const addProduct = async (req: Request, res: Response) => {
  const { phone, name, quantity, price, description, imageUrl } = req.body;

  try {
    if (phone) {
      const user = await prisma.user.findUnique({ where: { phone } });
      if (!user) return res.status(404).json({ error: "User not found" });

      const product = await prisma.product.create({
        data: {
          name,
          quantity: parseInt(quantity, 10),
          price: parseFloat(price),
          description,
          imageUrl,
          userId: user.id,
        },
      });
      return res.status(201).json({ message: "Product added via phone", product });
    }
    const decoded = getUserFromToken(req);
    const product = await prisma.product.create({
      data: {
        name,
        quantity: parseInt(quantity, 10),
        price: parseFloat(price),
        description,
        imageUrl,
        userId: decoded.userId,
      },
    });

    return res.status(201).json({ message: "Product posted successfully", product });
  } catch (error) {
    console.error("Error adding product:", error);
    return res.status(500).json({ error: "Server error adding product." });
  }
};
export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, quantity, price, description } = req.body;

  try {
    const decoded = getUserFromToken(req);
    const product = await prisma.product.findUnique({ where: { id } });

    if (!product) return res.status(404).json({ error: "Product not found." });
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (product.userId !== decoded.userId && user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You do not have the required role or ownership." });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        name: name ?? product.name,
        quantity: quantity ? parseInt(quantity, 10) : product.quantity,
        price: price ? parseFloat(price) : product.price,
        description: description ?? product.description,
      },
    });

    return res.status(200).json({ message: "Product updated successfully", product: updated });
  } catch (error) {
    console.error("Error updating product:", error);
    return res.status(500).json({ error: "Server error updating product." });
  }
};
export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const decoded = getUserFromToken(req);
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) return res.status(404).json({ error: "Product not found." });
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (product.userId !== decoded.userId && user?.role !== "admin") {
      return res.status(403).json({ error: "Forbidden: You do not have the required role or ownership." });
    }

    await prisma.product.delete({ where: { id } });
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ error: "Server error deleting product." });
  }
};
