import {
  CommandEnvelopeSchema,
  CONTRACT_SCHEMA_VERSION,
  PROTOCOL_VERSION,
} from '@variant-chess/shared-types';
import type { CommandEnvelope, SerializableValue } from '@variant-chess/shared-types';

// A transport fixture, not a playable command or a gameplay rule.
export function createCommandFixture(overrides: Partial<CommandEnvelope> = {}): CommandEnvelope {
  return CommandEnvelopeSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    matchId: 'fixture-match',
    commandId: 'fixture-command',
    expectedRevision: 0,
    command: { kind: 'fixture.noop', schemaVersion: CONTRACT_SCHEMA_VERSION, payload: null },
    ...overrides,
  });
}

export function cloneSerializable<T extends SerializableValue>(value: T): T {
  return structuredClone(value);
}
