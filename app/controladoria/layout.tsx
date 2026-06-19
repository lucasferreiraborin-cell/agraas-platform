import ControladoriaSidebarNav from "@/app/components/ControladoriaSidebarNav";

/**
 * Layout do módulo Controladoria (Contábil + Fiscal + Estoque).
 *
 * Pivot 19/06/2026: wedge primário Agraas. Renderiza um sub-rail à esquerda
 * dentro da área já autenticada do produtor (que mantém o sidebar global +
 * header). Padrão de "section nav" — sem competir visualmente com o sidebar
 * principal, mas dando contexto claro ao usuário do escopo do módulo.
 */
export default function ControladoriaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="lg:sticky lg:top-28 lg:self-start">
        <div className="ag-card p-3">
          <ControladoriaSidebarNav />
        </div>
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
