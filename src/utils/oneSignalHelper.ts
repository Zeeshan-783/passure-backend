// utils/oneSignalHelper.ts
import { Client as OneSignalClient } from "onesignal-node";

// Defensive OneSignal client setup for onesignal-node v3
const APP_ID = process.env.ONESIGNAL_APP_ID;
const REST_KEY = process.env.ONESIGNAL_REST_KEY;

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
  // If include_player_ids has multiple entries, send per-player and don't let one failure block others.
  const playerIds = Array.isArray(data.include_player_ids) ? data.include_player_ids : [];
  if (playerIds.length === 0) return { successes: [], failures: [] };

  const basePayload: any = {
    headings: { en: data.heading },
    contents: { en: data.content },
    url: data.url,
    data: data.data,
    buttons: data.buttons,
  };

  const promises = playerIds.map((pid) =>
    (async () => {
      try {
        const payload = { ...basePayload, include_player_ids: [pid] };
        const resp = await c.createNotification(payload);
        return { id: pid, success: true, response: (resp && resp.body) || resp };
      } catch (err: any) {
        return { id: pid, success: false, error: (err && err.body) || err };
      }
    })()
  );

  const settled = await Promise.allSettled(promises);
  const successes: any[] = [];
  const failures: any[] = [];

  for (const s of settled) {
    if (s.status === "fulfilled") {
      const val = s.value;
      if (val.success) successes.push(val);
      else failures.push(val);
    } else {
      failures.push({ id: null, success: false, error: s.reason });
    }
  }

  console.log(`OneSignal summary: ${successes.length} succeeded, ${failures.length} failed.`);
  if (failures.length) console.warn("OneSignal failures:", failures);
  return { successes, failures };
};
