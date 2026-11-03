import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
  viewChild
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast';
import { CrtShell } from '../crt-shell/crt-shell';
import { CrtContentStatus, CrtDemoStore } from '../crt-demo.store';

@Component({
  selector: 'app-crt-learning-paths',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, CrtShell],
  templateUrl: './learning-paths.html',
  styleUrl: '../crt-admin.scss'
})
export class CrtLearningPaths implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CrtDemoStore);

  readonly filters = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'published', label: 'Published' }
  ] as const;

  readonly isLoading = signal(true);
  readonly query = signal('');
  readonly statusFilter = signal<'all' | CrtContentStatus>('all');
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  private readonly formHost = viewChild<ElementRef<HTMLElement>>('formHost');

  readonly form = this.fb.nonNullable.group({
    title: ['', [Validators.required, Validators.minLength(2)]],
    description: [''],
    displayOrder: [1, [Validators.required, Validators.min(1)]],
    status: ['draft' as CrtContentStatus, Validators.required]
  });

  readonly visiblePaths = computed(() => {
    const query = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    return this.store.paths()
      .filter((path) => status === 'all' || path.status === status)
      .filter((path) => {
        if (!query) return true;
        return path.title.toLowerCase().includes(query)
          || path.description.toLowerCase().includes(query);
      })
      .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title));
  });

  ngOnInit(): void {
    const timer = setTimeout(() => this.isLoading.set(false), 280);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  setFilter(id: 'all' | CrtContentStatus): void {
    this.statusFilter.set(id);
  }

  openCreate(): void {
    this.editingId.set(null);
    this.form.reset({
      title: '',
      description: '',
      displayOrder: this.store.nextPathOrder(),
      status: 'draft'
    });
    this.revealForm();
  }

  openEdit(id: string): void {
    const path = this.store.pathById(id);
    if (!path) {
      this.toast.error('That learning path is no longer in the demonstration data.');
      return;
    }
    this.editingId.set(id);
    this.form.reset({
      title: path.title,
      description: path.description,
      displayOrder: path.displayOrder,
      status: path.status
    });
    this.revealForm();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  openModules(pathId: string): void {
    this.store.selectPath(pathId);
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Check the highlighted fields.');
      return;
    }

    const raw = this.form.getRawValue();
    const displayOrder = Number(raw.displayOrder);
    if (!Number.isInteger(displayOrder) || displayOrder < 1) {
      this.toast.error('Display order must be a whole number of at least 1.');
      return;
    }

    const input = {
      title: raw.title.trim(),
      description: raw.description.trim(),
      displayOrder,
      status: raw.status
    };
    const editingId = this.editingId();
    if (editingId) {
      const updated = this.store.updatePath(editingId, input);
      if (!updated) {
        this.toast.error('That learning path is no longer in the demonstration data.');
        return;
      }
      this.toast.success('Learning path updated');
    } else {
      this.store.createPath(input);
      this.toast.success('Learning path saved');
    }
    this.closeForm();
  }

  private revealForm(): void {
    this.showForm.set(true);
    const timer = setTimeout(() => {
      this.formHost()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }
}
