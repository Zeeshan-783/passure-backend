import passport from "passport";
import { Strategy as GitHubStrategy, Profile } from "passport-github2";
import { VerifyCallback } from "passport-oauth2";
import User from "../Models/User";

passport.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
      callbackURL:"https://passure.vercel.app/api/auth/github/callback",
    },
    async (
      accessToken: string,
      refreshToken: string,
      profile: Profile,
      done: VerifyCallback
    ): Promise<void> => {
      try {
        const email =
          profile.emails && profile.emails.length > 0
            ? profile.emails[0].value
            : null;

        let user = await User.findOne({
          $or: [{ email }, { githubId: profile.id }],
        });

        if (!user) {
          user = await User.create({
            githubId: profile.id,
            username: profile.displayName || profile.username,
            email: email || "",
            provider: "github",
            profileImg: profile.photos?.[0]?.value || null,
          });
        }

        done(null, user);
      } catch (err) {
        console.error("GitHub Strategy Error:", err);
        done(err as Error, null);
      }
    }
  )
);
