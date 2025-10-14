// References
// - bSDD/Documentation/bSDD and GraphQL.md
// - bSDD/Documentation/bSDD API.md

type GraphQLRequest = {
  query: string;
  variables?: Record<string, unknown>;
};

export type GraphQLClientOptions = {
  endpoint?: string;
  token?: string;
};

export async function gqlFetch<T = any>(
  body: GraphQLRequest,
  opts: GraphQLClientOptions = {}
): Promise<T> {
  const endpoint =
    opts.endpoint ||
    process.env.BSDD_GQL_URL ||
    // Default to test (open) endpoint for development
    "https://test.bsdd.buildingsmart.org/graphql/";
  const token = opts.token || process.env.BSDD_GQL_TOKEN;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    // Cache a bit on the Next.js data layer if called server-side
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    throw new Error(`GraphQL HTTP ${res.status}`);
  }
  const json = (await res.json()) as { data?: T; errors?: { message?: string }[] };
  if (json.errors && json.errors.length) {
    throw new Error(json.errors.map((e) => e.message || "GraphQL error").join("; "));
  }
  return json.data as T;
}
