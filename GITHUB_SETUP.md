# Инструкция по подключению к GitHub

## ✅ Локальный репозиторий готов!

Первый коммит создан: `Initial commit: project structure setup`

---

## 📋 Шаги для создания репозитория на GitHub:

### 1. Создай репозиторий на GitHub

Перейди на: https://github.com/new

**Настройки:**
- Repository name: `estoboost`
- Description: `Chrome extension for learning Estonian language while browsing`
- Public / Private: (на твое усмотрение)
- ⚠️ **НЕ** ставь галочки:
  - [ ] Add a README file
  - [ ] Add .gitignore
  - [ ] Choose a license

### 2. Подключи удаленный репозиторий

После создания GitHub покажет команды. Используй эти:

```bash
cd /home/claude/estoboost

# Добавь remote (замени YOUR_USERNAME на свой username)
git remote add origin https://github.com/YOUR_USERNAME/estoboost.git

# Переименуй ветку в main (опционально)
git branch -M main

# Отправь код на GitHub
git push -u origin main
```

### 3. Проверка

После `git push` открой:
```
https://github.com/YOUR_USERNAME/estoboost
```

Ты должен увидеть все файлы проекта!

---

## 🔧 Полезные команды

```bash
# Проверить статус
git status

# Посмотреть историю коммитов
git log --oneline

# Добавить все изменения и закоммитить
git add .
git commit -m "Your commit message"

# Отправить на GitHub
git push
```

---

## 🚨 Если возникнут проблемы с аутентификацией

GitHub больше не поддерживает пароли. Используй:
- **Personal Access Token** (Settings → Developer settings → Personal access tokens)
- Или настрой **SSH ключи**

---

## 📝 Следующие коммиты

После завершения каждого шага разработки:

```bash
git add .
git commit -m "Step 2: Updated manifest.json for EstoBoost"
git push
```
