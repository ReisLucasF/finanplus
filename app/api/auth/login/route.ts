import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = loginSchema.parse(body);

    // Buscar usuário
    const user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // Verificar se usuário está ativo
    if (!user.isActive) {
      return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });
    }

    // Verificar senha
    const isValidPassword = await bcrypt.compare(
      validatedData.password,
      user.password
    );

    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Email ou senha inválidos" },
        { status: 401 }
      );
    }

    // Gerar token JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Setar cookie
    await setAuthCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
      message: "Login realizado com sucesso",
    });
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Login error:", error);
    return NextResponse.json({ error: "Erro ao fazer login" }, { status: 500 });
  }
}
