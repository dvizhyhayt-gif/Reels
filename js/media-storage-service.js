/**
 * MediaStorageService
 * Upload/delete media через внешний storage-провайдер (Cloudflare).
 *
 * Важно:
 * - Здесь не должно быть секретных ключей.
 * - Рекомендуемый вариант: загрузка через Cloudflare Worker endpoint.
 */
class MediaStorageService {
    constructor(config = {}) {
        const runtimeConfig = (typeof window !== 'undefined' && window.CLOUDFLARE_MEDIA_CONFIG)
            ? window.CLOUDFLARE_MEDIA_CONFIG
            : {};

        this.config = {
            enabled: false,
            provider: 'cloudflare',
            uploadEndpoint: '',
            deleteEndpoint: '',
            authToken: '',
            folderPrefix: 'tikclone',
            ...runtimeConfig,
            ...config
        };
    }

    isEnabled() {
        return !!(this.config.enabled && this.config.uploadEndpoint);
    }

    buildHeaders() {
        const headers = {};
        if (this.config.authToken) {
            headers.Authorization = `Bearer ${this.config.authToken}`;
        }
        return headers;
    }

    async uploadFile(file, { folder = 'uploads', metadata = {} } = {}) {
        if (!this.isEnabled()) {
            throw new Error('Cloudflare media upload не настроен');
        }
        if (!file) {
            throw new Error('Файл не передан');
        }

        const form = new FormData();
        const normalizedFolder = `${this.config.folderPrefix}/${folder}`.replace(/\/+/g, '/');
        form.append('file', file);
        form.append('folder', normalizedFolder);
        form.append('metadata', JSON.stringify(metadata || {}));

        const response = await fetch(this.config.uploadEndpoint, {
            method: 'POST',
            headers: this.buildHeaders(),
            body: form
        });

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Cloudflare upload failed: ${response.status} ${text || ''}`.trim());
        }

        const payload = await response.json();

        const url = payload.url
            || payload?.data?.url
            || payload?.result?.url
            || payload?.result?.variants?.[0]
            || null;

        const key = payload.key
            || payload?.data?.key
            || payload?.result?.key
            || payload?.result?.id
            || payload?.id
            || null;

        if (!url) {
            throw new Error('Cloudflare endpoint не вернул URL файла');
        }

        return {
            provider: this.config.provider,
            url,
            key: key || url,
            raw: payload
        };
    }

    async deleteFile(key) {
        if (!this.isEnabled() || !this.config.deleteEndpoint || !key) {
            return false;
        }

        const endpoint = `${this.config.deleteEndpoint}?key=${encodeURIComponent(key)}`;
        const response = await fetch(endpoint, {
            method: 'DELETE',
            headers: this.buildHeaders()
        });

        return response.ok;
    }
}

if (typeof window !== 'undefined') {
    window.mediaStorageService = new MediaStorageService();
}
