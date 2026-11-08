import { Suspense } from "react";
import ConfirmReminderClient from "../../../components/reminders/ConfirmReminderClient";

export const metadata = {
  title: "Confirm Reminders",
  robots: { index: false, follow: false },
};

export default function ConfirmReminderPage() {
  return (
    <section className="tool-page section-pad">
      <Suspense fallback={null}>
        <ConfirmReminderClient />
      </Suspense>
    </section>
  );
}
