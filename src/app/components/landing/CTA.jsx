'use client';
import { ArrowRight, User } from "lucide-react";
import { useRouter } from "next/navigation";

const LINKEDIN_URL = "https://www.linkedin.com/in/jos%C3%A9-manuel-romero-php-java-python-mysql-react-html-css/";

export default function CTA() {
    const router = useRouter();
    return (
        <section className="py-20 px-6 bg-accent/30">
            <div className="max-w-4xl mx-auto text-center space-y-8">
                <h2 className="text-4xl md:text-5xl">
                    ¿Listo para transformar tus finanzas?
                </h2>

                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    Explora la demo con datos de ejemplo: no necesitas registrarte y todo funciona en tu navegador
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                    <button onClick={() => router.push("/dashboard")} className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 hover:cursor-pointer">
                        Probar la demo
                        <ArrowRight className="w-5 h-5" />
                    </button>

                    <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" className="px-8 py-3 border border-border rounded-lg hover:bg-accent transition-colors flex items-center justify-center gap-2 hover:cursor-pointer">
                        <User className="w-5 h-5" />
                        Contactar por LinkedIn
                    </a>
                </div>

                <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-muted-foreground">
                    <div className="text-center">
                        <div className="text-3xl mb-1 text-foreground">7</div>
                        <div>Secciones</div>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-border"></div>
                    <div className="text-center">
                        <div className="text-3xl mb-1 text-foreground">100%</div>
                        <div>Responsive</div>
                    </div>
                    <div className="hidden sm:block w-px h-12 bg-border"></div>
                    <div className="text-center">
                        <div className="text-3xl mb-1 text-foreground">Next.js 16</div>
                        <div>React y Tailwind</div>
                    </div>
                </div>
            </div>
        </section>
    );
}
