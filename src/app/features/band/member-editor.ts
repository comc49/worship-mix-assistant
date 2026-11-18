import { afterNextRender, Component, computed, ElementRef, input, linkedSignal, output, signal, viewChild } from '@angular/core';
import { CONNECTION_LABELS, connectionsForRole, MIC_MODELS, ROLE_LABELS } from '../../core/knowledge';
import { BandMember, MemberRole, ROLES, SkillLevel, SourceConnection, VocalDetails, VOICE_RANGES, VoiceRange } from '../../core/model';
import {
  BehaviorOption,
  behaviorOptionsForRole,
  changeRole,
  cleanMemberForSaving,
  createEmptyMember,
  createMemberRole,
  parseConnection,
  parseMicModelId,
  parseRole,
  parseVoiceRange,
} from './band-draft';

/** Everything the template needs to draw one role of the member being edited. */
interface RoleView {
  memberRole: MemberRole;
  connections: SourceConnection[];
  behaviorOptions: BehaviorOption[];
  vocal: VocalDetails | null;
  showMicFreeText: boolean;
}

const VOICE_RANGE_LABELS: Record<VoiceRange, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

/**
 * The form for one band member. It edits a private copy (the draft) and only hands it back
 * through `saved`, so Cancel never changes the roster.
 */
@Component({
  selector: 'app-member-editor',
  templateUrl: './member-editor.html',
  styleUrl: './member-editor.scss',
})
export class MemberEditor {
  /** The member to edit, or null to add a new one. */
  readonly member = input<BandMember | null>(null);

  readonly saved = output<BandMember>();
  readonly cancelled = output<void>();

  protected readonly roles = ROLES;
  protected readonly roleLabels = ROLE_LABELS;
  protected readonly connectionLabels = CONNECTION_LABELS;
  protected readonly voiceRanges = VOICE_RANGES;
  protected readonly voiceRangeLabels = VOICE_RANGE_LABELS;
  protected readonly micModels = MIC_MODELS;

  /** The private copy being edited. It starts over whenever a different member is passed in. */
  protected readonly draft = linkedSignal<BandMember>(() => {
    const member = this.member();
    if (member === null) {
      return createEmptyMember();
    }
    return structuredClone(member);
  });

  protected readonly isNewMember = computed(() => this.member() === null);
  protected readonly nameError = signal<string | null>(null);

  protected readonly roleViews = computed<RoleView[]>(() => {
    return this.draft().roles.map((memberRole) => {
      const vocal = memberRole.vocal;
      const showMicFreeText = vocal !== null && vocal.micModel === 'other';
      return {
        memberRole,
        connections: connectionsForRole(memberRole.role),
        behaviorOptions: behaviorOptionsForRole(memberRole.role),
        vocal,
        showMicFreeText,
      };
    });
  });

  private readonly nameInput = viewChild.required<ElementRef<HTMLInputElement>>('nameInput');

  constructor() {
    // The editor opens after a button press, so move the keyboard focus into it.
    afterNextRender(() => {
      this.nameInput().nativeElement.focus();
    });
  }

  protected onNameInput(event: Event): void {
    const name = (event.target as HTMLInputElement).value;
    this.draft.update((draft) => ({ ...draft, name }));
    if (name.trim() !== '') {
      this.nameError.set(null);
    }
  }

  protected onRoleChange(roleIndex: number, event: Event): void {
    const role = parseRole((event.target as HTMLSelectElement).value);
    if (role === null) {
      return;
    }
    const current = this.draft().roles[roleIndex];
    this.replaceRole(roleIndex, changeRole(current, role));
  }

  protected onConnectionChange(roleIndex: number, event: Event): void {
    const current = this.draft().roles[roleIndex];
    const allowed = connectionsForRole(current.role);
    const connection = parseConnection((event.target as HTMLSelectElement).value, allowed);
    if (connection === null) {
      return;
    }
    this.replaceRole(roleIndex, { ...current, connection });
  }

  protected onBehaviorChosen(roleIndex: number, level: SkillLevel): void {
    const current = this.draft().roles[roleIndex];
    this.replaceRole(roleIndex, { ...current, skill: level });
  }

  protected onVoiceRangeChange(roleIndex: number, event: Event): void {
    const voiceRange = parseVoiceRange((event.target as HTMLSelectElement).value);
    if (voiceRange === null) {
      return;
    }
    this.patchVocal(roleIndex, { voiceRange });
  }

  protected onMicModelChange(roleIndex: number, event: Event): void {
    const micModel = parseMicModelId((event.target as HTMLSelectElement).value);
    if (micModel === null) {
      return;
    }
    this.patchVocal(roleIndex, { micModel });
  }

  protected onMicFreeTextInput(roleIndex: number, event: Event): void {
    const micModelFreeText = (event.target as HTMLInputElement).value;
    this.patchVocal(roleIndex, { micModelFreeText });
  }

  /** A member can sing and play: each extra role becomes its own channel. */
  protected addRole(): void {
    const usedRoles = this.draft().roles.map((memberRole) => memberRole.role);
    const firstUnusedRole = ROLES.find((role) => !usedRoles.includes(role)) ?? ROLES[0];
    const added = createMemberRole(firstUnusedRole);
    this.draft.update((draft) => ({ ...draft, roles: [...draft.roles, added] }));
  }

  protected removeRole(roleIndex: number): void {
    const hasOnlyOneRole = this.draft().roles.length <= 1;
    if (hasOnlyOneRole) {
      return;
    }
    this.draft.update((draft) => {
      const roles = draft.roles.filter((_, index) => index !== roleIndex);
      return { ...draft, roles };
    });
  }

  protected save(event: Event): void {
    event.preventDefault();
    const cleaned = cleanMemberForSaving(this.draft());
    if (cleaned.name === '') {
      this.nameError.set('Enter a name, so this person can be found on the sheet.');
      this.nameInput().nativeElement.focus();
      return;
    }
    this.saved.emit(cleaned);
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private replaceRole(roleIndex: number, replacement: MemberRole): void {
    this.draft.update((draft) => {
      const roles = draft.roles.map((memberRole, index) => (index === roleIndex ? replacement : memberRole));
      return { ...draft, roles };
    });
  }

  private patchVocal(roleIndex: number, change: Partial<VocalDetails>): void {
    const current = this.draft().roles[roleIndex];
    if (current.vocal === null) {
      return;
    }
    const vocal: VocalDetails = { ...current.vocal, ...change };
    this.replaceRole(roleIndex, { ...current, vocal });
  }
}
