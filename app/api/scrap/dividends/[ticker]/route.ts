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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker: tickerParam } = await params;
  const ticker = tickerParam.toUpperCase();

  // Tenta primeiro como FII, depois como ação
  const urls = [
    {
      url: `https://fundamentus.com.br/fii_proventos.php?papel=${ticker}&tipo=2`,
      type: "fii",
    },
    {
      url: `https://fundamentus.com.br/proventos.php?papel=${ticker}&tipo=2`,
      type: "acao",
    },
  ];

  for (const { url, type } of urls) {
    try {
      const { data } = await api.get(url);
      const html = iconv.decode(data as Buffer, "iso-8859-1");
      const $ = cheerio.load(html);

      const dividends: any[] = [];

      $("#resultado tbody tr").each((i, element) => {
        const tds = $(element).find("td");

        if (tds.length >= 4) {
          if (type === "fii") {
            dividends.push({
              data_com: clean($(tds[0]).text()),
              tipo: clean($(tds[1]).text()),
              data_pagamento: clean($(tds[2]).text()),
              valor: clean($(tds[3]).text()),
            });
          } else {
            dividends.push({
              data_com: clean($(tds[0]).text()),
              valor: clean($(tds[1]).text()),
              tipo: clean($(tds[2]).text()),
              data_pagamento: clean($(tds[3]).text()),
            });
          }
        }
      });

      if (dividends.length > 0) {
        const valores = dividends
          .map((d) => parseFloat(d.valor?.replace(",", ".") || "0"))
          .filter((v) => !isNaN(v));

        const soma = valores.reduce((a, b) => a + b, 0);
        const media = valores.length > 0 ? soma / valores.length : 0;
        const ultimo = valores.length > 0 ? valores[0] : 0;

        return NextResponse.json({
          ticker,
          type: type === "fii" ? "FII" : "Ação",
          total_records: dividends.length,
          statistics: {
            soma_total: soma.toFixed(2),
            media: media.toFixed(4),
            ultimo_valor: ultimo.toFixed(2),
            ultimo_pagamento: dividends[0]?.data_pagamento,
          },
          dividends,
        });
      }
    } catch (error) {
      // Se for erro 403, tentar próxima URL ou usar Brapi
      if ((error as any)?.response?.status === 403) {
        console.log(
          `Fundamentus bloqueado (403) para ${type}, tentando próximo...`
        );
        continue;
      }
      continue;
    }
  }

  // Se chegou aqui, nenhuma fonte do Fundamentus funcionou
  // Tentar usar a Brapi como fallback
  console.log(`Usando Brapi como fallback para dividendos de ${ticker}`);

  try {
    const brapiData = await buscarAtivoCompleto(ticker);

    if (brapiData.fundamentalistas?.dividendYield) {
      return NextResponse.json({
        ticker,
        type: brapiData.tipo || "Ação",
        source: "brapi",
        total_records: 0,
        statistics: {
          dividend_yield:
            brapiData.fundamentalistas.dividendYield.toFixed(2) + "%",
          ultimo_valor: "N/A",
        },
        dividends: [],
        message:
          "Dados detalhados de dividendos não disponíveis via Brapi. Dividend Yield estimado.",
      });
    }
  } catch (brapiError) {
    console.error("Erro ao usar Brapi como fallback:", brapiError);
  }

  return NextResponse.json(
    {
      error: "Nenhum provento encontrado para este ticker",
      ticker,
    },
    { status: 404 }
  );
}
