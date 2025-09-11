// app/page.tsx
import Link from "next/link";

export default function Home() {
  return (
    <main className="space-y-4">
      <h1 className="text-3xl font-bold">Demo de pantallas</h1>
      <p>Elige una pantalla:</p>
      <div className="flex gap-3">
        <Link href="/register" className="px-4 py-2 rounded-xl border">Register</Link>
        <Link href="/login" className="px-4 py-2 rounded-xl border">Login</Link>
        <Link href="/drive" className="px-4 py-2 rounded-xl border">Drive</Link>
      </div>
    </main>
  );
}
