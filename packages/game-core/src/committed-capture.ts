import { CommittedCaptureContextSchema } from '@variant-chess/shared-types';
import type {
  GameState,
  Piece,
  DomainEvent,
  CommittedCaptureContext,
  EffectApplication,
} from '@variant-chess/shared-types';
import { cloneData, deepFreeze } from './canonical.js';
import { querySanctuaryRegions, sanctuaryCells } from './sanctuary-region.js';

/** Concrete TriggerA only. No arbitrary capture callback and no Bomb-private transport reuse. */
export function captureSanctuaryContext(
  state: GameState,
  attacker: Piece,
  victim: Piece,
  event: Extract<DomainEvent, { kind: 'capture_committed' }>,
  causeId: string,
): Readonly<CommittedCaptureContext> {
  const regions = querySanctuaryRegions(state).filter(
    (region) =>
      region.source.sourcePlayer !== attacker.controller &&
      region.source.sourcePlayer === victim.controller &&
      sanctuaryCells(region.center).some(
        (cell) =>
          cell.file === victim.position.file && cell.rankIndex === victim.position.rankIndex,
      ),
  );
  return deepFreeze(
    CommittedCaptureContextSchema.parse(
      cloneData({
        kind: 'ordinary-committed-capture-v1',
        transactionId: event.transactionId,
        operationId: event.causeId,
        causeId,
        eventId: event.id,
        attackerId: attacker.id,
        capturingPlayer: attacker.controller,
        victimId: victim.id,
        victimController: victim.controller,
        destination: victim.position,
        terminal: state.terminal,
        regions,
      }),
    ),
  );
}

/** Called at the application boundary; a legitimately retired/ineligible attacker is an explicit skip. */
export function sanctuaryStunApplication(
  state: GameState,
  capture: CommittedCaptureContext,
): EffectApplication | null {
  const region = capture.regions[0];
  if (!region || capture.terminal.status !== 'ongoing')
    throw new Error('INVALID_COMMITTED_CAPTURE');
  const attacker = Object.hasOwn(state.board.pieces, capture.attackerId)
    ? state.board.pieces[capture.attackerId]
    : undefined;
  if (!attacker || attacker.origin !== 'ordinary-original' || attacker.currentType === 'king')
    return null;
  return {
    kind: 'effect_apply',
    definitionId: 'effect.stun',
    definitionVersion: '1.0.0',
    target: { kind: 'piece', pieceId: attacker.id },
    ...region.source,
    duration: {
      schemaVersion: '1.0.0',
      producerId: 'guardian.sanctuary.stun',
      producerVersion: '1.0.0',
      rounds: 1,
    },
    payload: {},
    groupId: null,
  };
}
