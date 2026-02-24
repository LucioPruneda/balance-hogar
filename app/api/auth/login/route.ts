import { prisma } from "@/lib/prisma";
import { compare } from "bcrypt";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password } = body;

        if (!email || !password) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios" },
                { status: 400 }
            );
        }

        // Buscar usuario
        const user = await prisma.user.findUnique({
            where: { email },
            include: {
                memberships: {
                    take: 1,
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Email o contraseña incorrectos" },
                { status: 401 }
            );
        }

        // Verificar contraseña
        const isValid = await compare(password, user.password);

        if (!isValid) {
            return NextResponse.json(
                { error: "Email o contraseña incorrectos" },
                { status: 401 }
            );
        }

        // Obtener membership
        const membership = user.memberships[0];

        if (!membership) {
            return NextResponse.json(
                { error: "El usuario no pertenece a ninguna organización" },
                { status: 403 }
            );
        }

        // Generar JWT
        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);

        const token = await new SignJWT({
            userId: user.id,
            organizationId: membership.organizationId,
            role: membership.role,
        })
            .setProtectedHeader({ alg: "HS256" })
            .setExpirationTime("7d")
            .sign(secret);

        // Setear cookie httpOnly
        (await cookies()).set("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            maxAge: 60 * 60 * 24 * 7, // 7 días en segundos
            path: "/",
        });

        return NextResponse.json(
            {
                message: "Login exitoso",
                data: {
                    userId: user.id,
                    organizationId: membership.organizationId,
                    role: membership.role,
                },
            },
            { status: 200 }
        );

    } catch (error) {
        console.error("[LOGIN_ERROR]", error);

        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}