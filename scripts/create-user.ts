import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcrypt";

const prisma = new PrismaClient();

// ─────────────────────────────────────────
// CONFIGURÁ ESTOS DATOS ANTES DE CORRER
// ─────────────────────────────────────────
const ORGANIZATION_ID = "cmluw6hoe0002pp6njj1aqost"; // pegá el id de tu organización
const NOMBRE = "Lucía"; // nombre del nuevo usuario
const EMAIL = "mlatzori@outlook.com"; // email del nuevo usuario
const PASSWORD = "HoracioPancito"; // contraseña del nuevo usuario
// ─────────────────────────────────────────

async function main() {
    if (!ORGANIZATION_ID || !NOMBRE || !EMAIL || !PASSWORD) {
        console.error("❌ Completá todos los datos antes de correr el script");
        process.exit(1);
    }

    if (PASSWORD.length < 8) {
        console.error("❌ La contraseña debe tener al menos 8 caracteres");
        process.exit(1);
    }

    const existingUser = await prisma.user.findUnique({
        where: { email: EMAIL },
    });

    if (existingUser) {
        console.error("❌ Ya existe un usuario con ese email");
        process.exit(1);
    }

    const organization = await prisma.organization.findUnique({
        where: { id: ORGANIZATION_ID },
    });

    if (!organization) {
        console.error("❌ No existe una organización con ese ID");
        process.exit(1);
    }

    const passwordHash = await hash(PASSWORD, 12);

    const { user, membership } = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                email: EMAIL,
                password: passwordHash,
                name: NOMBRE,
            },
        });

        const membership = await tx.membership.create({
            data: {
                userId: user.id,
                organizationId: ORGANIZATION_ID,
                role: Role.MEMBER,
            },
        });

        return { user, membership };
    });

    console.log("✅ Usuario creado correctamente");
    console.log(`   Nombre: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Rol: ${membership.role}`);
    console.log(`   Organización: ${organization.name}`);
}

main()
    .catch((e) => {
        console.error("❌ Error inesperado:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });