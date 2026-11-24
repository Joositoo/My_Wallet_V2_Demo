// Utilidades de fechas para la demo (todas trabajan con cadenas YYYY-MM-DD en hora local).

export const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
export const MESES_LARGO = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
export const MESES_MIN = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

export function toISODate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

// Fecha "k" meses antes (k negativo = futuro) del mes de `today`, en el día indicado.
// Si el mes no tiene ese día (p. ej. 31), se usa el último día del mes.
export function dateAt(today, monthsBack, day) {
    const base = new Date(today.getFullYear(), today.getMonth() - monthsBack, 1);
    const lastDay = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    base.setDate(Math.min(day, lastDay));
    return toISODate(base);
}

export function monthKey(iso) {
    return iso.slice(0, 7);
}

export function yearOf(iso) {
    return Number(iso.slice(0, 4));
}

export function monthIndexOf(iso) {
    return Number(iso.slice(5, 7)) - 1;
}
