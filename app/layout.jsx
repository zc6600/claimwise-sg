import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import NavbarUser from "../components/NavbarUser";
import OfflineStatusBanner from "../components/OfflineStatusBanner";
import { SITE_URL } from "../lib/site-url";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const viewport = {
  themeColor: "#0b1320",
  width: "device-width",
  initialScale: 1,
};

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "ClaimWise SG · Motor Insurance Claim Decision Assistant",
    template: "%s · ClaimWise SG",
  },
  description:
    "Compare the multi-year cost of paying for minor car repairs out-of-pocket versus filing an own-damage motor insurance claim in Singapore.",
  keywords: [
    "Singapore motor insurance",
    "NCD calculator",
    "car claim decision",
    "own damage claim",
    "GIA MCF",
    "Singapore car insurance excess",
  ],
  authors: [{ name: "ClaimWise SG" }],
  openGraph: {
    title: "ClaimWise SG · Motor Insurance Claim Decision Assistant",
    description:
      "Compare the multi-year cost of paying for minor car repairs out-of-pocket versus filing an own-damage motor insurance claim in Singapore.",
    url: "/",
    siteName: "ClaimWise SG",
    locale: "en_SG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClaimWise SG · Motor Insurance Claim Decision Assistant",
    description:
      "Compare the multi-year cost of paying for minor car repairs out-of-pocket versus filing an own-damage motor insurance claim in Singapore.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
          <OfflineStatusBanner />
          <div className="site-shell">
            <header className="topbar-wrap">
              <div className="topbar section-pad">
                <Link className="brand" href="/" aria-label="ClaimWise SG home">
                  <span className="brand-mark" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <span>
                    ClaimWise <em>SG</em>
                  </span>
                </Link>

                <nav className="nav-links" aria-label="Main navigation">
                  <Link href="/">Car tools</Link>
                  <Link href="/my-car">My car</Link>
                  <Link href="/emergency">Emergency</Link>
                </nav>

                <div className="topbar-account">
                  <NavbarUser />
                </div>
              </div>

              <nav className="mobile-nav section-pad" aria-label="Mobile navigation">
                <Link href="/">Car tools</Link>
                <Link href="/my-car">My car</Link>
                <Link href="/emergency">Emergency</Link>
              </nav>
            </header>

            <main>{children}</main>

            <footer className="footer-wrap">
              <div className="footer section-pad">
                <div className="brand footer-brand">
                  <span className="brand-mark" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                  </span>
                  <span>
                    ClaimWise <em>SG</em>
                  </span>
                </div>
                <p>Independent calculators for the expensive decisions in Singapore car ownership.</p>
                <nav className="footer-links" aria-label="More pages">
                  <Link href="/settlement">Private settlement</Link>
                  <Link href="/how-it-works">How it works</Link>
                  <Link href="/rules">Insurer rules</Link>
                  <Link href="/privacy">Privacy</Link>
                </nav>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
