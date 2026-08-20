import { Service } from "@deepseek-ai/cordis";
import { credentialRef } from "@deepseek-ai/dsh-credentials";

/**
 * DeepSeek 账户余额查询服务（host 半）。
 * 注册一个 /api/balance HTTP 路由，浏览器半 fetch 该端点获取余额。
 * 走 webServer 路由而非 Typert Remote，避免依赖编译生成的 remote descriptor。
 */
class BalanceService extends Service {
  static inject = ["webServer"];

  constructor(ctx) {
    super(ctx, "balance");
    this.ctx.effect(() => this.ctx.webServer.register({
      kind: "exact",
      path: "/api/balance",
      handler: (req, res) => this.handle(req, res)
    }), "balance: web route");
  }

  async handle(req, res) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: { code: "method-not-allowed", message: "GET only" } }));
      return;
    }
    const result = await this.query();
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(result));
  }

  async query() {
    const credentials = this.ctx.get("credentials");
    if (credentials === void 0) {
      return { ok: false, error: { code: "no-credentials", message: "credentials 服务不可用" } };
    }
    const hit = await credentials.resolve(credentialRef("DEEPSEEK_API_KEY"));
    const apiKey = hit?.value;
    if (apiKey === void 0 || apiKey.length === 0) {
      return { ok: false, error: { code: "no-api-key", message: "未配置 DEEPSEEK_API_KEY" } };
    }

    let res;
    try {
      res = await fetch("https://api.deepseek.com/user/balance", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: "application/json"
        }
      });
    } catch (error) {
      return { ok: false, error: { code: "network", message: error?.message ?? "余额请求失败" } };
    }
    if (!res.ok) {
      return { ok: false, error: { code: `http-${res.status}`, message: `余额接口返回 ${res.status}` } };
    }
    return { ok: true, value: await res.json() };
  }
}

export default BalanceService;
