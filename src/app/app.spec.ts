import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('renders the app name, the navigation and the one-time storage notice', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Worship Mix Assistant');
    expect(element.querySelectorAll('nav a').length).toBe(7);
    expect(element.querySelector('[data-testid="storage-notice"]')).not.toBeNull();
  });
});
