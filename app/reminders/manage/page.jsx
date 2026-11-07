import { Suspense } from "react";
import ManageRemindersClient from "../../../components/reminders/ManageRemindersClient";

export const metadata = {
  title: "Manage Reminders",
  robots: { index: false, follow: false },
};

export default function ManageRemindersPage() {
  return (
    <section className="tool-page section-pad">
      <Suspense fallback={null}>
        <ManageRemindersClient />
      </Suspense>
    </section>
  );
}
