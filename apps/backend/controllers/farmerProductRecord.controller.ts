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
  const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; role: string };
  return decoded;
};
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

    return res.status(201).json({ message: "Farmer product recorded successfully.", record });
  } catch (error) {
    console.error("Error recording farmer product:", error);
    return res.status(500).json({ error: "Server error recording farmer product." });
  }
};
export const postRecordedProduct = async (req: Request, res: Response) => {
  const { recordId } = req.body;

  try {
    const decoded = getUserFromToken(req);
    if (decoded.role !== "admin") {
      return res.status(403).json({ error: "Only admins can post recorded products." });
    }

    const record = await prisma.farmerProductRecord.findUnique({ where: { id: recordId } });
    if (!record) return res.status(404).json({ error: "Record not found." });

    const product = await prisma.product.create({
      data: {
        name: record.productName,
        quantity: record.amount,
        price: record.pricePerUnit,
        imageUrl: record.productImage,
        description: `Posted from farmer: ${record.farmerName} (Phone: ${record.farmerPhone})`,
      },
    });

    await prisma.farmerProductRecord.update({
      where: { id: recordId },
      data: { isPosted: true, productId: product.id },
    });

    return res.status(201).json({ message: "Product posted successfully with farmer info.", product });
  } catch (error) {
    console.error("Error posting recorded product:", error);
    return res.status(500).json({ error: "Server error posting recorded product." });
  }
};
