import { buildMixPlan, formatValue } from '../src/app/core/engine';
import { NumericSetting } from '../src/app/core/model';
import { FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES } from '../src/app/core/testing/fixtures';

/** Prints the MixPlan for the first fixture (full band, live room, wedges) as readable text. */

function describe(setting: NumericSetting): string {
  const trail = setting.provenance.map((step) => `${step.source}: ${step.description}`).join(' | ');
  return `${formatValue(setting.value, setting.unit)}  (range ${setting.range.min} to ${setting.range.max})  <- ${trail}`;
}

const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);

console.log('MIX PLAN: full fixture band, live room, wedges\n');
for (const channel of plan.channels) {
  console.log(`== ${channel.roleLabel} (${channel.memberName})${channel.stereo ? ' [stereo]' : ''}`);
  console.log(`   Low cut: ${channel.lowCut === null ? 'off' : describe(channel.lowCut)}`);
  if (channel.gate !== null) {
    console.log(`   Gate: range ${describe(channel.gate.rangeDb)}`);
  }
  if (channel.compressor !== null) {
    console.log(`   Comp ratio: ${describe(channel.compressor.ratio)}`);
    console.log(`   Comp attack: ${describe(channel.compressor.attackMs)}`);
    console.log(`   Comp release: ${describe(channel.compressor.releaseMs)}`);
    console.log(`   Comp gain reduction: ${describe(channel.compressor.gainReductionDb)}`);
    console.log(`   Makeup: ${channel.compressor.makeupGain.value}`);
  }
  console.log(`   Level: ${describe(channel.level)}`);
  for (const send of channel.fxSends) {
    console.log(`   FX ${send.effectId}: ${describe(send.levelDb)}`);
  }
  console.log(`   Monitors: ${channel.monitorSends.map((send) => `${send.mixId} ${send.levelDb.value} dB`).join(', ')}`);
  console.log(`   DCAs: ${channel.dcaIds.join(', ') || 'none'}; group bus: ${channel.groupBusId ?? 'none'}; sub send: ${channel.sendToSubBus}`);
  for (const cut of channel.suggestedCuts) {
    console.log(`   Optional cut: ${cut.label} ${cut.gainDb} dB at ${cut.frequencyHz} Hz (${cut.q})`);
  }
  for (const note of channel.mixerNotes) {
    console.log(`   Mixer note: ${note}`);
  }
  for (const note of channel.coachingNotes) {
    console.log(`   Coaching: ${note}`);
  }
}
console.log('\nSEND EFFECTS');
for (const effect of plan.sendEffects) {
  console.log(`  ${effect.priority}. ${effect.label}: ${effect.timeSeconds === null ? effect.timeNote : describe(effect.timeSeconds)}`);
}
console.log('\nINSERT EFFECTS');
for (const effect of plan.insertEffects) {
  console.log(`  ${effect.priority}. ${effect.label}`);
}
console.log('\nGROUP BUS WISHES');
for (const wish of plan.groupBuses) {
  console.log(`  ${wish.priority}. ${wish.label} (${wish.preferredWidth}): ${wish.memberChannelIds.length} channels`);
}
console.log('\nDCAS');
for (const dca of plan.dcas) {
  console.log(`  ${dca.label}: ${dca.holdsFxReturns ? 'all effect returns' : dca.memberChannelIds.join(', ') || '(empty)'}`);
}
console.log('\nMONITOR MIXES');
for (const mix of plan.monitorMixes) {
  console.log(`  ${mix.label} -> ${mix.forMemberNames.join(', ')}`);
}
console.log('\nSOUNDCHECK');
plan.soundcheck.forEach((step, index) => console.log(`  ${index + 1}. ${step.title}`));
console.log('\nBAND ADVICE');
plan.ensembleAdvice.forEach((advice) => console.log(`  - ${advice}`));
console.log('\nWARNINGS');
plan.warnings.forEach((warning) => console.log(`  - ${warning.message}`));
