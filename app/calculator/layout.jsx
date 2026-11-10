import JsonLd from "../../components/JsonLd";
import { SITE_URL } from "../../lib/site-url";
import { calculatorGraph } from "../../src/structured-data.mjs";

export const metadata = {
  title: "Claim or Self-Pay Calculator",
  description:
    "After a minor accident in Singapore, compare the repair bill with the multi-year cost of losing your No-Claim Discount and find your break-even repair cost.",
  alternates: { canonical: "/calculator" },
};

export default function Layout({ children }) {
  return (
    <>
      <JsonLd
        data={calculatorGraph(SITE_URL, {
          path: "/calculator",
          name: "Claim or self-pay calculator",
          description: metadata.description,
          crumbs: [
            { name: "After an accident", path: "/accident" },
            { name: "Claim or self-pay calculator", path: "/calculator" },
          ],
        })}
      />
      {children}
    </>
  );
}
