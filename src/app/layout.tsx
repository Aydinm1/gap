import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  openGraph: {
    type:'website', siteName:'GAP', title:'GAP | Growth Analyst Program',
    description:'The six-week Growth Analyst Program from 180 Degrees Consulting at UC Davis.',
    images:[{url:'/brand/gap-social-logo.png',width:1200,height:1200,alt:'180 Degrees Consulting at UC Davis logo'}],
  },
  twitter: {
    card:'summary',title:'GAP | Growth Analyst Program',
    description:'The six-week Growth Analyst Program from 180 Degrees Consulting at UC Davis.',
    images:[{url:'/brand/gap-social-logo.png',alt:'180 Degrees Consulting at UC Davis logo'}],
  },
  title: "GAP | Growth Analyst Program",
  description:
    "The six-week Growth Analyst Program from 180 Degrees Consulting at UC Davis.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${montserrat.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
