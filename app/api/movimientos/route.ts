import { getCurrentUser } from "@/lib/auth";
import { getMovimientos, createMovimiento } from "@/services/movimientos.service";
import { TipoMovimiento } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/movimientos
export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const tipo = searchParams.get("tipo") as TipoMovimiento | null;
        const categoriaId = searchParams.get("categoriaId") ?? undefined;
        const fechaDesde = searchParams.get("fechaDesde");
        const fechaHasta = searchParams.get("fechaHasta");

        if (tipo && !Object.values(TipoMovimiento).includes(tipo)) {
            return NextResponse.json(
                { error: "El tipo debe ser INGRESO o GASTO" },
                { status: 400 }
            );
        }

        const movimientos = await getMovimientos(user.organizationId, {
            tipo: tipo ?? undefined,
            categoriaId,
            fechaDesde: fechaDesde ? new Date(fechaDesde) : undefined,
            fechaHasta: fechaHasta ? new Date(fechaHasta) : undefined,
        });

        return NextResponse.json({ data: movimientos }, { status: 200 });

    } catch (error) {
        console.error("[GET_MOVIMIENTOS_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// POST /api/movimientos
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const { fecha, descripcion, monto, tipo, categoriaId, esCompartido } = body;

        if (!fecha || !descripcion || !monto || !tipo || !categoriaId) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        if (!Object.values(TipoMovimiento).includes(tipo)) {
            return NextResponse.json(
                { error: "El tipo debe ser INGRESO o GASTO" },
                { status: 400 }
            );
        }

        if (typeof monto !== "number" || monto <= 0) {
            return NextResponse.json(
                { error: "El monto debe ser un número positivo" },
                { status: 400 }
            );
        }

        const movimiento = await createMovimiento(
            user.organizationId,
            user.userId,
            {
                fecha: new Date(fecha),
                descripcion,
                monto,
                tipo,
                categoriaId,
                esCompartido: esCompartido ?? false,
            }
        );

        if (!movimiento) {
            return NextResponse.json(
                { error: "La categoría no existe o no coincide con el tipo de movimiento" },
                { status: 400 }
            );
        }

        return NextResponse.json({ data: movimiento }, { status: 201 });

    } catch (error) {
        console.error("[POST_MOVIMIENTOS_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}