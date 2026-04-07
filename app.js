(() => {
  const STORAGE_KEY = "teztap-clean-ui-v3";
  const COMMISSION_RATE = 0.1;
  const root = document.getElementById("app");
  const toast = document.getElementById("toast");
  let toastTimer = null;

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm8.85 10.44 1.41 1.41-3.2 3.2-1.41-1.41 3.2-3.2Z"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 1 5 5v2.26c0 .8.32 1.56.88 2.12L19 13.5V15H5v-1.5l1.12-1.12A3 3 0 0 0 7 10.26V8a5 5 0 0 1 5-5Zm0 18a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 21Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c4.42 0 8 2.24 8 5v1H4v-1c0-2.76 3.58-5 8-5Z"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5.41L6.41 13 10 9.41 13.59 13 21 5l1.41 1.41L12 17z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5.05-5.54 11.78-6.23 12.6a1 1 0 0 1-1.54 0C10.54 20.78 5 14.05 5 9a7 7 0 0 1 7-7Zm0 9.5A2.5 2.5 0 1 0 12 6.5a2.5 2.5 0 0 0 0 5Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm1 4h-2v6l4 2 .9-1.8-2.9-1.45V7Z"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 0 2H6.5a.5.5 0 0 0 0 1H20v11H6.5A2.5 2.5 0 0 1 4 16.5v-9Zm13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5.25 3.44 9.4 8 11 4.56-1.6 8-5.75 8-11V5l-8-3Zm-1 12.59-2.3-2.3-1.4 1.42L11 17.4l5.7-5.7-1.4-1.42L11 14.59Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.41 7.41-1.41-1.41L8.59 11.41a2 2 0 0 0 0 2.83L14 19.66l1.41-1.41L10 12.83l5.41-5.42Z"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2h2V6a2 2 0 0 1 2-2Zm0 3h6V6H9v1Zm12 5h-6v2H9v-2H3v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5Z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h2v2H4V6Zm4 0h12v2H8V6ZM4 11h2v2H4v-2Zm4 0h12v2H8v-2ZM4 16h2v2H4v-2Zm4 0h12v2H8v-2Z"/></svg>'
  };

  const ORDER_CITY_OPTIONS = ["Алматы", "Нур-Султан", "Кокшетау", "Шымкент", "Актау", "Уральск", "Актобе", "Караганда", "Семей", "Павлодар"];
  const ORDER_ADDRESS_OPTIONS = {
    "Алматы": ["Mega Alma-Ata", "Арбат, Жибек Жолы", "Абая - Байтурсынова", "Dostyk Plaza", "Сайран автовокзал"],
    "Нур-Султан": ["Хан Шатыр", "Байтерек", "MEGA Silk Way", "Вокзал Нурлы Жол", "Триумф Астаны"],
    "Кокшетау": ["Центральный рынок", "ТЦ Rio", "Абылай хана, центр", "Автовокзал", "Набережная Копы"],
    "Шымкент": ["Shymkent Plaza", "Арбат Шымкент", "Центральный парк", "Автовокзал Самал", "Mega Planet"],
    "Актау": ["Актау Молл", "Набережная 15 мкр", "ТРК Актау", "Автовокзал", "Площадь Ынтымак"],
    "Уральск": ["City Center", "Центральный рынок", "Парк Кирова", "ЖД вокзал", "ТРЦ Галактика"],
    "Актобе": ["Keruen City", "Центральный стадион", "Автовокзал Сапар", "Парк Первого Президента", "Mega Aktobe"],
    "Караганда": ["City Mall", "ЦУМ", "Автовокзал", "Таир", "Парк Победы"],
    "Семей": ["Центральный рынок", "Арбат Семей", "ЖД вокзал", "ТЦ Казына", "Парк Абая"],
    "Павлодар": ["Batyr Mall", "Набережная", "ЖД вокзал", "ЦУМ Павлодар", "Greenwich"]
  };
  const ORDER_SERVICE_OPTIONS = ["Курьерская доставка", "Документы", "Покупка в магазине", "Личные вещи", "Посылка", "Цветы и подарок"];
  const ORDER_TIME_OPTIONS = ["Как можно скорее", "В течение часа", "Сегодня до вечера", "Сегодня к точному времени", "Завтра утром"];

// REMOVED: DEMO_EXECUTORS - теперь реальные пользователи из Firestore

  let state = loadState();
  normalizeState();
  render();
  
  // Скрыть splash screen после загрузки
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("hide");
    }
  }, 2400);

  root.addEventListener("click", handleClick);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  root.addEventListener("keydown", handleKeyDown);

  function createInitialState() {
    return {
      settings: { theme: "light" },
      session: { isLoggedIn: false, step: "onboard", mode: "register", pending: null },
      ui: {
        tab: "home",
        homeFilter: "available",
        search: "",
        modal: null,
        selectedCity: "Алматы",
        cityMenuOpen: false,
        createOrderCity: "Алматы",
        createOrderAddress: "",
        createOrderPhotoPreview: ""
      },
      account: null,
      orders: [],
      notifications: [],
      map: null,
      detailMap: null
    };
  }

  function loadState() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : createInitialState();
    } catch (error) {
      console.warn("Не удалось загрузить TezTap state.", error);
      return createInitialState();
    }
  }

  function normalizeState() {
    const fresh = createInitialState();
    state.settings = { ...fresh.settings, ...state.settings };
    state.session = { ...fresh.session, ...state.session };
    
    // ВСЕГДА открываем с чистого UI
    state.ui = {
      tab: state.session.isLoggedIn ? "home" : "home",
      homeFilter: "available",
      search: "",
      modal: null, // Никогда не открываем модали при загрузке
      selectedCity: state.ui?.selectedCity || "Алматы",
      cityMenuOpen: false,
      createOrderCity: state.ui?.createOrderCity || state.account?.city || state.ui?.selectedCity || "Алматы",
      createOrderAddress: state.ui?.createOrderAddress || "",
      createOrderPhotoPreview: state.ui?.createOrderPhotoPreview || ""
    };
    
    state.notifications = Array.isArray(state.notifications) ? state.notifications : fresh.notifications;
    state.orders = Array.isArray(state.orders) && state.orders.length ? state.orders : fresh.orders;

    if (state.account) {
      state.account = {
        id: state.account.id || generateAccountId(),
        phone: state.account.phone || "",
        password: state.account.password || "",
        role: state.account.role || "executor",
        name: state.account.name || "Новый пользователь",
        city: state.account.city || "Алматы",
        about: state.account.about || "",
        avatar: state.account.avatar || "",
        verificationStatus: state.account.verificationStatus || "none",
        balance: Number(state.account.balance ?? 1250),
        debt: Number(state.account.debt ?? 0),
        firstGraceUsed: Boolean(state.account.firstGraceUsed),
        jobsDone: Number(state.account.jobsDone ?? 0),
        rating: Number(state.account.rating ?? 0),
        responseTime: state.account.responseTime || "",
        delivery_type: state.account.role === "executor" ? (state.account.delivery_type || "foot") : null,
        demoReady: Boolean(state.account.demoReady),
        isOnline: Boolean(state.account.isOnline),
        createdAt: state.account.createdAt || new Date().toISOString(),
        updatedAt: state.account.updatedAt || new Date().toISOString()
      };
    }

    // Инициализируем Leaflet объекты (они не сохраняются)
    state.map = null;
    state.detailMap = null;

    document.documentElement.dataset.theme = state.settings.theme;
  }

  function persist() {
    // Создаем копию состояния БЕЗ Leaflet объектов (они циклические)
    const stateToSave = {
      ...state,
      map: null,
      detailMap: null
    };
    
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn("Не удалось сохранить состояние:", error);
    }
  }

  function render() {
    document.documentElement.dataset.theme = state.settings.theme;
    const hasModal = Boolean(state.ui.modal);
    document.body.classList.toggle("modal-open", hasModal);
    if (hasModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    root.innerHTML = `
      <div class="app-shell">
        ${state.session.isLoggedIn ? renderAppHeader() : renderGuestHeader()}
        <main class="shell-content">
          ${state.session.isLoggedIn ? renderLoggedInView() : renderAuthView()}
        </main>
        ${state.session.isLoggedIn ? renderBottomNav() : ""}
      </div>
      ${renderModal()}
    `;

    // Инициализируем карту маршрута если открыта модаль "detail"
    if (state.ui.modal && state.ui.modal.type === "detail" && state.ui.modal.orderId) {
      const order = getOrderById(state.ui.modal.orderId);
      if (order) {
        initDetailMapRoute(order);
      }
    }
  }

  function renderGuestHeader() {
    if (state.session.step === "onboard" || state.session.step === "role") {
      return "";
    }
    return `
      <header class="shell-header">
        <div class="brand">
          <div class="brand-mark">T</div>
          <div><strong>TRAINTUP</strong><span>Быстрые подработки</span></div>
        </div>
        <div class="header-actions"><button class="theme-button" data-action="toggle-theme" aria-label="Сменить тему">${state.settings.theme === "dark" ? "☀️" : "🌙"}</button></div>
      </header>
    `;
  }

  function renderAppHeader() {
    const unread = getUnreadCount();
    const roleLabel = state.account.role === "executor" ? "Исполнитель" : "Заказчик";
    return `
      <header class="shell-header">
        <div class="location-block">
          <div class="city-dropdown ${state.ui.cityMenuOpen ? "open" : ""}">
            <button class="city-trigger" type="button" data-action="toggle-city-menu" aria-expanded="${state.ui.cityMenuOpen ? "true" : "false"}" aria-label="Выбрать город">
              <span class="location-icon city-trigger-icon">${ICONS.pin}</span>
              <span class="city-trigger-copy">
                <span class="city-trigger-label">${escapeHtml(state.ui.selectedCity)}</span>
                <span class="city-trigger-role">${roleLabel}</span>
              </span>
              <span class="city-trigger-chevron">${ICONS.chevron}</span>
            </button>
            ${state.ui.cityMenuOpen ? `
              <div class="city-menu" role="menu" aria-label="Список городов">
                ${ORDER_CITY_OPTIONS.map(city => `
                  <button class="city-option ${state.ui.selectedCity === city ? "active" : ""}" type="button" data-action="select-city" data-city="${escapeHtml(city)}" role="menuitem">
                    <span class="city-option-name">${escapeHtml(city)}</span>
                    ${state.ui.selectedCity === city ? '<span class="city-option-check">✓</span>' : ""}
                  </button>
                `).join("")}
              </div>
            ` : ""}
          </div>
        </div>
        <div class="header-actions">
          <button class="icon-button" data-action="open-tab" data-tab="notifications" aria-label="Уведомления"${unread ? ` data-badge="${unread > 9 ? "9+" : unread}"` : ""}>${ICONS.bell}</button>
          <button class="theme-button" data-action="toggle-theme" aria-label="Сменить тему">${state.settings.theme === "dark" ? "☀️" : "🌙"}</button>
        </div>
      </header>
    `;
  }

  function renderAuthView() {
    switch (state.session.step) {
      case "role": return renderRoleStep();
      case "register": return renderRegisterStep();
      case "confirm": return renderConfirmStep();
      default: return renderOnboardStep();
    }
  }

  function renderOnboardStep() {
    const hasAccount = Boolean(state.account);
    return `
      <section class="screen auth-layout auth-onboard">
        <article class="onboard-card">
          <div class="onboard-topbar">
            <div class="onboard-brand">
              <div class="onboard-brand-mark">T</div>
              <div class="onboard-brand-copy">
                <strong>TRAINTUP</strong>
                <span>Быстрые подработки</span>
              </div>
            </div>
            <button class="theme-button" data-action="toggle-theme" aria-label="Сменить тему">${state.settings.theme === "dark" ? "☀️" : "🌙"}</button>
          </div>

          <div class="onboard-hero-panel">
            <div class="onboard-copy">
              <p class="eyebrow">TRAINTUP</p>
              <h1 class="onboard-title">Быстрые заказы рядом <span>с вами</span></h1>
            </div>

            <div class="onboard-illustration" aria-hidden="true">
              <img class="onboard-illustration-image" src="img/Start.png" alt="">
            </div>
          </div>

          <div class="onboard-actions-card">
            <button class="btn btn-primary btn-block onboard-start-btn" data-action="go-step" data-step="role">Регистрация</button>
            <p class="onboard-login-line">
              Уже есть аккаунт?
              <button class="onboard-link-button" type="button" data-action="go-step" data-step="register" data-mode="login">Войти</button>
            </p>
          </div>
        </article>
      </section>
    `;
  }

  function renderRoleStep() {
    const role = getPendingRole();
    return `
      <section class="screen stack role-screen">
        <div class="role-screen-head">
          <button class="back-button" data-action="go-step" data-step="onboard" aria-label="Назад">${ICONS.chevron}</button>
          <div class="section-copy"><p class="eyebrow">02 Выбор роли</p><h2 class="section-title">Кем вы будете?</h2><span class="helper">Выберите роль, чтобы мы сразу открыли нужный сценарий.</span></div>
        </div>
        <div class="role-choice-list">
          <button class="role-choice-card ${role === "executor" ? "active" : ""}" data-action="pick-role" data-role="executor">
            <span class="role-choice-media executor">🧑‍💼</span>
            <span class="role-choice-copy">
              <strong>Исполнитель</strong>
              <span>Находит задания рядом и быстро берет подработку в работу.</span>
            </span>
          </button>
          <button class="role-choice-card ${role === "customer" ? "active" : ""}" data-action="pick-role" data-role="customer">
            <span class="role-choice-media customer">🛍️</span>
            <span class="role-choice-copy">
              <strong>Заказчик</strong>
              <span>Размещает задания, получает отклики и выбирает исполнителя.</span>
            </span>
          </button>
        </div>
        <p class="role-screen-note">Роль можно будет поменять позже в личном кабинете.</p>
      </section>
    `;
  }

  function renderRegisterStep() {
    const mode = state.session.mode;
    const role = getPendingRole();
    return `
      <section class="screen stack">
        <div class="section-head">
          <button class="back-button" data-action="go-step" data-step="role" aria-label="Назад">${ICONS.chevron}</button>
          <div class="section-copy"><p class="eyebrow">03 ${mode === "register" ? "Регистрация" : "Вход"}</p><h2 class="section-title">${mode === "register" ? "Создание аккаунта" : "Вход в аккаунт"}</h2><span class="helper">Телефон и пароль. Для демо используйте код подтверждения 1234.</span></div>
        </div>
        <div class="mode-switch" role="tablist" aria-label="Режим авторизации">
          <button type="button" class="${mode === "register" ? "active" : ""}" data-action="set-auth-mode" data-mode="register">Регистрация</button>
          <button type="button" class="${mode === "login" ? "active" : ""}" data-action="set-auth-mode" data-mode="login">Вход</button>
        </div>
        <form class="form" data-form="auth">
          <article class="card stack">
            ${mode === "register" ? `<span class="theme-note">Роль: ${getRoleLabel(role)}</span>` : ""}
            
            ${mode === "register" && role === "executor" ? `
            <div class="field">
              <span class="field-title">Способ доставки</span>
              <div class="radio-group">
                <label class="radio-item">
                  <input type="radio" name="delivery_type" value="foot" ${!state.session.pending?.delivery_type || state.session.pending?.delivery_type === "foot" ? "checked" : ""}>
                  <span>🚶 Пеший курьер</span>
                </label>
                <label class="radio-item">
                  <input type="radio" name="delivery_type" value="bike" ${state.session.pending?.delivery_type === "bike" ? "checked" : ""}>
                  <span>🚴 Велосипед</span>
                </label>
                <label class="radio-item">
                  <input type="radio" name="delivery_type" value="car" ${state.session.pending?.delivery_type === "car" ? "checked" : ""}>
                  <span>🚗 На машине</span>
                </label>
              </div>
            </div>
            ` : ""}
            
            <div class="field"><span class="field-title">Телефон</span><input type="tel" name="phone" placeholder="+7 777 123 45 67" value="${escapeHtml(state.session.pending?.phone || state.account?.phone || "")}" required></div>
            <div class="field"><span class="field-title">Пароль</span><input type="password" name="password" placeholder="Минимум 4 символа" value="${escapeHtml(state.session.pending?.password || "")}" required></div>
            <p class="form-hint">${mode === "register" ? "После этого покажем экран подтверждения телефона." : "Если аккаунт уже есть, код подтверждения не нужен."}</p>
            <button class="btn btn-primary btn-block" type="submit">${mode === "register" ? "Продолжить" : "Войти"}</button>
          </article>
        </form>
      </section>
    `;
  }

  function renderConfirmStep() {
    const pending = state.session.pending || {};
    return `
      <section class="screen stack">
        <div class="section-head">
          <button class="back-button" data-action="go-step" data-step="register" aria-label="Назад">${ICONS.chevron}</button>
          <div class="section-copy"><p class="eyebrow">04 Подтверждение</p><h2 class="section-title">Подтверждение телефона</h2><span class="helper">Мы отправили код на ${escapeHtml(pending.phone || "+7 777 123 45 67")}.</span></div>
        </div>
        <form class="form" data-form="confirm">
          <article class="otp-card card">
            <div class="otp-grid">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="0" autocomplete="one-time-code">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="1">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="2">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="3">
            </div>
            <p class="form-hint">Пока используйте фиксированный код подтверждения: 1234.</p>
            <button class="btn btn-primary btn-block" type="submit">Подтвердить</button>
          </article>
        </form>
      </section>
    `;
  }

  function renderLoggedInView() {
    switch (state.ui.tab) {
      case "create": return renderCreateView();
      case "notifications": return renderNotificationsView();
      case "profile": return renderProfileView();
      default: return renderHomeView();
    }
  }

  function getPresetAddresses(city) {
    return ORDER_ADDRESS_OPTIONS[city] || ORDER_ADDRESS_OPTIONS["Алматы"] || [];
  }

  function renderHomeView() {
    // Если исполнитель и не у сети, показать кнопки активации
    if (state.account.role === "executor" && !state.account.isOnline) {
      return `
        <section class="view stack">
          <div class="offline-banner">
            <div class="offline-content">
              <h2 class="offline-title">😴 Вы отдыхаете</h2>
              <p class="offline-subtitle">Нажмите "На линии" чтобы начать получать заказы</p>
            </div>
          </div>
          <div class="activation-buttons">
            <button class="btn btn-primary btn-block" data-action="activate-online">🟢 Перейти На линию</button>
            <button class="btn btn-ghost btn-block" data-action="view-profile" data-action-type="profile">Посмотреть профиль</button>
          </div>
        </section>
      `;
    }
    
    const orders = getVisibleOrders();
    const labels = state.account.role === "executor" ? { available: "Доступные", work: "В работе", done: "Завершенные" } : { available: "Активные", work: "В работе", done: "Завершенные" };
    
    return `
      <section class="view stack">
        <!-- Главный банер -->
        <div class="home-banner">
          <div class="banner-content">
            <div class="banner-top">
              <p class="banner-label">${state.account.role === "executor" ? "🚀 Быстрые заказы" : "📋 Ваши заказы"}</p>
              ${state.account.role === "executor" ? `<button class="btn btn-sm btn-outlined" data-action="deactivate-online">🔴 Отдыхаю</button>` : ""}
            </div>
            <h1 class="banner-title">${state.account.role === "executor" ? "Заказы рядом с вами" : "Управляйте заказами"}</h1>
            <p class="banner-subtitle">${state.account.role === "executor" ? "Выбирайте задания, откликайтесь и зарабатывайте" : "Следите за откликами и управляйте в одном месте"}</p>
          </div>
        </div>

        <!-- Поиск -->
        <div class="search-section">
          <label class="search-box"><span class="inline-icon">${ICONS.search}</span><input type="search" name="search" placeholder="Найти задачу или адрес" value="${escapeHtml(state.ui.search)}"></label>
        </div>

        <!-- Фильтры -->
        <div class="filters-section">
          <div class="filter-label">Показывать</div>
          <div class="filter-chips">
            ${Object.entries(labels).map(([key, label]) => `<button class="chip ${state.ui.homeFilter === key ? "chip-active" : ""}" data-action="set-filter" data-filter="${key}">${escapeHtml(label)}</button>`).join("")}
          </div>
        </div>

        <!-- Список заказов -->
        <div class="orders-section">
          <div class="section-header">
            <h2 class="section-heading">${state.account.role === "executor" ? "Лента заказов" : "Ваши задачи"}</h2>
            ${orders.length ? `<span class="orders-count">${orders.length}</span>` : ""}
          </div>
          <div class="orders-list">
            ${orders.length ? orders.map(renderOrderCard).join("") : renderEmptyOrders()}
          </div>
        </div>
      </section>
    `;
  }

  function renderCreateView() {
    if (state.account.role !== "customer") {
      return `
        <section class="view stack">
          <div class="section-copy"><p class="eyebrow">Создание заказа</p><h2 class="section-title">Создание доступно заказчику</h2><span class="helper">Сейчас ваш профиль в режиме исполнителя. Можно переключиться без потери данных.</span></div>
          <article class="card stack"><button class="btn btn-primary btn-block" data-action="switch-role">Переключить на заказчика</button><button class="btn btn-ghost btn-block" data-action="open-tab" data-tab="home">Вернуться к ленте</button></article>
        </section>
      `;
    }
    const selectedCity = state.ui.createOrderCity || state.account.city || state.ui.selectedCity || ORDER_CITY_OPTIONS[0];
    const addressOptions = getPresetAddresses(selectedCity);
    const selectedAddress = addressOptions.includes(state.ui.createOrderAddress) ? state.ui.createOrderAddress : (addressOptions[0] || "");
    const photoPreview = state.ui.createOrderPhotoPreview;
    return `
      <section class="view stack">
        <div class="section-copy"><p class="eyebrow">Создание заказа</p><h2 class="section-title">Создайте красивый заказ</h2><span class="helper">Выберите готовый адрес, добавьте фото и отметьте срочность, если нужен Express.</span></div>
        <form class="form" data-form="create-order">
          <article class="card stack create-order-card">
            <div class="create-order-hero">
              <div>
                <p class="create-order-kicker">TezTap Express</p>
                <h3 class="create-order-title">Новый заказ</h3>
                <p class="create-order-subtitle">Чем понятнее карточка, тем быстрее откликнутся исполнители.</p>
              </div>
              <span class="create-order-badge">Express Ready</span>
            </div>

            <div class="field">
              <span class="field-title">Тип заказа</span>
              <select name="service" required>
                ${ORDER_SERVICE_OPTIONS.map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`).join("")}
              </select>
            </div>

            <div class="field">
              <span class="field-title">Краткий заголовок</span>
              <input type="text" name="title" placeholder="Например: Забрать документы и привезти в офис" required>
            </div>

            <div class="field-grid">
              <div class="field">
                <span class="field-title">Город</span>
                <select name="order_city">
                  ${ORDER_CITY_OPTIONS.map((city) => `<option value="${escapeHtml(city)}" ${selectedCity === city ? "selected" : ""}>${escapeHtml(city)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <span class="field-title">Точка получения / доставки</span>
                <select name="order_address">
                  ${addressOptions.map((address) => `<option value="${escapeHtml(address)}" ${selectedAddress === address ? "selected" : ""}>${escapeHtml(address)}</option>`).join("")}
                </select>
              </div>
            </div>

            <div class="field-grid">
              <div class="field">
                <span class="field-title">Когда</span>
                <select name="when">
                  ${ORDER_TIME_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}
                </select>
              </div>
              <div class="field">
                <span class="field-title">Бюджет</span>
                <input type="number" name="budget" min="500" step="100" placeholder="2000" required>
              </div>
            </div>

            <div class="field">
              <span class="field-title">Срочность</span>
              <div class="priority-toggle">
                <label class="priority-option">
                  <input type="radio" name="priority" value="standard" checked>
                  <span>Стандарт</span>
                </label>
                <label class="priority-option express">
                  <input type="radio" name="priority" value="express">
                  <span>Express</span>
                </label>
              </div>
            </div>

            <div class="field">
              <span class="field-title">Оплата</span>
              <select name="payment"><option value="Kaspi">Kaspi</option><option value="Наличные">Наличные</option><option value="Halyk">Halyk</option><option value="Другой банк">Другой банк</option></select>
            </div>

            <div class="field">
              <span class="field-title">Фото заказа</span>
              <div class="order-photo-upload">
                <div class="order-photo-preview ${photoPreview ? "has-image" : ""}">
                  ${photoPreview ? `<img src="${photoPreview}" alt="Фото заказа">` : '<span>Фото заказа</span>'}
                </div>
                <div class="order-photo-copy">
                  <label class="avatar-label">
                    <input type="file" name="order_photo" accept="image/*" class="avatar-input">
                    Загрузить фото
                  </label>
                  <span class="field-hint">Фото поможет исполнителю быстрее понять задачу.</span>
                </div>
              </div>
            </div>

            <div class="field">
              <span class="field-title">Описание</span>
              <textarea name="description" placeholder="Укажите важные детали: что забрать, кому передать, что учесть"></textarea>
            </div>

            <button class="btn btn-primary btn-block" type="submit">Опубликовать заказ</button>
          </article>
        </form>
      </section>
    `;
  }

  function renderNotificationsView() {
    const notifications = state.notifications.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return `
      <section class="view stack">
        <div class="card-row"><div class="section-copy"><p class="eyebrow">Уведомления</p><h2 class="section-title">Все события</h2><span class="helper">Отклики, торг, завершения и комиссии.</span></div><button class="btn btn-ghost" data-action="mark-notifications-read">Прочитать все</button></div>
        <div class="notification-list">${notifications.length ? notifications.map(renderNotificationCard).join("") : `<article class="empty-state stack"><strong>Пока тихо</strong><p>Когда появятся отклики, торг или системные события, они будут здесь.</p></article>`}</div>
      </section>
    `;
  }

  function renderMapView() {
    const orders = getVisibleOrders();
    return `
      <section class="view map-view stack">
        <div class="section-copy"><p class="eyebrow">Навигация</p><h2 class="section-title">Заказы на карте</h2><span class="helper">Выбирайте подработку рядом с вами на интерактивной карте.</span></div>
        <div class="map-wrapper">
          <div id="mapView"></div>
        </div>
        <div class="map-legend">
          <div class="legend-item"><span class="legend-dot executor"></span><span>Исполнители</span></div>
          <div class="legend-item"><span class="legend-dot customer"></span><span>Заказы</span></div>
          <div class="legend-item"><span class="legend-dot user"></span><span>Мое местоположение</span></div>
        </div>
        ${orders.length > 0 ? `<div class="list">${orders.slice(0, 5).map(renderOrderCard).join("")}</div>` : `<article class="empty-state stack"><strong>Нет заказов на карте</strong><p>Когда появятся заказы в начале города, они отобразятся здесь.</p></article>`}
      </section>
    `;
  }

  function renderProfileView() {
    const verificationMap = { none: "Не верифицирован", review: "На проверке", verified: "Верифицирован" };
    return `
      <section class="view stack profile-main">
        <!-- Большая красивая карточка профиля -->
        <article class="profile-hero">
          <div class="profile-hero-bg"></div>
          <div class="profile-hero-content">
            <div class="profile-avatar-large">${renderAvatar(state.account.avatar, state.account.name, 80)}</div>
            <div class="profile-hero-info">
              <h1 class="profile-hero-name">${escapeHtml(state.account.name)}</h1>
              <p class="profile-hero-role">${getRoleLabel(state.account.role)} • ${escapeHtml(state.account.city)}</p>
              <p class="profile-hero-id">ID: ${escapeHtml(formatAccountId(state.account.id))}</p>
              ${state.account.about ? `<p class="profile-hero-about">${escapeHtml(state.account.about)}</p>` : ''}
            </div>
            <span class="profile-verification-badge ${state.account.verificationStatus === "verified" ? "verified" : state.account.verificationStatus === "review" ? "review" : "none"}">
              ${escapeHtml(verificationMap[state.account.verificationStatus])}
            </span>
          </div>
          <div class="profile-actions-top">
            <button class="btn btn-primary" data-action="open-edit-profile">Изменить профиль</button>
            <button class="btn btn-secondary" data-action="open-verification">Верификация</button>
          </div>
        </article>

        <!-- Статистика -->
        <div class="stats-row">
          <article class="stat-card">
            <span class="stat-label">Заказов выполнено</span>
            <strong class="stat-value">${state.account.jobsDone}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Рейтинг</span>
            <strong class="stat-value">${(4.8).toFixed(1)}⭐</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Отклики</span>
            <strong class="stat-value">${Math.floor(Math.random() * 50) + 10}</strong>
          </article>
        </div>

        <!-- Кошелёк -->
        <article class="profile-wallet-card">
          <div class="wallet-header">
            <h2 class="section-title">Кошелёк</h2>
            <button class="btn btn-ghost btn-sm" data-action="open-wallet">Подробнее</button>
          </div>
          <div class="wallet-grid-2">
            <div class="wallet-item">
              <span class="wallet-label">Баланс</span>
              <strong class="wallet-value">${formatMoney(state.account.balance)}</strong>
            </div>
            <div class="wallet-item">
              <span class="wallet-label">Комиссия</span>
              <strong class="wallet-value">${formatMoney(state.account.debt)}</strong>
            </div>
          </div>
          <button class="btn btn-primary btn-block" data-action="open-wallet">Пополнить баланс</button>
        </article>

        <!-- Опции -->
        <article class="profile-options">
          <h3 class="section-title">Опции</h3>
          <button class="option-item" data-action="switch-role">
            <span class="option-icon">🔄</span>
            <div class="option-content">
              <span class="option-title">Сменить роль</span>
              <span class="option-desc">Переключитесь между исполнителем и заказчиком</span>
            </div>
          </button>
          <button class="option-item" data-action="open-settings">
            <span class="option-icon">⚙️</span>
            <div class="option-content">
              <span class="option-title">Настройки приложения</span>
              <span class="option-desc">Язык, тема, уведомления</span>
            </div>
          </button>
          <button class="option-item" data-action="logout">
            <span class="option-icon">🚪</span>
            <div class="option-content">
              <span class="option-title">Выход</span>
              <span class="option-desc">Выйти из аккаунта</span>
            </div>
          </button>
        </article>
      </section>
    `;
  }

  function renderBottomNav() {
    const tabs = [
      { id: "home", label: "Главная", icon: ICONS.home },
      { id: "create", label: "Создать", icon: ICONS.plus, extraClass: "nav-create" },
      { id: "notifications", label: "Отклики", icon: ICONS.bell },
      { id: "profile", label: "Профиль", icon: ICONS.user }
    ];
    return `\n      <nav class="bottom-nav">${tabs.map((tab) => `<button class="nav-item ${tab.extraClass || ""} ${state.ui.tab === tab.id ? "active" : ""}" data-action="open-tab" data-tab="${tab.id}">${tab.icon}<span>${escapeHtml(tab.label)}</span></button>`).join("")}</nav>\n    `;
  }

  function renderOrderCard(order) {
    const price = order.finalPrice || order.budget;
    const isAssigned = order.status === "assigned";
    const isDone = order.status === "done";
    const isExpress = Boolean(order.express || order.urgent);
    const statusLabel = isAssigned ? "В работе" : isDone ? "Завершен" : "Открыт";
    const statusClass = isAssigned ? "status-assigned" : isDone ? "status-done" : "status-open";
    
    return `
      <article class="order-card" data-action="open-order" data-order-id="${order.id}">
        ${order.photo ? `<div class="order-card-image"><img src="${order.photo}" alt="${escapeHtml(order.title)}"></div>` : ""}
        <div class="card-header">
          <div class="card-badges">
            ${isExpress ? '<span class="badge badge-express">Express</span>' : ''}
            <span class="badge badge-category">${escapeHtml(order.category)}</span>
            <span class="badge ${statusClass}">${statusLabel}</span>
          </div>
        </div>
        
        <div class="card-body">
          <h3 class="order-title">${escapeHtml(order.title)}</h3>
          <p class="order-description">${escapeHtml((order.description || "").substring(0, 60))}</p>
          
          <div class="card-meta">
            <div class="meta-row">
              <span class="meta-label">📍 Адрес</span>
              <span class="meta-value">${escapeHtml(order.address)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">⏰ Время</span>
              <span class="meta-value">${escapeHtml(order.when)}</span>
            </div>
            <div class="meta-row">
              <span class="meta-label">💳 Оплата</span>
              <span class="meta-value">${escapeHtml(order.payment)}</span>
            </div>
          </div>
        </div>
        
        <div class="card-footer">
          <div class="price-section">
            <p class="price-label">Бюджет</p>
            <p class="price-value">${formatMoney(price)}</p>
          </div>
          <button class="btn btn-primary btn-sm" type="button" data-action="open-order" data-order-id="${order.id}">${getOrderActionLabel(order)} →</button>
        </div>
        
        <div class="card-author">
          <span class="author-label">От:</span>
          <button class="author-name" data-action="view-user-profile" data-user-id="${order.ownerId}" data-user-name="${escapeHtml(order.ownerName)}">${escapeHtml(order.ownerName)}</button>
        </div>
      </article>
    `;
  }

  function renderNotificationCard(item) {
    return `
      <article class="notification-card ${item.read ? "" : "unread"}">
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.body)}</p>
        <span class="subtle">${escapeHtml(formatDateTime(item.createdAt))}</span>
      </article>
    `;
  }

  function renderModal() {
    if (!state.ui.modal) {
      return '<div class="modal-layer" hidden></div>';
    }

    let title = "";
    let body = "";

    if (state.ui.modal.type === "welcome") {
      title = "Добро пожаловать";
      body = renderWelcomeModal();
    }
    if (state.ui.modal.type === "detail") {
      const order = getOrderById(state.ui.modal.orderId);
      if (!order) return '<div class="modal-layer" hidden></div>';
      title = "Детали заказа";
      body = renderDetailModal(order);
    }
    if (state.ui.modal.type === "bargain") {
      const order = getOrderById(state.ui.modal.orderId);
      if (!order) return '<div class="modal-layer" hidden></div>';
      title = "Торг и чат";
      body = renderBargainModal(order);
    }
    if (state.ui.modal.type === "complaint") {
      const order = getOrderById(state.ui.modal.orderId);
      if (!order) return '<div class="modal-layer" hidden></div>';
      title = "Подать жалобу";
      body = renderComplaintModal(order);
    }
    if (state.ui.modal.type === "wallet") {
      title = "Комиссия и баланс";
      body = renderWalletModal();
    }
    if (state.ui.modal.type === "verification") {
      title = "Верификация";
      body = renderVerificationModal();
    }
    if (state.ui.modal.type === "commission") {
      const order = getOrderById(state.ui.modal.orderId);
      if (!order) return '<div class="modal-layer" hidden></div>';
      title = "Комиссия к оплате";
      body = renderCommissionModal(order);
    }
    if (state.ui.modal.type === "user-profile") {
      title = "Профиль пользователя";
      body = renderUserProfileModal(state.ui.modal.userId, state.ui.modal.userName);
    }
    if (state.ui.modal.type === "edit-profile") {
      title = "Редактирование профиля";
      body = renderEditProfileModal();
    }
    if (state.ui.modal.type === "activation-animation") {
      title = "";
      body = renderActivationAnimation();
    }

    return `
      <div class="modal-layer">
        <div class="modal-backdrop" ${state.ui.modal.type !== "activation-animation" ? 'data-action="close-modal"' : ""}></div>
        <section class="modal-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}" ${state.ui.modal.type === "activation-animation" ? 'class="modal-panel activation-modal"' : ""}>
          ${state.ui.modal.type !== "activation-animation" ? `<header class="modal-head">
            <div class="section-copy"><p class="eyebrow">TezTap</p><h2 class="modal-title">${escapeHtml(title)}</h2></div>
            <button class="close-button" data-action="close-modal" aria-label="Закрыть">${ICONS.chevron}</button>
          </header>` : ""}
          <div class="modal-body">${body}</div>
        </section>
      </div>
    `;
  }

  function renderWelcomeModal() {
    return `
      <div class="stack">
        <article class="welcome-box stack">
          <p class="eyebrow">Аккаунт создан</p>
          <h3 class="section-title">Ваш ID готов</h3>
          <p>Теперь можно откликаться на задания, создавать заказы и управлять комиссией.</p>
          <div class="profile-id">${escapeHtml(formatAccountId(state.account.id))}</div>
        </article>
        <button class="btn btn-primary btn-block" data-action="welcome-to-home">Перейти в приложение</button>
        <button class="btn btn-ghost btn-block" data-action="open-tab" data-tab="profile">Открыть профиль</button>
      </div>
    `;
  }

  function renderDetailModal(order) {
    const commission = calculateCommission(order.finalPrice || order.budget);
    const isOwner = order.ownerId === state.account.id;
    const isAssignee = order.assigneeId === state.account.id;
    const isExpress = Boolean(order.express || order.urgent);
    return `
      <div class="detail-card">
        <div id="detailMapRoute" class="detail-map-route"></div>
        ${order.photo ? `<div class="detail-order-image"><img src="${order.photo}" alt="${escapeHtml(order.title)}"></div>` : ""}
        <div class="detail-head">
          <div class="stack">
            <div class="detail-tags">${isExpress ? '<span class="mini-tag success">Express</span>' : ""}<span class="mini-tag primary">${escapeHtml(order.category)}</span></div>
            <h3 class="detail-title">${escapeHtml(order.title)}</h3>
          </div>
          <div class="detail-price">${formatMoney(order.finalPrice || order.budget)}</div>
        </div>
        <div class="detail-grid">
          <div class="detail-stat"><span class="detail-label">Адрес</span><strong class="detail-value">${escapeHtml(order.address)}</strong></div>
          <div class="detail-stat"><span class="detail-label">Когда</span><strong class="detail-value">${escapeHtml(order.when)}</strong></div>
          <div class="detail-stat"><span class="detail-label">Оплата</span><strong class="detail-value">${escapeHtml(order.payment)}</strong></div>
          <div class="detail-stat"><span class="detail-label">Комиссия</span><strong class="detail-value">${formatMoney(commission)}</strong></div>
        </div>
        <article class="card stack"><strong>Описание</strong><p class="detail-copy">${escapeHtml(order.description)}</p></article>
        ${renderStatusBlock(order)}
        ${isOwner ? renderOwnerCandidates(order) : ""}
        <div class="detail-actions-wrapper">
          <div class="detail-actions">${renderDetailButtons(order, isOwner, isAssignee)}</div>
          <button class="btn btn-complaint" data-action="open-complaint" data-order-id="${order.id}" title="Подать жалобу">▲</button>
        </div>
      </div>
    `;
  }

  function renderStatusBlock(order) {
    const items = [{
      title: order.status === "done" ? "Заказ завершен" : order.status === "assigned" ? "Заказ в работе" : "Заказ ожидает исполнителя",
      text: order.status === "done" ? "Статус закрыт, итоговая цена зафиксирована." : order.status === "assigned" ? `Исполнитель: ${order.assigneeName || "назначен"}` : "Можно откликнуться сразу или предложить свою цену."
    }];

    if (order.status === "done") {
      items.push({ title: "Комиссия 10%", text: order.commissionSettled ? "Комиссия по этому заказу уже оплачена." : "После завершения сумма попадает в долг исполнителя до оплаты." });
    }

    return `
      <article class="timeline-card stack">
        <strong>Статус</strong>
        <div class="status-list">
          ${items.map((item) => `<div class="timeline-item"><span class="timeline-icon">${ICONS.list}</span><div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.text)}</p></div></div>`).join("")}
        </div>
      </article>
    `;
  }

  function renderOwnerCandidates(order) {
    if (!order.bids.length) {
      return `<article class="empty-state stack"><strong>Пока нет откликов</strong><p>Как только исполнитель отправит цену или сообщение, они появятся здесь.</p></article>`;
    }

    return `
      <article class="stack">
        <strong>Отклики исполнителей</strong>
        ${order.bids.slice().sort((a, b) => a.price - b.price).map((bid) => `
          <article class="candidate-card stack">
            <div class="candidate-row"><div><strong>${escapeHtml(bid.userName)}</strong><span class="subtle">Предлагает ${formatMoney(bid.price)}</span></div><button class="btn btn-secondary" data-action="accept-bid" data-order-id="${order.id}" data-bid-id="${bid.id}">Принять</button></div>
            <p class="candidate-note">${escapeHtml(bid.note || "Без комментария")}</p>
          </article>
        `).join("")}
      </article>
    `;
  }

  function renderDetailButtons(order, isOwner, isAssignee) {
    if (order.status === "done") return '<button class="btn btn-success btn-block" type="button">Завершено</button>';
    if (isOwner && order.status === "assigned") return `<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="${order.id}">Завершить заказ</button>`;
    if (isAssignee && order.status === "assigned") return `<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="${order.id}">Подтвердить выполнение</button>`;
    if (state.account.role === "executor" && !isOwner && order.status === "open") return `<button class="btn btn-primary" data-action="take-order" data-order-id="${order.id}">Выполнить заказ</button><button class="btn btn-secondary" data-action="open-bargain" data-order-id="${order.id}">Предложить свою цену</button>`;
    if (isOwner && order.status === "open") return '<button class="btn btn-ghost btn-block" type="button">Ожидаем отклики</button>';
    return '<button class="btn btn-ghost btn-block" type="button">Заказ уже занят</button>';
  }

  function renderBargainModal(order) {
    const myBid = order.bids.filter((bid) => bid.userId === state.account.id).slice(-1)[0];
    return `
      <div class="stack">
        <div class="stats-grid"><div class="summary-card"><span class="summary-label">Цена заказчика</span><strong class="summary-value">${formatMoney(order.finalPrice || order.budget)}</strong></div><div class="summary-card"><span class="summary-label">Мое предложение</span><strong class="summary-value">${myBid ? formatMoney(myBid.price) : "—"}</strong></div></div>
        <form class="form" data-form="offer" data-order-id="${order.id}">
          <article class="card stack">
            <div class="field-grid"><div class="field"><span class="field-title">Своя цена</span><input type="number" name="price" min="500" step="100" placeholder="2500" value="${myBid ? escapeHtml(String(myBid.price)) : ""}" required></div><div class="field"><span class="field-title">Комментарий</span><input type="text" name="note" placeholder="Могу взять быстро" value="${myBid ? escapeHtml(myBid.note || "") : ""}"></div></div>
            <button class="btn btn-primary btn-block" type="submit">Отправить предложение</button>
          </article>
        </form>
        <article class="card stack"><strong>История торга</strong><div class="offer-list">${order.bids.length ? order.bids.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((bid) => `<div class="offer-item"><div class="card-row"><strong>${escapeHtml(bid.userName)}</strong><span class="offer-price">${formatMoney(bid.price)}</span></div><p>${escapeHtml(bid.note || "Без комментария")}</p><small>${escapeHtml(formatDateTime(bid.createdAt))}</small></div>`).join("") : `<p class="helper">Предложений пока нет.</p>`}</div></article>
        <article class="chat-block stack">
          <strong>Чат по заказу</strong>
          <div class="chat-thread">${order.chat.length ? order.chat.map((message) => renderMessageBubble(message)).join("") : `<div class="bubble system"><p>Чат пока пуст. Отправьте первое сообщение.</p></div>`}</div>
          <form class="form" data-form="message" data-order-id="${order.id}"><div class="field"><span class="field-title">Сообщение</span><textarea name="text" placeholder="Например: Могу начать через 15 минут"></textarea></div><button class="btn btn-ghost btn-block" type="submit">Отправить сообщение</button></form>
        </article>
      </div>
    `;
  }

  function renderActivationAnimation() {
    return `
      <div class="activation-animation">
        <svg class="map-dots" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
          <!-- Карта-подложка -->
          <rect width="400" height="500" fill="transparent" stroke="#2a3a4a" stroke-width="2" rx="8"/>
          
          <!-- Генерируем случайные точки города -->
          <circle cx="80" cy="100" r="4" fill="#ff6b6b" class="city-dot pulse-red"/>
          <circle cx="320" cy="150" r="4" fill="#51cf66" class="city-dot pulse-green"/>
          <circle cx="150" cy="280" r="4" fill="#ff6b6b" class="city-dot pulse-red"/>
          <circle cx="280" cy="350" r="4" fill="#51cf66" class="city-dot pulse-green"/>
          <circle cx="100" cy="400" r="4" fill="#ff6b6b" class="city-dot pulse-red"/>
          <circle cx="200" cy="50" r="4" fill="#51cf66" class="city-dot pulse-green"/>
          <circle cx="350" cy="450" r="4" fill="#ff6b6b" class="city-dot pulse-red"/>
          <circle cx="50" cy="280" r="5" fill="#4dabf7" class="my-location pulse-blue"/>
          
          <!-- Линии между точками (сеть) -->
          <line x1="80" y1="100" x2="150" y2="280" stroke="#2a3a4a" stroke-width="1" opacity="0.5"/>
          <line x1="150" y1="280" x2="280" y2="350" stroke="#2a3a4a" stroke-width="1" opacity="0.5"/>
          <line x1="50" y1="280" x2="80" y2="100" stroke="#2a3a4a" stroke-width="1" opacity="0.5"/>
          <line x1="200" y1="50" x2="320" y2="150" stroke="#2a3a4a" stroke-width="1" opacity="0.5"/>
        </svg>
        <div class="activation-text">
          <p class="activation-title">🟢 Включение режима поиска</p>
          <p class="activation-subtitle">Идет поиск заказов рядом с вами...</p>
        </div>
      </div>
    `;
  }

  function renderWalletModal() {
    return `
      <div class="stack">
        <div class="stats-grid"><div class="summary-card"><span class="summary-label">Текущий баланс</span><strong class="summary-value">${formatMoney(state.account.balance)}</strong></div><div class="summary-card"><span class="summary-label">Комиссия</span><strong class="summary-value">${formatMoney(state.account.debt)}</strong></div></div>
        <article class="status-card ${state.account.debt > 0 ? "warning" : "success"}"><div class="stack"><strong>${state.account.debt > 0 ? "Комиссия ожидает оплаты" : "Комиссия погашена"}</strong><p>${state.account.debt > 0 ? "Пока комиссия не погашена, следующий заказ взять нельзя." : "Можно брать следующие заказы без ограничений."}</p></div></article>
        <form class="form" data-form="topup-modal"><article class="card stack"><div class="field"><span class="field-title">Сумма пополнения</span><input type="number" name="amount" min="500" step="500" value="1000"></div><div class="quick-row"><button class="quick-amount" type="button" data-action="set-topup" data-value="1000">1 000</button><button class="quick-amount" type="button" data-action="set-topup" data-value="2000">2 000</button><button class="quick-amount" type="button" data-action="set-topup" data-value="5000">5 000</button></div><button class="btn btn-primary btn-block" type="submit">Пополнить баланс</button></article></form>
        <button class="btn btn-warning btn-block" data-action="pay-debt">Оплатить комиссию</button>
      </div>
    `;
  }

  function renderEditProfileModal() {
    return `
      <form class="form" data-form="edit-profile" class="modal-section stack">
        <div class="field">
          <span class="field-title">Полное имя</span>
          <input type="text" name="name" value="${escapeHtml(state.account.name)}" required placeholder="Ваше имя">
        </div>
        
        <div class="field">
          <span class="field-title">Город проживания</span>
          <input type="text" name="city" value="${escapeHtml(state.account.city)}" required placeholder="Город">
        </div>
        
        <div class="field">
          <span class="field-title">О себе</span>
          <textarea name="about" placeholder="Расскажите о причины виды предоставляемых услуг... (максимум 200 символов)" maxlength="200">${escapeHtml(state.account.about)}</textarea>
          <small class="field-hint">${state.account.about.length}/200 символов</small>
        </div>
        
        <div class="field">
          <span class="field-title">Аватар</span>
          <div class="avatar-upload">
            <div class="avatar-preview">${renderAvatar(state.account.avatar, state.account.name, 60)}</div>
            <input type="file" name="avatar" accept="image/*" class="avatar-input">
            <label class="avatar-label">Выберите фото</label>
          </div>
        </div>
        
        <div class="modal-actions">
          <button class="btn btn-primary btn-block" type="submit">Сохранить изменения</button>
          <button class="btn btn-ghost btn-block" type="button" data-action="close-modal">Отмена</button>
        </div>
      </form>
    `;
  }

  function renderUserProfileModal(userId, userName) {
    // Загружаем данные пользователя из Firebase (async)
    const user = { 
      id: userId.substring(0, 8),
      name: userName || "Пользователь", 
      rating: 4.8, 
      jobsDone: 47, 
      verified: false, 
      about: "Опытный исполнитель с положительной репутацией",
      avatar: "",
      responseTime: "~5 мин",
      city: "Алматы"
    };
    
    // Попытка загрузить реальные данные из Firebase (non-blocking)
    if (window.FirebaseService) {
      window.FirebaseService.getUser(userId)
        .then(fbUser => {
          if (fbUser) {
            user.name = fbUser.name || userName;
            user.id = fbUser.id ? fbUser.id.substring(0, 8) : userId.substring(0, 8);
            user.rating = fbUser.rating || 0;
            user.jobsDone = fbUser.jobsDone || 0;
            user.verified = fbUser.verificationStatus === "verified";
            user.about = fbUser.about || "Профиль";
            user.avatar = fbUser.avatar || "";
            user.city = fbUser.city || "Алматы";
            render(); // Перерендерим с актуальными данными
          }
        })
        .catch(err => console.error("Ошибка загрузки профиля:", err));
    }
    
    return `
      <div class="profile-modal-content">
        <!-- Header с аватаром -->
        <div class="profile-header">
          <div class="profile-avatar-section">
            ${renderAvatar(user.avatar, user.name, 80)}
            ${user.verified ? '<span class="verify-badge">✓</span>' : ''}
          </div>
          <div class="profile-info">
            <h2 class="profile-name">${escapeHtml(user.name)}</h2>
            <p class="profile-city">📍 ${escapeHtml(user.city)}</p>
            <div class="profile-badges">
              ${user.verified ? '<span class="badge badge-verified">Верифицирован</span>' : '<span class="badge badge-unverified">Не верифицирован</span>'}
            </div>
          </div>
        </div>

        <!-- Статистика -->
        <div class="profile-stats">
          <div class="stat-item">
            <div class="stat-icon">⭐</div>
            <div class="stat-content">
              <div class="stat-value">${user.rating.toFixed(1)}</div>
              <div class="stat-label">Рейтинг</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">✅</div>
            <div class="stat-content">
              <div class="stat-value">${user.jobsDone}</div>
              <div class="stat-label">Выполнено</div>
            </div>
          </div>
          <div class="stat-item">
            <div class="stat-icon">⏱</div>
            <div class="stat-content">
              <div class="stat-value">${user.responseTime}</div>
              <div class="stat-label">Ответ</div>
            </div>
          </div>
        </div>

        <!-- Об исполнителе -->
        <div class="profile-section">
          <h3 class="section-title">О пользователе</h3>
          <p class="profile-bio">${escapeHtml(user.about)}</p>
        </div>

        <!-- Действие -->
        <button class="btn btn-primary btn-block" data-action="close-modal">Узнать больше</button>
      </div>
    `;
  }

  function renderVerificationModal() {

    return `
      <div class="stack">
        <article class="verification-card stack">
          <strong>Проверка профиля</strong>
          <p>После отправки заявка перейдет на ручную проверку. Пока это демо, но логика уже готова.</p>
          <div class="verification-list">
            <div class="checkbox-item"><span class="checkbox-dot"></span><div><strong>Документ личности</strong><small>Паспорт или удостоверение</small></div></div>
            <div class="checkbox-item"><span class="checkbox-dot"></span><div><strong>Фото лица</strong><small>Для личных профилей</small></div></div>
            <div class="checkbox-item"><span class="checkbox-dot"></span><div><strong>Реквизиты</strong><small>Для организаций и брендов</small></div></div>
          </div>
        </article>
        <button class="btn btn-primary btn-block" data-action="submit-verification">Подать заявку</button>
      </div>
    `;
  }

  function renderCommissionModal(order) {
    const commission = calculateCommission(order.finalPrice || order.budget);
    return `
      <div class="stack">
        <article class="status-card warning stack"><strong>Комиссия к оплате</strong><p>После завершения заказа комиссия автоматически добавлена в ваш долг.</p></article>
        <div class="stats-grid"><div class="summary-card"><span class="summary-label">Заказ</span><strong class="summary-value">${formatMoney(order.finalPrice || order.budget)}</strong></div><div class="summary-card"><span class="summary-label">Комиссия 10%</span><strong class="summary-value">${formatMoney(commission)}</strong></div></div>
        <button class="btn btn-warning btn-block" data-action="pay-debt">Оплатить сейчас</button>
        <button class="btn btn-ghost btn-block" data-action="open-wallet">Открыть кошелек</button>
      </div>
    `;
  }

  function renderComplaintModal(order) {
    return `
      <div class="stack">
        <article class="status-card warning stack">
          <strong>Подать жалобу</strong>
          <p>Расскажите нам о проблеме. Наша команда рассмотрит вашу жалобу в течение 24 часов.</p>
        </article>
        <form class="form" data-form="complaint" data-order-id="${order.id}">
          <article class="card stack">
            <div class="field">
              <span class="field-title">Причина жалобы</span>
              <select name="reason" required>
                <option value="">— Выберите причину —</option>
                <option value="quality">Качество выполненной работы</option>
                <option value="incomplete">Заказ выполнен не полностью</option>
                <option value="delayed">Задержка в выполнении</option>
                <option value="price">Спорная цена</option>
                <option value="damage">Повреждение / потеря предметов</option>
                <option value="behavior">Поведение исполнителя</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div class="field">
              <span class="field-title">Описание проблемы</span>
              <textarea name="description" placeholder="Подробно объясните, что произошло..." required></textarea>
            </div>
            <div class="field">
              <span class="field-title">Сумма в споре (если актуально)</span>
              <input type="number" name="amount" min="0" step="100" placeholder="0">
            </div>
          </article>
          <button class="btn btn-warning btn-block" type="submit">Подать жалобу</button>
          <button class="btn btn-ghost btn-block" type="button" data-action="close-modal">Отмена</button>
        </form>
      </div>
    `;
  }

  function renderMessageBubble(message) {
    const roleClass = message.senderId === state.account.id ? "me" : message.role === "system" ? "system" : "";
    return `<div class="bubble ${roleClass}"><strong>${escapeHtml(message.senderName)}</strong><p>${escapeHtml(message.text)}</p><small>${escapeHtml(formatDateTime(message.createdAt))}</small></div>`;
  }

  function renderAvatar(src, name) {
    return src ? `<div class="avatar" style="border-radius: 50%; overflow: hidden;"><img src="${src}" alt="Аватар" style="width:100%;height:100%;object-fit:cover"></div>` : `<div class="avatar" style="border-radius: 50%; overflow: hidden;">${escapeHtml(getInitials(name))}</div>`;
  }

  function getVisibleOrders() {
    const search = state.ui.search.trim().toLowerCase();
    return state.orders.slice().sort((a, b) => ({ open: 0, assigned: 1, done: 2 }[a.status] - { open: 0, assigned: 1, done: 2 }[b.status])).filter((order) => {
      // Фильтр по городу
      if (order.city !== state.ui.selectedCity) return false;
      
      if (search) {
        const haystack = `${order.title} ${order.address} ${order.city} ${order.description}`.toLowerCase();
        if (!haystack.includes(search)) return false;
      }
      if (state.account.role === "executor") {
        if (state.ui.homeFilter === "available") return order.status === "open" && order.ownerId !== state.account.id;
        if (state.ui.homeFilter === "work") return order.assigneeId === state.account.id && order.status === "assigned";
        return order.assigneeId === state.account.id && order.status === "done";
      }
      if (state.ui.homeFilter === "available") return order.ownerId === state.account.id && order.status === "open";
      if (state.ui.homeFilter === "work") return order.ownerId === state.account.id && order.status === "assigned";
      return order.ownerId === state.account.id && order.status === "done";
    });
  }

  function renderEmptyOrders() {
    return state.account.role === "customer" ? `<article class="empty-state stack"><strong>Пока нет ваших заказов</strong><p>Создайте первую задачу и получите отклики исполнителей прямо в приложении.</p><button class="btn btn-primary" data-action="open-tab" data-tab="create">Создать заказ</button></article>` : `<article class="empty-state stack"><strong>Подходящих заказов пока нет</strong><p>Смените фильтр или зайдите чуть позже, новые задания появятся автоматически.</p></article>`;
  }

  function getOrderActionLabel(order) {
    if (order.status === "done") return "Детали";
    if (state.account.role === "executor" && order.status === "open" && order.ownerId !== state.account.id) return "Открыть";
    if (order.status === "assigned") return "В работе";
    return "Открыть";
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) {
      if (state.ui.cityMenuOpen && !event.target.closest(".city-dropdown")) {
        state.ui.cityMenuOpen = false;
        persist();
        render();
      }
      return;
    }
    const { action } = target.dataset;

    if (action !== "toggle-city-menu" && action !== "select-city" && state.ui.cityMenuOpen) {
      state.ui.cityMenuOpen = false;
    }

    if (action === "toggle-city-menu") {
      state.ui.cityMenuOpen = !state.ui.cityMenuOpen;
      persist();
      render();
      return;
    }
    if (action === "select-city") {
      const nextCity = String(target.dataset.city || "").trim();
      if (!nextCity) return;
      state.ui.selectedCity = nextCity;
      state.ui.cityMenuOpen = false;
      persist();
      render();
      showToast(`Город: ${nextCity}`);
      return;
    }

    if (action === "toggle-theme") {
      state.settings.theme = state.settings.theme === "dark" ? "light" : "dark";
      persist();
      render();
      return;
    }
    if (action === "go-step") {
      state.session.step = target.dataset.step || "onboard";
      if (target.dataset.mode) state.session.mode = target.dataset.mode;
      persist();
      render();
      return;
    }
    if (action === "pick-role") {
      state.session.pending = { ...(state.session.pending || {}), role: target.dataset.role || "executor" };
      state.session.step = "register";
      persist();
      render();
      return;
    }
    if (action === "set-auth-mode") {
      state.session.mode = target.dataset.mode || "register";
      persist();
      render();
      return;
    }
    if (action === "open-tab") {
      state.ui.tab = target.dataset.tab || "home";
      if (state.ui.tab === "notifications") state.notifications = state.notifications.map((item) => ({ ...item, read: true }));
      if (state.ui.modal && state.ui.modal.type === "welcome" && state.ui.tab === "profile") state.ui.modal = null;
      persist();
      render();
      return;
    }
    if (action === "set-filter") {
      state.ui.homeFilter = target.dataset.filter || "available";
      persist();
      render();
      return;
    }
    if (action === "open-order") {
      if (!target.dataset.orderId) return;
      state.ui.modal = { type: "detail", orderId: target.dataset.orderId };
      persist();
      render();
      return;
    }
    if (action === "close-modal") {
      state.ui.modal = null;
      persist();
      render();
      return;
    }
    if (action === "open-bargain") {
      state.ui.modal = { type: "bargain", orderId: target.dataset.orderId };
      persist();
      render();
      return;
    }
    if (action === "open-complaint") {
      state.ui.modal = { type: "complaint", orderId: target.dataset.orderId };
      persist();
      render();
      return;
    }
    if (action === "view-user-profile") {
      const userId = target.dataset.userId;
      const userName = target.dataset.userName;
      
      state.ui.modal = { type: "user-profile", userId: userId, userName: userName };
      persist();
      render();
      return;
    }
    if (action === "open-wallet") {
      state.ui.modal = { type: "wallet" };
      persist();
      render();
      return;
    }
    if (action === "open-edit-profile") {
      state.ui.modal = { type: "edit-profile" };
      persist();
      render();
      return;
    }
    if (action === "logout") {
      state.session.isLoggedIn = false;
      state.account = null;
      state.ui.tab = "home";
      state.session.step = "onboard";
      persist();
      render();
      showToast("Вы вышли из аккаунта");
      return;
    }
    if (action === "open-settings") {
      showToast("Настройки в разработке");
      return;
    }
    if (action === "open-verification") {
      state.ui.modal = { type: "verification" };
      persist();
      render();
      return;
    }
    if (action === "submit-verification") {
      state.account.verificationStatus = "review";
      state.ui.modal = null;
      addNotification("Заявка на верификацию отправлена", "Профиль перешел в статус проверки.");
      persist();
      render();
      showToast("Заявка на верификацию отправлена");
      return;
    }
    if (action === "welcome-to-home") {
      state.ui.modal = null;
      state.ui.tab = "home";
      persist();
      render();
      return;
    }
    if (action === "set-topup") {
      const modalInput = root.querySelector('.modal-layer input[name="amount"]');
      if (modalInput) modalInput.value = target.dataset.value || "1000";
      return;
    }
    if (action === "pay-debt") {
      payDebt();
      return;
    }
    if (action === "take-order") {
      takeOrder(target.dataset.orderId);
      return;
    }
    if (action === "complete-order") {
      completeOrder(target.dataset.orderId);
      return;
    }
    if (action === "accept-bid") {
      acceptBid(target.dataset.orderId, target.dataset.bidId);
      return;
    }
    if (action === "mark-notifications-read") {
      state.notifications = state.notifications.map((item) => ({ ...item, read: true }));
      persist();
      render();
      return;
    }
    if (action === "switch-role") {
      state.account.role = state.account.role === "executor" ? "customer" : "executor";
      state.ui.tab = state.account.role === "customer" ? "create" : "home";
      bootstrapAccountOrders();
      persist();
      render();
      showToast(`Роль переключена: ${getRoleLabel(state.account.role)}`);
    }
    if (action === "activate-online") {
      state.ui.modal = { type: "activation-animation" };
      persist();
      render();
      // показываем анимацию 3-4 секунды
      setTimeout(() => {
        state.account.isOnline = true;
        state.ui.modal = null;
        persist();
        render();
        bootstrapAccountOrders();
      }, 3500);
      return;
    }
    if (action === "deactivate-online") {
      state.account.isOnline = false;
      state.orders = [];
      persist();
      render();
      showToast("Вы перешли на отдых");
      return;
    }
  }

  async function handleSubmit(event) {
    const form = event.target.closest("form[data-form]");
    if (!form) return;
    event.preventDefault();
    const formName = form.dataset.form;
    const data = new FormData(form);

    if (formName === "auth") {
      const phone = String(data.get("phone") || "").trim();
      const password = String(data.get("password") || "").trim();
      const delivery_type = String(data.get("delivery_type") || "foot");
      if (!phone || password.length < 4) {
        showToast("Введите телефон и пароль минимум из 4 символов");
        return;
      }
      if (state.session.mode === "login") {
        // ВХОД: используем Firebase
        handleLoginViaFirebase(phone, password);
        return;
      }
      // РЕГИСТРАЦИЯ: переходим к подтверждению
      state.session.pending = { role: getPendingRole(), phone, password, delivery_type };
      state.session.step = "confirm";
      persist();
      render();
      showToast("Код отправлен. Для входа используйте 1234.");
      return;
    }

    if (formName === "confirm") {
      const code = Array.from(form.querySelectorAll("[data-otp]")).map((input) => input.value.trim()).join("");
      if (code.length < 4) {
        showToast("Введите код 1234");
        return;
      }
      // СОЗДАНИЕ АККАУНТА: используем Firebase
      handleConfirmViaFirebase(code);
      return;
    }

    if (formName === "create-order") {
      const service = String(data.get("service") || ORDER_SERVICE_OPTIONS[0]).trim();
      const city = String(data.get("order_city") || state.ui.createOrderCity || state.account.city || "Алматы").trim();
      const address = String(data.get("order_address") || state.ui.createOrderAddress || "").trim();
      const title = String(data.get("title") || "").trim();
      const when = String(data.get("when") || ORDER_TIME_OPTIONS[0]).trim();
      const description = String(data.get("description") || "").trim();
      const budget = Number(data.get("budget") || 0);
      const payment = String(data.get("payment") || "Kaspi");
      const priority = String(data.get("priority") || "standard");
      const isExpress = priority === "express";
      let orderPhoto = state.ui.createOrderPhotoPreview || "";
      const photoFile = form.querySelector('input[name="order_photo"]')?.files?.[0];

      if (!orderPhoto && photoFile) {
        try {
          orderPhoto = await readFileAsDataUrl(photoFile);
        } catch (error) {
          console.warn("Не удалось прочитать фото заказа", error);
        }
      }

      if (!title || !address || !when || budget <= 0) {
        showToast("Заполните обязательные поля заказа");
        return;
      }
      const order = {
        id: generateOrderId(),
        title,
        address,
        city,
        when,
        budget,
        payment,
        category: service || guessCategory(title),
        urgent: isExpress,
        express: isExpress,
        photo: orderPhoto,
        status: "open",
        description: description || "Описание будет уточнено в чате.",
        ownerId: state.account.id,
        ownerName: state.account.name,
        ownerVerified: state.account.verificationStatus === "verified",
        assigneeId: "",
        assigneeName: "",
        finalPrice: budget,
        bids: [],
        chat: [{ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: "Заказ опубликован и ждет откликов.", createdAt: new Date().toISOString() }],
        completedAt: "",
        commissionSettled: false
      };
      state.orders.unshift(order);
      addNotification("Заказ опубликован", `${title} • ${formatMoney(budget)}`);
      state.ui.tab = "home";
      state.ui.homeFilter = "available";
      state.ui.selectedCity = city;
      state.ui.createOrderCity = city;
      state.ui.createOrderAddress = getPresetAddresses(city)[0] || "";
      state.ui.createOrderPhotoPreview = "";
      
      // Сохраняем заказ в Firebase
      if (window.FirebaseService) {
        window.FirebaseService.saveOrder(order).catch(err => console.error('Failed to save order:', err));
      }
      
      persist();
      render();
      showToast("Заказ опубликован");
      return;
    }

    if (formName === "offer") {
      const order = getOrderById(form.dataset.orderId);
      if (!order) return;
      const price = Number(data.get("price") || 0);
      const note = String(data.get("note") || "").trim();
      if (price <= 0) {
        showToast("Укажите цену предложения");
        return;
      }
      if (state.account.role !== "executor") {
        showToast("Торг доступен только исполнителю");
        return;
      }
      const bid = { id: generateId("BID"), userId: state.account.id, userName: state.account.name, price, note, createdAt: new Date().toISOString() };
      order.bids.push(bid);
      order.chat.push({ id: generateId("MSG"), senderId: state.account.id, senderName: state.account.name, role: "executor", text: note ? `Предлагаю ${formatMoney(price)}. ${note}` : `Предлагаю ${formatMoney(price)}.`, createdAt: new Date().toISOString() });
      addNotification("Новое предложение по заказу", `${state.account.name} предложил ${formatMoney(price)}`);
      
      // Log to Firebase
      if (window.FirebaseService) {
        window.FirebaseService.logEvent('bid_created', {
          orderId: order.id,
          bidId: bid.id,
          bidAmount: price,
          executorId: state.account.id
        }).catch(err => console.error('Failed to log event:', err));
      }
      
      persist();
      render();
      showToast("Предложение отправлено");
      return;
    }

    if (formName === "message") {
      const order = getOrderById(form.dataset.orderId);
      if (!order) return;
      const text = String(data.get("text") || "").trim();
      if (!text) {
        showToast("Введите сообщение");
        return;
      }
      order.chat.push({ id: generateId("MSG"), senderId: state.account.id, senderName: state.account.name, role: state.account.role, text, createdAt: new Date().toISOString() });
      addNotification("Новое сообщение", `${state.account.name}: ${text}`);
      persist();
      render();
      return;
    }

    if (formName === "topup-inline" || formName === "topup-modal") {
      const amount = Number(data.get("amount") || 0);
      if (amount <= 0) {
        showToast("Введите сумму пополнения");
        return;
      }
      state.account.balance += amount;
      addNotification("Баланс пополнен", `На ${formatMoney(amount)}.`);
      
      // Log to Firebase
      if (window.FirebaseService) {
        window.FirebaseService.logEvent('wallet_topup', {
          accountId: state.account.id,
          amount: amount,
          newBalance: state.account.balance
        }).catch(err => console.error('Failed to log event:', err));
      }
      
      persist();
      render();
      showToast(`Баланс пополнен на ${formatMoney(amount)}`);
      return;
    }

    if (formName === "profile") {
      const name = String(data.get("name") || "").trim();
      const city = String(data.get("city") || "").trim();
      const about = String(data.get("about") || "").trim();
      if (!name || !city) {
        showToast("Имя и город обязательны");
        return;
      }
      state.account.name = name;
      state.account.city = city;
      state.account.about = about;
      updateOwnOrdersMeta();
      persist();
      render();
      showToast("Профиль сохранен");
    }

    if (formName === "complaint") {
      const order = getOrderById(form.dataset.orderId);
      if (!order) return;
      const reason = String(data.get("reason") || "").trim();
      const description = String(data.get("description") || "").trim();
      const amount = Number(data.get("amount") || 0);
      if (!reason || !description) {
        showToast("Заполните причину и описание жалобы");
        return;
      }
      
      // Create complaint record
      const complaint = {
        id: generateId("CMP"),
        orderId: order.id,
        userId: state.account.id,
        userName: state.account.name,
        reason,
        description,
        amount,
        status: "open",
        createdAt: new Date().toISOString()
      };
      
      // Add complaint to order
      if (!order.complaints) order.complaints = [];
      order.complaints.push(complaint);
      
      // Log to Firebase
      if (window.FirebaseService) {
        window.FirebaseService.logEvent('complaint_filed', {
          orderId: order.id,
          complaintId: complaint.id,
          reason: reason,
          amount: amount
        }).catch(err => console.error('Failed to log event:', err));
      }
      
      addNotification("Жалоба подана", `Наша команда рассмотрит её в течение 24 часов.`);
      state.ui.modal = { type: "detail", orderId: order.id };
      persist();
      render();
      showToast("Жалоба успешно подана");
      return;
    }

    if (formName === "edit-profile") {
      const name = String(data.get("name") || "").trim();
      const city = String(data.get("city") || "").trim();
      const about = String(data.get("about") || "").trim();
      if (!name || !city) {
        showToast("Имя и город обязательны");
        return;
      }
      state.account.name = name;
      state.account.city = city;
      state.account.about = about;
      updateOwnOrdersMeta();
      state.ui.modal = null;
      
      // Save to Firebase
      if (window.FirebaseService) {
        window.FirebaseService.saveAccount({
          id: state.account.id,
          name: state.account.name,
          city: state.account.city,
          avatar: state.account.avatar,
          about: state.account.about,
          rating: state.account.rating,
          jobsDone: state.account.jobsDone,
          responseTime: state.account.responseTime,
          phone: state.account.phone,
          role: state.account.role,
          createdAt: state.account.createdAt || new Date().toISOString()
        }).catch(err => console.error('Failed to save profile:', err));
        
        window.FirebaseService.logEvent('profile_updated', {
          accountId: state.account.id,
          name: name,
          city: city
        }).catch(err => console.error('Failed to log event:', err));
      }
      
      persist();
      render();
      showToast("Профиль обновлен");
    }
  }

  function handleInput(event) {
    const input = event.target;
    if (input.name === "search") {
      const value = input.value;
      state.ui.search = value;
      persist();
      render();
      const restored = root.querySelector("input[name=\"search\"]");
      if (restored) {
        restored.focus();
        restored.setSelectionRange(value.length, value.length);
      }
      return;
    }
    if (input.matches("[data-otp]")) {
      input.value = input.value.slice(0, 1).toUpperCase();
      if (input.value) {
        const next = root.querySelector(`[data-otp="${Number(input.dataset.otp) + 1}"]`);
        if (next) next.focus();
      }
    }
  }

  function handleChange(event) {
    const input = event.target;
    
    // Обработка смены города
    if (input.classList.contains("city-select")) {
      state.ui.selectedCity = input.value;
      persist();
      render();
      showToast(`Фильтр города изменен на ${input.value}`);
      return;
    }

    if (input.name === "order_city") {
      const nextCity = String(input.value || "").trim() || "Алматы";
      const addresses = getPresetAddresses(nextCity);
      state.ui.createOrderCity = nextCity;
      state.ui.createOrderAddress = addresses[0] || "";
      persist();
      render();
      return;
    }

    if (input.name === "order_address") {
      state.ui.createOrderAddress = String(input.value || "").trim();
      persist();
      return;
    }
    
    if (input.name === "avatar" && input.files && input.files[0]) {
      readFileAsDataUrl(input.files[0]).then((result) => {
        state.account.avatar = result;
        persist();
        render();
        showToast("Аватар обновлен");
      }).catch(() => {
        showToast("Не удалось загрузить изображение");
      });
      return;
    }

    if (input.name === "order_photo" && input.files && input.files[0]) {
      readFileAsDataUrl(input.files[0]).then((result) => {
        state.ui.createOrderPhotoPreview = result;
        persist();
        render();
        showToast("Фото заказа добавлено");
      }).catch(() => {
        showToast("Не удалось загрузить фото");
      });
    }
  }

  function handleKeyDown(event) {
    if (event.key === "Escape" && state.ui.modal) {
      state.ui.modal = null;
      persist();
      render();
      return;
    }
    if (event.key === "Escape" && state.ui.cityMenuOpen) {
      state.ui.cityMenuOpen = false;
      persist();
      render();
      return;
    }
    if (event.target.matches("[data-otp]") && event.key === "Backspace" && !event.target.value) {
      const previous = root.querySelector(`[data-otp="${Number(event.target.dataset.otp) - 1}"]`);
      if (previous) previous.focus();
    }
  }

  // ===== FIREBASE AUTHENTICATION =====

  async function handleLoginViaFirebase(phone, password) {
    try {
      showToast("Вход в систему...");
      const result = await window.FirebaseService.loginUser(phone, password);
      
      if (result.success && result.account) {
        state.account = result.account;
        state.session.isLoggedIn = true;
        state.session.step = "onboard";
        state.session.pending = null;
        state.ui.tab = "home";
        state.ui.homeFilter = "available";
        persist();
        render();
        showToast("С возвращением!");
        
        // Загружаем заказы
        await bootstrapAccountOrders();
      }
    } catch (error) {
      console.error("Ошибка входа:", error);
      showToast("Ошибка входа: " + (error.message || "неизвестная ошибка"));
    }
  }

  async function handleConfirmViaFirebase(code) {
    try {
      const pending = state.session.pending || {};
      if (!pending.phone || !pending.password) {
        showToast("Ошибка: данные не сохранены, попробуйте заново");
        return;
      }

      if (String(code || "").trim() !== "1234") {
        showToast("Неверный код. Используйте 1234");
        return;
      }

      if (pending.password.length < 4) {
        showToast("Пароль должен быть минимум 4 символа");
        return;
      }

      showToast("Создаем аккаунт...");
      const result = await window.FirebaseService.registerUser(
        pending.phone,
        pending.password,
        `Новый ${pending.role}`,
        pending.role,
        "Алматы",
        code,
        pending.delivery_type || "foot"
      );

      if (result.success && result.account) {
        state.account = result.account;
        state.session.isLoggedIn = true;
        state.session.step = "onboard";
        state.session.pending = null;
        state.ui.tab = "home";
        state.ui.homeFilter = "available";
        persist();
        render();
        showToast("Аккаунт создан!");
        
        // Загружаем заказы
        await bootstrapAccountOrders();
        
        // Показываем welcome модал
        state.ui.modal = { type: "welcome" };
        addNotification("Аккаунт создан", `Ваш ID ${formatAccountId(result.uid)}`);
        persist();
        render();
      }
    } catch (error) {
      console.error("Ошибка создания аккаунта:", error);
      showToast("Ошибка: " + (error.message || "неизвестная ошибка"));
    }
  }

  function createAccountFromPending() {
    const pending = state.session.pending || {};
    state.account = {
      id: generateAccountId(),
      phone: pending.phone || "",
      password: pending.password || "",
      role: pending.role || "executor",
      name: pending.role === "customer" ? "Новый заказчик" : "Новый исполнитель",
      city: "Алматы",
      about: "",
      avatar: "",
      verificationStatus: "none",
      balance: 1250,
      debt: 0,
      firstGraceUsed: false,
      jobsDone: 0,
      demoReady: false,
      createdAt: new Date().toISOString()
    };
    state.session.isLoggedIn = true;
    state.session.step = "onboard";
    state.ui.tab = "home";
    state.ui.homeFilter = "available";
    
    // Save to Firebase
    if (window.FirebaseService) {
      window.FirebaseService.saveAccount({
        id: state.account.id,
        phone: state.account.phone,
        role: state.account.role,
        name: state.account.name,
        city: state.account.city,
        about: state.account.about,
        avatar: state.account.avatar,
        verificationStatus: state.account.verificationStatus,
        balance: state.account.balance,
        debt: state.account.debt,
        jobsDone: state.account.jobsDone,
        createdAt: state.account.createdAt
      }).catch(err => console.error('Failed to save account:', err));
      
      window.FirebaseService.logEvent('account_created', {
        accountId: state.account.id,
        role: state.account.role,
        city: state.account.city
      }).catch(err => console.error('Failed to log event:', err));
    }
    
    bootstrapAccountOrders();
    state.ui.modal = { type: "welcome" };
    addNotification("Аккаунт создан", `Ваш ID ${formatAccountId(state.account.id)}`);
    persist();
    render();
  }

  async function bootstrapAccountOrders() {
    if (!state.account) return;
    
    // 🔥 Загружаем заказы из Firebase
    try {
      showToast('Загружаем заказы...');
      const orders = await window.FirebaseService.getOrdersByCity(state.account.city);
      state.orders = orders || [];
      
      // Пустая лента? Добавить уведомление
      if (state.orders.length === 0 && state.account.role === 'executor') {
        addNotification("Пока нет заказов", `В ${state.account.city} пока нет активных заказов. Создайте первый заказ как заказчик!`);
      }
      
      state.account.demoReady = true;
      persist();
      render();
      showToast(`Загружено ${state.orders.length} заказов`);
    } catch (error) {
      console.error("Ошибка загрузки заказов:", error);
      showToast("Ошибка загрузки заказов");
      state.orders = [];
    }
  }

  function bootstrapAccountOrders_OLD() {
    if (!state.account || state.account.demoReady) return;
    
    // Try to load from Firebase first
    if (window.FirebaseService) {
      window.FirebaseService.getOrdersByCity(state.account.city)
        .then(orders => {
          if (orders && orders.length > 0) {
            state.orders = orders;
            persist();
            render();
            return;
          }
          // If no orders in Firebase, create demo data
          createDemoOrders();
        })
        .catch(err => {
          console.warn('Failed to load orders from Firebase:', err);
          // Fallback to demo data
          createDemoOrders();
        });
    } else {
      // Firebase not available, use demo data
      createDemoOrders();
    }
  }
  
  async function bootstrapAccountOrders_OLD2() {
    if (!state.account) return;
    
    // 🔥 РЕАЛЬНЫЕ заказы из Firebase!
    showToast('Загружаем реальные заказы...');
    
    const orders = await window.FirebaseService.getOrdersByCity(state.account.city);
    state.orders = orders || [];
    
    // Пустая лента? Добавить уведомление
    if (state.orders.length === 0 && state.account.role === 'executor') {
      addNotification("Пока нет заказов", `В ${state.account.city} пока тихо. Создайте первый заказ как заказчик для теста!`);
    }
    
    state.account.demoReady = true;
    persist();
    render();
    showToast(`Загружено ${state.orders.length} реальных заказов`);
  }

  function takeOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    if (state.account.role !== "executor") {
      showToast("Этот режим доступен исполнителю");
      return;
    }
    if (!canTakeNextOrder()) {
      state.ui.modal = { type: "wallet" };
      persist();
      render();
      showToast("Сначала оплатите комиссию");
      return;
    }
    order.status = "assigned";
    order.assigneeId = state.account.id;
    order.assigneeName = state.account.name;
    order.finalPrice = order.finalPrice || order.budget;
    order.chat.push({ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: `${state.account.name} взял заказ в работу.`, createdAt: new Date().toISOString() });
    addNotification("Заказ принят", `${order.title} теперь у вас в работе.`);
    state.ui.modal = { type: "detail", orderId: order.id };
    
    // Update Firebase
    if (window.FirebaseService) {
      window.FirebaseService.updateOrder(orderId, {
        status: "assigned",
        assigneeId: state.account.id,
        assigneeName: state.account.name,
        finalPrice: order.finalPrice
      }).catch(err => console.error('Failed to update order:', err));
      
      window.FirebaseService.logEvent('order_taken', {
        orderId: orderId,
        executorId: state.account.id,
        budget: order.budget
      }).catch(err => console.error('Failed to log event:', err));
    }
    
    persist();
    render();
    showToast("Заказ принят в работу");
  }

  function completeOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order || order.status === "done") return;
    order.status = "done";
    order.completedAt = new Date().toISOString();
    order.chat.push({ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: "Заказ отмечен как выполненный.", createdAt: new Date().toISOString() });
    if (state.account.role === "executor" && order.assigneeId === state.account.id && !order.commissionSettled) {
      state.account.debt += calculateCommission(order.finalPrice || order.budget);
      state.account.jobsDone += 1;
      state.ui.modal = { type: "commission", orderId: order.id };
      addNotification("Заказ завершен", `Комиссия ${formatMoney(calculateCommission(order.finalPrice || order.budget))} добавлена в долг.`);
    } else {
      state.ui.modal = { type: "detail", orderId: order.id };
      addNotification("Заказ завершен", `${order.title} закрыт.`);
    }
    
    // Update Firebase
    if (window.FirebaseService) {
      window.FirebaseService.updateOrder(orderId, {
        status: "done",
        completedAt: order.completedAt
      }).catch(err => console.error('Failed to update order:', err));
      
      window.FirebaseService.logEvent('order_completed', {
        orderId: orderId,
        finalPrice: order.finalPrice || order.budget,
        completedAt: order.completedAt
      }).catch(err => console.error('Failed to log event:', err));
    }
    
    persist();
    render();
    showToast("Заказ завершен");
  }

  function acceptBid(orderId, bidId) {
    const order = getOrderById(orderId);
    if (!order) return;
    const bid = order.bids.find((item) => item.id === bidId);
    if (!bid) return;
    order.status = "assigned";
    order.assigneeId = bid.userId;
    order.assigneeName = bid.userName;
    order.finalPrice = bid.price;
    order.chat.push({ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: `Заказчик принял предложение ${bid.userName} на ${formatMoney(bid.price)}.`, createdAt: new Date().toISOString() });
    addNotification("Исполнитель выбран", `${bid.userName} назначен на заказ ${order.title}.`);
    state.ui.modal = { type: "detail", orderId: order.id };
    
    // Update Firebase
    if (window.FirebaseService) {
      window.FirebaseService.updateOrder(orderId, {
        status: "assigned",
        assigneeId: bid.userId,
        assigneeName: bid.userName,
        finalPrice: bid.price
      }).catch(err => console.error('Failed to update order:', err));
      
      window.FirebaseService.logEvent('bid_accepted', {
        orderId: orderId,
        bidId: bidId,
        bidAmount: bid.price
      }).catch(err => console.error('Failed to log event:', err));
    }
    
    persist();
    render();
    showToast("Исполнитель назначен");
  }

  function payDebt() {
    if (!state.account.debt) {
      showToast("Комиссии нет");
      return;
    }
    if (state.account.balance < state.account.debt) {
      state.ui.modal = { type: "wallet" };
      persist();
      render();
      showToast("Недостаточно средств на балансе");
      return;
    }
    state.account.balance -= state.account.debt;
    state.account.debt = 0;
    state.orders = state.orders.map((order) => order.assigneeId === state.account.id && order.status === "done" ? { ...order, commissionSettled: true } : order);
    addNotification("Комиссия оплачена", "Можно брать следующий заказ.");
    state.ui.modal = null;
    persist();
    render();
    showToast("Комиссия оплачена");
  }

// REMOVED: simulateBidForOrder() - теперь реальные отклики пользователей

  function updateOwnOrdersMeta() {
    state.orders = state.orders.map((order) => order.ownerId === state.account.id ? { ...order, ownerName: state.account.name, city: state.account.city, ownerVerified: state.account.verificationStatus === "verified" } : order);
  }

  function getOrderById(orderId) {
    return state.orders.find((item) => item.id === orderId);
  }

  function canTakeNextOrder() {
    return Number(state.account?.debt || 0) <= 0;
  }

  function addNotification(title, body) {
    state.notifications.unshift({ id: generateId("NTF"), title, body, read: false, createdAt: new Date().toISOString() });
    state.notifications = state.notifications.slice(0, 40);
  }

  function getUnreadCount() {
    return state.notifications.filter((item) => !item.read).length;
  }

  function calculateCommission(amount) {
    return Math.round(Number(amount || 0) * COMMISSION_RATE);
  }

  function getPendingRole() {
    return state.session.pending?.role || state.account?.role || "executor";
  }

  function getRoleLabel(role) {
    return role === "customer" ? "Заказчик" : "Исполнитель";
  }

  function formatMoney(value) {
    return `${Number(value || 0).toLocaleString("ru-RU")} ₸`;
  }

  function formatDateTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "только что" : date.toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  }

  function formatAccountId(value) {
    const raw = String(value || "").trim();
    const digits = raw.replace(/[^0-9]/g, "");
    return `#${digits || raw}`;
  }

  function guessCategory(title) {
    const source = title.toLowerCase();
    if (source.includes("достав")) return "Доставка";
    if (source.includes("груз") || source.includes("разгруз")) return "Погрузка";
    if (source.includes("уборк")) return "Уборка";
    return "Подработка";
  }

  function getInitials(value) {
    return String(value || "TT").trim().split(/\s+/).slice(0, 2).map((item) => item.charAt(0).toUpperCase()).join("") || "TT";
  }

  function renderAvatar(avatarUrl, name, size = 60) {
    if (avatarUrl && avatarUrl.startsWith("data:")) {
      return `<img src="${avatarUrl}" alt="${escapeHtml(name)}" style="width: ${size}px; height: ${size}px; border-radius: 50%; object-fit: cover;">`;
    }
    const initials = getInitials(name);
    return `<div style="width: ${size}px; height: ${size}px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: #e8e8e8; color: #333; font-weight: 700; font-size: ${Math.min(size / 2.5, 24)}px; flex-shrink: 0;">${initials}</div>`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2400);
  }

  function generateOrderId() {
    return `TZ-${Math.floor(100000 + Math.random() * 899999)}`;
  }

  function generateAccountId() {
    return String(Math.floor(100000 + Math.random() * 899999));
  }

  function generateId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString().slice(-4)}`;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Map functions
  function getOrderCoordinates(address) {
    // Demo coordinates для Алматы
    const cityCoordinates = {
      "Алматы": { lat: 43.2381, lng: 76.9453 },
      "Нур-Султан": { lat: 51.1694, lng: 71.4491 },
      "Кокшетау": { lat: 53.2839, lng: 75.9244 },
      "Шымкент": { lat: 42.3139, lng: 69.5894 },
      "Актау": { lat: 43.6486, lng: 51.4008 },
      "Уральск": { lat: 51.2277, lng: 51.3656 },
      "Актобе": { lat: 50.2838, lng: 57.1844 },
      "Караганда": { lat: 49.8047, lng: 72.1346 },
      "Семей": { lat: 50.4109, lng: 80.2500 },
      "Павлодар": { lat: 52.2881, lng: 76.9384 }
    };

    const city = state.ui.selectedCity || "Алматы";
    const baseCoord = cityCoordinates[city] || cityCoordinates["Алматы"];

    // Генерируем небольшой случайный офсет для каждого адреса
    const hash = String(address).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const seedRandom = (seed) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    const offsetLat = (seedRandom(hash) - 0.5) * 0.05;
    const offsetLng = (seedRandom(hash * 2) - 0.5) * 0.05;

    return {
      lat: baseCoord.lat + offsetLat,
      lng: baseCoord.lng + offsetLng
    };
  }

  function initDetailMapRoute(order) {
    // Инициализируем карту маршрута в модальном окне
    setTimeout(() => {
      const mapElement = document.getElementById("detailMapRoute");
      if (!mapElement || !window.L) return;

      // Удаляем старую карту если она есть
      if (state.detailMap) {
        state.detailMap.remove();
        state.detailMap = null;
      }

      // Начальная точка - центр города
      const cityCoordinates = {
        "Алматы": [43.2381, 76.9453],
        "Нур-Султан": [51.1694, 71.4491],
        "Кокшетау": [53.2839, 75.9244],
        "Шымкент": [42.3139, 69.5894],
        "Актау": [43.6486, 51.4008],
        "Уральск": [51.2277, 51.3656],
        "Актобе": [50.2838, 57.1844],
        "Караганда": [49.8047, 72.1346],
        "Семей": [50.4109, 80.2500],
        "Павлодар": [52.2881, 76.9384]
      };

      const startPoint = cityCoordinates[order.city] || cityCoordinates["Алматы"];
      const endCoords = getOrderCoordinates(order.address);
      const endPoint = [endCoords.lat, endCoords.lng];

      // Создаем карту с явным размером контейнера
      mapElement.style.width = "100%";
      mapElement.style.height = "500px";
      
      state.detailMap = window.L.map("detailMapRoute", {
        attributionControl: false,
        zoomControl: false
      }).setView(startPoint, 13);

      // Пересчитываем размер карты после инициализации
      setTimeout(() => {
        if (state.detailMap) {
          state.detailMap.invalidateSize();
        }
      }, 100);

      // Добавляем OSM тайлы
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap',
        maxZoom: 19
      }).addTo(state.detailMap);

      // Маркер начальной точки (откуда забрать)
      const startIcon = window.L.divIcon({
        className: "route-marker",
        html: `<div style="width: 36px; height: 36px; background: #10b981; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 16px;">A</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      window.L.marker(startPoint, { icon: startIcon })
        .bindPopup("Откуда забрать")
        .addTo(state.detailMap);

      // Маркер конечной точки (где доставить)
      const endIcon = window.L.divIcon({
        className: "route-marker",
        html: `<div style="width: 36px; height: 36px; background: #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 800; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3); font-size: 16px;">B</div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -18]
      });

      window.L.marker(endPoint, { icon: endIcon })
        .bindPopup("Куда доставить")
        .addTo(state.detailMap);

      // Линия маршрута
      const routeLine = window.L.polyline([startPoint, endPoint], {
        color: "#0ea5e9",
        weight: 4,
        opacity: 0.8,
        dashArray: "5, 10"
      }).addTo(state.detailMap);

      // Вычисляем примерное расстояние (градусы в км, приблизительно)
      const latDiff = endCoords.lat - startPoint[0];
      const lngDiff = endCoords.lng - startPoint[1];
      const distance = Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) * 111; // 1 градус ~ 111 км
      const time = Math.max(5, Math.round(distance * 2)); // примерное время в минутах

      // Добавляем инфо маршрута
      const infoText = document.createElement("div");
      infoText.style.cssText = `
        position: absolute;
        bottom: 12px;
        left: 12px;
        background: rgba(15, 20, 25, 0.92);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 12px 16px;
        color: white;
        font-size: 14px;
        font-weight: 600;
        z-index: 999;
        backdrop-filter: blur(10px);
      `;
      infoText.innerHTML = `<strong style="display: block; margin-bottom: 4px;">Маршрут</strong>
                            <span style="color: rgba(255,255,255,0.7);">≈ ${distance.toFixed(1)} км • ${time} мин</span>`;
      mapElement.appendChild(infoText);

      // Показываем оба маркера на экране
      const bounds = window.L.latLngBounds([startPoint, endPoint]);
      state.detailMap.fitBounds(bounds, { padding: [50, 50] });
    }, 200);
  }

  function initMap() {
    // Дождемся, когда DOM будет готов
    setTimeout(() => {
      const mapElement = document.getElementById("mapView");
      if (!mapElement || !window.L) return;

      // Если карта уже инициализирована, не инициализируем снова
      if (state.map) {
        state.map.invalidateSize();
        return;
      }

      const city = state.ui.selectedCity || "Алматы";
      const cityCoordinates = {
        "Алматы": [43.2381, 76.9453],
        "Нур-Султан": [51.1694, 71.4491],
        "Кокшетау": [53.2839, 75.9244],
        "Шымкент": [42.3139, 69.5894],
        "Актау": [43.6486, 51.4008],
        "Уральск": [51.2277, 51.3656],
        "Актобе": [50.2838, 57.1844],
        "Караганда": [49.8047, 72.1346],
        "Семей": [50.4109, 80.2500],
        "Павлодар": [52.2881, 76.9384]
      };

      const center = cityCoordinates[city] || cityCoordinates["Алматы"];

      // Создаем карту
      state.map = window.L.map("mapView").setView(center, 13);

      // Добавляем OpenStreetMap тайлы
      window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(state.map);

      // Добавляем маркеры заказов
      const orders = getVisibleOrders();
      orders.forEach(order => {
        const coords = getOrderCoordinates(order.address);
        const color = order.status === "done" ? "#888" : order.ownerId === state.account.id ? "#3b82f6" : "#10b981";
        
        const customIcon = window.L.divIcon({
          className: "map-marker",
          html: `<div style="background: ${color}; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; cursor: pointer; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);">${getInitials(order.title)}</div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -16]
        });

        const marker = window.L.marker([coords.lat, coords.lng], { icon: customIcon })
          .bindPopup(`
            <div class="map-popup">
              <strong>${escapeHtml(order.title)}</strong><br>
              <small>${escapeHtml(order.category)}</small><br>
              <small>${formatMoney(order.finalPrice || order.budget)}</small>
            </div>
          `, { closeButton: false })
          .addTo(state.map);

        marker.on("click", () => {
          state.ui.modal = { type: "detail", orderId: order.id };
          persist();
          render();
        });
      });

      // Маркер текущего пользователя (центр города)
      const userIcon = window.L.divIcon({
        className: "map-marker user",
        html: `<div style="background: #f97316; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 16px; border: 3px solid white; box-shadow: 0 2px 12px rgba(0,0,0,0.4); animation: pulse 2s infinite;">◉</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
      });

      window.L.marker(center, { icon: userIcon })
        .bindPopup("Ваше местоположение", { closeButton: false })
        .addTo(state.map);

    }, 100);
  }
})();
