import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ValueDetail } from '../../shared/value-detail';
import { MixStore } from '../../state/mix-store';
import { buildOverviewCards, OverviewCard } from './overview-cards';

/** The whole mix at a glance: one card per channel, console-neutral, with the console channel number added. */
@Component({
  selector: 'app-overview-page',
  imports: [RouterLink, ValueDetail],
  templateUrl: './overview-page.html',
  styleUrl: './overview-page.scss',
})
export class OverviewPage {
  protected readonly store = inject(MixStore);

  protected readonly hasBand = computed(() => this.store.band().length > 0);

  protected readonly cards = computed<OverviewCard[]>(() => buildOverviewCards(this.store.mixPlan(), this.store.sheet()));
}
