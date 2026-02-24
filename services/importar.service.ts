import * as XLSX from "xlsx";

export type TransaccionImportada = {
    fecha: string;
    descripcion: string;
    monto: number;
    tipo: "INGRESO" | "GASTO";
    cuotaInfo: string | null;
};

export type ResultadoParseo = {
    transacciones: TransaccionImportada[];
    fechaResumen: string; // YYYY-MM-DD — fecha detectada del resumen
};

// ─────────────────────────────────────────
// PARSER SANTANDER (XLSX)
// ─────────────────────────────────────────
export function parsearSantander(buffer: Buffer): ResultadoParseo {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: null,
    });

    // Detectar fecha del resumen — está en la fila debajo de "Fecha de cierre"
    // Fila 5: ('Fecha de cierre', 'Fecha de vencimiento', ...)
    // Fila 6: ('29/01/2026', '06/02/2026', ...)
    let fechaResumen = new Date().toISOString().split("T")[0]; // fallback: hoy

    for (let i = 0; i < rows.length; i++) {
        const col0 = String(rows[i][0] ?? "").toLowerCase();
        if (col0.includes("fecha de cierre")) {
            const filaFecha = rows[i + 1];
            if (filaFecha && filaFecha[0]) {
                const partes = String(filaFecha[0]).split("/");
                if (partes.length === 3) {
                    // Usar el primer día del mes del cierre como fecha del resumen
                    fechaResumen = `${partes[2]}-${partes[1].padStart(2, "0")}-01`;
                }
            }
            break;
        }
    }

    console.log("[SANTANDER] fechaResumen detectada:", fechaResumen);

    const transacciones: TransaccionImportada[] = [];

    // Buscar inicio de consumos
    let inicioConsumos = -1;
    let finConsumos = -1;

    for (let i = 0; i < rows.length; i++) {
        const col0 = String(rows[i][0] ?? "").toLowerCase();
        if (col0.includes("tarjeta de")) {
            inicioConsumos = i + 2;
        }
        if (inicioConsumos > 0 && col0.includes("total de")) {
            finConsumos = i;
            break;
        }
    }

    if (inicioConsumos === -1) return { transacciones: [], fechaResumen };

    const fin = finConsumos > 0 ? finConsumos : rows.length;

    for (let i = inicioConsumos; i < fin; i++) {
        const row = rows[i];
        if (!row || row.every((c: any) => c === null)) continue;

        const descripcion = String(row[1] ?? "").trim();
        const cuotasRaw = String(row[2] ?? "").trim();
        const montoRaw = String(row[4] ?? "").trim();

        if (!descripcion || !montoRaw) continue;

        // Monto — formato "$12.494,44" o "$-506.186,34"
        const montoLimpio = montoRaw
            .replace(/\$/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
            .trim();

        const monto = parseFloat(montoLimpio);
        if (isNaN(monto)) continue;

        // Cuotas — "16 de 18" → "16/18"
        let cuotaInfo: string | null = null;
        if (cuotasRaw) {
            const match = cuotasRaw.match(/(\d+)\s+de\s+(\d+)/i);
            if (match) {
                cuotaInfo = `${match[1]}/${match[2]}`;
            }
        }

        // Usar siempre la fecha del resumen, no la fecha de la compra original
        transacciones.push({
            fecha: fechaResumen,
            descripcion,
            monto: Math.abs(monto),
            tipo: monto < 0 ? "INGRESO" : "GASTO",
            cuotaInfo,
        });
    }

    console.log("[SANTANDER] transacciones encontradas:", transacciones.length);
    return { transacciones, fechaResumen };
}

// ─────────────────────────────────────────
// PARSER BBVA (PDF)
// ─────────────────────────────────────────
export async function parsearBBVA(buffer: Buffer): Promise<ResultadoParseo> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse/lib/pdf-parse.js");
    const data = await pdfParse(buffer);
    const texto = data.text;

    const lineas = texto.split("\n").map((l: string) => l.trim()).filter(Boolean);

    const meses: Record<string, string> = {
        ene: "01", feb: "02", mar: "03", abr: "04",
        may: "05", jun: "06", jul: "07", ago: "08",
        sep: "09", oct: "10", nov: "11", dic: "12",
    };

    // Detectar fecha del resumen — buscar "Fecha de cierre" o "Vencimiento" en el PDF
    // En los PDFs del BBVA suele aparecer como "Vencimiento: 06-Feb-26"
    let fechaResumen = new Date().toISOString().split("T")[0]; // fallback: hoy

    for (const linea of lineas) {
        const match = linea.match(/vencimiento[:\s]+(\d{2})-([A-Za-záéíóú]{3})-(\d{2,4})/i);
        if (match) {
            const mes = meses[match[2].toLowerCase()];
            const anio = match[3].length === 2 ? `20${match[3]}` : match[3];
            if (mes) {
                // Usar el primer día del mes del vencimiento como fecha del resumen
                fechaResumen = `${anio}-${mes}-01`;
            }
            break;
        }
    }

    console.log("[BBVA] fechaResumen detectada:", fechaResumen);

    const transacciones: TransaccionImportada[] = [];

    const REGEX_FECHA = /^(\d{2})-([A-Za-záéíóú]{3})-(\d{2,4})$/;
    const REGEX_MONTO = /^[\d.]+,\d{2}$/;
    const REGEX_HEADER = /^FECHADESCRIPCI/i;
    const REGEX_PAGINA = /^(Sobre\s*\(\d+\)|Banco BBVA|OCASA)/i;
    const INICIO_CONSUMOS = /^consumos\s+/i;
    const FIN_CONSUMOS = /^(sus pagos|impuesto de sellos|saldo actual$|detalle$)/i;
    const REGEX_SKIP = /^(impuesto de sellos|total consumos|total de cuotas)/i;

    let enConsumos = false;
    let i = 0;

    while (i < lineas.length) {
        const linea = lineas[i];

        if (INICIO_CONSUMOS.test(linea)) {
            enConsumos = true;
            i++;
            continue;
        }

        if (enConsumos && FIN_CONSUMOS.test(linea)) {
            enConsumos = false;
            i++;
            continue;
        }

        if (REGEX_HEADER.test(linea) || REGEX_PAGINA.test(linea) || REGEX_SKIP.test(linea)) {
            i++;
            continue;
        }

        if (!enConsumos) {
            i++;
            continue;
        }

        const matchFecha = linea.match(REGEX_FECHA);
        if (!matchFecha) {
            i++;
            continue;
        }

        if (i + 1 >= lineas.length) break;
        const lineaDesc = lineas[i + 1];

        if (REGEX_FECHA.test(lineaDesc) || REGEX_HEADER.test(lineaDesc)) {
            i++;
            continue;
        }

        let cuotaInfo: string | null = null;
        const cuotaMatch = lineaDesc.match(/C\.(\d{1,2})\/(\d{1,2})\d{4,}/i);
        if (cuotaMatch) {
            cuotaInfo = `${cuotaMatch[1]}/${cuotaMatch[2]}`;
        }

        const descripcion = lineaDesc
            .replace(/C\.\d+\/\d+/gi, "")
            .replace(/\s+\d{6,}$/, "")
            .replace(/\s+/g, " ")
            .trim();

        if (i + 2 >= lineas.length) break;
        const lineaMonto = lineas[i + 2];

        if (!REGEX_MONTO.test(lineaMonto)) {
            i++;
            continue;
        }

        const montoLimpio = lineaMonto.replace(/\./g, "").replace(",", ".");
        const monto = parseFloat(montoLimpio);
        if (isNaN(monto)) { i += 3; continue; }

        // Usar siempre la fecha del resumen, no la fecha de la compra original
        transacciones.push({
            fecha: fechaResumen,
            descripcion,
            monto,
            tipo: "GASTO",
            cuotaInfo,
        });

        i += 3;
    }

    console.log("[BBVA] transacciones encontradas:", transacciones.length);
    return { transacciones, fechaResumen };
}