import type { Metadata } from "next";
import "./admin.css";

/**
 * Everything under /admin is private. `noindex, nofollow` covers the case
 * where a link leaks; app/robots.ts disallows the path for crawlers that read
 * robots.txt. Neither is a security control — the password is — but an
 * order list has no business in a search index.
 */
export const metadata: Metadata = {
  title: "طلبات مطعم دمس",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="admin-root">{children}</div>;
}
