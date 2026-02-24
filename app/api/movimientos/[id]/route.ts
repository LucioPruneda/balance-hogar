import { getCurrentUser } from "@/lib/auth";
import { updateMovimiento, deleteMovimiento } from "@/services/movimientos.service";
import { TipoMovimiento } from "@prisma/client";
import { NextResponse } from "next/server";

// PUT /api/movimientos/[id]
export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;
        const body = await req.json();
        const { fecha, descripcion, monto, tipo, categoriaId, esCompartido } = body;

        if (tipo && !Object.values(TipoMovimiento).includes(tipo)) {
            return NextResponse.json(
                { error: "El tipo debe ser INGRESO o GASTO" },
                { status: 400 }
            );
        }

        if (monto !== undefined && (typeof monto !== "number" || monto <= 0)) {
            return NextResponse.json(
                { error: "El monto debe ser un número positivo" },
                { status: 400 }
            );
        }

        const movimiento = await updateMovimiento(id, user.organizationId, {
            ...(fecha && { fecha: new Date(fecha) }),
            ...(descripcion && { descripcion }),
            ...(monto && { monto }),
            ...(tipo && { tipo }),
            ...(categoriaId && { categoriaId }),
            ...(esCompartido !== undefined && { esCompartido }),
        });

        if (!movimiento) {
            return NextResponse.json(
                { error: "Movimiento no encontrado o categoría inválida" },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: movimiento }, { status: 200 });

    } catch (error) {
        console.error("[PUT_MOVIMIENTO_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// DELETE /api/movimientos/[id]
export async function DELETE(
    _req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { id } = await params;

        const movimiento = await deleteMovimiento(id, user.organizationId);

        if (!movimiento) {
            return NextResponse.json({ error: "Movimiento no encontrado" }, { status: 404 });
        }

        return NextResponse.json(
            { message: "Movimiento eliminado correctamente" },
            { status: 200 }
        );

    } catch (error) {
        console.error("[DELETE_MOVIMIENTO_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}