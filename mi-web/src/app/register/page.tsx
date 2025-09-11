"use client";
// app/register/page.tsx
import { useState } from "react";
import Link from "next/link";

export default function RegisterPage() {
  const [nombre, setNombre] = useState("");
  const [usuario, setUsuario] = useState("");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOk(null);
    setError(null);
    if (!nombre || !usuario || !pass || !pass2) {
      setError("Completa todos los campos.");
      return;
    }
    if (pass !== pass2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    // Aquí iría tu llamada a API/acción del servidor
    console.log({ nombre, usuario, pass });
    setOk("Usuario registrado (demo).");
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

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {ok && <p className="text-green-700 text-sm">{ok}</p>}

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
