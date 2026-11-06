import { test } from "bun:test";
import assert from "node:assert/strict";
import type { Validation } from "../src/validate-core.ts";
import {
  validateAdminNotifyChannelsView,
  validateAdminNotifyFailedView,
  validateAdminStatusSettingsView,
  validateNotifyChannelDefinition,
  validateNotifyChannelRecord,
  validateNotifyServiceReport,
  validateResendClaimResponse,
  validateResendCommand,
  validateResendRequest,
  validateResendResultInput,
  validateServiceNotifyChannels,
  validateServiceStatusSettings,
  validateStatusServiceReport,
  validateStatusSettings,
} from "../src/validate-runtime.ts";

const revision = `sha256-${"0".repeat(64)}`;

const validators: [string, (value: unknown) => Validation<unknown>][] = [
  ["validateStatusSettings", validateStatusSettings],
  ["validateServiceStatusSettings", validateServiceStatusSettings],
  ["validateStatusServiceReport", validateStatusServiceReport],
  ["validateAdminStatusSettingsView", validateAdminStatusSettingsView],
  ["validateNotifyChannelDefinition", validateNotifyChannelDefinition],
  ["validateNotifyChannelRecord", validateNotifyChannelRecord],
  ["validateServiceNotifyChannels", validateServiceNotifyChannels],
  ["validateNotifyServiceReport", validateNotifyServiceReport],
  ["validateAdminNotifyChannelsView", validateAdminNotifyChannelsView],
  ["validateAdminNotifyFailedView", validateAdminNotifyFailedView],
  ["validateResendRequest", validateResendRequest],
  ["validateResendCommand", validateResendCommand],
  ["validateResendClaimResponse", validateResendClaimResponse],
  ["validateResendResultInput", validateResendResultInput],
];

type Counter = { calls: number };

function withGetter(target: object, key: string, counter: Counter): object {
  Object.defineProperty(target, key, {
    enumerable: true,
    get() {
      counter.calls++;
      return "webhook";
    },
  });
  return target;
}

// Each input hides a getter at a different depth: top level, an unknown element field, the id
// itself and an array element.
function inputs(counter: Counter): unknown[] {
  const elementArray: unknown[] = [];
  Object.defineProperty(elementArray, 0, {
    enumerable: true,
    get() {
      counter.calls++;
      return { id: "ops" };
    },
  });
  return [
    withGetter({ revision, channels: [] }, "extra", counter),
    { revision, channels: [withGetter({ id: "ops" }, "type", counter)] },
    { revision, channels: [withGetter({}, "id", counter)] },
    { revision, channels: elementArray },
    withGetter({}, "type", counter),
    withGetter({ id: "ops" }, "type", counter),
  ];
}

test("no validator runs a getter of untrusted input", () => {
  for (const [name, validate] of validators) {
    const counter = { calls: 0 };
    for (const input of inputs(counter)) {
      validate(input);
    }
    assert.equal(counter.calls, 0, name);
  }
});

test("the envelope accepts an element with a getter on another key without reading it", () => {
  const counter = { calls: 0 };
  const input = { revision, channels: [withGetter({ id: "ops" }, "type", counter)] };
  const result = validateServiceNotifyChannels(input);
  assert.equal(result.ok, true);
  assert.equal(result.ok && result.value, input);
  assert.equal(counter.calls, 0);
});
