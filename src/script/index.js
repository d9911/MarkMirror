// MarkMirror Mobile - Main Application
// A powerful Markdown editor with dual-panel interface

import { PreviewPanel } from '../ui/preview.js';
import { Storage } from '../utils/storage.js';
import { FileHandler } from '../utils/fileHandler.js';
import { SimpleEditor } from '../ui/simpleEditor.js';
import { Analytics } from '../utils/analytics.js';
import { AnalyticsPanel } from '../ui/analyticsPanel.js';
import { PWAManager } from '../utils/pwa.js';
import { SearchReplace } from '../ui/searchReplace.js';

class MarkMirrorApp {
  constructor() {
    this.editor = null;
    this.preview = null;
    this.searchReplace = null;
    this.storage = new Storage();
    this.fileHandler = new FileHandler();
    this.analytics = new Analytics();
    this.analyticsPanel = new AnalyticsPanel(this.analytics);
    this.pwaManager = new PWAManager();
    this.settings = this.storage.loadSettings();
    this.autoSaveTimer = null;
    this.currentTheme = this.settings.theme;
    this.lastContent = '';

    this.init();
  }

  // Initialize the application
  async init() {
    try {
      this.showLoading(true);

      // Wait for DOM to be ready
      if (document.readyState === 'loading') {
        await new Promise(resolve => {
          document.addEventListener('DOMContentLoaded', resolve);
        });
      }

      // Initialize components
      this.initializeTheme();
      await this.initializeEditor();
      this.initializePreview();
      this.initializeUI();
      this.initializeSearchReplace();
      this.initializeEditorActions();
      this.loadSavedContent();
      this.setupAutoSave();

      // Force scroll setup after everything is loaded
      setTimeout(() => {
        this.forceScrollSetup();
      }, 1000);

      this.showLoading(false);

      console.log('MarkMirror Mobile initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MarkMirror:', error);
      this.showError('Failed to initialize application');
    }
  }

  // Initialize theme system
  initializeTheme() {
    // Detect system theme preference
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Set initial theme
    if (this.settings.theme === 'auto') {
      this.currentTheme = prefersDark ? 'dark' : 'light';
    } else {
      this.currentTheme = this.settings.theme;
    }

    this.applyTheme(this.currentTheme);

    // Listen for system theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
      if (this.settings.theme === 'auto') {
        this.currentTheme = e.matches ? 'dark' : 'light';
        this.applyTheme(this.currentTheme);
      }
    });
  }

  // Apply theme to the application
  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);

    // Update theme toggle button
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.innerHTML = theme === 'dark'
        ? '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4V2m0 20v-2M4 12H2m20 0h-2M5.64 5.64 4.22 4.22m15.56 15.56-1.42-1.42m0-12.72 1.42-1.42M4.22 19.78l1.42-1.42M17 12a5 5 0 1 1-10 0 5 5 0 0 1 10 0Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>'
        : '<svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.7 15.1A9 9 0 0 1 8.9 3.3 9 9 0 1 0 20.7 15.1Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
      themeToggle.title = theme === 'dark' ? 'Переключить на светлую тему' : 'Переключить на тёмную тему';
    }
  }

  // Initialize the editor
  async initializeEditor() {
    const container = document.getElementById('editor-container');
    if (!container) {
      throw new Error('Editor container not found');
    }

    // Create wrapper for editor to separate it from action bar
    const editorWrapper = document.createElement('div');
    editorWrapper.className = 'editor-wrapper';
    container.appendChild(editorWrapper);

    // Try to use CodeMirror first, fallback to simple editor
    try {
      // Dynamically import CodeMirror editor
      const { MarkdownEditor } = await import('../ui/editor.js');
      this.editor = new MarkdownEditor(editorWrapper, {
        theme: this.currentTheme,
        autoComplete: this.settings.autoComplete,
        onChange: content => this.handleContentChange(content),
        onScroll: scrollInfo => this.handleEditorScroll(scrollInfo),
      });
      console.log('CodeMirror editor initialized');
    } catch (error) {
      console.warn('CodeMirror failed to load, using simple editor:', error);
      // Use simple editor as fallback
      this.editor = new SimpleEditor(editorWrapper, {
        theme: this.currentTheme,
        autoComplete: this.settings.autoComplete,
        onChange: content => this.handleContentChange(content),
        onScroll: scrollInfo => this.handleEditorScroll(scrollInfo),
      });
      console.log('Simple editor initialized');
    }
  }

  // Initialize the preview panel
  initializePreview() {
    const plainTextContainer = document.getElementById('plain-text-output');
    const htmlContainer = document.getElementById('html-output');

    if (!plainTextContainer || !htmlContainer) {
      throw new Error('Preview containers not found');
    }

    this.preview = new PreviewPanel({
      plainTextContainer,
      htmlContainer,
      syncScroll: this.settings.syncScroll,
      zoom: this.settings.previewZoom,
      useExternalParser: this.settings.useExternalParser,
      showMarkdownHighlight: this.settings.markdownHighlight,
    });
  }

  // Initialize UI event handlers
  initializeUI() {
    this.setupFileControls();
    this.setupSettingsPanel();
    this.setupAnalyticsPanel();
    this.setupMobileTabs();
    this.setupHelpModal();
    this.setupKeyboardShortcuts();
  }

  // Initialize search and replace functionality
  initializeSearchReplace() {
    if (this.editor) {
      this.searchReplace = new SearchReplace(this.editor);

      // Make search available globally for EditorActions integration
      window.EditorSearch = this.searchReplace;

      console.log('Search and Replace initialized');
    } else {
      console.warn('Cannot initialize Search and Replace: editor not available');
    }
  }

  // Initialize editor actions (floating action bar and settings persistence)
  initializeEditorActions() {
    try {
      // Wait for EditorActions to be available and editor to be initialized
      setTimeout(() => {
        if (typeof window.EditorActions !== 'undefined' && this.editor) {
          // Find the actual editor element in the DOM
          let editorElement = null;
          let editorSelector = '';

          // Try to find CodeMirror editor first
          const cmEditor = document.querySelector('#editor-container .editor-wrapper .cm-editor');
          if (cmEditor) {
            editorElement = cmEditor;
            editorSelector = '#editor-container .editor-wrapper .cm-editor';
            console.log('Found CodeMirror editor');
          } else {
            // Try to find SimpleEditor (textarea)
            const textarea = document.querySelector('#editor-container .editor-wrapper textarea');
            if (textarea) {
              editorElement = textarea;
              editorSelector = '#editor-container .editor-wrapper textarea';
              console.log('Found SimpleEditor textarea');
            } else {
              // Fallback: try to find any textarea or contenteditable in editor wrapper
              const fallback = document.querySelector('#editor-container .editor-wrapper textarea, #editor-container .editor-wrapper [contenteditable]');
              if (fallback) {
                editorElement = fallback;
                editorSelector = '#editor-container .editor-wrapper textarea, #editor-container .editor-wrapper [contenteditable]';
                console.log('Found fallback editor element');
              }
            }
          }

          if (editorElement) {
            window.EditorActions.init({
              editorSelector: editorSelector,
              settingsSelector: '#settings-content',
              searchApi: window.EditorSearch // Use global reference
            });

            // Setup event listeners for EditorActions
            this.setupEditorActionsEvents();

            console.log('EditorActions initialized successfully with selector:', editorSelector);
            console.log('Editor element found:', editorElement);

            // Double-check that action bar was created
            setTimeout(() => {
              const actionBar = document.querySelector('.editor-actions-bar');
              const editorContainer = document.getElementById('editor-container');

              console.log('=== Action Bar Check ===');
              console.log('Action bar found:', !!actionBar);
              console.log('Editor container found:', !!editorContainer);

              if (actionBar) {
                console.log('Action bar parent:', actionBar.parentElement?.id || actionBar.parentElement?.className);
                console.log('Action bar classes:', actionBar.className);
                console.log('Action bar visible:', !actionBar.classList.contains('hidden'));
                console.log('Action bar position:', getComputedStyle(actionBar).position);
                console.log('Action bar bottom:', getComputedStyle(actionBar).bottom);
                console.log('Action bar buttons:', actionBar.querySelectorAll('.action-btn').length);
              }

              if (!actionBar) {
                console.warn('Action bar not found after initialization, attempting manual creation');
                this.createActionBarManually();
              } else {
                console.log('Action bar successfully created and configured');

                // Apply settings to main settings panel
                if (window.EditorActions && window.EditorActions.applySettingsToDOM) {
                  window.EditorActions.applySettingsToDOM();
                }
              }
            }, 500);
          } else {
            console.error('No editor element found for EditorActions');
            console.log('Available elements in #editor-container:',
              document.querySelector('#editor-container')?.innerHTML);
          }
        } else {
          console.warn('EditorActions not available or editor not ready');
        }
      }, 1000); // Increased delay to ensure editor is fully initialized
    } catch (error) {
      console.error('Failed to initialize EditorActions:', error);
    }
  }

  // Setup event listeners for EditorActions
  setupEditorActionsEvents() {
    const editorContainer = document.getElementById('editor-container');
    if (!editorContainer) return;

    // Listen for paste events
    editorContainer.addEventListener('editoractions:pasted', (e) => {
      console.log('Text pasted via EditorActions:', e.detail.text.length, 'characters');
      // Trigger content change handling
      this.handleContentChange(this.editor.getContent());
    });

    // Listen for copy events
    editorContainer.addEventListener('editoractions:copied', (e) => {
      console.log('Text copied via EditorActions:', e.detail.wasSelection ? 'selection' : 'all content');
    });

    // Listen for clear events
    editorContainer.addEventListener('editoractions:cleared', (e) => {
      console.log('Content cleared via EditorActions:', e.detail.type);
      // Trigger content change handling
      this.handleContentChange(this.editor.getContent());
    });
  }

  // Manual action bar creation as fallback
  createActionBarManually() {
    // Check if action bar already exists
    if (document.querySelector('.editor-actions-bar')) {
      return;
    }

    console.log('Creating action bar manually...');

    // Find editor container
    const editorContainer = document.getElementById('editor-container');
    if (!editorContainer) {
      console.error('Editor container not found for manual action bar creation');
      return;
    }

    const actionBar = document.createElement('div');
    actionBar.className = 'editor-actions-bar';
    actionBar.innerHTML = `
      <button type="button" class="action-btn paste-btn" aria-label="Paste from clipboard" tabindex="0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,20H5V4H7V7H17V4H19M12,2A1,1 0 0,1 13,3A1,1 0 0,1 12,4A1,1 0 0,1 11,3A1,1 0 0,1 12,2M19,2H14.82C14.4,0.84 13.3,0 12,0C10.7,0 9.6,0.84 9.18,2H5A2,2 0 0,0 3,4V20A2,2 0 0,0 5,22H19A2,2 0 0,0 21,20V4A2,2 0 0,0 19,2Z"/>
        </svg>
        <span>Paste</span>
      </button>
      <button type="button" class="action-btn copy-btn" aria-label="Copy selected text" tabindex="0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,21H8V7H19M19,5H8A2,2 0 0,0 6,7V21A2,2 0 0,0 8,23H19A2,2 0 0,0 21,21V7A2,2 0 0,0 19,5M16,1H4A2,2 0 0,0 2,3V17H4V3H16V1Z"/>
        </svg>
        <span>Copy</span>
      </button>
      <button type="button" class="action-btn clear-btn" aria-label="Clear content" tabindex="0">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z"/>
        </svg>
        <span>Clear</span>
      </button>
    `;

    // Append to editor container at the end (not absolutely positioned)
    editorContainer.appendChild(actionBar);

    // Setup event listeners
    this.setupManualActionBarListeners(actionBar);

    console.log('Manual action bar created successfully in editor container');
  }

  // Setup listeners for manually created action bar
  setupManualActionBarListeners(actionBar) {
    const pasteBtn = actionBar.querySelector('.paste-btn');
    const copyBtn = actionBar.querySelector('.copy-btn');
    const clearBtn = actionBar.querySelector('.clear-btn');

    if (pasteBtn) {
      pasteBtn.addEventListener('click', () => this.handleManualPaste());
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => this.handleManualCopy());
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.handleManualClear());
    }
  }

  // Manual action handlers
  async handleManualPaste() {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available. Please use HTTPS.');
      }

      const text = await navigator.clipboard.readText();

      // Insert text into editor
      if (this.editor.view) {
        // CodeMirror
        const selection = this.editor.view.state.selection.main;
        this.editor.view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: text }
        });
      } else if (this.editor.textarea) {
        // SimpleEditor
        const start = this.editor.textarea.selectionStart;
        const end = this.editor.textarea.selectionEnd;
        const value = this.editor.textarea.value;

        this.editor.textarea.value = value.substring(0, start) + text + value.substring(end);
        this.editor.textarea.selectionStart = this.editor.textarea.selectionEnd = start + text.length;
        this.editor.textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      this.showToast('Text pasted successfully', 'success');
      this.handleContentChange(this.editor.getContent());

    } catch (error) {
      console.error('Paste error:', error);
      this.showToast('Failed to paste: ' + error.message, 'error');
    }
  }

  async handleManualCopy() {
    try {
      if (!navigator.clipboard) {
        throw new Error('Clipboard API not available. Please use HTTPS.');
      }

      let textToCopy = '';

      if (this.editor.view) {
        // CodeMirror
        const selection = this.editor.view.state.selection.main;
        if (selection.from !== selection.to) {
          textToCopy = this.editor.view.state.doc.sliceString(selection.from, selection.to);
        } else {
          textToCopy = this.editor.view.state.doc.toString();
        }
      } else if (this.editor.textarea) {
        // SimpleEditor
        const start = this.editor.textarea.selectionStart;
        const end = this.editor.textarea.selectionEnd;
        if (start !== end) {
          textToCopy = this.editor.textarea.value.substring(start, end);
        } else {
          textToCopy = this.editor.textarea.value;
        }
      }

      await navigator.clipboard.writeText(textToCopy);

      const message = textToCopy.length < this.editor.getContent().length ? 'Selected text copied' : 'All content copied';
      this.showToast(message, 'success');

    } catch (error) {
      console.error('Copy error:', error);
      this.showToast('Failed to copy: ' + error.message, 'error');
    }
  }

  handleManualClear() {
    let hasSelection = false;

    if (this.editor.view) {
      // CodeMirror
      const selection = this.editor.view.state.selection.main;
      hasSelection = selection.from !== selection.to;

      if (hasSelection) {
        this.editor.view.dispatch({
          changes: { from: selection.from, to: selection.to, insert: '' }
        });
        this.showToast('Selection cleared', 'success');
      }
    } else if (this.editor.textarea) {
      // SimpleEditor
      const start = this.editor.textarea.selectionStart;
      const end = this.editor.textarea.selectionEnd;
      hasSelection = start !== end;

      if (hasSelection) {
        const value = this.editor.textarea.value;
        this.editor.textarea.value = value.substring(0, start) + value.substring(end);
        this.editor.textarea.selectionStart = this.editor.textarea.selectionEnd = start;
        this.editor.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        this.showToast('Selection cleared', 'success');
      }
    }

    if (!hasSelection) {
      // Clear all content with confirmation
      if (confirm('Are you sure you want to clear all content?')) {
        if (this.editor.view) {
          this.editor.view.dispatch({
            changes: { from: 0, to: this.editor.view.state.doc.length, insert: '' }
          });
        } else if (this.editor.textarea) {
          this.editor.textarea.value = '';
          this.editor.textarea.dispatchEvent(new Event('input', { bubbles: true }));
        }

        this.showToast('All content cleared', 'success');
      }
    }

    this.handleContentChange(this.editor.getContent());
  }

  // Simple toast notification
  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `editor-actions-toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      color: white;
      font-size: 14px;
      font-weight: 500;
      z-index: 1001;
      opacity: 0;
      transform: translateX(100%);
      transition: all 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
      background: ${type === 'success' ? '#28a745' : type === 'error' ? '#dc3545' : '#17a2b8'};
    `;

    document.body.appendChild(toast);

    // Trigger animation
    setTimeout(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(0)';
    }, 10);

    // Remove after delay
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Setup file control handlers
  setupFileControls() {
    // Import button
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');

    if (importBtn && importFile) {
      importBtn.addEventListener('click', () => importFile.click());
      importFile.addEventListener('change', e => this.handleFileImport(e));
    }

    // Export buttons
    const exportMdBtn = document.getElementById('export-md-btn');
    const exportHtmlBtn = document.getElementById('export-html-btn');

    if (exportMdBtn) {
      exportMdBtn.addEventListener('click', () => this.exportMarkdown());
    }

    if (exportHtmlBtn) {
      exportHtmlBtn.addEventListener('click', () => this.exportHTML());
    }

    // Clear button
    const clearBtn = document.getElementById('clear-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => this.clearEditor());
    }
  }

  // Setup settings panel
  setupSettingsPanel() {
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsPanel = document.getElementById('settings-panel');

    if (settingsToggle && settingsPanel) {
      settingsToggle.addEventListener('click', () => {
        settingsPanel.classList.toggle('hidden');
      });

      // Close settings when clicking outside
      document.addEventListener('click', e => {
        if (!settingsPanel.contains(e.target) && !settingsToggle.contains(e.target)) {
          settingsPanel.classList.add('hidden');
        }
      });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    // Settings controls
    this.setupSettingsControls();
  }

  // Setup settings controls
  setupSettingsControls() {
    // Auto-complete toggle
    const autoCompleteToggle = document.getElementById('auto-complete-toggle');
    if (autoCompleteToggle) {
      autoCompleteToggle.checked = this.settings.autoComplete;
      autoCompleteToggle.addEventListener('change', e => {
        const oldValue = this.settings.autoComplete;
        this.settings.autoComplete = e.target.checked;
        this.saveSettings();
        if (this.editor) {
          this.editor.toggleAutoComplete(e.target.checked);
        }

        // Track setting change
        if (this.analytics) {
          this.analytics.trackSettingChange('autoComplete', oldValue, e.target.checked);
        }
      });
    }

    // Sync scroll toggle
    const syncScrollToggle = document.getElementById('sync-scroll-toggle');
    if (syncScrollToggle) {
      syncScrollToggle.checked = this.settings.syncScroll;
      syncScrollToggle.addEventListener('change', e => {
        this.settings.syncScroll = e.target.checked;
        this.saveSettings();
        if (this.preview) {
          this.preview.setScrollSync(e.target.checked);
        }
      });
    }

    // External parser toggle
    const externalParserToggle = document.getElementById('use-external-parser-toggle');
    if (externalParserToggle) {
      externalParserToggle.checked = this.settings.useExternalParser;
      externalParserToggle.addEventListener('change', e => {
        this.settings.useExternalParser = e.target.checked;
        this.saveSettings();
        if (this.preview) {
          this.preview.toggleParser(e.target.checked);
        }
      });
    }

    // Embed styles toggle
    const embedStylesToggle = document.getElementById('embed-styles-toggle');
    if (embedStylesToggle) {
      embedStylesToggle.checked = this.settings.embedStyles;
      embedStylesToggle.addEventListener('change', e => {
        this.settings.embedStyles = e.target.checked;
        this.saveSettings();
      });
    }

    // Preview zoom
    const previewZoom = document.getElementById('preview-zoom');
    const zoomValue = document.getElementById('zoom-value');
    if (previewZoom && zoomValue) {
      previewZoom.value = this.settings.previewZoom;
      zoomValue.textContent = `${this.settings.previewZoom}%`;

      previewZoom.addEventListener('input', e => {
        const zoom = parseInt(e.target.value);
        this.settings.previewZoom = zoom;
        zoomValue.textContent = `${zoom}%`;
        this.saveSettings();
        if (this.preview) {
          this.preview.updateZoom(zoom);
        }
      });
    }

    // Markdown highlight toggle
    const markdownHighlightToggle = document.getElementById('markdown-highlight-toggle');
    if (markdownHighlightToggle) {
      markdownHighlightToggle.checked = this.settings.markdownHighlight;
      markdownHighlightToggle.addEventListener('change', e => {
        const oldValue = this.settings.markdownHighlight;
        this.settings.markdownHighlight = e.target.checked;
        this.saveSettings();
        if (this.preview) {
          this.preview.toggleMarkdownHighlight(e.target.checked);
        }

        // Track setting change
        if (this.analytics) {
          this.analytics.trackSettingChange('markdownHighlight', oldValue, e.target.checked);
        }
      });
    }

    // Action bar visible toggle
    const actionBarToggle = document.querySelector('input[name="actionBarVisible"]');
    if (actionBarToggle) {
      // Set initial state from EditorActions
      if (window.EditorActions) {
        actionBarToggle.checked = window.EditorActions.get('actionBarVisible') !== false;
      } else {
        actionBarToggle.checked = true; // Default to visible
      }

      actionBarToggle.addEventListener('change', e => {
        const isVisible = e.target.checked;
        console.log('Action bar visibility changed to:', isVisible);

        // Update EditorActions setting
        if (window.EditorActions) {
          window.EditorActions.set({ actionBarVisible: isVisible });
        }

        // Toggle action bar visibility
        this.toggleActionBar(isVisible);

        // Track setting change
        if (this.analytics) {
          this.analytics.trackSettingChange('actionBarVisible', !isVisible, isVisible);
        }
      });
    }

    // Reset settings button
    const resetSettingsBtn = document.getElementById('reset-settings');
    if (resetSettingsBtn) {
      resetSettingsBtn.addEventListener('click', () => this.resetSettings());
    }
  }

  // Toggle action bar visibility
  toggleActionBar(isVisible) {
    const actionBar = document.querySelector('.editor-actions-bar');
    if (actionBar) {
      if (isVisible) {
        actionBar.classList.remove('hidden');
        console.log('Action bar shown');
      } else {
        actionBar.classList.add('hidden');
        console.log('Action bar hidden');
      }
    } else {
      console.warn('Action bar not found for toggle');
    }
  }

  // Setup analytics panel
  setupAnalyticsPanel() {
    const analyticsToggle = document.getElementById('analytics-toggle');

    if (analyticsToggle) {
      analyticsToggle.addEventListener('click', () => {
        this.analyticsPanel.show();
        if (this.analytics) {
          this.analytics.trackFunctionUsage('analytics_open');
        }
      });
    }
  }

  // Handle content changes
  handleContentChange(content) {
    // Track content changes for analytics
    if (this.analytics && this.lastContent !== content) {
      this.analytics.trackContentChange(this.lastContent, content);
      this.lastContent = content;
    }

    // Update character count
    const charCount = document.getElementById('char-count');
    if (charCount) {
      const count = content.length;
      const language = window.markMirrorI18n?.language || 'ru';
      const unit = language === 'en' ? 'characters' : language === 'es' ? 'caracteres' : 'символов';
      charCount.textContent = `${count} ${unit}`;
    }

    // Update preview
    if (this.preview) {
      this.preview.updatePreview(content);
    }

    // Trigger auto-save
    this.scheduleAutoSave();
  }

  // Handle editor scroll
  handleEditorScroll(scrollInfo) {
    // Sync scroll with preview if enabled
    if (this.preview && this.settings.syncScroll && scrollInfo) {
      this.preview.scrollToPosition(scrollInfo.percentage);
    }
  }

  // Schedule auto-save
  scheduleAutoSave() {
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    this.autoSaveTimer = setTimeout(() => {
      this.saveContent();
    }, 1000); // Auto-save after 1 second of inactivity
  }

  // Save content to localStorage
  saveContent() {
    if (this.editor) {
      const content = this.editor.getContent();
      this.storage.saveContent(content);
    }
  }

  // Load saved content
  loadSavedContent() {
    const savedContent = this.storage.loadContent();
    if (savedContent && this.editor) {
      this.editor.setContent(savedContent);
    } else if (this.editor) {
      // Load default content for demonstration
      const defaultContent = this.getDefaultContent();
      this.editor.setContent(defaultContent);
    }
  }

  // Get default content for demonstration
  getDefaultContent() {
    return `# Добро пожаловать в MarkMirror Mobile! 🚀

Это **мощный Markdown редактор** с двухпанельным интерфейсом.

## Основные возможности

### ✨ Форматирование текста
- **Жирный текст**
- *Курсивный текст*
- ~~Зачёркнутый текст~~
- \`Встроенный код\`

### 📝 Списки
1. Нумерованный список
2. Второй элемент
3. Третий элемент

- Маркированный список
- Другой элемент
  - Вложенный элемент

### ✅ Задачи
- [ ] Незавершённая задача
- [x] Завершённая задача
- [ ] Ещё одна задача

### 🔗 Ссылки и изображения
[Ссылка на GitHub](https://github.com)
![Логотип MarkMirror](src/img/icon-512x512.png)

### 📊 Таблицы
| Заголовок 1 | Заголовок 2 | Заголовок 3 |
|-------------|-------------|-------------|
| Ячейка 1    | Ячейка 2    | Ячейка 3    |
| Данные A    | Данные B    | Данные C    |

### 💻 Блоки кода
\`\`\`javascript
function hello() {
    console.log("Привет, мир!");
    return "MarkMirror работает!";
}

hello();
\`\`\`

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
\`\`\`

### 💬 Цитаты
> Это пример цитаты.
> Она может занимать несколько строк
> и отображается с отступом слева.

### 🎯 HTML элементы
<details>
<summary>Раскрывающийся блок</summary>
Это содержимое скрыто по умолчанию и раскрывается при клике.
</details>

<kbd>Ctrl</kbd> + <kbd>S</kbd> - сохранить
<kbd>Ctrl</kbd> + <kbd>O</kbd> - открыть файл

<mark>Выделенный текст</mark> привлекает внимание.

---

## 🛠️ Настройки

Используйте кнопку ⚙️ в правом верхнем углу для настройки:
- Автодополнение Markdown
- Синхронная прокрутка
- Переключение парсера
- Масштаб превью

## 📱 Мобильная поддержка

На мобильных устройствах используйте вкладки "Редактор" и "Превью" для переключения между панелями.

## 🎨 Темы

Нажмите 🌙/☀️ для переключения между светлой и тёмной темами.

---

**Начните редактирование этого текста, чтобы увидеть MarkMirror в действии!**

Попробуйте:
1. Включить синхронную прокрутку в настройках
2. Прокрутить этот текст и посмотреть на превью
3. Экспортировать в HTML или Markdown
4. Импортировать свой .md файл

## 📚 Дополнительные примеры

### Математические формулы (в виде кода)
\`\`\`
E = mc²
a² + b² = c²
∑(i=1 to n) i = n(n+1)/2
\`\`\`

### Диаграммы (текстовые)
\`\`\`
Процесс разработки:
Идея → Планирование → Разработка → Тестирование → Деплой
  ↓         ↓            ↓            ↓           ↓
Анализ → Дизайн → Код → Отладка → Релиз
\`\`\`

### Больше примеров списков

#### Список покупок
- [ ] Хлеб
- [ ] Молоко
- [x] Яйца
- [ ] Сыр
- [x] Масло
- [ ] Овощи
  - [ ] Помидоры
  - [ ] Огурцы
  - [ ] Лук

#### Приоритеты задач
1. **Высокий приоритет**
   - Исправить критические баги
   - Завершить основные функции
2. **Средний приоритет**
   - Улучшить UI/UX
   - Добавить тесты
3. **Низкий приоритет**
   - Оптимизация производительности
   - Документация

### Расширенные таблицы

| Функция | Статус | Приоритет | Исполнитель |
|---------|--------|-----------|-------------|
| Редактор | ✅ Готово | Высокий | Команда A |
| Превью | ✅ Готово | Высокий | Команда A |
| Темы | ✅ Готово | Средний | Команда B |
| Экспорт | ✅ Готово | Средний | Команда B |
| Тесты | 🔄 В работе | Низкий | Команда C |

### Цитаты и примеры

> "Простота — это высшая степень утончённости."
> — Леонардо да Винчи

> "Любой дурак может написать код, который поймёт компьютер.
> Хорошие программисты пишут код, который могут понять люди."
> — Мартин Фаулер

### Длинный блок кода для тестирования скролла

\`\`\`javascript
// Пример сложного JavaScript кода
class MarkdownEditor {
    constructor(options) {
        this.options = {
            theme: 'light',
            autoComplete: true,
            syncScroll: false,
            ...options
        };
        this.init();
    }

    init() {
        this.setupEditor();
        this.setupPreview();
        this.setupEventListeners();
    }

    setupEditor() {
        // Настройка редактора
        console.log('Setting up editor...');
    }

    setupPreview() {
        // Настройка превью
        console.log('Setting up preview...');
    }

    setupEventListeners() {
        // Настройка обработчиков событий
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.save();
            }
        });
    }

    save() {
        console.log('Saving content...');
    }

    export(format) {
        switch(format) {
            case 'md':
                return this.exportMarkdown();
            case 'html':
                return this.exportHTML();
            default:
                throw new Error('Unsupported format');
        }
    }
}
\`\`\`

### Ещё больше контента для скролла

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.

Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.

### Финальная секция

Этот длинный документ создан специально для тестирования функции синхронной прокрутки. Если вы видите этот текст и можете прокручивать страницу, значит всё работает правильно!

**Проверьте:**
1. ✅ Есть ли скролл в превью панелях?
2. ✅ Работает ли синхронная прокрутка?
3. ✅ Обновляется ли превью при редактировании?

*Удачного использования MarkMirror Mobile!* ✨

---

*Конец документа. Если вы дошли до этого места, скролл точно работает!* 🎉`;
  }

  // Save settings
  saveSettings() {
    this.storage.saveSettings(this.settings);
  }

  // Reset all settings to defaults
  resetSettings() {
    const confirmReset = confirm(
      'Вы уверены, что хотите сбросить все настройки к значениям по умолчанию?\n\n' +
      'Это действие нельзя отменить. Все ваши настройки будут потеряны.'
    );

    if (!confirmReset) {
      return;
    }

    try {
      // Clear localStorage
      localStorage.removeItem('markmirror.settings');
      localStorage.removeItem('editor.settings');
      localStorage.removeItem('editor.theme');

      // Reset to default settings
      this.settings = {
        theme: 'dark',
        editorType: 'codemirror',
        autoSave: true,
        syncScroll: true,
        useExternalParser: false,
        embedStyles: true,
        previewZoom: 100,
        markdownHighlight: true
      };

      // Save default settings
      this.saveSettings();

      // Apply theme
      this.applyTheme(this.settings.theme);

      // Reinitialize UI with default settings
      this.initializeSettingsUI();

      // Reset EditorActions settings
      if (window.EditorActions) {
        window.EditorActions.set({
          theme: 'dark',
          actionBarVisible: true,
          highlightColor: '#ffeb3b'
        });
      }

      // Show success message
      alert('Настройки успешно сброшены к значениям по умолчанию!');

      // Track analytics
      if (this.analytics) {
        this.analytics.trackFunctionUsage('settings_reset');
      }

      console.log('Settings reset to defaults');

    } catch (error) {
      console.error('Error resetting settings:', error);
      alert('Произошла ошибка при сбросе настроек. Попробуйте обновить страницу.');
    }
  }

  // Initialize settings UI with current values
  initializeSettingsUI() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
      themeToggle.checked = this.settings.theme === 'dark';
    }

    // Auto save toggle
    const autoSaveToggle = document.getElementById('auto-save-toggle');
    if (autoSaveToggle) {
      autoSaveToggle.checked = this.settings.autoSave;
    }

    // Sync scroll toggle
    const syncScrollToggle = document.getElementById('sync-scroll-toggle');
    if (syncScrollToggle) {
      syncScrollToggle.checked = this.settings.syncScroll;
    }

    // External parser toggle
    const externalParserToggle = document.getElementById('use-external-parser-toggle');
    if (externalParserToggle) {
      externalParserToggle.checked = this.settings.useExternalParser;
    }

    // Embed styles toggle
    const embedStylesToggle = document.getElementById('embed-styles-toggle');
    if (embedStylesToggle) {
      embedStylesToggle.checked = this.settings.embedStyles;
    }

    // Preview zoom
    const previewZoom = document.getElementById('preview-zoom');
    const zoomValue = document.getElementById('zoom-value');
    if (previewZoom && zoomValue) {
      previewZoom.value = this.settings.previewZoom;
      zoomValue.textContent = `${this.settings.previewZoom}%`;
    }

    // Markdown highlight toggle
    const markdownHighlightToggle = document.getElementById('markdown-highlight-toggle');
    if (markdownHighlightToggle) {
      markdownHighlightToggle.checked = this.settings.markdownHighlight;
    }

    // Action bar visible toggle
    const actionBarToggle = document.querySelector('input[name="actionBarVisible"]');
    if (actionBarToggle) {
      // Read from EditorActions if available
      if (window.EditorActions) {
        actionBarToggle.checked = window.EditorActions.get('actionBarVisible') !== false;
      } else {
        actionBarToggle.checked = true; // Default to visible
      }
    }

    // Highlight color
    const highlightColorInput = document.querySelector('input[name="highlightColor"]');
    if (highlightColorInput) {
      highlightColorInput.value = '#ffeb3b'; // Default color
    }
  }

  // Setup auto-save
  setupAutoSave() {
    // Save content when page is about to unload
    window.addEventListener('beforeunload', () => {
      this.saveContent();
    });

    // Save content periodically
    setInterval(() => {
      this.saveContent();
    }, 30000); // Every 30 seconds
  }

  // Toggle theme
  toggleTheme() {
    const oldTheme = this.settings.theme;

    if (this.settings.theme === 'auto') {
      this.settings.theme = this.currentTheme === 'dark' ? 'light' : 'dark';
    } else {
      this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
    }

    this.currentTheme = this.settings.theme;
    this.applyTheme(this.currentTheme);
    this.saveSettings();

    // Track theme change
    if (this.analytics) {
      this.analytics.trackThemeChange(oldTheme, this.settings.theme);
    }

    // Update editor theme
    if (this.editor) {
      this.editor.updateTheme(this.currentTheme);
    }
  }

  // Handle file import
  async handleFileImport(event) {
    try {
      const file = event.target.files[0];
      if (!file) return;

      this.showLoading(true);

      const content = await this.fileHandler.readFileAsText(file);

      if (this.editor) {
        this.editor.setContent(content);
      }

      // Clear the file input
      event.target.value = '';

      this.showLoading(false);
      this.showMessage(`Файл "${file.name}" успешно импортирован`);

      // Track import
      if (this.analytics) {
        this.analytics.trackImport(true, file.size, file.name);
      }
    } catch (error) {
      console.error('Import failed:', error);
      this.showError('Ошибка при импорте файла');
      this.showLoading(false);

      // Track failed import
      if (this.analytics) {
        this.analytics.trackImport(false);
      }
    }
  }

  // Export as Markdown
  exportMarkdown() {
    if (!this.editor) return;

    const content = this.editor.getContent();
    const filename = `markmirror-${new Date().toISOString().split('T')[0]}.md`;

    try {
      this.fileHandler.exportMarkdown(content, filename);
      this.showMessage('Markdown файл экспортирован');

      // Track export
      if (this.analytics) {
        this.analytics.trackExport('md', true, content.length);
      }
    } catch (error) {
      this.showError('Ошибка при экспорте Markdown');
      if (this.analytics) {
        this.analytics.trackExport('md', false);
      }
    }
  }

  // Export as HTML
  exportHTML() {
    if (!this.preview) return;

    const htmlContent = this.preview.getHTMLContent();
    const filename = `markmirror-${new Date().toISOString().split('T')[0]}.html`;

    try {
      this.fileHandler.exportHTML(htmlContent, filename, this.settings.embedStyles);
      this.showMessage('HTML файл экспортирован');

      // Track export
      if (this.analytics) {
        this.analytics.trackExport('html', true, htmlContent.length);
      }
    } catch (error) {
      this.showError('Ошибка при экспорте HTML');
      if (this.analytics) {
        this.analytics.trackExport('html', false);
      }
    }
  }

  // Clear editor
  clearEditor() {
    if (confirm('Вы уверены, что хотите очистить редактор? Все несохранённые изменения будут потеряны.')) {
      if (this.editor) {
        this.editor.setContent('');
      }
      if (this.preview) {
        this.preview.clear();
      }
      this.storage.saveContent('');
      this.showMessage('Редактор очищен');
    }
  }

  // Show loading indicator
  showLoading(show) {
    const loading = document.getElementById('loading');
    if (loading) {
      if (show) {
        loading.classList.remove('hidden');
      } else {
        loading.classList.add('hidden');
      }
    }
  }

  // Show message
  showMessage(message, type = 'info') {
    // Simple message implementation
    // In a real app, you might want a toast notification system
    console.log(`${type.toUpperCase()}: ${message}`);

    // You could implement a toast notification here
    // For now, we'll just use a temporary alert-style message
    const messageEl = document.createElement('div');
    messageEl.className = `message message-${type}`;
    messageEl.textContent = message;
    messageEl.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--bg-secondary);
            color: var(--text-primary);
            padding: 1rem;
            border-radius: var(--border-radius);
            box-shadow: var(--shadow);
            z-index: 1000;
            max-width: 300px;
        `;

    document.body.appendChild(messageEl);

    setTimeout(() => {
      messageEl.remove();
    }, 3000);
  }

  // Show error message
  showError(message) {
    this.showMessage(message, 'error');
  }

  // Force scroll setup for debugging
  forceScrollSetup() {
    console.log('🔧 Force scroll setup...');

    if (this.preview) {
      // Re-setup scroll sync
      this.preview.setupScrollSync();

      // Force container configuration
      const plainTextContainer = document.getElementById('plain-text-output');
      const htmlContainer = document.getElementById('html-output');

      if (plainTextContainer && htmlContainer) {
        this.preview.ensureScrollableContainers(plainTextContainer, htmlContainer);
        console.log('✅ Scroll containers configured');
      } else {
        console.error('❌ Preview containers not found');
      }
    }

    // Log current settings
    console.log('Current settings:', {
      syncScroll: this.settings.syncScroll,
      previewZoom: this.settings.previewZoom,
    });
  }

  // Setup mobile tabs
  setupMobileTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const editorPanel = document.querySelector('.editor-panel');
    const previewPanel = document.querySelector('.preview-panel');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;

        // Update active tab
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Show/hide panels
        if (tab === 'editor') {
          editorPanel?.classList.add('active');
          previewPanel?.classList.remove('active');
        } else if (tab === 'preview') {
          editorPanel?.classList.remove('active');
          previewPanel?.classList.add('active');
        }
      });
    });
  }

  // Setup help modal
  setupHelpModal() {
    const helpToggle = document.getElementById('help-toggle');
    const helpModal = document.getElementById('help-modal');
    const closeHelp = document.getElementById('close-help');
    const helpContent = document.getElementById('help-content');

    if (helpToggle && helpModal) {
      helpToggle.addEventListener('click', () => {
        helpModal.showModal();
        this.loadHelpContent(helpContent);
      });
    }

    if (closeHelp && helpModal) {
      closeHelp.addEventListener('click', () => {
        helpModal.close();
      });
    }

    // Close modal when clicking outside
    if (helpModal) {
      helpModal.addEventListener('click', e => {
        if (e.target === helpModal) {
          helpModal.close();
        }
      });
    }
  }

  // Load help content
  loadHelpContent(container) {
    if (!container) return;

    const helpMarkdown = `# Справка по Markdown

## Заголовки
\`\`\`
# Заголовок 1
## Заголовок 2
### Заголовок 3
\`\`\`

## Форматирование текста
\`\`\`
**Жирный текст**
*Курсивный текст*
~~Зачёркнутый текст~~
\`Код\`
\`\`\`

## Списки
\`\`\`
- Элемент списка
- Другой элемент
  - Вложенный элемент

1. Нумерованный список
2. Второй элемент

- [ ] Задача (не выполнена)
- [x] Задача (выполнена)
\`\`\`

## Ссылки и изображения
\`\`\`
[Текст ссылки](https://example.com)
![Альтернативный текст](image.jpg)
\`\`\`

## Таблицы
\`\`\`
| Заголовок 1 | Заголовок 2 |
|-------------|-------------|
| Ячейка 1    | Ячейка 2    |
\`\`\`

## Блоки кода
\`\`\`
\\\`\\\`\\\`javascript
function hello() {
    console.log("Hello, World!");
}
\\\`\\\`\\\`
\`\`\`

## Цитаты
\`\`\`
> Это цитата
> Продолжение цитаты
\`\`\`

## HTML элементы
\`\`\`
<details>
<summary>Раскрывающийся блок</summary>
Содержимое блока
</details>

<kbd>Ctrl</kbd> + <kbd>C</kbd>
<mark>Выделенный текст</mark>
\`\`\`

## 📊 Аналитика и статистика

MarkMirror отслеживает вашу работу с документами:

### Доступ к аналитике:
- Кнопка **📊** в правом верхнем углу
- Горячая клавиша **F2**

### Что отслеживается:
- ⏱️ Время работы с документом
- ✏️ Статистика редактирования (символы, слова)
- 🔥 Популярные функции
- 📝 Использование Markdown элементов
- 💾 Экспорт/импорт файлов

### Конфиденциальность:
- Все данные хранятся только в вашем браузере
- Никакая информация не передается на серверы
- Вы можете очистить данные в любое время

## ⌨️ Горячие клавиши

- **Ctrl/Cmd + S** - Сохранить
- **Ctrl/Cmd + O** - Импорт файла
- **Ctrl/Cmd + E** - Экспорт в Markdown
- **Ctrl/Cmd + Shift + E** - Экспорт в HTML
- **F1** - Справка
- **F2** - Аналитика
- **Esc** - Закрыть модальные окна

## 📱 Установка приложения (PWA)

MarkMirror можно установить как обычное приложение:

### Установка:
- Нажмите кнопку **📱 Установить приложение** в заголовке
- Или используйте меню браузера "Установить приложение"
- На мобильных: "Добавить на главный экран"

### Преимущества установки:
- 🚀 Быстрый запуск с рабочего стола
- 📱 Работа в полноэкранном режиме
- 💾 Офлайн доступ к функциям
- 🔔 Уведомления об обновлениях
- 📂 Ярлыки для быстрых действий

### Офлайн режим:
- Приложение работает без интернета
- Все функции редактирования доступны
- Автосохранение в локальном хранилище
- Синхронизация при восстановлении связи`;

    // Parse and display help content
    if (this.preview) {
      const tempContainer = document.createElement('div');
      tempContainer.className = 'markdown-body';

      // Use the same parser as preview
      const html =
        this.preview.options.useExternalParser && typeof marked !== 'undefined' ? marked.parse(helpMarkdown) : this.preview.parser.parse(helpMarkdown);

      tempContainer.innerHTML = html;
      container.innerHTML = '';
      container.appendChild(tempContainer);
    }
  }

  // Setup keyboard shortcuts
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', e => {
      // Ctrl/Cmd + S: Save (prevent default and trigger auto-save)
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.saveContent();
        this.showMessage('Содержимое сохранено');
      }

      // Ctrl/Cmd + O: Import file
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        const importFile = document.getElementById('import-file');
        if (importFile) {
          importFile.click();
        }
      }

      // Ctrl/Cmd + E: Export Markdown
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        this.exportMarkdown();
      }

      // Ctrl/Cmd + Shift + E: Export HTML
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        this.exportHTML();
      }

      // F1: Help
      if (e.key === 'F1') {
        e.preventDefault();
        const helpToggle = document.getElementById('help-toggle');
        if (helpToggle) {
          helpToggle.click();
        }
      }

      // F2: Analytics
      if (e.key === 'F2') {
        e.preventDefault();
        this.analyticsPanel.show();
        if (this.analytics) {
          this.analytics.trackFunctionUsage('analytics_hotkey');
        }
      }

      // Escape: Close modals/panels
      if (e.key === 'Escape') {
        const helpModal = document.getElementById('help-modal');
        const settingsPanel = document.getElementById('settings-panel');

        if (helpModal?.open) {
          helpModal.close();
        } else if (settingsPanel && !settingsPanel.classList.contains('hidden')) {
          settingsPanel.classList.add('hidden');
        }
      }
    });
  }
}

// Initialize the application when the script loads
window.MarkMirrorApp = MarkMirrorApp;
const app = new MarkMirrorApp();

// Make app globally available for debugging
window.app = app;

// Global test function for search and replace
window.testSearchReplace = function() {
  if (app.searchReplace) {
    app.searchReplace.test();
  } else {
    console.error('SearchReplace not initialized');
  }
};

// Global debug function for search and replace
window.debugSearchReplace = function() {
  if (app.searchReplace) {
    app.searchReplace.debug();
  } else {
    console.error('SearchReplace not initialized');
  }
};

// Global debug function for EditorActions
window.debugEditorActions = function() {
  if (window.EditorActions) {
    console.log('EditorActions Settings:', window.EditorActions.get());
    console.log('EditorActions State:', {
      initialized: window.EditorActions.state?.initialized,
      editorType: window.EditorActions.state?.editorType,
      actionBarVisible: window.EditorActions.get('actionBarVisible'),
      editor: window.EditorActions.state?.editor,
      actionBar: window.EditorActions.state?.actionBar
    });

    // Check if action bar exists in DOM
    const actionBar = document.querySelector('.editor-actions-bar');
    console.log('Action bar in DOM:', actionBar);
    if (actionBar) {
      console.log('Action bar classes:', actionBar.className);
      console.log('Action bar style:', actionBar.style.cssText);
      console.log('Action bar buttons:', actionBar.querySelectorAll('.action-btn').length);
    }

    // Check editor element
    const editorContainer = document.querySelector('#editor-container');
    console.log('Editor container:', editorContainer);
    if (editorContainer) {
      console.log('Editor container children:', editorContainer.children);
    }
  } else {
    console.error('EditorActions not available');
  }
};

// Global test function for EditorActions
window.testEditorActions = function() {
  if (window.EditorActions) {
    console.log('Testing EditorActions...');

    // Test settings
    const originalSettings = window.EditorActions.get();
    console.log('Original settings:', originalSettings);

    // Test setting update
    window.EditorActions.set({ testSetting: 'test-value' });
    console.log('After setting test value:', window.EditorActions.get('testSetting'));

    // Test highlight color
    console.log('Highlight color:', window.EditorActions.getHighlightColor());

    console.log('EditorActions tests completed');
  } else {
    console.error('EditorActions not available');
  }
};

// Global function to force create action bar
window.forceCreateActionBar = function() {
  if (app && app.createActionBarManually) {
    app.createActionBarManually();
    console.log('Action bar creation forced');
  } else {
    console.error('App not available or method not found');
  }
};

// Global function to check action bar status
window.checkActionBar = function() {
  const actionBar = document.querySelector('.editor-actions-bar');
  const editorContainer = document.getElementById('editor-container');

  console.log('=== Action Bar Status ===');
  console.log('Action bar exists:', !!actionBar);
  console.log('Editor container exists:', !!editorContainer);

  if (actionBar) {
    console.log('Action bar parent:', actionBar.parentElement?.id || actionBar.parentElement?.className);
    console.log('Action bar visible:', !actionBar.classList.contains('hidden'));
    console.log('Action bar position:', actionBar.getBoundingClientRect());
    console.log('Action bar styles:', {
      position: getComputedStyle(actionBar).position,
      bottom: getComputedStyle(actionBar).bottom,
      left: getComputedStyle(actionBar).left,
      transform: getComputedStyle(actionBar).transform,
      display: getComputedStyle(actionBar).display,
      zIndex: getComputedStyle(actionBar).zIndex
    });
    console.log('Action bar buttons:', actionBar.querySelectorAll('.action-btn').length);
  }

  if (editorContainer) {
    console.log('Editor container position:', getComputedStyle(editorContainer).position);
    console.log('Editor container children:', Array.from(editorContainer.children).map(el => el.className || el.tagName));
  }

  // Check settings
  if (window.EditorActions) {
    console.log('actionBarVisible setting:', window.EditorActions.get('actionBarVisible'));
  }
};
