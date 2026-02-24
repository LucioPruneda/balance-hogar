import { getCurrentUser } from "@/lib/auth";
import { getCategoriasByOrganization, createCategoria } from "@/services/categorias.service";
import { TipoMovimiento } from "@prisma/client";
import { NextResponse } from "next/server";

// GET /api/categorias
export async function GET() {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const categorias = await getCategoriasByOrganization(user.organizationId);

        return NextResponse.json({ data: categorias }, { status: 200 });

    } catch (error) {
        console.error("[GET_CATEGORIAS_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// POST /api/categorias
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const { nombre, tipo } = body;

        if (!nombre || !tipo) {
            return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
        }

        if (!Object.values(TipoMovimiento).includes(tipo)) {
            return NextResponse.json(
                { error: "El tipo debe ser INGRESO o GASTO" },
                { status: 400 }
            );
        }

        const categoria = await createCategoria(user.organizationId, nombre, tipo);

        return NextResponse.json({ data: categoria }, { status: 201 });

    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Ya existe una categoría con ese nombre y tipo" },
                { status: 409 }
            );
        }

        console.error("[POST_CATEGORIAS_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}