import { Request, Response } from "express";
import prisma from "../prisma/prisma";
import axios from "axios";
import { generateVoiceFromText } from "../src/utils/voiceGenerator"; 

const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || "";
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || "";

export const createNews = async (req: Request, res: Response) => {
  try {
    const { category, title, description, prices } = req.body;
    if (!title || !description || !category) {
      return res.status(400).json({ error: "Title, description, and category are required." });
    }
    const news = await prisma.news.create({
      data: {
        category,
        title,
        description,
        prices: prices || null,
      },
    });
    let message = `📢 ${title}\n\n${description}`;
    if (category === "market" && prices?.length > 0) {
      message += `\n\n📊 Weekly Market Prices:\n`;
      prices.forEach((p: any) => {
        message += `- ${p.commodity}: ${p.price}\n`;
      });
    }
    const fileName = `news_${Date.now()}`;
    const voiceUrl = await generateVoiceFromText(message, "en", fileName); 
    const smsMessage = `${message}\n\n🔊 Listen: ${voiceUrl}`;
    const farmers = await prisma.user.findMany({
      where: { role: "farmer", status: "registered" },
      select: { phone: true },
    });

    if (farmers.length > 0) {
      const phoneNumbers = farmers.map((f) => f.phone);

      try {
        await axios.post(
          `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
          {
            recipients: phoneNumbers,
            message: smsMessage,
          },
          {
            headers: {
              "x-api-key": TEXTBEE_API_KEY,
              "Content-Type": "application/json",
            },
          }
        );
      } catch (smsError) {
        console.error("❌ Some SMS may have failed:", smsError);
      }
    }

    res.status(201).json({
      message: "✅ News created, SMS & voice link sent successfully!",
      news,
      voiceUrl, 
    });
  } catch (error) {
    console.error("❌ Error creating news:", error);
    res.status(500).json({ error: "Failed to create news." });
  }
};

export const getAllNews = async (_req: Request, res: Response) => {
  try {
    const news = await prisma.news.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(news);
  } catch (error) {
    console.error("❌ Error fetching news:", error);
    res.status(500).json({ error: "Failed to fetch news." });
  }
};
