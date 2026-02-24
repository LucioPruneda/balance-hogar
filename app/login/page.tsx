"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error || "Error al iniciar sesión");
                return;
            }

            router.push("/dashboard");

        } catch {
            setError("Error de conexión, intentá de nuevo");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-[#f6f8f6] text-slate-900 min-h-screen flex flex-col">

            {/* Header */}
            <header className="w-full px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white backdrop-blur-sm">
                <div className="flex items-center gap-2">
                    <img src="/logo-bulldog.png" alt="Logo" className="size-8 object-contain rounded-lg" />
                    <h1 className="text-xl font-bold tracking-tight text-slate-900">Rita</h1>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
                        <div className="p-8">

                            {/* Título */}
                            <div className="text-center mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 mb-2">Bienvenidos</h2>
                                <p className="text-slate-500 text-sm">
                                    Ingresá tus credenciales para gestionar tus finanzas compartidas.
                                </p>
                            </div>

                            {/* Formulario */}
                            <form onSubmit={handleSubmit} className="space-y-6">

                                {/* Email */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 block" htmlFor="email">
                                        Correo electrónico
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <span className="material-symbols-outlined text-xl">mail</span>
                                        </div>
                                        <input
                                            id="email"
                                            type="email"
                                            required
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="ejemplo@correo.com"
                                            className="block w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] transition-all text-sm"
                                        />
                                    </div>
                                </div>

                                {/* Password */}
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-slate-700 block" htmlFor="password">
                                        Contraseña
                                    </label>
                                    <div className="relative group">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                            <span className="material-symbols-outlined text-xl">lock</span>
                                        </div>
                                        <input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            required
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="block w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#13ec5b]/50 focus:border-[#13ec5b] transition-all text-sm"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                                        >
                                            <span className="material-symbols-outlined text-xl">
                                                {showPassword ? "visibility_off" : "visibility"}
                                            </span>
                                        </button>
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-lg px-4 py-3">
                                        {error}
                                    </p>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-[#13ec5b] hover:bg-[#13ec5b]/90 disabled:bg-[#13ec5b]/50 text-slate-900 font-bold py-3.5 px-4 rounded-lg shadow-sm transition-all flex items-center justify-center gap-2 group"
                                >
                                    {loading ? (
                                        <>
                                            <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                                            <span>Ingresando...</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Iniciar sesión</span>
                                            <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>

                        {/* Footer de la card */}
                        <div className="px-8 py-4 bg-slate-50 border-t border-slate-200 text-center">
                            <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold">
                                Acceso Seguro o pateor
                            </p>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="w-full py-6 px-6 text-center text-slate-400 text-xs">
                <p>© 2026 Rita. Todos los derechos reservados.</p>
            </footer>

            {/* Google Fonts para los íconos */}
            <link
                href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
                rel="stylesheet"
            />
        </div>
    );
}