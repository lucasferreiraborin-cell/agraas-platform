/**
 * Layout standalone da persona Contador.
 *
 * Igual a /banco e /comprador: não injeta sidebar do produtor.
 * O shell visual (sidebar âmbar/navy, header com nome do escritório,
 * banner admin) é montado pelo PersonaShell dentro da própria page.
 */
export default function ContadorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
