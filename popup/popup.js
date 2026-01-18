// popup.js - Логика popup интерфейса

document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveButton = document.getElementById('save-key');
  const statusDiv = document.getElementById('status');
  const knownCountSpan = document.getElementById('known-count');
  const unknownCountSpan = document.getElementById('unknown-count');

  // Загружаем сохраненный API ключ
  chrome.storage.sync.get(['ekilexApiKey'], (data) => {
    if (data.ekilexApiKey) {
      apiKeyInput.value = data.ekilexApiKey;
    }
  });

  // Загружаем статистику
  loadStatistics();

  // Сохранение API ключа
  saveButton.addEventListener('click', () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Пожалуйста, введите API ключ', 'error');
      return;
    }

    chrome.storage.sync.set({ ekilexApiKey: apiKey }, () => {
      showStatus('✓ API ключ сохранен!', 'success');
      
      // Очищаем сообщение через 2 секунды
      setTimeout(() => {
        statusDiv.textContent = '';
        statusDiv.className = 'status';
      }, 2000);
    });
  });

  // Enter для сохранения
  apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      saveButton.click();
    }
  });

  // Функция показа статуса
  function showStatus(message, type) {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
  }

  // Загрузка статистики
  function loadStatistics() {
    chrome.storage.sync.get(['knownWords', 'unknownWords', 'knownPhrases', 'unknownPhrases'], (data) => {
      const knownWords = (data.knownWords || []).length;
      const knownPhrases = (data.knownPhrases || []).length;
      const unknownWords = (data.unknownWords || []).length;
      const unknownPhrases = (data.unknownPhrases || []).length;

      knownCountSpan.textContent = knownWords + knownPhrases;
      unknownCountSpan.textContent = unknownWords + unknownPhrases;
    });
  }
});
