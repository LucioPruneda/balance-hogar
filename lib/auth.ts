import { jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export type SessionPayload = {
    userId: string;
    organizationId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
};

type Role = SessionPayload["role"];

// Obtener el usuario actual desde la cookie
export async function getCurrentUser(): Promise<SessionPayload | null> {
    try {
        const token = (await cookies()).get("token")?.value;

        if (!token) return null;

        const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
        const { payload } = await jwtVerify(token, secret);

        return payload as SessionPayload;

    } catch {
        return null;
    }
}

// Verificar que el usuario esté autenticado y tenga el rol requerido
export async function requireRole(allowedRoles: Role[]): Promise<{
    user: SessionPayload | null;
    response: NextResponse | null;
}> {
    const user = await getCurrentUser();

    if (!user) {
        return {
            user: null,
            response: NextResponse.json(
                { error: "No autorizado" },
                { status: 401 }
            ),
        };
    }

    if (!allowedRoles.includes(user.role)) {
        return {
            user: null,
            response: NextResponse.json(
                { error: "No tenés permisos para realizar esta acción" },
                { status: 403 }
            ),
        };
    }

    return { user, response: null };
}