# Структура данных EstoBoost

## Chrome Storage (chrome.storage.sync)

### Ключи хранения:

```javascript
{
  // Известные слова (массив строк в нижнем регистре)
  knownWords: ["maja", "auto", "tere"],
  
  // Неизвестные слова
  unknownWords: ["sõnavara", "õppimine"],
  
  // Известные фразы
  knownPhrases: ["head aega", "tere hommikust"],
  
  // Неизвестные фразы
  unknownPhrases: ["kuidas sul läheb"],
  
  // Переводы (объект с переводами и определениями)
  translations: {
    "maja": {
      translation: "дом",
      definition: "Hoone, kus inimesed elavad",
      examples: ["See on minu maja.", "Suur maja asub seal."]
    },
    "tere": {
      translation: "привет",
      definition: "Tervitus",
      examples: ["Tere hommikust!", "Tere päevast!"]
    }
  }
}
```

## Поля в translations

- **translation** (string) - перевод на русский
- **definition** (string, optional) - определение на эстонском
- **examples** (array, optional) - примеры использования

## Лимиты Chrome Storage Sync

- Максимум: 100 KB
- Макс. элементов: 512
- Макс. размер одного элемента: 8 KB

**Примечание:** Если коллекция будет расти, может потребоваться переход на `chrome.storage.local` (без лимита в 100 KB).

## API sonaveeb.ee

Endpoint: `https://sonaveeb.ee/ekilex-api/...`

TODO: Изучить структуру ответа API и документировать здесь.
