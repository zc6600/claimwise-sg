import { Suspense } from "react";
import SettlementFormClient from "./SettlementFormClient";

export const metadata = {
  title: "GIA Private Settlement Form Generator",
  description:
    "Generate an official, Singapore GIA Motor Claims Framework compliant Private Settlement Agreement for non-injury traffic accidents.",
  openGraph: {
    title: "GIA Private Settlement Form Generator · ClaimWise SG",
    description:
      "Generate an official, Singapore GIA Motor Claims Framework compliant Private Settlement Agreement for non-injury traffic accidents.",
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

