import NextAuth from "next-auth";
import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";

const microsoftLoginEnabled = () => process.env.MICROSOFT_LOGIN_ENABLED === "true";

export const { handlers, auth } = NextAuth({
  providers: [
    MicrosoftEntraID({


      issuer: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID || "common"}/v2.0`,
      profile(profile) {
        return {
          id: profile.sub,
          name: profile.name || profile.preferred_username || "Microsoft user",
          email: profile.email || profile.preferred_username || null,
          image: null,
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/login", error: "/login" },
  callbacks: {
    async signIn() {
      return microsoftLoginEnabled();
    },
  },
});
