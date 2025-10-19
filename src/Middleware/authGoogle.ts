import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import User from "../Models/User";

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://passure.vercel.app/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          // If user doesn't exist, create one
          user = await User.create({
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails?.[0]?.value || "",
            provider: "google",
            profileImg: profile.photos?.[0]?.value || null,
          });
        }

        done(null, user);
      } catch (err) {
        console.error("Google Strategy Error:", err);
        done(err, null);
      }
    }
  )
);
