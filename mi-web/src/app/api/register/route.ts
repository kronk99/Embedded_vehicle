// app/api/register/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import bcrypt from "bcryptjs";

export const runtime = "nodejs"; // Asegura acceso al sistema de archivos

function sanitize(username: string) {
  const s = username.trim().toLowerCase();
  // Solo letras/números/._- y tamaño 3..32 para evitar problemas de path
  if (!/^[a-z0-9._-]{3,32}$/.test(s)) {
    throw new Error("Usuario inválido. Usa a-z, 0-9, . _ - (3-32 chars).");
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const { nombre, usuario, pass } = await req.json();

    if (!nombre || !usuario || !pass) {
      return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
    }

    const safeUser = sanitize(usuario);
    const baseDir = path.join(process.cwd(), "data", "users");
    await fs.mkdir(baseDir, { recursive: true });

    const filePath = path.join(baseDir, `${safeUser}.hash`);

    // Si ya existe el usuario, no sobreescribir
    try {
      await fs.access(filePath);
      return NextResponse.json({ error: "Usuario ya existe." }, { status: 409 });
    } catch {
      // no existe, continúa
    }

    const saltRounds = 10;
    const hash = await bcrypt.hash(pass, saltRounds);

    // Guarda SOLO el hash en un .hash (archivo de texto)
    await fs.writeFile(filePath, hash + "\n", { mode: 0o600 });

    return NextResponse.json({ ok: true, user: safeUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}
