# Arquitetura e evolução para produção

## Demonstração atual

Next.js App Router fornece layout e entrada. `Demo.tsx` coordena os perfis, central, recepção e mapa. `PublicSite`, `Guest`, `Housekeeping` e `Backoffice` têm linguagens de interface e estilos próprios. `domain.ts` concentra entidades, transições, permissões por função e validações; `store.ts` expõe snapshots React com useSyncExternalStore, gravação local e eventos entre abas. Dados iniciais são inteiramente fictícios.

As ações são comandos de domínio. Confirmar um pedido produz cobrança e movimento de estoque atomicamente no snapshot. Comandos encerrados/confirmados/estornados têm guardas contra repetição. Check-out revoga o token e impede consumo adicional no saldo pago. Conferência usa quantidade observada, compara lançamentos e gera revisão separada quando a hospedagem foi encerrada. Reservas e extensões verificam sobreposição. Manutenção aberta impede liberação.

## Produção para dez unidades

Migrar o contrato de ações para API NestJS com serviços por domínio: reservas, hospedagem, housekeeping, pedidos, inventário, financeiro, identidade e auditoria. Prisma/PostgreSQL armazena rede/unidade/suíte, intervalos de reserva, sessões, linhas de conta, tarefas, depósitos/lotes e movimentos, transações e eventos imutáveis. Toda entidade recebe tenantId e unitId; escopo aplicado em middleware e consultas, com RLS como defesa adicional.

Transações SQL garantem atomicidade. Exclusão de intervalos/locks por suíte impedem reservas concorrentes. Idempotency-Key único protege pagamentos, entregas e movimentos. Valores monetários em centavos/Decimal, datas UTC com fuso da unidade, ledger financeiro imutável, estornos como transações compensatórias. Estoque por depósito/unidade, transferências balanceadas e conferência de minibar por origem, substituindo o depósito agregado da demo.

Autenticação real usa provedor OIDC, MFA gerencial, sessões HttpOnly/Secure, expiração, RBAC com escopo de unidade, bloqueio de usuário e auditoria no servidor. Tokens de concierge aleatórios, com hash armazenado, limite de validade e acesso exclusivo à hospedagem. O estado/actor enviado pelo cliente nunca autoriza uma ação no servidor. Demonstração local não oferece essas garantias.

Redis fornece filas, locks auxiliares, limites de requisição e distribuição de eventos. Outbox transacional entrega notificações via WebSocket/SSE após commit. Integrações de adquirentes, PSP, fiscal e automação predial ficam atrás de adapters versionados com sandbox, autorização, observabilidade e reconciliação. Nada disso está conectado nesta entrega.

Camareiras podem evoluir para PWA com service worker, cache de ativos e fila de comandos com resolução de conflitos; React Native/Expo reutiliza contratos e regras, não componentes DOM. Reservas públicas poderão usar renderização servidor, imagens responsivas e CDN; serviços sensíveis permanecem autenticados no servidor.

## Qualidade e operação

Testes de domínio cobrem ciclo completo, conflitos, sessão temporária, idempotência, reconciliação pós-saída, transferência, snapshot de tarifa e manutenção. Produção exige testes E2E multiusuário, concorrência, acessibilidade, carga, backups/restauração, monitoramento, retenção e política LGPD, gestão de consentimento e segregação de dados. localStorage não substitui banco de dados ou autenticação e concorrência entre abas não é serialização distribuída.
