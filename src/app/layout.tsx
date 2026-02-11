import type { Metadata } from "next";

import { ThemeProvider } from "@/components/theme/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "ReadReady",
  description: "Deep reading, focused design, EPUB-first library management.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
