// app/api/login/route.ts
import { NextResponse } from "next/server";
import path from "path";
import { promises as fs } from "fs";
import bcrypt from "bcryptjs";

export const runtime = "nodejs";

function sanitize(username: string) {
  const s = username.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(s)) {
    throw new Error("Usuario inválido.");
  }
  return s;
}

export async function POST(req: Request) {
  try {
    const { usuario, pass } = await req.json();
    if (!usuario || !pass) {
      return NextResponse.json({ error: "Faltan campos." }, { status: 400 });
    }

    const safeUser = sanitize(usuario);
    const filePath = path.join(process.cwd(), "data", "users", `${safeUser}.hash`);

    let storedHash: string;
    try {
      storedHash = await fs.readFile(filePath, "utf8");
    } catch {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    const ok = await bcrypt.compare(pass, storedHash.trim());
    if (!ok) {
      return NextResponse.json({ error: "Credenciales inválidas." }, { status: 401 });
    }

    // Aquí podrías crear sesión/jwt; por ahora solo confirmamos OK
    return NextResponse.json({ ok: true, user: safeUser });
  } catch (e: any) {
    return NextResponse.json({ error: e.message ?? "Error" }, { status: 500 });
  }
}
