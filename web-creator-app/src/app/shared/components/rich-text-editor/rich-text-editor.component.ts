import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './rich-text-editor.component.html',
  styleUrl: './rich-text-editor.component.scss'
})
export class RichTextEditorComponent implements AfterViewInit, OnChanges {
  @Input() label = '';
  @Input() value = '';
  @Input() minHeightClass = 'min-h-[140px]';
  @Output() valueChange = new EventEmitter<string>();

  @ViewChild('editor') private readonly editorRef?: ElementRef<HTMLDivElement>;

  readonly colors = ['#111827', '#d97706', '#0f766e', '#2563eb', '#db2777', '#7c3aed'];

  ngAfterViewInit(): void {
    this.syncValue();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.syncValue();
    }
  }

  format(command: string, value?: string): void {
    document.execCommand(command, false, value);
    this.emitValue();
    this.editorRef?.nativeElement.focus();
  }

  onInput(): void {
    this.emitValue();
  }

  private emitValue(): void {
    this.valueChange.emit(this.editorRef?.nativeElement.innerHTML ?? '');
  }

  private syncValue(): void {
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = this.value || '';
    }
  }
}
