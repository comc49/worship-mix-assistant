import { writeFileSync } from 'node:fs';
import { X32_PROFILE } from '../src/app/core/consoles';
import { buildMixPlan } from '../src/app/core/engine';
import { FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES } from '../src/app/core/testing/fixtures';
import { buildTroubleshootingReviewMarkdown, TroubleshootContext } from '../src/app/core/troubleshooter';

/**
 * Writes docs/troubleshooting-review.md: every troubleshooting tree in plain language,
 * filled in for the placeholder fixture band so no real name can end up in the file.
 */
export function writeTroubleshootingReview(): void {
  const context: TroubleshootContext = {
    band: FIXTURE_FULL_BAND,
    room: FIXTURE_LIVE_ROOM,
    serviceSetup: FIXTURE_WEDGES,
    plan: buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES),
    profile: X32_PROFILE,
    situation: 'rehearsal',
    target: null,
  };
  const markdown = buildTroubleshootingReviewMarkdown(context);
  writeFileSync('docs/troubleshooting-review.md', markdown);
}
