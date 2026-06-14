import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const categorySchema = z.object({
  name: z.string().min(1),
  type: z.enum(["INCOME", "EXPENSE", "BOTH"]),
  icon: z.string().optional(),
});


export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    
    const categories = await prisma.category.findMany({
      where: {
        OR: [
          { userId: null }, 
          { userId: user.userId }, 
        ],
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Erro ao buscar categorias:", error);
    return NextResponse.json(
      { error: "Erro ao buscar categorias" },
      { status: 500 }
    );
  }
}


export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const data = categorySchema.parse(body);

    
    const existing = await prisma.category.findFirst({
      where: {
        name: data.name,
        userId: user.userId,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Já existe uma categoria com esse nome" },
        { status: 400 }
      );
    }

    const category = await prisma.category.create({
      data: {
        ...data,
        userId: user.userId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    console.error("Erro ao criar categoria:", error);
    return NextResponse.json(
      { error: "Erro ao criar categoria" },
      { status: 500 }
    );
  }
}
