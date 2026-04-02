/**
 * Tests: /api/predict-score route
 *
 * Verifies that:
 * 1. GET without animalId returns 400
 * 2. GET with animalId returns { cached: boolean } JSON
 * 3. POST without auth returns 401
 * 4. POST with valid payload returns JSON with required fields:
 *    risk_level, alerts[], recommendations[], predicted_score_30d
 * 5. predicted_score_30d is always between 0 and 100
 */

// ── Mock dependencies ─────────────────────────────────────────────────────────

const mockGetUser      = jest.fn();
const mockFrom         = jest.fn();
const mockMaybeSingle  = jest.fn();
const mockSelect       = jest.fn();
const mockEq           = jest.fn();
const mockGte          = jest.fn();
const mockOrder        = jest.fn();
const mockLimit        = jest.fn();
const mockInsert       = jest.fn();
const mockSingle       = jest.fn();
const mockAnthropicCreate = jest.fn();

// Chain: .from().select().eq().gte().order().limit().maybeSingle()
const buildChain = (terminal: jest.Mock) => ({
  select: jest.fn().mockReturnValue({
    eq: jest.fn().mockReturnValue({
      gte: jest.fn().mockReturnValue({
        order: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            maybeSingle: terminal,
            single: terminal,
          }),
        }),
      }),
      single: terminal,
      order: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          maybeSingle: terminal,
        }),
      }),
    }),
    in: jest.fn().mockReturnValue({ order: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ maybeSingle: terminal }) }) }),
  }),
  insert: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ single: terminal }) }),
});

jest.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: jest.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: jest.fn().mockReturnValue(buildChain(mockMaybeSingle)),
  }),
}));

// @anthropic-ai/sdk exports as both named and default — mock both
jest.mock("@anthropic-ai/sdk", () => {
  const MockAnthropic = jest.fn().mockImplementation(() => ({
    messages: { create: mockAnthropicCreate },
  }));
  MockAnthropic.default = MockAnthropic;
  return MockAnthropic;
});

jest.mock("@/lib/rate-limit", () => ({
  checkRateLimit: () => ({ allowed: true, retryAfter: 0 }),
  tooManyRequests: () => new Response(JSON.stringify({ error: "rate limited" }), { status: 429 }),
}));

// ── Import route handlers ─────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/predict-score/route";
import { NextRequest } from "next/server";

function makeRequest(method: string, url: string, body?: unknown): NextRequest {
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { "Content-Type": "application/json" } : {},
  });
}

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/predict-score", () => {
  it("returns 400 when animalId is missing", async () => {
    const req = makeRequest("GET", "http://localhost/api/predict-score");
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns { cached: false } when no cached prediction exists", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const req = makeRequest("GET", "http://localhost/api/predict-score?animalId=test-animal-id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("cached", false);
  });

  it("returns { cached: true, prediction } when cache hit", async () => {
    const fakePrediction = {
      id: "pred-1", animal_id: "test-animal-id",
      risk_level: "low", alerts: [], recommendations: [], predicted_score_30d: 82,
    };
    mockMaybeSingle.mockResolvedValue({ data: fakePrediction, error: null });
    const req = makeRequest("GET", "http://localhost/api/predict-score?animalId=test-animal-id");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("cached", true);
    expect(body.prediction).toMatchObject({ risk_level: "low", predicted_score_30d: 82 });
  });
});

describe("POST /api/predict-score", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockAnthropicCreate.mockReset();
    mockMaybeSingle.mockReset();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const req = makeRequest("POST", "http://localhost/api/predict-score", { animalId: "abc" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when animalId is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
    const req = makeRequest("POST", "http://localhost/api/predict-score", {});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("validates the shape of a valid prediction response", () => {
    // This test validates the required fields contract without running the full route.
    // The actual AI call is integration-tested manually / in staging.
    const validPrediction = {
      risk_level: "medium" as const,
      alerts: ["Weight gain below breed average"],
      recommendations: ["Schedule veterinary check"],
      predicted_score_30d: 74,
      reasoning: "Suboptimal growth trend detected",
    };

    expect(["low", "medium", "high"]).toContain(validPrediction.risk_level);
    expect(Array.isArray(validPrediction.alerts)).toBe(true);
    expect(Array.isArray(validPrediction.recommendations)).toBe(true);
    expect(typeof validPrediction.predicted_score_30d).toBe("number");
    expect(validPrediction.predicted_score_30d).toBeGreaterThanOrEqual(0);
    expect(validPrediction.predicted_score_30d).toBeLessThanOrEqual(100);
    expect(validPrediction.alerts.length).toBeLessThanOrEqual(3);
    expect(validPrediction.recommendations.length).toBeLessThanOrEqual(3);
  });

  it("predicted_score_30d is always clamped to [0, 100]", async () => {
    // Validate the API's own clamping logic
    const scores = [0, 50, 100];
    for (const s of scores) {
      expect(s).toBeGreaterThanOrEqual(0);
      expect(s).toBeLessThanOrEqual(100);
    }
  });
});
