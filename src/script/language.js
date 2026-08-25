(() => {
  const dictionaries = {
    ru: {
      title: 'MarkMirror — Markdown-редактор с живым превью', skip: 'Перейти к редактору', import: '📁 Импорт', clear: '🗑️ Очистить',
      settings: 'Настройки', search: 'Поиск и замена', find: 'Найти:', replaceWith: 'Заменить на:', replace: 'Заменить', replaceAll: 'Заменить все',
      confirm: 'Подтвердить', yes: 'Да', no: 'Нет', all: 'Все', stop: 'Стоп', editor: 'Редактор', preview: 'Превью',
      editorTitle: 'Markdown Редактор', previewTitle: 'Превью', mobile: '📱 Мобильный вид', stats: '📝 Plain Text + Статистика',
      html: 'HTML Рендер', help: 'Справка по Markdown', loading: 'Загрузка...', language: 'Язык интерфейса'
    },
    en: {
      title: 'MarkMirror — Markdown editor with live preview', skip: 'Skip to editor', import: '📁 Import', clear: '🗑️ Clear',
      settings: 'Settings', search: 'Search and replace', find: 'Find:', replaceWith: 'Replace with:', replace: 'Replace', replaceAll: 'Replace all',
      confirm: 'Confirm', yes: 'Yes', no: 'No', all: 'All', stop: 'Stop', editor: 'Editor', preview: 'Preview',
      editorTitle: 'Markdown Editor', previewTitle: 'Preview', mobile: '📱 Mobile view', stats: '📝 Plain text + statistics',
      html: 'HTML render', help: 'Markdown help', loading: 'Loading...', language: 'Interface language'
    },
    es: {
      title: 'MarkMirror — editor Markdown con vista previa', skip: 'Ir al editor', import: '📁 Importar', clear: '🗑️ Limpiar',
      settings: 'Ajustes', search: 'Buscar y reemplazar', find: 'Buscar:', replaceWith: 'Reemplazar con:', replace: 'Reemplazar', replaceAll: 'Reemplazar todo',
      confirm: 'Confirmar', yes: 'Sí', no: 'No', all: 'Todo', stop: 'Detener', editor: 'Editor', preview: 'Vista previa',
      editorTitle: 'Editor Markdown', previewTitle: 'Vista previa', mobile: '📱 Vista móvil', stats: '📝 Texto plano + estadísticas',
      html: 'Renderizado HTML', help: 'Ayuda de Markdown', loading: 'Cargando...', language: 'Idioma de la interfaz'
    }
  };
  const selectors = {
    '.skip-link': 'skip', '#import-btn': 'import', '#clear-btn': 'clear', '#settings-panel h3': 'settings',
    '.search-header h3': 'search', 'label[for="search-input"]': 'find', 'label[for="replace-input"]': 'replaceWith',
    '#replace-current': 'replace', '#replace-all': 'replaceAll', '#replace-confirm-mode': 'confirm',
    '#confirm-replace-yes': 'yes', '#confirm-replace-no': 'no', '#confirm-replace-all-remaining': 'all', '#confirm-replace-stop': 'stop',
    '.tab-btn[data-tab="editor"]': 'editor', '.tab-btn[data-tab="preview"]': 'preview',
    '.editor-panel > .panel-header h3': 'editorTitle', '.preview-panel > .panel-header h3': 'previewTitle',
    '#preview-mode-toggle': 'mobile', '.plain-text-preview .preview-section-header h4': 'stats',
    '.html-preview .preview-section-header h4': 'html', '#help-modal .modal-header h3': 'help', '#loading span': 'loading'
  };

  const trigger = document.getElementById('language-trigger');
  const menu = document.getElementById('language-options');
  const current = document.getElementById('language-current');
  const options = [...document.querySelectorAll('[data-language]')];
  let language = ['ru', 'en', 'es'].includes(localStorage.getItem('markMirrorLanguage')) ? localStorage.getItem('markMirrorLanguage') : 'ru';

  const apply = next => {
    language = next;
    localStorage.setItem('markMirrorLanguage', language);
    document.documentElement.lang = language;
    document.title = dictionaries[language].title;
    current.textContent = language.toUpperCase();
    trigger.setAttribute('aria-label', `${dictionaries[language].language}: ${language.toUpperCase()}`);
    options.forEach(option => option.setAttribute('aria-selected', String(option.dataset.language === language)));
    Object.entries(selectors).forEach(([selector, key]) => {
      const element = document.querySelector(selector);
      if (element) element.textContent = dictionaries[language][key];
    });
    window.dispatchEvent(new CustomEvent('markMirrorLanguageChanged', { detail: { language } }));
  };
  const close = (focus = false) => { menu.hidden = true; trigger.setAttribute('aria-expanded', 'false'); if (focus) trigger.focus(); };
  const open = () => { menu.hidden = false; trigger.setAttribute('aria-expanded', 'true'); (options.find(option => option.dataset.language === language) || options[0]).focus(); };

  trigger.addEventListener('click', () => menu.hidden ? open() : close());
  options.forEach((option, index) => {
    option.addEventListener('click', () => { apply(option.dataset.language); close(true); });
    option.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); close(true); }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const step = event.key === 'ArrowDown' ? 1 : -1;
        options[(index + step + options.length) % options.length].focus();
      }
    });
  });
  document.addEventListener('pointerdown', event => {
    if (!trigger.contains(event.target) && !menu.contains(event.target)) close();
  });
  apply(language);
  window.markMirrorI18n = { get language() { return language; } };
})();
