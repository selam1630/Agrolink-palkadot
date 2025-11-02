import axios from "axios";
import { GoogleGenerativeAI } from "@google/generative-ai";
import prisma from "../prisma/prisma";
import "dotenv/config";
import fs from "fs";
import path from "path";
import gTTS from "gtts";

const GOOGLE_API_KEY = process.env.GEMINI_API_KEY || "";
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || "";
const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY || "";
const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || "";
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || "";

const OPENWEATHER_WEATHER_URL = "https://api.openweathermap.org/data/2.5/weather";
const OPENWEATHER_FORECAST_URL = "https://api.openweathermap.org/data/2.5/forecast";
const OPENCAGE_API_URL = "https://api.opencagedata.com/geocode/v1/json";

const genAI = new GoogleGenerativeAI(GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

interface DisasterAlert {
  description: string;
}

const getLocationName = async (lat: number, lon: number): Promise<string> => {
  try {
    const url = `${OPENCAGE_API_URL}?q=${lat}+${lon}&key=${OPENCAGE_API_KEY}`;
    const response = await axios.get(url);
    if (response.data.results.length > 0) {
      return response.data.results[0].formatted;
    }
    return "Unknown Location";
  } catch (error) {
    console.error("Geocoding failed:", error instanceof Error ? error.message : error);
    return "Unknown Location";
  }
};

const buildAdviceSummary = (advice: any): string => {
  if (!advice) return "";
  return `
Weather: ${advice.weatherPrediction || "N/A"}.
Soil & Water: ${advice.soilAndWaterAdvice || "N/A"}.
Pest & Disease: ${advice.pestAndDiseaseAdvice || "N/A"}.
Recommended Crops: ${(advice.recommendedCrops || []).join(", ") || "N/A"}.
`.trim();
};
const generateVoiceAlert = async (alertText: string, languageCode: string) => {
  try {
    const audioDir = path.join(process.cwd(), "public", "audio");
    if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

    const fileName = `alert_${Date.now()}.mp3`;
    const filePath = path.join(audioDir, fileName);

    const gtts = new gTTS(alertText, languageCode);
    await new Promise<void>((resolve, reject) => {
      gtts.save(filePath, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });

    const publicUrl = `${process.env.SERVER_URL || "http://localhost:5000"}/audio/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error("Error generating voice alert:", error);
    return null;
  }
};
const sendDisasterAlertsToFarmers = async (
  alerts: DisasterAlert[],
  adviceSummary?: string,
  language: string = "en"
) => {
  try {
    const farmers = await prisma.user.findMany({
      where: { status: "registered", role: "farmer" },
      select: { phone: true },
    });

    if (farmers.length === 0) {
      console.log("No registered farmers to send alerts to.");
      return;
    }

    const langCodeMap: Record<string, string> = {
      en: "en",
      am: "am",
      om: "om",
      ti: "ti",
    };
    const voiceLang = langCodeMap[language] || "en";

    for (const alert of alerts) {
      const voiceUrl = await generateVoiceAlert(alert.description, voiceLang);
      const message = adviceSummary
        ? `${alert.description}\n\n📋 Advice Summary:\n${adviceSummary}\n\n🔊 Listen to alert: ${voiceUrl}`
        : `${alert.description}\n\n🔊 Listen to alert: ${voiceUrl}`;

      for (const farmer of farmers) {
        await axios.post(
          `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
          { recipients: [farmer.phone], message },
          { headers: { "x-api-key": TEXTBEE_API_KEY, "Content-Type": "application/json" } }
        );
      }
    }

    console.log(`✅ Disaster alerts (with voice links) sent to ${farmers.length} farmers.`);
  } catch (error) {
    console.error("❌ Error sending disaster alerts to farmers:", error);
  }
};

const generateDIYAlertsFromForecast = (_forecastData: any): DisasterAlert[] => {
  return [
    { description: "Test Flood Alert: Heavy rain expected tomorrow in Addis Ababa." },
    { description: "Test Storm Alert: Strong winds expected this weekend." },
  ];
};

const translateDisasterAlerts = async (alerts: DisasterAlert[], language: string): Promise<DisasterAlert[]> => {
  if (alerts.length === 0) return [];

  const langMap: Record<string, string> = {
    en: "English",
    am: "Amharic",
    om: "Oromo",
    ti: "Tigrinya",
  };

  const targetLanguage = langMap[language] || "English";

  const prompt = `
Translate the following disaster alerts into ${targetLanguage}. 
Return JSON array like [{ "description": "..." }, ...]:
${alerts.map((a) => a.description).join("\n")}
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text.replace(/```json|```/g, "").trim());
  } catch (err) {
    console.error("Failed to translate disaster alerts:", err);
    return alerts;
  }
};

const getWeatherAndCropAdviceForDashboard = async (req: any, res: any) => {
  const { lat, lon, language } = req.body;
  if (!lat || !lon) return res.status(400).json({ error: "Missing required parameters: lat and lon." });

  try {
    const locationName = await getLocationName(lat, lon);

    const weatherResponse = await axios.get(
      `${OPENWEATHER_WEATHER_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );
    const forecastResponse = await axios.get(
      `${OPENWEATHER_FORECAST_URL}?lat=${lat}&lon=${lon}&units=metric&appid=${OPENWEATHER_API_KEY}`
    );

    const weatherData = weatherResponse.data;
    const forecastData = forecastResponse.data;

    const disasterAlertsRaw = generateDIYAlertsFromForecast(forecastData);
    const disasterAlerts = await translateDisasterAlerts(disasterAlertsRaw, language);

    const langMap: Record<string, string> = {
      en: "English",
      am: "Amharic",
      om: "Oromo",
      ti: "Tigrinya",
    };

    const prompt = `
You are an agricultural advisor for Ethiopian farmers.
Provide all advice in ${langMap[language] || "English"}.

Location: ${locationName} (lat: ${lat}, lon: ${lon})
Current Weather Data: ${JSON.stringify(weatherData)}
Forecast Data (5 days): ${JSON.stringify(forecastData)}

Provide JSON advice in this format:
{
  "weatherPrediction": "...",
  "soilAndWaterAdvice": "...",
  "pestAndDiseaseAdvice": "...",
  "recommendedCrops": ["..."],
  "emergencyPreparedness": "...",
  "locationSpecificTips": "..."
}
`;

    const geminiResult = await model.generateContent(prompt);
    const geminiText = geminiResult.response.text();

    let formattedOutput: any = {};
    try {
      formattedOutput = JSON.parse(geminiText.replace(/```json|```/g, "").trim());
    } catch {
      formattedOutput = {};
    }

    const adviceSummary = buildAdviceSummary(formattedOutput);

    if (disasterAlertsRaw.length > 0) {
      await sendDisasterAlertsToFarmers(disasterAlerts, adviceSummary, language);
    }

    res.status(200).json({
      location: locationName,
      weatherData,
      forecastData,
      advice: { ...formattedOutput, disasterAlerts },
    });
  } catch (error) {
    console.error("Error in fetching data:", error);
    let errorMessage = "An unexpected error occurred.";
    if (axios.isAxiosError(error) && error.response) {
      errorMessage = `Weather API error: ${error.response.status} - ${error.response.data.message}`;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    res.status(500).json({ message: errorMessage });
  }
};

export { getWeatherAndCropAdviceForDashboard };
