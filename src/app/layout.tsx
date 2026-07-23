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
    default: "MEC Livros - Busca e Download Gratuito de Livros",
    template: "%s | MEC Livros",
  },
  description:
    "Busque títulos públicos da biblioteca do MEC e baixe livros gratuitamente em formato EPUB descriptografado ou PDF A4.",
  keywords: [
    "MEC Livros",
    "Livros Gratuitos",
    "EPUB",
    "PDF A4",
    "Biblioteca MEC",
    "Download de Livros",
    "Domínio Público",
  ],
  authors: [{ name: "MEC Livros" }],
  creator: "MEC Livros",
  publisher: "MEC Livros",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "pt_BR",
    url: siteUrl,
    siteName: "MEC Livros",
    title: "MEC Livros - Busca e Download Gratuito de Livros",
    description:
      "Busque títulos públicos da biblioteca do MEC e baixe livros gratuitamente em formato EPUB descriptografado ou PDF A4.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 628,
        alt: "MEC Livros - Busca e Download Gratuito de Livros",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "MEC Livros - Busca e Download Gratuito de Livros",
    description:
      "Busque títulos públicos do MEC e baixe livros em formato EPUB descriptografado ou PDF A4 gratuitamente.",
    images: ["/og-image.png"],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body>
    </html>
  );
}
