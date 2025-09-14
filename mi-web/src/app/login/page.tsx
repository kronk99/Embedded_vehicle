"use client";
import { useState } from "react";
import Link from "next/link";

export default function LoginPage() {
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!usuario || !pass) {
      setMsg("Ingresa usuario y contraseña.");
      return;
    }

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Credenciales inválidas.");
        return;
      }
      localStorage.setItem("username", usuario);
      window.location.href = "/drive";
    } catch (err: any) {
      setMsg("Error de red/servidor.");
    }
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
