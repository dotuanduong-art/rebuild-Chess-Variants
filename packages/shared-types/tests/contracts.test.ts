import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  CommandEnvelopeSchema,
  EventEnvelopeSchema,
  PROTOCOL_VERSION,
  SerializableValueSchema,
  VersionIdentifierSchema,
  createResultSchema,
} from '../src/index.js';

const command = {
  protocolVersion: PROTOCOL_VERSION,
  matchId: 'test-match',
  commandId: 'test-command',
  expectedRevision: 0,
  command: { kind: 'fixture.noop', schemaVersion: '0.1.0', payload: { nested: [1, null, true] } },
};

describe('draft transport contracts', () => {
  it('round-trips a JSON command and event without inventing gameplay types', () => {
    expect(CommandEnvelopeSchema.parse(JSON.parse(JSON.stringify(command)))).toEqual(command);
    expect(
      EventEnvelopeSchema.parse({
        protocolVersion: PROTOCOL_VERSION,
        matchId: 'test-match',
        eventId: 'test-event',
        revision: 1,
        sequence: 0,
        event: command.command,
      }),
    ).toMatchObject({ revision: 1, sequence: 0 });
  });

  it.each([
    { ...command, requester: 'forged-player' },
    { ...command, protocolVersion: '99.0.0' },
    { ...command, expectedRevision: -1 },
    { ...command, expectedRevision: 0.5 },
    { ...command, expectedRevision: Number.MAX_SAFE_INTEGER + 1 },
    { ...command, commandId: '' },
    { ...command, command: { ...command.command, cost: 0 } },
  ])('rejects malformed or unauthorized envelope fields: %j', (input) => {
    expect(CommandEnvelopeSchema.safeParse(input).success).toBe(false);
  });

  it.each([undefined, NaN, Infinity, new Date(), () => null, { nested: undefined }])(
    'rejects non-JSON payload %j',
    (value) => {
      expect(SerializableValueSchema.safeParse(value).success).toBe(false);
    },
  );

  it('validates version identifiers and discriminated results', () => {
    expect(VersionIdentifierSchema.safeParse('0.1.0-draft').success).toBe(true);
    expect(VersionIdentifierSchema.safeParse('latest').success).toBe(false);
    const schema = createResultSchema(z.string());
    expect(schema.parse({ ok: true, value: 'receipt' })).toEqual({ ok: true, value: 'receipt' });
    expect(
      schema.parse({ ok: false, rejection: { code: 'STALE_REVISION', message: 'Resync' } }),
    ).toMatchObject({ ok: false });
    expect(
      schema.safeParse({ ok: true, rejection: { code: 'NOT_AVAILABLE', message: 'No' } }).success,
    ).toBe(false);
  });
});
