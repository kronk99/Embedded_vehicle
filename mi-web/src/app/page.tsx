// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">Carrito TEC</h1>
      <p>Elige una opcion:</p>
      <div className="flex gap-3">
        <Link href="/register" className="px-4 py-2 rounded-xl border">Register</Link>
        <Link href="/login" className="px-4 py-2 rounded-xl border">Login</Link>
      </div>
    </main>
  );
}
