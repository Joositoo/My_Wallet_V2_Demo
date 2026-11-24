import { handleApiRequest } from "./handlers.js";

// Sustituye window.fetch para que las llamadas a /api/* se resuelvan en el navegador
// (sobre localStorage) en lugar de ir a un servidor. El resto de peticiones pasan
// al fetch original. Con un pequeño retardo para que la interfaz se comporte como
// con una API real (estados de carga, etc.).

const MARCA = "__mywalletDemoFetch";

function latencia() {
    return 60 + Math.floor(Math.random() * 100);
}

export function installDemoFetch() {
    if (typeof window === "undefined" || window[MARCA]) return;

    const originalFetch = window.fetch.bind(window);

    window.fetch = async function demoFetch(input, init = {}) {
        const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input?.url;
        let url;
        try {
            url = new URL(rawUrl, window.location.origin);
        } catch {
            return originalFetch(input, init);
        }

        const esApi = url.origin === window.location.origin && url.pathname.startsWith("/api/");
        if (!esApi) return originalFetch(input, init);

        const method = (init.method || (typeof input === "object" && input?.method) || "GET").toUpperCase();
        let body = null;
        if (init.body) {
            try {
                body = JSON.parse(init.body);
            } catch {
                body = null;
            }
        }

        await new Promise((resolve) => setTimeout(resolve, latencia()));

        const { status, body: respuesta } = handleApiRequest({
            method,
            pathname: url.pathname.replace(/\/+$/, "") || "/",
            query: url.searchParams,
            body,
        });

        return new Response(JSON.stringify(respuesta), {
            status,
            headers: { "Content-Type": "application/json" },
        });
    };

    window[MARCA] = true;
}
