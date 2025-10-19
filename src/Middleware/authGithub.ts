import passport from "passport";
import { Strategy as GitHubStrategy, Profile } from "passport-github2";
import User from "../Models/User";
import { VerifyCallback } from "passport-oauth2";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackURL: "https://passure.vercel.app/api/auth/github/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ) => {
      try {
        const email = profile.emails && profile.emails[0]?.value;

        if (!email) {
          return done(null, false, { message: "No email found in GitHub profile" });
        }

        let user = await User.findOne({ email });

        if (!user) {
          user = new User({
            fullname: profile.displayName || profile.username,
            username: profile.username,
            userID: Date.now(),
            email: email,
            password: "",
            profileImg: profile.photos?.[0]?.value,
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
