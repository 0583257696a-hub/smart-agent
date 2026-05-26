import "../style.css";

export const metadata = {
  title: "מרכז תפעול לסוכן",
  description: "Insurance Operations Platform for Israeli insurance agents",
};

export default function RootLayout({ children }) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
