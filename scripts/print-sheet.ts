import { ConsoleSheet, toWingCompact, toX32 } from '../src/app/core/consoles';
import { buildMixPlan } from '../src/app/core/engine';
import { FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES } from '../src/app/core/testing/fixtures';

/** Prints the console sheet for the full fixture band as readable text. Pass "wing" for the WING Compact. */

export function renderSheetAsText(sheet: ConsoleSheet): string {
  const lines: string[] = [];
  lines.push(`${sheet.consoleName.toUpperCase()} SETUP SHEET`);
  lines.push(sheet.disclaimer, '');
  lines.push('WARNINGS');
  sheet.warnings.forEach((warning) => lines.push(`  [${warning.kind}] ${warning.message}`));
  lines.push('', 'DO NOT TOUCH');
  sheet.doNotTouch.forEach((item) => lines.push(`  - ${item}`));
  lines.push('', 'BUSES');
  sheet.busMap.forEach((bus) => lines.push(`  ${bus.busNumbers.join('+').padEnd(6)} ${bus.purpose.padEnd(11)} ${bus.label}`));
  lines.push('', 'FX SLOTS');
  sheet.fxMap.forEach((fx) => lines.push(`  ${String(fx.slot).padEnd(3)} ${fx.role.padEnd(7)} ${fx.effectName} (${fx.label})`));

  for (const section of sheet.sections) {
    lines.push('', `=== ${section.title.toUpperCase()} ===`, section.intro);
    let lastSubject = '';
    for (const step of section.steps) {
      if (step.subject !== lastSubject) {
        lines.push(`  ${step.subject}`);
        lastSubject = step.subject;
      }
      const flags: string[] = [];
      if (step.safety === 'rehearsalOnly') {
        flags.push('rehearsal only');
      }
      if (step.optional) {
        flags.push('optional');
      }
      if (step.checkOnConsole !== null) {
        flags.push('CHECK ON YOUR CONSOLE');
      }
      const flagText = flags.length > 0 ? `  [${flags.join(', ')}]` : '';
      lines.push(`    [ ] ${step.instruction}${flagText}`);
      step.subSteps.forEach((subStep) => lines.push(`          - ${subStep}`));
    }
  }
  return lines.join('\n');
}

const plan = buildMixPlan(FIXTURE_FULL_BAND, FIXTURE_LIVE_ROOM, FIXTURE_WEDGES);
const result = process.argv.includes('wing') ? toWingCompact(plan) : toX32(plan);
if (result.ok) {
  console.log(renderSheetAsText(result.sheet));
} else {
  console.log(result.errors.join('\n'));
}
