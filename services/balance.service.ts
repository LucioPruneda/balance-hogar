import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

type BalanceUsuario = {
    userId: string;
    name: string;
    totalIngresos: Decimal;
    totalGastos: Decimal;
    balance: Decimal;
};

type DeudaResult = {
    deudorId: string;
    deudorName: string;
    acreedorId: string;
    acreedorName: string;
    monto: Decimal;
};

type BalanceResult = {
    organizacion: {
        totalIngresos: Decimal;
        totalGastos: Decimal;
        balance: Decimal;
    };
    porUsuario: BalanceUsuario[];
    deuda: DeudaResult | null;
};

type FiltroBalance = {
    fechaDesde?: Date;
    fechaHasta?: Date;
};

export async function getBalance(
    organizationId: string,
    filtro: FiltroBalance = {}
): Promise<BalanceResult> {
    const { fechaDesde, fechaHasta } = filtro;

    const filtroDeFecha = fechaDesde || fechaHasta
        ? {
            fecha: {
                ...(fechaDesde && { gte: fechaDesde }),
                ...(fechaHasta && { lte: fechaHasta }),
            },
        }
        : {};

    // ─────────────────────────────────────────
    // Movimientos filtrados por mes (para balance e ingresos/gastos)
    // ─────────────────────────────────────────
    const movimientos = await prisma.movimiento.findMany({
        where: { organizationId, ...filtroDeFecha },
        select: {
            monto: true,
            tipo: true,
            esCompartido: true,
            createdBy: {
                select: { id: true, name: true },
            },
        },
    });

    // ─────────────────────────────────────────
    // Deuda — siempre acumulada desde el último saldo, sin filtro de fecha
    // ─────────────────────────────────────────
    const ultimoSaldo = await prisma.saldoDeuda.findFirst({
        where: { organizationId },
        orderBy: { creadoEn: "desc" },
    });

    const movimientosParaDeuda = await prisma.movimiento.findMany({
        where: {
            organizationId,
            esCompartido: true,
            tipo: TipoMovimiento.GASTO,
            ...(ultimoSaldo ? { createdAt: { gt: ultimoSaldo.creadoEn } } : {}),
        },
        select: {
            monto: true,
            createdBy: {
                select: { id: true, name: true },
            },
        },
    });

    // ─────────────────────────────────────────
    // Calcular balance por usuario
    // ─────────────────────────────────────────
    const usuarioMap = new Map<string, BalanceUsuario>();

    for (const mov of movimientos) {
        const { id: userId, name } = mov.createdBy;

        if (!usuarioMap.has(userId)) {
            usuarioMap.set(userId, {
                userId,
                name,
                totalIngresos: new Decimal(0),
                totalGastos: new Decimal(0),
                balance: new Decimal(0),
            });
        }

        const entry = usuarioMap.get(userId)!;

        if (mov.tipo === TipoMovimiento.INGRESO) {
            entry.totalIngresos = entry.totalIngresos.add(mov.monto);
        } else {
            entry.totalGastos = entry.totalGastos.add(mov.monto);
        }

        entry.balance = entry.totalIngresos.sub(entry.totalGastos);
    }

    const porUsuario = Array.from(usuarioMap.values());

    // ─────────────────────────────────────────
    // Balance total de la organización
    // ─────────────────────────────────────────
    const totalIngresos = porUsuario.reduce(
        (acc, u) => acc.add(u.totalIngresos),
        new Decimal(0)
    );

    const totalGastos = porUsuario.reduce(
        (acc, u) => acc.add(u.totalGastos),
        new Decimal(0)
    );

    // ─────────────────────────────────────────
    // Calcular deuda acumulada
    // ─────────────────────────────────────────
    let deuda: DeudaResult | null = null;

    if (movimientosParaDeuda.length > 0) {
        const pagadoPorUsuario = new Map<string, { name: string; pagado: Decimal }>();

        for (const mov of movimientosParaDeuda) {
            const { id: userId, name } = mov.createdBy;

            if (!pagadoPorUsuario.has(userId)) {
                pagadoPorUsuario.set(userId, { name, pagado: new Decimal(0) });
            }

            const entry = pagadoPorUsuario.get(userId)!;
            entry.pagado = entry.pagado.add(mov.monto);
        }

        const usuarios = Array.from(pagadoPorUsuario.entries());

        if (usuarios.length === 1) {
            const [userId, { name, pagado }] = usuarios[0];

            // Necesitamos el otro usuario — lo buscamos en los members de la org
            const otroMember = await prisma.membership.findFirst({
                where: { organizationId, userId: { not: userId } },
                select: { user: { select: { id: true, name: true } } },
            });

            if (otroMember) {
                deuda = {
                    deudorId: otroMember.user.id,
                    deudorName: otroMember.user.name,
                    acreedorId: userId,
                    acreedorName: name,
                    monto: pagado.div(2),
                };
            }
        }

        if (usuarios.length >= 2) {
            const [[userId1, data1], [userId2, data2]] = usuarios;

            const totalCompartido = data1.pagado.add(data2.pagado);
            const mitad = totalCompartido.div(2);
            const diferencia1 = data1.pagado.sub(mitad);
            const diferencia2 = data2.pagado.sub(mitad);

            if (diferencia1.abs().greaterThan(0.01)) {
                if (diferencia1.greaterThan(0)) {
                    deuda = {
                        deudorId: userId2,
                        deudorName: data2.name,
                        acreedorId: userId1,
                        acreedorName: data1.name,
                        monto: diferencia1,
                    };
                } else {
                    deuda = {
                        deudorId: userId1,
                        deudorName: data1.name,
                        acreedorId: userId2,
                        acreedorName: data2.name,
                        monto: diferencia2,
                    };
                }
            }
        }
    }

    return {
        organizacion: {
            totalIngresos,
            totalGastos,
            balance: totalIngresos.sub(totalGastos),
        },
        porUsuario,
        deuda,
    };
}

// Saldar la deuda
export async function saldarDeuda(
    organizationId: string,
    monto: Decimal,
    nota?: string
) {
    return prisma.saldoDeuda.create({
        data: { organizationId, monto, nota },
    });
}