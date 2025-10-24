// utils/oneSignalHelper.ts
import { Client as OneSignalClient } from "onesignal-node";
import axios from "axios";
import User from "../Models/User";

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

  // Send to all provided player IDs without pre-checking subscription status.
  const subscribedIds = playerIds;

  const basePayload: any = {
    headings: { en: data.heading },
    contents: { en: data.content },
    url: data.url,
    data: data.data,
    buttons: data.buttons,
  };

  const promises = subscribedIds.map((pid) =>
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

// Inspect a single player via OneSignal REST API
export const inspectPlayer = async (playerId: string) => {
  if (!APP_ID || !REST_KEY) return null;
  try {
    const res = await axios.get(`https://onesignal.com/api/v1/players/${playerId}`, {
      params: { app_id: APP_ID },
      headers: { Authorization: `Basic ${REST_KEY}`, "Content-Type": "application/json" },
    });
    const body = res.data;
    console.log("OneSignal inspect:", playerId, body);
    return body;
  } catch (err) {
    console.error("inspectPlayer error:", err);
    return null;
  }
};

// Prune invalid player ids for a given user id (remove unsubscribed/invalid ones)
export const pruneInvalidPlayerIdsForUser = async (userId: string) => {
  if (!APP_ID || !REST_KEY) return { pruned: 0 };
  const user = await User.findById(userId);
  if (!user || !Array.isArray(user.oneSignalPlayerIds) || user.oneSignalPlayerIds.length === 0) return { pruned: 0 };

  const checks = await Promise.all(
    user.oneSignalPlayerIds.map(async (pid) => {
      const info = await inspectPlayer(pid);
      // On success, OneSignal returns 'id' and 'identifier' fields — if 'invalid_identifier' or not subscribed treat as bad
      const subscribed = info && (info.subscribed === true || info.invalid_identifier === undefined || !info.invalid_identifier);
      return { pid, info, keep: !!subscribed };
    })
  );

  const toKeep = checks.filter((c) => c.keep).map((c) => c.pid);
  const pruned = user.oneSignalPlayerIds.length - toKeep.length;
  user.oneSignalPlayerIds = toKeep;
  await user.save();
  console.log(`Pruned ${pruned} OneSignal player ids for user ${userId}`);
  return { pruned };
};
