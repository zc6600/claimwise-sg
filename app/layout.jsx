import Link from "next/link";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../components/Providers";
import NavbarUser from "../components/NavbarUser";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata = {
  title: "ClaimWise SG · Motor Insurance Claim Decision Assistant",
  description:
    "Compare the multi-year cost of paying for minor car repairs out-of-pocket versus filing an own-damage motor insurance claim in Singapore.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>
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
                  <Link href="/">Home</Link>
                  <Link href="/calculator">Calculator</Link>
                  <Link href="/how-it-works">How it works</Link>
                  <Link href="/rules">Insurer rules</Link>
                  <NavbarUser />
                </nav>

                <Link className="topbar-cta" href="/calculator">
                  Open calculator <span aria-hidden="true">→</span>
                </Link>
              </div>

              <nav className="mobile-nav section-pad" aria-label="Mobile navigation">
                <Link href="/">Home</Link>
                <Link href="/calculator">Calculator</Link>
                <Link href="/how-it-works">How it works</Link>
                <Link href="/rules">Insurer rules</Link>
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
                <span className="footer-meta">Singapore GIA MCF baseline · 2026</span>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
