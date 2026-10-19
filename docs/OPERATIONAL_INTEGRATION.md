# Integração operacional — 19/10/2026

## Funcionalidades
Cada card das camareiras possui duas ações: limpeza (com horário e checklist ampliado) e inspeção de consumo. O filtro de hospedagens ativas permite conferir contas ainda abertas. Inspeções são persistidas por unidade, suíte, hospedagem e funcionário, com itens do frigobar configurado e preços congelados no início.

Todos os produtos precisam ser conferidos. Consumido + restante deve corresponder ao previsto, exceto quando uma diferença física é explicitamente registrada e descrita. Diferenças sem consumo confirmado ficam visíveis para revisão, sem gerar cobrança automática. OK significa conferido sem consumo. Divergências precisam de observação. O sistema desconta pedidos confirmados, conciliações anteriores e revisões pendentes; reenviar a mesma inspeção não gera cobrança adicional. Pedidos ainda pendentes de confirmação na recepção precisam ser resolvidos antes do envio da inspeção, evitando dupla cobrança por entrega em andamento. Uma inspeção antiga não pode ser enviada depois de iniciado outro check-in na suíte.

Em hospedagem ativa, apenas o adicional é lançado. Em conta encerrada, diferenças geram revisão autorizada, sem alterar total pago. Recepção recebe resumo reativo e registra o recebimento; a liberação de limpeza continua dependendo da política e da autorização gerencial.

O QR da suíte contém apenas /suite/{roomId}, sem tokens ou dados pessoais. O hóspede escolhe cadastro ou acesso anônimo; em ambos os casos informa o código temporário da hospedagem vigente fornecido pela recepção. O código não pode ativar outra suíte e expira no checkout. Pedidos cobrados continuam dependendo de confirmação da recepção.

O guia interno é exclusivo de reservas online com check-in ativo. Usa o mesmo architectureLayout do mapa 3D e um grafo conectado de portaria, circulação lateral, galerias e portas. O algoritmo percorre acessos e corredores ortogonais. Não usa GPS nem representa planta real.

MOTEL Privilege oferece cadastro e entrada demonstrativos, sessão local de 12 horas, saldo, histórico, regras, benefícios e resgate simulado. Hospedagens precisam ser vinculadas antes do pagamento. A cada R$ 10 elegíveis pagos há 1 ponto por padrão. Regras podem ser alteradas pela gestão para novos pagamentos. Há registro idempotente por transação, inclusive quando o resultado é zero pontos, e reversão idempotente por estorno. Sem cadastro, não há crédito automático ou retroativo. Resgates não criam desconto nem obrigação financeira real.

## Sincronização e persistência
lib/store.ts continua sendo a fonte reativa compartilhada entre módulos. O adaptador em lib/services/demo-repository.ts salva localStorage e publica notificações por BroadcastChannel. Eventos storage funcionam como alternativa. Cada mensagem faz a outra aba ler a versão persistida mais recente, sem depender da ordem de mensagens antigas. Antes de um comando, o estado persistido é relido.

O mecanismo é local à mesma origem e navegador, sem backend e sem consistência transacional entre escritas simultâneas de abas. Um último escritor ainda pode prevalecer em uma corrida concorrente. Não há sincronização entre celulares, computadores ou domínios. Se o armazenamento estiver bloqueado, a sessão continua em memória, sem persistência garantida.

## Câmera e verificação visual
A configuração inicial da câmera agora possui referência estável e não redefine zoom=1 a cada renderização. O controlador define explicitamente o frustum ortográfico a partir da viewport, refaz o enquadramento no resize e mantém zoom e restauração sem rotação. A proporção do visualizador acompanha os limites projetados da arquitetura. A geometria não foi distorcida nem substituída.

Os testes matemáticos não representam aprovação visual. O navegador automatizado desta conversa teve acesso bloqueado pela política de URL. A inspeção do render desktop e a medição por pixels da área arquitetônica não foram executadas; permanecem pendentes. Não se declara o mapa visualmente aprovado sem essa inspeção.

## Preparação para produção
MotelRepository e OperationalGateway são portas para substituição por API e eventos. Não foram adicionadas dependências obrigatórias de serviços externos. Uma implementação PostgreSQL deve executar inspeção, lançamento, baixa e idempotência em transação; impor chaves únicas por inspeção/item, transação/pontuação e solicitação/resgate; verificar unidade, funcionário e atribuição no servidor.

Endpoints futuros: comandos autenticados de inspeção, confirmação de recepção, ativação de sessão por hospedagem, cadastro/autenticação, extrato e resgate. Eventos: inspection.submitted, consumption.posted, room.status.changed, stay.closed e privilege.changed. Nunca confiar em preços, identidade, saldo, hashes ou tokens definidos pelo cliente.

Cadastro atual usa código fictício com digest SHA-256 no navegador; isso NÃO é autenticação segura de produção. Dados, hashes e sessões estão no estado local inspecionável pelo usuário. Produção requer autenticação pelo servidor, hash de senha adequado com salt, cookies de sessão HttpOnly/Secure, proteção CSRF/rate limit, expiração/revogação, autorização por propriedade e armazenamento de tokens temporários apenas por hash. Nenhum token está no QR fixo. Sessões da hospedagem são renovadas a cada check-in e revogadas no checkout.

Não existe planta real validada. Garagem é indicação associada à suíte demonstrativa; sinalização real precisa de planta fornecida pelo estabelecimento.

## Arquivos desta etapa

- README.md
- components/Backoffice.tsx
- components/Guest.tsx
- components/Housekeeping.tsx
- components/OperationalSuitePanel.tsx
- components/Reception.tsx
- components/RoomMap3D.css
- components/RoomMap3D.tsx
- lib/domain.ts
- lib/housekeeping.ts
- lib/store.ts
- next-env.d.ts
- package-lock.json
- package.json
- tests/http-smoke.mjs
- app/suite/[roomId]/page.tsx
- components/ConsumptionInspection.tsx
- components/IndoorGuide.tsx
- components/InspectionInbox.tsx
- components/OperationalIntegration.css
- components/PrivilegePanel.tsx
- components/PrivilegeRules.tsx
- components/SuiteEntry.tsx
- components/SuiteQRCode.tsx
- docs/OPERATIONAL_INTEGRATION.md
- lib/indoor-guide.ts
- lib/operational-domain.ts
- lib/services/demo-repository.ts
- lib/services/guest-access.ts
- tests/operational-integration.test.ts
- tests/synchronization.test.ts

## Verificação automatizada

77 testes executados e aprovados, preservando os 60 anteriores. Cobertura de inspeção atômica, contabilização incremental, conta paga imutável, limpeza autorizada, grafo conectado, QR sem token, expiração no checkout, credenciais demonstrativas, pontos idempotentes, estornos, resgate, regras sem retroatividade, origem online verificada, diferenças físicas sem consumo presumido e sincronização reativa entre módulos/abas.

A dependência transitiva PostCSS foi fixada na versão compatível 8.5.31. A instalação final reportou zero vulnerabilidades, sem migração de versão principal do Next.js. A configuração distDir .next e as configurações Vercel existentes foram preservadas.

### Resultado final desta execução

- Testes: 77/77 aprovados, zero falhas.
- Build de produção: aprovado, incluindo a checagem de TypeScript.
- HTTP: / = 200; /suite/u1-r1 e /suite/u10-r25 = 200; /suite/not-a-room e rota inexistente = 404.
- Imagens: 56 arquivos públicos e 2 variantes otimizadas aprovados, zero falhas.
- Diff: 31 arquivos desta etapa; verificação de whitespace aprovada.
- Publicação: configuração local seleciona exclusivamente lp070087-cpu; identidade e permissão de escrita confirmadas pela API oficial do GitHub.
- Varredura dos arquivos preparados: sem candidatos a credenciais reais, arquivos privados, caminhos absolutos de execução ou arquivos maiores que 10 MB.
- Navegador: inspeção visual e medição de pixels do mapa pendentes por bloqueio de política de acesso, sem declaração de aprovação visual.
- Nenhum deploy manual ou alteração nas configurações da Vercel. O push autorizado pode iniciar o deploy automático existente.
