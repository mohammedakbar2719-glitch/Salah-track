/**
 * SalahTrack — Daily Reflection Notes Component
 */

window.SalahTrack = window.SalahTrack || {};

(function(ST) {
  'use strict';

  class NotesViewRenderer {
    constructor(containerEl) {
      this.container = containerEl;
      this.debounceTimer = null;
    }

    render(record) {
      if (!this.container) return;
      const noteText = record.note || '';

      this.container.innerHTML = `
        <div class="notes-card">
          <div class="notes-header">
            <span class="notes-title">
              ${ST.DOM.getIcon('edit')}
              <span>Daily Reflection & Du’a</span>
            </span>
            <span class="notes-status" id="notes-save-status">Saved</span>
          </div>
          <textarea 
            class="notes-textarea" 
            id="daily-note-input" 
            placeholder="Record a Quran verse, moment of Khushu', or spiritual gratitude for today..."
            aria-label="Daily spiritual reflection note"
          >${noteText}</textarea>
        </div>
      `;

      const input = this.container.querySelector('#daily-note-input');
      const statusEl = this.container.querySelector('#notes-save-status');

      if (input) {
        input.addEventListener('input', () => {
          if (statusEl) statusEl.textContent = 'Saving...';
          clearTimeout(this.debounceTimer);
          this.debounceTimer = setTimeout(() => {
            ST.state.saveNote(input.value);
            if (statusEl) statusEl.textContent = 'Saved';
          }, 450);
        });
      }
    }
  }

  ST.NotesViewRenderer = NotesViewRenderer;
})(window.SalahTrack);
