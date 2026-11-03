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
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmDialogService } from '../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../core/services/toast';
import { CrtShell } from '../crt-shell/crt-shell';
import {
  CrtAnswer,
  CrtContentStatus,
  CrtDemoStore,
  CrtDifficulty,
  CrtQuestion
} from '../crt-demo.store';

@Component({
  selector: 'app-crt-questions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, CrtShell],
  templateUrl: './crt-questions.html',
  styleUrl: '../crt-admin.scss'
})
export class CrtQuestions implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastService);
  private readonly confirmDialog = inject(ConfirmDialogService);
  private readonly destroyRef = inject(DestroyRef);
  readonly store = inject(CrtDemoStore);

  readonly filters = [
    { id: 'all', label: 'All' },
    { id: 'draft', label: 'Draft' },
    { id: 'published', label: 'Published' }
  ] as const;

  readonly answers: CrtAnswer[] = ['A', 'B', 'C', 'D'];
  readonly difficulties: { id: CrtDifficulty; label: string }[] = [
    { id: 'easy', label: 'Easy' },
    { id: 'medium', label: 'Medium' },
    { id: 'hard', label: 'Hard' }
  ];

  readonly isLoading = signal(true);
  readonly query = signal('');
  readonly statusFilter = signal<'all' | CrtContentStatus>('all');
  readonly moduleFilter = signal('');
  readonly showForm = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly previewId = signal<string | null>(null);
  private readonly formHost = viewChild<ElementRef<HTMLElement>>('formHost');

  readonly form = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.minLength(5)]],
    optionA: ['', Validators.required],
    optionB: ['', Validators.required],
    optionC: ['', Validators.required],
    optionD: ['', Validators.required],
    correct: ['' as CrtAnswer | '', Validators.required],
    moduleId: ['', Validators.required],
    topic: ['', Validators.required],
    difficulty: ['easy' as CrtDifficulty, Validators.required],
    status: ['draft' as CrtContentStatus, Validators.required]
  });

  readonly moduleChoices = computed(() => this.store.modules()
    .map((module) => ({
      id: module.id,
      label: `${this.store.pathTitle(module.pathId)} — ${module.title}`
    }))
    .sort((a, b) => a.label.localeCompare(b.label)));

  readonly preview = computed(() => {
    const id = this.previewId();
    return id ? this.store.questionById(id) : undefined;
  });

  readonly moduleFilterLabel = computed(() => {
    const id = this.moduleFilter();
    if (!id) return '';
    const module = this.store.moduleById(id);
    return module ? `${this.store.pathTitle(module.pathId)} — ${module.title}` : '';
  });

  readonly moduleFilterError = computed(() => {
    const id = this.moduleFilter();
    if (!id || this.isLoading()) return '';
    return this.store.moduleById(id) ? '' : 'That module was not found in the demonstration data.';
  });

  readonly visibleQuestions = computed(() => {
    const query = this.query().trim().toLowerCase();
    const status = this.statusFilter();
    const moduleId = this.moduleFilter();
    return this.store.questions().filter((question) => {
      if (moduleId && question.moduleId !== moduleId) return false;
      if (status !== 'all' && question.status !== status) return false;
      if (!query) return true;
      const moduleTitle = this.store.moduleTitle(question.moduleId).toLowerCase();
      return question.text.toLowerCase().includes(query)
        || question.topic.toLowerCase().includes(query)
        || moduleTitle.includes(query);
    });
  });

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.moduleFilter.set(params.get('moduleId') ?? '');
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

  clearModuleFilter(): void {
    void this.router.navigate(['/admin/crt/questions']);
  }

  openCreate(): void {
    if (this.store.modules().length === 0) {
      this.toast.error('Add a module before creating a question.');
      return;
    }
    this.previewId.set(null);
    this.editingId.set(null);
    const preferred = this.moduleFilter();
    const moduleId = this.store.moduleById(preferred) ? preferred : this.store.modules()[0].id;
    this.form.reset({
      text: '',
      optionA: '',
      optionB: '',
      optionC: '',
      optionD: '',
      correct: '',
      moduleId,
      topic: '',
      difficulty: 'easy',
      status: 'draft'
    });
    this.revealForm();
  }

  openEdit(id: string): void {
    const question = this.store.questionById(id);
    if (!question) {
      this.toast.error('That question is no longer in the demonstration data.');
      return;
    }
    this.previewId.set(null);
    this.editingId.set(id);
    this.form.reset({
      text: question.text,
      optionA: question.optionA,
      optionB: question.optionB,
      optionC: question.optionC,
      optionD: question.optionD,
      correct: question.correct,
      moduleId: question.moduleId,
      topic: question.topic,
      difficulty: question.difficulty,
      status: question.status
    });
    this.revealForm();
  }

  openPreview(id: string): void {
    if (!this.store.questionById(id)) {
      this.toast.error('That question is no longer in the demonstration data.');
      return;
    }
    this.showForm.set(false);
    this.editingId.set(null);
    this.previewId.set(id);
  }

  closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  closePreview(): void {
    this.previewId.set(null);
  }

  async remove(question: CrtQuestion): Promise<void> {
    const confirmed = await this.confirmDialog.confirm({
      title: 'Delete question',
      message: 'Delete this question from the demonstration question bank?',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!confirmed) return;
    this.store.deleteQuestion(question.id);
    if (this.editingId() === question.id) this.closeForm();
    if (this.previewId() === question.id) this.closePreview();
    this.toast.success('Question deleted');
  }

  save(): void {
    if (this.form.invalid || !this.form.controls.correct.value) {
      this.form.markAllAsTouched();
      this.toast.error('Check the highlighted fields.');
      return;
    }
    const raw = this.form.getRawValue();
    if (!this.store.moduleById(raw.moduleId)) {
      this.toast.error('Choose a module that still exists.');
      return;
    }
    const correct = raw.correct;
    if (correct !== 'A' && correct !== 'B' && correct !== 'C' && correct !== 'D') {
      this.toast.error('Select the correct answer.');
      return;
    }

    const input = {
      text: raw.text.trim(),
      optionA: raw.optionA.trim(),
      optionB: raw.optionB.trim(),
      optionC: raw.optionC.trim(),
      optionD: raw.optionD.trim(),
      correct,
      moduleId: raw.moduleId,
      topic: raw.topic.trim(),
      difficulty: raw.difficulty,
      status: raw.status
    };
    if (!input.text || !input.optionA || !input.optionB || !input.optionC || !input.optionD || !input.topic) {
      this.form.markAllAsTouched();
      this.toast.error('Check the highlighted fields.');
      return;
    }

    const editingId = this.editingId();
    if (editingId) {
      const updated = this.store.updateQuestion(editingId, input);
      if (!updated) {
        this.toast.error('That question is no longer in the demonstration data.');
        return;
      }
      this.toast.success('Question updated');
    } else {
      this.store.createQuestion(input);
      this.toast.success('Question saved');
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
