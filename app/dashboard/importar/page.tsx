"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Categoria = {
    id: string;
    nombre: string;
    tipo: "INGRESO" | "GASTO";
};

type TransaccionImportada = {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: "INGRESO" | "GASTO";
    cuotaInfo: string | null;
    categoriaId: string;
    esCompartido: boolean;
};

export default function ImportarPage() {
    const router = useRouter();

    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [banco, setBanco] = useState<"BBVA" | "SANTANDER" | "">("");
    const [archivo, setArchivo] = useState<File | null>(null);
    const [parseando, setParseando] = useState(false);
    const [importando, setImportando] = useState(false);
    const [transacciones, setTransacciones] = useState<TransaccionImportada[]>([]);
    const [fechaResumen, setFechaResumen] = useState("");
    const [error, setError] = useState("");
    const [exito, setExito] = useState("");
    const [step, setStep] = useState<1 | 2>(1);
    const [asignacionRapidaGasto, setAsignacionRapidaGasto] = useState("");
    const [asignacionRapidaIngreso, setAsignacionRapidaIngreso] = useState("");
    const [categoriaIdTarjeta, setCategoriaIdTarjeta] = useState("");

    useEffect(() => {
        const fetchCategorias = async () => {
            const res = await fetch("/api/categorias");
            if (res.status === 401) {
                router.push("/login");
                return;
            }
            const data = await res.json();
            const todas = [...data.data.ingresos, ...data.data.gastos];
            setCategorias(todas);
            const tarjeta = todas.find((c: Categoria) => c.nombre.toLowerCase() === "tarjeta");
            if (tarjeta) setCategoriaIdTarjeta(tarjeta.id);
        };
        fetchCategorias();
    }, [router]);

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const formatMonto = (monto: number) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(monto);

    const formatFecha = (fecha: string) =>
        new Date(fecha + "T12:00:00").toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

    const handleParsear = async () => {
        if (!banco) { setError("Seleccioná un banco"); return; }
        if (!archivo) { setError("Seleccioná un archivo"); return; }

        setError("");
        setParseando(true);

        try {
            const formData = new FormData();
            formData.append("archivo", archivo);
            formData.append("banco", banco);

            const res = await fetch("/api/importar", { method: "POST", body: formData });
            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al procesar el archivo");
                return;
            }

            const fechaDetectada = data.fechaResumen;
            setFechaResumen(fechaDetectada);

            // Inicializar con fecha del resumen, categoría Tarjeta por defecto
            setTransacciones(
                data.data.map((t: Omit<TransaccionImportada, "categoriaId" | "esCompartido">) => ({
                    ...t,
                    fecha: fechaDetectada,
                    categoriaId: categoriaIdTarjeta,
                    esCompartido: false,
                }))
            );
            setStep(2);

        } catch {
            setError("Error de conexión");
        } finally {
            setParseando(false);
        }
    };

    // Cuando el usuario cambia la fecha del resumen, actualizar todas las transacciones
    const handleCambiarFechaResumen = (nuevaFecha: string) => {
        setFechaResumen(nuevaFecha);
        setTransacciones((prev) => prev.map((t) => ({ ...t, fecha: nuevaFecha })));
    };

    const handleConfirmar = async () => {
        const sinCategoria = transacciones.filter((t) => !t.categoriaId);
        if (sinCategoria.length > 0) {
            setError(`Hay ${sinCategoria.length} transacciones sin categoría asignada`);
            window.scrollTo({ top: 0, behavior: "smooth" });
            return;
        }

        setError("");
        setImportando(true);

        try {
            const res = await fetch("/api/importar/confirmar", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ transacciones }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al importar");
                return;
            }

            setExito(data.message);
            setTransacciones([]);
            setStep(1);
            setArchivo(null);
            setBanco("");
            setFechaResumen("");
            setAsignacionRapidaGasto("");
            setAsignacionRapidaIngreso("");

        } catch {
            setError("Error de conexión");
        } finally {
            setImportando(false);
        }
    };

    const actualizarTransaccion = (
        index: number,
        campo: "categoriaId" | "esCompartido",
        valor: string | boolean
    ) => {
        setTransacciones((prev) =>
            prev.map((t, i) => (i === index ? { ...t, [campo]: valor } : t))
        );
    };

    const asignarCategoriaATodas = (tipo: "INGRESO" | "GASTO", categoriaId: string) => {
        setTransacciones((prev) =>
            prev.map((t) => (t.tipo === tipo ? { ...t, categoriaId } : t))
        );
    };

    const categoriasFiltradas = (tipo: "INGRESO" | "GASTO") =>
        categorias.filter((c) => c.tipo === tipo);

    const totalGastos = transacciones.filter((t) => t.tipo === "GASTO").reduce((acc, t) => acc + t.monto, 0);
    const totalIngresos = transacciones.filter((t) => t.tipo === "INGRESO").reduce((acc, t) => acc + t.monto, 0);

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
                    <span className="text-sm font-semibold border-b-2 border-[#13ec5b] pb-1">Importar</span>
                    <Link href="/dashboard/configuracion" className="text-slate-500 text-sm font-medium hover:text-[#13ec5b] transition-colors">Configuración</Link>
                </nav>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-red-500 transition-colors"
                >
                    <span className="material-symbols-outlined text-xl">logout</span>
                    <span className="hidden md:inline">Cerrar sesión</span>
                </button>
            </header>

            <main className="flex flex-1 flex-col px-4 md:px-20 py-8 max-w-7xl mx-auto w-full">

                {/* Título */}
                <div className="mb-8">
                    <nav className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                        <Link href="/dashboard" className="hover:text-[#13ec5b]">Dashboard</Link>
                        <span className="material-symbols-outlined text-xs">chevron_right</span>
                        <span className="text-slate-900 font-medium">Importar resumen</span>
                    </nav>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Importar resumen bancario</h1>
                    <p className="text-slate-500 mt-1">Subí el resumen de tu tarjeta y categorizá los movimientos antes de importarlos.</p>
                </div>

                {/* Steps */}
                <div className="flex items-center gap-4 mb-8">
                    <div className={`flex items-center gap-2 ${step === 1 ? "text-slate-900" : "text-slate-400"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step === 1 ? "bg-[#13ec5b] text-slate-900" : "bg-slate-200 text-slate-500"}`}>
                            {step === 2 ? <span className="material-symbols-outlined text-sm">check</span> : "1"}
                        </div>
                        <span className="text-sm font-semibold">Subir archivo</span>
                    </div>
                    <div className="flex-1 h-px bg-slate-200" />
                    <div className={`flex items-center gap-2 ${step === 2 ? "text-slate-900" : "text-slate-400"}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black ${step === 2 ? "bg-[#13ec5b] text-slate-900" : "bg-slate-200"}`}>
                            2
                        </div>
                        <span className="text-sm font-semibold">Categorizar e importar</span>
                    </div>
                </div>

                {/* Éxito */}
                {exito && (
                    <div className="mb-6 bg-[#13ec5b]/10 border border-[#13ec5b]/30 rounded-xl px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-[#13ec5b]">check_circle</span>
                        <p className="font-semibold text-slate-900">{exito}</p>
                        <Link href="/dashboard/movimientos" className="ml-auto text-sm font-bold text-[#13ec5b] hover:underline">
                            Ver movimientos →
                        </Link>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-100 rounded-xl px-5 py-4 flex items-center gap-3">
                        <span className="material-symbols-outlined text-red-500">error</span>
                        <p className="text-red-600 font-medium">{error}</p>
                    </div>
                )}

                {/* STEP 1 */}
                {step === 1 && (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-2xl">
                        <div className="mb-6">
                            <label className="block text-sm font-bold text-slate-700 mb-3">Seleccioná tu banco</label>
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => setBanco("BBVA")}
                                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-3 ${banco === "BBVA" ? "border-[#13ec5b] bg-[#13ec5b]/5 text-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                >
                                    <span className={`material-symbols-outlined ${banco === "BBVA" ? "text-[#13ec5b]" : "text-slate-400"}`}>account_balance</span>
                                    BBVA
                                    <span className="ml-auto text-[10px] font-medium text-slate-400">PDF</span>
                                </button>
                                <button
                                    onClick={() => setBanco("SANTANDER")}
                                    className={`p-4 rounded-xl border-2 font-bold text-sm transition-all flex items-center gap-3 ${banco === "SANTANDER" ? "border-[#13ec5b] bg-[#13ec5b]/5 text-slate-900" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}
                                >
                                    <span className={`material-symbols-outlined ${banco === "SANTANDER" ? "text-[#13ec5b]" : "text-slate-400"}`}>account_balance</span>
                                    Santander
                                    <span className="ml-auto text-[10px] font-medium text-slate-400">XLSX</span>
                                </button>
                            </div>
                        </div>

                        <div className="mb-8">
                            <label className="block text-sm font-bold text-slate-700 mb-3">
                                {banco === "BBVA" ? "Subí el PDF del resumen" : banco === "SANTANDER" ? "Subí el Excel del resumen" : "Subí el archivo del resumen"}
                            </label>
                            <label className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer transition-all ${archivo ? "border-[#13ec5b] bg-[#13ec5b]/5" : "border-slate-300 hover:border-[#13ec5b] hover:bg-[#13ec5b]/5"}`}>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept={banco === "BBVA" ? ".pdf" : banco === "SANTANDER" ? ".xlsx,.xls" : ".pdf,.xlsx,.xls"}
                                    onChange={(e) => { setArchivo(e.target.files?.[0] ?? null); setError(""); setExito(""); }}
                                />
                                {archivo ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <span className="material-symbols-outlined text-[#13ec5b] text-4xl">description</span>
                                        <p className="font-bold text-slate-900 text-sm">{archivo.name}</p>
                                        <p className="text-xs text-slate-500">{(archivo.size / 1024).toFixed(1)} KB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <span className="material-symbols-outlined text-4xl">upload_file</span>
                                        <p className="text-sm font-medium">Hacé click para seleccionar el archivo</p>
                                        <p className="text-xs">{banco === "BBVA" ? "PDF" : banco === "SANTANDER" ? "XLSX" : "PDF o XLSX"}</p>
                                    </div>
                                )}
                            </label>
                        </div>

                        <button
                            onClick={handleParsear}
                            disabled={parseando || !banco || !archivo}
                            className="w-full py-3 bg-[#13ec5b] text-slate-900 font-black rounded-xl hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
                        >
                            {parseando ? (
                                <><span className="material-symbols-outlined animate-spin">progress_activity</span>Procesando archivo...</>
                            ) : (
                                <><span className="material-symbols-outlined">file_open</span>Procesar archivo</>
                            )}
                        </button>
                    </div>
                )}

                {/* STEP 2 */}
                {step === 2 && transacciones.length > 0 && (
                    <div className="flex flex-col gap-6">

                        {/* Fecha del resumen — editable */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col md:flex-row md:items-center gap-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-[#13ec5b]/10 rounded-lg">
                                    <span className="material-symbols-outlined text-[#13ec5b]">calendar_month</span>
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-slate-900">Fecha del resumen</p>
                                    <p className="text-xs text-slate-400">Todos los movimientos se importarán con esta fecha</p>
                                </div>
                            </div>
                            <div className="md:ml-auto flex items-center gap-3">
                                <input
                                    type="date"
                                    value={fechaResumen}
                                    onChange={(e) => handleCambiarFechaResumen(e.target.value)}
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                                />
                                <span className="text-xs text-slate-400 font-medium">
                                    {fechaResumen ? formatFecha(fechaResumen) : ""}
                                </span>
                            </div>
                        </div>

                        {/* Resumen */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
                                    <span className="material-symbols-outlined">receipt_long</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Transacciones</p>
                                    <p className="text-xl font-black text-slate-900">{transacciones.length}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                <div className="p-3 bg-red-100 rounded-lg text-red-500">
                                    <span className="material-symbols-outlined">trending_down</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Gastos</p>
                                    <p className="text-xl font-black text-red-500">{formatMonto(totalGastos)}</p>
                                </div>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                                <div className="p-3 bg-[#13ec5b]/10 rounded-lg text-[#13ec5b]">
                                    <span className="material-symbols-outlined">trending_up</span>
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Ingresos</p>
                                    <p className="text-xl font-black text-[#13ec5b]">{formatMonto(totalIngresos)}</p>
                                </div>
                            </div>
                        </div>

                        {/* Asignación rápida */}
                        <div className="bg-white rounded-xl border border-slate-200 p-5">
                            <p className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#13ec5b]">auto_fix_high</span>
                                Asignación rápida — aplicar categoría a todos los del mismo tipo
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-red-500 uppercase w-16">Gastos</span>
                                    <select
                                        value={asignacionRapidaGasto}
                                        onChange={(e) => { setAsignacionRapidaGasto(e.target.value); if (e.target.value) asignarCategoriaATodas("GASTO", e.target.value); }}
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                                    >
                                        <option value="">Seleccioná categoría...</option>
                                        {categoriasFiltradas("GASTO").map((c) => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-bold text-[#13ec5b] uppercase w-16">Ingresos</span>
                                    <select
                                        value={asignacionRapidaIngreso}
                                        onChange={(e) => { setAsignacionRapidaIngreso(e.target.value); if (e.target.value) asignarCategoriaATodas("INGRESO", e.target.value); }}
                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-[#13ec5b]"
                                    >
                                        <option value="">Seleccioná categoría...</option>
                                        {categoriasFiltradas("INGRESO").map((c) => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Tabla */}
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200">
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Compartido</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {transacciones.map((t, index) => (
                                            <tr key={index} className={`hover:bg-slate-50/50 transition-colors ${!t.categoriaId ? "bg-orange-50/30" : ""}`}>
                                                <td className="px-4 py-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-semibold text-slate-900">{t.descripcion}</span>
                                                        {t.cuotaInfo && (
                                                            <span className="text-[10px] text-slate-400 mt-0.5">
                                                                Cuota {t.cuotaInfo.replace("/", " de ")}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${t.tipo === "INGRESO" ? "border-[#13ec5b] text-[#13ec5b]" : "border-red-500 text-red-500"}`}>
                                                        {t.tipo === "INGRESO" ? "Ingreso" : "Gasto"}
                                                    </span>
                                                </td>
                                                <td className={`px-4 py-3 text-right font-bold text-sm ${t.tipo === "INGRESO" ? "text-[#13ec5b]" : "text-red-500"}`}>
                                                    {t.tipo === "INGRESO" ? "+" : "-"}{formatMonto(t.monto)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <select
                                                        value={t.categoriaId}
                                                        onChange={(e) => actualizarTransaccion(index, "categoriaId", e.target.value)}
                                                        className={`w-full px-2 py-1.5 border rounded-lg text-xs outline-none focus:ring-2 focus:ring-[#13ec5b] ${!t.categoriaId ? "border-orange-300 bg-orange-50 text-slate-600" : "border-slate-200 bg-slate-50 text-slate-600"}`}
                                                    >
                                                        <option value="">Sin categoría</option>
                                                        {categoriasFiltradas(t.tipo).map((c) => (
                                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <button
                                                        onClick={() => actualizarTransaccion(index, "esCompartido", !t.esCompartido)}
                                                        className={`w-10 h-6 rounded-full transition-all relative inline-block ${t.esCompartido ? "bg-[#13ec5b]" : "bg-slate-200"}`}
                                                    >
                                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${t.esCompartido ? "left-5" : "left-1"}`} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Botones */}
                        <div className="flex gap-4 pb-20 md:pb-0">
                            <button
                                onClick={() => { setStep(1); setTransacciones([]); setError(""); setFechaResumen(""); }}
                                className="px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                            >
                                ← Volver
                            </button>
                            <button
                                onClick={handleConfirmar}
                                disabled={importando}
                                className="flex-1 py-3 bg-[#13ec5b] text-slate-900 font-black rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {importando ? (
                                    <><span className="material-symbols-outlined animate-spin">progress_activity</span>Importando...</>
                                ) : (
                                    <><span className="material-symbols-outlined">download_done</span>Importar {transacciones.length} movimientos</>
                                )}
                            </button>
                        </div>
                    </div>
                )}
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
                <Link href="/dashboard/categorias" className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">category</span>
                    <span className="text-[10px] font-bold">Categorías</span>
                </Link>
                <Link href="/dashboard/importar" className="flex flex-col items-center gap-1 text-[#13ec5b]">
                    <span className="material-symbols-outlined">upload_file</span>
                    <span className="text-[10px] font-bold">Importar</span>
                </Link>
            </div>
        </div>
    );
}