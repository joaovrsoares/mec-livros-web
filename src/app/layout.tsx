import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://mec.joaovrsoares.dev";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Livraria - Busca e Download Gratuito de Livros",
    template: "%s | Livraria",
  },
  description:
    "Busque livros na Livraria e baixe gratuitamente em formato EPUB ou PDF A4.",
  keywords: [
    "Livraria",
    "Livros Gratuitos",
    "EPUB",
    "PDF A4",
    "Biblioteca",
    "Download de Livros",
    "Domínio Público",
  ],
  authors: [{ name: "Livraria" }],
  creator: "Livraria",
  publisher: "Livraria",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "Livraria",
    title: "Livraria - Busca e Download Gratuito de Livros",
    description:
      "Busque livros na Livraria e baixe gratuitamente em formato EPUB ou PDF A4.",
    images: [
      {
        url: "/meta-image.png",
        width: 1200,
        height: 628,
        alt: "Livraria - Busca e Download Gratuito de Livros",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Livraria - Busca e Download Gratuito de Livros",
    description:
      "Busque livros na Livraria e baixe em formato EPUB ou PDF A4 gratuitamente.",
    images: ["/meta-image.png"],
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
};

import ScrollToTop from "@/components/ScrollToTop";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}else if(window.matchMedia("(prefers-color-scheme: dark)").matches){document.documentElement.setAttribute("data-theme","dark");}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
