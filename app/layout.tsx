import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SnapPliates - 필라테스 센터 관리 시스템",
  description: "필라테스 센터를 위한 가장 심플한 운영 관리 시스템",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${inter.variable} antialiased min-h-screen h-screen`}
      >
        {children}
      </body>
    </html>
  );
}
