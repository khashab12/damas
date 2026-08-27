import type { Metadata } from "next";
import { Tajawal, Cairo } from "next/font/google";
import "./globals.css";

// Arabic menu page: Tajawal for headings, Cairo for body text.
const tajawal = Tajawal({
  variable: "--font-tajawal",
  subsets: ["arabic"],
  weight: ["500", "700"],
});

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic"],
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "مطعم دمس — قائمة الطعام",
  description: "قائمة مطعم دمس للأكلات المصرية — العزيزية، شارع الشباب، الرياض",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${tajawal.variable} ${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
