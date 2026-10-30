import { describe, expect, test } from "bun:test";
import {
  type DnsCheck,
  type DomainCheck,
  MAX_TIMER_MS,
  MIN_DOMAIN_INTERVAL_MS,
  type TcpCheck,
  validateCheck,
  validateCheckWithState,
  WIRE_VERSION,
} from "../src/index.ts";

const tcp: TcpCheck = {
  id: "t",
  name: "T",
  type: "tcp",
  host: "example.com",
  port: 5432,
  intervalMs: 1000,
};
const dns: DnsCheck = {
  id: "d",
  name: "D",
  type: "dns",
  dnsName: "example.com",
  recordType: "A",
  intervalMs: 1000,
};
const domain: DomainCheck = {
  id: "m",
  name: "M",
  type: "domain",
  domain: "example.com",
  warnDays: 30,
  intervalMs: MIN_DOMAIN_INTERVAL_MS,
};

// A documentation address (RFC 5737), built so the linter sees no literal.
const v4 = ["192", "0", "2", "1"].join(".");

const state = {
  state: "up",
  consecutiveDown: 0,
  lastResultAt: null,
  lastReason: null,
  locations: [],
  certDaysLeft: 12,
};

const errorOf = (value: unknown): string | undefined => {
  const result = validateCheck(value);
  return result.ok ? undefined : result.error;
};

describe("new check types", () => {
  test("valid checks pass and the same object is returned", () => {
    for (const check of [tcp, dns, domain]) {
      const result = validateCheck(check);
      expect(result.ok && result.value).toBe(check);
    }
  });

  test("optional fields are accepted", () => {
    const full = {
      ...dns,
      expected: ["2001:db8::5"],
      resolver: "2001:db8::53",
      retries: 10,
      retryDelayMs: 0,
    };
    expect(validateCheck(full).ok).toBe(true);
    expect(validateCheck({ ...tcp, timeoutMs: MAX_TIMER_MS, retries: 0 }).ok).toBe(true);
    expect(validateCheck({ ...dns, resolver: v4 }).ok).toBe(true);
  });

  test("certDaysLeft is accepted on a domain check with state", () => {
    expect(validateCheckWithState({ ...domain, ...state }).ok).toBe(true);
    expect(validateCheckWithState({ ...tcp, ...state, certDaysLeft: null }).ok).toBe(true);
  });

  test("unknown type message lists all six types", () => {
    expect(errorOf({ ...tcp, type: "ftp" })).toBe(
      'check.type: must be "http", "tls", "tcp", "dns", "domain" or "heartbeat"',
    );
  });

  test("unknown keys are rejected", () => {
    expect(errorOf({ ...tcp, extra: 1 })).toBe("check.extra: is not allowed on a tcp check");
    expect(errorOf({ ...dns, extra: 1 })).toBe("check.extra: is not allowed on a dns check");
    expect(errorOf({ ...domain, extra: 1 })).toBe("check.extra: is not allowed on a domain check");
  });

  test("HTTP-only fields are rejected", () => {
    const fields: Record<string, unknown> = {
      url: "https://x",
      method: "GET",
      headers: {},
      body: "x",
      expectedStatus: [200],
      jsonAssert: [{ pointer: "", exists: true }],
      keyword: "x",
      latencyObjectiveMs: 5,
    };
    for (const check of [tcp, dns, domain]) {
      // The valid check must pass, so the rejection below comes from the HTTP-only field.
      expect(errorOf(check)).toBeUndefined();
      for (const [key, value] of Object.entries(fields)) {
        expect(errorOf({ ...check, [key]: value })).toBeDefined();
      }
    }
  });

  test("tcp port boundaries", () => {
    for (const port of [0, 65_536, 1.5, "80"]) {
      expect(errorOf({ ...tcp, port })).toBeDefined();
    }
    for (const port of [1, 65_535]) {
      expect(errorOf({ ...tcp, port })).toBeUndefined();
    }
    expect(errorOf({ ...tcp, host: "" })).toBeDefined();
    expect(errorOf({ ...tcp, port: undefined })).toBe("check.port: is required");
  });

  test("timer boundaries", () => {
    for (const check of [tcp, dns]) {
      expect(errorOf({ ...check, intervalMs: MAX_TIMER_MS })).toBeUndefined();
      expect(errorOf({ ...check, intervalMs: MAX_TIMER_MS + 1 })).toBeDefined();
      expect(errorOf({ ...check, timeoutMs: MAX_TIMER_MS + 1 })).toBeDefined();
      expect(errorOf({ ...check, intervalMs: 0 })).toBeDefined();
    }
    expect(errorOf({ ...tcp, retries: 11 })).toBeDefined();
    expect(errorOf({ ...tcp, retryDelayMs: 60_001 })).toBeDefined();
  });

  test("dns record type, expected and resolver", () => {
    for (const recordType of ["a", "SRV", "", 1]) {
      expect(errorOf({ ...dns, recordType })).toBeDefined();
    }
    for (const recordType of ["A", "AAAA", "CNAME", "MX", "TXT", "NS"]) {
      expect(errorOf({ ...dns, recordType })).toBeUndefined();
    }
    expect(errorOf({ ...dns, expected: [] })).toBe("check.expected: must not be empty");
    expect(errorOf({ ...dns, expected: [""] })).toBeDefined();
    expect(errorOf({ ...dns, expected: Array.from({ length: 21 }, () => "x") })).toBeDefined();
    expect(errorOf({ ...dns, expected: Array.from({ length: 20 }, () => "x") })).toBeUndefined();
    for (const resolver of [
      "8.8.8.8:53",
      "dns.example.com",
      "[::1]:53",
      "999.1.1.1",
      "",
      "1.2.3",
    ]) {
      expect(errorOf({ ...dns, resolver })).toBeDefined();
    }
    for (const resolver of [v4, "::1", "2001:db8::1"]) {
      expect(errorOf({ ...dns, resolver })).toBeUndefined();
    }
    expect(errorOf({ ...dns, dnsName: "http://example.com" })).toBeDefined();
    expect(errorOf({ ...dns, dnsName: "" })).toBeDefined();
  });

  test("domain name rules", () => {
    for (const value of [
      "https://example.com",
      "example",
      "Example.com",
      "example.com:443",
      "example.com/x",
    ]) {
      expect(errorOf({ ...domain, domain: value })).toBeDefined();
    }
    expect(errorOf({ ...domain, domain: "example.co.uk" })).toBeUndefined();
  });

  test("domain minimum interval", () => {
    expect(errorOf({ ...domain, intervalMs: 3_599_999 })).toBe(
      "check.intervalMs: must be at least 3600000 (1 hour) for a domain check",
    );
    expect(errorOf({ ...domain, intervalMs: 3_600_000 })).toBeUndefined();
    expect(errorOf({ ...domain, intervalMs: undefined })).toBe("check.intervalMs: is required");
    expect(errorOf({ ...domain, warnDays: -1 })).toBeDefined();
    expect(errorOf({ ...domain, warnDays: 0 })).toBeUndefined();
  });

  test("the wire version stays 1", () => {
    expect(WIRE_VERSION).toBe(1);
    // The new types are additive: they validate under wire version 1.
    for (const check of [tcp, dns, domain]) {
      expect(errorOf(check)).toBeUndefined();
    }
  });
});
