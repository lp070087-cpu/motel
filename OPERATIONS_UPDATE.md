# MOTEL — continuação operacional

## Arquivos alterados

Domínio/persistência: lib/domain.ts, lib/store.ts. Recepção e escopo: components/Reception.tsx, components/Reception.css, components/Demo.tsx, components/Backoffice.tsx, components/Housekeeping.tsx, components/OperationalSuitePanel.tsx. Mapa: components/RoomMap3D.tsx, components/RoomMap3D.css, lib/architecture.ts. Site/localização: components/PublicSite.tsx, components/SuiteDetail.tsx, components/Guest.tsx, components/LocationSearch.tsx, components/DemoDirections.tsx, components/LocationSearch.css, lib/proximity.ts e lib/city-reference.ts. Fotografias/acabamento: lib/catalog.ts, app/globals.css, components/Refinements.css, PHOTO_INVENTORY.md e atualização de PHOTO_CREDITS.md. Testes: tests/operations.test.ts, tests/architecture.test.ts, tests/proximity.test.ts.

## Rede independente

Dez unidades demonstrativas em SP, RJ, MG, PR, RS, SC, DF, BA, PE e CE. Cada uma possui endereço fictício completo, coordenadas de simulação explicitamente identificadas, 25 suítes por padrão, tarifas, funcionários, inventário local, reservas, hospedagens, portaria e transações vinculados à unidade. A quantidade de suítes é configurável entre 1 e 60; reduzir nunca remove suítes com registros ou histórico.

Migração automática preserva dados anteriores, acrescenta suítes e equipes ausentes e distribui o saldo agregado anterior entre as unidades conservando o total. Novas movimentações usam saldos independentes. Proprietário pode navegar e consolidar; gerente, recepção e camareira escolhem unidade antes do acesso demonstrativo e ficam vinculados ao operador ativo dessa unidade. Ações validam perfil, operador e escopo. Estas regras continuam sendo uma simulação local, não autenticação de produção.

## Recepção e portaria

Nova entrada presencial seleciona suíte disponível, fotografia/categoria, 3 ou 6 horas ou pernoite, horário, identificação fictícia mínima, modalidade e tarifa. CHECK_IN cria hospedagem diretamente sem reserva artificial, impede simultaneidade, ativa contador/token e atualiza disponibilidade/indicadores/mapa.

Veículo próprio/moto usa placa validada nos padrões antigo e Mercosul, tipo/cor opcional. Entrada prévia do veículo é vinculada ao check-in sem duplicar registro. Uber, táxi, a pé e outra modalidade não exigem placa. UBER ENTROU cria somente evento de portaria; vínculo e check-in são separados. Saída do aplicativo é independente da saída do hóspede. O checkout encerra somente a entrada própria vinculada. Histórico tem unidade, suíte/hospedagem, horários e operador. Retenção configurável, com aplicação gerencial sobre registros encerrados; entradas abertas são preservadas. Política legal e execução automática no servidor são etapas de produção.

## Mapa

Perspectiva isométrica fixa: rotação e pan desativados; zoom suave, foco sem giro e restauração da visão geral. Todas as 25 suítes aparecem, respeitando configuração de até 60. Unidade tem arquitetura independente com componentes compartilhados, paredes cortadas, materiais, mobiliário, banho e hidromassagem nas categorias próprias, galerias e acesso. Maquete ilustrativa, não planta real.

LEDs derivados do estado: verde disponível, vermelho ocupado, amarelo para limpeza pendente/em limpeza/inspeção com substatus; azul reservado, laranja manutenção, cinza bloqueado. Sem piscar contínuo. Geometrias/materiais compartilhados, instâncias nas juntas de piso e renderização sob demanda reduzem custo. Fallback WebGL mantém a seleção acessível.

## Site e fotografias

Catálogo compacto com três/duas/uma colunas, fotos locais acima do texto, localização/UF, preço, comodidades e disponibilidade. Busca não bloqueante por CEP/logradouro/cidade; formato validado e cenário local convertido em coordenada fictícia reproduzível. Haversine ordena por distância geográfica em linha reta, sempre identificada como demonstrativa. Não há consulta real de CEP/endereço, geocodificação externa ou cálculo de trajetos. A localização do dispositivo só é solicitada após clique e autorização explícita; fica apenas na sessão. Como chegar abre uma orientação ilustrativa e permite abrir a cidade no mapa, sem simular rota a um endereço fictício nem transmitir a localização do visitante.

42 JPEGs inventariados em public/images e public/suite.jpg. 35 fotos do diretório e a imagem suite.jpg compõem a seleção principal. Nenhum original foi renomeado/apagado. Arquivos inadequados ou incompatíveis ficam preservados fora da seleção. Metadados/associações tipadas em lib/catalog.ts e PHOTO_INVENTORY.md. Fotografias pequenas limitam o detalhamento em ampliações; não foi inventada alta resolução.

## Testes e pendências

27 testes passaram, cobrindo arquitetura configurável, migração, saldo conservado, entrada com carro, placas, Uber sem hospedagem/cobrança, ciclo check-out/limpeza/liberação, escopo de ações entre unidades, retenção, localização/reserva, não duplicação de veículo, transferência somente dentro da unidade e existência das fotografias.

Testes de jornada aqui são de domínio e dados. Inspeção visual de desktop/celular e desempenho WebGL em aparelhos reais continuam pendentes; não foram declarados como executados. Integrações reais de autenticação, geocodificação, trajetos, banco, pagamentos e retenção no servidor permanecem fora da demonstração local. Não houve deploy/push.

## Visualizar

Na pasta C:\Users\55819\Desktop\Motel, execute npm run dev e abra http://localhost:3000. Entre como Recepção, selecione a unidade e use Nova entrada presencial / UBER ENTROU. Entre como Proprietário para consolidar ou autorizar inspeções. Site de reservas oferece localização demonstrativa e catálogo atualizado. npm test executa as verificações; npm run build compila a aplicação.

Referências de cidades verificadas e pontos fictícios deslocados descritos em GEOGRAPHY_SOURCES.md; coordenadas não representam imóveis reais. Referências e fontes permanecem empacotadas localmente, sem serviço externo em tempo de execução.

## Resultado final de compilação

Build de produção aprovado com checagem de tipos e geração estática. Primeiro carregamento JS da rota inicial: 195 kB; mapa continua carregado sob demanda. npm test: 27/27 aprovados. Os testes visuais/WebGL em navegador não foram executados.

HTTP da versão compilada: página inicial 200 e todas as 43 fotografias locais 200, sem falhas. Servidor temporário encerrado após a verificação. Os arquivos e dados permanecem disponíveis para npm run dev. Não houve deploy nem push.
