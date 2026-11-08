// Stroke icons drawn on a 24 x 24 grid.
const ICONS = {
  claim: "M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z M9.5 12.5l1.8 1.8 3.7-3.8",
  protector: "M12 3l7 3v5c0 4.6-3 8.4-7 10-4-1.6-7-5.4-7-10V6l7-3z M12 8v4 M12 15h.01",
  quotes: "M12 4v16 M7 20h10 M5 8h14 M5 8l-2.5 6a2.5 2.5 0 005 0L5 8z M19 8l-2.5 6a2.5 2.5 0 005 0L19 8z",
  loan: "M4 7h16v12H4z M4 11h16 M8 15h3 M7 4h10",
  coe: "M4 6h16v14H4z M4 10h16 M8 3v5 M16 3v5 M9 15l2 2 4-4",
  car: "M5 16V12l2-5h10l2 5v4 M3 16h18 M5 12h14 M7 16v2 M17 16v2",
  emergency: "M12 4l9 16H3L12 4z M12 10v4 M12 17h.01",
  settlement: "M7 3h7l5 5v13H7z M14 3v5h5 M10 13h6 M10 17h4",
  rules: "M5 4h11a3 3 0 013 3v13H8a3 3 0 01-3-3V4z M5 17a3 3 0 013-3h11 M9 8h6",
};


export default function FeatureIcon({ name }) {
  return (
    <svg
      className="feature-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}
