import { NextRequest, NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { signToken, setAuthCookie } from "@/lib/auth";

const client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXTAUTH_URL}/api/auth/google/callback`
);

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json();

    // Verificar o token do Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    const { email, name, sub: googleId, picture } = payload;

    // Verificar se usuário já existe (por googleId ou email)
    let user = await prisma.user.findFirst({
      where: {
        OR: [{ googleId }, { email }],
      },
    });

    if (user) {
      // Usuário existe, verificar se está ativo
      if (!user.isActive) {
        return NextResponse.json({ error: "Usuário inativo" }, { status: 403 });
      }

      // Se não tinha googleId, atualizar
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId },
        });
      }
    } else {
      // Criar novo usuário
      user = await prisma.user.create({
        data: {
          email,
          name: name || email.split("@")[0],
          googleId,
          password: null, // Usuários OAuth não têm senha
          role: "USER",
        },
      });
    }

    // Gerar token JWT
    const jwtToken = await signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Setar cookie
    await setAuthCookie(jwtToken);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        onboardingCompleted: user.onboardingCompleted,
      },
      message: "Login com Google realizado com sucesso",
    });
  } catch (error: any) {
    console.error("Google OAuth error:", error);
    return NextResponse.json(
      { error: "Erro ao autenticar com Google" },
      { status: 500 }
    );
  }
}
