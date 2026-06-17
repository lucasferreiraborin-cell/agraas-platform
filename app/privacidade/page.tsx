import type { Metadata } from "next";
import PublicShell from "@/app/components/ui/PublicShell";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de Privacidade da Agraas Agritech — tratamento de dados conforme a Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018).",
};

export default function PrivacidadePage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-16 lg:py-24">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Documento institucional
          </p>
          <h1 className="ag-page-title mt-2">Política de Privacidade</h1>
          <p className="ag-section-subtitle mt-2">
            Última atualização: 17 de junho de 2026
          </p>
        </header>

        <section className="ag-card-strong space-y-8 p-8 text-[var(--text-secondary)]">
          <div className="space-y-3">
            <h2 className="ag-section-title">1. Controlador dos dados</h2>
            <p className="text-sm leading-7">
              A Agraas Agritech (&ldquo;Agraas&rdquo;) é a controladora dos dados
              pessoais tratados em sua plataforma, conforme o art. 5º, VI, da Lei
              Geral de Proteção de Dados (&ldquo;LGPD&rdquo;, Lei nº 13.709/2018).
              A administração é exercida pelos sócios da Agraas, com sede em São
              Paulo/SP. Dúvidas sobre o tratamento podem ser endereçadas ao
              encarregado pela proteção de dados pelo e-mail{" "}
              <a
                href="mailto:dpo@agraas.com.br"
                className="font-medium text-[var(--primary-hover)] underline"
              >
                dpo@agraas.com.br
              </a>
              .
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">2. Dados coletados</h2>
            <p className="text-sm leading-7">
              Coletamos apenas os dados necessários à prestação do serviço:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>
                <strong>Cadastro:</strong> nome, e-mail corporativo, CNPJ do
                produtor ou da pessoa jurídica, telefone de contato.
              </li>
              <li>
                <strong>Dados operacionais:</strong> animais, propriedades,
                lotes, eventos sanitários, pesagens, certificações, custos e
                vendas registrados pelo usuário.
              </li>
              <li>
                <strong>Cookies essenciais:</strong> identificadores de sessão e
                autenticação. Não utilizamos cookies de publicidade
                comportamental.
              </li>
              <li>
                <strong>Dados de uso:</strong> registros de acesso (logs) para
                segurança e auditoria, conforme art. 15 do Marco Civil da
                Internet.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">3. Finalidades do tratamento</h2>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>Prestação da plataforma de gestão pecuária contratada.</li>
              <li>
                Cálculo do Score Agraas e geração de passaportes auditáveis.
              </li>
              <li>
                Apoio ao compliance regulatório do usuário (PNIB, EUDR,
                exigências sanitárias e fiscais).
              </li>
              <li>Atendimento, comunicação institucional e suporte técnico.</li>
              <li>Cumprimento de obrigações legais e regulatórias.</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">4. Bases legais (LGPD)</h2>
            <p className="text-sm leading-7">
              O tratamento se ampara nas seguintes hipóteses previstas no art. 7º
              da LGPD:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>
                <strong>Execução de contrato</strong> (art. 7º, V) — quando o
                tratamento é necessário para entregar o serviço contratado.
              </li>
              <li>
                <strong>Consentimento</strong> (art. 7º, I) — para finalidades
                opcionais, como comunicações de marketing institucional.
              </li>
              <li>
                <strong>Legítimo interesse</strong> (art. 7º, IX) — para
                segurança da plataforma, prevenção a fraudes e melhoria do
                produto, sempre observados os direitos do titular.
              </li>
              <li>
                <strong>Obrigação legal ou regulatória</strong> (art. 7º, II) —
                para guarda de registros fiscais e atendimento a autoridades
                competentes.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">5. Compartilhamento com terceiros</h2>
            <p className="text-sm leading-7">
              A Agraas opera em arquitetura de nuvem e utiliza subprocessadores
              tecnológicos sob contratos de proteção de dados (DPA):
            </p>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>
                <strong>Supabase</strong> — banco de dados, autenticação e
                armazenamento.
              </li>
              <li>
                <strong>Vercel</strong> — hospedagem da aplicação web.
              </li>
              <li>
                <strong>Anthropic</strong> — modelos de linguagem para análises
                e recomendações automatizadas.
              </li>
              <li>
                <strong>Resend</strong> — envio de e-mails transacionais.
              </li>
              <li>
                <strong>Stripe</strong> — processamento de pagamentos.
              </li>
            </ul>
            <p className="text-sm leading-7">
              Não vendemos, alugamos ou cedemos dados pessoais a terceiros para
              finalidades de marketing. Eventuais compartilhamentos com
              compradores, frigoríficos ou parceiros só ocorrem mediante
              instrução explícita do titular dos dados ou de quem detém o poder
              decisório sobre a operação.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">6. Direitos do titular</h2>
            <p className="text-sm leading-7">
              Conforme o art. 18 da LGPD, o titular pode solicitar a qualquer
              tempo:
            </p>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>Confirmação da existência e acesso aos dados.</li>
              <li>Correção de dados incompletos, inexatos ou desatualizados.</li>
              <li>
                Anonimização, bloqueio ou eliminação de dados desnecessários.
              </li>
              <li>
                Portabilidade dos dados a outro fornecedor de serviço similar.
              </li>
              <li>Oposição a tratamento realizado com fundamento diverso do consentimento.</li>
              <li>
                Informações sobre uso compartilhado e revogação do consentimento.
              </li>
            </ul>
            <p className="text-sm leading-7">
              As solicitações devem ser feitas pelo e-mail{" "}
              <a
                href="mailto:dpo@agraas.com.br"
                className="font-medium text-[var(--primary-hover)] underline"
              >
                dpo@agraas.com.br
              </a>{" "}
              e respondidas no prazo legal de até 15 dias.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">7. Retenção e descarte</h2>
            <p className="text-sm leading-7">
              Dados operacionais são mantidos pelo tempo de vigência do
              contrato. Dados fiscais e contábeis são retidos por até cinco
              anos, conforme o Código Tributário Nacional. Após o término dos
              prazos, os dados são anonimizados ou eliminados em ambiente
              seguro, salvo obrigação legal de guarda superior.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">8. Segurança</h2>
            <p className="text-sm leading-7">
              Adotamos medidas técnicas e administrativas razoáveis para
              proteger os dados: criptografia em trânsito (TLS), controle de
              acesso baseado em papéis, Row Level Security (RLS) no banco de
              dados, registro de auditoria e revisão periódica de
              vulnerabilidades. Incidentes relevantes serão comunicados aos
              titulares e à Autoridade Nacional de Proteção de Dados (ANPD)
              conforme o art. 48 da LGPD.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">9. Alterações desta política</h2>
            <p className="text-sm leading-7">
              Esta política pode ser atualizada a qualquer momento para refletir
              mudanças legais, regulatórias ou de produto. A versão vigente está
              sempre disponível nesta página, com a data da última atualização
              em destaque no topo.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">10. Foro</h2>
            <p className="text-sm leading-7">
              Fica eleito o foro da comarca de São Paulo/SP para dirimir
              quaisquer controvérsias relativas a esta Política de Privacidade,
              com renúncia a qualquer outro, por mais privilegiado que seja.
            </p>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
