import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "铁路明桥面步行板可视化管理系统",
  description: "铁路明桥面步行板安全检查与隐患标注可视化平台，帮助作业人员直观了解步行板损坏情况，预防安全事故发生。",
  keywords: ["铁路", "桥梁", "步行板", "安全管理", "可视化", "隐患标注"],
  authors: [{ name: "铁路安全管理系统" }],
  icons: {
    icon: "/favicon.png",
  },
  openGraph: {
    title: "铁路明桥面步行板可视化管理系统",
    description: "铁路桥梁步行板安全检查与隐患标注可视化平台",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
        <Toaster />
      </body>
    </html>
  );
}
