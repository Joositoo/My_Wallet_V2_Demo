'use client';
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Code, RotateCcw, X } from "lucide-react";
import { installDemoFetch } from "@/lib/demo/fetchShim";
import { resetDemo } from "@/lib/demo/store";

const REPO_URL = "https://github.com/Joositoo/My_Wallet_V2";

// Instala la API simulada antes de que ninguna página haga su primera petición
// (se ejecuta al cargar el módulo en el navegador) y muestra un aviso discreto
// de que se trata de una demo.
installDemoFetch();

export default function DemoBootstrap() {
    const pathname = usePathname();
    const [hidden, setHidden] = useState(false);

    // La landing no necesita el aviso
    if (hidden || pathname === "/" || pathname === "") return null;

    function handleReset() {
        if (window.confirm("¿Restablecer los datos de ejemplo? Se perderán los cambios que hayas hecho.")) {
            resetDemo();
            window.location.reload();
        }
    }

    return (
        <div className="fixed bottom-4 right-4 z-60 flex max-w-[calc(100vw-2rem)] items-center gap-3 rounded-full border border-border bg-card/95 py-2 pl-4 pr-2 text-xs shadow-xl backdrop-blur">
            <span className="text-muted-foreground">
                <span className="font-medium text-foreground">Demo</span>
                <span className="hidden sm:inline"> · datos de ejemplo guardados solo en tu navegador</span>
            </span>
            <button
                onClick={handleReset}
                title="Restablecer datos de ejemplo"
                aria-label="Restablecer datos de ejemplo"
                className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
                <RotateCcw size={14} />
            </button>
            <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver el código en GitHub"
                aria-label="Ver el código en GitHub"
                className="grid size-7 place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
                <Code size={14} />
            </a>
            <button
                onClick={() => setHidden(true)}
                title="Ocultar aviso"
                aria-label="Ocultar aviso"
                className="grid size-7 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-white/10 hover:text-foreground"
            >
                <X size={14} />
            </button>
        </div>
    );
}
