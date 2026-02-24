"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Chart, ArcElement, Tooltip, Legend, DoughnutController } from "chart.js";

Chart.register(ArcElement, Tooltip, Legend, DoughnutController);

type BalanceUsuario = {
    userId: string;
    name: string;
    totalIngresos: string;
    totalGastos: string;
    balance: string;
};

type DeudaData = {
    deudorId: string;
    deudorName: string;
    acreedorId: string;
    acreedorName: string;
    monto: string;
};

type BalanceData = {
    organizacion: {
        totalIngresos: string;
        totalGastos: string;
        balance: string;
    };
    porUsuario: BalanceUsuario[];
    deuda: DeudaData | null;
};

type Movimiento = {
    id: string;
    fecha: string;
    descripcion: string;
    monto: string;
    tipo: "INGRESO" | "GASTO";
    categoria: { nombre: string };
    createdBy: { id: string; name: string };
};

const COLORES = [
    "#13ec5b", "#f97316", "#3b82f6", "#a855f7", "#ec4899",
    "#14b8a6", "#eab308", "#ef4444", "#6366f1", "#84cc16",
    "#06b6d4", "#f43f5e", "#8b5cf6", "#10b981", "#fb923c",
];

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function DashboardPage() {
    const router = useRouter();
    const hoy = new Date();

    const [mes, setMes] = useState(hoy.getMonth() + 1);
    const [anio, setAnio] = useState(hoy.getFullYear());
    const [balance, setBalance] = useState<BalanceData | null>(null);
    const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
    const [todosMovimientos, setTodosMovimientos] = useState<Movimiento[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [saldando, setSaldando] = useState(false);
    const [modalSaldar, setModalSaldar] = useState(false);
    const [notaSaldar, setNotaSaldar] = useState("");
    const chartRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<Chart | null>(null);

    const fetchData = async (m: number, a: number) => {
        setLoading(true);
        try {
            // Calcular fechaDesde y fechaHasta del mes seleccionado
            const fechaDesde = new Date(a, m - 1, 1).toISOString().split("T")[0];
            const fechaHasta = new Date(a, m, 0).toISOString().split("T")[0];

            const [balanceRes, movimientosRes] = await Promise.all([
                fetch(`/api/balance?mes=${m}&anio=${a}`),
                fetch(`/api/movimientos?fechaDesde=${fechaDesde}&fechaHasta=${fechaHasta}`),
            ]);

            if (balanceRes.status === 401 || movimientosRes.status === 401) {
                router.push("/login");
                return;
            }

            const balanceData = await balanceRes.json();
            const movimientosData = await movimientosRes.json();

            setBalance(balanceData.data);
            setTodosMovimientos(movimientosData.data);
            setMovimientos(movimientosData.data.slice(0, 5));
        } catch {
            setError("Error al cargar los datos");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData(mes, anio);
    }, []);

    const handleMesAnterior = () => {
        const nuevoMes = mes === 1 ? 12 : mes - 1;
        const nuevoAnio = mes === 1 ? anio - 1 : anio;
        setMes(nuevoMes);
        setAnio(nuevoAnio);
        fetchData(nuevoMes, nuevoAnio);
    };

    const handleMesSiguiente = () => {
        const nuevoMes = mes === 12 ? 1 : mes + 1;
        const nuevoAnio = mes === 12 ? anio + 1 : anio;
        setMes(nuevoMes);
        setAnio(nuevoAnio);
        fetchData(nuevoMes, nuevoAnio);
    };

    const esMesActual = mes === hoy.getMonth() + 1 && anio === hoy.getFullYear();

    // Datos del gráfico
    const gastosPorCategoria = todosMovimientos
        .filter((m) => m.tipo === "GASTO")
        .reduce<Record<string, number>>((acc, m) => {
            const cat = m.categoria.nombre;
            acc[cat] = (acc[cat] || 0) + Number(m.monto);
            return acc;
        }, {});

    const categoriasSorted = Object.entries(gastosPorCategoria).sort((a, b) => b[1] - a[1]);
    const totalGastosGrafico = categoriasSorted.reduce((acc, [, v]) => acc + v, 0);

    useEffect(() => {
        if (!chartRef.current || categoriasSorted.length === 0) return;

        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        chartInstanceRef.current = new Chart(chartRef.current, {
            type: "doughnut",
            data: {
                labels: categoriasSorted.map(([nombre]) => nombre),
                datasets: [
                    {
                        data: categoriasSorted.map(([, monto]) => monto),
                        backgroundColor: COLORES.slice(0, categoriasSorted.length),
                        borderWidth: 2,
                        borderColor: "#ffffff",
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "65%",
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => {
                                const val = ctx.parsed as number;
                                const pct = ((val / totalGastosGrafico) * 100).toFixed(1);
                                const formatted = new Intl.NumberFormat("es-AR", {
                                    style: "currency",
                                    currency: "ARS",
                                }).format(val);
                                return ` ${formatted} (${pct}%)`;
                            },
                        },
                    },
                },
            },
        });

        return () => {
            chartInstanceRef.current?.destroy();
        };
    }, [todosMovimientos]);

    const formatMonto = (monto: string) =>
        new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS" }).format(Number(monto));

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
    };

    const handleSaldarDeuda = async () => {
        if (!balance?.deuda) return;
        setSaldando(true);
        try {
            const res = await fetch("/api/balance", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    monto: balance.deuda.monto,
                    nota: notaSaldar || "Deuda saldada",
                }),
            });
            if (res.ok) {
                setModalSaldar(false);
                setNotaSaldar("");
                await fetchData(mes, anio);
            }
        } catch {
            // silencioso
        } finally {
            setSaldando(false);
        }
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
                    <span className="text-sm font-semibold border-b-2 border-[#13ec5b] pb-1">Dashboard</span>
                    <Link href="/dashboard/movimientos" className="text-sm font-medium text-slate-500 hover:text-[#13ec5b] transition-colors">Movimientos</Link>
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

            <main className="mx-auto w-full max-w-6xl px-6 py-8">

                {/* Selector de mes */}
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleMesAnterior}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:border-[#13ec5b] hover:text-[#13ec5b] transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_left</span>
                        </button>
                        <div className="bg-white border border-slate-200 rounded-lg px-5 py-2 shadow-sm min-w-[160px] text-center">
                            <p className="font-black text-slate-900">{MESES[mes - 1]}</p>
                            <p className="text-xs text-slate-400 font-medium">{anio}</p>
                        </div>
                        <button
                            onClick={handleMesSiguiente}
                            disabled={esMesActual}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-slate-200 hover:border-[#13ec5b] hover:text-[#13ec5b] transition-all shadow-sm disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                            <span className="material-symbols-outlined text-xl">chevron_right</span>
                        </button>
                    </div>
                    {!esMesActual && (
                        <button
                            onClick={() => {
                                setMes(hoy.getMonth() + 1);
                                setAnio(hoy.getFullYear());
                                fetchData(hoy.getMonth() + 1, hoy.getFullYear());
                            }}
                            className="text-sm font-bold text-[#13ec5b] hover:underline"
                        >
                            Volver al mes actual
                        </button>
                    )}
                </div>

                {/* Balance total */}
                <div className="mb-10">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
                        <div>
                            <h2 className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1">
                                Balance — {MESES[mes - 1]} {anio}
                            </h2>
                            <span className="text-5xl font-black text-slate-900 tracking-tighter">
                                {balance ? formatMonto(balance.organizacion.balance) : "$0"}
                            </span>
                        </div>
                        <Link
                            href="/dashboard/movimientos"
                            className="flex items-center gap-2 bg-[#13ec5b] hover:bg-[#13ec5b]/90 text-slate-900 px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-[#13ec5b]/20"
                        >
                            <span className="material-symbols-outlined text-[20px]">add_circle</span>
                            Nuevo Movimiento
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-[#13ec5b]/10 rounded-lg text-[#13ec5b]">
                                    <span className="material-symbols-outlined">payments</span>
                                </div>
                                <span className="text-slate-500 font-medium">Total Ingresos</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {balance ? formatMonto(balance.organizacion.totalIngresos) : "$0"}
                            </p>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-red-100 rounded-lg text-red-500">
                                    <span className="material-symbols-outlined">shopping_cart</span>
                                </div>
                                <span className="text-slate-500 font-medium">Total Gastos</span>
                            </div>
                            <p className="text-2xl font-bold text-slate-900">
                                {balance ? formatMonto(balance.organizacion.totalGastos) : "$0"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Gráfico de gastos por categoría */}
                {categoriasSorted.length > 0 && (
                    <div className="mb-10">
                        <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#13ec5b]">donut_large</span>
                            Gastos por Categoría — {MESES[mes - 1]} {anio}
                        </h3>
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-6">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="relative w-56 h-56 flex-shrink-0">
                                    <canvas ref={chartRef} />
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total</p>
                                        <p className="text-lg font-black text-slate-900 text-center leading-tight">
                                            {formatMonto(String(totalGastosGrafico))}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                                    {categoriasSorted.map(([nombre, monto], i) => {
                                        const pct = ((monto / totalGastosGrafico) * 100).toFixed(1);
                                        return (
                                            <div key={nombre} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                                                <div
                                                    className="w-3 h-3 rounded-full flex-shrink-0"
                                                    style={{ backgroundColor: COLORES[i % COLORES.length] }}
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-semibold text-slate-800 truncate">{nombre}</p>
                                                    <p className="text-xs text-slate-400">{formatMonto(String(monto))}</p>
                                                </div>
                                                <span className="text-xs font-black text-slate-500 flex-shrink-0">{pct}%</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Balance por usuario */}
                <div className="mb-10">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[#13ec5b]">group</span>
                        Resumen por Integrante — {MESES[mes - 1]} {anio}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {balance?.porUsuario.map((usuario) => (
                            <div key={usuario.userId} className="bg-white overflow-hidden rounded-xl border border-slate-100 shadow-sm">
                                <div className="bg-[#13ec5b]/5 p-6 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-full bg-[#13ec5b]/20 flex items-center justify-center ring-2 ring-[#13ec5b] ring-offset-2">
                                            <span className="material-symbols-outlined text-[#13ec5b]">person</span>
                                        </div>
                                        <h4 className="font-bold text-lg">{usuario.name}</h4>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs uppercase font-bold text-slate-400">Neto</p>
                                        <p className={`text-xl font-black ${Number(usuario.balance) >= 0 ? "text-[#13ec5b]" : "text-red-500"}`}>
                                            {formatMonto(usuario.balance)}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-6 grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-[#f6f8f6]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Ingresos</span>
                                        <div className="flex items-center gap-2 text-[#13ec5b] font-bold">
                                            <span className="material-symbols-outlined text-sm">arrow_upward</span>
                                            {formatMonto(usuario.totalIngresos)}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-[#f6f8f6]">
                                        <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Gastos</span>
                                        <div className="flex items-center gap-2 text-red-500 font-bold">
                                            <span className="material-symbols-outlined text-sm">arrow_downward</span>
                                            {formatMonto(usuario.totalGastos)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Recuadro de deuda */}
                    <div className="mt-6">
                        {balance?.deuda ? (
                            <div className="bg-white rounded-xl border border-orange-200 shadow-sm overflow-hidden">
                                <div className="bg-orange-50 px-6 py-4 border-b border-orange-100 flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 rounded-lg">
                                        <span className="material-symbols-outlined text-orange-500">account_balance</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">Deuda entre integrantes</h4>
                                        <p className="text-xs text-slate-400">Acumulada desde el último saldo</p>
                                    </div>
                                </div>
                                <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="text-center">
                                            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Debe</p>
                                            <p className="font-bold text-slate-900">{balance.deuda.deudorName}</p>
                                        </div>
                                        <div className="flex flex-col items-center gap-1">
                                            <span className="material-symbols-outlined text-orange-400">arrow_forward</span>
                                            <p className="text-xl font-black text-orange-500">{formatMonto(balance.deuda.monto)}</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xs uppercase font-bold text-slate-400 mb-1">Recibe</p>
                                            <p className="font-bold text-slate-900">{balance.deuda.acreedorName}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setModalSaldar(true)}
                                        className="flex items-center gap-2 bg-[#13ec5b] hover:bg-[#13ec5b]/90 text-slate-900 px-5 py-2.5 rounded-lg font-bold transition-all shadow-lg shadow-[#13ec5b]/20"
                                    >
                                        <span className="material-symbols-outlined text-[20px]">check_circle</span>
                                        Saldar deuda
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white rounded-xl border border-slate-100 shadow-sm px-6 py-5 flex items-center gap-3">
                                <div className="p-2 bg-[#13ec5b]/10 rounded-lg">
                                    <span className="material-symbols-outlined text-[#13ec5b]">check_circle</span>
                                </div>
                                <p className="font-medium text-slate-600">No hay deudas pendientes entre integrantes.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actividad reciente */}
                <div>
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold flex items-center gap-2">
                            <span className="material-symbols-outlined text-[#13ec5b]">history</span>
                            Actividad Reciente — {MESES[mes - 1]} {anio}
                        </h3>
                        <Link href="/dashboard/movimientos" className="text-[#13ec5b] text-sm font-bold flex items-center gap-1 hover:underline">
                            Ver todos
                            <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-100 overflow-hidden shadow-sm">
                        {movimientos.length === 0 ? (
                            <div className="p-12 text-center text-slate-400">
                                <span className="material-symbols-outlined text-4xl block mb-2">inbox</span>
                                <p className="font-medium">No hay movimientos en {MESES[mes - 1]} {anio}</p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                                        <th className="px-6 py-3">Descripción</th>
                                        <th className="px-6 py-3">Categoría</th>
                                        <th className="px-6 py-3">Por</th>
                                        <th className="px-6 py-3 text-right">Monto</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {movimientos.map((mov) => (
                                        <tr key={mov.id}>
                                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{mov.descripcion}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                                                    {mov.categoria.nombre}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-xs bg-slate-100 px-2 py-1 rounded">{mov.createdBy.name}</span>
                                            </td>
                                            <td className={`px-6 py-4 text-right font-bold ${mov.tipo === "INGRESO" ? "text-[#13ec5b]" : "text-red-500"}`}>
                                                {mov.tipo === "INGRESO" ? "+" : "-"}{formatMonto(mov.monto)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* Nav mobile */}
                <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 flex justify-around py-3 z-50">
                    <Link href="/dashboard" className="flex flex-col items-center gap-1 text-[#13ec5b]">
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
                    <Link href="/dashboard/importar" className="flex flex-col items-center gap-1 text-slate-400">
                        <span className="material-symbols-outlined">upload_file</span>
                        <span className="text-[10px] font-bold">Importar</span>
                    </Link>
                </div>

            </main>

            {/* Modal saldar deuda */}
            {modalSaldar && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
                        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-900">Saldar deuda</h3>
                            <button onClick={() => setModalSaldar(false)} className="text-slate-400 hover:text-slate-600">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 text-center">
                                <p className="text-sm text-slate-600 mb-1">
                                    <span className="font-bold">{balance?.deuda?.deudorName}</span> le paga a <span className="font-bold">{balance?.deuda?.acreedorName}</span>
                                </p>
                                <p className="text-2xl font-black text-orange-500">
                                    {balance?.deuda ? formatMonto(balance.deuda.monto) : "$0"}
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">Nota (opcional)</label>
                                <input
                                    type="text"
                                    value={notaSaldar}
                                    onChange={(e) => setNotaSaldar(e.target.value)}
                                    placeholder="Ej. Transferencia por Mercado Pago"
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#13ec5b] focus:border-transparent outline-none text-slate-900 text-sm"
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={() => setModalSaldar(false)}
                                    className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold rounded-xl hover:bg-slate-200 transition-colors text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaldarDeuda}
                                    disabled={saldando}
                                    className="flex-1 py-3 bg-[#13ec5b] text-slate-900 font-bold rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity text-sm"
                                >
                                    {saldando ? "Procesando..." : "Confirmar pago"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}