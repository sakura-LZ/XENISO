import { z } from "zod";
import { AppError } from "../errors";
import { aboutSchema, areas, careersSchema, encodeAnswers, questionPageSchema, resultsSchema, validateQuestions } from "./contracts";

const base = "https://api-v2.onetcenter.org";
type Fetcher = typeof fetch;
type Observation = { endpoint: string; status: number; keys: string[] };

// The constructor receives the key only from a server module or the local CLI.
// No environment access or hidden mock fallback lives in this shared transport.
export class OnetClient {
  constructor(private readonly apiKey: string, private readonly fetcher: Fetcher = fetch, private readonly observe?: (value: Observation) => void) {}

  private async get<T>(path: string, schema: z.ZodType<T>): Promise<T> {
    const url = new URL(path, base);
    if (url.origin !== base) throw new AppError("ONET_HOST", 502, "官方接口分页地址异常。");
    let response: Response;
    try {
      response = await this.fetcher(url, {
        method: "GET", headers: { "X-API-Key": this.apiKey, Accept: "application/json" },
        signal: AbortSignal.timeout(12000), cache: "no-store", redirect: "error",
      });
    } catch {
      throw new AppError("ONET_NETWORK", 502, "O*NET 网络请求失败或超时，请稍后重试。");
    }
    // Never log query strings (answers), upstream body, headers or raw exceptions.
    if (!response.ok) {
      this.observe?.({ endpoint: url.pathname, status: response.status, keys: [] });
      throw new AppError("ONET_HTTP", 502, `O*NET 返回 HTTP ${response.status}，未生成结果。`);
    }
    let body: unknown;
    try { body = await response.json(); } catch { throw new AppError("ONET_CONTRACT", 502, "O*NET 返回了无法解析的数据。"); }
    this.observe?.({ endpoint: url.pathname, status: response.status, keys: body && typeof body === "object" ? Object.keys(body) : [] });
    const parsed = schema.safeParse(body);
    if (!parsed.success) throw new AppError("ONET_CONTRACT", 502, "O*NET 返回结构与已核实契约不符，已停止生成结果。");
    return parsed.data;
  }

  about() { return this.get("/about/", aboutSchema); }

  async questions() {
    const version = await this.about();
    const pages: z.infer<typeof questionPageSchema>[] = [];
    const visited = new Set<string>();
    let path: string | undefined = "/mnm/interestprofiler/questions_30?start=1&end=30";
    while (path) {
      if (pages.length >= 30 || visited.has(path)) throw new AppError("ONET_CONTRACT", 502, "官方题目分页异常。");
      visited.add(path);
      const page: z.infer<typeof questionPageSchema> = await this.get(path, questionPageSchema);
      pages.push(page);
      path = page.next;
    }
    return {
      source: "onet_live" as const, instrument: "Mini-IP-30" as const,
      api_version: version.api_version, onet_version: version.database.name,
      answer_options: pages[0].answer_option,
      questions: validateQuestions(pages).map((q) => ({ id: `mini-ip-30:${q.index}`, index: q.index, area: q.area, original_en: q.text, onet_version: version.database.name })),
    };
  }

  async results(answers: unknown) {
    const encoded = encodeAnswers(answers);
    const scores = await this.get(`/mnm/interestprofiler/results?answers=${encoded}`, resultsSchema);
    if (new Set(scores.result.map((r) => r.code)).size !== 6) throw new AppError("ONET_CONTRACT", 502, "官方六维结果缺失或重复。");
    const query = new URLSearchParams();
    for (const area of areas) query.set(area, String(scores.result.find((r) => r.code === area)!.score));
    const careers = await this.get(`/mnm/interestprofiler/careers?${query}`, careersSchema);
    if (careers.total > 0 && careers.career.length === 0) throw new AppError("ONET_CONTRACT", 502, "职业匹配条目缺失。");
    return { source: "onet_live" as const, instrument: "Mini-IP-30" as const, answer_count: encoded.length, scores: scores.result, careers: careers.career, career_total: careers.total };
  }
}
