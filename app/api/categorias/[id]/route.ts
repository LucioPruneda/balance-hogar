import { getCurrentUser } from "@/lib/auth";
import { updateCategoria } from "@/services/categorias.service";
import { NextResponse } from "next/server";

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
        const { nombre } = body;

        if (!nombre) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 });
        }

        const categoria = await updateCategoria(id, user.organizationId, nombre);

        if (!categoria) {
            return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 });
        }

        return NextResponse.json({ data: categoria }, { status: 200 });

    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "Ya existe una categoría con ese nombre y tipo" },
                { status: 409 }
            );
        }

        console.error("[PUT_CATEGORIA_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}