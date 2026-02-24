import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";

type FiltrosMovimiento = {
    tipo?: TipoMovimiento;
    categoriaId?: string;
    fechaDesde?: Date;
    fechaHasta?: Date;
};

const MOVIMIENTO_SELECT = {
    id: true,
    fecha: true,
    descripcion: true,
    monto: true,
    tipo: true,
    esCompartido: true,
    cuotaInfo: true,
    createdAt: true,
    categoria: {
        select: { id: true, nombre: true, tipo: true },
    },
    createdBy: {
        select: { id: true, name: true },
    },
};

// Listar movimientos de una organización con filtros opcionales
export async function getMovimientos(
    organizationId: string,
    filtros: FiltrosMovimiento = {}
) {
    const { tipo, categoriaId, fechaDesde, fechaHasta } = filtros;

    return prisma.movimiento.findMany({
        where: {
            organizationId,
            ...(tipo && { tipo }),
            ...(categoriaId && { categoriaId }),
            ...(fechaDesde || fechaHasta
                ? {
                    fecha: {
                        ...(fechaDesde && { gte: fechaDesde }),
                        ...(fechaHasta && { lte: fechaHasta }),
                    },
                }
                : {}),
        },
        orderBy: { fecha: "desc" },
        select: MOVIMIENTO_SELECT,
    });
}

// Crear un movimiento
export async function createMovimiento(
    organizationId: string,
    createdById: string,
    data: {
        fecha: Date;
        descripcion: string;
        monto: number;
        tipo: TipoMovimiento;
        categoriaId: string;
        esCompartido?: boolean;
        cuotaInfo?: string;
    }
) {
    const categoria = await prisma.categoria.findFirst({
        where: {
            id: data.categoriaId,
            organizationId,
            tipo: data.tipo,
        },
    });

    if (!categoria) return null;

    return prisma.movimiento.create({
        data: {
            ...data,
            organizationId,
            createdById,
            esCompartido: data.esCompartido ?? false,
        },
        select: MOVIMIENTO_SELECT,
    });
}

// Editar un movimiento
export async function updateMovimiento(
    id: string,
    organizationId: string,
    data: {
        fecha?: Date;
        descripcion?: string;
        monto?: number;
        tipo?: TipoMovimiento;
        categoriaId?: string;
        esCompartido?: boolean;
        cuotaInfo?: string;
    }
) {
    const movimiento = await prisma.movimiento.findFirst({
        where: { id, organizationId },
    });

    if (!movimiento) return null;

    if (data.categoriaId || data.tipo) {
        const tipo = data.tipo ?? movimiento.tipo;
        const categoriaId = data.categoriaId ?? movimiento.categoriaId;

        const categoria = await prisma.categoria.findFirst({
            where: { id: categoriaId, organizationId, tipo },
        });

        if (!categoria) return null;
    }

    return prisma.movimiento.update({
        where: { id },
        data,
        select: MOVIMIENTO_SELECT,
    });
}

// Eliminar un movimiento
export async function deleteMovimiento(id: string, organizationId: string) {
    const movimiento = await prisma.movimiento.findFirst({
        where: { id, organizationId },
    });

    if (!movimiento) return null;

    return prisma.movimiento.delete({
        where: { id },
    });
}