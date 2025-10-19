import { Strategy as GoogleStrategy, Profile } from "passport-google-oauth20";
import passport from "passport";
import User from "../Models/User.js"; // adjust .js if using ESM

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: "https://passure.vercel.app/api/auth/google/callback",

      // 👇 Force Google to show account chooser every time
      // We cast to "any" to bypass TS restriction safely
      ...( { prompt: "select_account", accessType: "offline" } as any ),
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any) => void
    ) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
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
