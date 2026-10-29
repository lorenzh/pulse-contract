/**
 * Version of the wire format. An integer; bump it only on an incompatible wire change.
 * It is independent of the package version.
 */
export const WIRE_VERSION = 1;

/** Response header in which the api reports its `WIRE_VERSION`. */
export const WIRE_VERSION_HEADER = "x-pulse-contract";

export type WireVersionCheck =
  | { status: "ok" }
  | { status: "absent" }
  | { status: "mismatch"; error: string };

/** Compares the value of `WIRE_VERSION_HEADER` with `WIRE_VERSION`. Never throws. */
export function checkWireVersion(header: string | null | undefined): WireVersionCheck {
  if (header === null || header === undefined) {
    return { status: "absent" };
  }
  const text = header.trim();
  if (/^\d+$/.test(text) && Number(text) === WIRE_VERSION) {
    return { status: "ok" };
  }
  return {
    status: "mismatch",
    error: `${WIRE_VERSION_HEADER}: got "${header}", expected ${WIRE_VERSION}`,
  };
}
