import { cronAutorizado } from "@/lib/cron-auth";

function req(headers: Record<string, string>) {
  const h = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return { headers: { get: (n: string) => h.get(n.toLowerCase()) ?? null } };
}

describe("cronAutorizado", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => { if (original === undefined) delete process.env.CRON_SECRET; else process.env.CRON_SECRET = original; });

  it("header x-vercel-cron forjado NÃO autoriza", () => {
    process.env.CRON_SECRET = "segredo-com-dezesseis-chars";
    expect(cronAutorizado(req({ "x-vercel-cron": "1" }))).toBe(false);
  });
  it("Bearer com o CRON_SECRET autoriza", () => {
    process.env.CRON_SECRET = "segredo-com-dezesseis-chars";
    expect(cronAutorizado(req({ authorization: "Bearer segredo-com-dezesseis-chars" }))).toBe(true);
    expect(cronAutorizado(req({ authorization: "Bearer outro" }))).toBe(false);
  });
  it("sem CRON_SECRET a rota fica fechada (fail-closed)", () => {
    delete process.env.CRON_SECRET;
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(cronAutorizado(req({ "x-vercel-cron": "1" }))).toBe(false);
    expect(cronAutorizado(req({}))).toBe(false);
    spy.mockRestore();
  });
  it("token extra (ex.: DIGEST_TRIGGER_TOKEN) também autoriza; curto demais é ignorado", () => {
    delete process.env.CRON_SECRET;
    expect(cronAutorizado(req({ authorization: "Bearer token-do-digest-longo-ok" }), ["token-do-digest-longo-ok"])).toBe(true);
    const spy = jest.spyOn(console, "error").mockImplementation(() => {});
    expect(cronAutorizado(req({ authorization: "Bearer curto" }), ["curto"])).toBe(false);
    spy.mockRestore();
  });
});
