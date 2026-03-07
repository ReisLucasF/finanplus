const fastify = require('fastify')({ logger: true });
const axios = require('axios');
const cheerio = require('cheerio');
const iconv = require('iconv-lite');


fastify.register(require('@fastify/cors'), {
    origin: '*', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
});



const api = axios.create({
    responseType: 'arraybuffer',
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
});


const clean = (text) => text ? text.replace(/\n/g, '').trim() : null;


const getYahooQuote = async (ticker) => {
    try {
        const yahooTicker = ticker.includes('11') ? `${ticker}.SA` : `${ticker}.SA`;
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}`;
        const response = await axios.get(url);

        const result = response.data?.chart?.result?.[0];
        if (result && result.meta && result.meta.regularMarketPrice) {
            return {
                price: result.meta.regularMarketPrice.toFixed(2),
                currency: result.meta.currency || 'BRL',
                timestamp: result.meta.regularMarketTime,
                previousClose: result.meta.chartPreviousClose?.toFixed(2)
            };
        }
        return null;
    } catch (error) {
        return null;
    }
};


const extractDetails = ($) => {
    const details = {};

    
    $('td.label').each((index, element) => {
        const labelCell = $(element);
        const dataCell = labelCell.next('td');

        
        const dataClass = dataCell.attr('class') || '';
        if (dataClass.includes('data')) {
            const label = clean(labelCell.find('span.txt').text() || labelCell.text());
            const value = clean(dataCell.find('span.txt').text() || dataCell.text());

            if (label && value && value !== '-') {
                const key = label.toLowerCase()
                    .replace(/\?/g, '')
                    .replace(/\./g, '')
                    .replace(/\
                    .replace(/\s+/g, '_')
                    .replace(/\(|\)/g, '');
                details[key] = value;
            }
        }
    });

    return details;
};


fastify.get('/api/quote/:ticker', async (request, reply) => {
    const { ticker } = request.params;
    const url = `https://fundamentus.com.br/detalhes.php?papel=${ticker.toUpperCase()}`;

    try {
        
        const { data } = await api.get(url);
        const html = iconv.decode(data, 'iso-8859-1');
        const $ = cheerio.load(html);

        
        const details = extractDetails($);

        
        if (Object.keys(details).length === 0) {
            return reply.code(404).send({ error: 'Ativo não encontrado' });
        }

        
        const yahooQuote = await getYahooQuote(ticker.toUpperCase());

        
        const isFII = details.fii !== undefined;

        
        const oscillations = {};
        $('td.label').each((i, el) => {
            const label = clean($(el).text());
            if (['Dia', 'Mês', '30 dias', '12 meses', '2026', '2025', '2024', '2023', '2022', '2021'].includes(label)) {
                oscillations[label.toLowerCase().replace(/\s+/g, '_')] = clean($(el).next('td.data').text());
            }
        });

        
        const response = {
            ticker: ticker.toUpperCase(),
            type: isFII ? 'FII' : 'Ação',
            oscillations
        };

        if (isFII) {
            
            response.info = {
                fii: details.fii,
                nome: details.nome,
                mandato: details.mandato,
                segmento: details.segmento,
                gestao: details.gestao
            };

            response.cotacao = {
                preco: yahooQuote?.price || details.cotacao,
                preco_yahoo: yahooQuote?.price,
                data_ult_cot: details.data_ult_cot,
                min_52_sem: details.min_52_sem,
                max_52_sem: details.max_52_sem,
                vol_$_med_2m: details.vol_$_med_2m
            };

            response.valor = {
                valor_de_mercado: details.valor_de_mercado,
                nro_cotas: details.nro_cotas,
                relatorio: details.relatorio,
                ult_info_trimestral: details.ult_info_trimestral
            };

            response.indicadores = {
                ffo_yield: details.ffo_yield,
                ffo_cota: details.ffo_cota,
                div_yield: details.div_yield,
                dividendo_cota: details.dividendo_cota,
                p_vp: details.p_vp,
                vp_cota: details.vp_cota
            };

            response.resultado_12m = {
                receita: details.receita,
                venda_de_ativos: details.venda_de_ativos,
                ffo: details.ffo,
                rend_distribuido: details.rend_distribuido
            };

            response.balanco = {
                ativos: details.ativos,
                patrim_liquido: details.patrim_liquido
            };

            response.imoveis = {
                qtd_imoveis: details.qtd_imoveis,
                qtd_unidades: details.qtd_unidades,
                area_m2: details.area_m2,
                aluguel_m2: details.aluguel_m2,
                preco_do_m2: details.preco_do_m2,
                cap_rate: details.cap_rate,
                vacancia_media: details.vacancia_media,
                imoveis_pl_do_fii: details.imoveis_pl_do_fii
            };
        } else {
            
            response.info = {
                tipo: details.tipo,
                empresa: details.empresa,
                setor: details.setor,
                subsetor: details.subsetor
            };

            response.cotacao = {
                preco: yahooQuote?.price || details.cotacao,
                preco_yahoo: yahooQuote?.price,
                data_ult_cot: details.data_ult_cot,
                min_52_sem: details.min_52_sem,
                max_52_sem: details.max_52_sem,
                vol_$_med_2m: details.vol_$_med_2m
            };

            response.valor = {
                valor_de_mercado: details.valor_de_mercado,
                valor_da_firma: details.valor_da_firma,
                ult_balanco_processado: details.ult_balanco_processado,
                nro_acoes: details.nro_acoes
            };

            response.indicadores = {
                p_l: details.p_l,
                lpa: details.lpa,
                p_vp: details.p_vp,
                vpa: details.vpa,
                p_ebit: details.p_ebit,
                marg_bruta: details.marg_bruta,
                psr: details.psr,
                marg_ebit: details.marg_ebit,
                p_ativos: details.p_ativos,
                marg_liquida: details.marg_liquida,
                p_cap_giro: details.p_cap_giro,
                ebit__ativo: details.ebit__ativo,
                p_ativ_circ_liq: details.p_ativ_circ_liq,
                roic: details.roic,
                div_yield: details.div_yield,
                roe: details.roe,
                ev__ebitda: details.ev__ebitda,
                liquidez_corr: details.liquidez_corr,
                ev__ebit: details.ev__ebit,
                div_br_patrim: details.div_br_patrim,
                cres_rec_5a: details.cres_rec_5a,
                giro_ativos: details.giro_ativos
            };

            response.balanco = {
                ativo: details.ativo,
                disponibilidades: details.disponibilidades,
                ativo_circulante: details.ativo_circulante,
                div_bruta: details.div_bruta,
                div_liquida: details.div_liquida,
                patrim_liq: details.patrim_liq
            };

            response.demonstrativos_12m = {
                receita_liquida: details.receita_liquida,
                ebit: details.ebit,
                lucro_liquido: details.lucro_liquido
            };
        }

        return response;

    } catch (error) {
        fastify.log.error(error);
        return reply.code(500).send({ error: 'Erro ao buscar dados' });
    }
});


fastify.get('/api/dividends/:ticker', async (request, reply) => {
    const { ticker } = request.params;

    
    const urls = [
        { url: `https://fundamentus.com.br/fii_proventos.php?papel=${ticker.toUpperCase()}&tipo=2`, type: 'fii' },
        { url: `https://fundamentus.com.br/proventos.php?papel=${ticker.toUpperCase()}&tipo=2`, type: 'acao' }
    ];

    for (const { url, type } of urls) {
        try {
            const { data } = await api.get(url);
            const html = iconv.decode(data, 'iso-8859-1');
            const $ = cheerio.load(html);

            const dividends = [];

            
            $('#resultado tbody tr').each((i, element) => {
                const tds = $(element).find('td');

                if (tds.length >= 4) {
                    
                    
                    if (type === 'fii') {
                        dividends.push({
                            data_com: clean($(tds[0]).text()),
                            tipo: clean($(tds[1]).text()),
                            data_pagamento: clean($(tds[2]).text()),
                            valor: clean($(tds[3]).text())
                        });
                    } else {
                        dividends.push({
                            data_com: clean($(tds[0]).text()),
                            valor: clean($(tds[1]).text()),
                            tipo: clean($(tds[2]).text()),
                            data_pagamento: clean($(tds[3]).text())
                        });
                    }
                }
            });

            
            if (dividends.length > 0) {
                
                const valores = dividends
                    .map(d => parseFloat(d.valor.replace(',', '.')))
                    .filter(v => !isNaN(v));

                const soma = valores.reduce((a, b) => a + b, 0);
                const media = valores.length > 0 ? soma / valores.length : 0;
                const ultimo = valores.length > 0 ? valores[0] : 0;

                return {
                    ticker: ticker.toUpperCase(),
                    type: type === 'fii' ? 'FII' : 'Ação',
                    total_records: dividends.length,
                    statistics: {
                        soma_total: soma.toFixed(2),
                        media: media.toFixed(4),
                        ultimo_valor: ultimo.toFixed(2),
                        ultimo_pagamento: dividends[0]?.data_pagamento
                    },
                    dividends
                };
            }

        } catch (error) {
            
            continue;
        }
    }

    
    return reply.code(404).send({
        error: 'Nenhum provento encontrado para este ticker',
        ticker: ticker.toUpperCase()
    });
});


fastify.get('/api/compare', async (request, reply) => {
    const { tickers } = request.query;

    if (!tickers) {
        return reply.code(400).send({ error: 'Parâmetro "tickers" é obrigatório. Exemplo: ?tickers=PETR4,VALE3,MXRF11' });
    }

    const tickerList = tickers.split(',').map(t => t.trim().toUpperCase());
    const results = [];

    for (const ticker of tickerList) {
        try {
            const url = `https://fundamentus.com.br/detalhes.php?papel=${ticker}`;
            const { data } = await api.get(url);
            const html = iconv.decode(data, 'iso-8859-1');
            const $ = cheerio.load(html);
            const details = extractDetails($);

            if (Object.keys(details).length > 0) {
                results.push({
                    ticker,
                    cotacao: details.cotacao,
                    p_l: details.p_l,
                    p_vp: details.p_vp,
                    div_yield: details.div_yield,
                    roe: details.roe,
                    valor_de_mercado: details.valor_de_mercado,
                    setor: details.setor
                });
            }
        } catch (error) {
            results.push({
                ticker,
                error: 'Não encontrado'
            });
        }
    }

    return {
        total: results.length,
        comparison: results
    };
});


const start = async () => {
    try {
        await fastify.listen({ port: 8001 });
        console.log(' API de Ações rodando em http://localhost:8001');
        console.log('\n Rotas disponíveis:');
        console.log(' GET /api/quote/:ticker - Dados completos de um ativo');
        console.log(' GET /api/dividends/:ticker - Histórico de dividendos');
        console.log(' GET /api/compare?tickers=... - Comparar múltiplos ativos');
        console.log('\n Exemplos:');
        console.log(' http://localhost:8001/api/quote/PETR4');
        console.log(' http://localhost:8001/api/dividends/MXRF11');
        console.log(' http://localhost:8001/api/compare?tickers=PETR4,VALE3,MXRF11');
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};
start();