import { planRadialReposition } from '@variant-chess/game-core';
import type { RulesetBundle, SkillPlanningContext, SkillPlan } from '@variant-chess/game-core';
import type { PlayerSide } from '@variant-chess/shared-types';
import { SKILL_AP_COSTS_V1 } from './config/skill-costs.js';

export const SHOCKWAVE_EXPERIMENTAL_PROFILE = Object.freeze({
  id: 'dragon-sentinel.shockwave-only.experimental',
  version: '1.0.0',
});
const cost = SKILL_AP_COSTS_V1['dragon_sentinel.shockwave'];

/** The selected center is a target, never a board-piece caster. Root owns AP/slot/IDs/commit. */
function planShockwave({ state, actor, command }: SkillPlanningContext): SkillPlan {
  if (actor !== state.turn.sideToAct) throw new Error('WRONG_TURN');
  const profile = state.playerProfiles[actor];
  if (
    profile?.id !== SHOCKWAVE_EXPERIMENTAL_PROFILE.id ||
    profile.version !== SHOCKWAVE_EXPERIMENTAL_PROFILE.version
  )
    throw new Error('UNAUTHORIZED_VARIANT');
  if (command.skillId !== 'dragon_sentinel.shockwave') throw new Error('NOT_AVAILABLE');
  if (state.turn.skillUsed) throw new Error('SKILL_USED');
  if (state.ap[actor] < cost) throw new Error('INSUFFICIENT_AP');
  if (command.intent?.kind !== 'piece-target-v1') throw new Error('INVALID_SKILL_INTENT');
  const moves = planRadialReposition(state, actor, command.intent.pieceId);
  if (!moves.length) throw new Error('NO_DISPLACEMENT');
  return {
    cost,
    operations: [
      {
        kind: 'forced_reposition',
        schemaVersion: '1.0.0',
        centerPieceId: command.intent.pieceId,
        cause: {
          kind: 'shockwave-v1',
          source: {
            sourcePlayer: actor,
            sourceVariant: 'dragon_sentinel',
            sourceSkill: 'dragon_sentinel.shockwave',
            sourcePiece: null,
            sourceIncarnation: null,
          },
        },
        moves: [...moves],
      },
    ],
  };
}

/** Trusted selections only. No effect/passive/setup, sibling or mixed-profile factory. */
export function createShockwaveExperimentalRuleset(
  enabled: Readonly<Record<PlayerSide, boolean>>,
): RulesetBundle {
  if (
    Object.keys(enabled).length !== 2 ||
    typeof enabled.white !== 'boolean' ||
    typeof enabled.black !== 'boolean'
  )
    throw new Error('INVALID_PROFILE_SELECTION');
  return Object.freeze({
    version: '1.0.0',
    hash: `experimental-dragon-sentinel-shockwave-v1-w${Number(enabled.white)}-b${Number(enabled.black)}`,
    playerProfiles: Object.freeze({
      white: enabled.white ? SHOCKWAVE_EXPERIMENTAL_PROFILE : null,
      black: enabled.black ? SHOCKWAVE_EXPERIMENTAL_PROFILE : null,
    }),
    forcedReposition: Object.freeze({
      kind: 'shockwave-v1',
      sourceVariant: 'dragon_sentinel',
      sourceSkill: 'dragon_sentinel.shockwave',
      requiredProfile: SHOCKWAVE_EXPERIMENTAL_PROFILE,
    } as const),
    skills: Object.freeze({
      'dragon_sentinel.shockwave': Object.freeze({
        requiredProfile: SHOCKWAVE_EXPERIMENTAL_PROFILE,
        plan: planShockwave,
      }),
    }),
  });
}
