import { contextoGestao } from "@/lib/gestao/contexto";
import { brl, dataBR, hojeISO, somaDias } from "@/lib/gestao/format";
import { rotuloMovimento, saldosPorAlmoxarifado, sinalDoMovimento } from "@/lib/gestao/estoque";
import { BotaoLink, Cartao, EmAtivacao, Titulo, Vazio } from "../../ui";
import { carregarCadastros, carregarCentros, carregarLotes, carregarMaquinasAtivas, carregarMovimentos } from "../dados";
import { AbasEstoque, Aviso, qtdUn } from "../ui-estoque";
import { FormSaida, type SaldoOpcao } from "./FormSaida";

export const metadata = { title: "Saídas do estoque" };
export const dynamic = "force-dynamic";

export default async function SaidaPage() {
  const { supabase, clientId } = await contextoGestao();
  const hoje = hojeISO();
  const [cad, { lotes }, maquinas, centros, movs] = await Promise.all([
    carregarCadastros(supabase, clientId),
    carregarLotes(supabase, clientId),
    carregarMaquinasAtivas(supabase, clientId),
    carregarCentros(supabase, clientId),
    carregarMovimentos(supabase, clientId, { limite: 40, desde: somaDias(hoje, -60) }),
  ]);

  const cabecalho = (
    <>
      <Titulo
        titulo="Saídas"
        subtitulo="O que saiu do estoque e para onde: máquina, talhão, lote. O custo é o médio do almoxarifado."
        acao={<BotaoLink href="/gestao/maquinas#abastecer">Abastecer máquina</BotaoLink>}
      />
      <AbasEstoque ativo="saida" />
    </>
  );
  if (cad.ausente) return <>{cabecalho}<EmAtivacao modulo="Saídas do estoque" /></>;

  const nomeAlmox = new Map(cad.almoxarifados.map((a) => [a.id, a.nome]));
  const saldos: Record<string, SaldoOpcao[]> = {};
  for (const s of saldosPorAlmoxarifado(lotes)) {
    if (s.saldo <= 0) continue;
    (saldos[s.productId] ??= []).push({
      almoxId: s.almoxarifadoId,
      almoxNome: s.almoxarifadoId ? nomeAlmox.get(s.almoxarifadoId) ?? "Almoxarifado" : "Sem almoxarifado",
      saldo: s.saldo,
      custoMedio: s.custoMedio,
    });
  }
  const ativos = cad.produtos.filter((p) => p.ativo);
  // Produtos com saldo primeiro: é deles que sai.
  const produtos = [...ativos].sort((a, b) => Number(!!saldos[b.id]) - Number(!!saldos[a.id]) || a.nome.localeCompare(b.nome, "pt-BR"));
  const porProduto = new Map(cad.produtos.map((p) => [p.id, p]));
  const nomeMaq = new Map(maquinas.map((m) => [m.id, m.nome]));
  const nomeCentro = new Map(centros.map((c) => [c.id, c.nome]));
  const saidas = movs.movimentos.filter((m) => sinalDoMovimento({ destinoTipo: m.destino, movementType: m.tipo }) < 0).slice(0, 12);

  return (
    <>
      {cabecalho}
      <div className="grid gap-5 lg:grid-cols-5">
        <Cartao titulo="Registrar saída" className="lg:col-span-3">
          {ativos.length === 0 ? (
            <Vazio titulo="Nenhum produto ainda" texto="Os produtos nascem na entrada da nota ou no cadastro. Depois da primeira entrada, as saídas saem daqui." acao={<BotaoLink href="/gestao/estoque/entrada">Entrada de notas</BotaoLink>} />
          ) : (
            <FormSaida
              produtos={produtos.map((p) => ({ id: p.id, nome: p.nome, unidade: p.unidade }))}
              saldos={saldos}
              maquinas={maquinas}
              centros={centros}
              hoje={hoje}
            />
          )}
        </Cartao>

        <Cartao titulo="Últimas saídas" className="lg:col-span-2">
          {movs.falhou && <Aviso tom="alerta" className="mb-3">Não foi possível ler as saídas agora.</Aviso>}
          {saidas.length === 0 ? (
            <p className="text-[.88rem] text-[var(--text-muted)]">Nenhuma saída nos últimos 60 dias.</p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {saidas.map((m) => {
                const p = m.productId ? porProduto.get(m.productId) : undefined;
                const destino = [m.maquinaId ? nomeMaq.get(m.maquinaId) : null, m.centroId ? nomeCentro.get(m.centroId) : null].filter(Boolean).join(" · ");
                return (
                  <li key={m.id} className="py-2.5 first:pt-0 last:pb-0">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 text-[.88rem] font-semibold text-[var(--text-primary)] [overflow-wrap:anywhere]">{p?.nome ?? "Produto"}</p>
                      <p className="shrink-0 text-[.88rem] font-semibold tabular-nums">−{qtdUn(m.quantidade, p?.unidade)}</p>
                    </div>
                    <p className="text-[.76rem] text-[var(--text-muted)] [overflow-wrap:anywhere]">
                      {dataBR(m.data)} · {rotuloMovimento({ destinoTipo: m.destino, movementType: m.tipo })}
                      {destino ? ` · ${destino}` : ""}{m.custoTotal !== null ? ` · ${brl(m.custoTotal)}` : ""}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Cartao>
      </div>
    </>
  );
}
