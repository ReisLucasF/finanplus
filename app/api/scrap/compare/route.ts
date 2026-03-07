import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import * as cheerio from "cheerio";
import iconv from "iconv-lite";

const api = axios.create({
  responseType: "arraybuffer",
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
  },
});

const clean = (text: string | null | undefined): string | null =>
  text ? text.replace(/\n/g, "").trim() : null;

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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const tickers = searchParams.get("tickers");

  if (!tickers) {
    return NextResponse.json(
      {
        error:
          'Parâmetro "tickers" é obrigatório. Exemplo: ?tickers=PETR4,VALE3,MXRF11',
      },
      { status: 400 }
    );
  }

  const tickerList = tickers.split(",").map((t) => t.trim().toUpperCase());
  const results: any[] = [];

  for (const ticker of tickerList) {
    try {
      const url = `https://fundamentus.com.br/detalhes.php?papel=${ticker}`;
      const { data } = await api.get(url);
      const html = iconv.decode(data as Buffer, "iso-8859-1");
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
          setor: details.setor,
        });
      }
    } catch (error) {
      results.push({
        ticker,
        error: "Não encontrado",
      });
    }
  }

  return NextResponse.json({
    total: results.length,
    comparison: results,
  });
}
