import { prisma } from "@/lib/prisma";
import { TipoMovimiento } from "@prisma/client";

// Listar categorías de una organización agrupadas por tipo
export async function getCategoriasByOrganization(organizationId: string) {
    const categorias = await prisma.categoria.findMany({
        where: { organizationId },
        orderBy: { nombre: "asc" },
        select: {
            id: true,
            nombre: true,
            tipo: true,
            createdAt: true,
        },
    });

    // Agrupar por tipo
    return {
        ingresos: categorias.filter((c) => c.tipo === TipoMovimiento.INGRESO),
        gastos: categorias.filter((c) => c.tipo === TipoMovimiento.GASTO),
    };
}

// Crear una nueva categoría
export async function createCategoria(
    organizationId: string,
    nombre: string,
    tipo: TipoMovimiento
) {
    return prisma.categoria.create({
        data: {
            nombre,
            tipo,
            organizationId,
        },
        select: {
            id: true,
            nombre: true,
            tipo: true,
            createdAt: true,
        },
    });
}

// Editar el nombre de una categoría (el tipo no se puede cambiar)
export async function updateCategoria(
    id: string,
    organizationId: string,
    nombre: string
) {
    // Verificar que la categoría pertenece a la organización
    const categoria = await prisma.categoria.findFirst({
        where: { id, organizationId },
    });

    if (!categoria) return null;

    return prisma.categoria.update({
        where: { id },
        data: { nombre },
        select: {
            id: true,
            nombre: true,
            tipo: true,
            createdAt: true,
        },
    });
}