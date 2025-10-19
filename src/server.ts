import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { connectDB } from "./DB/dbconnection";
import authRoutes from "./Routes/authRoutes";
import companyRoutes from "./Routes/companyRoutes";
import passwordRoutes from "./Routes/passwordRoutes";
import userRoutes from "./Routes/userRoutes";
import swaggerUi from 'swagger-ui-express';
import swaggerOutput from './swagger-output.json';
import path from "node:path";
import passport from "passport";


import "./Middleware/authGoogle";
import "./Middleware/authGithub";

dotenv.config();
const app = express();
app.use("/uploads", express.static("uploads"));

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize());  // <-- Passport middleware initialize


// Connect to MongoDB
connectDB();

// Routes
app.get("/.well-known/apple-app-site-association", (req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.sendFile(path.join(process.cwd(), "public", "apple-app-site-association"));
});

app.use("/api/auth", authRoutes);
app.use("/api/company", companyRoutes);
app.use("/api/password", passwordRoutes);
app.use("/api/user", userRoutes);
app.get("/",(req:Request,res:Response)=>{
    res.send("helo versel")
})
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerOutput));

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
export default app;
