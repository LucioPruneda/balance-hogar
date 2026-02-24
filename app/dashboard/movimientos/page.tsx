"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Categoria = {
    id: string;
    nombre: string;
    tipo: "INGRESO" | "GASTO";
};

type Movimiento = {
    id: string;
    fecha: string;
    descripcion: string;
    monto: string;
    tipo: "INGRESO" | "GASTO";
    esCompartido: boolean;
    cuotaInfo: string | null;
    categoria: { id: string; nombre: string };
    createdBy: { id: string; name: string };
};

type FormData = {
    fecha: string;
    descripcion: string;
    monto: string;
    tipo: "INGRESO" | "GASTO";
    categoriaId: string;
    esCompartido: boolean;
};

const FORM_INICIAL: FormData = {
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "",
    monto: "",
    tipo: "GASTO",
    categoriaId: "",
    esCompartido: false,
};

export default function MovimientosPage() {
    const router = useRouter();

    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Filtros
    const [filtroTipo, setFiltroTipo] = useState("");
    const [filtroCategoria, setFiltroCategoria] = useState("");
    const [filtroFechaDesde, setFiltroFechaDesde] = useState("");
    const [filtroFechaHasta, setFiltroFechaHasta] = useState("");

    // Modal
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState<string | null>(null);
    const [form, setForm] = useState<FormData>(FORM_INICIAL);
    const [guardando, setGuardando] = useState(false);
    const [formError, setFormError] = useState("");

    const fetchMovimientos = async () => {
        const params = new URLSearchParams();
        if (filtroTipo) params.append("tipo", filtroTipo);
        if (filtroCategoria) params.append("categoriaId", filtroCategoria);
        if (filtroFechaDesde) params.append("fechaDesde", filtroFechaDesde);
        if (filtroFechaHasta) params.append("fechaHasta", filtroFechaHasta);

        const res = await fetch(`/api/movimientos?${params.toString()}`);

        if (res.status === 401) {
            router.push("/login");
            return;
        }

        const data = await res.json();
        setMovimientos(data.data);
    };

    useEffect(() => {
        const fetchInicial = async () => {
            try {
                const [movRes, catRes] = await Promise.all([
                    fetch("/api/movimientos"),
                    fetch("/api/categorias"),
                ]);

                if (movRes.status === 401 || catRes.status === 401) {
                    router.push("/login");
                    return;
                }

                const movData = await movRes.json();
                const catData = await catRes.json();

                setMovimientos(movData.data);
                setCategorias([
                    ...catData.data.ingresos,
                    ...catData.data.gastos,
                ]);
            } catch {
                setError("Error al cargar los datos");
            } finally {
                setLoading(false);
            }
        };

        fetchInicial();
    }, [router]);

    const aplicarFiltros = async () => {
        setLoading(true);
        await fetchMovimientos();
        setLoading(false);
    };

    const limpiarFiltros = async () => {
        setFiltroTipo("");
        setFiltroCategoria("");
        setFiltroFechaDesde("");
        setFiltroFechaHasta("");
        const res = await fetch("/api/movimientos");
        const data = await res.json();
        setMovimientos(data.data);
    };

    const categoriasFiltradas = categorias.filter(
        (c) => !form.tipo || c.tipo === form.tipo
    );

    const abrirModalNuevo = () => {
        setEditandoId(null);
        setForm(FORM_INICIAL);
        setFormError("");
        setModalAbierto(true);
    };

    const abrirModalEditar = (mov: Movimiento) => {
        setEditandoId(mov.id);
        setForm({
            fecha: mov.fecha.split("T")[0],
            descripcion: mov.descripcion,
            monto: mov.monto,
            tipo: mov.tipo,
            categoriaId: mov.categoria.id,
            esCompartido: mov.esCompartido,
        });
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
        if (!form.fecha || !form.descripcion || !form.monto || !form.categoriaId) {
            setFormError("Completá todos los campos");
            return;
        }

        if (Number(form.monto) <= 0) {
            setFormError("El monto debe ser mayor a 0");
            return;
        }

        setGuardando(true);
        setFormError("");

        try {
            const url = editandoId
                ? `/api/movimientos/${editandoId}`
                : "/api/movimientos";

            const method = editandoId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...form,
                    monto: Number(form.monto),
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setFormError(data.error || "Error al guardar");
                return;
            }

            cerrarModal();
            await fetchMovimientos();

        } catch {
            setFormError("Error de conexión");
        } finally {
            setGuardando(false);
        }
    };

    const handleEliminar = async (id: string) => {
        if (!confirm("¿Estás seguro que querés eliminar este movimiento?")) return;
        const res = await fetch(`/api/movimientos/${id}`, { method: "DELETE" });
        if (res.ok) {
            setMovimientos((prev) => prev.filter((m) => m.id !== id));
        }
    };

    const formatMonto = (monto: string) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(monto));

    const formatFecha = (fecha: string) =>
        new Date(fecha).toLocaleDateString("es-AR", {
            day: "2-digit",
            month: "short",
            year: "numeric",
        });

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

    const totalIngresos = movimientos
        .filter((m) => m.tipo === "INGRESO")
        .reduce((acc, m) => acc + Number(m.monto), 0);

    const totalGastos = movimientos
        .filter((m) => m.tipo === "GASTO")
        .reduce((acc, m) => acc + Number(m.monto), 0);

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
                    <span className="text-sm font-semibold border-b-2 border-[#13ec5b] pb-1">Movimientos</span>
                    <Link href="/dashboard/categorias" className="text-sm font-medium text-slate-500 hover:text-[#13ec5b] transition-colors">Categorías</Link>
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

            <main className="flex flex-1 flex-col px-4 md:px-20 py-8 max-w-7xl mx-auto w-full">

                {/* Título */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Movimientos</h1>
                        <p className="text-slate-500 mt-1">Gestioná los ingresos y gastos compartidos.</p>
                    </div>
                    <button
                        onClick={abrirModalNuevo}
                        className="flex items-center gap-2 bg-[#13ec5b] hover:bg-[#13ec5b]/90 text-slate-900 px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-[#13ec5b]/20"
                    >
                        <span className="material-symbols-outlined">add</span>
                        Agregar movimiento
                    </button>
                </div>

                {/* Filtros */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <select
                        value={filtroTipo}
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#13ec5b] outline-none text-sm"
                    >
                        <option value="">Todos los tipos</option>
                        <option value="INGRESO">Ingresos</option>
                        <option value="GASTO">Gastos</option>
                    </select>

                    <select
                        value={filtroCategoria}
                        onChange={(e) => setFiltroCategoria(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#13ec5b] outline-none text-sm"
                    >
                        <option value="">Todas las categorías</option>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>

                    <input
                        type="date"
                        value={filtroFechaDesde}
                        onChange={(e) => setFiltroFechaDesde(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#13ec5b] outline-none text-sm"
                    />

                    <input
                        type="date"
                        value={filtroFechaHasta}
                        onChange={(e) => setFiltroFechaHasta(e.target.value)}
                        className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#13ec5b] outline-none text-sm"
                    />
                </div>

                <div className="flex gap-3 mb-8">
                    <button
                        onClick={aplicarFiltros}
                        className="px-4 py-2 bg-[#13ec5b] text-slate-900 font-bold rounded-lg text-sm hover:bg-[#13ec5b]/90 transition-colors"
                    >
                        Aplicar filtros
                    </button>
                    <button
                        onClick={limpiarFiltros}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors"
                    >
                        Limpiar
                    </button>
                </div>

                {/* Cards resumen */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                        <div className="p-3 bg-[#13ec5b]/10 rounded-lg text-[#13ec5b]">
                            <span className="material-symbols-outlined">trending_up</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ingresos</p>
                            <p className="text-xl font-bold text-[#13ec5b]">+{formatMonto(String(totalIngresos))}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                        <div className="p-3 bg-red-100 rounded-lg text-red-500">
                            <span className="material-symbols-outlined">trending_down</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gastos</p>
                            <p className="text-xl font-bold text-red-500">-{formatMonto(String(totalGastos))}</p>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-lg text-blue-500">
                            <span className="material-symbols-outlined">account_balance</span>
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Balance Neto</p>
                            <p className={`text-xl font-bold ${totalIngresos - totalGastos >= 0 ? "text-slate-900" : "text-red-500"}`}>
                                {formatMonto(String(totalIngresos - totalGastos))}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    {movimientos.length === 0 ? (
                        <div className="p-12 text-center text-slate-400">
                            <span className="material-symbols-outlined text-4xl block mb-2">inbox</span>
                            <p className="font-medium">No hay movimientos todavía</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200">
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Usuario</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Categoría</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Compartido</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Monto</th>
                                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {movimientos.map((mov) => (
                                        <tr key={mov.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">{formatFecha(mov.fecha)}</td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs bg-slate-100 px-2 py-1 rounded font-medium">{mov.createdBy.name}</span>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                                                <div className="flex flex-col">
                                                    <span>{mov.descripcion}</span>
                                                    {mov.cuotaInfo && (
                                                        <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                            Cuota {mov.cuotaInfo.replace("/", " de ")}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    {mov.categoria.nombre}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${mov.tipo === "INGRESO" ? "border-[#13ec5b] text-[#13ec5b]" : "border-red-500 text-red-500"}`}>
                                                    {mov.tipo === "INGRESO" ? "Ingreso" : "Gasto"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {mov.esCompartido ? (
                                                    <span className="flex items-center gap-1 text-[#13ec5b] text-xs font-bold">
                                                        <span className="material-symbols-outlined text-sm">group</span>
                                                        Compartido
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-slate-400 text-xs font-medium">
                                                        <span className="material-symbols-outlined text-sm">person</span>
                                                        Personal
                                                    </span>
                                                )}
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${mov.tipo === "INGRESO" ? "text-[#13ec5b]" : "text-red-500"}`}>
                                                {mov.tipo === "INGRESO" ? "+" : "-"}{formatMonto(mov.monto)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => abrirModalEditar(mov)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-[#13ec5b] hover:bg-[#13ec5b]/10 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">edit</span>
                                                    </button>
                                                    <button
                                                        onClick={() => handleEliminar(mov.id)}
                                                        className="p-1.5 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <span className="material-symbols-outlined text-lg">delete</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
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
                <Link href="/dashboard/movimientos" className="flex flex-col items-center gap-1 text-[#13ec5b]">
                    <span className="material-symbols-outlined">swap_vert</span>
                    <span className="text-[10px] font-bold">Movimientos</span>
                </Link>
                <Link href="/dashboard/categorias" className="flex flex-col items-center gap-1 text-slate-400">
                    <span className="material-symbols-outlined">category</span>
                    <span className="text-[10px] font-bold">Categorías</span>
                </Link>
            </div>

            {/* Modal */}
            {modalAbierto && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden border border-slate-200">

                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                            <h3 className="text-xl font-bold text-slate-900">
                                {editandoId ? "Editar movimiento" : "Nuevo movimiento"}
                            </h3>
                            <button onClick={cerrarModal} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Fecha</label>
                                    <input
                                        type="date"
                                        value={form.fecha}
                                        onChange={(e) => setForm({ ...form, fecha: e.target.value })}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#13ec5b] text-sm"
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Tipo</label>
                                    <select
                                        value={form.tipo}
                                        onChange={(e) => setForm({ ...form, tipo: e.target.value as "INGRESO" | "GASTO", categoriaId: "" })}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#13ec5b] text-sm"
                                    >
                                        <option value="GASTO">Gasto</option>
                                        <option value="INGRESO">Ingreso</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <label className="text-sm font-semibold text-slate-700">Descripción</label>
                                <input
                                    type="text"
                                    value={form.descripcion}
                                    onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                    placeholder="Ej. Supermercado semanal"
                                    className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#13ec5b] text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Monto</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={form.monto}
                                            onChange={(e) => setForm({ ...form, monto: e.target.value })}
                                            placeholder="0.00"
                                            className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#13ec5b] text-sm"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-sm font-semibold text-slate-700">Categoría</label>
                                    <select
                                        value={form.categoriaId}
                                        onChange={(e) => setForm({ ...form, categoriaId: e.target.value })}
                                        className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-[#13ec5b] text-sm"
                                    >
                                        <option value="">Seleccioná una</option>
                                        {categoriasFiltradas.map((c) => (
                                            <option key={c.id} value={c.id}>{c.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Campo compartido */}
                            <div
                                onClick={() => setForm({ ...form, esCompartido: !form.esCompartido })}
                                className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${form.esCompartido
                                    ? "border-[#13ec5b] bg-[#13ec5b]/5"
                                    : "border-slate-200 hover:border-slate-300"
                                    }`}
                            >
                                <div className="flex items-center gap-3">
                                    <span className={`material-symbols-outlined ${form.esCompartido ? "text-[#13ec5b]" : "text-slate-400"}`}>
                                        group
                                    </span>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">Gasto compartido</p>
                                        <p className="text-xs text-slate-500">Se divide 50/50 para el cálculo de deuda</p>
                                    </div>
                                </div>
                                <div className={`w-10 h-6 rounded-full transition-all relative ${form.esCompartido ? "bg-[#13ec5b]" : "bg-slate-200"}`}>
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.esCompartido ? "left-5" : "left-1"}`} />
                                </div>
                            </div>

                            {formError && (
                                <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                                    {formError}
                                </p>
                            )}

                            <div className="pt-2 flex gap-3">
                                <button
                                    onClick={cerrarModal}
                                    className="flex-1 px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-lg hover:bg-slate-200 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleGuardar}
                                    disabled={guardando}
                                    className="flex-1 px-4 py-2 bg-[#13ec5b] text-slate-900 font-bold rounded-lg hover:bg-[#13ec5b]/90 disabled:opacity-50 transition-colors text-sm"
                                >
                                    {guardando ? "Guardando..." : "Guardar"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}