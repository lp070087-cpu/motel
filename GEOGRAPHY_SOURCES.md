# Referências geográficas

As cidades possuem referências geográficas verificadas no Wikidata em 18/10/2026. lib/city-reference.ts mantém as coordenadas dessas referências com suas fontes. Não são coordenadas de motéis. As unidades fictícias usam um pequeno deslocamento explícito de +0,005 grau em latitude/longitude a partir dessas referências, com coordinatesKind=demo. Endereços, CEPs e pontos da rede são demonstrativos; nenhum imóvel é identificado por essas coordenadas.

- [São Paulo](https://www.wikidata.org/wiki/Q174) — referência de cidade.
- [Rio de Janeiro](https://www.wikidata.org/wiki/Q8678) — referência de cidade.
- [Belo Horizonte](https://www.wikidata.org/wiki/Q42800) — referência de cidade.
- [Curitiba](https://www.wikidata.org/wiki/Q4361) — referência de cidade.
- [Porto Alegre](https://www.wikidata.org/wiki/Q40269) — referência de cidade.
- [Florianópolis](https://www.wikidata.org/wiki/Q132997) — referência de cidade.
- [Brasília](https://www.wikidata.org/wiki/Q2844) — referência de cidade.
- [Salvador](https://www.wikidata.org/wiki/Q36947) — referência de cidade.
- [Recife](https://www.wikidata.org/wiki/Q48344) — referência de cidade.
- [Fortaleza](https://www.wikidata.org/wiki/Q43463) — referência de cidade.

Essa distinção evita colocar, por exemplo, o cenário de Fortaleza na região de São Paulo ao usar a localização autorizada do dispositivo. A simulação de endereço escolhe a cidade, não faz consulta real a CEP/logradouro, e Haversine calcula somente distâncias em linha reta até os pontos fictícios. Não há serviço geocodificador/rotas real conectado.
