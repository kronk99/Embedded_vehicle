// app/layout.tsx
import "./globals.css";

export const metadata = {
  title: "Auth Demo",
  description: "Register / Login / Drive",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-4xl mx-auto p-6">
          {children}
        </div>
      </body>
    </html>
  );
}
