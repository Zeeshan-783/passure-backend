// src/DB/dbconnection.ts
import { Resolver } from "node:dns/promises";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

export const connectDB = async () => {
  // 1. Custom DNS Resolver banayein
  const resolver = new Resolver();
  resolver.setServers(["1.1.1.1", "8.8.8.8"]);  // Cloudflare aur Google Plex servers

  // Optional: SRV resolution test (to ensure DNS sahi kaam kar raha hai)
  try {
    const srvRecords = await resolver.resolveSrv("password.karclup.mongodb.net");
    console.log("SRV records:", srvRecords);
  } catch (err) {
    console.warn("Custom DNS SRV resolution failed:", err);
  }

  // 2. Mongoose se DB connect karein—with IPv4 preference
  try {
    await mongoose.connect(process.env.MONGO_URI as string, {
      family: 4, // IPv4 pe force karein
      serverSelectionTimeoutMS: 10000 // Optional: faster timeout
    });
    console.log("MongoDB Connected");
  } catch (error) {
    console.error("Database connection failed", error);
    process.exit(1);
  }
};
