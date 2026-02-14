# Cloudflare Media Setup (вместо Firebase Storage)

Эта схема нужна, если Firestore/Auth остаются в Firebase, а видео/файлы хранятся в Cloudflare.

## Что уже сделано в проекте

- Добавлен `js/media-storage-service.js`
- `firebaseService.uploadVideo()` и `firebaseService.uploadChatFile()` теперь умеют:
  - грузить в Cloudflare (если включено)
  - fallback на Firebase Storage (если Cloudflare не включен)

## 1. Включи Cloudflare конфиг

Открой `js/firebase-config.js` и заполни:

```js
window.CLOUDFLARE_MEDIA_CONFIG = {
  enabled: true,
  provider: "cloudflare",
  uploadEndpoint: "https://YOUR-WORKER.example.workers.dev/upload",
  deleteEndpoint: "https://YOUR-WORKER.example.workers.dev/delete",
  authToken: "",
  folderPrefix: "kazreels"
};
```

`authToken` укажи только если твой endpoint это требует.

## 2. Что должен принимать upload endpoint

`POST multipart/form-data`:

- `file` — бинарный файл
- `folder` — путь (например `kazreels/videos/<uid>`)
- `metadata` — JSON строка

Ответ endpoint (любой из форматов):

```json
{ "url": "https://...", "key": "path-or-id" }
```

или

```json
{ "data": { "url": "https://...", "key": "path-or-id" } }
```

или Cloudflare Images-подобный:

```json
{ "result": { "id": "...", "variants": ["https://..."] } }
```

## 3. Что должен принимать delete endpoint (опционально)

`DELETE /delete?key=<urlencoded-key>`

Если не настроить `deleteEndpoint`, удаление из Cloudflare просто пропускается, но запись из Firestore удалится.

## 4. Безопасность

- Не храни Cloudflare API Secret в фронтенде.
- Лучше держать секреты в Cloudflare Worker и вызывать только безопасный endpoint из клиента.

