import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";
import { signToken, setAuthCookie } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validar dados
    const validatedData = registerSchema.parse(body);

    // Verificar se usuário já existe
    const existingUser = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      );
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(validatedData.password, 10);

    // Criar usuário
    const user = await prisma.user.create({
      data: {
        email: validatedData.email,
        password: hashedPassword,
        name: validatedData.name,
        role: "USER",
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        onboardingCompleted: true,
      },
    });

    // Gerar token JWT
    const token = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Setar cookie
    await setAuthCookie(token);

    return NextResponse.json(
      {
        user,
        message: "Usuário criado com sucesso",
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: "Dados inválidos", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Erro ao criar usuário" },
      { status: 500 }
    );
  }
}
