# RASTREIO_FLEX

Sistema completo de rastreamento e gestão de entregas Mercado Envios Flex (ME1).

## 🚀 Tecnologias

- **Frontend**: React + TypeScript + Vite
- **Backend**: Lovable Cloud (Supabase)
- **UI**: Tailwind CSS + shadcn/ui
- **Autenticação**: Supabase Auth com roles (admin, ops, driver)
- **Banco de Dados**: PostgreSQL com Row Level Security (RLS)

## 📋 Funcionalidades Implementadas (v1)

### ✅ Autenticação & Autorização
- Login e cadastro de usuários
- Sistema de roles (admin, ops, driver)
- Proteção de rotas por autenticação
- RLS configurado para segurança dos dados

### ✅ Dashboard
- Visão geral de métricas:
  - Total de envios
  - Envios entregues
  - Envios em rota
  - Envios não entregues
  - Envios a devolver
- Cards com cores intuitivas (verde=sucesso, laranja=ação, vermelho=problema)

### ✅ Gestão de Envios
- Listagem completa de shipments
- Busca por ID ou código de rastreio
- Filtros por status (entregue, não entregue, em rota)
- Visualização de status e substatus
- Tabela responsiva com paginação

### ✅ Gestão de Motoristas
- Cadastro de motoristas (nome, telefone)
- Ativar/desativar motoristas
- Listagem com status visual
- Vinculação com usuários do sistema

### ✅ Design System
- Paleta profissional para logística:
  - Azul corporativo (confiança)
  - Laranja (urgência/ações)
  - Verde (sucesso/entregue)
  - Vermelho (problemas)
- Gradientes e sombras suaves
- Modo claro/escuro automático
- Componentes consistentes

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais
- `profiles`: Perfis de usuários
- `user_roles`: Roles dos usuários (admin, ops, driver)
- `drivers`: Cadastro de motoristas
- `orders`: Pedidos do Mercado Livre
- `shipments`: Envios/entregas
- `shipment_events`: Histórico de eventos dos envios
- `driver_loads`: Carregamentos dos motoristas
- `driver_load_items`: Itens de cada carregamento
- `delivery_attempts`: Tentativas de entrega
- `reconciliation`: Reconciliação diária

### Segurança (RLS)
- Todas as tabelas possuem políticas RLS
- Admins têm acesso total
- Ops têm acesso operacional
- Drivers veem apenas seus próprios dados

## 🔐 Variáveis de Ambiente

O Lovable Cloud gerencia automaticamente:
- `VITE_SUPABASE_URL`: URL do projeto Supabase
- `VITE_SUPABASE_ANON_KEY`: Chave pública
- `VITE_SUPABASE_PROJECT_ID`: ID do projeto

## 🎯 Próximas Etapas (Roadmap)

### Integrações Mercado Livre
- [ ] OAuth ML (escopos: read, write, offline_access)
- [ ] Webhooks ML (orders, packs, shipments)
- [ ] Backfill de pedidos/envios
- [ ] Notificações de status (delivered, not_delivered)

### PWA Motorista
- [ ] Scanner de etiquetas (QR/Code128)
- [ ] Captura de geolocalização
- [ ] Captura de fotos/assinaturas
- [ ] Modo offline com fila de sincronização
- [ ] Interface simplificada para uso em campo

### Funcionalidades Avançadas
- [ ] Sistema de reconciliação automática (job diário 20:00)
- [ ] Alertas de divergências
- [ ] Relatórios e exportação CSV
- [ ] Dashboard analítico avançado
- [ ] Integração com WhatsApp/Email para alertas

## 🚦 Como Usar

### 1. Primeiro Acesso
1. Acesse a aplicação
2. Clique em "Cadastro"
3. Crie sua conta (o email é confirmado automaticamente)
4. Faça login

### 2. Configurar Primeiro Admin
Para definir o primeiro usuário como admin, acesse o Lovable Cloud:
1. Vá em Cloud → Database → user_roles
2. Adicione um registro:
   - `user_id`: ID do seu usuário (copie de profiles)
   - `role`: admin

### 3. Adicionar Motoristas
1. Vá em "Motoristas"
2. Clique em "Adicionar Motorista"
3. Preencha nome e telefone
4. O motorista estará ativo automaticamente

### 4. Visualizar Dados
- **Dashboard**: Visão geral de métricas
- **Envios**: Lista e busca de entregas
- **Motoristas**: Gestão da equipe

## 📱 Acesso ao Backend

Para gerenciar dados, configurar roles ou visualizar logs:
- Acesse o Lovable Cloud pelo botão "Cloud" no editor
- Navegue pelas tabelas do banco de dados
- Configure autenticação e segredos conforme necessário

## 🔧 Desenvolvimento Local

```bash
# Clonar o repositório
git clone <YOUR_GIT_URL>

# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

## 📚 Documentação

- [Lovable Cloud](https://docs.lovable.dev/features/cloud)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Mercado Livre API](https://developers.mercadolibre.com.ar/)

## 🎨 Design

O sistema usa um design profissional focado em:
- **Clareza**: Informações importantes destacadas
- **Cores semânticas**: Verde=sucesso, Laranja=ação, Vermelho=problema
- **Responsividade**: Funciona em desktop, tablet e mobile
- **Acessibilidade**: Contraste adequado e navegação clara

## 🤝 Suporte

Para dúvidas sobre Lovable:
- [Documentação Oficial](https://docs.lovable.dev/)
- [Discord da Comunidade](https://discord.com/channels/1119885301872070706/1280461670979993613)

---

**Status**: ✅ v1 Completa - Pronto para expansão com integrações ML e PWA
