import { getCurrentUser } from "@/lib/auth";
import { getBalance, saldarDeuda } from "@/services/balance.service";
import { NextResponse } from "next/server";

// GET /api/balance?mes=1&anio=2026
export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const mes = searchParams.get("mes");
        const anio = searchParams.get("anio");

        // Si vienen mes y año, calcular fechaDesde y fechaHasta del mes
        let fechaDesde: Date | undefined;
        let fechaHasta: Date | undefined;

        if (mes && anio) {
            const m = parseInt(mes);
            const a = parseInt(anio);
            fechaDesde = new Date(a, m - 1, 1);           // primer día del mes
            fechaHasta = new Date(a, m, 0, 23, 59, 59);   // último día del mes
        }

        const balance = await getBalance(user.organizationId, { fechaDesde, fechaHasta });

        return NextResponse.json({ data: balance }, { status: 200 });

    } catch (error) {
        console.error("[GET_BALANCE_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}

// POST /api/balance — saldar deuda
export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 });
        }

        const body = await req.json();
        const { monto, nota } = body;

        if (!monto || Number(monto) <= 0) {
            return NextResponse.json(
                { error: "El monto debe ser mayor a 0" },
                { status: 400 }
            );
        }

        const saldo = await saldarDeuda(user.organizationId, monto, nota);

        return NextResponse.json(
            { message: "Deuda saldada correctamente", data: saldo },
            { status: 201 }
        );

    } catch (error) {
        console.error("[POST_SALDAR_DEUDA_ERROR]", error);
        return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
    }
}