"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Categoria = {
    id: string;
    nombre: string;
    tipo: "INGRESO" | "GASTO";
};

type CategoriasData = {
    ingresos: Categoria[];
    gastos: Categoria[];
};

type FormData = {
    nombre: string;
    tipo: "INGRESO" | "GASTO";
};

const FORM_INICIAL: FormData = {
    nombre: "",
    tipo: "INGRESO",
};

export default function CategoriasPage() {
    const router = useRouter();

    const [categorias, setCategorias] = useState<CategoriasData>({
        ingresos: [],
        gastos: [],
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(FORM_INICIAL);
    const [guardando, setGuardando] = useState(false);
    const [formError, setFormError] = useState("");

    const fetchCategorias = async () => {
        const res = await fetch("/api/categorias");

        if (res.status === 401) {
            router.push("/login");
            return;
        }

        const data = await res.json();
        setCategorias(data.data);
    };

    useEffect(() => {
        const fetchInicial = async () => {
            try {
                await fetchCategorias();
            } catch {
                setError("Error al cargar las categorías");
            } finally {
                setLoading(false);
            }
        };

        fetchInicial();
    }, [router]);

    const abrirModalNuevo = () => {
        setEditandoId(null);
        setForm(FORM_INICIAL);
        setFormError("");
        setModalAbierto(true);
    };

    const abrirModalEditar = (cat: Categoria) => {
        setEditandoId(cat.id);
        setForm({ nombre: cat.nombre, tipo: cat.tipo });
        setFormError("");
        setModalAbierto(true);
    };

    const cerrarModal = () => {
        setModalAbierto(false);
        setEditandoId(null);
        setForm(FORM_INICIAL);
        setFormError("");
    };

    const handleGuardar = async () => {
        if (!form.nombre.trim()) {
            setFormError("El nombre es obligatorio");
            return;
        }

        setGuardando(true);
        setFormError("");

        try {
            const url = editandoId
                ? `/api/categorias/${editandoId}`
                : "/api/categorias";

            const method = editandoId ? "PUT" : "POST";

            const body = editandoId
                ? { nombre: form.nombre }
                : { nombre: form.nombre, tipo: form.tipo };

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Error al guardar");
                return;
            }

            cerrarModal();
            await fetchCategorias();

        } catch {
            setFormError("Error de conexión");
        } finally {
            setGuardando(false);
        }
    };

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f6f8f6] flex items-center justify-center">
                <div className="flex items-center gap-3 text-slate-500">
                    <span className="material-symbols-outlined animate-spin">progress_activity</span>
                    <span className="font-medium">Cargando...</span>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f6f8f6] flex items-center justify-center">
                <p className="text-red-500">{error}</p>
            </div>
        );
    }

    return (
        <div className="bg-[#f6f8f6] text-slate-900 min-h-screen flex flex-col">

            {/* Header */}
            <header className="flex items-center justify-between border-b border-[#13ec5b]/10 bg-white/50 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <img src="/logo-bulldog.png" alt="Logo" className="size-8 object-contain rounded-lg" />
                    <h1 className="text-xl font-bold tracking-tight">Rita</h1>
                </div>
                <nav className="hidden md:flex items-center gap-8">
                    <Link href="/dashboard" className="text-sm font-medium text-slate-500 hover:text-[#13ec5b] transition-colors">Dashboard</Link>
                    <Link href="/dashboard/movimientos" className="text-sm font-medium text-slate-500 hover:text-[#13ec5b] transition-colors">Movimientos</Link>
                    <span className="text-sm font-semibold border-b-2 border-[#13ec5b] pb-1">Categorías</span>
                    <Link href="/dashboard/importar" className="text-sm font-medium text-slate-500 hover:text-[#13ec5b] transition-colors">Importar</Link>
                    <Link href="/dashboard/configuracion" className="text-sm font-medium text-slate-500 hover:text-[#13ec5b] transition-colors">Configuración</Link>
                </nav>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">logout</span>
                    <span className="hidden md:inline">Cerrar sesión</span>
                </button>
            </header>

            <main className="flex flex-1 justify-center py-8 px-4 md:px-10">
                <div className="flex flex-col w-full max-w-4xl">

                    {/* Título */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                                <Link href="/dashboard" className="hover:text-[#13ec5b]">Dashboard</Link>
                                <span className="material-symbols-outlined text-xs">chevron_right</span>
                                <span className="text-slate-900 font-medium">Categorías</span>
                            </nav>
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gestión de Categorías</h1>
                            <p className="text-slate-500 mt-1">Personalizá cómo organizás tus movimientos financieros.</p>
                        </div>
                        <button
                            onClick={abrirModalNuevo}
                            className="flex items-center gap-2 bg-[#13ec5b] text-slate-900 px-6 py-3 rounded-xl font-bold hover:opacity-90 transition-all shadow-lg shadow-[#13ec5b]/20"
                        >
                            <span className="material-symbols-outlined">add_circle</span>
                            Agregar categoría
                        </button>
                    </div>

                    {/* Grid categorías */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Ingresos */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-10 h-10 rounded-lg bg-[#13ec5b]/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-[#13ec5b]">trending_up</span>
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Ingresos</h2>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                {categorias.ingresos.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-3xl block mb-2">inbox</span>
                                        <p className="text-sm">No hay categorías de ingreso</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {categorias.ingresos.map((cat) => (
                                            <li key={cat.id} className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-[#13ec5b]"></div>
                                                    <span className="text-slate-800 font-medium">{cat.nombre}</span>
                                                </div>
                                                <button
                                                    onClick={() => abrirModalEditar(cat)}
                                                    className="p-2 text-slate-400 hover:text-[#13ec5b] opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-xl">edit_square</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Gastos */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-500">trending_down</span>
                                </div>
                                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Gastos</h2>
                            </div>
                            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                {categorias.gastos.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400">
                                        <span className="material-symbols-outlined text-3xl block mb-2">inbox</span>
                                        <p className="text-sm">No hay categorías de gasto</p>
                                    </div>
                                ) : (
                                    <ul className="divide-y divide-slate-100">
                                        {categorias.gastos.map((cat) => (
                                            <li key={cat.id} className="group flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                                                    <span className="text-slate-800 font-medium">{cat.nombre}</span>
                                                </div>
                                                <button
                                                    onClick={() => abrirModalEditar(cat)}
                                                    className="p-2 text-slate-400 hover:text-[#13ec5b] opacity-0 group-hover:opacity-100 transition-all"
                                                >
                                                    <span className="material-symbols-outlined text-xl">edit_square</span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
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
                <Link href="/dashboard/categorias" className="flex flex-col items-center gap-1 text-[#13ec5b]">
                    <span className="material-symbols-outlined">category</span>
                    <span className="text-[10px] font-bold">Categorías</span>
                </Link>
            </div>

            {/* Modal */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">

                        {/* Header modal */}
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editandoId ? "Editar categoría" : "Nueva categoría"}
                            </h3>
                            <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        {/* Body modal */}
                        <div className="p-6 space-y-6">

                            {/* Nombre */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Nombre de la categoría
                                </label>
                                <input
                                    type="text"
                                    value={form.nombre}
                                    onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                    placeholder="Ej. Alimentación, Netflix, Alquiler..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#13ec5b] focus:border-transparent outline-none text-slate-900 text-sm"
                                />
                            </div>

                            {/* Tipo — solo visible al crear, no al editar */}
                            {!editandoId && (
                                <div>
                                    <span className="block text-sm font-semibold text-slate-700 mb-3">
                                        Tipo de categoría
                                    </span>
                                    <div className="grid grid-cols-2 gap-4">
                                        <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${form.tipo === "INGRESO" ? "border-[#13ec5b] bg-[#13ec5b]/5" : "border-slate-200 hover:border-slate-300"}`}>
                                            <input
                                                type="radio"
                                                name="tipo"
                                                value="INGRESO"
                                                checked={form.tipo === "INGRESO"}
                                                onChange={() => setForm({ ...form, tipo: "INGRESO" })}
                                                className="hidden"
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined ${form.tipo === "INGRESO" ? "text-[#13ec5b]" : "text-slate-400"}`}>trending_up</span>
                                                <span className="font-bold text-slate-900">Ingreso</span>
                                            </div>
                                        </label>
                                        <label className={`relative flex items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${form.tipo === "GASTO" ? "border-orange-500 bg-orange-500/5" : "border-slate-200 hover:border-slate-300"}`}>
                                            <input
                                                type="radio"
                                                name="tipo"
                                                value="GASTO"
                                                checked={form.tipo === "GASTO"}
                                                onChange={() => setForm({ ...form, tipo: "GASTO" })}
                                                className="hidden"
                                            />
                                            <div className="flex items-center gap-2">
                                                <span className={`material-symbols-outlined ${form.tipo === "GASTO" ? "text-orange-500" : "text-slate-400"}`}>trending_down</span>
                                                <span className="font-bold text-slate-900">Gasto</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            )}

                            {/* Error */}
                            {formError && (
                                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                                    {formError}
                                </p>
                            )}

                            {/* Botones */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={cerrarModal}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGuardar}
                                    disabled={guardando}
                                    className="flex-1 py-3 bg-[#13ec5b] text-slate-900 font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
                                >
                                    {guardando ? "Guardando..." : "Guardar categoría"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}