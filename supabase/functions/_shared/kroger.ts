// Kroger Developer API client. How it works, step by step: docs/KROGER.md.
//
// Kroger uses OAuth2 "client credentials": we trade our app's client ID + secret
// for an access token (valid ~30 min), then send that token on every request.
// The secret lives only in Supabase secrets, never in the phone app.

import type { Candidate } from "./pricing.ts";

const BASE = "https://api.kroger.com/v1";

let cached: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<string> | null = null;

/** Step 1: get (or reuse) an access token. Many lookups at once share one token request. */
export function krogerToken(): Promise<string> {
  if (cached && Date.now() < cached.expiresAt - 60_000) return Promise.resolve(cached.token);
  inFlight ??= fetchToken().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function fetchToken(): Promise<string> {
  const id = Deno.env.get("KROGER_CLIENT_ID");
  const secret = Deno.env.get("KROGER_CLIENT_SECRET");
  if (!id || !secret) throw new Error("Kroger keys missing: set KROGER_CLIENT_ID and KROGER_CLIENT_SECRET");
  const res = await fetch(`${BASE}/connect/oauth2/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });
  if (!res.ok) throw new Error(`Kroger token failed (${res.status}): ${await res.text()}`);
  const json = await res.json();
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return cached.token;
}

async function get(path: string, params: Record<string, string>) {
  const token = await krogerToken();
  const url = `${BASE}${path}?${new URLSearchParams(params)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } });
    if (res.status === 429 || res.status >= 500) {
      await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
      continue;
    }
    if (!res.ok) throw new Error(`Kroger ${path} failed (${res.status}): ${await res.text()}`);
    return await res.json();
  }
  throw new Error(`Kroger ${path} kept failing`);
}

export type KrogerStore = {
  locationId: string;
  name: string;
  chain: string;
  address: string;
  lat: number;
  lng: number;
};

/** Step 2: Locations API, stores near a zip code or a lat/lng. */
export async function findStores(near: { zip?: string; lat?: number; lng?: number }, limit = 10): Promise<KrogerStore[]> {
  const params: Record<string, string> = { "filter.limit": String(limit), "filter.radiusInMiles": "15" };
  if (near.lat != null && near.lng != null) params["filter.latLong.near"] = `${near.lat},${near.lng}`;
  else if (near.zip) params["filter.zipCode.near"] = near.zip;
  else throw new Error("Need a zip code or location");
  const json = await get("/locations", params);
  // deno-lint-ignore no-explicit-any
  return (json.data ?? []).map((l: any) => ({
    locationId: l.locationId,
    name: l.name,
    chain: l.chain,
    address: [l.address?.addressLine1, l.address?.city].filter(Boolean).join(", "),
    lat: l.geolocation?.latitude,
    lng: l.geolocation?.longitude,
  }));
}

/** Step 3: Products API, search one store's shelf. Prices only come back when locationId is set. */
export async function searchProducts(term: string, locationId: string, limit = 8): Promise<Candidate[]> {
  const json = await get("/products", {
    "filter.term": term.slice(0, 60),
    "filter.locationId": locationId,
    "filter.limit": String(limit),
  });
  const out: Candidate[] = [];
  for (const p of json.data ?? []) {
    const item = p.items?.[0];
    const regular = item?.price?.regular ?? 0;
    const promo = item?.price?.promo ?? 0;
    if (!regular) continue; // not sold at this store
    const aisle = p.aisleLocations?.[0];
    out.push({
      productId: p.productId,
      description: p.description ?? "",
      brand: p.brand ?? "",
      size: item?.size ?? "",
      price: promo > 0 && promo < regular ? promo : regular,
      regularPrice: regular,
      aisle: aisle ? (aisle.description || (aisle.number ? `Aisle ${aisle.number}` : null)) : null,
    });
  }
  return out;
}
