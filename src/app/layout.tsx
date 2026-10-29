import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pixxel360 — 360° Asset Security Posture",
  description: "Comprehensive 360-degree security posture across organisational assets",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const jar = await cookies();
  const theme = jar.get("p360_theme")?.value ?? jar.get("bp_theme")?.value ?? "dark";

  return (
    <html lang="en" className={`h-full ${theme === "dark" ? "dark" : ""}`}>
      <body className="h-full bg-gray-50 dark:bg-slate-950 text-gray-900 dark:text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
