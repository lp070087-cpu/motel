# Refinamento MOTEL — arquitetura 3D e direção editorial

## Implementado

- Maquete tridimensional procedural em React Three Fiber/Three.js/drei, carregada sob demanda. Duas alas com 12 suítes, paredes, portas, camas com enxoval, criados e iluminação, sofá/mesa, TV, plantas, banheiros com divisória, lavatório, espelho, vaso, chuveiro e banheira nas categorias com hidromassagem. Planta ilustrativa, sem vínculo com imóvel real.
- Rotação por arraste/toque, zoom com limites, aproximação suave nos botões, vista isométrica/superior, foco animado na suíte, retorno à visão geral sem perder seleção, status discretos e filtro que reduz a presença dos ambientes fora do resultado. Seleção por geometria, rótulo ou lista acessível.
- Carregamento dinâmico, resolução de renderização limitada a 1,5, sombras de 1024 px, renderização sob demanda e estado alternativo com lista operacional quando WebGL falha.
- Ficha operacional ao lado do mapa no desktop e gaveta inferior no celular. Identificação/fotografia/comodidades, operação, reserva, permanência, tarifa, horas extras, consumo por produto/quantidade/preço/subtotal/origem/horário, desconto e total, serviços e histórico.
- Check-in, confirmação de entrega, check-out, extensão/troca de suíte, pedido de preparação, atendimento de limpeza durante hospedagem, inspeção e manutenção usam exclusivamente os comandos de domínio e permissões existentes. Solicitar limpeza durante estadia não desocupa a suíte.
- Cards editoriais compactos: três colunas desktop, duas tablet e uma no celular estreito; imagens 3:2 acima de todos os textos. Fotos diferentes por unidade, descrição e comodidades, preço e exploração.
- Página completa da unidade e da suíte; galeria de três fotografias de referência, descrição por categoria/suíte, capacidade, comodidades, tarifa de período/pernoite/hora adicional, política e disponibilidade por intervalo. Reserva fixa no desktop e barra inferior no celular. Histórico e cancelamento preservados.
- Tipografia e controles de administração, recepção, camareiras, concierge, financeiro, estoque e manutenção revistos para melhorar leitura.

## Arquivos principais

Novos: components/RoomMap3D.tsx, components/RoomMap3D.css, components/OperationalSuitePanel.tsx, components/SuiteDetail.tsx, components/PublicRefinement.css, components/Refinements.css, lib/catalog.ts, public/editorial/*, PHOTO_CREDITS.md, tests/refinement.test.ts, next.config.ts.

Alterados: components/Demo.tsx, components/PublicSite.tsx, components/Guest.tsx, app/layout.tsx, app/globals.css, lib/domain.ts, package.json/package-lock.json e .gitignore.

## Dados e fotografias

Nenhuma limpeza de localStorage ou remoção de módulos. Registros antigos continuam legíveis; os novos passam a guardar origem/preço de pedidos, linhas de conferência, horas adicionais e desconto. Dados anteriores sem discriminação de horas/origem são identificados na ficha, sem inventar histórico.

Dez fotografias de quartos e três de banheiros em public/editorial, baixadas e comprimidas do CDN oficial Pexels, com créditos e licença em PHOTO_CREDITS.md. Fotografias ilustram atmosfera e não representam unidades reais do cliente nem ângulos de um mesmo imóvel. As imagens OIP existentes em public/images foram preservadas.

## Limitações e validação

15 testes de domínio/catálogo aprovados. Referências obrigatórias: apenas o texto foi recebido no anexo, sem os dois arquivos de imagem. Os caminhos foram solicitados; não foi possível confrontar a entrega com essas referências específicas.

A maquete é procedural e estilizada, não um projeto arquitetônico técnico ou modelo GLB de imóvel real. Inspeção visual de desktop/celular, operação da câmera e desempenho em GPU intermediária ainda precisam ser validados em navegador com WebGL. Nenhuma publicação ou push autorizado ou realizado. Integrações de produção continuam fora do escopo desta demonstração.

Build final aprovado com checagem de tipos e geração estática. Rota inicial: 184 kB de primeiro carregamento JS. Verificação detalhada em VERIFICATION.md.
