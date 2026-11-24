'use client';
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// En la demo no hay inicio de sesión: se entra directamente al dashboard.
export default function Register() {
    const router = useRouter();

    useEffect(() => {
        router.replace("/dashboard");
    }, [router]);

    return (
        <div className="min-h-screen bg-background flex items-center justify-center">
            <p className="text-sm text-muted-foreground">Entrando en la demo...</p>
        </div>
    );
}
