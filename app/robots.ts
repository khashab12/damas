import type { MetadataRoute } from "next";

/**
 * The menu should be indexed; the orders dashboard must not be. This is
 * politeness for well-behaved crawlers, not a security control — /admin is
 * protected by the password check in lib/admin/auth.ts.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/admin", "/order/"],
    },
  };
}
