import { Suspense } from "react";
import SettlementFormClient from "./SettlementFormClient";

export const metadata = {
  title: "Private Settlement Agreement",
  description:
    "Create a printable private settlement agreement for a minor motor accident in Singapore with no injuries, for both drivers to sign.",
  openGraph: {
    title: "Private Settlement Agreement · ClaimWise SG",
    description:
      "Create a printable private settlement agreement for a minor motor accident in Singapore with no injuries, for both drivers to sign.",
  },
};

export default function SettlementPage() {
  return (
    <Suspense
      fallback={
        <div className="section-pad" style={{ textAlign: "center", padding: "60px 20px" }}>
          <p>Loading private settlement generator...</p>
        </div>
      }
    >
      <SettlementFormClient />
    </Suspense>
  );
}

