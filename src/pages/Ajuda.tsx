import { useState } from "react";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Clock, Package, RefreshCw, Search, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

const sections = [
  { id: "fluxo", label: "Fluxo" },
  { id: "manutencao", label: "Manutenção" },
  { id: "status", label: "Status" },
  { id: "faq", label: "FAQ" },
  { id: "praticas", label: "Boas Práticas" },
];

export default function Ajuda() {
  const [activeSection, setActiveSection] = useState("fluxo");

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <Layout>
      <div className="space-y-ios-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-title-lg md:text-display-md">Central de Ajuda</h1>
          <p className="text-callout text-text-secondary">
            Guia completo sobre como usar a plataforma Rastreio_Flex
          </p>
        </div>

        {/* Navigation Menu */}
        <nav className="sticky top-16 z-30 liquid-glass rounded-ios-lg p-2">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {sections.map((section) => (
              <Button
                key={section.id}
                variant="ghost"
                size="sm"
                className={cn(
                  "rounded-ios-md ios-pressed whitespace-nowrap",
                  activeSection === section.id && "bg-primary/10 text-primary"
                )}
                onClick={() => scrollToSection(section.id)}
              >
                {section.label}
              </Button>
            ))}
          </div>
        </nav>

        {/* Fluxo de Uso */}
        <Card variant="ios" id="fluxo" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-title-sm flex items-center gap-2">
              🎯 Fluxo de Uso da Plataforma
            </CardTitle>
            <CardDescription className="text-callout text-text-secondary">
              Entenda como o Rastreio_Flex funciona no dia a dia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="space-y-ios-3">
              <div className="flex items-start gap-ios-3">
                <div className="rounded-ios-full bg-primary/10 p-2 mt-1">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-body font-semibold">1. Dashboard - Visão Geral</h3>
                  <p className="text-callout text-text-secondary">
                    Acompanhe métricas gerais: total de envios, entregues, em rota, não entregues e alertas ativos.
                    Use os botões de manutenção para atualizar dados.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-ios-3">
                <div className="rounded-ios-full bg-primary/10 p-2 mt-1">
                  <Truck className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-body font-semibold">2. Rastreamento de Envios - Gestão Completa</h3>
                  <p className="text-callout text-text-secondary">
                    Tela unificada com todos os envios. Use as abas para filtrar: Todos, Pendentes, Em Trânsito, 
                    Prontos, Entregues e Com Problemas. Busque por Pedido ML, Shipment ID, Cliente ou Rastreio.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-ios-3">
                <div className="rounded-ios-full bg-primary/10 p-2 mt-1">
                  <AlertCircle className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="text-body font-semibold">3. Alertas - Resolução de Problemas</h3>
                  <p className="text-callout text-text-secondary">
                    Monitore pacotes com problemas: não entregues, parados há mais de 48h, não devolvidos, etc.
                    Filtre por status e tipo. Marque como devolvido ou resolva diretamente.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manutenção do Sistema */}
        <Card variant="ios" id="manutencao" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-title-sm">⚙️ Manutenção do Sistema</CardTitle>
            <CardDescription className="text-callout text-text-secondary">
              Como e quando executar as funções de manutenção
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="space-y-ios-4">
              <div className="p-ios-4 rounded-ios-md border border-border-subtle space-y-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5 text-primary" />
                  <h3 className="text-body font-semibold">Atualizar Status (100 envios)</h3>
                </div>
                <p className="text-callout text-text-secondary">
                  <strong>O que faz:</strong> Consulta a API do Mercado Livre e atualiza o status de até 100 envios ativos.
                </p>
                <p className="text-callout text-text-secondary">
                  <strong>Quando usar:</strong> A cada 2-4 horas durante o horário comercial.
                </p>
                <Badge variant="outline" className="text-footnote rounded-ios-full">
                  ⏱️ Duração: ~2-5 minutos
                </Badge>
              </div>

              <div className="p-ios-4 rounded-ios-md border border-border-subtle space-y-2">
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  <h3 className="text-body font-semibold">Verificar Problemas</h3>
                </div>
                <p className="text-callout text-text-secondary">
                  <strong>O que faz:</strong> Analisa todos os envios e cria alertas para:
                  • Envios parados há mais de 48h
                  • Prontos mas não expedidos há mais de 24h
                  • Com motorista há mais de 72h sem devolução
                </p>
                <p className="text-callout text-text-secondary">
                  <strong>Quando usar:</strong> 1 vez por dia, de preferência no início do expediente.
                </p>
                <Badge variant="outline" className="text-footnote rounded-ios-full">
                  ⏱️ Duração: ~30 segundos
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status e Badges */}
        <Card variant="ios" id="status" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-title-sm">🏷️ Entendendo os Status</CardTitle>
            <CardDescription className="text-callout text-text-secondary">
              Significado de cada status e badge na plataforma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="space-y-ios-3">
              <div>
                <h3 className="text-body font-semibold mb-2">Status de Envio:</h3>
                <div className="grid grid-cols-2 gap-2 text-callout">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-ios-full">ready_to_ship</Badge>
                    <span className="text-text-secondary">Pronto para enviar</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-ios-full">shipped</Badge>
                    <span className="text-text-secondary">Enviado / Em rota</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success text-success-foreground rounded-ios-full">delivered</Badge>
                    <span className="text-text-secondary">Entregue</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive" className="rounded-ios-full">not_delivered</Badge>
                    <span className="text-text-secondary">Não entregue</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-body font-semibold mb-2">Badges de Tempo:</h3>
                <div className="space-y-2 text-callout">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-success/10 text-success border-success/20 rounded-ios-full">Verde</Badge>
                    <span className="text-text-secondary">Atualização recente (&lt; 6h)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-secondary/10 text-secondary border-secondary/20 rounded-ios-full">Laranja</Badge>
                    <span className="text-text-secondary">6-24h desde última atualização</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-danger/30 text-danger border-danger/40 rounded-ios-full">Vermelho Claro</Badge>
                    <span className="text-text-secondary">⚠️ 24-48h sem atualização</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-danger/50 text-danger-foreground border-danger rounded-ios-full">Vermelho Escuro</Badge>
                    <span className="text-text-secondary">🚨 Crítico: &gt;48h sem atualização</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card variant="ios" id="faq" className="scroll-mt-24">
          <CardHeader>
            <CardTitle className="text-title-sm">❓ Perguntas Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="space-y-ios-4">
              <div>
                <h3 className="text-body font-semibold">Por que não vejo o nome do motorista no Mercado Livre?</h3>
                <p className="text-callout text-text-secondary">
                  A API pública do Mercado Livre não expõe a identidade do motorista Flex. Nosso sistema vincula
                  pacotes a motoristas através dos manifestos de expedição criados na Bipagem.
                </p>
              </div>

              <div>
                <h3 className="text-body font-semibold">O que fazer quando um pacote está parado há dias?</h3>
                <p className="text-callout text-text-secondary">
                  1. Execute "Verificar Problemas" no Dashboard para criar alertas automaticamente<br />
                  2. Vá para a tela de Alertas<br />
                  3. Identifique o pacote e marque como "Devolvido" se necessário<br />
                  4. Entre em contato com o motorista se houver dúvidas
                </p>
              </div>

              <div>
                <h3 className="text-body font-semibold">Como localizar uma venda no Mercado Livre?</h3>
                <p className="text-callout text-text-secondary">
                  Clique no Pedido ML (na coluna da esquerda) para abrir diretamente a venda no painel do Mercado Livre.
                  O link abre em uma nova aba.
                </p>
              </div>

              <div>
                <h3 className="text-body font-semibold">A plataforma atualiza automaticamente?</h3>
                <p className="text-callout text-text-secondary">
                  A tela de Rastreamento recarrega os dados a cada 5 minutos automaticamente. Para atualizar dados
                  da API do ML, use o botão "Atualizar Status" no Dashboard (manual, conforme recomendação de frequência).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Boas Práticas */}
        <Card variant="ios" id="praticas" className="scroll-mt-24 border-primary/20">
          <CardHeader>
            <CardTitle className="text-title-sm flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-success" />
              💡 Boas Práticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-callout text-text-secondary">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                Execute "Atualizar Status" no início do dia, meio do dia e fim do expediente
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                Execute "Verificar Problemas" 1x por dia para criar alertas proativos
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                Priorize alertas com badges vermelhos (críticos)
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                Use os filtros de abas para focar em grupos específicos de envios
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-success mt-0.5 flex-shrink-0" />
                Marque alertas como resolvidos após tomar ação para manter a lista organizada
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
