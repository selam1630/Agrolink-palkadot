import axios from "axios";
import "dotenv/config";

const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || "";
const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || "";

export const sendSMSNotification = async (phone: string, message: string) => {
  try {
    await axios.post(
      `https://api.textbee.dev/api/v1/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`,
      {
        recipients: [phone],
        message,
      },
      {
        headers: {
          "x-api-key": TEXTBEE_API_KEY,
          "Content-Type": "application/json",
        },
      }
    );
    console.log(`📩 SMS sent successfully to ${phone}`);
  } catch (error: any) {
    console.error(`❌ Failed to send SMS to ${phone}:`, error.response?.data || error.message);
  }
};
