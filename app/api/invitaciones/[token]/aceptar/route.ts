import { aceptarInvitacion } from "@/services/invitaciones.service";
import { NextResponse } from "next/server";

// POST /api/invitaciones/[token]/aceptar — registro público (sin auth)
export async function POST(
    req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const body = await req.json();
        const { name, email, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 8 caracteres" },
                { status: 400 }
            );
        }

        const resultado = await aceptarInvitacion(token, { name, email, password });

        if (!resultado) {
            return NextResponse.json(
                { error: "El link de invitación no es válido o ya fue utilizado" },
                { status: 400 }
            );
        }

        return NextResponse.json({
            message: `Bienvenido a ${resultado.organizationName}`,
            data: { name: resultado.user.name },
        }, { status: 201 });

    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "El email ya está registrado" }, { status: 409 });
        }
        console.error("[POST_ACEPTAR_INVITACION_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}