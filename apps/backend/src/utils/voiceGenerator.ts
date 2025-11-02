import gTTS from "gtts";
import fs from "fs";
import path from "path";

export const generateVoiceFromText = async (text: string, language: string, fileName: string) => {
  try {
    const langMap: Record<string, string> = {
      am: "am", 
      om: "en", 
      ti: "en", 
      en: "en",
    };

    const ttsLang = langMap[language] || "en";
    const outputDir = path.join(process.cwd(), "public", "audio");

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${fileName}.mp3`);

    const gtts = new gTTS(text, ttsLang);
    await new Promise<void>((resolve, reject) => {
      gtts.save(outputFile, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    const publicUrl = `${process.env.SERVER_URL || "http://localhost:5000"}/public/audio/${fileName}.mp3`;
    console.log(`✅ Voice file generated: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error("❌ Error generating voice file:", error);
    return null;
  }
};
