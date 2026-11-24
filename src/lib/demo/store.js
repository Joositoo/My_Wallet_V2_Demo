import { SEED_VERSION, buildSeed } from "./seed.js";
import { toISODate } from "./dates.js";

// "Base de datos" de la demo: un objeto en memoria persistido en localStorage.
// Si localStorage no está disponible (modo privado, etc.) sigue funcionando en memoria.

const STORAGE_KEY = "mywallet-demo-db";

let cache = null;

function storage() {
    try {
        if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    } catch {
        // acceso denegado
    }
    return null;
}

function mesActual() {
    return toISODate(new Date()).slice(0, 7);
}

function leer() {
    const ls = storage();
    if (!ls) return null;
    try {
        const raw = ls.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

// Devuelve la base de datos de la demo. Si no existe, si es de otra versión o si es
// de un mes anterior, se regenera para que los datos de ejemplo sigan siendo "de este mes".
export function getDB() {
    if (cache && cache.seedMonth === mesActual()) return cache;

    const guardada = leer();
    if (guardada && guardada.version === SEED_VERSION && guardada.seedMonth === mesActual()) {
        cache = guardada;
    } else {
        cache = buildSeed(new Date());
        commit();
    }
    return cache;
}

// Persiste los cambios.
export function commit() {
    const ls = storage();
    if (!ls || !cache) return;
    try {
        ls.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch {
        // cuota llena o bloqueado: la demo sigue funcionando en memoria
    }
}

export function nextId(db, tabla) {
    return db.nextId[tabla]++;
}

// Restablece los datos de ejemplo originales.
export function resetDemo() {
    cache = buildSeed(new Date());
    commit();
}
