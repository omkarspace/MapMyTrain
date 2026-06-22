import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/providers/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://mapmytrain.com"),
  title: {
    default: "MapMyTrain - Real-Time Indian Railways Tracking",
    template: "%s | MapMyTrain",
  },
  description:
    "Track Indian Railway trains in real-time on an interactive WebGL map. See live train positions, delays, timetables, and route maps with 60 FPS performance.",
  keywords: [
    "Indian Railways",
    "train tracking",
    "live train status",
    "real-time train map",
    "Indian train tracker",
    "train delay status",
    "railway map India",
    "train running status",
    "IRCTC tracking",
    "train position live",
    "open source train tracker",
    "PostGIS",
    "MapLibre",
    "WebGL",
    "WebSocket streaming",
  ],
  authors: [{ name: "MapMyTrain Contributors" }],
  creator: "MapMyTrain",
  publisher: "MapMyTrain",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://mapmytrain.com",
    siteName: "MapMyTrain",
    title: "MapMyTrain - Real-Time Indian Railways Tracking",
    description:
      "Track Indian Railway trains in real-time on an interactive WebGL map. See live train positions, delays, timetables, and route maps with 60 FPS performance.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "MapMyTrain - Real-Time Indian Railways Map",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MapMyTrain - Real-Time Indian Railways Tracking",
    description:
      "Track Indian Railway trains in real-time on an interactive WebGL map. Open-source, 60 FPS, binary WebSocket streaming.",
    images: ["/og-image.png"],
    creator: "@omkarspace",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "https://mapmytrain.com",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('mapmytrain-theme');
                  if (theme === 'light') {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
