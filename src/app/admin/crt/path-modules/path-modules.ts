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
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ToastService } from '../../../core/services/toast';
import { CrtShell } from '../crt-shell/crt-shell';
import { CrtContentStatus, CrtDemoStore } from '../crt-demo.store';

@Component({
  selector: 'app-crt-path-modules',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, RouterLink, CrtShell],
  templateUrl: './path-modules.html',
  styleUrl: '../crt-admin.scss'
})
export class CrtPathModules implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CrtDemoStore);

  readonly filters = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'published', label: 'Published' }
  ] as const;

  readonly isLoading = signal(true);
  readonly pathId = signal('');
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

  readonly path = computed(() => this.store.pathById(this.pathId()));

  readonly pathModules = computed(() => this.store.modules()
    .filter((module) => module.pathId === this.pathId())
    .sort((a, b) => a.displayOrder - b.displayOrder || a.title.localeCompare(b.title)));

  readonly visibleModules = computed(() => {
    const query = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    return this.pathModules()
      .filter((module) => status === 'all' || module.status === status)
      .filter((module) => {
        if (!query) return true;
        return module.title.toLowerCase().includes(query)
          || module.description.toLowerCase().includes(query);
      });
  });

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('pathId') ?? '';
      this.pathId.set(id);
      if (id) this.store.selectPath(id);
      this.closeForm();
    });
    const timer = setTimeout(() => this.isLoading.set(false), 280);
    this.destroyRef.onDestroy(() => clearTimeout(timer));
  }

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  setFilter(id: 'all' | CrtContentStatus): void {
    this.statusFilter.set(id);
  }

  isFirst(moduleId: string): boolean {
    return this.pathModules()[0]?.id === moduleId;
  }

  isLast(moduleId: string): boolean {
    const modules = this.pathModules();
    return modules[modules.length - 1]?.id === moduleId;
  }

  openCreate(): void {
    const pathId = this.pathId();
    if (!this.store.pathById(pathId)) return;
    this.editingId.set(null);
    this.form.reset({
      title: '',
      description: '',
      displayOrder: this.store.nextModuleOrder(pathId),
      status: 'draft'
    });
    this.revealForm();
  }

  openEdit(id: string): void {
    const module = this.store.moduleById(id);
    if (!module) {
      this.toast.error('That module is no longer in the demonstration data.');
      return;
    }
    this.editingId.set(id);
    this.form.reset({
      title: module.title,
      description: module.description,
      displayOrder: module.displayOrder,
      status: module.status
    });
    this.revealForm();
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  move(moduleId: string, direction: -1 | 1): void {
    const moved = this.store.moveModule(this.pathId(), moduleId, direction);
    if (!moved) this.toast.info('That module is already at the end of the list.');
  }

  save(): void {
    const pathId = this.pathId();
    if (!this.store.pathById(pathId)) {
      this.toast.error('This learning path was not found.');
      return;
    }
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
      pathId,
      title: raw.title.trim(),
      description: raw.description.trim(),
      displayOrder,
      status: raw.status
    };
    const editingId = this.editingId();
    if (editingId) {
      const updated = this.store.updateModule(editingId, input);
      if (!updated) {
        this.toast.error('That module is no longer in the demonstration data.');
        return;
      }
      this.toast.success('Module updated');
    } else {
      this.store.createModule(input);
      this.toast.success('Module saved');
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
