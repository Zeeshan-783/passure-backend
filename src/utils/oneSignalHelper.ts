// utils/oneSignalHelper.ts
import { Client as OneSignalClient } from "onesignal-node";

// Defensive OneSignal client setup for onesignal-node v3
const APP_ID = process.env.ONESIGNAL_APP_ID;
const REST_KEY = process.env.ONESIGNAL_REST_KEY;
const USER_AUTH_KEY = process.env.ONESIGNAL_USER_AUTH_KEY; // optional

let client: any | null = null;
const getClient = () => {
  if (client) return client;
  if (!APP_ID || !REST_KEY) {
    console.warn("OneSignal not configured: set ONESIGNAL_APP_ID and ONESIGNAL_REST_KEY in env");
    return null;
  }

  // onesignal-node v3 Client constructor: new Client(appId, apiKey, options?)
  client = new OneSignalClient(APP_ID, REST_KEY);

  return client;
};

interface NotificationData {
  include_player_ids: string[];
  heading: string;
  content: string;
  url?: string;
  data?: any;
  buttons?: { id: string; text: string }[];
}

// Send OneSignal notification
export const sendOneSignalNotification = async (data: NotificationData) => {
  const c = getClient();
  if (!c) {
    // OneSignal not configured; skip sending.
    console.warn("Skipping OneSignal notification — client not configured");
    return null;
  }

  const notification: any = {
    include_player_ids: data.include_player_ids,
    headings: { en: data.heading },
    contents: { en: data.content },
    url: data.url,
    data: data.data,
    buttons: data.buttons,
  };

  try {
    const response = await c.createNotification(notification);
    // response may include a body property depending on library internals
    console.log("OneSignal response:", (response && response.body) || response);
    return response;
  } catch (error: any) {
    console.error("OneSignal Error:", (error && error.body) || error);
    throw error;
  }
};
