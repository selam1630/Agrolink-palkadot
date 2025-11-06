import { Request, Response } from "express";
import prisma from "../prisma/prisma";

export const addFarmerToRegistry = async (req: Request, res: Response) => {
  const { name, phone, region, accountNumber, email } = req.body;
  const adminId = req.user?.id; 

  if (!name || !phone) {
    return res.status(400).json({ error: "Name and phone are required" });
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res
        .status(400)
        .json({ error: "Farmer with this phone already exists" });
    }
    const farmer = await prisma.user.create({
      data: {
        name,
        phone,
        role: "farmer",
        status: "registered", 
        accountNumber,
        email,
        lastRegistrationAttempt: new Date(),
       
      },
    });

    res.status(201).json({ message: "Farmer added successfully", farmer });
  } catch (error) {
    console.error("Error adding farmer:", error);
    res.status(500).json({ error: "Failed to add farmer" });
  }
};

export const listFarmers = async (req: Request, res: Response) => {
  try {
    const farmers = await prisma.user.findMany({
      where: { role: "farmer" },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        accountNumber: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json({ farmers });
  } catch (error) {
    console.error("Error fetching farmers:", error);
    res.status(500).json({ error: "Failed to fetch farmers" });
  }
};

export const getAdminMetrics = async (req: Request, res: Response) => {
  try {
    const totalFarmers = await prisma.user.count({ where: { role: "farmer" } });
    const totalNews = await prisma.news.count();
    const pendingTasks = 3; 
    const marketData = [
      { crop: "Teff", price: 1200, trend: "up" },
      { crop: "Maize", price: 800, trend: "down" },
      { crop: "Wheat", price: 950, trend: "stable" },
    ];

    res.status(200).json({
      totalFarmers,
      totalNews,
      pendingTasks,
      marketData,
    });
  } catch (error) {
    console.error("Error fetching admin metrics:", error);
    res.status(500).json({ error: "Failed to fetch admin metrics" });
  }
};
