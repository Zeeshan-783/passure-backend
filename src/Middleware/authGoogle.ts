import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../Models/User";
import jwt from "jsonwebtoken";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // console.log("Google Profile", profile);
        const email = profile.emails && profile.emails[0]?.value;

        if (!email) {
          return done(null, false, { message: "No email found in Google profile" });
        }

        // Find or create user
        let user = await User.findOne({ email });

        if (!user) {
          // Create new user
          user = new User({
            fullname: profile.displayName,
            username: profile.displayName.replace(/\s+/g, "").toLowerCase(),
            userID: Date.now(), // Or generate unique ID
            email: email,
            password: "", // No password because OAuth
            profileImg: profile.photos && profile.photos[0]?.value,
          });
          await user.save();
        }

        done(null, user);
      } catch (error) {
        done(error, false);
      }
    }
  )
);
