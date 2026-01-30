import Layout from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Package, 
  Check, 
  AlertCircle, 
  Info, 
  AlertTriangle,
  Truck,
  ArrowRight,
  Star,
  Zap
} from "lucide-react";

export default function DesignSystem() {
  return (
    <Layout>
      <div className="space-y-ios-8">
        {/* Header */}
        <div className="space-y-ios-2">
          <h1 className="text-display-lg">Design System</h1>
          <p className="text-callout text-text-secondary">
            Yellow iOS Style - Showcase de componentes
          </p>
        </div>

        {/* Typography Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Tipografia iOS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="space-y-ios-3">
              <p className="text-display-lg">Display Large (34px)</p>
              <p className="text-title-lg">Title Large (28px)</p>
              <p className="text-title-md">Title Medium (22px)</p>
              <p className="text-title-sm">Title Small (20px)</p>
              <p className="text-headline">Headline (17px semibold)</p>
              <p className="text-body">Body (17px regular)</p>
              <p className="text-callout text-text-secondary">Callout (16px)</p>
              <p className="text-subhead text-text-secondary">Subhead (15px)</p>
              <p className="text-caption-ios text-text-tertiary">Caption (13px)</p>
              <p className="text-footnote text-text-tertiary">Footnote (12px)</p>
            </div>
          </CardContent>
        </Card>

        {/* Colors Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Cores - iOS Yellow Style</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-6">
            {/* Brand Colors */}
            <div className="space-y-ios-3">
              <p className="text-headline">Brand</p>
              <div className="grid grid-cols-3 gap-ios-3">
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-brand" />
                  <p className="text-caption-ios text-text-tertiary">Primary #FFC800</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-brand-soft" />
                  <p className="text-caption-ios text-text-tertiary">Soft #3A3000</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-brand-strong" />
                  <p className="text-caption-ios text-text-tertiary">Strong #FFD60A</p>
                </div>
              </div>
            </div>

            {/* State Colors */}
            <div className="space-y-ios-3">
              <p className="text-headline">State Colors</p>
              <div className="grid grid-cols-4 gap-ios-3">
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-state-success" />
                  <p className="text-caption-ios text-text-tertiary">Success</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-state-warning" />
                  <p className="text-caption-ios text-text-tertiary">Warning</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-state-error" />
                  <p className="text-caption-ios text-text-tertiary">Error</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-state-info" />
                  <p className="text-caption-ios text-text-tertiary">Info</p>
                </div>
              </div>
            </div>

            {/* Surface Colors */}
            <div className="space-y-ios-3">
              <p className="text-headline">Surfaces</p>
              <div className="grid grid-cols-4 gap-ios-3">
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-surface-page border border-border-subtle" />
                  <p className="text-caption-ios text-text-tertiary">Page</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-surface-card border border-border-subtle" />
                  <p className="text-caption-ios text-text-tertiary">Card</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-surface-elevated border border-border-subtle" />
                  <p className="text-caption-ios text-text-tertiary">Elevated</p>
                </div>
                <div className="space-y-ios-2">
                  <div className="h-16 rounded-ios-md bg-surface-input border border-border-subtle" />
                  <p className="text-caption-ios text-text-tertiary">Input</p>
                </div>
              </div>
            </div>

            {/* Text Colors */}
            <div className="space-y-ios-3">
              <p className="text-headline">Text Colors</p>
              <div className="grid grid-cols-2 gap-ios-3">
                <div className="p-ios-3 rounded-ios-md bg-surface-elevated">
                  <p className="text-text-primary">Text Primary</p>
                  <p className="text-text-secondary">Text Secondary</p>
                  <p className="text-text-tertiary">Text Tertiary</p>
                  <p className="text-text-link">Text Link (Yellow)</p>
                </div>
                <div className="p-ios-3 rounded-ios-md bg-surface-elevated">
                  <p className="text-brand">Brand Text</p>
                  <p className="text-brand-strong">Brand Strong</p>
                  <p className="text-gold-gradient text-headline">Gold Gradient</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Buttons Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Botões</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-6">
            {/* iOS Primary Variants */}
            <div className="space-y-ios-3">
              <p className="text-headline">iOS Primary Variants</p>
              <div className="flex flex-wrap gap-ios-3">
                <Button variant="ios-primary" size="ios-default">
                  <Zap className="h-4 w-4 mr-2" />
                  iOS Primary
                </Button>
                <Button variant="ios-secondary" size="ios-default">
                  iOS Secondary
                </Button>
                <Button variant="ios-ghost" size="ios-default">
                  iOS Ghost
                </Button>
              </div>
            </div>

            {/* Standard Variants */}
            <div className="space-y-ios-3">
              <p className="text-headline">Standard Variants</p>
              <div className="flex flex-wrap gap-ios-3">
                <Button variant="default">Default</Button>
                <Button variant="gold">Gold</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link</Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </div>

            {/* Sizes */}
            <div className="space-y-ios-3">
              <p className="text-headline">Tamanhos</p>
              <div className="flex flex-wrap items-center gap-ios-3">
                <Button variant="ios-primary" size="sm">Small</Button>
                <Button variant="ios-primary" size="ios-default">iOS Default (44px)</Button>
                <Button variant="ios-primary" size="lg">Large</Button>
                <Button variant="ios-primary" size="icon">
                  <Star className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Pressed State Demo */}
            <div className="space-y-ios-3">
              <p className="text-headline">Pressed State (clique e segure)</p>
              <p className="text-caption-ios text-text-tertiary">
                Todos os botões iOS têm scale 0.98 no estado pressionado
              </p>
              <Button variant="ios-primary" size="ios-default" className="animate-pulse-gold">
                Botão com Glow
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Badges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="flex flex-wrap gap-ios-3">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="outline-gold">Outline Gold</Badge>
              <Badge variant="ios-success">
                <Check className="h-3 w-3 mr-1" />
                Success
              </Badge>
              <Badge variant="ios-warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Warning
              </Badge>
              <Badge variant="ios-info">
                <Info className="h-3 w-3 mr-1" />
                Info
              </Badge>
              <Badge variant="ios-error">
                <AlertCircle className="h-3 w-3 mr-1" />
                Error
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Default Alert</AlertTitle>
              <AlertDescription>
                Este é um alerta padrão com estilo iOS.
              </AlertDescription>
            </Alert>

            <Alert variant="success">
              <Check className="h-4 w-4" />
              <AlertTitle>Sucesso!</AlertTitle>
              <AlertDescription>
                Operação realizada com sucesso.
              </AlertDescription>
            </Alert>

            <Alert variant="warning">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Atenção</AlertTitle>
              <AlertDescription>
                Esta ação requer sua atenção.
              </AlertDescription>
            </Alert>

            <Alert variant="info">
              <Info className="h-4 w-4" />
              <AlertTitle>Informação</AlertTitle>
              <AlertDescription>
                Aqui está uma informação importante.
              </AlertDescription>
            </Alert>

            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>
                Algo deu errado. Tente novamente.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Cards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="grid gap-ios-4 md:grid-cols-3">
              {/* Default Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-headline">Card Padrão</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-callout text-text-secondary">
                    Card com estilo padrão do sistema.
                  </p>
                </CardContent>
              </Card>

              {/* Highlight Card */}
              <Card variant="highlight">
                <CardHeader>
                  <CardTitle className="text-headline">Card Highlight</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-callout text-text-secondary">
                    Card com fundo brand-soft dourado.
                  </p>
                </CardContent>
              </Card>

              {/* iOS Card */}
              <Card variant="ios">
                <CardHeader>
                  <CardTitle className="text-headline">Card iOS</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-callout text-text-secondary">
                    Card com sombra iOS elevada.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>

        {/* Inputs Section */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Inputs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="grid gap-ios-4 md:grid-cols-2">
              <div className="space-y-ios-2">
                <Label className="text-subhead">Input Padrão</Label>
                <Input placeholder="Digite algo..." />
              </div>
              <div className="space-y-ios-2">
                <Label className="text-subhead">Input Desabilitado</Label>
                <Input placeholder="Desabilitado" disabled />
              </div>
            </div>
            <p className="text-caption-ios text-text-tertiary">
              Inputs têm focus ring dourado e efeito shimmer ao focar (iOS style)
            </p>
          </CardContent>
        </Card>

        {/* iOS List Items */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">iOS List Items</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="ios-list-item ios-pressed cursor-pointer hover:bg-muted/50">
              <Package className="h-5 w-5 mr-ios-3 text-brand" />
              <span className="text-body flex-1">Item de Lista 1</span>
              <ArrowRight className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="ios-list-item ios-pressed cursor-pointer hover:bg-muted/50">
              <Truck className="h-5 w-5 mr-ios-3 text-brand" />
              <span className="text-body flex-1">Item de Lista 2</span>
              <Badge variant="outline-gold" className="mr-2">Novo</Badge>
              <ArrowRight className="h-4 w-4 text-text-tertiary" />
            </div>
            <div className="ios-list-item ios-list-item-selected ios-pressed cursor-pointer">
              <Check className="h-5 w-5 mr-ios-3 text-brand" />
              <span className="text-body flex-1">Item Selecionado</span>
              <ArrowRight className="h-4 w-4 text-text-tertiary" />
            </div>
          </CardContent>
        </Card>

        {/* Spacing & Radius */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Spacing iOS (Grid 4pt)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="flex flex-wrap items-end gap-ios-2">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <div key={n} className="text-center">
                  <div 
                    className="bg-brand rounded-ios-xs mb-ios-1" 
                    style={{ width: `${n * 4}px`, height: `${n * 4}px` }}
                  />
                  <p className="text-footnote text-text-tertiary">ios-{n}</p>
                </div>
              ))}
            </div>

            <div className="pt-ios-4 border-t border-border-subtle">
              <p className="text-headline mb-ios-3">Border Radius iOS</p>
              <div className="flex flex-wrap items-center gap-ios-4">
                <div className="bg-brand h-12 w-12 rounded-ios-none" />
                <div className="bg-brand h-12 w-12 rounded-ios-xs" />
                <div className="bg-brand h-12 w-12 rounded-ios-sm" />
                <div className="bg-brand h-12 w-12 rounded-ios-md" />
                <div className="bg-brand h-12 w-12 rounded-ios-lg" />
                <div className="bg-brand h-12 w-12 rounded-ios-full" />
              </div>
              <div className="flex flex-wrap gap-ios-4 mt-ios-2">
                <p className="text-footnote text-text-tertiary w-12 text-center">none</p>
                <p className="text-footnote text-text-tertiary w-12 text-center">xs</p>
                <p className="text-footnote text-text-tertiary w-12 text-center">sm</p>
                <p className="text-footnote text-text-tertiary w-12 text-center">md</p>
                <p className="text-footnote text-text-tertiary w-12 text-center">lg</p>
                <p className="text-footnote text-text-tertiary w-12 text-center">full</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Animations */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Animações & Transições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-ios-4">
            <div className="grid gap-ios-4 md:grid-cols-2">
              <div className="p-ios-4 rounded-ios-md bg-surface-elevated">
                <p className="text-headline mb-ios-2">Pulse Gold</p>
                <div className="h-16 w-16 bg-brand rounded-ios-md animate-pulse-gold" />
              </div>
              <div className="p-ios-4 rounded-ios-md bg-surface-elevated">
                <p className="text-headline mb-ios-2">Gold Glow</p>
                <div className="h-16 w-16 bg-brand rounded-ios-md gold-glow" />
              </div>
            </div>
            <p className="text-caption-ios text-text-tertiary">
              Transições usam ease-ios: cubic-bezier(0.25, 0.1, 0.25, 1) - padrão iOS
            </p>
          </CardContent>
        </Card>

        {/* Motion Durations */}
        <Card className="border-0 ios-card-shadow rounded-ios-lg">
          <CardHeader>
            <CardTitle className="text-title-md">Durações de Motion</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-ios-3 md:grid-cols-3">
              <div className="p-ios-4 rounded-ios-md bg-surface-elevated text-center">
                <p className="text-display-lg text-brand">150ms</p>
                <p className="text-subhead text-text-secondary">Fast</p>
                <p className="text-caption-ios text-text-tertiary">Micro-interações</p>
              </div>
              <div className="p-ios-4 rounded-ios-md bg-surface-elevated text-center">
                <p className="text-display-lg text-brand">200ms</p>
                <p className="text-subhead text-text-secondary">Default</p>
                <p className="text-caption-ios text-text-tertiary">Transições simples</p>
              </div>
              <div className="p-ios-4 rounded-ios-md bg-surface-elevated text-center">
                <p className="text-display-lg text-brand">300ms</p>
                <p className="text-subhead text-text-secondary">Slow</p>
                <p className="text-caption-ios text-text-tertiary">Modais e telas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
