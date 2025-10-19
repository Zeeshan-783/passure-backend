import express from "express";
import { registerUser, loginUser } from "../Controllers/authController";
import passport from "passport";
import jwt from "jsonwebtoken";


const router = express.Router();

router.post("/signup", registerUser);
router.post("/login", loginUser);

const generateTokenAndRedirect = (req: any, res: any) => {
  const user = req.user;
  if (!user) return res.status(401).json({ message: "Unauthorized" });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET!, {
    expiresIn: "1h",
  });

  // Redirect to Flutter app deep link with token
  res.redirect(`myflutterapp://login?token=${token}`);
};

// Google OAuth routes
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  generateTokenAndRedirect
);

// GitHub OAuth routes
router.get(
  "/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

router.get(
  "/github/callback",
  passport.authenticate("github", { session: false }),
  generateTokenAndRedirect
);

export default router;
