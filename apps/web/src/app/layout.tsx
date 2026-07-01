import type { Metadata } from "next";
import { Inter, Rajdhani, Space_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { appDescription, appName, ogImage } from "@/features/ui/site-content";

const headingSans = Rajdhani({
  variable: "--font-heading-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const bodySans = Inter({
  variable: "--font-body-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const mono = Space_Mono({
  variable: "--font-body-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://eu-hz.vercel.app"),
  title: appName,
  description: appDescription,
  applicationName: appName,
  openGraph: {
    title: appName,
    description: appDescription,
    type: "website",
    url: "/",
    siteName: appName,
    images: [ogImage],
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription,
    images: [ogImage],
  },
  icons: {
    icon: "/favicon-32x32.png",
    shortcut: "/favicon-32x32.png",
    apple: "/apple-touch-icon.png",
    other: [
      { rel: "icon", url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { rel: "icon", url: "/euhz.svg", sizes: "any", type: "image/svg+xml" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingSans.variable} ${bodySans.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
