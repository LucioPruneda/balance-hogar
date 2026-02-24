"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function ConfiguracionPage() {
    const router = useRouter();

    // Invitación para organización propia
    const [generando, setGenerando] = useState(false);
    const [linkPropio, setLinkPropio] = useState("");

    // Nueva organización
    const [nombreOrg, setNombreOrg] = useState("");
    const [creando, setCreando] = useState(false);
    const [linkNuevaOrg, setLinkNuevaOrg] = useState("");
    const [nombreOrgCreada, setNombreOrgCreada] = useState("");

    const [error, setError] = useState("");

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

    const handleGenerarLinkPropio = async () => {
        setError("");
        setGenerando(true);
        try {
            const res = await fetch("/api/invitaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ organizationId: "self" }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setLinkPropio(`${baseUrl}/invitacion/${data.data.token}`);
        } catch {
            setError("Error de conexión");
        } finally {
            setGenerando(false);
        }
    };

    const handleCrearOrg = async () => {
        if (!nombreOrg.trim()) { setError("Ingresá un nombre para la organización"); return; }
        setError("");
        setCreando(true);
        try {
            const res = await fetch("/api/invitaciones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ nuevaOrganizacion: nombreOrg }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.error); return; }
            setLinkNuevaOrg(`${baseUrl}/invitacion/${data.data.token}`);
            setNombreOrgCreada(data.data.organization.name);
            setNombreOrg("");
        } catch {
            setError("Error de conexión");
        } finally {
            setCreando(false);
        }
    };

    const copiarLink = (link: string) => {
        navigator.clipboard.writeText(link);
    };

    return (
        <div className="bg-[#f6f8f6] text-slate-900 min-h-screen flex flex-col">

            {/* Header */}
            <header className="flex items-center justify-between border-b border-[#13ec5b]/10 bg-white/50 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo-bulldog.png" alt="Logo" className="size-8 object-contain rounded-lg" />
                    <h1 className="text-xl font-bold tracking-tight">Rita</h1>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                    <Link href="/dashboard" className="text-slate-500 text-sm font-medium hover:text-[#13ec5b] transition-colors">Dashboard</Link>
                    <Link href="/dashboard/movimientos" className="text-slate-500 text-sm font-medium hover:text-[#13ec5b] transition-colors">Movimientos</Link>
                    <Link href="/dashboard/categorias" className="text-slate-500 text-sm font-medium hover:text-[#13ec5b] transition-colors">Categorías</Link>
                    <Link href="/dashboard/importar" className="text-slate-500 text-sm font-medium hover:text-[#13ec5b] transition-colors">Importar</Link>
                    <span className="text-sm font-semibold border-b-2 border-[#13ec5b] pb-1">Configuración</span>
                </nav>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">logout</span>
                    <span className="hidden md:inline">Cerrar sesión</span>
                </button>
            </header>

            <main className="mx-auto w-full max-w-2xl px-6 py-8">

                <div className="mb-8">
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Configuración</h1>
                    <p className="text-slate-500 mt-1">Gestioná invitaciones y organizaciones.</p>
                </div>

                {error && (
                    <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <p className="text-red-600 font-medium text-sm">{error}</p>
                    </div>
                )}

                {/* Invitar a tu organización */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-[#13ec5b]/10 rounded-lg">
                            <span className="material-symbols-outlined text-[#13ec5b]">person_add</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900">Invitar a tu organización</h2>
                            <p className="text-xs text-slate-400">Generá un link para que alguien se una a tu espacio</p>
                        </div>
                    </div>

                    {linkPropio ? (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <span className="text-sm text-slate-600 truncate flex-1">{linkPropio}</span>
                                <button
                                    onClick={() => copiarLink(linkPropio)}
                                    className="flex items-center gap-1 text-xs font-bold text-[#13ec5b] hover:opacity-70 transition-opacity flex-shrink-0"
                                >
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                    Copiar
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">info</span>
                                El link expira luego de ser utilizado una vez
                            </p>
                            <button
                                onClick={() => setLinkPropio("")}
                                className="text-xs text-slate-400 hover:text-slate-600 text-left"
                            >
                                Generar otro link
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleGenerarLinkPropio}
                            disabled={generando}
                            className="w-full py-3 bg-[#13ec5b] text-slate-900 font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm"
                        >
                            {generando ? (
                                <><span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>Generando...</>
                            ) : (
                                <><span className="material-symbols-outlined text-sm">link</span>Generar link de invitación</>
                            )}
                        </button>
                    )}
                </div>

                {/* Nueva organización */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <span className="material-symbols-outlined text-blue-500">add_business</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-slate-900">Crear organización nueva</h2>
                            <p className="text-xs text-slate-400">Para otra pareja o grupo — reciben su propio espacio separado</p>
                        </div>
                    </div>

                    {linkNuevaOrg ? (
                        <div className="flex flex-col gap-3">
                            <div className="bg-[#13ec5b]/10 border border-[#13ec5b]/20 rounded-xl px-4 py-3">
                                <p className="text-sm font-bold text-slate-900 mb-1">
                                    ✅ Organización "{nombreOrgCreada}" creada
                                </p>
                                <p className="text-xs text-slate-500">Compartí este link con los integrantes:</p>
                            </div>
                            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                                <span className="text-sm text-slate-600 truncate flex-1">{linkNuevaOrg}</span>
                                <button
                                    onClick={() => copiarLink(linkNuevaOrg)}
                                    className="flex items-center gap-1 text-xs font-bold text-[#13ec5b] hover:opacity-70 transition-opacity flex-shrink-0"
                                >
                                    <span className="material-symbols-outlined text-sm">content_copy</span>
                                    Copiar
                                </button>
                            </div>
                            <p className="text-xs text-slate-400 flex items-center gap-1">
                                <span className="material-symbols-outlined text-xs">info</span>
                                El link expira luego de ser utilizado una vez. Podés generar más desde esta misma página.
                            </p>
                            <button
                                onClick={() => { setLinkNuevaOrg(""); setNombreOrgCreada(""); }}
                                className="text-xs text-slate-400 hover:text-slate-600 text-left"
                            >
                                Crear otra organización
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={nombreOrg}
                                onChange={(e) => setNombreOrg(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleCrearOrg()}
                                placeholder="Ej. Casa García, Departamento Centro..."
                                className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                            />
                            <button
                                onClick={handleCrearOrg}
                                disabled={creando || !nombreOrg.trim()}
                                className="px-4 py-2.5 bg-slate-900 text-white font-bold rounded-xl hover:opacity-90 disabled:opacity-40 transition-all text-sm flex items-center gap-2"
                            >
                                {creando ? (
                                    <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                                ) : (
                                    <span className="material-symbols-outlined text-sm">add</span>
                                )}
                                Crear
                            </button>
                        </div>
                    )}
                </div>

            </main>

            {/* Nav mobile */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 z-50">
                <Link href="/dashboard" className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">dashboard</span>
                    <span className="text-[10px] font-bold">Dashboard</span>
                </Link>
                <Link href="/dashboard/movimientos" className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">swap_vert</span>
                    <span className="text-[10px] font-bold">Movimientos</span>
                </Link>
                <Link href="/dashboard/importar" className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">upload_file</span>
                    <span className="text-[10px] font-bold">Importar</span>
                </Link>
                <Link href="/dashboard/configuracion" className="flex flex-col items-center gap-1 text-[#13ec5b]">
                    <span className="material-symbols-outlined">settings</span>
                    <span className="text-[10px] font-bold">Config</span>
                </Link>
            </div>
        </div>
    );
}