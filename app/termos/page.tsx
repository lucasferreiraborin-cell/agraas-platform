import type { Metadata } from "next";
import Link from "next/link";
import PublicShell from "@/app/components/ui/PublicShell";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description:
    "Termos de Uso da plataforma Agraas Agritech — gestão pecuária, score auditável e rastreabilidade.",
};

export default function TermosPage() {
  return (
    <PublicShell>
      <main className="mx-auto max-w-3xl space-y-8 px-6 py-16 lg:py-24">
        <header>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-muted)]">
            Documento institucional
          </p>
          <h1 className="ag-page-title mt-2">Termos de Uso</h1>
          <p className="ag-section-subtitle mt-2">
            Última atualização: 17 de junho de 2026
          </p>
        </header>

        <section className="ag-card-strong space-y-8 p-8 text-[var(--text-secondary)]">
          <div className="space-y-3">
            <h2 className="ag-section-title">1. Objeto</h2>
            <p className="text-sm leading-7">
              Estes Termos regulam o uso da plataforma Agraas Agritech
              (&ldquo;Agraas&rdquo; ou &ldquo;Plataforma&rdquo;), que oferece
              gestão pecuária digital, cálculo de um score auditável de
              rebanho e rastreabilidade pré-embarque para produtores rurais,
              frigoríficos e demais elos da cadeia bovina.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">2. Cadastro e elegibilidade</h2>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>
                O cadastro é restrito a pessoas físicas maiores de 18 anos,
                plenamente capazes, ou a pessoas jurídicas regularmente
                constituídas, com CNPJ ativo na Receita Federal.
              </li>
              <li>
                O usuário se compromete a fornecer informações verdadeiras,
                completas e atualizadas, respondendo civil e criminalmente por
                eventuais inexatidões.
              </li>
              <li>
                As credenciais de acesso são pessoais e intransferíveis. O
                usuário é responsável pela guarda e pelas atividades realizadas
                em sua conta.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">3. Planos e pagamento</h2>
            <p className="text-sm leading-7">
              Os planos comerciais, suas funcionalidades e preços vigentes
              estão descritos em{" "}
              <Link
                href="/planos"
                className="font-medium text-[var(--primary-hover)] underline"
              >
                /planos
              </Link>
              . O processamento de pagamentos é realizado pela Stripe, sob
              padrões PCI-DSS, e o usuário declara aceitar os termos
              específicos do processador ao concluir a contratação. A Agraas
              pode reajustar preços mediante aviso prévio de 30 dias por
              e-mail.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">4. Uso permitido</h2>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>Gestão do rebanho, propriedades e operação do próprio usuário.</li>
              <li>
                Compartilhamento de informações via passaporte público dos
                animais, sempre por opt-in explícito do usuário responsável.
              </li>
              <li>
                Geração de relatórios e indicadores destinados a uso comercial,
                regulatório ou de auditoria interna.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">5. Uso proibido</h2>
            <ul className="ml-5 list-disc space-y-2 text-sm leading-7">
              <li>
                Realizar scraping, mineração massiva ou extração automatizada
                de dados sem autorização escrita.
              </li>
              <li>
                Praticar engenharia reversa, descompilação ou tentativa de
                acesso a código-fonte da Plataforma.
              </li>
              <li>
                Revender, sublicenciar ou disponibilizar a Plataforma a
                terceiros não autorizados.
              </li>
              <li>
                Transmitir malware, vírus, código malicioso ou conteúdo ilícito.
              </li>
              <li>
                Utilizar a Plataforma para fins fraudulentos, enganosos ou em
                violação à legislação aplicável.
              </li>
            </ul>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">6. Propriedade intelectual</h2>
            <p className="text-sm leading-7">
              A Agraas detém todos os direitos sobre o código-fonte, design,
              marca, materiais institucionais e demais elementos da
              Plataforma. O usuário mantém a titularidade integral de seus
              dados operacionais — animais, propriedades, eventos, pesagens e
              vendas — concedendo à Agraas licença limitada e não exclusiva
              para tratá-los exclusivamente na prestação dos serviços
              contratados.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">7. Score Agraas v3</h2>
            <p className="text-sm leading-7">
              O Score Agraas v3 é uma implementação técnica derivada da
              Plataforma +Precoce, com metodologia ancorada no Documento 237
              da Embrapa Gado de Corte (Costa et al., 2018). A Agraas atua
              como operadora tecnológica desta metodologia pública,{" "}
              <strong>não detendo titularidade científica</strong> sobre os
              pilares avaliativos. Resultados têm finalidade gerencial e
              comercial; não substituem laudos veterinários, fiscais ou
              certificações exigidas por mercados de exportação.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">8. Limitação de responsabilidade</h2>
            <p className="text-sm leading-7">
              A Plataforma é fornecida &ldquo;como está&rdquo; (
              <em>as-is</em>), sem garantias implícitas de adequação a propósito
              específico. A Agraas envida esforços razoáveis para manter a
              disponibilidade e a precisão das informações, mas não substitui
              auditoria contábil, parecer veterinário, certificação sanitária
              ou aconselhamento jurídico. Em nenhuma hipótese a Agraas
              responde por lucros cessantes, perda de dados decorrente de uso
              indevido ou danos indiretos.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">9. Encerramento</h2>
            <p className="text-sm leading-7">
              Qualquer das partes pode encerrar a relação mediante aviso prévio
              de 30 dias. Após o encerramento, o usuário pode solicitar a
              exportação de seus dados operacionais em formato CSV. Dados
              fiscais permanecerão retidos pelos prazos legais; os demais
              serão eliminados ou anonimizados conforme a Política de
              Privacidade.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">10. Modificações destes Termos</h2>
            <p className="text-sm leading-7">
              A Agraas pode atualizar estes Termos para refletir mudanças
              legais, regulatórias ou de produto. Alterações relevantes serão
              comunicadas por e-mail com antecedência mínima de 30 dias. O uso
              contínuo da Plataforma após esse prazo implica concordância com
              os novos termos.
            </p>
          </div>

          <div className="space-y-3">
            <h2 className="ag-section-title">11. Foro</h2>
            <p className="text-sm leading-7">
              Fica eleito o foro da comarca de São Paulo/SP, com renúncia a
              qualquer outro por mais privilegiado que seja, para dirimir
              quaisquer controvérsias decorrentes destes Termos.
            </p>
          </div>
        </section>
      </main>
    </PublicShell>
  );
}
