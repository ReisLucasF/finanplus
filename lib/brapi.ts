

import axios from "axios";

const BRAPI_BASE_URL = "https://brapi.dev/api";

export interface CotacaoAtivo {
  ticker: string;
  preco: number;
  variacao?: number;
  abertura?: number;
  maxima?: number;
  minima?: number;
  volume?: number;
  timestamp: Date;
}

export interface DadosFundamentais {
  pl?: number;
  pvp?: number;
  dividendYield?: number;
  roe?: number;
  margemLiquida?: number;
  liquidezCorrente?: number;
  dividaBruta?: number;
  patrimonioLiquido?: number;
  valorMercado?: number;
}

export interface AtivoEncontrado {
  ticker: string;
  nome: string;
  tipo: string;
  setor?: string;
}


export async function buscarCotacao(
  ticker: string
): Promise<CotacaoAtivo | null> {
  try {
    const tickerFormatado = ticker.toUpperCase();
    const response = await axios.get(
      `${BRAPI_BASE_URL}/quote/${tickerFormatado}`,
      {
        params: {
          fundamental: false,
        },
        timeout: 10000,
      }
    );

    const resultado = response.data?.results?.[0];

    if (!resultado) {
      console.error(`Nenhum resultado encontrado para ${ticker}`);
      return null;
    }

    return {
      ticker: tickerFormatado,
      preco: resultado.regularMarketPrice || 0,
      variacao: resultado.regularMarketChangePercent || 0,
      abertura: resultado.regularMarketOpen || resultado.regularMarketPrice,
      maxima: resultado.regularMarketDayHigh || resultado.regularMarketPrice,
      minima: resultado.regularMarketDayLow || resultado.regularMarketPrice,
      volume: resultado.regularMarketVolume || 0,
      timestamp: new Date(),
    };
  } catch (error: any) {
    console.error(`Erro ao buscar cotação para ${ticker}:`, error.message);
    return null;
  }
}


export async function buscarDadosFundamentais(
  ticker: string
): Promise<DadosFundamentais | null> {
  try {
    const tickerFormatado = ticker.toUpperCase();
    const response = await axios.get(
      `${BRAPI_BASE_URL}/quote/${tickerFormatado}`,
      {
        params: {
          fundamental: true,
          dividends: true,
        },
        timeout: 10000,
      }
    );

    const resultado = response.data?.results?.[0];

    if (!resultado) {
      console.error(`Nenhum resultado encontrado para ${ticker}`);
      return null;
    }

    
    const fundamentalData = resultado.summaryProfile || {};
    const financialData = resultado.financialData || {};
    const defaultKeyStatistics = resultado.defaultKeyStatistics || {};
    const summaryDetail = resultado.summaryDetail || {};

    
    let dividendYield = summaryDetail.dividendYield
      ? summaryDetail.dividendYield * 100
      : undefined;

    
    if (!dividendYield && resultado.dividendsData?.dividends?.length > 0) {
      const ultimoAno = resultado.dividendsData.dividends.filter((d: any) => {
        const dataDiv = new Date(d.date);
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
        return dataDiv >= umAnoAtras;
      });

      if (ultimoAno.length > 0 && resultado.regularMarketPrice) {
        const totalDividendos = ultimoAno.reduce(
          (sum: number, d: any) => sum + (d.amount || 0),
          0
        );
        dividendYield = (totalDividendos / resultado.regularMarketPrice) * 100;
      }
    }

    return {
      pl: defaultKeyStatistics.trailingPE || defaultKeyStatistics.forwardPE,
      pvp: defaultKeyStatistics.priceToBook,
      dividendYield,
      roe: financialData.returnOnEquity
        ? financialData.returnOnEquity * 100
        : undefined,
      margemLiquida: financialData.profitMargins
        ? financialData.profitMargins * 100
        : undefined,
      liquidezCorrente: financialData.currentRatio,
      dividaBruta: financialData.totalDebt,
      patrimonioLiquido: defaultKeyStatistics.bookValue
        ? defaultKeyStatistics.bookValue *
          (defaultKeyStatistics.sharesOutstanding || 1)
        : undefined,
      valorMercado: resultado.marketCap,
    };
  } catch (error: any) {
    console.error(
 `Erro ao buscar dados fundamentalistas para ${ticker}:`,
 error.message
 );
    return null;
  }
}


export async function buscarAtivos(termo: string): Promise<AtivoEncontrado[]> {
  try {
    
    const response = await axios.get(`${BRAPI_BASE_URL}/quote/list`, {
      params: {
        search: termo,
        limit: 20,
      },
      timeout: 10000,
    });

    const stocks = response.data?.stocks || [];

    
    const resultados = stocks.map((stock: any) => {
      const ticker = stock.stock || "";
      let tipo = "ACAO";

      
      if (ticker.endsWith("11")) {
        tipo = "FII";
      } else if (ticker.startsWith("BDR")) {
        tipo = "BDR";
      }

      return {
        ticker: ticker,
        nome: stock.name || ticker,
        tipo,
        setor: stock.sector,
      };
    });

    return resultados;
  } catch (error: any) {
    console.error("Erro ao buscar ativos:", error.message);

    
    try {
      const response = await axios.get(`${BRAPI_BASE_URL}/available`, {
        timeout: 10000,
      });

      const stocks = response.data?.stocks || [];

      
      const termoUpper = termo.toUpperCase();
      const resultados = stocks
        .filter((ticker: string) => ticker.toUpperCase().includes(termoUpper))
        .slice(0, 20)
        .map((ticker: string) => {
          let tipo = "ACAO";

          
          if (ticker.endsWith("11")) {
            tipo = "FII";
          } else if (ticker.startsWith("BDR")) {
            tipo = "BDR";
          }

          return {
            ticker: ticker,
            nome: ticker, 
            tipo,
          };
        });

      return resultados;
    } catch (fallbackError: any) {
      console.error("Erro no fallback:", fallbackError.message);
      return [];
    }
  }
}


export async function listarTickersDisponiveis(): Promise<string[]> {
  try {
    const response = await axios.get(`${BRAPI_BASE_URL}/available`, {
      timeout: 10000,
    });

    const stocks = response.data?.stocks || [];
    return stocks.map((stock: any) => stock.stock).filter(Boolean);
  } catch (error: any) {
    console.error("Erro ao listar tickers:", error.message);
    return [];
  }
}


export async function buscarCotacoesMultiplas(
  tickers: string[]
): Promise<Map<string, CotacaoAtivo>> {
  const resultado = new Map<string, CotacaoAtivo>();

  if (tickers.length === 0) return resultado;

  try {
    const tickersFormatados = tickers.map((t) => t.toUpperCase()).join(",");
    const response = await axios.get(
      `${BRAPI_BASE_URL}/quote/${tickersFormatados}`,
      {
        params: {
          fundamental: false,
        },
        timeout: 15000,
      }
    );

    const resultados = response.data?.results || [];

    resultados.forEach((r: any) => {
      if (r.symbol) {
        resultado.set(r.symbol, {
          ticker: r.symbol,
          preco: r.regularMarketPrice || 0,
          variacao: r.regularMarketChangePercent || 0,
          abertura: r.regularMarketOpen || r.regularMarketPrice,
          maxima: r.regularMarketDayHigh || r.regularMarketPrice,
          minima: r.regularMarketDayLow || r.regularMarketPrice,
          volume: r.regularMarketVolume || 0,
          timestamp: new Date(),
        });
      }
    });
  } catch (error: any) {
    console.error("Erro ao buscar cotações múltiplas:", error.message);
  }

  return resultado;
}


export async function buscarHistoricoPrecos(
  ticker: string,
  range:
    | "1d"
    | "5d"
    | "1mo"
    | "3mo"
    | "6mo"
    | "1y"
    | "2y"
    | "5y"
    | "10y"
    | "ytd"
    | "max" = "1y",
  interval: "1d" | "1wk" | "1mo" = "1d"
): Promise<
  Array<{
    data: Date;
    preco: number;
    abertura?: number;
    maxima?: number;
    minima?: number;
    volume?: number;
  }>
> {
  try {
    const tickerFormatado = ticker.toUpperCase();
    const response = await axios.get(
      `${BRAPI_BASE_URL}/quote/${tickerFormatado}`,
      {
        params: {
          range,
          interval,
          fundamental: false,
        },
        timeout: 15000,
      }
    );

    const resultado = response.data?.results?.[0];

    if (!resultado || !resultado.historicalDataPrice) {
      return [];
    }

    return resultado.historicalDataPrice.map((item: any) => ({
      data: new Date(item.date * 1000), 
      preco: item.close,
      abertura: item.open,
      maxima: item.high,
      minima: item.low,
      volume: item.volume,
    }));
  } catch (error: any) {
    console.error(`Erro ao buscar histórico para ${ticker}:`, error.message);
    return [];
  }
}


export async function buscarAtivoCompleto(ticker: string): Promise<{
  cotacao: CotacaoAtivo | null;
  fundamentalistas: DadosFundamentais | null;
  nome?: string;
  setor?: string;
  tipo?: string;
}> {
  try {
    const tickerFormatado = ticker.toUpperCase();
    const response = await axios.get(
      `${BRAPI_BASE_URL}/quote/${tickerFormatado}`,
      {
        params: {
          fundamental: true,
          dividends: true,
        },
        timeout: 15000,
      }
    );

    const resultado = response.data?.results?.[0];

    if (!resultado) {
      return {
        cotacao: null,
        fundamentalistas: null,
      };
    }

    
    const cotacao: CotacaoAtivo = {
      ticker: tickerFormatado,
      preco: resultado.regularMarketPrice || 0,
      variacao: resultado.regularMarketChangePercent || 0,
      abertura: resultado.regularMarketOpen || resultado.regularMarketPrice,
      maxima: resultado.regularMarketDayHigh || resultado.regularMarketPrice,
      minima: resultado.regularMarketDayLow || resultado.regularMarketPrice,
      volume: resultado.regularMarketVolume || 0,
      timestamp: new Date(),
    };

    
    const financialData = resultado.financialData || {};
    const defaultKeyStatistics = resultado.defaultKeyStatistics || {};
    const summaryDetail = resultado.summaryDetail || {};

    let dividendYield = summaryDetail.dividendYield
      ? summaryDetail.dividendYield * 100
      : undefined;

    if (!dividendYield && resultado.dividendsData?.dividends?.length > 0) {
      const ultimoAno = resultado.dividendsData.dividends.filter((d: any) => {
        const dataDiv = new Date(d.date);
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
        return dataDiv >= umAnoAtras;
      });

      if (ultimoAno.length > 0 && resultado.regularMarketPrice) {
        const totalDividendos = ultimoAno.reduce(
          (sum: number, d: any) => sum + (d.amount || 0),
          0
        );
        dividendYield = (totalDividendos / resultado.regularMarketPrice) * 100;
      }
    }

    const fundamentalistas: DadosFundamentais = {
      pl: defaultKeyStatistics.trailingPE || defaultKeyStatistics.forwardPE,
      pvp: defaultKeyStatistics.priceToBook,
      dividendYield,
      roe: financialData.returnOnEquity
        ? financialData.returnOnEquity * 100
        : undefined,
      margemLiquida: financialData.profitMargins
        ? financialData.profitMargins * 100
        : undefined,
      liquidezCorrente: financialData.currentRatio,
      dividaBruta: financialData.totalDebt,
      patrimonioLiquido: defaultKeyStatistics.bookValue
        ? defaultKeyStatistics.bookValue *
          (defaultKeyStatistics.sharesOutstanding || 1)
        : undefined,
      valorMercado: resultado.marketCap,
    };

    
    let tipo = "ACAO";
    if (tickerFormatado.endsWith("11")) {
      tipo = "FII";
    } else if (tickerFormatado.startsWith("BDR")) {
      tipo = "BDR";
    }

    return {
      cotacao,
      fundamentalistas,
      nome: resultado.longName || resultado.shortName || tickerFormatado,
      setor: resultado.sector,
      tipo,
    };
  } catch (error: any) {
    console.error(`Erro ao buscar ativo completo ${ticker}:`, error.message);
    return {
      cotacao: null,
      fundamentalistas: null,
    };
  }
}
