"use client";
// app/login/page.tsx
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!usuario || !pass) {
      setMsg("Ingresa usuario y contraseña.");
      return;
    }
    // Aquí iría tu llamada a API/acción del servidor
    console.log({ usuario, pass });
    setMsg("Login enviado (demo).");
  };

  return (
    <main className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4">Iniciar sesión</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Usuario</label>
          <input
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
            placeholder="usuario123"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Contraseña</label>
          <input
            type="password"
            value={pass}
            onChange={(e) => setPass(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
            placeholder="••••••••"
          />
        </div>

        {msg && <p className="text-sm">{msg}</p>}

        <button
          type="submit"
          className="w-full bg-black text-white rounded-xl py-2 font-medium"
        >
          Entrar
        </button>
      </form>

      <p className="text-sm mt-4">
        ¿No tienes cuenta?{" "}
        <Link href="/register" className="underline">
          Regístrate
        </Link>
      </p>
    </main>
  );
}
