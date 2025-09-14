"use client";
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!nombre || !usuario || !pass || !pass2) {
      setMsg("Completa todos los campos.");
      return;
    }
    if (pass !== pass2) {
      setMsg("Las contraseñas no coinciden.");
      return;
    }

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, usuario, pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Error al registrar.");
        return;
      }
      setMsg("Usuario registrado (hash guardado en archivo).");
      setNombre("");
      setUsuario("");
      setPass("");
      setPass2("");
    } catch (err: any) {
      setMsg("Error de red/servidor.");
    }
  };

  return (
    <main className="max-w-md mx-auto bg-white p-6 rounded-2xl shadow">
      <h1 className="text-2xl font-bold mb-4">Registro</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nombre</label>
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
            placeholder="Tu nombre"
          />
        </div>
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
        <div>
          <label className="block text-sm font-medium mb-1">Confirmar contraseña</label>
          <input
            type="password"
            value={pass2}
            onChange={(e) => setPass2(e.target.value)}
            className="w-full border rounded-xl px-3 py-2"
            placeholder="••••••••"
          />
        </div>

        {msg && <p className="text-sm">{msg}</p>}

        <button
          type="submit"
          className="w-full bg-black text-white rounded-xl py-2 font-medium"
        >
          Crear cuenta
        </button>
      </form>

      <p className="text-sm mt-4">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="underline">
          Inicia sesión
        </Link>
      </p>
    </main>
  );
}
