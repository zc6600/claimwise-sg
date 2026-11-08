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
    default: "ClaimWise SG · Singapore Car Decision Tools",
    template: "%s · ClaimWise SG",
  },
  description:
    "Independent calculators for Singapore car owners: claim or self-pay after an accident, NCD Protector, renewal quotes, COE renewal, and early car loan settlement.",
  keywords: [
    "Singapore car insurance",
    "claim or self-pay",
    "NCD Protector",
    "car insurance quote comparison",
    "COE renewal calculator",
    "car loan early settlement",
  ],
  authors: [{ name: "ClaimWise SG" }],
  openGraph: {
    title: "ClaimWise SG · Singapore Car Decision Tools",
    description:
      "Independent calculators for Singapore car owners: claim or self-pay after an accident, NCD Protector, renewal quotes, COE renewal, and early car loan settlement.",
    url: "/",
    siteName: "ClaimWise SG",
    locale: "en_SG",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClaimWise SG · Singapore Car Decision Tools",
    description:
      "Independent calculators for Singapore car owners: claim or self-pay after an accident, NCD Protector, renewal quotes, COE renewal, and early car loan settlement.",
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
                  <Link href="/tools">Car tools</Link>
                  <Link href="/accident">After an accident</Link>
                  <Link href="/rules">Insurer rules</Link>
                </nav>

                <div className="topbar-account">
                  <NavbarUser />
                </div>
              </div>

              <nav className="mobile-nav section-pad" aria-label="Mobile navigation">
                <Link href="/tools">Car tools</Link>
                <Link href="/accident">After an accident</Link>
                <Link href="/rules">Insurer rules</Link>
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
                <p>Independent and free. General information, not financial advice.</p>
                <nav className="footer-links" aria-label="More pages">
                  <Link href="/rules">Insurer rules</Link>
                  <Link href="/how-it-works">How it works</Link>
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
