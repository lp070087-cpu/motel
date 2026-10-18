# MOTEL — demonstração integrada

Demonstração em Next.js App Router, React e TypeScript. Dez unidades fictícias, 250 suítes, cinco experiências por perfil. Não usa credenciais, pagamentos, mensagens ou emissão fiscal reais. A pasta conectada Motel é a raiz; no Windows a capitalização não cria uma aplicação diferente.

## Executar

```powershell
cd Motel
npm install
npm run dev
```

Acesse http://localhost:3000. Para validar: `npm run typecheck`, `npm test`, `npm run build`. Produção local: `npm run build` e `npm start`.

## Experimentar

1. Abra o site de reservas na tela inicial, escolha uma unidade e uma suíte, selecione data/período e confirme com nome/e-mail fictícios.
2. Volte à central e entre como recepção. Selecione a mesma unidade, abra sua reserva e realize check-in.
3. Abra os detalhes da suíte e copie o código temporário. No perfil Hóspede, use esse código. O atalho de demonstração abre a primeira hospedagem ativa.
4. Faça um pedido no concierge. Na recepção, confirme a entrega: consumo e estoque mudam uma única vez.
5. Revise a conta e registre o pagamento demonstrativo. A suíte passa a limpeza pendente e o acesso do hóspede é revogado.
6. Como camareira, selecione a unidade e a funcionária atribuída, inicie a limpeza, confira o consumo, complete os cinco itens e encaminhe à inspeção.
7. Como proprietário/gerente, aprove a inspeção no painel da suíte. A disponibilidade é restabelecida.

A conferência informa a quantidade total observada, não uma cobrança adicional. Pedidos já confirmados são abatidos. Diferenças após pagamento geram revisão gerencial separada; a conta encerrada não muda.

## Implementado

- Seleção dos cinco perfis; site público, filtros, detalhes/galeria conceitual, reserva, histórico por e-mail e cancelamento com prazo.
- Visão da rede/unidade, mapa ilustrativo, linha do tempo e distribuição executiva.
- Check-in, consumo, entrega, extensão, troca de suíte, desconto gerencial, pagamento, check-out, bloqueio e inspeção.
- Concierge com token temporário, pedidos, atendimento, resumo de conta e pedido de saída.
- Camareiras: atribuições, checklist, frigobar, reposição, ocorrência/manutenção e histórico.
- Financeiro, despesas, estornos, revisão; estoque/movimentos/alertas; manutenção; equipe/permissões; tarifas; relatórios CSV; políticas e auditoria.
- Persistência local e atualização entre abas pelo evento storage.

## Limites conscientes

Demonstração de um navegador, sem backend e sem autenticação de produção. Estoque possui saldos independentes por unidade; a migração distribui o agregado anterior conservando seu total. Depósitos, lotes e integração física permanecem evolução de produção. As áreas grandes usam dez fotografias locais distintas de quartos e referências de banheiros, descritas em PHOTO_CREDITS.md. As fotografias fornecidas em public/images e public/suite.jpg são preservadas nas galerias; por terem cerca de 220 px de altura, são exibidas sem ampliação artificial. As galerias são referências de atmosfera e não ângulos de um mesmo imóvel. Não há plantas reais. Dados de seed representam atividade fictícia; indicadores operacionais derivam do estado. Revisões aprovadas permanecem pendentes de cobrança separada, não entram automaticamente como receita. Sem modo offline PWA, aplicativo nativo, exportação fiscal, automação predial ou integrações externas.


## Referências consultadas

Processos: [Motel+](https://motelmais.com.br/sistema/), [MDE](https://www.mde.com.br/mde-motel-sistema-gerenciar-moteis-drive.html), [NUMOTEL](https://www.novauniaotecnologia.com.br/sistema.html). Estilos locais de La Belle e Closet Lunna examinados seletivamente, sem modificações nem cópia de identidades/dados.

## Refinamento visual e mapa 3D

Consulte [REFINEMENT.md](REFINEMENT.md) para recursos, arquivos e limitações. Mapa real procedural em React Three Fiber, controles de câmera, ficha operacional contextual, cards editoriais e páginas completas das suítes. Fotografias locais em public/editorial; créditos em PHOTO_CREDITS.md. Build de produção utiliza .next-production, separado da prévia .next.

## Atualização operacional atual

Consulte [OPERATIONS_UPDATE.md](OPERATIONS_UPDATE.md): 250 suítes, recepção presencial, portaria/Uber, estoque e permissões por unidade, mapa isométrico fixo com LEDs, localização demonstrativa e fotografias fornecidas em public/images. Inventário em PHOTO_INVENTORY.md.

## Importar na Vercel

Importe o repositório GitHub com o preset Next.js, diretório raiz do projeto, instalação `npm ci` e build `npm run build`. Não informe uma pasta de saída manualmente: o Next.js usa o distDir configurado (.next-production). Use Node.js 22. Nenhuma variável de ambiente é necessária para a demonstração. Os arquivos public/ são incluídos no repositório e as fotografias usam next/image; não há dependência de domínio externo de imagens.

A navegação entre experiências e módulos ocorre dentro da rota /. Não há backend compartilhado, autenticação de produção, cobrança real, Neon ou Redis. Dados persistem em localStorage e são compartilhados somente entre abas da mesma origem e perfil de navegador. Cada dispositivo e cada domínio tem sua própria demonstração; a publicação não sincroniza computadores.

## Finalização

Camareiras: cards compactos, filtros com contadores, cinco estados e proteção das tarefas atribuídas. Fotos: dimensões reais em lib/photo-metadata.json, carregamento responsivo e originais preservados. Consulte FINALIZATION.md para recursos validados e limites da verificação.
