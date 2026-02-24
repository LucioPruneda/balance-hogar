import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";
import { NextResponse } from "next/server";

type TransaccionConfirmar = {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: "INGRESO" | "GASTO";
    cuotaInfo: string | null;
    categoriaId: string;
    esCompartido: boolean;
};

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const { transacciones } = body as { transacciones: TransaccionConfirmar[] };

        if (!transacciones || transacciones.length === 0) {
            return NextResponse.json({ error: "No hay transacciones para importar" }, { status: 400 });
        }

        // Validar que todas tengan categoría asignada
        const sinCategoria = transacciones.filter((t) => !t.categoriaId);
        if (sinCategoria.length > 0) {
            return NextResponse.json(
                { error: `Hay ${sinCategoria.length} transacciones sin categoría asignada` },
                { status: 400 }
            );
        }

        // Crear todos los movimientos en una transacción
        const movimientos = await prisma.$transaction(
            transacciones.map((t) =>
                prisma.movimiento.create({
                    data: {
                        fecha: new Date(t.fecha),
                        descripcion: t.descripcion,
                        monto: t.monto,
                        tipo: t.tipo as TipoMovimiento,
                        cuotaInfo: t.cuotaInfo,
                        esCompartido: t.esCompartido,
                        categoriaId: t.categoriaId,
                        organizationId: user.organizationId,
                        createdById: user.userId,
                    },
                })
            )
        );

        return NextResponse.json(
            { message: `${movimientos.length} movimientos importados correctamente` },
            { status: 201 }
        );

    } catch (error) {
        console.error("[POST_IMPORTAR_CONFIRMAR_ERROR]", error);
        return NextResponse.json({ error: "Error al importar los movimientos" }, { status: 500 });
    }
}