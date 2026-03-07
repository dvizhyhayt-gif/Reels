/**
 * AdvancedViewRenderer
 * РћС‚РІРµС‡Р°РµС‚ Р·Р° СЃРѕР·РґР°РЅРёРµ Рё СЂРµРЅРґРµСЂРёРЅРі РєРѕРјРїРѕРЅРµРЅС‚РѕРІ UI
 */
class AdvancedViewRenderer {
    static createVideoCard(video, options = {}) {
        const div = document.createElement('div');
        div.className = `video-item ${video.filter || ''}`;
        div.dataset.id = video.id;
        if (video.firestoreId) div.dataset.firestoreId = video.firestoreId;
        if (video.uid) div.dataset.uid = video.uid;
        div.dataset.views = video.views || 0;
        div.dataset.author = video.author;
        
        const timeAgo = this.formatTimeAgo(video.timestamp);
        const hashtagsHTML = video.hashtags?.map(tag => 
            `<span class="hashtag">${tag}</span>`
        ).join(' ') || '';

        const commentsCount = Number.isFinite(parseInt(video.commentsCount, 10))
            ? (parseInt(video.commentsCount, 10) || 0)
            : (Array.isArray(video.comments) ? video.comments.length : 0);

        const escapeHtml = (value) => String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');

        // РћРїСЂРµРґРµР»СЏРµРј С‚РµРєСЃС‚ РєРЅРѕРїРєРё РїРѕРґРїРёСЃРєРё
        const isSubscribed = options.isSubscribed ? true : false;
        const isFollowRequested = options.isFollowRequested ? true : false;
        const showFollow = options.showFollow !== false;
        const followButtonText = isSubscribed ? 'вњ“' : (isFollowRequested ? 'вЂ¦' : '+');
        const followButtonStyle = isSubscribed
            ? 'var(--accent-secondary)'
            : (isFollowRequested ? 'rgba(126, 148, 182, 0.95)' : 'var(--accent-color)');
        const followPlusHtml = showFollow
            ? `<div class="follow-plus" style="background: ${followButtonStyle}">${followButtonText}</div>`
            : '';
        const verifiedBadge = this.getVerifiedBadge(video.authorVerified || video.verified);

        const templateLabels = {
            none: '',
            'intro-pop': 'Intro Pop',
            'clean-title': 'Clean Title',
            cinema: 'Cinema',
            minimal: 'Minimal',
            trend: 'Trend'
        };
        const templateId = String(video.videoTemplate || 'none');
        const templateLabel = templateLabels[templateId] || templateId;
        const safeCoverText = escapeHtml(String(video.coverText || '').trim().slice(0, 48));
        const safeCoverSticker = escapeHtml(String(video.coverSticker || '').trim().slice(0, 16));
        const safeCoverColor = /^#[0-9a-fA-F]{6}$/.test(String(video.coverColor || ''))
            ? String(video.coverColor)
            : '#1cb8ff';
        const ageBadge = video.ageRestricted === true
            ? '<span class="video-meta-chip video-meta-chip-age">18+</span>'
            : '';
        const templateBadge = templateLabel
            ? `<span class="video-meta-chip video-meta-chip-template">${escapeHtml(templateLabel)}</span>`
            : '';
        const coverBadge = (safeCoverText || safeCoverSticker)
            ? `<div class="video-cover-badge" style="--cover-color: ${safeCoverColor};">${safeCoverSticker ? `<span class="video-cover-sticker">${safeCoverSticker}</span>` : ''}${safeCoverText ? `<span class="video-cover-text">${safeCoverText}</span>` : ''}</div>`
            : '';
        const metaBadges = `${ageBadge}${templateBadge}`;
        const likeIconDefault = 'assets/feed-like.svg';
        const likeIconActive = 'assets/feed-like-active.svg';
        const commentIcon = 'assets/feed-comment.png';
        const shareIcon = 'assets/feed-share.png';
        
        const posterAttr = video.thumbnail ? ` poster="${video.thumbnail}"` : '';

        div.innerHTML = `
            <div class="video-progress">
                <div class="video-progress-bar"></div>
            </div>
            <video loop playsinline preload="none" data-src="${video.url}"${posterAttr}></video>
            <div class="view-count">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="white">
                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                </svg>
                ${this.formatNumber(video.views || 0)}
            </div>
             <div class="video-overlay">
                 ${coverBadge}
                 <div class="side-bar">
                     <div class="avatar-container" data-action="subscribe">
                         <img src="${video.avatar}" alt="${video.author}" data-author="${video.author}">
                        ${followPlusHtml}
                     </div>
                    <div class="action-btn like-btn ${video.isLiked ? 'liked' : ''}" data-id="${video.id}" data-icon-default="${likeIconDefault}" data-icon-active="${likeIconActive}" title="Р›Р°Р№Рє">
                        <img src="${video.isLiked ? likeIconActive : likeIconDefault}" alt="Лайк" class="action-icon">
                        <span class="like-count" data-count="${parseInt(video.likes, 10) || 0}">${this.formatNumber(parseInt(video.likes, 10) || 0)}</span>
                    </div>
                    <div class="action-btn comment-btn" data-id="${video.id}" title="РљРѕРјРјРµРЅС‚Р°СЂРёРё">
                        <img src="${commentIcon}" alt="Комментарии" class="action-icon">
                        <span class="comment-count" data-count="${commentsCount}">${this.formatNumber(commentsCount)}</span>
                    </div>
                    <div class="action-btn share-btn" data-id="${video.id}" title="РџРѕРґРµР»РёС‚СЊСЃСЏ">
                        <img src="${shareIcon}" alt="Поделиться" class="action-icon">
                        <span>${this.formatNumber(video.shares || 0)}</span>
                    </div>
                </div>
                <div class="video-info">
                    <div class="username">
                        @${video.author}
                        ${verifiedBadge}
                    </div>
                    <div class="description">${video.desc}</div>
                    ${hashtagsHTML ? `<div class="hashtags">${hashtagsHTML}</div>` : ''}
                    <div class="music-row">
                        <svg class="music-note" width="12" height="12" viewBox="0 0 24 24" fill="#fff">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
                        </svg>
                        <span>РћСЂРёРіРёРЅР°Р»СЊРЅС‹Р№ Р·РІСѓРє - ${video.author}</span>
                    </div>
                    ${metaBadges ? `<div class="video-meta-badges">${metaBadges}</div>` : ''}
                    <div style="font-size: 11px; color: rgba(255,255,255,0.6); margin-top: 5px;">${timeAgo}</div>
                </div>
            </div>
        `;

        // Extra metadata for event handlers (avoid relying on fragile closures).
        const avatarContainer = div.querySelector('.avatar-container');
        if (avatarContainer) {
            if (video.uid) avatarContainer.dataset.uid = video.uid;
            if (video.author) avatarContainer.dataset.author = video.author;
        }

        const avatarImg = div.querySelector('.avatar-container img');
        if (avatarImg && video.uid) {
            avatarImg.dataset.uid = video.uid;
        }

        return div;
    }

    static getVerifiedBadge(isVerified = false) {
        if (!isVerified) return '';
        return '<img class="verified-badge" src="assets/verified.png" alt="верифицирован" role="button" tabindex="0" aria-label="Информация о верификации" title="Верифицированный профиль">';
    }

    static renderComments(comments) {
        return comments.map(comment => {
            const timeAgo = this.formatTimeAgo(comment.time);
            return `
                <div class="comment-item">
                    <img src="assets/default-avatar.svg" class="comment-avatar">
                    <div class="comment-content">
                        <div class="comment-author">
                            @${comment.user}
                            <span class="comment-time">${timeAgo}</span>
                        </div>
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-actions">
                            <span class="comment-action">рџ’¬ РћС‚РІРµС‚РёС‚СЊ</span>
                            <span class="comment-action">вќ¤пёЏ ${comment.likes || 0}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    }

    static renderShareOptions(videoId) {
        const url = `${window.location.origin}?video=${videoId}`;
        return `
            <div class="share-option" data-action="copy" data-url="${url}">
                <svg viewBox="0 0 24 24">
                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                </svg>
                <span>РљРѕРїРёСЂРѕРІР°С‚СЊ</span>
            </div>
            <div class="share-option" data-action="whatsapp" data-url="${url}">
                <svg viewBox="0 0 24 24">
                    <path d="M16.75 13.96c.25.13.41.2.46.3.06.11.04.61-.21 1.18-.2.56-1.24 1.1-1.7 1.12-.46.02-.47.36-2.96-.73-2.49-1.09-3.99-3.75-4.11-3.92-.12-.17-.96-1.38-.92-2.61.05-1.22.69-1.8.95-2.04.24-.26.51-.29.68-.26h.47c.15 0 .36-.06.55.45l.69 1.87c.06.13.1.28.01.44l-.27.41-.39.42c-.12.12-.26.25-.12.5.12.26.62 1.09 1.32 1.78.91.88 1.71 1.17 1.95 1.3.24.14.39.12.54-.04l.81-.94c.19-.25.35-.19.58-.11l1.67.88M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10c-1.97 0-3.8-.57-5.35-1.55L2 22l1.55-4.65A9.969 9.969 0 0 1 2 12 10 10 0 0 1 12 2m0 2a8 8 0 0 0-8 8c0 1.72.54 3.31 1.46 4.61L4.5 19.5l2.89-.96A7.95 7.95 0 0 0 12 20a8 8 0 0 0 8-8 8 8 0 0 0-8-8z"/>
                </svg>
                <span>WhatsApp</span>
            </div>
            <div class="share-option" data-action="telegram" data-url="${url}">
                <svg viewBox="0 0 24 24">
                    <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
                </svg>
                <span>Telegram</span>
            </div>
            <div class="share-option" data-action="twitter" data-url="${url}">
                <svg viewBox="0 0 24 24">
                    <path d="M22.46 6c-.77.35-1.6.58-2.46.69.88-.53 1.56-1.37 1.88-2.38-.83.5-1.75.85-2.72 1.05C18.37 4.5 17.26 4 16 4c-2.35 0-4.27 1.92-4.27 4.29 0 .34.04.67.11.98C8.28 9.09 5.11 7.38 3 4.79c-.37.63-.58 1.37-.58 2.15 0 1.49.75 2.81 1.91 3.56-.71 0-1.37-.2-1.95-.5v.03c0 2.08 1.48 3.82 3.44 4.21a4.22 4.22 0 0 1-1.93.07 4.28 4.28 0 0 0 4 2.98 8.521 8.521 0 0 1-5.33 1.84c-.34 0-.68-.02-1.02-.06C3.44 20.29 5.7 21 8.12 21 16 21 20.33 14.46 20.33 8.79c0-.19 0-.37-.01-.56.84-.6 1.56-1.36 2.14-2.23z"/>
                </svg>
                <span>Twitter</span>
            </div>
        `;
    }

    static renderFilterOptions(filters, activeFilter = 'none') {
        return filters.map(filter => `
            <div class="filter-option ${filter.id === activeFilter ? 'active' : ''}" data-filter="${filter.id}">
                <div style="width: 100%; height: 100%; background: #333; ${filter.css ? `filter: ${filter.css}` : ''}"></div>
                <div class="filter-name">${filter.name}</div>
            </div>
        `).join('');
    }

    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    static formatTimeAgo(timestamp) {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        
        if (seconds < 60) return 'С‚РѕР»СЊРєРѕ С‡С‚Рѕ';
        if (seconds < 3600) return `${Math.floor(seconds / 60)} РјРёРЅ РЅР°Р·Р°Рґ`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)} С‡ РЅР°Р·Р°Рґ`;
        if (seconds < 2592000) return `${Math.floor(seconds / 86400)} РґРЅ РЅР°Р·Р°Рґ`;
        return `${Math.floor(seconds / 2592000)} РјРµСЃ РЅР°Р·Р°Рґ`;
    }

    static showToast(msg, type = 'info') {
        const toast = document.getElementById('toast');
        const text = document.getElementById('toast-text');
        
        text.textContent = msg;
        
        let iconPath = '';
        switch(type) {
            case 'success':
                iconPath = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
                break;
            case 'error':
                iconPath = 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z';
                break;
            case 'warning':
                iconPath = 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z';
                break;
            default:
                iconPath = 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z';
        }
        
        toast.querySelector('svg').innerHTML = `<path d="${iconPath}"/>`;
        
        toast.classList.add('show');
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    static showLoading() {
        const feedContainer = document.getElementById('feed-container');
        const loader = document.createElement('div');
        loader.className = 'loader';
        loader.id = 'loading-indicator';
        feedContainer.appendChild(loader);
    }

    static hideLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) loader.remove();
    }

    static renderEditProfileForm(user) {
        const modal = document.getElementById('edit-profile-modal');
        
        // РћР±РЅРѕРІР»СЏРµРј РїРѕР»СЏ С„РѕСЂРјС‹
        document.getElementById('avatar-img-large').src = user.avatar;
        document.getElementById('edit-username').value = user.name || '';
        document.getElementById('edit-bio').value = user.bio || '';
        document.getElementById('edit-location').value = user.location || '';
        document.getElementById('edit-website').value = user.website || '';
        document.getElementById('edit-email').value = user.email;
        document.getElementById('edit-interests').value = user.interests || '';
        
        // РћР±РЅРѕРІР»СЏРµРј СЃС‡С‘С‚С‡РёРєРё СЃРёРјРІРѕР»РѕРІ
        this.updateCharCounters();
        
        // Р’С‹Р±РёСЂР°РµРј РїРѕР»
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const genderBtn = document.getElementById(`gender-${user.gender || 'other'}`);
        if (genderBtn) {
            genderBtn.classList.add('active');
        }
        
        modal.classList.add('open');
    }

    static updateCharCounters() {
        const usernameInput = document.getElementById('edit-username');
        const bioInput = document.getElementById('edit-bio');
        
        document.getElementById('username-count').textContent = usernameInput.value.length;
        document.getElementById('bio-count').textContent = bioInput.value.length;
        
        // РџСЂРµРґСѓРїСЂРµР¶РґРµРЅРёРµ РїСЂРё РїСЂРёР±Р»РёР¶РµРЅРёРё Рє Р»РёРјРёС‚Сѓ
        if (usernameInput.value.length >= 25) {
            document.querySelector('#edit-username').parentElement.querySelector('.char-count').classList.add('warning');
        } else {
            document.querySelector('#edit-username').parentElement.querySelector('.char-count').classList.remove('warning');
        }
        
        if (bioInput.value.length >= 140) {
            document.querySelector('#edit-bio').parentElement.querySelector('.char-count').classList.add('warning');
        } else {
            document.querySelector('#edit-bio').parentElement.querySelector('.char-count').classList.remove('warning');
        }
    }

    static getEditProfileData() {
        return {
            name: document.getElementById('edit-username').value.trim(),
            bio: document.getElementById('edit-bio').value.trim(),
            location: document.getElementById('edit-location').value.trim(),
            website: document.getElementById('edit-website').value.trim(),
            interests: document.getElementById('edit-interests').value.trim(),
            gender: AdvancedViewRenderer.getActiveGender()
        };
    }

    static getActiveGender() {
        const activeBtn = document.querySelector('.gender-btn.active');
        return activeBtn ? activeBtn.dataset.gender : 'other';
    }

    static closeEditProfileModal() {
        const modal = document.getElementById('edit-profile-modal');
        modal.classList.remove('open');
    }

    static validateProfileForm() {
        const name = document.getElementById('edit-username').value.trim();
        
        if (!name) {
            this.showToast('РРјСЏ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ РѕР±СЏР·Р°С‚РµР»СЊРЅРѕ', 'warning');
            return false;
        }
        
        if (name.length < 2) {
            this.showToast('РРјСЏ РґРѕР»Р¶РЅРѕ СЃРѕРґРµСЂР¶Р°С‚СЊ РјРёРЅРёРјСѓРј 2 СЃРёРјРІРѕР»Р°', 'warning');
            return false;
        }
        
        const website = document.getElementById('edit-website').value.trim();
        if (website && !this.isValidUrl(website)) {
            this.showToast('РќРµРІРµСЂРЅС‹Р№ С„РѕСЂРјР°С‚ URL', 'warning');
            return false;
        }
        
        return true;
    }

    static isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
}

