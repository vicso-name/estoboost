// ekilexApi.js - API сервис для получения переводов и форм слов из ekilex.ee

const EKILEX_BASE_URL = 'https://ekilex.ee';

// ВАЖНО: API ключ будет храниться в расширении
// Пользователь добавит его в настройках (или захардкодим для MVP)
let API_KEY = ''; // Установим позже

/**
 * Установить API ключ
 */
function setApiKey(key) {
  API_KEY = key;
}

/**
 * Получить полную информацию о слове (перевод + формы)
 */
async function getWordInfo(lemma) {
  try {
    console.log(`\n🔍 Fetching info for: "${lemma}"`);
    
    // Шаг 1: Поиск слова
    const wordId = await searchWord(lemma);
    if (!wordId) {
      console.log(`❌ Word not found: "${lemma}"`);
      return {
        translation: null,
        partOfSpeech: 'OTHER',
        forms: {}
      };
    }

    console.log(`✅ Found wordId: ${wordId}`);

    // Шаг 2: Получаем перевод и часть речи
    const [translation, partOfSpeech] = await Promise.all([
      getTranslation(wordId),
      detectPartOfSpeech(wordId)
    ]);

    console.log(`📝 Translation: ${translation}`);
    console.log(`📦 Part of speech: ${partOfSpeech}`);

    // Шаг 3: Получаем формы слова
    const forms = await getWordForms(wordId, partOfSpeech);

    return {
      translation: translation || '',
      partOfSpeech,
      forms
    };
  } catch (error) {
    console.error(`❌ Error fetching word info:`, error);
    return {
      translation: null,
      partOfSpeech: 'OTHER',
      forms: {}
    };
  }
}

/**
 * Шаг 1: Поиск слова по лемме
 */
async function searchWord(lemma) {
  try {
    const url = `${EKILEX_BASE_URL}/api/word/search/${encodeURIComponent(lemma)}`;
    const response = await fetch(url, {
      headers: {
        'ekilex-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`Search API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    
    if (data && data.words && Array.isArray(data.words) && data.words.length > 0) {
      // Ищем эстонское слово
      const estonianWord = data.words.find(w => w.lang === 'est');
      if (estonianWord) {
        return estonianWord.wordId;
      }
      // Если не нашли, берем первое
      return data.words[0].wordId;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Search error:', error);
    return null;
  }
}

/**
 * Шаг 2a: Получить перевод на русский
 */
async function getTranslation(wordId) {
  try {
    const url = `${EKILEX_BASE_URL}/api/word/details/${wordId}`;
    const response = await fetch(url, {
      headers: {
        'ekilex-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`Details API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data && data.wordRelationDetails) {
      const relationGroups = data.wordRelationDetails.primaryWordRelationGroups;
      
      if (Array.isArray(relationGroups)) {
        for (const group of relationGroups) {
          if (group.members && Array.isArray(group.members)) {
            for (const member of group.members) {
              if (member.wordLang === 'rus' && member.wordValue) {
                // Убираем HTML теги
                const cleanTranslation = member.wordValue.replace(/<[^>]+>/g, '');
                console.log(`✅ Translation found: ${cleanTranslation}`);
                return cleanTranslation;
              }
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('❌ Translation error:', error);
    return null;
  }
}

/**
 * Шаг 2b: Определить часть речи
 */
async function detectPartOfSpeech(wordId) {
  try {
    const url = `${EKILEX_BASE_URL}/api/word/details/${wordId}`;
    const response = await fetch(url, {
      headers: {
        'ekilex-api-key': API_KEY
      }
    });

    if (!response.ok) {
      return 'OTHER';
    }

    const data = await response.json();

    if (data && data.lexemes && Array.isArray(data.lexemes)) {
      for (const lexeme of data.lexemes) {
        if (Array.isArray(lexeme.pos) && lexeme.pos.length > 0) {
          const posCode = (lexeme.pos[0].code || '').toLowerCase();
          console.log(`📦 POS code: "${posCode}"`);
          
          if (posCode === 'v' || posCode === 'verb') {
            return 'VERB';
          } else if (posCode === 'adj' || posCode === 'a') {
            return 'ADJ';
          } else if (posCode === 's' || posCode === 'n' || posCode === 'noun') {
            return 'NOUN';
          }
        }
      }
    }

    return 'OTHER';
  } catch (error) {
    console.error('❌ POS detection error:', error);
    return 'OTHER';
  }
}

/**
 * Шаг 3: Получить формы слова
 */
async function getWordForms(wordId, partOfSpeech) {
  try {
    const url = `${EKILEX_BASE_URL}/api/paradigm/details/${wordId}`;
    const response = await fetch(url, {
      headers: {
        'ekilex-api-key': API_KEY
      }
    });

    if (!response.ok) {
      console.error(`Paradigm API error: ${response.status}`);
      return {};
    }

    const data = await response.json();

    if (Array.isArray(data) && data.length > 0) {
      const paradigm = data[0];
      
      if (paradigm.paradigmForms && Array.isArray(paradigm.paradigmForms)) {
        console.log(`📦 Found ${paradigm.paradigmForms.length} forms`);
        return parseFormsFromArray(paradigm.paradigmForms, partOfSpeech);
      }
    }
    
    return {};
  } catch (error) {
    console.error('❌ Forms fetch error:', error);
    return {};
  }
}

/**
 * Парсинг форм из массива
 */
function parseFormsFromArray(forms, partOfSpeech) {
  const result = {};

  // Существительные и прилагательные: N, G, P
  if (partOfSpeech === 'NOUN' || partOfSpeech === 'ADJ') {
    for (const form of forms) {
      const value = form.value || '';
      const morphCode = (form.morphCode || '').toLowerCase();
      
      if (!result.formN && morphCode === 'sgn') {
        result.formN = value;
      } else if (!result.formG && morphCode === 'sgg') {
        result.formG = value;
      } else if (!result.formP && morphCode === 'sgp') {
        result.formP = value;
      }
    }
  }

  // Глаголы: ma-inf, da-inf, pres3
  if (partOfSpeech === 'VERB') {
    for (const form of forms) {
      const value = form.value || '';
      const morphCode = form.morphCode || '';
      
      if (!result.maInf && morphCode === 'Sup') {
        result.maInf = value;
      } else if (!result.daInf && morphCode === 'Inf') {
        result.daInf = value;
      } else if (!result.pres3 && morphCode === 'IndPrSg3') {
        result.pres3 = value;
      } else if (!result.past3 && morphCode === 'IndIpfSg3') {
        result.past3 = value;
      }
    }
  }

  return result;
}

/**
 * Форматировать формы для отображения
 */
function formatFormsForDisplay(partOfSpeech, forms) {
  if (partOfSpeech === 'NOUN') {
    return `Формы: ${forms.formN || '?'}, ${forms.formG || '?'}, ${forms.formP || '?'}`;
  }
  
  if (partOfSpeech === 'VERB') {
    const parts = [];
    if (forms.maInf) parts.push(forms.maInf);
    if (forms.daInf) parts.push(forms.daInf);
    if (forms.pres3) parts.push(forms.pres3);
    return parts.length > 0 ? `Формы: ${parts.join(', ')}` : '';
  }
  
  if (partOfSpeech === 'ADJ') {
    return `Формы: ${forms.formN || '?'}, ${forms.formG || '?'}, ${forms.formP || '?'}`;
  }
  
  return '';
}

// Экспорт функций
window.EkilexAPI = {
  setApiKey,
  getWordInfo,
  formatFormsForDisplay
};
