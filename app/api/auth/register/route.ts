import { prisma } from "@/lib/prisma";
import { Role, TipoMovimiento } from "@prisma/client";
import { hash } from "bcrypt";
import { NextResponse } from "next/server";

// Categorías que se crean automáticamente para cada nueva organización
const CATEGORIAS_DEFAULT: { nombre: string; tipo: TipoMovimiento }[] = [
    { nombre: "Salario", tipo: TipoMovimiento.INGRESO },
    { nombre: "Freelance", tipo: TipoMovimiento.INGRESO },
    { nombre: "Comida", tipo: TipoMovimiento.GASTO },
    { nombre: "Transporte", tipo: TipoMovimiento.GASTO },
    { nombre: "Servicios", tipo: TipoMovimiento.GASTO },
    { nombre: "Otros", tipo: TipoMovimiento.GASTO },
];

// Convierte un nombre en slug: "Mi Organización" → "mi-organizacion"
function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFD")                    // separa letras de sus acentos
        .replace(/[\u0300-\u036f]/g, "")     // elimina los acentos
        .replace(/[^a-z0-9\s-]/g, "")       // elimina caracteres especiales
        .trim()
        .replace(/\s+/g, "-");              // reemplaza espacios por guiones
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { email, password, name, organizationName } = body;

        if (!email || !password || !name || !organizationName) {
            return NextResponse.json(
                { error: "Faltan campos obligatorios" },
                { status: 400 }
            );
        }

        if (password.length < 8) {
            return NextResponse.json(
                { error: "La contraseña debe tener al menos 8 caracteres" },
                { status: 400 }
            );
        }

        const passwordHash = await hash(password, 12);
        const slug = generateSlug(organizationName);

        const result = await prisma.$transaction(async (tx) => {
            // 1. Crear usuario
            const user = await tx.user.create({
                data: {
                    email,
                    password: passwordHash,
                    name,
                },
            });

            // 2. Crear organización con slug
            const organization = await tx.organization.create({
                data: {
                    name: organizationName,
                    slug,
                },
            });

            // 3. Crear categorías default asociadas a la organización
            await tx.categoria.createMany({
                data: CATEGORIAS_DEFAULT.map((categoria) => ({
                    ...categoria,
                    organizationId: organization.id,
                })),
            });

            // 4. Crear membership con rol OWNER
            const membership = await tx.membership.create({
                data: {
                    userId: user.id,
                    organizationId: organization.id,
                    role: Role.OWNER,
                },
            });

            return { user, organization, membership };
        });

        return NextResponse.json(
            {
                message: "Registro exitoso",
                data: {
                    userId: result.user.id,
                    organizationId: result.organization.id,
                    role: result.membership.role,
                },
            },
            { status: 201 }
        );

    } catch (error: any) {
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "El email o nombre de organización ya está registrado" },
                { status: 409 }
            );
        }

        console.error("[REGISTER_ERROR]", error);

        return NextResponse.json(
            { error: "Error interno del servidor" },
            { status: 500 }
        );
    }
}