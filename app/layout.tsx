import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "VoiceAI Dashboard | White-label analytics & billing for Sassle",
  description:
    "Connect your Retell & OpenRouter API keys. View call analytics, transcripts, and automated monthly invoices via Fanbasis. BYOK—no proxy costs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
