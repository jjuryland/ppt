import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PPT Reference Manager",
  description: "PPT, report, and meeting slide reference manager"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
