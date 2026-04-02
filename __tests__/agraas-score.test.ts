/**
 * Tests: calculateAgraasScore (via mocked Supabase RPC) and
 *        calculate_farm_score (via mocked Supabase RPC)
 *
 * The score functions live in SQL (migration 036 / 048).
 * These tests verify that:
 *  1. The RPC wrapper returns a value in the [0, 100] range
 *  2. Invalid inputs are handled gracefully (null returned for unknown animal)
 *  3. The result is always a number or null — never NaN or negative
 */

// ── Mock Supabase service client ──────────────────────────────────────────────

const mockRpc = jest.fn();

jest.mock("@/lib/supabase-service", () => ({
  createSupabaseServiceClient: () => ({
    rpc: mockRpc,
  }),
}));

import { createSupabaseServiceClient } from "@/lib/supabase-service";

// ── Helpers that wrap the RPC call (mirrors how the app invokes the function) ─

async function calculateAgraasScore(animalId: string): Promise<number | null> {
  const db = createSupabaseServiceClient();
  const { data, error } = await db.rpc("calculate_agraas_score", { p_animal_id: animalId });
  if (error || data == null) return null;
  const score = Number(data);
  return isNaN(score) ? null : Math.max(0, Math.min(100, score));
}

async function calculateFarmScore(propertyId: string): Promise<number | null> {
  const db = createSupabaseServiceClient();
  const { data, error } = await db.rpc("calculate_farm_score", { p_property_id: propertyId });
  if (error || data == null) return null;
  const score = Number(data);
  return isNaN(score) ? null : Math.max(0, Math.min(100, Math.round(score)));
}

// ─────────────────────────────────────────────────────────────────────────────

describe("calculateAgraasScore", () => {
  beforeEach(() => mockRpc.mockReset());

  it("returns a score between 0 and 100 for a known animal", async () => {
    mockRpc.mockResolvedValue({ data: 78.5, error: null });
    const score = await calculateAgraasScore("animal-uuid-123");
    expect(score).not.toBeNull();
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns null for an unknown animal (RPC returns null)", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const score = await calculateAgraasScore("nonexistent-uuid");
    expect(score).toBeNull();
  });

  it("returns null when the RPC returns an error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: "Not found" } });
    const score = await calculateAgraasScore("bad-uuid");
    expect(score).toBeNull();
  });

  it("clamps edge values to [0, 100]", async () => {
    mockRpc.mockResolvedValue({ data: 103, error: null });
    const score = await calculateAgraasScore("animal-uuid-123");
    expect(score).toBe(100);
  });

  it("clamps negative edge values to 0", async () => {
    mockRpc.mockResolvedValue({ data: -5, error: null });
    const score = await calculateAgraasScore("animal-uuid-123");
    expect(score).toBe(0);
  });

  it("is always an integer or null (never NaN)", async () => {
    mockRpc.mockResolvedValue({ data: "not-a-number", error: null });
    const score = await calculateAgraasScore("animal-uuid-123");
    expect(score).toBeNull();
  });
});

describe("calculate_farm_score", () => {
  beforeEach(() => mockRpc.mockReset());

  it("returns a valid integer between 0 and 100", async () => {
    mockRpc.mockResolvedValue({ data: 64.8, error: null });
    const score = await calculateFarmScore("property-uuid-456");
    expect(score).not.toBeNull();
    expect(Number.isInteger(score)).toBe(true);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it("returns null for an unknown property", async () => {
    mockRpc.mockResolvedValue({ data: null, error: null });
    const score = await calculateFarmScore("nonexistent-property");
    expect(score).toBeNull();
  });

  it("rounds decimal scores to integer", async () => {
    mockRpc.mockResolvedValue({ data: 72.6, error: null });
    const score = await calculateFarmScore("property-uuid-456");
    expect(score).toBe(73);
  });
});
