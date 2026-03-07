import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";
import { buscarAtivoCompleto } from "@/lib/brapi";


const api = axios.create({
  responseType: "arraybuffer",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
});


const clean = (text: string | null | undefined): string | null =>
  text ? text.replace(/\n/g, "").trim() : null;


const getYahooQuote = async (ticker: string) => {
  try {
    const yahooTicker = `${ticker}.SA`;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooTicker}`;
    const response = await axios.get(url);

    const result = response.data?.chart?.result?.[0];
    if (result && result.meta && result.meta.regularMarketPrice) {
      return {
        price: result.meta.regularMarketPrice.toFixed(2),
        currency: result.meta.currency || "BRL",
        timestamp: result.meta.regularMarketTime,
        previousClose: result.meta.chartPreviousClose?.toFixed(2),
      };
    }
    return null;
  } catch (error) {
    return null;
  }
};


const extractDetails = ($: cheerio.CheerioAPI) => {
  const details: Record<string, string> = {};

  $("td.label").each((index, element) => {
    const labelCell = $(element);
    const dataCell = labelCell.next("td");

    const dataClass = dataCell.attr("class") || "";
    if (dataClass.includes("data")) {
      const label = clean(
        labelCell.find("span.txt").text() || labelCell.text()
      );
      const value = clean(dataCell.find("span.txt").text() || dataCell.text());

      if (label && value && value !== "-") {
        const key = label
          .toLowerCase()
          .replace(/\?/g, "")
          .replace(/\./g, "")
          .replace(/\
          .replace(/\s+/g, "_")
          .replace(/\(|\)/g, "");
        details[key] = value;
      }
    }
  });

  return details;
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: tickerParam } = await params;
  const ticker = tickerParam.toUpperCase();
  const url = `https://fundamentus.com.br/detalhes.php?papel=${ticker}`;

  try {
    const { data } = await api.get(url);
    const html = iconv.decode(data as Buffer, "iso-8859-1");
    const $ = cheerio.load(html);

    const details = extractDetails($);

    if (Object.keys(details).length === 0) {
      return NextResponse.json(
        { error: "Ativo não encontrado" },
        { status: 404 }
      );
    }

    const yahooQuote = await getYahooQuote(ticker);

    const isFII = details.fii !== undefined;

    
    const oscillations: Record<string, string> = {};
    $("td.label").each((i, el) => {
      const label = clean($(el).text());
      if (
        label &&
        [
          "Dia",
          "Mês",
          "30 dias",
          "12 meses",
          "2026",
          "2025",
          "2024",
          "2023",
          "2022",
          "2021",
        ].includes(label)
      ) {
        const value = clean($(el).next("td.data").text());
        if (value) {
          oscillations[label.toLowerCase().replace(/\s+/g, "_")] = value;
        }
      }
    });

    const response: any = {
      ticker,
      type: isFII ? "FII" : "Ação",
      oscillations,
    };

    if (isFII) {
      response.info = {
        fii: details.fii,
        nome: details.nome,
        mandato: details.mandato,
        segmento: details.segmento,
        gestao: details.gestao,
      };

      response.cotacao = {
        preco: yahooQuote?.price || details.cotacao,
        preco_yahoo: yahooQuote?.price,
        data_ult_cot: details.data_ult_cot,
        min_52_sem: details.min_52_sem,
        max_52_sem: details.max_52_sem,
        vol_$_med_2m: details.vol_$_med_2m,
      };

      response.valor = {
        valor_de_mercado: details.valor_de_mercado,
        nro_cotas: details.nro_cotas,
        relatorio: details.relatorio,
        ult_info_trimestral: details.ult_info_trimestral,
      };

      response.indicadores = {
        ffo_yield: details.ffo_yield,
        ffo_cota: details.ffo_cota,
        div_yield: details.div_yield,
        dividendo_cota: details.dividendo_cota,
        p_vp: details.p_vp,
        vp_cota: details.vp_cota,
      };

      response.resultado_12m = {
        receita: details.receita,
        venda_de_ativos: details.venda_de_ativos,
        ffo: details.ffo,
        rend_distribuido: details.rend_distribuido,
      };

      response.balanco = {
        ativos: details.ativos,
        patrim_liquido: details.patrim_liquido,
      };

      response.imoveis = {
        qtd_imoveis: details.qtd_imoveis,
        qtd_unidades: details.qtd_unidades,
        area_m2: details.area_m2,
        aluguel_m2: details.aluguel_m2,
        preco_do_m2: details.preco_do_m2,
        cap_rate: details.cap_rate,
        vacancia_media: details.vacancia_media,
        imoveis_pl_do_fii: details.imoveis_pl_do_fii,
      };
    } else {
      response.info = {
        tipo: details.tipo,
        empresa: details.empresa,
        setor: details.setor,
        subsetor: details.subsetor,
      };

      response.cotacao = {
        preco: yahooQuote?.price || details.cotacao,
        preco_yahoo: yahooQuote?.price,
        data_ult_cot: details.data_ult_cot,
        min_52_sem: details.min_52_sem,
        max_52_sem: details.max_52_sem,
        vol_$_med_2m: details.vol_$_med_2m,
      };

      response.valor = {
        valor_de_mercado: details.valor_de_mercado,
        valor_da_firma: details.valor_da_firma,
        ult_balanco_processado: details.ult_balanco_processado,
        nro_acoes: details.nro_acoes,
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
        giro_ativos: details.giro_ativos,
      };

      response.balanco = {
        ativo: details.ativo,
        disponibilidades: details.disponibilidades,
        ativo_circulante: details.ativo_circulante,
        div_bruta: details.div_bruta,
        div_liquida: details.div_liquida,
        patrim_liq: details.patrim_liq,
      };

      response.demonstrativos_12m = {
        receita_liquida: details.receita_liquida,
        ebit: details.ebit,
        lucro_liquido: details.lucro_liquido,
      };
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("Erro ao buscar dados:", error);

    
    if (error?.response?.status === 403 || error?.code === "ERR_BAD_REQUEST") {
      console.log(`Fundamentus bloqueado (403), usando Brapi para ${ticker}`);

      try {
        const brapiData = await buscarAtivoCompleto(ticker);

        if (!brapiData.cotacao) {
          return NextResponse.json(
            { error: "Ativo não encontrado" },
            { status: 404 }
          );
        }

        
        const isFII = ticker.endsWith("11");

        const response: any = {
          ticker,
          type: brapiData.tipo || (isFII ? "FII" : "Ação"),
          source: "brapi", 
          oscillations: {},
        };

        if (isFII) {
          response.info = {
            fii: ticker,
            nome: brapiData.nome || ticker,
            setor: brapiData.setor,
          };

          response.cotacao = {
            preco: brapiData.cotacao.preco.toFixed(2),
            preco_yahoo: brapiData.cotacao.preco.toFixed(2),
            abertura: brapiData.cotacao.abertura?.toFixed(2),
            min_52_sem: brapiData.cotacao.minima?.toFixed(2),
            max_52_sem: brapiData.cotacao.maxima?.toFixed(2),
          };

          response.indicadores = {
            div_yield:
              brapiData.fundamentalistas?.dividendYield?.toFixed(2) + "%",
            p_vp: brapiData.fundamentalistas?.pvp?.toFixed(2),
          };
        } else {
          response.info = {
            tipo: brapiData.tipo || "Ação",
            empresa: brapiData.nome || ticker,
            setor: brapiData.setor,
          };

          response.cotacao = {
            preco: brapiData.cotacao.preco.toFixed(2),
            preco_yahoo: brapiData.cotacao.preco.toFixed(2),
            abertura: brapiData.cotacao.abertura?.toFixed(2),
            min_52_sem: brapiData.cotacao.minima?.toFixed(2),
            max_52_sem: brapiData.cotacao.maxima?.toFixed(2),
            vol_$_med_2m: brapiData.cotacao.volume?.toString(),
          };

          response.indicadores = {
            p_l: brapiData.fundamentalistas?.pl?.toFixed(2),
            p_vp: brapiData.fundamentalistas?.pvp?.toFixed(2),
            div_yield:
              brapiData.fundamentalistas?.dividendYield?.toFixed(2) + "%",
            roe: brapiData.fundamentalistas?.roe?.toFixed(2) + "%",
            marg_liquida:
              brapiData.fundamentalistas?.margemLiquida?.toFixed(2) + "%",
            liquidez_corr:
              brapiData.fundamentalistas?.liquidezCorrente?.toFixed(2),
          };

          response.valor = {
            valor_de_mercado:
              brapiData.fundamentalistas?.valorMercado?.toLocaleString("pt-BR"),
          };
        }

        return NextResponse.json(response);
      } catch (brapiError) {
        console.error("Erro ao usar Brapi como fallback:", brapiError);
        return NextResponse.json(
          { error: "Erro ao buscar dados do ativo" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Erro ao buscar dados" },
      { status: 500 }
    );
  }
}
