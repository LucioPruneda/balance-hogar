import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST() {
    try {
        cookies().delete("token");

        return NextResponse.json(
            { message: "Logout exitoso" },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            { error: "Error al cerrar sesión" },
            { status: 500 }
        );
    }
}
