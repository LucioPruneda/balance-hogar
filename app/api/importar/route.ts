import { getCurrentUser } from "@/lib/auth";
import { parsearSantander, parsearBBVA } from "@/services/importar.service";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const formData = await req.formData();
        const archivo = formData.get("archivo") as File | null;
        const banco = formData.get("banco") as string | null;

        if (!archivo) {
            return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
        }

        if (!banco || !["BBVA", "SANTANDER"].includes(banco)) {
            return NextResponse.json({ error: "Banco inválido" }, { status: 400 });
        }

        const buffer = Buffer.from(await archivo.arrayBuffer());

        const resultado = banco === "SANTANDER"
            ? parsearSantander(buffer)
            : await parsearBBVA(buffer);

        if (resultado.transacciones.length === 0) {
            return NextResponse.json(
                { error: "No se encontraron transacciones en el archivo. Verificá que sea el formato correcto." },
                { status: 400 }
            );
        }

        return NextResponse.json({
            data: resultado.transacciones,
            fechaResumen: resultado.fechaResumen,
        }, { status: 200 });

    } catch (error) {
        console.error("[POST_IMPORTAR_ERROR]", error);
        return NextResponse.json({ error: "Error al procesar el archivo" }, { status: 500 });
    }
}