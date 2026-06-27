import type { Metadata } from "next";
import { AuthProvider } from "@/components/auth/AuthProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kalshi Assistant Web",
  description: "Web-based Kalshi weather position review assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}