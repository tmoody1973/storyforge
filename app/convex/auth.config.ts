export default {
  providers: [
    {
      type: "customJwt" as const,
      issuer: `https://api.workos.com/`,
      algorithm: "RS256" as const,
      applicationID: process.env.WORKOS_CLIENT_ID,
      jwks: `https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`,
    },
    {
      type: "customJwt" as const,
      issuer: `https://api.workos.com/user_management/${process.env.WORKOS_CLIENT_ID}`,
      algorithm: "RS256" as const,
      jwks: `https://api.workos.com/sso/jwks/${process.env.WORKOS_CLIENT_ID}`,
    },
  ],
};
