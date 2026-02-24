import { getCurrentUser } from "@/lib/auth";
import { crearInvitacion, crearOrganizacionConInvitacion } from "@/services/invitaciones.service";
import { NextResponse } from "next/server";

// POST /api/invitaciones
// Body: { organizationId } → invitación para org existente
// Body: { nuevaOrganizacion: "Nombre" } → crea org nueva + invitación
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        // Solo el OWNER puede crear invitaciones
        if (user.role !== "OWNER") {
            return NextResponse.json({ error: "Solo el OWNER puede crear invitaciones" }, { status: 403 });
        }

        const body = await req.json();
        const { organizationId, nuevaOrganizacion } = body;

        // Caso 1: invitación para organización existente
        if (organizationId) {
            // "self" significa la organización propia del usuario
            const orgId = organizationId === "self" ? user.organizationId : organizationId;
            const invitacion = await crearInvitacion(orgId);
            if (!invitacion) {
                return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
            }
            return NextResponse.json({ data: invitacion }, { status: 201 });
        }

        // Caso 2: nueva organización + invitación
        if (nuevaOrganizacion) {
            if (nuevaOrganizacion.trim().length < 2) {
                return NextResponse.json({ error: "El nombre debe tener al menos 2 caracteres" }, { status: 400 });
            }
            const resultado = await crearOrganizacionConInvitacion(nuevaOrganizacion.trim());
            return NextResponse.json({ data: resultado }, { status: 201 });
        }

        return NextResponse.json({ error: "Faltan datos" }, { status: 400 });

    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json({ error: "Ya existe una organización con ese nombre" }, { status: 409 });
        }
        console.error("[POST_INVITACIONES_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}