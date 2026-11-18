import { Component, computed, inject, signal } from '@angular/core';
import { CONNECTION_LABELS, ROLE_LABELS } from '../../core/knowledge';
import { BandMember } from '../../core/model';
import { MixStore } from '../../state/mix-store';
import { MemberEditor } from './member-editor';
import { SavedLineups } from './saved-lineups';

/** Which member form is open. Only one can be open at a time. */
type EditorState = { mode: 'closed' } | { mode: 'adding' } | { mode: 'editing'; memberId: string };

/** One line of the roster. It deliberately has no field for the chosen level (privacy). */
interface RosterRow {
  member: BandMember;
  roleSummaries: string[];
  isFirst: boolean;
  isLast: boolean;
}

@Component({
  selector: 'app-band-page',
  imports: [MemberEditor, SavedLineups],
  templateUrl: './band-page.html',
  styleUrl: './band-page.scss',
})
export class BandPage {
  protected readonly store = inject(MixStore);

  protected readonly editorState = signal<EditorState>({ mode: 'closed' });

  protected readonly isAdding = computed(() => this.editorState().mode === 'adding');

  /** The id of the member whose form is open, or null. */
  protected readonly editingMemberId = computed<string | null>(() => {
    const state = this.editorState();
    if (state.mode !== 'editing') {
      return null;
    }
    return state.memberId;
  });

  protected readonly rosterRows = computed<RosterRow[]>(() => {
    const band = this.store.band();
    const lastIndex = band.length - 1;
    return band.map((member, index) => {
      const roleSummaries = member.roles.map((memberRole) => {
        const roleLabel = ROLE_LABELS[memberRole.role];
        const connectionLabel = CONNECTION_LABELS[memberRole.connection];
        return `${roleLabel} (${connectionLabel})`;
      });
      return {
        member,
        roleSummaries,
        isFirst: index === 0,
        isLast: index === lastIndex,
      };
    });
  });

  protected startAdding(): void {
    this.editorState.set({ mode: 'adding' });
  }

  protected startEditing(memberId: string): void {
    this.editorState.set({ mode: 'editing', memberId });
  }

  protected closeEditor(): void {
    this.editorState.set({ mode: 'closed' });
  }

  protected onNewMemberSaved(member: BandMember): void {
    this.store.addMember(member);
    this.closeEditor();
  }

  protected onExistingMemberSaved(member: BandMember): void {
    this.store.updateMember(member);
    this.closeEditor();
  }

  protected removeMember(memberId: string): void {
    this.store.removeMember(memberId);
    if (this.editingMemberId() === memberId) {
      this.closeEditor();
    }
  }

  protected moveUp(memberId: string): void {
    this.store.moveMember(memberId, -1);
  }

  protected moveDown(memberId: string): void {
    this.store.moveMember(memberId, 1);
  }
}
