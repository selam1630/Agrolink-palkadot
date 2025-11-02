// controllers/farmerProductRecord.controller.ts
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
  return jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
};

// ------------------- RECORD PRODUCT -------------------
export const recordFarmerProduct = async (req: Request, res: Response) => {
  const { farmerName, farmerPhone, bankAccount, productName, productImage, amount, pricePerUnit } = req.body;

  try {
    const decoded = getUserFromToken(req);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Only admins can record farmer products." });
    }

    const record = await prisma.farmerProductRecord.create({
      data: {
        farmerName,
        farmerPhone,
        bankAccount,
        productName,
        productImage,
        amount: parseInt(amount, 10),
        pricePerUnit: parseFloat(pricePerUnit),
        recordedById: decoded.userId,
      },
    });

    return res.status(201).json({
      message: "Farmer product recorded successfully.",
      record,
    });
  } catch (error) {
    console.error("Error recording farmer product:", error);
    return res.status(500).json({ error: "Server error recording farmer product." });
  }
};

// ------------------- POST RECORDED PRODUCT (SINGLE OR ALL) -------------------
export const postRecordedProduct = async (req: Request, res: Response) => {
  const { recordId, postAll } = req.body; // postAll: boolean

  try {
    const decoded = getUserFromToken(req);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Only admins can post recorded products." });
    }

    let records;
    if (postAll) {
      // Fetch all unposted records
      records = await prisma.farmerProductRecord.findMany({
        where: { isPosted: false },
      });
      if (records.length === 0) {
        return res.status(400).json({ error: "No unposted records found." });
      }
    } else {
      // Single record
      if (!recordId) return res.status(400).json({ error: "recordId is required" });
      const record = await prisma.farmerProductRecord.findUnique({ where: { id: recordId } });
      if (!record) return res.status(404).json({ error: "Record not found." });
      if (record.isPosted) return res.status(400).json({ error: "This record has already been posted." });
      records = [record];
    }

    const postedProducts = [];

    for (const record of records) {
      const product = await prisma.product.create({
        data: {
          name: record.productName,
          quantity: record.amount,
          price: record.pricePerUnit,
          imageUrl: record.productImage,
          farmerName: record.farmerName,
          farmerPhone: record.farmerPhone,
          description: `Product supplied by farmer ${record.farmerName}.`,
        },
      });

      await prisma.farmerProductRecord.update({
        where: { id: record.id },
        data: { isPosted: true, productId: product.id },
      });

      postedProducts.push(product);
    }

    return res.status(201).json({
      message: postAll
        ? `${postedProducts.length} products posted successfully.`
        : "Product posted successfully.",
      products: postedProducts,
    });
  } catch (error) {
    console.error("Error posting recorded product:", error);
    return res.status(500).json({ error: "Server error posting recorded product." });
  }
};

// ------------------- GET ALL RECORDED PRODUCTS -------------------
export const getRecordedProducts = async (req: Request, res: Response) => {
  try {
    const decoded = getUserFromToken(req);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Only admins can view recorded products." });
    }

    const records = await prisma.farmerProductRecord.findMany({
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json(records);
  } catch (error) {
    console.error("Error fetching recorded products:", error);
    return res.status(500).json({ error: "Server error fetching recorded products." });
  }
};
