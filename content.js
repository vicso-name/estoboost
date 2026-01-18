// content.js - EstoBoost
// Скрипт для подсветки эстонских слов на веб-страницах

// Regex для эстонских слов (включая õ, ä, ö, ü, š, ž)
const wordRegex = /\b[A-Za-zõäöüšžÕÄÖÜŠŽ]{2,}\b/g;

// Цвета для выделения
const COLORS = {
  known: 'rgba(0, 255, 0, 0.3)',      // Зеленый для известных слов и фраз
  unknown: 'rgba(255, 0, 0, 0.3)',    // Красный для неизвестных слов и фраз
  default: 'rgba(255, 255, 0, 0.3)',  // Желтый для остальных
  frequent: 'rgba(255, 204, 0, 0.5)'  // Темно-желтый для часто встречающихся слов
};

// Хранилище слов и фраз
let knownWords = [];
let unknownWords = [];
let knownPhrases = [];
let unknownPhrases = [];
let translations = {};

// Флаг для предотвращения бесконечных циклов
let isHighlighting = false;

// Загрузка данных из chrome.storage
chrome.storage.sync.get(['knownWords', 'unknownWords', 'knownPhrases', 'unknownPhrases', 'translations'], (data) => {
  knownWords = data.knownWords || [];
  unknownWords = data.unknownWords || [];
  knownPhrases = data.knownPhrases || [];
  unknownPhrases = data.unknownPhrases || [];
  translations = data.translations || {};
  highlightText(document.body);
});

// Функция для выделения текста
function highlightText(rootNode) {
  if (isHighlighting) {
    return;
  }

  isHighlighting = true;

  // Отключаем MutationObserver
  observer.disconnect();

  // Удаляем существующие выделения
  removeExistingHighlights(rootNode);

  // Сбор статистики по частоте слов
  const wordCounts = collectWordCounts(rootNode);

  // Проход по текстовым узлам
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);
  const nodes = [];

  while (walker.nextNode()) {
    nodes.push(walker.currentNode);
  }

  nodes.forEach(node => {
    if (
      node.parentElement &&
      !['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.parentElement.tagName) &&
      !isInsideCodeOrPre(node)
    ) {
      let text = node.nodeValue;
      const parent = node.parentElement;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;

      const sortedKnownPhrases = [...knownPhrases].sort((a, b) => b.length - a.length);
      const sortedUnknownPhrases = [...unknownPhrases].sort((a, b) => b.length - a.length);

      // Функция для обработки фраз
      const processPhrases = (phrases, status) => {
        phrases.forEach(phrase => {
          const phraseRegex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
          let match;
          while ((match = phraseRegex.exec(text)) !== null) {
            const start = match.index;
            const end = phraseRegex.lastIndex;
            if (start >= lastIndex) {
              // Добавляем текст до фразы
              if (start > lastIndex) {
                const preText = text.substring(lastIndex, start);
                fragment.appendChild(processRemainingText(preText, wordCounts));
              }
              // Добавляем выделение фразы
              const span = createSpan(match[0], status);
              fragment.appendChild(span);
              lastIndex = end;
            }
          }
        });
      };

      // Обработка известных и неизвестных фраз
      processPhrases(sortedKnownPhrases, 'knownPhrase');
      processPhrases(sortedUnknownPhrases, 'unknownPhrase');

      // Добавляем оставшийся текст
      if (lastIndex < text.length) {
        const remainingText = text.substring(lastIndex);
        fragment.appendChild(processRemainingText(remainingText, wordCounts));
      }

      // Заменяем узел
      parent.replaceChild(fragment, node);

      // Повторно обрабатываем новые текстовые узлы
      Array.from(parent.childNodes).forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          highlightText(child);
        }
      });
    }
  });

  // Включаем MutationObserver
  observer.observe(document.body, observerConfig);
  isHighlighting = false;
}

// Обработка оставшегося текста (по словам)
function processRemainingText(text, wordCounts) {
  const fragment = document.createDocumentFragment();
  let match;

  while ((match = wordRegex.exec(text)) !== null) {
    const word = match[0];
    const start = match.index;
    const end = wordRegex.lastIndex;

    const lowerWord = word.toLowerCase();
    let status = 'default';

    if (knownWords.includes(lowerWord)) {
      status = 'known';
    } else if (unknownWords.includes(lowerWord)) {
      status = 'unknown';
    } else if (wordCounts[lowerWord] >= 5) {
      // Для эстонского НЕ используем список COMMON_WORDS
      // Подсвечиваем все часто встречающиеся слова (5+ раз)
      status = 'frequent';
    }

    // Добавляем текст перед словом
    if (start > 0) {
      fragment.appendChild(document.createTextNode(text.substring(0, start)));
    }

    // Создаем span для слова
    const span = createSpan(word, status);
    fragment.appendChild(span);

    // Удаляем обработанное слово из текста
    text = text.substring(end);
    wordRegex.lastIndex = 0;
  }

  // Добавляем оставшийся текст
  if (text.length > 0) {
    fragment.appendChild(document.createTextNode(text));
  }

  return fragment;
}

// Функция для сбора частоты слов
function collectWordCounts(rootNode) {
  const wordCounts = {};
  const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT, null, false);

  while (walker.nextNode()) {
    const node = walker.currentNode;

    if (
      node.parentElement &&
      !['SCRIPT', 'STYLE', 'PRE', 'CODE'].includes(node.parentElement.tagName) &&
      !isInsideCodeOrPre(node)
    ) {
      const text = node.nodeValue;
      const words = text.match(wordRegex);
      if (words) {
        words.forEach(word => {
          const lowerWord = word.toLowerCase();
          wordCounts[lowerWord] = (wordCounts[lowerWord] || 0) + 1;
        });
      }
    }
  }
  return wordCounts;
}

// Проверка, находится ли узел внутри <code> или <pre>
function isInsideCodeOrPre(node) {
  let parent = node.parentElement;
  while (parent) {
    if (['PRE', 'CODE'].includes(parent.tagName)) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

// Создание <span> с выделением
function createSpan(text, status) {
  const span = document.createElement('span');
  span.textContent = text;
  span.style.cursor = 'pointer';
  span.dataset.word = text.toLowerCase();

  if (status === 'knownPhrase' || status === 'unknownPhrase') {
    span.dataset.estoboost = 'phrase';
  } else {
    span.dataset.estoboost = 'word';
  }

  // Установка цвета фона в зависимости от статуса
  if (status === 'known' || status === 'knownPhrase') {
    span.style.backgroundColor = COLORS.known;
  } else if (status === 'unknown' || status === 'unknownPhrase') {
    span.style.backgroundColor = COLORS.unknown;
  } else if (status === 'frequent') {
    span.style.backgroundColor = COLORS.frequent;
  } else {
    span.style.backgroundColor = COLORS.default;
  }

  // Добавление обработчика клика
  span.addEventListener('click', (e) => {
    e.stopPropagation();
    handleWordClick(text, status.endsWith('Phrase') ? 'phrase' : 'word');
  });

  return span;
}

// Удаление ранее добавленных выделений
function removeExistingHighlights(rootNode = document.body) {
  const highlightedElements = rootNode.querySelectorAll('[data-estoboost]');
  highlightedElements.forEach(element => {
    const parent = element.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(element.textContent), element);
      parent.normalize();
    }
  });
}

// Экранирование спецсимволов для RegExp
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Обработка клика по слову
function handleWordClick(text, type) {
  const lowerText = text.toLowerCase();
  
  // Проверяем, добавлено ли уже слово/фраза
  const isKnown = type === 'word' 
    ? knownWords.includes(lowerText) 
    : knownPhrases.includes(lowerText);
  
  const isUnknown = type === 'word' 
    ? unknownWords.includes(lowerText) 
    : unknownPhrases.includes(lowerText);

  if (isKnown || isUnknown) {
    // Если уже добавлено - показываем информацию
    showWordInfo(text, type);
  } else {
    // Если новое - показываем модальное окно для добавления
    showAddWordModal(text, type);
  }
}

// Показать информацию о слове
function showWordInfo(text, type) {
  const lowerText = text.toLowerCase();
  const translation = translations[lowerText] || {};
  
  const isKnown = type === 'word' 
    ? knownWords.includes(lowerText) 
    : knownPhrases.includes(lowerText);

  const status = isKnown ? 'known' : 'unknown';
  const statusText = isKnown ? 'Известно' : 'Не знаю';
  const statusColor = isKnown ? COLORS.known : COLORS.unknown;

  // Создаем модальное окно
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'estoboost-modal-overlay';
  Object.assign(modalOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '10000',
    fontFamily: 'Arial, sans-serif'
  });

  const modal = document.createElement('div');
  modal.id = 'estoboost-modal';
  Object.assign(modal.style, {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    width: '400px',
    maxWidth: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  });

  modal.innerHTML = `
    <div style="margin-bottom: 16px;">
      <h2 style="margin: 0 0 8px 0; font-size: 24px; color: #333;">${text}</h2>
      <div style="display: inline-block; padding: 4px 12px; background-color: ${statusColor}; border-radius: 4px; font-size: 14px;">
        ${statusText}
      </div>
    </div>
    
    <div style="margin-bottom: 16px;">
      <strong style="color: #555;">Перевод:</strong>
      <p style="margin: 8px 0; font-size: 16px; color: #333;">${translation.translation || 'Нет перевода'}</p>
    </div>

    ${translation.definition ? `
      <div style="margin-bottom: 16px;">
        <strong style="color: #555;">Определение:</strong>
        <p style="margin: 8px 0; font-size: 14px; color: #666;">${translation.definition}</p>
      </div>
    ` : ''}

    <div style="display: flex; gap: 8px; margin-top: 20px;">
      <button id="estoboost-toggle" style="flex: 1; padding: 10px; background-color: #007bff; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
        ${isKnown ? 'Пометить: Не знаю' : 'Пометить: Знаю'}
      </button>
      <button id="estoboost-close" style="flex: 1; padding: 10px; background-color: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
        Закрыть
      </button>
    </div>
  `;

  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Закрытие модального окна
  const closeModal = () => {
    modalOverlay.remove();
  };

  // Переключение статуса
  document.getElementById('estoboost-toggle').addEventListener('click', () => {
    const newStatus = isKnown ? 'unknown' : 'known';
    addToList(lowerText, translation.translation || '', newStatus, type);
    closeModal();
  });

  document.getElementById('estoboost-close').addEventListener('click', closeModal);

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
}

// Показать модальное окно добавления слова
async function showAddWordModal(text, type) {
  const lowerText = text.toLowerCase();

  // Получаем перевод
  const translation = await fetchTranslation(lowerText);

  // Создаем модальное окно
  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'estoboost-modal-overlay';
  Object.assign(modalOverlay.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: '10000',
    fontFamily: 'Arial, sans-serif'
  });

  const modal = document.createElement('div');
  modal.id = 'estoboost-modal';
  Object.assign(modal.style, {
    backgroundColor: '#fff',
    padding: '24px',
    borderRadius: '12px',
    width: '400px',
    maxWidth: '90%',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  });

  modal.innerHTML = `
    <h2 style="margin: 0 0 16px 0; font-size: 24px; color: #333;">${text}</h2>
    
    <div style="margin-bottom: 16px;">
      <label style="display: block; margin-bottom: 8px; color: #555; font-weight: bold;">Перевод:</label>
      <input type="text" id="estoboost-translation" value="${translation}" 
        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; box-sizing: border-box;">
    </div>

    <div style="margin-bottom: 20px; color: #666; font-size: 14px;">
      Вы знаете это ${type === 'word' ? 'слово' : 'выражение'}?
    </div>

    <div style="display: flex; gap: 8px;">
      <button id="estoboost-known" style="flex: 1; padding: 12px; background-color: #28a745; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">
        Знаю
      </button>
      <button id="estoboost-unknown" style="flex: 1; padding: 12px; background-color: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">
        Не знаю
      </button>
    </div>
    
    <button id="estoboost-close" style="width: 100%; margin-top: 12px; padding: 10px; background-color: #6c757d; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 14px;">
      Отмена
    </button>
  `;

  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);

  // Закрытие модального окна
  const closeModal = () => {
    modalOverlay.remove();
  };

  // Обработчик кнопки "Знаю"
  document.getElementById('estoboost-known').addEventListener('click', () => {
    const translation = document.getElementById('estoboost-translation').value.trim();
    if (!translation) {
      alert('Пожалуйста, введите перевод');
      return;
    }
    addToList(lowerText, translation, 'known', type);
    closeModal();
  });

  // Обработчик кнопки "Не знаю"
  document.getElementById('estoboost-unknown').addEventListener('click', () => {
    const translation = document.getElementById('estoboost-translation').value.trim();
    if (!translation) {
      alert('Пожалуйста, введите перевод');
      return;
    }
    addToList(lowerText, translation, 'unknown', type);
    closeModal();
  });

  // Обработчик кнопки закрытия
  document.getElementById('estoboost-close').addEventListener('click', closeModal);

  // Закрытие при клике вне модального окна
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal();
    }
  });
}

// Добавление слова или фразы в списки
function addToList(text, translation, status, type) {
  if (type === 'word') {
    chrome.storage.sync.get(['knownWords', 'unknownWords', 'translations'], (data) => {
      let known = data.knownWords || [];
      let unknown = data.unknownWords || [];
      let translationsData = data.translations || {};

      if (status === 'known') {
        if (!known.includes(text)) {
          known.push(text);
        }
        unknown = unknown.filter(w => w !== text);
      } else if (status === 'unknown') {
        if (!unknown.includes(text)) {
          unknown.push(text);
        }
        known = known.filter(w => w !== text);
      }

      // Сохранение перевода
      translationsData[text] = translationsData[text] || {};
      translationsData[text].translation = translation;

      chrome.storage.sync.set({
        knownWords: known,
        unknownWords: unknown,
        translations: translationsData
      }, () => {
        knownWords = known;
        unknownWords = unknown;
        translations = translationsData;
        highlightText(document.body);
      });
    });
  } else if (type === 'phrase') {
    chrome.storage.sync.get(['knownPhrases', 'unknownPhrases', 'translations'], (data) => {
      let known = data.knownPhrases || [];
      let unknown = data.unknownPhrases || [];
      let translationsData = data.translations || {};

      if (status === 'known') {
        if (!known.includes(text)) {
          known.push(text);
        }
        unknown = unknown.filter(p => p !== text);
      } else if (status === 'unknown') {
        if (!unknown.includes(text)) {
          unknown.push(text);
        }
        known = known.filter(p => p !== text);
      }

      // Сохранение перевода
      translationsData[text] = translationsData[text] || {};
      translationsData[text].translation = translation;

      chrome.storage.sync.set({
        knownPhrases: known,
        unknownPhrases: unknown,
        translations: translationsData
      }, () => {
        knownPhrases = known;
        unknownPhrases = unknown;
        translations = translationsData;
        highlightText(document.body);
      });
    });
  }
}

// Получение перевода (временная заглушка, реализуем в Шаге 4)
async function fetchTranslation(text) {
  // TODO: Интеграция с API sonaveeb.ee в Шаге 4
  return '';
}

// Обработчик сообщений от background.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "addPhrase") {
    const text = request.text;
    showAddWordModal(text, 'phrase');
  } else if (request.action === "addWord") {
    const text = request.text;
    showAddWordModal(text, 'word');
  }
});

// Обновление выделений при изменении данных в storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && (changes.knownWords || changes.unknownWords || changes.knownPhrases || changes.unknownPhrases)) {
    knownWords = changes.knownWords ? changes.knownWords.newValue : knownWords;
    unknownWords = changes.unknownWords ? changes.unknownWords.newValue : unknownWords;
    knownPhrases = changes.knownPhrases ? changes.knownPhrases.newValue : knownPhrases;
    unknownPhrases = changes.unknownPhrases ? changes.unknownPhrases.newValue : unknownPhrases;
    highlightText(document.body);
  }
});

// Настройка MutationObserver
const observer = new MutationObserver((mutations) => {
  let shouldHighlight = false;

  mutations.forEach(mutation => {
    if (mutation.type === 'childList') {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === Node.TEXT_NODE) {
          shouldHighlight = true;
        } else if (node.nodeType === Node.ELEMENT_NODE && node.dataset.estoboost !== 'phrase') {
          shouldHighlight = true;
        }
      });
    } else if (mutation.type === 'characterData') {
      shouldHighlight = true;
    }
  });
  
  if (shouldHighlight && !isHighlighting) {
    highlightText(document.body);
  }
});

// Настройки для MutationObserver
const observerConfig = {
  childList: true,
  subtree: true,
  characterData: true
};

// Начало наблюдения за изменениями в DOM
observer.observe(document.body, observerConfig);
