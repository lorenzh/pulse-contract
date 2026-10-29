/**
 * Version of the wire format. An integer; bump it only on an incompatible wire change.
 * It is independent of the package version.
 */
export declare const WIRE_VERSION = 1;
/** Response header in which the api reports its `WIRE_VERSION`. */
export declare const WIRE_VERSION_HEADER = "x-pulse-contract";
export type WireVersionCheck = {
    status: "ok";
} | {
    status: "absent";
} | {
    status: "mismatch";
    error: string;
};
/** Compares the value of `WIRE_VERSION_HEADER` with `WIRE_VERSION`. Never throws. */
export declare function checkWireVersion(header: string | null | undefined): WireVersionCheck;
