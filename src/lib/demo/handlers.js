import { commit, getDB, nextId } from "./store.js";
import { MESES_CORTO, MESES_LARGO, monthIndexOf, monthKey, toISODate, yearOf } from "./dates.js";
import { getStatus, paidAmount } from "../deudasUtils.js";

// Implementación en el navegador de la API de MyWallet: cada función replica la
// lógica (validaciones, códigos de estado y formato de respuesta) de la ruta
// equivalente del backend real, pero sobre los datos de localStorage.
// Devuelven siempre { status, body }.

// ── Utilidades de respuesta ─────────────────────────────────

const reply = (status, body) => ({ status, body });
const ok = (body) => reply(200, body);
const created = (body) => reply(201, body);
const fail = (status, error) => reply(status, { error });

const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const money2 = (n) => round2(n).toFixed(2);
const num = (v) => Number(v) || 0;

// Como hace MySQL: SUM() devuelve un DECIMAL (cadena con 2 decimales) o NULL si no hay filas
const sumOrZero = (rows) => (rows.length ? money2(rows.reduce((s, r) => s + r.cantidad, 0)) : 0);

// Las fechas se devuelven a mediodía UTC para que el día no cambie en ninguna zona horaria
const fechaRow = (iso) => `${iso}T12:00:00.000Z`;

const isValidDate = (value) => {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const d = new Date(`${value}T12:00:00`);
    return !Number.isNaN(d.getTime()) && toISODate(d) === value;
};

// Importe positivo con 2 decimales, o null si no es válido
function parseMoney(value, max = 99999999.99) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0 || n > max) return null;
    return round2(n);
}

const mapMovimiento = (r) => ({
    id: r.id,
    usuario_id: r.usuario_id,
    categoria_id: r.categoria_id,
    cantidad: money2(r.cantidad),
    descripcion: r.descripcion,
    fecha: fechaRow(r.fecha),
});

// ── Ingresos y gastos ───────────────────────────────────────

function movimientos(tabla, tipoCategoria, claves, etiquetas) {
    const { lista, mes, anio } = claves;
    return {
        listar() {
            const db = getDB();
            const rows = db[tabla];
            const hoy = new Date();
            const delMes = rows.filter((r) => yearOf(r.fecha) === hoy.getFullYear() && monthIndexOf(r.fecha) === hoy.getMonth());
            const delAnio = rows.filter((r) => yearOf(r.fecha) === hoy.getFullYear());
            return ok({ [lista]: rows.map(mapMovimiento), [mes]: sumOrZero(delMes), [anio]: sumOrZero(delAnio) });
        },
        crear({ body }) {
            const db = getDB();
            const { categoria_id, cantidad, descripcion, fecha } = body ?? {};
            if (!categoria_id || !cantidad || !descripcion || !fecha) return fail(400, "Ningún campo debe quedar vacío");
            if (cantidad <= 0) return fail(400, "La cantidad debe ser mayor que 0");
            if (!isValidDate(fecha)) return fail(400, "La fecha no es válida");
            const categoria = db.categorias.find((c) => c.id === Number(categoria_id) && c.tipo === tipoCategoria);
            if (!categoria) return fail(400, "Categoría no encontrada");
            const id = nextId(db, tabla);
            db[tabla].push({
                id,
                usuario_id: db.usuario.id,
                categoria_id: categoria.id,
                cantidad: round2(Number(cantidad)),
                descripcion: String(descripcion).trim(),
                fecha,
            });
            commit();
            return created({ mensaje: etiquetas.creado, id });
        },
        modificar({ params, body }) {
            const db = getDB();
            const { categoria_id, cantidad, descripcion, fecha } = body ?? {};
            if (!categoria_id || !cantidad || !descripcion || !fecha) return fail(400, "Faltan campos obligatorios");
            if (cantidad <= 0) return fail(400, "La cantidad debe ser mayor a 0.");
            if (!isValidDate(fecha)) return fail(400, "La fecha no es válida");
            const row = db[tabla].find((r) => r.id === Number(params.id));
            if (!row) return fail(404, etiquetas.noEncontrado);
            const categoria = db.categorias.find((c) => c.id === Number(categoria_id) && c.tipo === tipoCategoria);
            if (!categoria) return fail(400, "Categoría no válida.");
            Object.assign(row, {
                categoria_id: categoria.id,
                cantidad: round2(Number(cantidad)),
                descripcion: String(descripcion).trim(),
                fecha,
            });
            commit();
            return ok({ mensaje: etiquetas.modificado });
        },
        eliminar({ params }) {
            const db = getDB();
            const idx = db[tabla].findIndex((r) => r.id === Number(params.id));
            if (idx === -1) return fail(404, etiquetas.noEncontrado);
            db[tabla].splice(idx, 1);
            commit();
            return ok({ mensaje: etiquetas.eliminado });
        },
    };
}

const ingresos = movimientos(
    "ingresos",
    "ingreso",
    { lista: "incomes", mes: "currentMonth", anio: "currentYear" },
    { creado: "Ingreso creado", modificado: "Ingreso modificado", eliminado: "Ingreso eliminado", noEncontrado: "Ingreso no encontrado" }
);
const gastos = movimientos(
    "gastos",
    "gasto",
    { lista: "expenses", mes: "currentMonth", anio: "currentYear" },
    { creado: "Gasto creado", modificado: "Gasto modificado", eliminado: "Gasto eliminado", noEncontrado: "Gasto no encontrado" }
);

// ── Categorías ──────────────────────────────────────────────

const categorias = {
    listar() {
        return ok(getDB().categorias.map((c) => ({ ...c })));
    },
    crear({ body }) {
        const db = getDB();
        const { nombre, tipo, icono } = body ?? {};
        if (!nombre) return fail(400, "El nombre no debe quedar vacío");
        if (!["ingreso", "gasto"].includes(tipo)) return fail(400, "Tipo inválido");
        const id = nextId(db, "categorias");
        db.categorias.push({ id, usuario_id: db.usuario.id, nombre: String(nombre).trim(), tipo, icono: icono ?? null });
        commit();
        return created({ mensaje: "Categoría creada", id });
    },
    modificar({ params, body }) {
        const db = getDB();
        const { nombre, icono } = body ?? {};
        if (!nombre) return fail(400, "Nombre obligatorio");
        const cat = db.categorias.find((c) => c.id === Number(params.id));
        if (!cat) return fail(404, "Categoría no encontrada");
        cat.nombre = String(nombre).trim();
        cat.icono = icono || null;
        commit();
        return ok({ mensaje: "Categoría modificada" });
    },
    eliminar({ params }) {
        const db = getDB();
        const id = Number(params.id);
        const idx = db.categorias.findIndex((c) => c.id === id);
        if (idx === -1) return fail(404, "Categoría no encontrada");
        if (db.ingresos.some((r) => r.categoria_id === id) || db.gastos.some((r) => r.categoria_id === id)) {
            return fail(409, "No se puede eliminar una categoría con movimientos asociados");
        }
        db.categorias.splice(idx, 1);
        commit();
        return ok({ mensaje: "Categoría eliminada" });
    },
};

// ── Resumen anual ───────────────────────────────────────────

const resumen = {
    obtener({ query }) {
        const db = getDB();
        const year = Number(query.get("year")) || new Date().getFullYear();
        const ingresosAnio = db.ingresos.filter((r) => yearOf(r.fecha) === year);
        const gastosAnio = db.gastos.filter((r) => yearOf(r.fecha) === year);
        const movimientosAnio = [
            ...ingresosAnio.map((r) => ({ ...mapMovimiento(r), tipo: "ingreso", _f: r.fecha })),
            ...gastosAnio.map((r) => ({ ...mapMovimiento(r), tipo: "gasto", _f: r.fecha })),
        ]
            .sort((a, b) => b._f.localeCompare(a._f))
            .map(({ _f, ...resto }) => resto);

        return ok({
            AllIncomes: db.ingresos.map(mapMovimiento),
            allMovements: movimientosAnio,
            totalAnualIncome: sumOrZero(ingresosAnio),
            totalAnnualExpense: sumOrZero(gastosAnio),
            totalHistoricalIncome: sumOrZero(db.ingresos),
        });
    },
};

// ── Suscripciones ───────────────────────────────────────────

const suscripciones = {
    crear({ body }) {
        const db = getDB();
        const { nombre } = body ?? {};
        if (!nombre) return fail(400, "Campo vacío");
        const id = nextId(db, "suscripciones");
        db.suscripciones.push({ id, usuario_id: db.usuario.id, nombre });
        commit();
        return created({ mensaje: "Suscripción creada", id });
    },
    modificar({ params, body }) {
        const db = getDB();
        const { nombre } = body ?? {};
        if (!nombre || String(nombre).trim() === "") return fail(400, "El nombre de la suscripción no puede estar vacío");
        const susc = db.suscripciones.find((s) => s.id === Number(params.id));
        if (!susc) return fail(404, "Suscripción no encontrada");
        susc.nombre = nombre;
        commit();
        return ok({ mensaje: "Suscripción modificada" });
    },
    eliminar({ params }) {
        const db = getDB();
        const id = Number(params.id);
        const idx = db.suscripciones.findIndex((s) => s.id === id);
        if (idx === -1) return fail(404, "Suscripción no encontrada");
        db.suscripciones.splice(idx, 1);
        db.pagosSuscripcion = db.pagosSuscripcion.filter((p) => p.suscripcion_id !== id); // cascada
        commit();
        return ok({ mensaje: "Suscripción eliminada" });
    },
    listarConPagos({ query }) {
        const db = getDB();
        const year = Number(query.get("year")) || new Date().getFullYear();
        const lista = db.suscripciones
            .slice()
            .sort((a, b) => a.id - b.id)
            .map((s) => ({
                id: String(s.id),
                nombre: s.nombre,
                pagos: db.pagosSuscripcion
                    .filter((p) => p.suscripcion_id === s.id && yearOf(p.fecha) === year)
                    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
                    .map((p) => ({ id: String(p.id), cantidad: Number(p.cantidad), fecha: p.fecha, nota: p.nota ?? "" })),
            }));
        return ok(lista);
    },
    crearPago({ body }) {
        const db = getDB();
        const { suscId, cantidad, fecha, nota } = body ?? {};
        if (!suscId || !cantidad || !fecha) return fail(400, "Ningún campo debe quedar vacío");
        if (cantidad <= 0) return fail(400, "La cantidad debe ser mayor a 0");
        if (!isValidDate(fecha)) return fail(400, "La fecha no es válida");
        if (!db.suscripciones.some((s) => s.id === Number(suscId))) return fail(404, "Suscripción no encontrada");
        const id = nextId(db, "pagosSuscripcion");
        db.pagosSuscripcion.push({
            id,
            suscripcion_id: Number(suscId),
            cantidad: round2(Number(cantidad)),
            fecha,
            nota: String(nota ?? "").trim(),
        });
        commit();
        return created({ mensaje: "Pago creado", id });
    },
    modificarPago({ params, body }) {
        const db = getDB();
        const { cantidad, fecha, nota } = body ?? {};
        if (!cantidad || isNaN(cantidad) || cantidad <= 0 || !fecha) return fail(400, "Los datos del pago son inválidos");
        if (!isValidDate(fecha)) return fail(400, "La fecha no es válida");
        const pago = db.pagosSuscripcion.find((p) => p.id === Number(params.pagoId));
        if (!pago) return fail(404, "Pago no encontrado");
        Object.assign(pago, { cantidad: round2(Number(cantidad)), fecha, nota: nota ?? "" });
        commit();
        return ok({ mensaje: "Pago modificado" });
    },
    eliminarPago({ params, query }) {
        const db = getDB();
        const suscId = Number(query.get("suscId"));
        const idx = db.pagosSuscripcion.findIndex((p) => p.id === Number(params.pagoId) && p.suscripcion_id === suscId);
        if (idx === -1) return fail(404, "Pago no encontrado");
        db.pagosSuscripcion.splice(idx, 1);
        commit();
        return ok({ mensaje: "Pago eliminado" });
    },
};

// ── Perfil ──────────────────────────────────────────────────

const perfil = {
    obtener() {
        return ok({ nombre: getDB().usuario.nombre });
    },
    cambiarNombre({ body }) {
        const db = getDB();
        const { name } = body ?? {};
        if (!name || String(name).trim() === "") return fail(400, "El nombre es obligatorio");
        db.usuario.nombre = String(name).trim();
        commit();
        return ok({ mensaje: "name actualizado" });
    },
    cambiarPassword({ body }) {
        const { currentPassword, newPassword } = body ?? {};
        if (!currentPassword || !newPassword) return fail(400, "Todos los campos son obligatorios");
        // En la demo no existen contraseñas reales: se acepta el cambio sin guardar nada
        return ok({ mensaje: "Contraseña actualizada" });
    },
};

// ── Deudas ──────────────────────────────────────────────────

const TIPOS_PAGO = ["cuota", "extraordinario"];

// La deuda queda activa mientras lo pagado sea menor que el total
function syncDeudaActiva(db, deudaId) {
    const deuda = db.deudas.find((d) => d.id === deudaId);
    if (!deuda) return;
    const pagado = db.pagosDeuda.filter((p) => p.deuda_id === deudaId).reduce((s, p) => s + p.cantidad, 0);
    deuda.activa = pagado < deuda.precio_total;
}

const deudas = {
    listar() {
        const db = getDB();
        const lista = db.deudas
            .slice()
            .sort((a, b) => Number(b.activa) - Number(a.activa) || a.fecha_fin.localeCompare(b.fecha_fin) || a.id - b.id)
            .map((d) => ({
                id: d.id,
                nombre: d.nombre,
                precio_total: Number(d.precio_total),
                cuota_mensual: Number(d.cuota_mensual),
                activa: Boolean(d.activa),
                fecha_alta: d.fecha_alta,
                fecha_fin: d.fecha_fin,
                pagos: db.pagosDeuda
                    .filter((p) => p.deuda_id === d.id)
                    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
                    .map((p) => ({ id: p.id, cantidad: Number(p.cantidad), fecha: p.fecha, tipo: p.tipo, nota: p.nota ?? "" })),
            }));
        return ok(lista);
    },
    crear({ body }) {
        const db = getDB();
        const { nombre, precio_total, cuota_mensual, fecha_fin, activa } = body ?? {};
        const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";
        const total = parseMoney(precio_total, 9999999999.99);
        const cuota = parseMoney(cuota_mensual);
        if (!nombreLimpio || nombreLimpio.length > 100) return fail(400, "El nombre es obligatorio (máx. 100 caracteres)");
        if (total === null || cuota === null) return fail(400, "El importe total y la cuota deben ser mayores que 0");
        if (!isValidDate(fecha_fin)) return fail(400, "La fecha de fin no es válida");
        const id = nextId(db, "deudas");
        db.deudas.push({
            id,
            usuario_id: db.usuario.id,
            nombre: nombreLimpio,
            precio_total: total,
            cuota_mensual: cuota,
            fecha_alta: toISODate(new Date()),
            fecha_fin,
            activa: activa !== false,
        });
        commit();
        return created({ mensaje: "Deuda creada", id });
    },
    modificar({ params, body }) {
        const db = getDB();
        const { nombre, precio_total, cuota_mensual, fecha_fin, activa } = body ?? {};
        const nombreLimpio = typeof nombre === "string" ? nombre.trim() : "";
        const total = parseMoney(precio_total, 9999999999.99);
        const cuota = parseMoney(cuota_mensual);
        if (!nombreLimpio || nombreLimpio.length > 100) return fail(400, "El nombre es obligatorio (máx. 100 caracteres)");
        if (total === null || cuota === null) return fail(400, "El importe total y la cuota deben ser mayores que 0");
        if (!isValidDate(fecha_fin)) return fail(400, "La fecha de fin no es válida");
        const deuda = db.deudas.find((d) => d.id === Number(params.id));
        if (!deuda) return fail(404, "Deuda no encontrada");
        Object.assign(deuda, {
            nombre: nombreLimpio,
            precio_total: total,
            cuota_mensual: cuota,
            fecha_fin,
            activa: activa !== false,
        });
        // Si se deja activa pero ya está totalmente pagada, pasa a liquidada
        if (activa !== false) syncDeudaActiva(db, deuda.id);
        commit();
        return ok({ mensaje: "Deuda modificada" });
    },
    eliminar({ params }) {
        const db = getDB();
        const id = Number(params.id);
        const idx = db.deudas.findIndex((d) => d.id === id);
        if (idx === -1) return fail(404, "Deuda no encontrada");
        db.deudas.splice(idx, 1);
        db.pagosDeuda = db.pagosDeuda.filter((p) => p.deuda_id !== id); // cascada
        commit();
        return ok({ mensaje: "Deuda eliminada" });
    },
    crearPago({ body }) {
        const db = getDB();
        const { deudaId, cantidad, fecha, tipo, nota } = body ?? {};
        const importe = parseMoney(cantidad);
        const tipoPago = tipo ?? "cuota";
        const notaLimpia = typeof nota === "string" ? nota.trim().slice(0, 255) : "";
        if (!deudaId || importe === null || !isValidDate(fecha) || !TIPOS_PAGO.includes(tipoPago)) {
            return fail(400, "Los datos del pago son inválidos");
        }
        const deuda = db.deudas.find((d) => d.id === Number(deudaId));
        if (!deuda) return fail(404, "Deuda no encontrada");
        const id = nextId(db, "pagosDeuda");
        db.pagosDeuda.push({ id, deuda_id: deuda.id, cantidad: importe, fecha, tipo: tipoPago, nota: notaLimpia });
        syncDeudaActiva(db, deuda.id);
        commit();
        return created({ mensaje: "Pago creado", id });
    },
    modificarPago({ params, body }) {
        const db = getDB();
        const { cantidad, fecha, tipo, nota } = body ?? {};
        const importe = parseMoney(cantidad);
        const tipoPago = tipo ?? "cuota";
        const notaLimpia = typeof nota === "string" ? nota.trim().slice(0, 255) : "";
        if (importe === null || !isValidDate(fecha) || !TIPOS_PAGO.includes(tipoPago)) {
            return fail(400, "Los datos del pago son inválidos");
        }
        const pago = db.pagosDeuda.find((p) => p.id === Number(params.pagoId));
        if (!pago) return fail(404, "Pago no encontrado");
        Object.assign(pago, { cantidad: importe, fecha, tipo: tipoPago, nota: notaLimpia });
        syncDeudaActiva(db, pago.deuda_id);
        commit();
        return ok({ mensaje: "Pago modificado" });
    },
    eliminarPago({ params }) {
        const db = getDB();
        const idx = db.pagosDeuda.findIndex((p) => p.id === Number(params.pagoId));
        if (idx === -1) return fail(404, "Pago no encontrado");
        const deudaId = db.pagosDeuda[idx].deuda_id;
        db.pagosDeuda.splice(idx, 1);
        syncDeudaActiva(db, deudaId);
        commit();
        return ok({ mensaje: "Pago eliminado" });
    },
};

// ── Dashboard ───────────────────────────────────────────────

const PERIODOS = ["mes", "3meses", "anio"];

// Rango del periodo seleccionado y del periodo anterior equivalente
function getRangos(periodo, now) {
    const y = now.getFullYear();
    const m = now.getMonth();
    let inicio, fin, prevInicio, prevFin;
    if (periodo === "anio") {
        inicio = new Date(y, 0, 1);
        fin = new Date(y, 11, 31);
        prevInicio = new Date(y - 1, 0, 1);
        prevFin = new Date(y - 1, 11, 31);
    } else if (periodo === "3meses") {
        inicio = new Date(y, m - 2, 1);
        fin = new Date(y, m + 1, 0);
        prevInicio = new Date(y, m - 5, 1);
        prevFin = new Date(y, m - 2, 0);
    } else {
        inicio = new Date(y, m, 1);
        fin = new Date(y, m + 1, 0);
        prevInicio = new Date(y, m - 1, 1);
        prevFin = new Date(y, m, 0);
    }
    return {
        inicio: toISODate(inicio),
        fin: toISODate(fin),
        prevInicio: toISODate(prevInicio),
        prevFin: toISODate(prevFin),
    };
}

const enRango = (rows, desde, hasta) => rows.filter((r) => r.fecha >= desde && r.fecha <= hasta);
const suma = (rows) => rows.reduce((s, r) => s + r.cantidad, 0);

function totalesPorMes(rows) {
    const map = new Map();
    for (const r of rows) map.set(monthKey(r.fecha), (map.get(monthKey(r.fecha)) ?? 0) + r.cantidad);
    return map;
}

function agruparCategorias(db, rows, maxItems) {
    const porCategoria = new Map();
    for (const r of rows) porCategoria.set(r.categoria_id, (porCategoria.get(r.categoria_id) ?? 0) + r.cantidad);
    const ordenadas = [...porCategoria.entries()]
        .map(([id, total]) => ({ nombre: db.categorias.find((c) => c.id === id)?.nombre ?? "Sin categoría", total }))
        .sort((a, b) => b.total - a.total);

    const total = round2(ordenadas.reduce((s, r) => s + r.total, 0));
    const corte = ordenadas.length > maxItems ? maxItems - 1 : ordenadas.length;
    const items = ordenadas.slice(0, corte).map((r) => ({ nombre: r.nombre, importe: round2(r.total) }));
    if (ordenadas.length > corte) {
        items.push({ nombre: "Otros", importe: round2(ordenadas.slice(corte).reduce((s, r) => s + r.total, 0)) });
    }
    return { total, items: items.map((i) => ({ ...i, porcentaje: total ? round1((i.importe / total) * 100) : 0 })) };
}

function variacionPct(actual, anterior) {
    if (!anterior) return null;
    return round1(((actual - anterior) / Math.abs(anterior)) * 100);
}

export function buildDashboard(db, periodoParam, now = new Date()) {
    const periodo = PERIODOS.includes(periodoParam) ? periodoParam : "mes";
    const hoy = toISODate(now);
    const y = now.getFullYear();
    const m = now.getMonth();
    const rango = getRangos(periodo, now);

    // ── KPIs ──
    const ingresosPeriodo = enRango(db.ingresos, rango.inicio, rango.fin);
    const gastosPeriodo = enRango(db.gastos, rango.inicio, rango.fin);
    const ingresosTotal = suma(ingresosPeriodo);
    const gastosTotal = suma(gastosPeriodo);
    const ingresosPrev = suma(enRango(db.ingresos, rango.prevInicio, rango.prevFin));
    const gastosPrev = suma(enRango(db.gastos, rango.prevInicio, rango.prevFin));

    const balance = ingresosTotal - gastosTotal;
    const balancePrev = ingresosPrev - gastosPrev;
    const ahorro = ingresosTotal > 0 ? (balance / ingresosTotal) * 100 : 0;
    const ahorroPrev = ingresosPrev > 0 ? (balancePrev / ingresosPrev) * 100 : null;

    const kpis = {
        ingresos: round2(ingresosTotal),
        gastos: round2(gastosTotal),
        balance: round2(balance),
        tasaAhorro: round1(ahorro),
        variaciones: {
            ingresos: variacionPct(ingresosTotal, ingresosPrev),
            gastos: variacionPct(gastosTotal, gastosPrev),
            balance: variacionPct(balance, balancePrev),
            tasaAhorro: ahorroPrev === null ? null : round1(ahorro - ahorroPrev),
        },
    };

    // ── Últimos 6 meses ──
    const seisInicio = toISODate(new Date(y, m - 5, 1));
    const seisFin = toISODate(new Date(y, m + 1, 0));
    const ingresos6 = totalesPorMes(enRango(db.ingresos, seisInicio, seisFin));
    const gastos6 = totalesPorMes(enRango(db.gastos, seisInicio, seisFin));
    const mensual = [];
    for (let i = 0; i < 6; i++) {
        const d = new Date(y, m - 5 + i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        mensual.push({ mes: MESES_CORTO[d.getMonth()], ingresos: round2(ingresos6.get(key) ?? 0), gastos: round2(gastos6.get(key) ?? 0) });
    }
    const balance6Meses = round2(mensual.reduce((s, x) => s + x.ingresos - x.gastos, 0));

    // ── Año en curso (balance acumulado) ──
    const ingresosAnio = totalesPorMes(enRango(db.ingresos, `${y}-01-01`, `${y}-12-31`));
    const gastosAnio = totalesPorMes(enRango(db.gastos, `${y}-01-01`, `${y}-12-31`));
    const anualMeses = [];
    let acumulado = 0;
    let mejor = null;
    let peor = null;
    for (let i = 0; i <= m; i++) {
        const key = `${y}-${String(i + 1).padStart(2, "0")}`;
        const ing = ingresosAnio.get(key) ?? 0;
        const gas = gastosAnio.get(key) ?? 0;
        const neto = ing - gas;
        acumulado += neto;
        anualMeses.push({ mes: MESES_CORTO[i], balance: round2(acumulado) });
        if (ing !== 0 || gas !== 0) {
            if (!mejor || neto > mejor.neto) mejor = { mes: MESES_LARGO[i], neto: round2(neto) };
            if (!peor || neto < peor.neto) peor = { mes: MESES_LARGO[i], neto: round2(neto) };
        }
    }
    const anual = { anio: y, meses: anualMeses, balanceTotal: round2(acumulado), mejor, peor };

    // ── Suscripciones (año en curso) ──
    const suscRows = db.suscripciones
        .map((s) => ({
            id: s.id,
            nombre: s.nombre,
            total: db.pagosSuscripcion.filter((p) => p.suscripcion_id === s.id && yearOf(p.fecha) === y).reduce((acc, p) => acc + p.cantidad, 0),
        }))
        .sort((a, b) => b.total - a.total || a.nombre.localeCompare(b.nombre));
    const suscripcionesResumen = {
        anio: y,
        cantidad: suscRows.length,
        gastoAnual: round2(suscRows.reduce((s, r) => s + r.total, 0)),
        top: suscRows.slice(0, 4).map((r) => ({ id: r.id, nombre: r.nombre, importe: round2(r.total) })),
    };

    // ── Deudas ──
    const deudasCalc = db.deudas.map((d) => {
        const deuda = {
            ...d,
            activa: Boolean(d.activa),
            pagos: db.pagosDeuda.filter((p) => p.deuda_id === d.id).map((p) => ({ cantidad: p.cantidad, tipo: p.tipo, fecha: p.fecha })),
        };
        const pagado = paidAmount(deuda);
        return { ...deuda, estado: getStatus(deuda, hoy), pagado, pendiente: Math.max(0, deuda.precio_total - pagado) };
    });
    const abiertas = deudasCalc.filter((d) => d.estado !== "Liquidada");
    const totalDeudas = deudasCalc.reduce((s, d) => s + d.precio_total, 0);
    const pagadoDeudas = deudasCalc.reduce((s, d) => s + d.pagado, 0);
    const ordenEstado = { Retrasada: 0, Activa: 1, Liquidada: 2 };
    const deudasResumen = {
        cantidad: deudasCalc.length,
        pendiente: round2(abiertas.reduce((s, d) => s + d.pendiente, 0)),
        cuotaMensual: round2(abiertas.reduce((s, d) => s + d.cuota_mensual, 0)),
        progreso: totalDeudas ? round1((pagadoDeudas / totalDeudas) * 100) : 0,
        retrasadas: deudasCalc.filter((d) => d.estado === "Retrasada").length,
        top: deudasCalc
            .slice()
            .sort((a, b) => ordenEstado[a.estado] - ordenEstado[b.estado] || b.pendiente - a.pendiente)
            .slice(0, 3)
            .map((d) => ({ id: d.id, nombre: d.nombre, estado: d.estado, progreso: Math.min(100, round1((d.pagado / d.precio_total) * 100)) })),
    };

    // ── Últimos movimientos ──
    const movimientosRecientes = [
        ...db.ingresos.map((r) => ({ ...r, tipo: "ingreso" })),
        ...db.gastos.map((r) => ({ ...r, tipo: "gasto" })),
    ]
        .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id)
        .slice(0, 8)
        .map((r) => ({
            id: `${r.tipo}-${r.id}`,
            fecha: r.fecha,
            descripcion: r.descripcion ?? "",
            categoria: db.categorias.find((c) => c.id === r.categoria_id)?.nombre ?? "Sin categoría",
            cantidad: round2(r.cantidad),
            tipo: r.tipo,
        }));

    return {
        periodo,
        rango: { inicio: rango.inicio, fin: rango.fin },
        vacio: movimientosRecientes.length === 0 && db.suscripciones.length === 0 && db.deudas.length === 0,
        kpis,
        mensual,
        balance6Meses,
        anual,
        categorias: {
            gastos: agruparCategorias(db, gastosPeriodo, 5),
            ingresos: agruparCategorias(db, ingresosPeriodo, 3),
        },
        suscripciones: suscripcionesResumen,
        deudas: deudasResumen,
        movimientos: movimientosRecientes,
    };
}

const dashboard = {
    obtener({ query }) {
        return ok(buildDashboard(getDB(), query.get("periodo")));
    },
};

// ── Tabla de rutas ──────────────────────────────────────────

function ruta(metodo, patron, handler) {
    const nombres = [];
    const regex = new RegExp(
        "^" + patron.replace(/:([a-zA-Z]+)/g, (_, nombre) => { nombres.push(nombre); return "([^/]+)"; }) + "/?$"
    );
    return { metodo, regex, nombres, handler };
}

const RUTAS = [
    ruta("GET", "/api/dashboard", dashboard.obtener),

    ruta("GET", "/api/ingresos", ingresos.listar),
    ruta("POST", "/api/ingresos", ingresos.crear),
    ruta("PUT", "/api/ingresos/:id", ingresos.modificar),
    ruta("DELETE", "/api/ingresos/:id", ingresos.eliminar),

    ruta("GET", "/api/gastos", gastos.listar),
    ruta("POST", "/api/gastos", gastos.crear),
    ruta("PUT", "/api/gastos/:id", gastos.modificar),
    ruta("DELETE", "/api/gastos/:id", gastos.eliminar),

    ruta("GET", "/api/categorias", categorias.listar),
    ruta("POST", "/api/categorias", categorias.crear),
    ruta("PUT", "/api/categorias/:id", categorias.modificar),
    ruta("DELETE", "/api/categorias/:id", categorias.eliminar),

    ruta("GET", "/api/resumen", resumen.obtener),

    ruta("POST", "/api/suscripciones", suscripciones.crear),
    ruta("GET", "/api/suscripciones/pagos", suscripciones.listarConPagos),
    ruta("POST", "/api/suscripciones/pagos", suscripciones.crearPago),
    ruta("PUT", "/api/suscripciones/pagos/:pagoId", suscripciones.modificarPago),
    ruta("DELETE", "/api/suscripciones/pagos/:pagoId", suscripciones.eliminarPago),
    ruta("PUT", "/api/suscripciones/:id", suscripciones.modificar),
    ruta("DELETE", "/api/suscripciones/:id", suscripciones.eliminar),

    ruta("GET", "/api/perfil", perfil.obtener),
    ruta("PUT", "/api/perfil/nombre", perfil.cambiarNombre),
    ruta("PUT", "/api/perfil/password", perfil.cambiarPassword),

    ruta("GET", "/api/deudas", deudas.listar),
    ruta("POST", "/api/deudas", deudas.crear),
    ruta("POST", "/api/deudas/pagos", deudas.crearPago),
    ruta("PUT", "/api/deudas/pagos/:pagoId", deudas.modificarPago),
    ruta("DELETE", "/api/deudas/pagos/:pagoId", deudas.eliminarPago),
    ruta("PUT", "/api/deudas/:id", deudas.modificar),
    ruta("DELETE", "/api/deudas/:id", deudas.eliminar),
];

// Punto de entrada: recibe método, ruta, query y cuerpo ya parseados.
export function handleApiRequest({ method, pathname, query = new URLSearchParams(), body = null }) {
    for (const r of RUTAS) {
        if (r.metodo !== method) continue;
        const match = pathname.match(r.regex);
        if (!match) continue;
        const params = {};
        r.nombres.forEach((nombre, i) => { params[nombre] = decodeURIComponent(match[i + 1]); });
        try {
            return r.handler({ params, query, body });
        } catch {
            return fail(500, "Error interno del servidor.");
        }
    }
    return fail(404, "Ruta no encontrada");
}
