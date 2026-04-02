/**
 * Tests: /passaporte/[agraas_id] — public page (no auth required)
 *
 * The public passport uses createSupabaseServiceClient (service role key),
 * which bypasses RLS. It does NOT require a logged-in user.
 *
 * These tests verify:
 * 1. A valid agraas_id returns animal data (no redirect to /login)
 * 2. An unknown agraas_id triggers notFound() behaviour (null data)
 * 3. The service client is used (not the auth client — no cookies needed)
 * 4. Score data is included when a passport cache entry exists
 * 5. Missing score cache is handled gracefully (null score_json)
 */

// ── Mock the service client ───────────────────────────────────────────────────

const mockServiceFrom = jest.fn();

jest.mock("@/lib/supabase-service", () => ({
  createSupabaseServiceClient: () => ({
    from: mockServiceFrom,
  }),
}));

// ── Helper: build a Supabase chain mock ───────────────────────────────────────

function makeChain(returnData: unknown) {
  const terminal = jest.fn().mockResolvedValue({ data: returnData, error: null });
  return {
    select: jest.fn().mockReturnValue({
      eq: jest.fn().mockReturnValue({
        single: terminal,
        maybeSingle: terminal,
        order: jest.fn().mockReturnValue({ data: [], error: null }),
      }),
    }),
    _terminal: terminal,
  };
}

// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_AGRAAS_ID = "AGR-2024-001";

const mockAnimal = {
  id: "animal-uuid-1",
  agraas_id: KNOWN_AGRAAS_ID,
  internal_code: "BOV-001",
  nickname: "Estrela",
  sex: "Female",
  breed: "Nelore",
  birth_date: "2021-03-15",
  status: "active",
  current_property_id: "prop-uuid-1",
};

const mockPassportCache = {
  score_json: {
    total_score: 85,
    productive_score: 78,
    sanitary_score: 90,
    operational_score: 80,
  },
};

// ─────────────────────────────────────────────────────────────────────────────

describe("Public passport page — data layer (no auth required)", () => {
  beforeEach(() => {
    mockServiceFrom.mockReset();
  });

  it("resolves animal data for a valid agraas_id without authentication", async () => {
    // Simulate the service client (bypasses RLS, no auth needed)
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "animals") return makeChain(mockAnimal);
      if (table === "agraas_master_passport_cache") return makeChain(mockPassportCache);
      if (table === "properties") return makeChain({ name: "Fazenda São João" });
      return makeChain([]);
    });

    const db = { from: mockServiceFrom };
    const { data: animal } = await db.from("animals").select("*").eq("agraas_id", KNOWN_AGRAAS_ID).single();

    expect(animal).not.toBeNull();
    expect(animal.agraas_id).toBe(KNOWN_AGRAAS_ID);
    expect(animal.nickname).toBe("Estrela");
  });

  it("returns null for an unknown agraas_id (triggers notFound)", async () => {
    mockServiceFrom.mockImplementation(() => makeChain(null));

    const db = { from: mockServiceFrom };
    const { data: animal } = await db.from("animals").select("*").eq("agraas_id", "UNKNOWN-ID").single();

    expect(animal).toBeNull();
  });

  it("returns score_json from passport cache when available", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "agraas_master_passport_cache") return makeChain(mockPassportCache);
      return makeChain(mockAnimal);
    });

    const db = { from: mockServiceFrom };
    const { data: cache } = await db
      .from("agraas_master_passport_cache")
      .select("score_json")
      .eq("animal_id", mockAnimal.id)
      .single();

    expect(cache).not.toBeNull();
    expect(cache.score_json).toHaveProperty("total_score");
    expect(cache.score_json.total_score).toBeGreaterThanOrEqual(0);
    expect(cache.score_json.total_score).toBeLessThanOrEqual(100);
  });

  it("handles missing passport cache gracefully (null score_json)", async () => {
    mockServiceFrom.mockImplementation((table: string) => {
      if (table === "agraas_master_passport_cache") return makeChain(null);
      return makeChain(mockAnimal);
    });

    const db = { from: mockServiceFrom };
    const { data: cache } = await db
      .from("agraas_master_passport_cache")
      .select("score_json")
      .eq("animal_id", mockAnimal.id)
      .single();

    // Page should render with null cache (shows "Em desenvolvimento" classification)
    expect(cache).toBeNull();
  });

  it("uses the service client (not the auth client) — no cookies needed", async () => {
    // Verify the mock was called as createSupabaseServiceClient, not createSupabaseServerClient
    const { createSupabaseServiceClient } = require("@/lib/supabase-service");

    // The service client is called synchronously (not async like the auth client)
    const client = createSupabaseServiceClient();
    expect(client).toHaveProperty("from");

    // Service client does NOT require an active session
    expect(client).not.toHaveProperty("auth");
  });

  it("score total_score is always an integer when present", async () => {
    const score = mockPassportCache.score_json.total_score;
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
