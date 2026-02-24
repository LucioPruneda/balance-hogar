import { verificarToken } from "@/services/invitaciones.service";
import { NextResponse } from "next/server";

// GET /api/invitaciones/[token] — verificar token público (sin auth)
export async function GET(
    _req: Request,
    { params }: { params: Promise<{ token: string }> }
) {
    try {
        const { token } = await params;
        const invitacion = await verificarToken(token);

        if (!invitacion) {
            return NextResponse.json(
                { error: "El link de invitación no es válido o ya fue utilizado" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            data: { organizationName: invitacion.organization.name },
        });

    } catch (error) {
        console.error("[GET_INVITACION_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}