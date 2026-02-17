/**
 * Runtime guard against Cyrillic mojibake like:
 * "РџСЂРёРІРµС‚" -> "Привет"
 *
 * This protects UI text even if a corrupted literal slips into source files.
 */
(function attachTextEncodingGuard(globalObject) {
    'use strict';

    if (!globalObject || globalObject.ReelgramTextGuard) return;
    if (typeof TextDecoder !== 'function' || typeof TextEncoder !== 'function') {
        globalObject.ReelgramTextGuard = { fixText: (value) => value, applyToNode: () => {} };
        return;
    }

    let decoder1251 = null;
    let decoderUtf8 = null;
    try {
        decoderUtf8 = new TextDecoder('utf-8');
    } catch (_) {
        globalObject.ReelgramTextGuard = { fixText: (value) => value, applyToNode: () => {} };
        return;
    }
    try {
        decoder1251 = new TextDecoder('windows-1251');
    } catch (_) {
        decoder1251 = null;
    }

    const encoderUtf8 = new TextEncoder();
    const reverse1251 = new Map();
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME']);
    const ATTRIBUTES_TO_FIX = ['placeholder', 'title', 'aria-label', 'alt'];
    const MOJIBAKE_HINT_RE = /[\u0420\u0421\u00D0\u00D1]/;

    const CP1251_80_9F = [
        0x0402, 0x0403, 0x201A, 0x0453, 0x201E, 0x2026, 0x2020, 0x2021,
        0x20AC, 0x2030, 0x0409, 0x2039, 0x040A, 0x040C, 0x040B, 0x040F,
        0x0452, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
        0x0098, 0x2122, 0x0459, 0x203A, 0x045A, 0x045C, 0x045B, 0x045F
    ];
    const CP1251_A0_BF = [
        0x00A0, 0x040E, 0x045E, 0x0408, 0x00A4, 0x0490, 0x00A6, 0x00A7,
        0x0401, 0x00A9, 0x0404, 0x00AB, 0x00AC, 0x00AD, 0x00AE, 0x0407,
        0x00B0, 0x00B1, 0x0406, 0x0456, 0x0491, 0x00B5, 0x00B6, 0x00B7,
        0x0451, 0x2116, 0x0454, 0x00BB, 0x0458, 0x0405, 0x0455, 0x0457
    ];

    function decodeWindows1251Byte(byte) {
        const safeByte = byte & 0xFF;
        if (decoder1251) {
            return decoder1251.decode(Uint8Array.of(safeByte));
        }
        if (safeByte < 0x80) return String.fromCharCode(safeByte);
        if (safeByte >= 0xC0) return String.fromCharCode(0x0410 + (safeByte - 0xC0));
        if (safeByte >= 0xA0) return String.fromCharCode(CP1251_A0_BF[safeByte - 0xA0]);
        return String.fromCharCode(CP1251_80_9F[safeByte - 0x80]);
    }

    function decodeWindows1251Bytes(bytes) {
        if (!(bytes && typeof bytes.length === 'number')) return '';
        if (decoder1251) return decoder1251.decode(bytes);
        let result = '';
        for (let i = 0; i < bytes.length; i += 1) {
            result += decodeWindows1251Byte(bytes[i]);
        }
        return result;
    }

    for (let i = 0; i < 256; i += 1) {
        const ch = decodeWindows1251Byte(i);
        if (!reverse1251.has(ch)) {
            reverse1251.set(ch, i);
        }
    }

    function encodeAsWindows1251Bytes(text) {
        if (typeof text !== 'string') return null;
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i += 1) {
            const ch = text[i];
            const mapped = reverse1251.get(ch);
            if (mapped == null) return null;
            bytes[i] = mapped;
        }
        return bytes;
    }

    function fixText(value) {
        if (typeof value !== 'string' || !value) return value;
        if (!MOJIBAKE_HINT_RE.test(value)) return value;

        const bytes = encodeAsWindows1251Bytes(value);
        if (!bytes) return value;

        let decoded = '';
        try {
            decoded = decoderUtf8.decode(bytes);
        } catch (_) {
            return value;
        }

        if (!decoded || decoded === value || decoded.indexOf('\uFFFD') >= 0) {
            return value;
        }

        const roundTrip = decodeWindows1251Bytes(encoderUtf8.encode(decoded));
        if (roundTrip !== value) return value;
        return decoded;
    }

    function fixTextNode(textNode) {
        if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
        const source = textNode.nodeValue;
        const fixed = fixText(source);
        if (fixed !== source) {
            textNode.nodeValue = fixed;
        }
    }

    function fixElementAttributes(element) {
        if (!element || element.nodeType !== Node.ELEMENT_NODE) return;
        ATTRIBUTES_TO_FIX.forEach((name) => {
            if (!element.hasAttribute(name)) return;
            const source = element.getAttribute(name);
            const fixed = fixText(source);
            if (fixed !== source) {
                element.setAttribute(name, fixed);
            }
        });
    }

    function applyToNode(node) {
        if (!node) return;

        if (node.nodeType === Node.TEXT_NODE) {
            fixTextNode(node);
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const element = node;
        if (SKIP_TAGS.has(String(element.tagName || '').toUpperCase())) return;

        fixElementAttributes(element);

        const children = element.childNodes ? Array.from(element.childNodes) : [];
        children.forEach((child) => applyToNode(child));
    }

    function patchRenderer() {
        const renderer = globalObject.AdvancedViewRenderer;
        if (!renderer || renderer.__reelgramTextGuardPatched) return false;

        if (typeof renderer.showToast === 'function') {
            const baseShowToast = renderer.showToast;
            renderer.showToast = function patchedShowToast(text, type, duration) {
                return baseShowToast.call(this, fixText(text), type, duration);
            };
        }

        renderer.__reelgramTextGuardPatched = true;
        return true;
    }

    function patchAppPrototype() {
        const AppCtor = globalObject.AdvancedApp;
        if (!AppCtor || !AppCtor.prototype || AppCtor.prototype.__reelgramTextGuardPatched) return false;

        const proto = AppCtor.prototype;
        if (typeof proto.escapeHtml === 'function') {
            const baseEscapeHtml = proto.escapeHtml;
            proto.escapeHtml = function patchedEscapeHtml(value) {
                return baseEscapeHtml.call(this, fixText(value));
            };
        }

        proto.__reelgramTextGuardPatched = true;
        return true;
    }

    function startObserver() {
        const root = document.documentElement || document.body;
        if (!root || typeof MutationObserver !== 'function') return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'characterData') {
                    fixTextNode(mutation.target);
                    return;
                }

                if (mutation.type === 'attributes') {
                    fixElementAttributes(mutation.target);
                }

                const added = mutation.addedNodes ? Array.from(mutation.addedNodes) : [];
                added.forEach((node) => applyToNode(node));
            });
        });

        observer.observe(root, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ATTRIBUTES_TO_FIX
        });
    }

    function boot() {
        applyToNode(document.body || document.documentElement);
        startObserver();
        patchRenderer();
        patchAppPrototype();

        let attempts = 0;
        const timer = setInterval(() => {
            attempts += 1;
            const rendererDone = patchRenderer();
            const appDone = patchAppPrototype();
            if ((rendererDone && appDone) || attempts > 160) {
                clearInterval(timer);
            }
        }, 500);
    }

    globalObject.ReelgramTextGuard = {
        fixText,
        applyToNode
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }
})(typeof window !== 'undefined' ? window : globalThis);
