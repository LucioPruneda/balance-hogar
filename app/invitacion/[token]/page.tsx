"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function InvitacionPage({
    params,
}: {
    params: Promise<{ token: string }>;
}) {
    const router = useRouter();

    const [token, setToken] = useState("");
    const [orgName, setOrgName] = useState("");
    const [estado, setEstado] = useState<"cargando" | "valido" | "invalido">("cargando");

    const [form, setForm] = useState({ name: "", email: "", password: "" });
    const [registrando, setRegistrando] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const init = async () => {
            const { token: t } = await params;
            setToken(t);

            const res = await fetch(`/api/invitaciones/${t}`);
            if (!res.ok) {
                setEstado("invalido");
                return;
            }
            const data = await res.json();
            setOrgName(data.data.organizationName);
            setEstado("valido");
        };
        init();
    }, []);

    const handleRegistrar = async () => {
        if (!form.name || !form.email || !form.password) {
            setError("Completá todos los campos");
            return;
        }
        if (form.password.length < 8) {
            setError("La contraseña debe tener al menos 8 caracteres");
            return;
        }

        setError("");
        setRegistrando(true);

        try {
            const res = await fetch(`/api/invitaciones/${token}/aceptar`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al registrarse");
                return;
            }

            // Registro exitoso → ir al login
            router.push(`/login?mensaje=Registro exitoso. Iniciá sesión para continuar.`);

        } catch {
            setError("Error de conexión");
        } finally {
            setRegistrando(false);
        }
    };

    if (estado === "cargando") {
        return (
            <div className="min-h-screen bg-[#f6f8f6] flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span className="font-medium">Verificando invitación...</span>
                </div>
            </div>
        );
    }

    if (estado === "invalido") {
        return (
            <div className="min-h-screen bg-[#f6f8f6] flex flex-col items-center justify-center px-4">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="material-symbols-outlined text-red-500 text-3xl">link_off</span>
                    </div>
                    <h1 className="text-xl font-black text-slate-900 mb-2">Link inválido</h1>
                    <p className="text-slate-500 text-sm">Este link de invitación no es válido o ya fue utilizado.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f6f8f6] flex flex-col items-center justify-center px-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <img src="/logo-bulldog.png" alt="Logo" className="size-12 object-contain rounded-xl mb-3" />
                    <h1 className="text-2xl font-black text-slate-900">Rita</h1>
                </div>

                {/* Info organización */}
                <div className="bg-[#13ec5b]/10 border border-[#13ec5b]/20 rounded-xl px-4 py-3 mb-6 text-center">
                    <p className="text-sm text-slate-600">Te invitaron a unirte a</p>
                    <p className="text-lg font-black text-slate-900">{orgName}</p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tu nombre</label>
                        <input
                            type="text"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Ej. Lucía"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
                        <input
                            type="email"
                            value={form.email}
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                            placeholder="tu@email.com"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Contraseña</label>
                        <input
                            type="password"
                            value={form.password}
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                            placeholder="Mínimo 8 caracteres"
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                            {error}
                        </p>
                    )}

                    <button
                        onClick={handleRegistrar}
                        disabled={registrando}
                        className="w-full py-3 bg-[#13ec5b] text-slate-900 font-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {registrando ? "Creando cuenta..." : "Crear cuenta y unirme"}
                    </button>
                </div>

                <p className="text-center text-xs text-slate-400 mt-6">
                    ¿Ya tenés cuenta?{" "}
                    <Link href="/login" className="text-[#13ec5b] font-bold hover:underline">
                        Iniciá sesión
                    </Link>
                </p>
            </div>
        </div>
    );
}