function slotOf(item, key) {
    const descriptor = Object.getOwnPropertyDescriptor(item, key);
    if (descriptor === undefined) {
        return { kind: "absent" };
    }
    return "value" in descriptor ? { kind: "value", value: descriptor.value } : { kind: "accessor" };
}
function isPublicItem(value) {
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return false;
    }
    const visibility = slotOf(value, "visibility");
    const publishedAt = slotOf(value, "publishedAt");
    const isPublicVisibility = visibility.kind === "absent" || (visibility.kind === "value" && visibility.value === "public");
    const isPublished = publishedAt.kind === "absent" ||
        (publishedAt.kind === "value" &&
            typeof publishedAt.value === "number" &&
            Number.isFinite(publishedAt.value));
    return isPublicVisibility && isPublished;
}
/**
 * True when an upstream manual incident may be shown publicly. It reads only own property
 * descriptors: a missing `visibility` or `publishedAt` (an older api) counts as public, an
 * accessor on either key makes the item non-public, and no getter ever runs. Never throws.
 */
export function isPublicManualIncident(value) {
    try {
        return isPublicItem(value);
    }
    catch {
        // A hostile proxy throws from its traps (a revoked one even from Array.isArray): fail closed.
        return false;
    }
}
/** A new object with exactly the public fields; each update keeps only `at`, `status`, `message`. */
export function publicManualIncident(incident) {
    return {
        id: incident.id,
        title: incident.title,
        componentIds: [...incident.componentIds],
        impact: incident.impact,
        status: incident.status,
        createdAt: incident.createdAt,
        resolvedAt: incident.resolvedAt,
        updates: incident.updates.map(({ at, status, message }) => ({ at, status, message })),
    };
}
