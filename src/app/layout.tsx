import type { Metadata } from "next";
import { Nunito_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";

const nunito = Nunito_Sans({ subsets: ["latin"], weight: ["400", "600", "700", "800"], variable: "--font-nunito", display: "swap" });

export const metadata: Metadata = {
  title: "MediLink",
  description: "Tell us how you feel and we'll match you with the right doctor.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // The Material Symbols stylesheet deliberately does NOT live here. Loading
    // it in the root layout made every route pay for a render-blocking
    // cross-origin request; the public pages need only eight glyphs and use
    // inline SVG instead. It is loaded in `(app)/layout.tsx`, so only
    // authenticated routes fetch it.
    <html lang="en" className={nunito.variable}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
