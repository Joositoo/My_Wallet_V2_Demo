import { MESES_MIN, dateAt, monthIndexOf, toISODate } from "./dates.js";

// Genera los datos de ejemplo de la demo, siempre RELATIVOS a la fecha actual
// (últimos 12 meses), de modo que el dashboard y las gráficas tengan siempre vida.
// Nunca se generan movimientos con fecha futura.

export const SEED_VERSION = 1;

export function buildSeed(today = new Date()) {
    const hoy = toISODate(today);
    const db = {
        version: SEED_VERSION,
        seedMonth: hoy.slice(0, 7),
        usuario: { id: 1, nombre: "Usuario Demo", email: "demo@mywallet.dev" },
        categorias: [],
        ingresos: [],
        gastos: [],
        suscripciones: [],
        pagosSuscripcion: [],
        deudas: [],
        pagosDeuda: [],
        nextId: { categorias: 1, ingresos: 1, gastos: 1, suscripciones: 1, pagosSuscripcion: 1, deudas: 1, pagosDeuda: 1 },
    };

    const nextId = (tabla) => db.nextId[tabla]++;
    const noFuturo = (fecha) => fecha <= hoy;

    // ── Categorías ──
    const crearCategoria = (nombre, tipo, icono) => {
        const cat = { id: nextId("categorias"), usuario_id: 1, nombre, tipo, icono };
        db.categorias.push(cat);
        return cat.id;
    };
    const c = {
        comida: crearCategoria("Comida", "gasto", "Coffee"),
        transporte: crearCategoria("Transporte", "gasto", "Car"),
        vivienda: crearCategoria("Vivienda", "gasto", "Home"),
        ocio: crearCategoria("Ocio", "gasto", "ShoppingCart"),
        salud: crearCategoria("Salud", "gasto", "Heart"),
        suministros: crearCategoria("Suministros", "gasto", "Zap"),
        regalos: crearCategoria("Regalos", "gasto", "Gift"),
        salario: crearCategoria("Salario", "ingreso", "DollarSign"),
        freelance: crearCategoria("Freelance", "ingreso", "Briefcase"),
        otros: crearCategoria("Otros", "ingreso", "DollarSign"),
    };

    const ingreso = (categoria_id, cantidad, descripcion, fecha) => {
        if (!noFuturo(fecha)) return;
        db.ingresos.push({ id: nextId("ingresos"), usuario_id: 1, categoria_id, cantidad, descripcion, fecha });
    };
    const gasto = (categoria_id, cantidad, descripcion, fecha) => {
        if (!noFuturo(fecha)) return;
        db.gastos.push({ id: nextId("gastos"), usuario_id: 1, categoria_id, cantidad, descripcion, fecha });
    };
    const nombreMes = (fecha) => MESES_MIN[monthIndexOf(fecha)];

    // ── Ingresos y gastos: de hace 11 meses hasta el mes actual ──
    const freelanceImportes = [420, 650, 780, 540, 900, 610];
    const freelanceDescr = ["Diseño web cliente A", "Proyecto landing page", "Mantenimiento tienda online", "Consultoría puntual", "Desarrollo app interna", "Rediseño portfolio"];
    const freelanceDias = [15, 10, 18, 25, 12, 4];
    const comidaImportes = [86.4, 74.15, 91.6, 83.25, 78.9, 88.45, 95.2, 69.8, 102.35, 81.1, 87.6, 90.75];
    const comidaDescr = ["Compra Mercadona", "Supermercado Carrefour", "Frutería y panadería"];
    const luz = [62.4, 58.9, 49.75, 71.2, 66.3, 54.8];
    const gasolina = [55, 48.6, 61.2, 59.9, 52.4, 57.3];
    const ocio = [
        [65, "Cena con amigos"], [78.5, "Cena de aniversario"], [35, "Cine y palomitas"], [120, "Entradas de concierto"],
        [94.8, "Escapada de fin de semana"], [42.3, "Bolera con amigos"], [38.6, "Cena con amigos"],
    ];

    let iFreelance = 0;
    let iLuz = 0;
    let iGasolina = 0;
    let iOcio = 0;
    let iComida = 0;

    for (let k = 11; k >= 0; k--) {
        const f = (dia) => dateAt(today, k, dia);
        const mes = nombreMes(f(1));
        const mesNum = monthIndexOf(f(1));

        // Ingresos
        ingreso(c.salario, 2150, `Nómina ${mes}`, f(1));
        if (mesNum === 5) ingreso(c.salario, 1800, "Paga extra verano", f(20));
        if (mesNum === 11) ingreso(c.salario, 1800, "Paga extra Navidad", f(20));
        if (k % 2 === 0) {
            ingreso(c.freelance, freelanceImportes[iFreelance % 6], freelanceDescr[iFreelance % 6], f(freelanceDias[iFreelance % 6]));
            iFreelance++;
        }
        if (k === 8) ingreso(c.otros, 120, "Venta de segunda mano", f(8));
        if (k === 4) ingreso(c.otros, 250, "Devolución IRPF", f(2));
        if (k === 1) ingreso(c.otros, 60, "Bizum de amigos", f(14));

        // Gastos
        gasto(c.vivienda, 780, `Alquiler ${mes}`, f(3));
        gasto(c.comida, comidaImportes[iComida % 12], comidaDescr[iComida % 3], f(9));
        iComida++;
        if (k % 2 === 0) {
            gasto(c.comida, comidaImportes[iComida % 12], comidaDescr[iComida % 3], f(22));
            iComida++;
        }
        if (k % 2 === 1) {
            gasto(c.suministros, luz[iLuz % 6], "Factura de la luz", f(14));
            iLuz++;
        }
        if (k % 2 === 0) {
            gasto(c.transporte, gasolina[iGasolina % 6], "Gasolina", f(20));
            iGasolina++;
        }
        if (k % 2 === 1 || k === 0) {
            const [importe, descr] = ocio[iOcio % ocio.length];
            gasto(c.ocio, importe, descr, f(12 + (iOcio % 15)));
            iOcio++;
        }
        if (k === 9) gasto(c.salud, 45, "Dentista", f(19));
        if (k === 5) gasto(c.salud, 28.5, "Farmacia", f(5));
        if (k === 1) gasto(c.salud, 60, "Revisión de la vista", f(9));
        if (k === 11) gasto(c.regalos, 110, "Regalos de Navidad", f(23));
        if (k === 6) gasto(c.regalos, 55, "Regalo de cumpleaños", f(2));
        if (k === 2) gasto(c.regalos, 40, "Regalo de boda", f(26));
    }

    // ── Suscripciones y pagos de los últimos 6 meses ──
    const suscripciones = [
        { nombre: "Netflix", importe: 13.99, dia: 8, nota: "Plan estándar" },
        { nombre: "Spotify", importe: 10.99, dia: 10, nota: "Plan individual" },
        { nombre: "Gimnasio", importe: 32.9, dia: 1, nota: "Cuota mensual" },
        { nombre: "Adobe Creative Cloud", importe: 24.19, dia: 20, nota: "Plan anual pagado mensualmente" },
    ];
    for (const s of suscripciones) {
        const id = nextId("suscripciones");
        db.suscripciones.push({ id, usuario_id: 1, nombre: s.nombre });
        for (let k = 5; k >= 0; k--) {
            const fecha = dateAt(today, k, s.dia);
            if (!noFuturo(fecha)) continue;
            db.pagosSuscripcion.push({ id: nextId("pagosSuscripcion"), suscripcion_id: id, cantidad: s.importe, fecha, nota: s.nota });
        }
    }

    // ── Deudas (una activa, una retrasada y una liquidada) ──
    const crearDeuda = (nombre, precio_total, cuota_mensual, fecha_alta, fecha_fin, activa) => {
        const id = nextId("deudas");
        db.deudas.push({ id, usuario_id: 1, nombre, precio_total, cuota_mensual, fecha_alta, fecha_fin, activa });
        return id;
    };
    const pagoDeuda = (deuda_id, cantidad, fecha, tipo, nota) => {
        if (!noFuturo(fecha)) return;
        db.pagosDeuda.push({ id: nextId("pagosDeuda"), deuda_id, cantidad, fecha, tipo, nota });
    };

    // Préstamo del coche: cuotas al día -> "Activa"
    const coche = crearDeuda("Préstamo del coche", 14500, 285, dateAt(today, 7, 5), dateAt(today, -41, 5), true);
    for (let k = 7; k >= 0; k--) {
        const fecha = dateAt(today, k, 5);
        pagoDeuda(coche, 285, fecha, "cuota", `Cuota de ${nombreMes(fecha)}`);
        if (k === 6) pagoDeuda(coche, 1500, dateAt(today, k, 20), "extraordinario", "Amortización con la paga de ahorro");
    }

    // Reforma del estudio: última cuota hace 3 meses -> "Retrasada"
    const reforma = crearDeuda("Reforma del estudio", 6000, 250, dateAt(today, 10, 10), dateAt(today, -13, 10), true);
    pagoDeuda(reforma, 1500, dateAt(today, 10, 10), "extraordinario", "Entrada inicial");
    for (let k = 9; k >= 3; k--) {
        const fecha = dateAt(today, k, 10);
        pagoDeuda(reforma, 250, fecha, "cuota", `Cuota de ${nombreMes(fecha)}`);
    }

    // Portátil profesional: pagado por completo -> "Liquidada"
    const portatil = crearDeuda("Portátil profesional", 1800, 150, dateAt(today, 16, 10), dateAt(today, 5, 10), false);
    for (let k = 15; k >= 11; k--) {
        const fecha = dateAt(today, k, 10);
        pagoDeuda(portatil, 150, fecha, "cuota", `Cuota de ${nombreMes(fecha)}`);
    }
    pagoDeuda(portatil, 1050, dateAt(today, 10, 15), "extraordinario", "Liquidación anticipada");

    return db;
}
