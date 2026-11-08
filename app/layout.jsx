import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import NavbarUser from "../components/NavbarUser";
import OfflineStatusBanner from "../components/OfflineStatusBanner";

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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "https://claimwise-sg.web.app"
  ),
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
    url: "https://claimwise-sg.web.app",
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
                  <Link href="/calculator">Calculator</Link>
                  <Link href="/tools">Car tools</Link>
                  <Link href="/my-car">My car</Link>
                  <Link href="/settlement">Settlement</Link>
                  <Link href="/emergency">Emergency</Link>
                  <Link href="/how-it-works">How it works</Link>
                  <Link href="/rules">Rules</Link>
                  <NavbarUser />
                </nav>

                <Link className="topbar-cta" href="/calculator">
                  Open calculator <span aria-hidden="true">→</span>
                </Link>
              </div>

              <nav className="mobile-nav section-pad" aria-label="Mobile navigation">
                <Link href="/">Home</Link>
                <Link href="/calculator">Calculator</Link>
                <Link href="/tools">Car tools</Link>
                <Link href="/my-car">My car</Link>
                <Link href="/settlement">Settlement</Link>
                <Link href="/emergency">Emergency</Link>
                <Link href="/how-it-works">How it works</Link>
                <Link href="/rules">Rules</Link>
                <NavbarUser />
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
                <p>Independent motor insurance claim vs. self-pay modelling for Singapore drivers.</p>
                <span className="footer-meta">
                  Singapore GIA MCF baseline · 2026 · <Link href="/privacy">Privacy</Link>
                </span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
