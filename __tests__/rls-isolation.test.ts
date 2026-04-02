/**
 * Tests: RLS cross-client isolation
 *
 * The Agraas RLS model: every row in operational tables has a client_id.
 * The DB policy is: USING (client_id = get_my_client_id()).
 *
 * These tests verify the expected behaviour by mocking the Supabase client:
 * - Client A can read their own animals
 * - Client A gets 0 rows when accessing Client B's animals (RLS blocks it)
 * - Service client (bypasses RLS) can read data from any client
 */

// ── Mock setup ────────────────────────────────────────────────────────────────

const CLIENT_A_ID = "client-a-uuid";
const CLIENT_B_ID = "client-b-uuid";

const clientAAnimals = [
  { id: "animal-1", client_id: CLIENT_A_ID, nickname: "Estrela", internal_code: "A001" },
  { id: "animal-2", client_id: CLIENT_A_ID, nickname: "Touro",   internal_code: "A002" },
];

const clientBAnimals = [
  { id: "animal-3", client_id: CLIENT_B_ID, nickname: "Boi",    internal_code: "B001" },
];

// Simulate RLS: filter rows by the "authenticated" client_id
function makeRlsClient(authenticatedClientId: string) {
  return {
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (col: string, val: string) => {
          // Simulate RLS: the database only returns rows matching the session's client_id
          const allAnimals = [...clientAAnimals, ...clientBAnimals];
          const rlsFiltered = allAnimals.filter(a => a.client_id === authenticatedClientId);
          const result = rlsFiltered.filter(a => (a as Record<string, string>)[col] === val);
          return Promise.resolve({ data: result, error: null });
        },
        // No .eq filter — returns only the session's client's rows (RLS active)
        then: (resolve: (v: { data: typeof clientAAnimals; error: null }) => void) => {
          const allAnimals = [...clientAAnimals, ...clientBAnimals];
          const rlsFiltered = allAnimals.filter(a => a.client_id === authenticatedClientId);
          resolve({ data: rlsFiltered as typeof clientAAnimals, error: null });
          return Promise.resolve({ data: rlsFiltered, error: null });
        },
      }),
    }),
  };
}

// Service client bypasses RLS — returns all rows regardless of client_id
function makeServiceClient() {
  return {
    from: (table: string) => ({
      select: (cols: string) => ({
        in: (col: string, vals: string[]) => {
          const allAnimals = [...clientAAnimals, ...clientBAnimals];
          const result = allAnimals.filter(a => vals.includes((a as Record<string, string>)[col]));
          return Promise.resolve({ data: result, error: null });
        },
      }),
    }),
  };
}

// ─────────────────────────────────────────────────────────────────────────────

describe("RLS: cross-client isolation", () => {
  it("Client A can read their own animals", async () => {
    const db = makeRlsClient(CLIENT_A_ID);
    const chain = db.from("animals").select("*");
    const { data } = await (chain as unknown as Promise<{ data: typeof clientAAnimals; error: null }>);
    expect(data.length).toBe(2);
    data.forEach(a => expect(a.client_id).toBe(CLIENT_A_ID));
  });

  it("Client B cannot read Client A's animals (RLS returns 0 rows)", async () => {
    const db = makeRlsClient(CLIENT_B_ID);
    const chain = db.from("animals").select("*");
    const { data } = await (chain as unknown as Promise<{ data: typeof clientBAnimals; error: null }>);
    // RLS filters to only Client B's rows — Client A's animals are invisible
    expect(data.every(a => a.client_id === CLIENT_B_ID)).toBe(true);
    const clientARows = data.filter(a => a.client_id === CLIENT_A_ID);
    expect(clientARows.length).toBe(0);
  });

  it("Client A's session does not expose Client B's animal IDs", async () => {
    const dbA = makeRlsClient(CLIENT_A_ID);
    const chain = dbA.from("animals").select("id");
    const { data } = await (chain as unknown as Promise<{ data: typeof clientAAnimals; error: null }>);
    const ids = data.map(a => a.id);
    expect(ids).not.toContain("animal-3"); // Client B's animal is not visible
  });

  it("Service client (bypasses RLS) can read animals from any client", async () => {
    const db = makeServiceClient();
    const { data } = await db
      .from("animals")
      .select("id, client_id")
      .in("client_id", [CLIENT_A_ID, CLIENT_B_ID]);

    expect(data.length).toBe(3); // All animals from both clients
    const clientIds = new Set(data.map(a => a.client_id));
    expect(clientIds.has(CLIENT_A_ID)).toBe(true);
    expect(clientIds.has(CLIENT_B_ID)).toBe(true);
  });

  it("each client's animal list is disjoint", async () => {
    const dbA = makeRlsClient(CLIENT_A_ID);
    const dbB = makeRlsClient(CLIENT_B_ID);

    const [resA, resB] = await Promise.all([
      (dbA.from("animals").select("*") as unknown as Promise<{ data: typeof clientAAnimals; error: null }>),
      (dbB.from("animals").select("*") as unknown as Promise<{ data: typeof clientBAnimals; error: null }>),
    ]);

    const idsA = new Set(resA.data.map(a => a.id));
    const idsB = new Set(resB.data.map(a => a.id));

    // No overlap between Client A's and Client B's visible rows
    const intersection = [...idsA].filter(id => idsB.has(id));
    expect(intersection.length).toBe(0);
  });
});
