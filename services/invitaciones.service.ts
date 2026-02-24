import { prisma } from "@/lib/prisma";
import { Role, TipoMovimiento } from "@prisma/client";
import { hash } from "bcrypt";

const CATEGORIAS_DEFAULT: { nombre: string; tipo: TipoMovimiento }[] = [
    { nombre: "Salario", tipo: TipoMovimiento.INGRESO },
    { nombre: "Freelance", tipo: TipoMovimiento.INGRESO },
    { nombre: "Comida", tipo: TipoMovimiento.GASTO },
    { nombre: "Transporte", tipo: TipoMovimiento.GASTO },
    { nombre: "Servicios", tipo: TipoMovimiento.GASTO },
    { nombre: "Tarjeta", tipo: TipoMovimiento.GASTO },
    { nombre: "Otros", tipo: TipoMovimiento.GASTO },
];

function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
}

// Crear una invitación para una organización existente
export async function crearInvitacion(organizationId: string) {
    // Verificar que la organización existe
    const org = await prisma.organization.findUnique({
        where: { id: organizationId },
    });
    if (!org) return null;

    return prisma.invitacion.create({
        data: { organizationId },
        select: {
            token: true,
            organization: { select: { name: true } },
        },
    });
}

// Crear una nueva organización y generar su primera invitación
export async function crearOrganizacionConInvitacion(nombre: string) {
    const slug = generateSlug(nombre);

    return prisma.$transaction(async (tx) => {
        const organization = await tx.organization.create({
            data: { name: nombre, slug },
        });

        await tx.categoria.createMany({
            data: CATEGORIAS_DEFAULT.map((c) => ({
                ...c,
                organizationId: organization.id,
            })),
        });

        const invitacion = await tx.invitacion.create({
            data: { organizationId: organization.id },
            select: { token: true },
        });

        return { organization, token: invitacion.token };
    });
}

// Verificar token — devuelve la organización si el token es válido y no fue usado
export async function verificarToken(token: string) {
    const invitacion = await prisma.invitacion.findUnique({
        where: { token },
        select: {
            id: true,
            usada: true,
            organization: { select: { id: true, name: true } },
        },
    });

    if (!invitacion || invitacion.usada) return null;
    return invitacion;
}

// Aceptar invitación — crea el usuario y lo une a la organización
export async function aceptarInvitacion(
    token: string,
    data: { name: string; email: string; password: string }
) {
    const invitacion = await verificarToken(token);
    if (!invitacion) return null;

    const passwordHash = await hash(data.password, 12);

    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                name: data.name,
                email: data.email,
                password: passwordHash,
            },
        });

        await tx.membership.create({
            data: {
                userId: user.id,
                organizationId: invitacion.organization.id,
                role: Role.MEMBER,
            },
        });

        // Marcar invitación como usada
        await tx.invitacion.update({
            where: { id: invitacion.id },
            data: { usada: true },
        });

        return { user, organizationName: invitacion.organization.name };
    });
}