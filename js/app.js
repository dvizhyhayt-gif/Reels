(() => {
  const STORAGE_KEY = "teztap-clean-ui-v3";
  const COMMISSION_RATE = 0.1;
  const root = document.getElementById("app");
  const toast = document.getElementById("toast");
  let toastTimer = null;
  let unsubscribeOrdersRealtime = null;
  let unsubscribeNotificationsRealtime = null;
  let promoStoryTimer = null;
  let promoStoryRemaining = 4500;
  let promoStoryStartedAt = 0;
  let promoStoryTrackedIndex = -1;

  const ICONS = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.5 4a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 2a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm8.85 10.44 1.41 1.41-3.2 3.2-1.41-1.41 3.2-3.2Z"/></svg>',
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 3 10.5V21h6v-6h6v6h6V10.5L12 3Z"/></svg>',
    plus: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a5 5 0 0 1 5 5v2.26c0 .8.32 1.56.88 2.12L19 13.5V15H5v-1.5l1.12-1.12A3 3 0 0 0 7 10.26V8a5 5 0 0 1 5-5Zm0 18a2.5 2.5 0 0 1-2.45-2h4.9A2.5 2.5 0 0 1 12 21Z"/></svg>',
    user: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 10c4.42 0 8 2.24 8 5v1H4v-1c0-2.76 3.58-5 8-5Z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2a7 7 0 0 1 7 7c0 5.05-5.54 11.78-6.23 12.6a1 1 0 0 1-1.54 0C10.54 20.78 5 14.05 5 9a7 7 0 0 1 7-7Zm0 9.5A2.5 2.5 0 1 0 12 6.5a2.5 2.5 0 0 0 0 5Z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Zm1 4h-2v6l4 2 .9-1.8-2.9-1.45V7Z"/></svg>',
    wallet: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5H19a1 1 0 0 1 0 2H6.5a.5.5 0 0 0 0 1H20v11H6.5A2.5 2.5 0 0 1 4 16.5v-9Zm13 4a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z"/></svg>',
    shield: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5.25 3.44 9.4 8 11 4.56-1.6 8-5.75 8-11V5l-8-3Zm-1 12.59-2.3-2.3-1.4 1.42L11 17.4l5.7-5.7-1.4-1.42L11 14.59Z"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a8 8 0 0 0-8 8v3a3 3 0 0 0 3 3h1v-7H6a6 6 0 0 1 12 0h-2v7h2v1a1 1 0 0 1-1 1h-3.18A2 2 0 0 0 12 18h-1a2 2 0 1 0 0 4h1a2 2 0 0 0 1.82-1H17a3 3 0 0 0 3-3v-1a3 3 0 0 0 2-2.83V11a8 8 0 0 0-8-8Z"/></svg>',
    chevron: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15.41 7.41-1.41-1.41L8.59 11.41a2 2 0 0 0 0 2.83L14 19.66l1.41-1.41L10 12.83l5.41-5.42Z"/></svg>',
    briefcase: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4h6a2 2 0 0 1 2 2v1h2a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3V9a2 2 0 0 1 2-2h2V6a2 2 0 0 1 2-2Zm0 3h6V6H9v1Zm12 5h-6v2H9v-2H3v5a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-5Z"/></svg>',
    list: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h2v2H4V6Zm4 0h12v2H8V6ZM4 11h2v2H4v-2Zm4 0h12v2H8v-2ZM4 16h2v2H4v-2Zm4 0h12v2H8v-2Z"/></svg>',
    chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-8.2L6 21v-3H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Zm1 5h12V7H6v2Zm0 4h8v-2H6v2Z"/></svg>'
  };

  const ORDER_CITY_OPTIONS = [
    "Астана",
    "Алматы",
    "Шымкент",
    "Актау",
    "Актобе",
    "Атырау",
    "Кокшетау",
    "Караганда",
    "Конаев",
    "Костанай",
    "Кызылорда",
    "Павлодар",
    "Петропавловск",
    "Семей",
    "Талдыкорган",
    "Тараз",
    "Туркестан",
    "Уральск",
    "Усть-Каменогорск",
    "Жезказган",
    "Рудный",
    "Экибастуз",
    "Темиртау",
    "Кентау",
    "Жанаозен",
    "Каскелен",
    "Щучинск",
    "Байконыр",
    "Аркалык",
    "Балхаш",
    "Жаркент",
    "Арыс",
    "Шу",
    "Сатпаев",
    "Степногорск",
    "Риддер",
    "Нур-Султан"
  ];
  const ORDER_SERVICE_OPTIONS = [
    "Курьерская доставка",
    "Доставка документов",
    "Доставка еды",
    "Доставка цветов",
    "Покупка в магазине",
    "Посылка",
    "Грузоперевозки",
    "Переезд",
    "Сборка мебели",
    "Уборка",
    "Помощь по дому",
    "Вынос мусора",
    "Помощь с животными",
    "Мелкий ремонт",
    "Сантехника",
    "Электрика",
    "Ремонт техники",
    "Компьютерная помощь",
    "Сад и двор",
    "Другое"
  ];
  const PROMO_CODE_LIBRARY = {
    START500: { amount: 500, label: "Стартовый бонус" },
    BONUS1000: { amount: 1000, label: "Бонус на баланс" },
    EXPRESS300: { amount: 300, label: "Express бонус" }
  };
  const PROMO_STORY_DURATION = 4500;
  // Управляемые разработчиком stories/promos при входе в приложение.
  const PROMO_STORIES = [
    {
      id: "qr-ready",
      badge: "Обновление",
      title: "Система QR кода готова",
      subtitle: "Поздравляем! Новый экран QR уже доступен в приложении.",
      accent: "#60a5fa",
      visual: "QR",
      image: ""
    },
    {
      id: "promo-wallet",
      badge: "Бонус",
      title: "Промокоды уже в профиле",
      subtitle: "Теперь можно активировать коды и сразу получать бонус на баланс.",
      accent: "#ffffff",
      visual: "BONUS",
      image: ""
    },
    {
      id: "realtime-orders",
      badge: "Realtime",
      title: "Заказы и отклики синхронизируются",
      subtitle: "Изменения по заказам теперь видны между разными устройствами.",
      accent: "#ffffff",
      visual: "LIVE",
      image: ""
    }
  ];
  let activePromoStories = PROMO_STORIES.slice();
  let activePromoCodeLibrary = { ...PROMO_CODE_LIBRARY };
  const ORDER_STAGE_META = {
    delivery: {
      new: { title: "Новый", text: "Заказ создан и ждет исполнителя." },
      accepted: { title: "Принят", text: "Исполнитель подтвердил заказ." },
      to_pickup: { title: "Едет к точке А", text: "Исполнитель направляется к адресу получения." },
      picked_up: { title: "Забрал", text: "Исполнитель забрал заказ в точке А." },
      to_dropoff: { title: "Едет к точке Б", text: "Исполнитель движется к адресу доставки." },
      delivered: { title: "Доставлено", text: "Задача завершена, можно подтверждать и оставлять отзыв." }
    },
    service: {
      new: { title: "Новый", text: "Задача создана и ждет исполнителя." },
      accepted: { title: "Принят", text: "Исполнитель подтвердил задачу." },
      to_pickup: { title: "Едет к адресу", text: "Исполнитель направляется к месту выполнения." },
      picked_up: { title: "Начал работу", text: "Исполнитель приступил к задаче." },
      to_dropoff: { title: "Выполняет", text: "Задача сейчас в работе." },
      delivered: { title: "Работа выполнена", text: "Задача завершена, можно подтверждать и оставлять отзыв." }
    }
  };
  const ORDER_STAGE_FLOW = ["accepted", "to_pickup", "picked_up", "to_dropoff", "delivered"];
  const MAX_ACTIVE_BIDS = 5;

// REMOVED: DEMO_EXECUTORS - теперь реальные пользователи из Firestore

  let state = loadState();
  normalizeState();
  render();
  bootstrapAdminContent();
  setTimeout(() => bootstrapAdminContent(), 800);
  scheduleInitialOrdersBootstrap();
  
  // Скрыть splash screen после загрузки
  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("hide");
    }
    if (getPromoStories().length) {
      state.ui.promoViewerOpen = true;
      state.ui.promoIndex = 0;
      promoStoryTrackedIndex = 0;
      promoStoryRemaining = PROMO_STORY_DURATION;
      render();
    }
  }, 2400);

  root.addEventListener("click", handleClick);
  root.addEventListener("focusin", handleFocusIn);
  root.addEventListener("pointerdown", handlePointerDown);
  root.addEventListener("pointerup", handlePointerUp);
  root.addEventListener("pointercancel", handlePointerUp);
  root.addEventListener("pointerleave", handlePointerUp);
  root.addEventListener("submit", handleSubmit);
  root.addEventListener("input", handleInput);
  root.addEventListener("change", handleChange);
  root.addEventListener("keydown", handleKeyDown);

  function createInitialState() {
    return {
      settings: { theme: "light" },
      session: { isLoggedIn: false, step: "register", mode: "login", pending: null },
      ui: {
        tab: "home",
        homeFilter: "available",
        homeCategory: "all",
        notificationFilter: "all",
        search: "",
        modal: null,
        selectedCity: "Алматы",
        cityMenuOpen: false,
        createOrderCity: "Алматы",
        createOrderFromAddress: "",
        createOrderToAddress: "",
        createOrderPhotoPreview: "",
        promoViewerOpen: false,
        promoIndex: 0,
        introScreenIndex: 0,
        introShown: false
      },
      account: null,
      orders: [],
      notifications: [],
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
    
    if (!state.session.isLoggedIn) {
      state.session.step = "register";
      state.session.mode = "login";
    }
    
    // ВСЕГДА открываем с чистого UI
    state.ui = {
      tab: state.session.isLoggedIn ? "home" : "home",
      homeFilter: "available",
      homeCategory: state.ui?.homeCategory || "all",
      notificationFilter: state.ui?.notificationFilter || "all",
      search: "",
      modal: null, // Никогда не открываем модали при загрузке
      selectedCity: state.ui?.selectedCity || "Алматы",
      cityMenuOpen: false,
      createOrderCity: state.ui?.createOrderCity || state.account?.city || state.ui?.selectedCity || "Алматы",
      createOrderFromAddress: state.ui?.createOrderFromAddress || "",
      createOrderToAddress: state.ui?.createOrderToAddress || "",
      createOrderPhotoPreview: state.ui?.createOrderPhotoPreview || "",
      promoViewerOpen: false,
      promoIndex: 0,
      introScreenIndex: state.ui?.introScreenIndex || 0,
      introShown: Boolean(state.ui?.introShown)
    };
    
    state.notifications = Array.isArray(state.notifications) ? state.notifications : fresh.notifications;
    state.orders = Array.isArray(state.orders) ? state.orders.map((order) => normalizeOrder(order)) : fresh.orders;

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
        isBlocked: Boolean(state.account.isBlocked),
        usedPromoCodes: Array.isArray(state.account.usedPromoCodes) ? state.account.usedPromoCodes : [],
        promoHistory: Array.isArray(state.account.promoHistory) ? state.account.promoHistory : [],
        walletHistory: Array.isArray(state.account.walletHistory) ? state.account.walletHistory : [],
        createdAt: state.account.createdAt || new Date().toISOString(),
        updatedAt: state.account.updatedAt || new Date().toISOString()
      };
    }

    // Экземпляры карт не сериализуем в localStorage
    document.documentElement.dataset.theme = state.settings.theme;
  }

  function persist() {
    // Храним в localStorage только легкое состояние. Тяжелые данные приходят из Firebase.
    const stateToSave = {
      settings: { ...state.settings },
      session: { ...state.session },
      ui: {
        ...state.ui,
        modal: null,
        cityMenuOpen: false,
        createOrderPhotoPreview: ""
      },
      account: state.account ? {
        ...state.account,
        avatar: state.account.avatar?.startsWith("data:") ? "" : state.account.avatar
      } : null,
      orders: [],
      notifications: [],
    };
    
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    } catch (error) {
      console.warn("Не удалось сохранить состояние:", error);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
          settings: stateToSave.settings,
          session: stateToSave.session,
          ui: createInitialState().ui,
          account: stateToSave.account ? {
            id: stateToSave.account.id,
            phone: stateToSave.account.phone,
            role: stateToSave.account.role,
            name: stateToSave.account.name,
            city: stateToSave.account.city,
            verificationStatus: stateToSave.account.verificationStatus,
            balance: stateToSave.account.balance,
            debt: stateToSave.account.debt,
            jobsDone: stateToSave.account.jobsDone,
            rating: stateToSave.account.rating,
            isOnline: stateToSave.account.isOnline,
            usedPromoCodes: stateToSave.account.usedPromoCodes,
            promoHistory: stateToSave.account.promoHistory,
            walletHistory: stateToSave.account.walletHistory,
            createdAt: stateToSave.account.createdAt,
            updatedAt: stateToSave.account.updatedAt
          } : null,
          orders: [],
          notifications: []
        }));
      } catch (fallbackError) {
        console.warn("Не удалось сохранить даже облегчённое состояние:", fallbackError);
      }
    }
  }

  function normalizeOrder(order = {}) {
    const city = order.city || state.account?.city || state.ui.selectedCity || "Алматы";
    const fromAddress = order.fromAddress || order.pickupAddress || getCityCenterLabel(city);
    const explicitToAddress = order.toAddress || order.dropoffAddress || "";
    const legacyAddress = order.address || "";
    const toAddress = explicitToAddress || (legacyAddress && legacyAddress !== fromAddress ? legacyAddress : "");
    return {
      ...order,
      id: String(order.id || ""),
      city,
      fromAddress,
      toAddress,
      address: legacyAddress || toAddress || fromAddress,
      taskKind: order.taskKind || getOrderTaskKind(order),
      status: order.status || "open",
      stage: order.stage || (order.status === "done" ? "delivered" : order.status === "assigned" ? "accepted" : "new"),
      budget: Number(order.budget ?? 0),
      senderPhone: order.senderPhone || order.sender_phone || "",
      recipientPhone: order.recipientPhone || order.recipient_phone || "",
      assigneePhone: order.assigneePhone || order.assignee_phone || "",
      requirements: order.requirements || "",
      finalPrice: Number(order.finalPrice ?? order.budget ?? 0),
      bids: Array.isArray(order.bids) ? order.bids : [],
      chat: Array.isArray(order.chat) ? order.chat : [],
      complaints: Array.isArray(order.complaints) ? order.complaints : [],
      reviewedBy: Array.isArray(order.reviewedBy) ? order.reviewedBy : [],
      express: Boolean(order.express || order.urgent),
      urgent: Boolean(order.urgent || order.express),
      completedAt: order.completedAt || "",
      commissionSettled: Boolean(order.commissionSettled)
    };
  }

  function replaceOrderInState(nextOrder) {
    const normalized = normalizeOrder(nextOrder);
    const index = state.orders.findIndex((item) => item.id === normalized.id);
    if (index >= 0) {
      state.orders[index] = normalized;
    } else {
      state.orders.unshift(normalized);
    }
  }

  function stopOrdersRealtime() {
    if (typeof unsubscribeOrdersRealtime === "function") {
      unsubscribeOrdersRealtime();
    }
    unsubscribeOrdersRealtime = null;
  }

  function stopNotificationsRealtime() {
    if (typeof unsubscribeNotificationsRealtime === "function") {
      unsubscribeNotificationsRealtime();
    }
    unsubscribeNotificationsRealtime = null;
  }

  function scheduleInitialOrdersBootstrap() {
    if (!state.session.isLoggedIn || !state.account) return;
    setTimeout(() => {
      bootstrapAccountOrders();
      bootstrapNotifications();
    }, 250);
  }

  function bootstrapNotifications() {
    if (!state.account) return;

    if (!window.FirebaseService) {
      state.notifications = [];
      persist();
      render();
      return;
    }

    stopNotificationsRealtime();

    if (window.FirebaseService.subscribeUserNotifications) {
      unsubscribeNotificationsRealtime = window.FirebaseService.subscribeUserNotifications(
        state.account.id,
        (notifications) => {
          if (!state.session.isLoggedIn || !state.account) return;
          state.notifications = Array.isArray(notifications) ? notifications : [];
          persist();
          render();
        },
        (error) => {
          console.error("Ошибка загрузки уведомлений:", error);
        }
      );
      return;
    }

    window.FirebaseService.getUserNotifications(state.account.id)
      .then((notifications) => {
        state.notifications = Array.isArray(notifications) ? notifications : [];
        persist();
        render();
      })
      .catch((error) => {
        console.error("Ошибка загрузки уведомлений:", error);
      });
  }

  function sendNotificationToUser(userId, title, body, meta = {}) {
    const targetUserId = String(userId || "").trim();
    if (!targetUserId || !title || !body) return;

    const notification = {
      title,
      body,
      type: meta.type || "general",
      orderId: meta.orderId || "",
      createdAt: new Date().toISOString()
    };

    if (window.FirebaseService?.saveNotification) {
      window.FirebaseService.saveNotification(targetUserId, notification).catch((error) => {
        console.error("Failed to save notification:", error);
      });
      return;
    }

    if (state.account?.id === targetUserId) {
      addNotification(title, body, meta);
      persist();
      render();
    }
  }

  async function sendProblemToSupport(ticket) {
    const payload = {
      ...ticket,
      id: ticket.id || generateId("SUP"),
      status: ticket.status || "open",
      createdAt: ticket.createdAt || new Date().toISOString()
    };

    if (window.FirebaseService?.saveSupportTicket) {
      window.FirebaseService.saveSupportTicket(payload).catch((error) => {
        console.error("Failed to save support ticket:", error);
      });
    }

    if (window.FirebaseService?.getSupportUsers && window.FirebaseService?.saveNotification) {
      try {
        const supportUsers = await window.FirebaseService.getSupportUsers();
        supportUsers.forEach((user) => {
          window.FirebaseService.saveNotification(user.id, {
            title: payload.title || "Новое обращение",
            body: payload.message || payload.description || "Пользователь отправил обращение.",
            type: payload.type || "support_ticket",
            ticketId: payload.id,
            orderId: payload.orderId || "",
            fromUserId: payload.userId || state.account?.id || "",
            fromUserName: payload.userName || state.account?.name || ""
          }).catch((error) => console.error("Failed to notify support:", error));
        });
        return supportUsers.length;
      } catch (error) {
        console.error("Failed to load support users:", error);
      }
    }

    if (state.account?.role === "support") {
      addNotification(payload.title || "Новое обращение", payload.message || payload.description || "Поступила проблема.");
    }
    return 0;
  }

  function markAllNotificationsRead() {
    const unreadItems = state.notifications.filter((item) => !item.read);
    if (!unreadItems.length) return;

    state.notifications = state.notifications.map((item) => ({ ...item, read: true }));

    if (window.FirebaseService?.markNotificationRead) {
      unreadItems.forEach((item) => {
        window.FirebaseService.markNotificationRead(item.id).catch((error) => {
          console.error("Failed to mark notification read:", error);
        });
      });
    }

    persist();
    render();
  }

  function markNotificationRead(notificationId) {
    const id = String(notificationId || "").trim();
    if (!id) return;
    const item = state.notifications.find((notification) => notification.id === id);
    if (!item || item.read) return;

    state.notifications = state.notifications.map((notification) => notification.id === id ? { ...notification, read: true } : notification);

    if (window.FirebaseService?.markNotificationRead) {
      window.FirebaseService.markNotificationRead(id).catch((error) => {
        console.error("Failed to mark notification read:", error);
      });
    }
  }

  function getPromoSummary() {
    const history = Array.isArray(state.account?.promoHistory) ? state.account.promoHistory : [];
    return {
      usedCount: history.length,
      totalAmount: history.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    };
  }

  function addWalletHistory(entry) {
    if (!state.account) return;
    state.account.walletHistory = Array.isArray(state.account.walletHistory) ? state.account.walletHistory : [];
    state.account.walletHistory = [{
      id: entry.id || generateId("WH"),
      type: entry.type || "operation",
      title: entry.title || "Операция",
      text: entry.text || "",
      amount: Number(entry.amount || 0),
      tone: entry.tone || (Number(entry.amount || 0) >= 0 ? "positive" : "negative"),
      createdAt: entry.createdAt || new Date().toISOString()
    }, ...state.account.walletHistory].slice(0, 30);
  }

  function getWalletHistory() {
    const saved = Array.isArray(state.account?.walletHistory) ? state.account.walletHistory : [];
    const promo = Array.isArray(state.account?.promoHistory) ? state.account.promoHistory.map((item) => ({
      id: `promo-${item.code}-${item.createdAt || ""}`,
      type: "promo",
      title: item.label || "Промобонус",
      text: item.code ? `Промокод ${item.code}` : "Начисление на баланс",
      amount: Number(item.amount || 0),
      tone: "positive",
      createdAt: item.createdAt || state.account?.createdAt || new Date().toISOString()
    })) : [];
    const completedOrders = Array.isArray(state.orders) ? state.orders
      .filter((order) => order.status === "done" && (order.assigneeId === state.account?.id || order.ownerId === state.account?.id))
      .map((order) => ({
        id: `order-${order.id}`,
        type: "order",
        title: order.assigneeId === state.account?.id ? "Доход по заказу" : "Заказ завершен",
        text: order.title,
        amount: order.assigneeId === state.account?.id ? Number(order.finalPrice || order.budget || 0) : -Number(order.finalPrice || order.budget || 0),
        tone: order.assigneeId === state.account?.id ? "positive" : "negative",
        createdAt: order.completedAt || order.updatedAt || order.createdAt || new Date().toISOString()
      })) : [];
    const seen = new Set();

    return [...saved, ...promo, ...completedOrders]
      .filter((item) => {
        const id = item.id || `${item.type}-${item.title}-${item.createdAt}-${item.amount}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .slice(0, 8);
  }

  function getWalletHistoryIcon(type) {
    if (type === "promo") return "★";
    if (type === "commission") return "%";
    if (type === "order") return ICONS.briefcase;
    return ICONS.wallet;
  }

  function getPromoStories() {
    return Array.isArray(activePromoStories) && activePromoStories.length ? activePromoStories : PROMO_STORIES;
  }

  function getPromoCodeLibrary() {
    return activePromoCodeLibrary && Object.keys(activePromoCodeLibrary).length ? activePromoCodeLibrary : PROMO_CODE_LIBRARY;
  }

  function bootstrapAdminContent() {
    if (!window.FirebaseService) return;

    if (window.FirebaseService.getAdminStories) {
      window.FirebaseService.getAdminStories()
        .then((stories) => {
          if (Array.isArray(stories) && stories.length) {
            activePromoStories = stories.map((story, index) => ({
              id: story.id || `story-${index}`,
              badge: story.badge || "Новое",
              title: story.title || "",
              subtitle: story.subtitle || "",
              accent: story.accent || "#60a5fa",
              visual: story.visual || "UP",
              image: story.image || ""
            }));
            render();
          }
        })
        .catch((error) => console.error("Не удалось загрузить admin stories:", error));
    }

    if (window.FirebaseService.getAdminPromoCodes) {
      window.FirebaseService.getAdminPromoCodes()
        .then((promoCodes) => {
          if (promoCodes && Object.keys(promoCodes).length) {
            activePromoCodeLibrary = promoCodes;
            render();
          }
        })
        .catch((error) => console.error("Не удалось загрузить promo codes:", error));
    }
  }

  function ensureAccountAllowed(actionLabel = "действие") {
    if (!state.account?.isBlocked) {
      return true;
    }
    showToast(`Аккаунт ограничен. ${actionLabel} недоступно.`);
    return false;
  }

  function getOrderStageMeta(stage, order = null) {
    const kind = order?.taskKind || getOrderTaskKind(order || "");
    const group = ORDER_STAGE_META[kind] || ORDER_STAGE_META.service;
    return group[stage] || group.new;
  }

  function getNextOrderStage(stage) {
    const index = ORDER_STAGE_FLOW.indexOf(stage);
    if (index < 0) return ORDER_STAGE_FLOW[0];
    return ORDER_STAGE_FLOW[Math.min(index + 1, ORDER_STAGE_FLOW.length - 1)];
  }

  function getOpenBidsCount() {
    return state.orders.filter((order) =>
      order.status === "open" &&
      Array.isArray(order.bids) &&
      order.bids.some((bid) => bid.userId === state.account?.id)
    ).length;
  }

  function getOrderTaskKind(orderOrCategory) {
    if (typeof orderOrCategory === "object" && ["delivery", "service"].includes(orderOrCategory?.taskKind)) {
      return orderOrCategory.taskKind;
    }
    const source = typeof orderOrCategory === "string"
      ? orderOrCategory
      : `${orderOrCategory?.category || ""} ${orderOrCategory?.title || ""}`;
    const normalized = source.toLowerCase();
    const deliveryWords = ["достав", "курьер", "документ", "посыл", "еда", "цвет", "покупк", "магазин", "груз", "переезд", "перевоз"];
    return deliveryWords.some((word) => normalized.includes(word)) ? "delivery" : "service";
  }

  function getVisibleOrderPhone(order, isOwner) {
    return isOwner
      ? order.assigneePhone || ""
      : order.senderPhone || order.recipientPhone || "";
  }

  function renderOrderRequirementsSection(order) {
    const requirements = String(order.requirements || "").trim();
    return `
      <section class="task-info-section">
        <h3>Требования</h3>
        <p class="task-requirements-text">${escapeHtml(requirements || "Требования не указаны.")}</p>
      </section>
    `;
  }

  function saveCurrentAccount(extraLogEvent = null) {
    if (!state.account || !window.FirebaseService?.saveAccount) {
      return;
    }

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
      rating: state.account.rating,
      responseTime: state.account.responseTime,
      delivery_type: state.account.delivery_type,
      firstGraceUsed: state.account.firstGraceUsed,
      demoReady: state.account.demoReady,
      isOnline: state.account.isOnline,
      isBlocked: state.account.isBlocked,
      usedPromoCodes: state.account.usedPromoCodes,
      promoHistory: state.account.promoHistory,
      walletHistory: state.account.walletHistory,
      createdAt: state.account.createdAt || new Date().toISOString()
    }).catch((error) => console.error("Failed to save account:", error));

    if (extraLogEvent?.name && window.FirebaseService?.logEvent) {
      window.FirebaseService.logEvent(extraLogEvent.name, extraLogEvent.data || {}).catch((error) => {
        console.error("Failed to log account event:", error);
      });
    }
  }

  function applyPromoCode(rawCode) {
    const code = String(rawCode || "").trim().toUpperCase();
    if (!code) {
      showToast("Введите промокод");
      return false;
    }

    const promo = getPromoCodeLibrary()[code];
    if (!promo) {
      showToast("Промокод не найден");
      return false;
    }
    if (promo.active === false) {
      showToast("Промокод отключен");
      return false;
    }
    if (Array.isArray(promo.roles) && promo.roles.length && !promo.roles.includes(state.account?.role)) {
      showToast("Этот промокод недоступен для вашей роли");
      return false;
    }
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) {
      showToast("Срок действия промокода истек");
      return false;
    }

    state.account.usedPromoCodes = Array.isArray(state.account.usedPromoCodes) ? state.account.usedPromoCodes : [];
    state.account.promoHistory = Array.isArray(state.account.promoHistory) ? state.account.promoHistory : [];

    if (state.account.usedPromoCodes.includes(code)) {
      showToast("Этот промокод уже использован");
      return false;
    }

    const entry = {
      code,
      amount: Number(promo.amount || 0),
      label: promo.label || "Промобонус",
      createdAt: new Date().toISOString()
    };

    state.account.balance += entry.amount;
    state.account.usedPromoCodes = [...state.account.usedPromoCodes, code];
    state.account.promoHistory = [entry, ...state.account.promoHistory].slice(0, 20);

    saveCurrentAccount({
      name: "promo_applied",
      data: {
        accountId: state.account.id,
        code,
        amount: entry.amount
      }
    });

    persist();
    render();
    showToast(`Промокод активирован: +${formatMoney(entry.amount)}`);
    return true;
  }

  function clearPromoStoryTimer() {
    if (promoStoryTimer) {
      clearTimeout(promoStoryTimer);
    }
    promoStoryTimer = null;
    promoStoryStartedAt = 0;
  }

  function schedulePromoStoryTimer() {
    clearPromoStoryTimer();
    if (!state.ui.promoViewerOpen || !getPromoStories().length) return;

    if (promoStoryTrackedIndex !== state.ui.promoIndex) {
      promoStoryTrackedIndex = state.ui.promoIndex;
      promoStoryRemaining = PROMO_STORY_DURATION;
    }

    promoStoryStartedAt = Date.now();

    promoStoryTimer = setTimeout(() => {
      if (state.ui.promoIndex >= getPromoStories().length - 1) {
        state.ui.promoViewerOpen = false;
      } else {
        state.ui.promoIndex += 1;
      }
      promoStoryRemaining = PROMO_STORY_DURATION;
      persist();
      render();
    }, promoStoryRemaining);
  }

  function getActivePromoStory() {
    const stories = getPromoStories();
    return stories[state.ui.promoIndex] || stories[0] || null;
  }

  function pausePromoStory() {
    if (!state.ui.promoViewerOpen || !promoStoryStartedAt) return;

    const elapsed = Date.now() - promoStoryStartedAt;
    promoStoryRemaining = Math.max(250, promoStoryRemaining - elapsed);
    clearPromoStoryTimer();

    const activeBar = root.querySelector(".promo-story-bar.active span");
    if (activeBar) {
      activeBar.style.animationPlayState = "paused";
    }
  }

  function resumePromoStory() {
    if (!state.ui.promoViewerOpen || promoStoryTimer) return;

    const activeBar = root.querySelector(".promo-story-bar.active span");
    if (activeBar) {
      activeBar.style.animationPlayState = "running";
    }

    schedulePromoStoryTimer();
  }

  function render() {
    document.documentElement.dataset.theme = state.settings.theme;
    const hasModal = Boolean(state.ui.modal);
    const hasPromoViewer = Boolean(state.ui.promoViewerOpen && getPromoStories().length);
    document.body.classList.toggle("modal-open", hasModal);
    document.body.classList.toggle("promo-open", hasPromoViewer);
    if (hasModal || hasPromoViewer) {
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
        ${state.session.isLoggedIn && !["create", "notifications", "profile-data"].includes(state.ui.tab) ? renderBottomNav() : ""}
      </div>
      ${renderModal()}
      ${state.session.isLoggedIn ? renderPromoStoryViewer() : ""}
    `;

    if (hasPromoViewer && state.session.isLoggedIn) {
      schedulePromoStoryTimer();
    } else {
      clearPromoStoryTimer();
    }
  }

  function renderGuestHeader() {
    if (!state.session.isLoggedIn) {
      return "";
    }
    return `
      <header class="shell-header">
        <div class="brand">
          <div class="brand-mark">T</div>
          <div><strong>TRAINTUP</strong><span>Быстрые подработки</span></div>
        </div>
      </header>
    `;
  }

  function renderPromoStoryViewer() {
    const stories = getPromoStories();
    if (!state.ui.promoViewerOpen || !stories.length) {
      return "";
    }

    const story = getActivePromoStory();
    if (!story) {
      return "";
    }

    return `
      <section class="promo-story-viewer" aria-label="Промо истории">
        <div class="promo-story-shell">
          <div class="promo-story-progress" style="--story-count:${stories.length}">
            ${stories.map((item, index) => `
              <button
                class="promo-story-bar ${index < state.ui.promoIndex ? "completed" : ""} ${index === state.ui.promoIndex ? "active" : ""}"
                type="button"
                data-action="story-go"
                data-story-index="${index}"
                aria-label="Промо ${index + 1}">
                <span style="${index === state.ui.promoIndex ? `--story-accent:${story.accent || "#98f53d"};--story-duration:${promoStoryRemaining}ms;` : ""}"></span>
              </button>
            `).join("")}
          </div>

          <button class="promo-story-skip" type="button" data-action="story-close">Пропустить</button>

          <div class="promo-story-content">
            <div class="promo-story-visual">
              <div class="promo-story-orb promo-story-orb-top"></div>
              <div class="promo-story-orb promo-story-orb-bottom"></div>
              ${story.image ? `<img class="promo-story-image" src="${escapeHtml(story.image)}" alt="${escapeHtml(story.title || "Промо")}">` : `<div class="promo-story-letters">${escapeHtml(story.visual || "UP")}</div>`}
            </div>

            <div class="promo-story-copy">
              <span class="promo-story-badge">${escapeHtml(story.badge || "Новое")}</span>
              <h2>${escapeHtml(story.title || "")}</h2>
              <p>${escapeHtml(story.subtitle || "")}</p>
            </div>
          </div>

          <div class="promo-story-touch promo-story-touch-left" data-action="story-prev" aria-label="Назад"></div>
          <div class="promo-story-touch promo-story-touch-right" data-action="story-next" aria-label="Далее"></div>
        </div>
      </section>
    `;
  }

  function renderAppHeader() {
    if (["home", "create", "orders", "chats", "notifications", "profile", "profile-data"].includes(state.ui.tab)) {
      return "";
    }
    const unread = getUnreadCount();
    const roleLabel = getRoleLabel(state.account.role);
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
          <button class="icon-button support-button" data-action="open-support" aria-label="Поддержка">${ICONS.support}</button>
          <button class="icon-button" data-action="open-tab" data-tab="notifications" aria-label="Уведомления"${unread ? ` data-badge="${unread > 9 ? "9+" : unread}"` : ""}>${ICONS.bell}</button>
          <button class="theme-button" data-action="toggle-theme" aria-label="Сменить тему">${state.settings.theme === "dark" ? "☀️" : "🌙"}</button>
        </div>
      </header>
    `;
  }

  function renderAuthView() {
    switch (state.session.step) {
      case "intro": return renderIntroScreens();
      case "role": return renderRoleStep();
      case "register": return renderRegisterStep();
      case "location": return renderLocationStep();
      case "confirm": return renderConfirmStep();
      default: return renderOnboardStep();
    }
  }

  function renderIntroScreens() {
    const introIndex = state.ui.introScreenIndex;
    const screens = [
      {
        title: "Найди работу",
        description: "Просматривай заказы рядом с тобой и выбирай удобные по цене и времени",
        color: "#5b5bd6"
      },
      {
        title: "Договорись о цене",
        description: "Общайся с заказчиком, торгуйся и согласовывай все детали до начала работы",
        color: "#0f9f77"
      },
      {
        title: "Получи оплату",
        description: "Заверши заказ и получи деньги на баланс. Всё прозрачно и без комиссий",
        color: "#d97706"
      }
    ];

    const screen = screens[introIndex];
    const isLast = introIndex === screens.length - 1;

    return `
      <section class="screen auth-layout auth-intro">
        <article class="intro-card">
          <div class="intro-progress">
            ${screens.map((_, i) => `
              <div class="intro-dot ${i === introIndex ? "active" : ""}"></div>
            `).join("")}
          </div>

          <div class="intro-content" style="--accent-color: ${screen.color}">
            <div class="intro-visual" style="background-color: ${screen.color}20"></div>
            <h1 class="intro-title">${escapeHtml(screen.title)}</h1>
            <p class="intro-subtitle">${escapeHtml(screen.description)}</p>
          </div>

          <div class="intro-actions">
            <button class="btn btn-ghost btn-block" type="button" data-action="skip-intro">Пропустить</button>
            ${isLast 
              ? `<button class="btn btn-primary btn-block" type="button" data-action="finish-intro">Начать</button>`
              : `<button class="btn btn-primary btn-block" type="button" data-action="next-intro">Далее</button>`
            }
          </div>
        </article>
      </section>
    `;
  }

  function renderOnboardStep() {
    return `
      <section class="screen auth-layout auth-onboard">
        <article class="onboard-card">
          <div class="onboard-hero-panel">
            <div class="onboard-copy-stack">
              <div class="onboard-copy">
                <h1 class="onboard-title">Быстрые заказы рядом <span>с вами</span></h1>
                <p class="onboard-subtitle">Открывайте срочные поручения, выбирайте удобный маршрут и работайте без лишнего шума.</p>
              </div>
            </div>

            <div class="onboard-illustration" aria-hidden="true">
              <img class="onboard-illustration-image" src="img/Start.png" alt="">
            </div>
          </div>

          <div class="onboard-actions-card">
            <div class="onboard-actions-copy">
              <strong>Начнем с роли и телефона</strong>
              <span>Потом сразу попадете в приложение.</span>
            </div>
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
      <section class="screen role-screen">
        <div class="role-screen-shell">
          <header class="role-screen-head">
            <h1 class="role-screen-title">Выберите роль</h1>
            <p class="role-screen-subtitle">Выберите, кем вы хотите быть<br>в нашем приложении</p>
          </header>
          <div class="role-choice-list">
            <article class="role-choice-card role-choice-card-customer ${role === "customer" ? "active" : ""}">
              <button class="role-choice-card-hit" type="button" data-action="pick-role" data-role="customer" aria-label="Выбрать роль Заказчик"></button>
              <div class="role-choice-visual" aria-hidden="true">
                <img class="role-choice-image" src="img/role-customer-card.png" alt="" onerror="this.hidden=true">
              </div>
              <div class="role-choice-content">
                <h2 class="role-choice-title">Заказчик</h2>
                <p class="role-choice-description">Я хочу найти исполнителя<br>для решения своей задачи</p>
                <button class="role-card-button role-card-button-customer" type="button" data-action="continue-role" data-role="customer">Я заказчик</button>
              </div>
            </article>
            <article class="role-choice-card role-choice-card-executor ${role === "executor" ? "active" : ""}">
              <button class="role-choice-card-hit" type="button" data-action="pick-role" data-role="executor" aria-label="Выбрать роль Исполнитель"></button>
              <div class="role-choice-visual" aria-hidden="true">
                <img class="role-choice-image" src="img/role-executor-card.png" alt="" onerror="this.hidden=true">
              </div>
              <div class="role-choice-content">
                <h2 class="role-choice-title">Исполнитель</h2>
                <p class="role-choice-description">Я хочу выполнять задачи<br>и зарабатывать</p>
                <button class="role-card-button role-card-button-executor" type="button" data-action="continue-role" data-role="executor">Я исполнитель</button>
              </div>
            </article>
          </div>
        </div>
      </section>
    `;
  }

  function renderRegisterStep() {
    const mode = state.session.mode;
    const isRegister = mode === "register";
    return `
      <section class="screen auth-flow-screen">
        <form class="auth-panel form" data-form="auth">
          <header class="auth-panel-head">
            <h1 class="auth-panel-title">${isRegister ? "Создание аккаунта" : "Добро пожаловать<br>в TrainUp!"}</h1>
            <p class="auth-panel-subtitle">${isRegister ? "Заполните информацию<br>для начала работы" : "Войдите, чтобы продолжить"}</p>
          </header>

          ${!isRegister ? `
          <div class="auth-social-list">
            <button class="auth-social-button" type="button"><span class="auth-social-mark google">G</span><span>Войти через Google</span></button>
            <button class="auth-social-button" type="button"><span class="auth-social-mark apple">●</span><span>Войти через Apple</span></button>
          </div>
          <div class="auth-divider"><span>или</span></div>
          ` : ""}

          <div class="auth-fields">
            ${isRegister ? `
            <label class="auth-field">
              <span>Имя</span>
              <input type="text" name="name" placeholder="Введите ваше имя" value="${escapeHtml(state.session.pending?.name || "")}" required>
            </label>
            ` : ""}
            <label class="auth-field">
              <span>Номер телефона</span>
              <input type="tel" name="phone" placeholder="+7 (___) ___-__-__" value="${escapeHtml(state.session.pending?.phone || state.account?.phone || "")}" required>
            </label>
            <label class="auth-field">
              <span>Пароль</span>
              <input type="password" name="password" placeholder="${isRegister ? "Минимум 6 символов" : "Введите пароль"}" value="${escapeHtml(state.session.pending?.password || "")}" required>
            </label>
          </div>

          ${isRegister ? `
          <label class="auth-agree">
            <input type="checkbox" name="terms" value="yes" required checked>
            <span>Я соглашаюсь с условиями пользовательского соглашения и политикой конфиденциальности</span>
          </label>
          ` : `
          <button class="auth-forgot" type="button">Забыли пароль?</button>
          `}

          <button class="auth-submit" type="submit">${isRegister ? "Зарегистрироваться" : "Войти"}</button>

          <p class="auth-switch-line">
            ${isRegister ? "Уже есть аккаунт?" : "Нет аккаунта?"}
            <button type="button" data-action="set-auth-mode" data-mode="${isRegister ? "login" : "register"}">${isRegister ? "Войти" : "Зарегистрироваться"}</button>
          </p>
        </form>
      </section>
    `;
  }

  function renderLocationStep() {
    return `
      <section class="screen location-screen">
        <div class="location-map-panel" aria-hidden="true">
          <img class="location-map-image" src="img/location-map.png" alt="" onerror="this.hidden=true">
        </div>
        <div class="location-content">
          <h1 class="location-title">Укажите ваше<br>местоположение</h1>
          <p class="location-subtitle">Мы используем геолокацию, чтобы показывать актуальные заказы рядом с вами</p>
          <div class="location-actions">
            <button class="location-primary-button" type="button" data-action="allow-location">Разрешить доступ</button>
            <button class="location-link-button" type="button" data-action="manual-location">Указать вручную</button>
          </div>
        </div>
      </section>
    `;
  }

  function renderConfirmStep() {
    const pending = state.session.pending || {};
    return `
      <section class="screen stack auth-flow-screen">
        <div class="auth-step-shell">
          <div class="section-head auth-step-head">
            <button class="back-button" data-action="go-step" data-step="location" aria-label="Назад">${ICONS.chevron}</button>
            <div class="section-copy"><p class="eyebrow">04 Подтверждение</p><h2 class="section-title">Подтверждение телефона</h2><span class="helper">Проверяем номер ${escapeHtml(pending.phone || "+7 777 123 45 67")}.</span></div>
          </div>
          <form class="form" data-form="confirm">
            <article class="otp-card card auth-step-card auth-confirm-card">
              <div class="auth-step-copy">
                <strong>Остался последний шаг</strong>
                <span>Пока используйте фиксированный код подтверждения 1234.</span>
              </div>
            <div class="otp-grid">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="0" autocomplete="one-time-code">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="1">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="2">
              <input class="otp-box" type="text" inputmode="text" maxlength="1" data-otp="3">
            </div>
            <button class="btn btn-primary btn-block" type="submit">Подтвердить</button>
            </article>
          </form>
        </div>
      </section>
    `;
  }

  function renderLoggedInView() {
    switch (state.ui.tab) {
      case "create": return renderCreateView();
      case "orders": return renderOrdersView();
      case "chats": return renderChatsView();
      case "notifications": return renderNotificationsView();
      case "profile": return renderProfileView();
      case "profile-data": return renderProfileDataView();
      default: return renderHomeView();
    }
  }

  function renderHomeView() {
    if (state.account.role === "executor" && !state.account.isOnline) {
      return `
        <section class="view home-screen">
          <div class="offline-banner home-panel">
            <div class="offline-content">
              <p class="eyebrow">Исполнитель</p>
              <h2 class="offline-title">Вы отдыхаете</h2>
              <p class="offline-subtitle">Включите режим “На линии”, и новые заказы сразу начнут подтягиваться в ленту.</p>
            </div>
          </div>
          <div class="activation-buttons">
            <button class="btn btn-primary btn-block" data-action="activate-online">Перейти на линию</button>
            <button class="btn btn-ghost btn-block" data-action="view-profile" data-action-type="profile">Посмотреть профиль</button>
          </div>
        </section>
      `;
    }
    
    const unread = getUnreadCount();
    const allOrders = getVisibleOrders();
    const category = state.ui.homeCategory || "all";
    const orders = filterHomeOrdersByCategory(allOrders, category);
    const recommendedOrders = orders.slice(0, 2);
    const nearbyOrders = orders.slice(2, 6);
    const categoryTabs = [
      { id: "all", label: "Все" },
      { id: "courier", label: "Курьер" },
      { id: "cargo", label: "Грузоперевозки" },
      { id: "cleaning", label: "Уборка" }
    ];
    
    return `
      <section class="view home-screen">
        <header class="home-ref-header">
          <div class="home-ref-title-block">
            <h1 class="home-ref-title">Главная</h1>
            <div class="home-ref-city city-dropdown ${state.ui.cityMenuOpen ? "open" : ""}">
              <button class="home-city-trigger" type="button" data-action="toggle-city-menu" aria-expanded="${state.ui.cityMenuOpen ? "true" : "false"}">
                <span class="home-city-pin">${ICONS.pin}</span>
                <span>${escapeHtml(state.ui.selectedCity)}</span>
                <span class="home-city-chevron">${ICONS.chevron}</span>
              </button>
              ${state.ui.cityMenuOpen ? `
                <div class="city-menu home-city-menu" role="menu" aria-label="Список городов">
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
          <button class="home-bell-button" type="button" data-action="open-tab" data-tab="notifications" aria-label="Уведомления"${unread ? ` data-badge="${unread > 9 ? "9+" : unread}"` : ""}>${ICONS.bell}</button>
        </header>

        <label class="home-search">
          <span class="home-search-icon">${ICONS.search}</span>
          <input type="search" name="search" placeholder="Поиск задачи" value="${escapeHtml(state.ui.search)}">
        </label>

        <div class="home-category-row" aria-label="Категории">
          ${categoryTabs.map((tab) => `<button class="home-category-chip ${category === tab.id ? "active" : ""}" type="button" data-action="set-home-category" data-category="${tab.id}">${escapeHtml(tab.label)}</button>`).join("")}
        </div>

        <section class="home-ref-section">
          <div class="home-section-head">
            <h2>Рекомендуемые</h2>
          </div>
          <div class="home-task-list">
            ${recommendedOrders.length ? recommendedOrders.map((order, index) => renderHomeTaskCard(order, index === 0)).join("") : renderEmptyOrders()}
          </div>
        </section>

        ${nearbyOrders.length ? `
        <section class="home-ref-section">
          <div class="home-section-head">
            <h2>Рядом с вами</h2>
          </div>
          <div class="home-task-list">
            ${nearbyOrders.map((order) => renderHomeTaskCard(order, false)).join("")}
          </div>
        </section>
        ` : ""}
      </section>
    `;
  }

  function renderOrdersView() {
    const orders = getVisibleOrders();
    const labels = state.account.role === "executor" ? { available: "Доступные", work: "В работе", done: "Завершенные" } : { available: "Активные", work: "В работе", done: "Завершенные" };
    const counts = getOrdersTabCounts();
    const unread = getUnreadCount();

    return `
      <section class="view orders-ref-screen">
        <header class="orders-ref-header">
          <div>
            <h1>Заказы</h1>
            <p>${state.account.role === "executor" ? "Новые задачи и заказы в работе" : "Ваши задачи и отклики исполнителей"}</p>
          </div>
          <button class="home-bell-button" type="button" data-action="open-tab" data-tab="notifications" aria-label="Уведомления"${unread ? ` data-badge="${unread > 9 ? "9+" : unread}"` : ""}>${ICONS.bell}</button>
        </header>

        <label class="home-search orders-ref-search">
          <span class="home-search-icon">${ICONS.search}</span>
          <input type="search" name="search" placeholder="Найти задачу или адрес" value="${escapeHtml(state.ui.search)}">
        </label>

        <div class="orders-ref-tabs">
          ${Object.entries(labels).map(([key, label]) => `<button class="${state.ui.homeFilter === key ? "active" : ""}" type="button" data-action="set-filter" data-filter="${key}"><span>${escapeHtml(label)}</span><b>${counts[key] || 0}</b></button>`).join("")}
        </div>

        <div class="orders-ref-list">
          ${orders.length ? orders.map(renderOrderCard).join("") : renderEmptyOrders()}
        </div>
      </section>
    `;
  }

  function getOrdersTabCounts() {
    const counts = { available: 0, work: 0, done: 0 };
    const accountId = state.account?.id;
    state.orders.forEach((order) => {
      if (order.city !== state.ui.selectedCity) return;
      if (state.account.role === "executor") {
        if (order.status === "open" && order.ownerId !== accountId) counts.available += 1;
        if (order.status === "assigned" && order.assigneeId === accountId) counts.work += 1;
        if (order.status === "done" && order.assigneeId === accountId) counts.done += 1;
        return;
      }
      if (order.ownerId !== accountId) return;
      if (order.status === "open") counts.available += 1;
      if (order.status === "assigned") counts.work += 1;
      if (order.status === "done") counts.done += 1;
    });
    return counts;
  }

  function filterHomeOrdersByCategory(orders, category) {
    if (!category || category === "all") return orders;
    const matchers = {
      courier: ["курьер", "достав", "документ", "посыл"],
      cargo: ["груз", "мебел", "переезд", "разгруз", "погруз"],
      cleaning: ["уборк", "клининг", "дом"]
    };
    const words = matchers[category] || [];
    return orders.filter((order) => {
      const source = `${order.title || ""} ${order.category || ""} ${order.description || ""}`.toLowerCase();
      return words.some((word) => source.includes(word));
    });
  }

  function renderHomeTaskCard(order, featured = false) {
    const price = order.finalPrice || order.budget;
    const title = order.title || "Новая задача";
    const meta = getHomeTaskMeta(order);
    const time = order.when || (order.status === "open" ? "Сегодня" : getOrderStageMeta(order.stage, order).title);
    const location = getOrderLocationSummary(order);
    return `
      <article class="home-task-card ${featured ? "featured" : ""}" data-action="open-order" data-order-id="${order.id}">
        <div class="home-task-icon ${meta.className}" aria-hidden="true">${meta.icon}</div>
        <div class="home-task-main">
          <div class="home-task-top">
            <h3>${escapeHtml(title)}</h3>
            ${featured && order.status === "open" ? '<span class="home-new-badge">Новый</span>' : ""}
          </div>
          <p>${escapeHtml(location)}</p>
          <span>${escapeHtml(time)}</span>
          <strong>${formatMoney(price)}</strong>
        </div>
        <span class="home-task-arrow" aria-hidden="true">${ICONS.chevron}</span>
      </article>
    `;
  }

  function getOrderLocationSummary(order) {
    if (getOrderTaskKind(order) === "delivery" && order.toAddress) {
      return `${order.fromAddress || getCityCenterLabel(order.city)} → ${order.toAddress}`;
    }
    return order.fromAddress || order.address || order.toAddress || "Адрес уточняется";
  }

  function getHomeTaskMeta(order) {
    const source = `${order.category || ""} ${order.title || ""}`.toLowerCase();
    if (source.includes("груз") || source.includes("мебел") || source.includes("переезд")) {
      return { className: "cargo", icon: ICONS.briefcase };
    }
    if (source.includes("уборк") || source.includes("дом") || source.includes("ремонт") || source.includes("сантех") || source.includes("электр")) {
      return { className: "cleaning", icon: ICONS.list };
    }
    if (source.includes("документ")) {
      return { className: "document", icon: ICONS.briefcase };
    }
    return { className: "courier", icon: ICONS.briefcase };
  }

  function renderCreateView() {
    if (state.account.role !== "customer") {
      return `
        <section class="view create-ref-screen">
          <header class="create-ref-header">
            <button class="create-ref-back" type="button" data-action="open-tab" data-tab="home" aria-label="Назад">${ICONS.chevron}</button>
            <h1>Создать задачу</h1>
            <span></span>
          </header>
          <div class="create-ref-empty">
            <strong>Создание доступно заказчику</strong>
            <p>Сейчас профиль в режиме исполнителя. Переключитесь на заказчика, чтобы создать задачу.</p>
            <button class="create-ref-submit" type="button" data-action="switch-role">Переключить роль</button>
          </div>
        </section>
      `;
    }
    const selectedCity = state.ui.createOrderCity || state.account.city || state.ui.selectedCity || ORDER_CITY_OPTIONS[0];
    const selectedFromAddress = state.ui.createOrderFromAddress || "";
    const selectedToAddress = state.ui.createOrderToAddress || "";
    const categoryOptions = ["Своя категория", ...ORDER_SERVICE_OPTIONS];
    return `
      <section class="view create-ref-screen">
        <header class="create-ref-header">
          <button class="create-ref-back" type="button" data-action="open-tab" data-tab="home" aria-label="Назад">${ICONS.chevron}</button>
          <h1>Создать задачу</h1>
          <span></span>
        </header>

        <form class="create-ref-form" data-form="create-order">
          <input type="hidden" name="order_city" value="${escapeHtml(selectedCity)}">

          <label class="create-ref-field">
            <span>Название задачи</span>
            <input type="text" name="title" placeholder="Например: Доставка еды" required>
          </label>

          <label class="create-ref-field create-ref-select">
            <span>Категория</span>
            <select name="service" required>
              ${categoryOptions.map((service) => `<option value="${escapeHtml(service)}">${escapeHtml(service)}</option>`).join("")}
            </select>
          </label>

          <label class="create-ref-field">
            <span>Если категории нет в списке</span>
            <input type="text" name="custom_service" placeholder="Например: Выгул собаки">
          </label>

          <label class="create-ref-field">
            <span>Описание</span>
            <textarea name="description" placeholder="Подробно опишите задачу" required></textarea>
          </label>

          <label class="create-ref-field">
            <span>Требования</span>
            <textarea name="requirements" placeholder="Например: взять свой инструмент, быть на месте к 14:00, аккуратно упаковать вещи"></textarea>
            <small>Пишите сами любые условия. Можно каждое требование с новой строки.</small>
          </label>

          <label class="create-ref-field">
            <span>Точка А</span>
            <input type="text" name="order_from_address" placeholder="Откуда забрать или где выполнить задачу" value="${escapeHtml(selectedFromAddress)}" required>
          </label>

          <label class="create-ref-field">
            <span>Точка Б</span>
            <input type="text" name="order_to_address" placeholder="Куда доставить, если это доставка" value="${escapeHtml(selectedToAddress)}">
            <small>Не обязательно, если это не доставка. Для помощи по дому, уборки или ремонта достаточно точки А.</small>
          </label>

          <label class="create-ref-field">
            <span>Номер для связи</span>
            <input type="tel" name="sender_phone" placeholder="+7 ___ ___ __ __" value="${escapeHtml(state.account.phone || "")}">
            <small>Номер будет скрыт в общих заказах и станет виден только после принятия заказа.</small>
          </label>

          <label class="create-ref-field">
            <span>Бюджет</span>
            <input type="number" name="budget" min="1" step="any" inputmode="decimal" placeholder="Например: 2500 ₸" required>
          </label>

          <button class="create-ref-submit" type="submit">Продолжить</button>
        </form>
      </section>
    `;
  }

  function renderNotificationsView() {
    const unreadCount = getUnreadCount();
    const notificationFilter = state.ui.notificationFilter || "all";
    const notifications = getVisibleNotifications();
    const isSupport = state.account.role === "support";
    return `
      <section class="view notifications-ref-screen">
        <header class="notifications-ref-header">
          <button class="task-back-button" type="button" data-action="open-tab" data-tab="home" aria-label="Назад">${ICONS.chevron}</button>
          <div>
            <h1>Уведомления</h1>
            <p>${isSupport ? "Обращения пользователей и системные события." : "Отклики, принятие заказов, статусы и комиссия."}</p>
          </div>
          <button class="notifications-read-button" type="button" data-action="mark-notifications-read" aria-label="Прочитать все" ${unreadCount ? "" : "disabled"}>✓</button>
        </header>

        <div class="notifications-ref-tabs">
          <button class="${notificationFilter === "all" ? "active" : ""}" type="button" data-action="set-notification-filter" data-filter="all">Все <b>${state.notifications.length}</b></button>
          <button class="${notificationFilter === "unread" ? "active" : ""}" type="button" data-action="set-notification-filter" data-filter="unread">Непрочитанные <b>${unreadCount}</b></button>
        </div>

        <div class="notifications-ref-list">
          ${notifications.length ? notifications.map(renderNotificationCard).join("") : renderEmptyNotifications(notificationFilter)}
        </div>
      </section>
    `;
  }

  function getVisibleNotifications() {
    const filter = state.ui.notificationFilter || "all";
    return state.notifications
      .slice()
      .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
      .filter((item) => filter === "unread" ? !item.read : true);
  }

  function renderEmptyNotifications(filter) {
    return `
      <article class="notifications-ref-empty">
        <strong>${filter === "unread" ? "Непрочитанных нет" : "Пока тихо"}</strong>
        <p>${filter === "unread" ? "Все события уже прочитаны." : "Когда появятся отклики, статусы заказов или сообщения сервиса, они будут здесь."}</p>
      </article>
    `;
  }

  function renderChatsView() {
    const chats = getChatOrders();
    return `
      <section class="view chats-ref-screen">
        <header class="chats-ref-header">
          <div>
            <h1>Чаты</h1>
            <p>Переписки открываются только после принятия заказа.</p>
          </div>
        </header>

        <label class="home-search chats-ref-search">
          <span class="home-search-icon">${ICONS.search}</span>
          <input type="search" name="search" placeholder="Поиск по чату или заказу" value="${escapeHtml(state.ui.search)}">
        </label>

        <div class="chats-ref-list">
          ${chats.length ? chats.map(renderChatListCard).join("") : renderEmptyChats()}
        </div>
      </section>
    `;
  }

  function getChatOrders() {
    const search = state.ui.search.trim().toLowerCase();
    return state.orders
      .filter((order) => canUseOrderChat(order))
      .filter((order) => {
        if (!search) return true;
        const other = getChatOtherMeta(order);
        const lastMessage = getLastUserChatMessage(order);
        const haystack = `${order.title || ""} ${order.category || ""} ${other.name || ""} ${lastMessage?.text || ""}`.toLowerCase();
        return haystack.includes(search);
      })
      .sort((a, b) => new Date(getLastChatDate(b)) - new Date(getLastChatDate(a)));
  }

  function canUseOrderChat(order) {
    if (!order || !order.assigneeId) return false;
    if (!["assigned", "done"].includes(order.status)) return false;
    return order.ownerId === state.account.id || order.assigneeId === state.account.id;
  }

  function getUserChatMessages(order) {
    return Array.isArray(order.chat) ? order.chat.filter((message) => message.role !== "system" && !String(message.text || "").trim().startsWith("Предлагаю ")) : [];
  }

  function getLastUserChatMessage(order) {
    const messages = getUserChatMessages(order);
    return messages[messages.length - 1] || null;
  }

  function getLastChatDate(order) {
    const lastMessage = getLastUserChatMessage(order);
    return lastMessage?.createdAt || order.updatedAt || order.completedAt || order.createdAt || new Date().toISOString();
  }

  function getChatOtherMeta(order) {
    const isOwner = order.ownerId === state.account.id;
    return {
      name: isOwner ? (order.assigneeName || "Исполнитель") : (order.ownerName || "Заказчик"),
      role: isOwner ? "Исполнитель" : "Заказчик"
    };
  }

  function renderChatListCard(order) {
    const other = getChatOtherMeta(order);
    const lastMessage = getLastUserChatMessage(order);
    const status = order.status === "done" ? { label: "Завершен", className: "done" } : { label: "В работе", className: "work" };
    return `
      <article class="chat-ref-card" data-action="open-chat" data-order-id="${order.id}">
        <div class="chat-ref-avatar">${escapeHtml(getInitials(other.name))}</div>
        <div class="chat-ref-main">
          <div class="chat-ref-top">
            <h3>${escapeHtml(other.name)}</h3>
            <time>${escapeHtml(formatDateTime(getLastChatDate(order)))}</time>
          </div>
          <div class="chat-ref-order-row">
            <span>${escapeHtml(order.title || "Заказ")}</span>
            <b class="${status.className}">${escapeHtml(status.label)}</b>
          </div>
          <p>${escapeHtml(lastMessage?.text || "Чат открыт. Напишите первый вопрос по заказу.")}</p>
        </div>
      </article>
    `;
  }

  function renderEmptyChats() {
    return `
      <article class="chats-ref-empty">
        <strong>Чатов пока нет</strong>
        <p>Когда заказ будет принят, здесь появится переписка между заказчиком и исполнителем.</p>
      </article>
    `;
  }

  function renderProfileView() {
    const verificationMap = { none: "Не верифицирован", review: "На проверке", verified: "Верифицирован" };
    const chatCount = state.orders.filter((order) => canUseOrderChat(order)).length;
    const roleLabel = getRoleLabel(state.account.role);
    return `
      <section class="view profile-ref-screen">
        <header class="profile-ref-header">
          <div class="profile-ref-avatar">${renderAvatar(state.account.avatar, state.account.name, 62)}</div>
          <div class="profile-ref-main">
            <h1>${escapeHtml(state.account.name)}</h1>
            <p>${escapeHtml(roleLabel)}</p>
            <span>${escapeHtml(formatAccountId(state.account.id))}</span>
          </div>
          <button class="profile-ref-edit" type="button" data-action="open-tab" data-tab="profile-data" aria-label="Мои данные">${ICONS.chevron}</button>
        </header>

        <section class="profile-ref-status">
          <div>
            <span>Статус</span>
            <strong>${escapeHtml(verificationMap[state.account.verificationStatus] || verificationMap.none)}</strong>
          </div>
          <b class="${escapeHtml(state.account.verificationStatus)}">${state.account.verificationStatus === "verified" ? "✓" : "!"}</b>
        </section>

        <div class="profile-ref-stats">
          <article>
            <span>Выполнено</span>
            <strong>${state.account.jobsDone}</strong>
          </article>
          <article>
            <span>Рейтинг</span>
            <strong>${Number(state.account.rating || 0).toFixed(1)}</strong>
          </article>
          <article>
            <span>Чаты</span>
            <strong>${chatCount}</strong>
          </article>
        </div>

        <button class="profile-ref-wallet" type="button" data-action="open-wallet">
          <span>${ICONS.wallet}</span>
          <div>
            <strong>${formatMoney(state.account.balance)}</strong>
            <p>${state.account.debt > 0 ? `Комиссия к оплате: ${formatMoney(state.account.debt)}` : "Кошелёк и комиссия"}</p>
          </div>
          <i>${ICONS.chevron}</i>
        </button>

        <section class="profile-ref-menu">
          ${renderProfileMenuItem("my-data", ICONS.user, "Мои данные", "Имя, город и описание профиля", "open-tab", "profile-data")}
          ${renderProfileMenuItem("documents", ICONS.shield, "Мои документы", "Удостоверение и проверка аккаунта", "profile-placeholder")}
          ${renderProfileMenuItem("reviews", "★", "Мои отзывы", "Оценки от заказчиков и исполнителей", "profile-placeholder")}
          ${renderProfileMenuItem("notifications", ICONS.bell, "Уведомления", `${getUnreadCount()} непрочитанных`, "open-tab", "notifications")}
          ${state.account.role !== "support" ? renderProfileMenuItem("role", ICONS.briefcase, "Сменить роль", `Сейчас: ${roleLabel}`, "switch-role") : ""}
          ${renderProfileMenuItem("settings", ICONS.list, "Настройки", "Язык, безопасность и приложение", "open-settings")}
          ${renderProfileMenuItem("support", ICONS.support, "Помощь и поддержка", "Вопросы по заказам и аккаунту", "profile-placeholder")}
          ${renderProfileMenuItem("logout", "Exit", "Выйти из аккаунта", "Завершить текущую сессию", "logout", "", true)}
        </section>
      </section>
    `;
  }

  function renderProfileDataView() {
    const roleLabel = getRoleLabel(state.account.role);
    const about = state.account.about || "";
    return `
      <section class="view profile-data-screen">
        <header class="profile-data-header">
          <button class="task-back-button" type="button" data-action="open-tab" data-tab="profile" aria-label="Назад">${ICONS.chevron}</button>
          <div>
            <h1>Мои данные</h1>
            <p>Основная информация профиля</p>
          </div>
          <span></span>
        </header>

        <section class="profile-data-person">
          <div class="profile-data-avatar">${renderAvatar(state.account.avatar, state.account.name, 64)}</div>
          <div>
            <strong>${escapeHtml(state.account.name)}</strong>
            <span>${escapeHtml(formatAccountId(state.account.id))}</span>
          </div>
        </section>

        <form class="profile-data-form" data-form="profile">
          <label class="profile-data-field">
            <span>Имя</span>
            <input type="text" name="name" value="${escapeHtml(state.account.name)}" placeholder="Ваше имя" required>
          </label>

          <label class="profile-data-field">
            <span>Город</span>
            <select name="city" required>
              ${ORDER_CITY_OPTIONS.map((city) => `<option value="${escapeHtml(city)}" ${state.account.city === city ? "selected" : ""}>${escapeHtml(city)}</option>`).join("")}
            </select>
          </label>

          <label class="profile-data-field">
            <span>О себе</span>
            <textarea name="about" maxlength="200" placeholder="Коротко расскажите о себе">${escapeHtml(about)}</textarea>
            <small>${about.length}/200 символов</small>
          </label>

          <section class="profile-data-readonly">
            <div>
              <span>Роль</span>
              <strong>${escapeHtml(roleLabel)}</strong>
            </div>
            <button type="button" data-action="switch-role">Сменить</button>
          </section>

          <section class="profile-data-readonly">
            <div>
              <span>ID аккаунта</span>
              <strong>${escapeHtml(formatAccountId(state.account.id))}</strong>
            </div>
          </section>

          <button class="profile-data-submit" type="submit">Сохранить</button>
        </form>
      </section>
    `;
  }

  function renderProfileMenuItem(id, icon, title, description, action, tab = "", danger = false) {
    return `
      <button class="profile-ref-menu-item ${danger ? "danger" : ""}" type="button" data-action="${escapeHtml(action)}" data-profile-item="${escapeHtml(id)}" data-label="${escapeHtml(title)}"${tab ? ` data-tab="${escapeHtml(tab)}"` : ""}>
        <span class="profile-ref-menu-icon">${icon}</span>
        <span class="profile-ref-menu-copy">
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(description)}</small>
        </span>
        <i>${ICONS.chevron}</i>
      </button>
    `;
  }

  function renderBottomNav() {
    const tabs = [
      { id: "home", label: "Главная", icon: ICONS.home },
      { id: "orders", label: "Заказы", icon: ICONS.list },
      { id: "create", label: "", icon: ICONS.plus, extraClass: "nav-create", aria: "Создать заказ" },
      { id: "chats", label: "Чаты", icon: ICONS.chat },
      { id: "profile", label: "Профиль", icon: ICONS.user }
    ];
    return `\n      <nav class="bottom-nav" style="--nav-count:${tabs.length}">${tabs.map((tab) => `<button class="nav-item ${tab.extraClass || ""} ${state.ui.tab === tab.id ? "active" : ""}" data-action="open-tab" data-tab="${tab.id}" aria-label="${escapeHtml(tab.aria || tab.label)}">${tab.icon}${tab.label ? `<span>${escapeHtml(tab.label)}</span>` : ""}</button>`).join("")}</nav>\n    `;
  }

  function renderOrderCard(order) {
    const price = order.finalPrice || order.budget;
    const meta = getHomeTaskMeta(order);
    const status = getOrderStatusMeta(order);
    const route = getOrderLocationSummary(order);
    const time = order.when || (order.status === "open" ? "Сегодня" : getOrderStageMeta(order.stage, order).title);
    
    return `
      <article class="orders-ref-card" data-action="open-order" data-order-id="${order.id}">
        <div class="home-task-icon ${meta.className}" aria-hidden="true">${meta.icon}</div>
        <div class="orders-ref-card-main">
          <div class="orders-ref-card-top">
            <h3>${escapeHtml(order.title || "Новая задача")}</h3>
            <span class="orders-ref-status ${status.className}">${escapeHtml(status.label)}</span>
          </div>
          <p>${escapeHtml(route)}</p>
          <div class="orders-ref-meta">
            <span>${escapeHtml(order.category || "Задача")}</span>
            <span>${escapeHtml(time)}</span>
          </div>
          <strong>${formatMoney(price)}</strong>
        </div>
        <span class="home-task-arrow" aria-hidden="true">${ICONS.chevron}</span>
      </article>
    `;
  }

  function renderNotificationCard(item) {
    const icon = getNotificationIcon(item);
    const canOpenOrder = Boolean(item.orderId && getOrderById(item.orderId));
    return `
      <article class="notification-ref-card ${item.read ? "" : "unread"} ${canOpenOrder ? "clickable" : ""}" ${canOpenOrder ? `data-action="open-notification" data-notification-id="${escapeHtml(item.id)}" data-order-id="${escapeHtml(item.orderId)}"` : ""}>
        <div class="notification-ref-icon ${escapeHtml(icon.className)}" aria-hidden="true">${icon.value}</div>
        <div class="notification-ref-main">
          <div class="notification-ref-top">
            <strong>${escapeHtml(item.title)}</strong>
            <time>${escapeHtml(formatDateTime(item.createdAt))}</time>
          </div>
          <p>${escapeHtml(item.body)}</p>
        </div>
      </article>
    `;
  }

  function getNotificationIcon(item) {
    const type = String(item.type || "").toLowerCase();
    const title = String(item.title || "").toLowerCase();
    if (type.includes("chat") || title.includes("сообщ")) return { className: "chat", value: ICONS.chat };
    if (type.includes("completed") || title.includes("заверш")) return { className: "done", value: "✓" };
    if (type.includes("bid") || title.includes("отклик")) return { className: "bid", value: ICONS.briefcase };
    if (type.includes("support") || title.includes("поддерж")) return { className: "support", value: "!" };
    return { className: "order", value: ICONS.bell };
  }

  function renderModal() {
    if (!state.ui.modal) {
      return '<div class="modal-layer" hidden></div>';
    }

    if (["detail", "bargain", "order-accepted", "chat", "completed", "review", "wallet", "commission"].includes(state.ui.modal.type)) {
      let body = "";
      if (state.ui.modal.type === "wallet") {
        body = renderWalletModal();
      } else {
        const order = getOrderById(state.ui.modal.orderId);
        if (!order) return '<div class="modal-layer" hidden></div>';
        body = state.ui.modal.type === "bargain"
          ? renderBargainModal(order)
          : state.ui.modal.type === "order-accepted"
            ? renderOrderAcceptedModal(order)
            : state.ui.modal.type === "chat"
              ? renderChatModal(order)
              : state.ui.modal.type === "completed"
                ? renderCompletedModal(order)
                : state.ui.modal.type === "review"
                  ? renderReviewModal(order)
                  : state.ui.modal.type === "commission"
                    ? renderCommissionModal(order)
                    : renderDetailModal(order);
      }
      return `
        <div class="modal-layer task-screen-layer">
          <section class="task-screen-panel" role="dialog" aria-modal="true">
            ${body}
          </section>
        </div>
      `;
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
    if (state.ui.modal.type === "support") {
      title = "Поддержка";
      body = renderSupportModal();
    }
    if (state.ui.modal.type === "wallet") {
      title = "Комиссия и баланс";
      body = renderWalletModal();
    }
    if (state.ui.modal.type === "promo") {
      title = "Промокоды";
      body = renderPromoModal();
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
    if (state.ui.modal.type === "review") {
      const order = getOrderById(state.ui.modal.orderId);
      if (!order) return '<div class="modal-layer" hidden></div>';
      title = "Оставить отзыв";
      body = renderReviewModal(order);
    }
    if (state.ui.modal.type === "user-profile") {
      title = "Профиль пользователя";
      body = renderUserProfileModal(state.ui.modal.userId, state.ui.modal.userName);
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
    const isOpen = order.status === "open";
    const isAssigned = order.status === "assigned";
    const stageMeta = getOrderStageMeta(order.stage, order);
    const isDelivery = getOrderTaskKind(order) === "delivery";
    const canSeePhone = order.status !== "open" && (isOwner || isAssignee);
    const contactLabel = isOwner ? "Телефон исполнителя" : "Телефон заказчика";
    const visiblePhone = getVisibleOrderPhone(order, isOwner);
    return `
      <div class="task-detail-screen">
        <header class="task-screen-header">
          <button class="task-back-button" type="button" data-action="close-modal" aria-label="Назад">${ICONS.chevron}</button>
          <h1>${isAssigned ? "Заказ в работе" : "Детали задачи"}</h1>
          <button class="task-plain-icon" type="button" data-action="open-complaint" data-order-id="${order.id}" aria-label="Жалоба">!</button>
        </header>

        <article class="task-detail-card">
          <div class="task-detail-top">
            <div class="task-detail-icon ${getHomeTaskMeta(order).className}" aria-hidden="true">${getHomeTaskMeta(order).icon}</div>
            <div class="task-detail-title-block">
              <h2>${escapeHtml(order.title)}</h2>
              <span>${escapeHtml(order.category || "Задача")}</span>
            </div>
          </div>
          <strong class="task-detail-price">${formatMoney(order.finalPrice || order.budget)}</strong>
        </article>

        ${isAssigned ? `
          <section class="task-work-panel">
            <div class="task-work-row">
              <span>Статус</span>
              <strong>${escapeHtml(stageMeta.title)}</strong>
            </div>
            <div class="task-work-row">
              <span>Время</span>
              <strong>${escapeHtml(order.when || "По договоренности")}</strong>
            </div>
            <div class="task-route-list">
              <div><span>А</span><p>${escapeHtml(order.fromAddress || getCityCenterLabel(order.city))}</p></div>
              ${isDelivery || order.toAddress ? `<div><span>Б</span><p>${escapeHtml(order.toAddress || "Точка Б не указана")}</p></div>` : ""}
            </div>
            <div class="task-contact-note ${canSeePhone ? "" : "locked"}">
              <span>${escapeHtml(contactLabel)}</span>
              <strong>${canSeePhone ? escapeHtml(visiblePhone || "Не указан") : "Скрыт до принятия заказа"}</strong>
            </div>
            <div class="task-person-card">
              <div>
                <span>${isOwner ? "Исполнитель" : "Заказчик"}</span>
                <strong>${escapeHtml(isOwner ? (order.assigneeName || "Исполнитель назначен") : (order.ownerName || "Заказчик"))}</strong>
              </div>
              <div class="task-person-actions">
                <button type="button" aria-label="Позвонить">${ICONS.clock}</button>
                <button type="button" data-action="open-chat" data-order-id="${order.id}" aria-label="Чат">${ICONS.chat}</button>
              </div>
            </div>
          </section>
          ${renderOrderRequirementsSection(order)}
        ` : `
          <section class="task-info-section">
            <h3>Описание</h3>
            <p>${escapeHtml(order.description || "Описание будет уточнено в чате.")}</p>
          </section>
          <section class="task-info-section">
            <h3>${isDelivery ? "Маршрут" : "Адрес выполнения"}</h3>
            <div class="task-route-list">
              <div><span>А</span><p>${escapeHtml(order.fromAddress || getCityCenterLabel(order.city))}</p></div>
              ${isDelivery || order.toAddress ? `<div><span>Б</span><p>${escapeHtml(order.toAddress || "Точка Б не указана")}</p></div>` : ""}
            </div>
            ${canSeePhone ? `
              <div class="task-contact-note">
                <span>${escapeHtml(contactLabel)}</span>
                <strong>${escapeHtml(visiblePhone || "Не указан")}</strong>
              </div>
            ` : `<p class="task-private-hint">Номер для связи будет виден только после принятия заказа.</p>`}
          </section>
          ${renderOrderRequirementsSection(order)}
          <section class="task-customer-row">
            <div>
              <span>Заказчик</span>
              <strong>${escapeHtml(order.ownerName || "Заказчик")}</strong>
            </div>
            <span class="task-rating">★ ${Number(order.ownerRating || 4.9).toFixed(1)}</span>
          </section>
        `}

        ${isOwner && isOpen ? renderOwnerCandidates(order) : ""}

        <div class="task-bottom-actions">
          ${renderDetailButtons(order, isOwner, isAssignee)}
        </div>
      </div>
    `;
  }

  function renderOrderAcceptedModal(order) {
    const isOwner = order.ownerId === state.account.id;
    return `
      <div class="task-success-screen">
        <div class="task-success-mark" aria-hidden="true">✓</div>
        <h1>${isOwner ? "Исполнитель назначен" : "Заказ принят"}</h1>
        <p>${isOwner ? "Исполнитель получил заказ и свяжется с вами." : "Теперь заказ находится в работе."}</p>
        <article class="task-success-order">
          <div class="task-detail-icon ${getHomeTaskMeta(order).className}" aria-hidden="true">${getHomeTaskMeta(order).icon}</div>
          <div>
            <strong>${escapeHtml(order.title)}</strong>
            <span>${escapeHtml(order.when || "По договоренности")}</span>
            <b>${formatMoney(order.finalPrice || order.budget)}</b>
          </div>
        </article>
        <button class="task-primary-button" type="button" data-action="open-order" data-order-id="${order.id}">Перейти к заказу</button>
        <button class="task-secondary-button" type="button" data-action="close-modal">На главную</button>
      </div>
    `;
  }

  function renderChatModal(order) {
    if (!canUseOrderChat(order)) {
      return `
        <div class="task-completed-screen">
          <h1>Чат недоступен</h1>
          <p>Переписка открывается только после принятия заказа.</p>
          <button class="task-secondary-button" type="button" data-action="close-modal">Назад</button>
        </div>
      `;
    }
    const otherName = order.ownerId === state.account.id ? order.assigneeName : order.ownerName;
    const otherRole = order.ownerId === state.account.id ? "Исполнитель" : "Заказчик";
    const messages = getUserChatMessages(order);
    return `
      <div class="task-chat-screen">
        <header class="task-chat-header">
          <button class="task-back-button" type="button" data-action="open-order" data-order-id="${order.id}" aria-label="Назад">${ICONS.chevron}</button>
          <div class="task-chat-user">
            <div class="task-chat-avatar">${escapeHtml(getInitials(otherName || otherRole))}</div>
            <div>
              <strong>${escapeHtml(otherName || otherRole)}</strong>
              <span>${escapeHtml(otherRole)}</span>
            </div>
          </div>
          <button class="task-plain-icon task-chat-menu" type="button" aria-label="Меню">⋮</button>
        </header>

        <div class="task-chat-thread">
          ${messages.length ? messages.map(renderTaskChatMessage).join("") : `<div class="task-chat-empty">Сообщений пока нет</div>`}
        </div>

        <form class="task-chat-form" data-form="message" data-order-id="${order.id}">
          <input type="text" name="text" placeholder="Сообщение..." autocomplete="off">
          <button type="submit" aria-label="Отправить">${ICONS.plus}</button>
        </form>
      </div>
    `;
  }

  function renderTaskChatMessage(message) {
    const own = message.senderId === state.account.id;
    const system = message.role === "system";
    return `
      <div class="task-chat-bubble ${own ? "me" : ""} ${system ? "system" : ""}">
        ${!own && !system ? `<strong>${escapeHtml(message.senderName || "Пользователь")}</strong>` : ""}
        <p>${escapeHtml(message.text)}</p>
        <span>${escapeHtml(formatDateTime(message.createdAt))}</span>
      </div>
    `;
  }

  function renderCompletedModal(order) {
    const canReview = !order.reviewedBy.includes(state.account.id);
    const isExecutor = order.assigneeId === state.account.id;
    const commission = calculateCommission(order.finalPrice || order.budget);
    return `
      <div class="task-completed-screen">
        <div class="task-confetti" aria-hidden="true"></div>
        <div class="task-success-mark" aria-hidden="true">✓</div>
        <h1>Заказ выполнен!</h1>
        <p>Спасибо за вашу работу. Заказ закрыт, итоговая сумма зафиксирована.</p>
        <article class="task-success-order">
          <div class="task-detail-icon ${getHomeTaskMeta(order).className}" aria-hidden="true">${getHomeTaskMeta(order).icon}</div>
          <div>
            <strong>${escapeHtml(order.title)}</strong>
            <span>${escapeHtml(order.completedAt ? formatDateTime(order.completedAt) : "Только что")}</span>
            <b>${formatMoney(order.finalPrice || order.budget)}</b>
          </div>
        </article>
        ${isExecutor ? `<article class="task-commission-note"><span>Комиссия 10%</span><strong>${formatMoney(commission)}</strong><p>Комиссия добавлена в кошелек и оплачивается перед следующим заказом.</p></article>` : ""}
        ${isExecutor ? `<button class="task-secondary-button" type="button" data-action="open-wallet">Открыть кошелек</button>` : ""}
        ${canReview ? `<button class="task-primary-button" type="button" data-action="open-review" data-order-id="${order.id}">Оценить ${order.ownerId === state.account.id ? "исполнителя" : "заказчика"}</button>` : `<button class="task-success-button" type="button">Оценка отправлена</button>`}
        <button class="task-secondary-button" type="button" data-action="close-modal">На главную</button>
      </div>
    `;
  }

  function renderStatusBlock(order) {
    const stageMeta = getOrderStageMeta(order.stage, order);
    const items = [{
      title: order.status === "done" ? "Заказ завершен" : order.status === "assigned" ? "Заказ в работе" : "Заказ ожидает исполнителя",
      text: order.status === "done" ? "Статус закрыт, итоговая цена зафиксирована." : order.status === "assigned" ? `Исполнитель: ${order.assigneeName || "назначен"}` : "Можно откликнуться сразу или предложить свою цену."
    }];

    if (order.status !== "open") {
      items.push({
        title: `Трекинг: ${stageMeta.title}`,
        text: stageMeta.text
      });
    }

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
      return `<section class="task-bids-section"><h3>Отклики</h3><article class="task-empty-block"><strong>Пока нет откликов</strong><p>Как только исполнитель отправит цену или сообщение, они появятся здесь.</p></article></section>`;
    }

    return `
      <section class="task-bids-section">
        <h3>Отклики (${order.bids.length})</h3>
        ${order.bids.slice().sort((a, b) => a.price - b.price).map((bid) => `
          <article class="task-bid-card">
            <div class="task-bid-avatar">${escapeHtml(getInitials(bid.userName))}</div>
            <div class="task-bid-main">
              <div class="task-bid-top">
                <strong>${escapeHtml(bid.userName)}</strong>
                <b>${formatMoney(bid.price)}</b>
              </div>
              <p>${escapeHtml(bid.note || "Готов выполнить задачу")}</p>
              <span>${escapeHtml(formatDateTime(bid.createdAt))}</span>
            </div>
            <button class="task-accept-bid" type="button" data-action="accept-bid" data-order-id="${order.id}" data-bid-id="${bid.id}">Принять</button>
          </article>
        `).join("")}
      </section>
    `;
  }

  function renderDetailButtons(order, isOwner, isAssignee) {
    const canReview = order.status === "done" && !order.reviewedBy.includes(state.account.id);
    if (canReview) return `<button class="task-primary-button" type="button" data-action="open-review" data-order-id="${order.id}">Оставить отзыв</button>`;
    if (order.status === "done") return '<button class="task-success-button" type="button">Завершено</button>';
    if (isOwner && order.status === "assigned") return `<button class="task-primary-button task-green-button" type="button" data-action="complete-order" data-order-id="${order.id}">Завершить заказ</button>`;
    if (isAssignee && order.status === "assigned") {
      if (order.stage !== "delivered") {
        return `<button class="task-primary-button" type="button" data-action="advance-stage" data-order-id="${order.id}">Следующий этап: ${escapeHtml(getOrderStageMeta(getNextOrderStage(order.stage), order).title)}</button>`;
      }
      return `<button class="task-primary-button task-green-button" type="button" data-action="complete-order" data-order-id="${order.id}">Подтвердить выполнение</button>`;
    }
    if (state.account.role === "executor" && !isOwner && order.status === "open") return `<button class="task-primary-button task-green-button" type="button" data-action="open-bargain" data-order-id="${order.id}">Откликнуться на задачу</button><button class="task-secondary-button" type="button" data-action="take-order" data-order-id="${order.id}">Взять за ${formatMoney(order.finalPrice || order.budget)}</button>`;
    if (isOwner && order.status === "open") return '<button class="task-secondary-button" type="button">Ожидаем отклики</button>';
    return '<button class="task-secondary-button" type="button">Заказ уже занят</button>';
  }

  function renderBargainModal(order) {
    const myBid = order.bids.filter((bid) => bid.userId === state.account.id).slice(-1)[0];
    return `
      <div class="task-offer-screen">
        <header class="task-screen-header">
          <button class="task-back-button" type="button" data-action="open-order" data-order-id="${order.id}" aria-label="Назад">${ICONS.chevron}</button>
          <h1>Отклик на задачу</h1>
          <span></span>
        </header>

        <article class="task-offer-summary">
          <div class="task-detail-icon ${getHomeTaskMeta(order).className}" aria-hidden="true">${getHomeTaskMeta(order).icon}</div>
          <div>
            <strong>${escapeHtml(order.title)}</strong>
            <span>${formatMoney(order.finalPrice || order.budget)}</span>
          </div>
        </article>

        <form class="task-offer-form" data-form="offer" data-order-id="${order.id}">
          <label class="task-offer-field">
            <span>Предложите свою цену</span>
            <input type="number" name="price" min="500" step="100" inputmode="decimal" placeholder="2 500 ₸" value="${myBid ? escapeHtml(String(myBid.price)) : escapeHtml(String(order.finalPrice || order.budget || ""))}" required>
          </label>

          <p class="task-recommended-price">Рекомендуемая цена: ${formatMoney(Math.max(500, Math.round((order.finalPrice || order.budget || 2500) * 0.8)))} – ${formatMoney(Math.round((order.finalPrice || order.budget || 2500) * 1.2))}</p>

          <label class="task-offer-field">
            <span>Напишите сообщение заказчику</span>
            <textarea name="note" placeholder="Расскажите, почему вы подходите для этой задачи">${myBid ? escapeHtml(myBid.note || "") : ""}</textarea>
          </label>

          <button class="task-primary-button" type="submit">Отправить отклик</button>
        </form>
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
    const balance = Number(state.account?.balance || 0);
    const debt = Number(state.account?.debt || 0);
    const history = getWalletHistory();
    return `
      <div class="task-wallet-screen">
        <header class="task-screen-header wallet-ref-header">
          <button class="task-back-button" type="button" data-action="close-modal" aria-label="Назад">${ICONS.chevron}</button>
          <h1>Кошелёк</h1>
          <button class="wallet-header-add" type="button" data-action="focus-topup" aria-label="Пополнить">${ICONS.plus}</button>
        </header>

        <section class="wallet-balance-hero">
          <span>Баланс</span>
          <strong>${formatMoney(balance)}</strong>
          <button type="button" data-action="focus-topup" aria-label="Пополнить баланс">${ICONS.plus}</button>
        </section>

        <section class="wallet-section">
          <h2>Комиссия</h2>
          <article class="wallet-commission-card ${debt > 0 ? "due" : "paid"}">
            <div class="wallet-commission-icon" aria-hidden="true">${debt > 0 ? "%" : "✓"}</div>
            <div>
              <strong>${debt > 0 ? "К оплате перед следующим заказом" : "Комиссия погашена"}</strong>
              <p>${debt > 0 ? "Оплатите долг, чтобы снова брать заказы без ограничений." : "Ограничений по новым заказам нет."}</p>
            </div>
            <b>${formatMoney(debt)}</b>
          </article>
          ${debt > 0 ? `<button class="wallet-pay-button" type="button" data-action="pay-debt">Оплатить комиссию</button>` : ""}
        </section>

        <form class="wallet-topup-card" data-form="topup-modal">
          <label class="wallet-topup-field">
            <span>Сумма пополнения</span>
            <input type="number" name="amount" min="500" step="500" value="1000">
          </label>
          <div class="wallet-quick-row">
            <button type="button" data-action="set-topup" data-value="1000">1 000</button>
            <button type="button" data-action="set-topup" data-value="2000">2 000</button>
            <button type="button" data-action="set-topup" data-value="5000">5 000</button>
          </div>
          <button class="wallet-submit-button" type="submit">Пополнить баланс</button>
        </form>

        <section class="wallet-section">
          <h2>История операций</h2>
          <div class="wallet-history-list">
            ${history.length ? history.map((item) => `
              <article class="wallet-history-item">
                <span class="wallet-history-icon ${item.tone}" aria-hidden="true">${getWalletHistoryIcon(item.type)}</span>
                <div>
                  <strong>${escapeHtml(item.title || "Операция")}</strong>
                  <p>${escapeHtml(item.text || formatDateTime(item.createdAt))}</p>
                </div>
                <b class="${item.tone}">${Number(item.amount || 0) > 0 ? "+" : ""}${formatMoney(item.amount)}</b>
              </article>
            `).join("") : `<article class="wallet-empty-state"><strong>Операций пока нет</strong><p>Пополнения, промокоды и комиссии появятся здесь.</p></article>`}
          </div>
        </section>

        <button class="wallet-withdraw-button" type="button" data-action="withdraw-funds">Вывести средства</button>
      </div>
    `;
  }

  function renderPromoModal() {
    const promoSummary = getPromoSummary();
    const promoHistory = Array.isArray(state.account.promoHistory) ? state.account.promoHistory.slice(0, 8) : [];
    return `
      <div class="stack promo-panel">
        <div class="stats-grid">
          <div class="summary-card"><span class="summary-label">Активировано</span><strong class="summary-value">${promoSummary.usedCount}</strong></div>
          <div class="summary-card"><span class="summary-label">Получено</span><strong class="summary-value">${formatMoney(promoSummary.totalAmount)}</strong></div>
        </div>

        <form class="form promo-code-form" data-form="promo-code">
          <div class="field">
            <span class="field-title">Промокод</span>
            <input type="text" name="promo_code" placeholder="Например: START500" autocomplete="off">
          </div>
          <button class="btn btn-primary btn-block" type="submit">Активировать</button>
        </form>

        <div class="promo-code-list">
          ${Object.entries(getPromoCodeLibrary()).map(([code, promo]) => `
            <button class="promo-code-chip" type="button" data-action="fill-promo-code" data-code="${escapeHtml(code)}">
              <strong>${escapeHtml(code)}</strong>
              <span>+${formatMoney(promo.amount)}</span>
            </button>
          `).join("")}
        </div>

        <article class="promo-history-panel">
          <strong>История</strong>
          <div class="promo-history-list">
            ${promoHistory.length ? promoHistory.map((item) => `
              <div class="promo-history-row">
                <div>
                  <strong>${escapeHtml(item.code)}</strong>
                  <span>${escapeHtml(item.label || "Промобонус")}</span>
                </div>
                <b>+${formatMoney(item.amount)}</b>
              </div>
            `).join("") : `<p class="helper">Пока ни один промокод не активирован.</p>`}
          </div>
        </article>
      </div>
    `;
  }

  function renderUserProfileModal(userId, userName) {
    const modalData = state.ui.modal?.type === "user-profile" && state.ui.modal.userId === userId ? state.ui.modal : {};
    const baseUser = { 
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
    const user = { ...baseUser, ...(modalData.user || {}) };
    const reviews = Array.isArray(modalData.reviews) ? modalData.reviews : [];
    
    // Попытка загрузить реальные данные из Firebase (non-blocking)
    if (window.FirebaseService) {
      if (!modalData.userLoaded) {
        window.FirebaseService.getUser(userId)
        .then(fbUser => {
          if (fbUser) {
            if (state.ui.modal?.type === "user-profile" && state.ui.modal.userId === userId) {
              state.ui.modal = {
                ...state.ui.modal,
                user: {
                  name: fbUser.name || userName,
                  id: fbUser.id ? fbUser.id.substring(0, 8) : userId.substring(0, 8),
                  rating: fbUser.rating || 0,
                  jobsDone: fbUser.jobsDone || 0,
                  verified: fbUser.verificationStatus === "verified",
                  about: fbUser.about || "Профиль",
                  avatar: fbUser.avatar || "",
                  city: fbUser.city || "Алматы",
                  responseTime: fbUser.responseTime || "~5 мин"
                },
                userLoaded: true
              };
              render();
            }
          }
        })
        .catch(err => console.error("Ошибка загрузки профиля:", err));
      }

      if (!modalData.reviewsLoaded && window.FirebaseService.getUserReviews) {
        window.FirebaseService.getUserReviews(userId)
          .then((items) => {
            if (state.ui.modal?.type === "user-profile" && state.ui.modal.userId === userId) {
              state.ui.modal = {
                ...state.ui.modal,
                reviews: Array.isArray(items) ? items : [],
                reviewsLoaded: true
              };
              render();
            }
          })
          .catch((err) => console.error("Ошибка загрузки отзывов:", err));
      }
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

        <div class="profile-section">
          <h3 class="section-title">Отзывы</h3>
          ${reviews.length ? reviews.slice(0, 5).map((review) => `
            <div class="offer-item">
              <div class="card-row"><strong>${escapeHtml(review.fromUserName || "Пользователь")}</strong><span class="offer-price">${escapeHtml(String(review.rating || 0))}★</span></div>
              <p>${escapeHtml(review.comment || "Без комментария")}</p>
              <small>${escapeHtml(formatDateTime(review.createdAt))}</small>
            </div>
          `).join("") : `<p class="helper">Отзывов пока нет.</p>`}
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
      <div class="task-wallet-screen">
        <header class="task-screen-header wallet-ref-header">
          <button class="task-back-button" type="button" data-action="close-modal" aria-label="Назад">${ICONS.chevron}</button>
          <h1>Комиссия</h1>
          <span></span>
        </header>
        <article class="task-success-order wallet-order-summary">
          <div class="task-detail-icon ${getHomeTaskMeta(order).className}" aria-hidden="true">${getHomeTaskMeta(order).icon}</div>
          <div>
            <strong>${escapeHtml(order.title)}</strong>
            <span>${escapeHtml(order.completedAt ? formatDateTime(order.completedAt) : "Заказ завершен")}</span>
            <b>${formatMoney(order.finalPrice || order.budget)}</b>
          </div>
        </article>
        <section class="wallet-section">
          <h2>К оплате</h2>
          <article class="wallet-commission-card due">
            <div class="wallet-commission-icon" aria-hidden="true">%</div>
            <div>
              <strong>Комиссия сервиса 10%</strong>
              <p>После оплаты можно сразу брать следующий заказ.</p>
            </div>
            <b>${formatMoney(commission)}</b>
          </article>
        </section>
        <section class="wallet-mini-balance">
          <span>Ваш баланс</span>
          <strong>${formatMoney(state.account.balance)}</strong>
        </section>
        <button class="wallet-pay-button" type="button" data-action="pay-debt">Оплатить сейчас</button>
        <button class="task-secondary-button" type="button" data-action="open-wallet">Открыть кошелёк</button>
      </div>
    `;
  }

  function renderReviewModal(order) {
    const targetName = order.ownerId === state.account.id ? order.assigneeName : order.ownerName;
    return `
      <form class="task-review-screen" data-form="review" data-order-id="${order.id}">
        <header class="task-screen-header">
          <button class="task-back-button" type="button" data-action="open-completed" data-order-id="${order.id}" aria-label="Назад">${ICONS.chevron}</button>
          <h1>Оцените ${order.ownerId === state.account.id ? "исполнителя" : "заказчика"}</h1>
          <span></span>
        </header>

        <div class="task-success-mark" aria-hidden="true">✓</div>
        <h2>Заказ выполнен!</h2>
        <p>Спасибо за вашу работу</p>

        <article class="task-success-order">
          <div class="task-detail-icon ${getHomeTaskMeta(order).className}" aria-hidden="true">${getHomeTaskMeta(order).icon}</div>
          <div>
            <strong>${escapeHtml(order.title)}</strong>
            <span>${escapeHtml(targetName || "Пользователь")}</span>
            <b>${formatMoney(order.finalPrice || order.budget)}</b>
          </div>
        </article>

        <div class="task-rating-control" aria-label="Оценка">
          <label><input type="radio" name="rating" value="1"><span>★</span></label>
          <label><input type="radio" name="rating" value="2"><span>★</span></label>
          <label><input type="radio" name="rating" value="3"><span>★</span></label>
          <label><input type="radio" name="rating" value="4"><span>★</span></label>
          <label><input type="radio" name="rating" value="5" checked><span>★</span></label>
        </div>

        <label class="task-offer-field">
          <span>Комментарий</span>
          <textarea name="comment" maxlength="250" placeholder="Ваш отзыв">Спасибо, все отлично!</textarea>
        </label>

        <button class="task-primary-button" type="submit">Отправить</button>
      </form>
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

  function renderSupportModal() {
    const supportItems = state.notifications
      .filter((item) => ["support_ticket", "complaint_filed"].includes(item.type))
      .slice(0, 8);
    const canCreateSupport = state.account?.role === "support" || state.account?.role === "customer" || state.account?.role === "executor";

    return `
      <div class="stack support-panel">
        <article class="status-card success stack">
          <strong>Связь с поддержкой</strong>
          <p>Опишите проблему — обращение уйдет всем сотрудникам поддержки в уведомления.</p>
        </article>

        <form class="form" data-form="support-ticket">
          <article class="card stack">
            <div class="field">
              <span class="field-title">Тема</span>
              <select name="topic" required>
                <option value="">— Выберите тему —</option>
                <option value="order">Проблема с заказом</option>
                <option value="payment">Оплата или комиссия</option>
                <option value="account">Аккаунт или вход</option>
                <option value="safety">Безопасность</option>
                <option value="other">Другое</option>
              </select>
            </div>
            <div class="field">
              <span class="field-title">Описание</span>
              <textarea name="message" placeholder="Что случилось? Чем подробнее, тем быстрее разберемся." required></textarea>
            </div>
          </article>
          <button class="btn btn-primary btn-block" type="submit">Отправить в поддержку</button>
        </form>

        ${state.account?.role === "support" ? `
          <article class="card stack">
            <strong>Входящие проблемы</strong>
            <div class="support-ticket-list">
              ${supportItems.length ? supportItems.map((item) => `
                <div class="support-ticket-item">
                  <strong>${escapeHtml(item.title)}</strong>
                  <p>${escapeHtml(item.body)}</p>
                  <small>${escapeHtml(formatDateTime(item.createdAt))}</small>
                </div>
              `).join("") : '<p class="helper">Пока нет новых обращений.</p>'}
            </div>
          </article>
        ` : ""}

        ${canCreateSupport ? `
          <form class="form" data-form="support-account">
            <article class="card stack support-admin-card">
              <div>
                <strong>Создать аккаунт сотрудника поддержки</strong>
                <p class="helper">Временная MVP-защита: нужен код разработчика 1234.</p>
              </div>
              <div class="field-grid">
                <div class="field"><span class="field-title">Имя</span><input type="text" name="support_name" placeholder="Например: Support A" required></div>
                <div class="field"><span class="field-title">Город</span><input type="text" name="support_city" value="${escapeHtml(state.account?.city || "Алматы")}" required></div>
              </div>
              <div class="field-grid">
                <div class="field"><span class="field-title">Телефон</span><input type="tel" name="support_phone" placeholder="+7 777 000 00 00" required></div>
                <div class="field"><span class="field-title">Пароль</span><input type="password" name="support_password" placeholder="Минимум 4 символа" required></div>
              </div>
              <div class="field"><span class="field-title">Код разработчика</span><input type="text" name="support_code" placeholder="1234" required></div>
            </article>
            <button class="btn btn-secondary btn-block" type="submit">Создать поддержку</button>
          </form>
        ` : ""}
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
        const haystack = `${order.title} ${order.fromAddress || ""} ${order.toAddress || order.address} ${order.city} ${order.description} ${order.requirements || ""}`.toLowerCase();
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
    return state.account.role === "customer"
      ? `<article class="orders-ref-empty"><strong>Пока нет ваших заказов</strong><p>Создайте первую задачу и получите отклики исполнителей прямо в приложении.</p><button type="button" data-action="open-tab" data-tab="create">Создать заказ</button></article>`
      : `<article class="orders-ref-empty"><strong>Подходящих заказов пока нет</strong><p>Смените фильтр или зайдите чуть позже, новые задания появятся автоматически.</p></article>`;
  }

  function getOrderActionLabel(order) {
    if (order.status === "done") return "Детали";
    if (state.account.role === "executor" && order.status === "open" && order.ownerId !== state.account.id) return "Открыть";
    if (order.status === "assigned") return "В работе";
    return "Открыть";
  }

  function getOrderStatusMeta(order) {
    if (order.status === "done") return { label: "Завершен", className: "done" };
    if (order.status === "assigned") return { label: "В работе", className: "work" };
    return { label: "Открыт", className: "open" };
  }

  function handleClick(event) {
    const target = event.target.closest("[data-action]");
    if (!target) {
      const hadCityMenu = state.ui.cityMenuOpen;
      if (state.ui.cityMenuOpen && !event.target.closest(".city-dropdown")) {
        state.ui.cityMenuOpen = false;
      }
      if (hadCityMenu && !state.ui.cityMenuOpen) {
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
      if (state.session.isLoggedIn) {
        bootstrapAccountOrders();
      }
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
    if (action === "next-intro") {
      if (state.ui.introScreenIndex < 2) {
        state.ui.introScreenIndex += 1;
      }
      persist();
      render();
      return;
    }
    if (action === "skip-intro" || action === "finish-intro") {
      state.ui.introScreenIndex = 0;
      state.ui.introShown = true;
      state.session.step = "onboard";
      persist();
      render();
      return;
    }
    if (action === "pick-role") {
      state.session.pending = { ...(state.session.pending || {}), role: target.dataset.role || "executor" };
      persist();
      render();
      return;
    }
    if (action === "continue-role") {
      state.session.pending = { ...(state.session.pending || {}), role: target.dataset.role || getPendingRole() };
      state.session.step = state.session.pending.phone && state.session.pending.password ? "location" : "register";
      persist();
      render();
      return;
    }
    if (action === "allow-location") {
      const finishLocation = (coords = null) => {
        state.session.pending = {
          ...(state.session.pending || {}),
          city: state.ui.selectedCity || "Алматы",
          locationAllowed: true,
          locationCoords: coords
        };
        state.session.step = "confirm";
        persist();
        render();
        showToast("Код отправлен. Для входа используйте 1234.");
      };
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => finishLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }),
          () => finishLocation(null),
          { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
        );
      } else {
        finishLocation(null);
      }
      return;
    }
    if (action === "manual-location") {
      state.session.pending = {
        ...(state.session.pending || {}),
        city: state.ui.selectedCity || "Алматы",
        locationAllowed: false
      };
      state.session.step = "confirm";
      persist();
      render();
      showToast("Код отправлен. Для входа используйте 1234.");
      return;
    }
    if (action === "set-auth-mode") {
      state.session.mode = target.dataset.mode || "register";
      state.session.step = "register";
      persist();
      render();
      return;
    }
    if (action === "open-tab") {
      state.ui.tab = target.dataset.tab || "home";
      state.ui.modal = null;
      state.ui.cityMenuOpen = false;
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
    if (action === "set-home-category") {
      state.ui.homeCategory = target.dataset.category || "all";
      persist();
      render();
      return;
    }
    if (action === "set-notification-filter") {
      state.ui.notificationFilter = target.dataset.filter || "all";
      persist();
      render();
      return;
    }
    if (action === "open-notification") {
      markNotificationRead(target.dataset.notificationId);
      const order = getOrderById(target.dataset.orderId);
      if (order) {
        state.ui.modal = { type: "detail", orderId: order.id };
      }
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
    if (action === "story-close") {
      if (state.ui.promoIndex >= getPromoStories().length - 1) {
        state.ui.promoViewerOpen = false;
        clearPromoStoryTimer();
        promoStoryTrackedIndex = -1;
        promoStoryRemaining = PROMO_STORY_DURATION;
      } else {
        state.ui.promoIndex += 1;
        promoStoryTrackedIndex = state.ui.promoIndex;
        promoStoryRemaining = PROMO_STORY_DURATION;
      }
      persist();
      render();
      return;
    }
    if (action === "story-next") {
      if (state.ui.promoIndex >= getPromoStories().length - 1) {
        state.ui.promoViewerOpen = false;
        promoStoryTrackedIndex = -1;
        promoStoryRemaining = PROMO_STORY_DURATION;
      } else {
        state.ui.promoIndex += 1;
        promoStoryTrackedIndex = state.ui.promoIndex;
        promoStoryRemaining = PROMO_STORY_DURATION;
      }
      persist();
      render();
      return;
    }
    if (action === "story-prev") {
      state.ui.promoIndex = Math.max(0, state.ui.promoIndex - 1);
      promoStoryTrackedIndex = state.ui.promoIndex;
      promoStoryRemaining = PROMO_STORY_DURATION;
      persist();
      render();
      return;
    }
    if (action === "story-go") {
      const nextIndex = Number(target.dataset.storyIndex || 0);
      if (!Number.isNaN(nextIndex) && nextIndex >= 0 && nextIndex < getPromoStories().length) {
        state.ui.promoIndex = nextIndex;
        promoStoryTrackedIndex = state.ui.promoIndex;
        promoStoryRemaining = PROMO_STORY_DURATION;
        persist();
        render();
      }
      return;
    }
    if (action === "open-bargain") {
      state.ui.modal = { type: "bargain", orderId: target.dataset.orderId };
      persist();
      render();
      return;
    }
    if (action === "open-chat") {
      const order = getOrderById(target.dataset.orderId);
      if (!canUseOrderChat(order)) {
        showToast("Чат откроется после принятия заказа");
        return;
      }
      state.ui.modal = { type: "chat", orderId: target.dataset.orderId };
      persist();
      render();
      return;
    }
    if (action === "open-completed") {
      state.ui.modal = { type: "completed", orderId: target.dataset.orderId };
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
    if (action === "open-promo") {
      state.ui.modal = { type: "promo" };
      persist();
      render();
      return;
    }
    if (action === "fill-promo-code") {
      const input = root.querySelector('.modal-layer input[name="promo_code"]');
      if (input) {
        input.value = target.dataset.code || "";
        input.focus();
      }
      return;
    }
    if (action === "open-edit-profile") {
      state.ui.tab = "profile-data";
      state.ui.modal = null;
      persist();
      render();
      return;
    }
    if (action === "logout") {
      stopOrdersRealtime();
      stopNotificationsRealtime();
      state.session.isLoggedIn = false;
      state.account = null;
      state.notifications = [];
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
    if (action === "profile-placeholder") {
      showToast(`${target.dataset.label || "Раздел"} сделаем следующим экраном`);
      return;
    }
    if (action === "open-support") {
      state.ui.modal = { type: "support" };
      persist();
      render();
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
      saveCurrentAccount({
        name: "verification_submitted",
        data: { accountId: state.account.id }
      });
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
    if (action === "focus-topup") {
      const modalInput = root.querySelector('.modal-layer input[name="amount"]');
      if (modalInput) {
        modalInput.focus();
        modalInput.select();
      }
      return;
    }
    if (action === "withdraw-funds") {
      showToast("Вывод средств в разработке");
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
    if (action === "advance-stage") {
      advanceOrderStage(target.dataset.orderId);
      return;
    }
    if (action === "accept-bid") {
      acceptBid(target.dataset.orderId, target.dataset.bidId);
      return;
    }
    if (action === "open-review") {
      state.ui.modal = { type: "review", orderId: target.dataset.orderId };
      persist();
      render();
      return;
    }
    if (action === "mark-notifications-read") {
      markAllNotificationsRead();
      return;
    }
    if (action === "switch-role") {
      state.account.role = state.account.role === "executor" ? "customer" : "executor";
      state.ui.tab = state.account.role === "customer" ? "create" : "home";
      saveCurrentAccount({
        name: "role_switched",
        data: { accountId: state.account.id, role: state.account.role }
      });
      persist();
      bootstrapAccountOrders();
      render();
      showToast(`Роль переключена: ${getRoleLabel(state.account.role)}`);
      return;
    }
    if (action === "activate-online") {
      state.ui.modal = { type: "activation-animation" };
      persist();
      render();
      // показываем анимацию 3-4 секунды
      setTimeout(() => {
        state.account.isOnline = true;
        state.ui.modal = null;
        saveCurrentAccount();
        persist();
        render();
        bootstrapAccountOrders();
      }, 3500);
      return;
    }
    if (action === "deactivate-online") {
      stopOrdersRealtime();
      state.account.isOnline = false;
      state.orders = [];
      saveCurrentAccount();
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
      const name = String(data.get("name") || "").trim();
      const phone = String(data.get("phone") || "").trim();
      const password = String(data.get("password") || "").trim();
      if (!phone || password.length < 4) {
        showToast("Введите телефон и пароль минимум из 4 символов");
        return;
      }
      if (state.session.mode === "login") {
        // ВХОД: используем Firebase
        handleLoginViaFirebase(phone, password);
        return;
      }
      if (!name) {
        showToast("Введите имя");
        return;
      }
      if (!data.get("terms")) {
        showToast("Подтвердите согласие с условиями");
        return;
      }
      // РЕГИСТРАЦИЯ: сначала выбираем роль, затем подтверждаем телефон
      state.session.pending = { ...(state.session.pending || {}), name, phone, password, delivery_type: "foot" };
      state.session.step = "role";
      persist();
      render();
      showToast("Теперь выберите роль");
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
      if (!ensureAccountAllowed("Создание заказа")) return;
      const selectedService = String(data.get("service") || "Своя категория").trim();
      const customService = String(data.get("custom_service") || "").trim();
      const service = customService || (selectedService === "Своя категория" ? "" : selectedService);
      const city = String(data.get("order_city") || state.ui.createOrderCity || state.account.city || "Алматы").trim();
      const fromAddress = String(data.get("order_from_address") || state.ui.createOrderFromAddress || "").trim();
      const toAddress = String(data.get("order_to_address") || data.get("address") || state.ui.createOrderToAddress || "").trim();
      const title = String(data.get("title") || "").trim();
      const when = "По договоренности";
      const description = String(data.get("description") || "").trim();
      const requirements = String(data.get("requirements") || "").trim();
      const senderPhone = String(data.get("sender_phone") || state.account.phone || "").trim();
      const recipientPhone = String(data.get("recipient_phone") || "").trim();
      const budget = Number(data.get("budget") || 0);
      const payment = "Уточнить в чате";
      const isExpress = false;
      let orderPhoto = state.ui.createOrderPhotoPreview || "";
      const photoFile = form.querySelector('input[name="order_photo"]')?.files?.[0];

      if (!orderPhoto && photoFile) {
        try {
          orderPhoto = await readFileAsDataUrl(photoFile);
        } catch (error) {
          console.warn("Не удалось прочитать фото заказа", error);
        }
      }

      if (!title || !service || !fromAddress || budget <= 0) {
        showToast("Заполните название, категорию, точку А и бюджет");
        return;
      }
      const taskKind = getOrderTaskKind(service);
      if (taskKind === "delivery" && !toAddress) {
        showToast("Для доставки укажите точку Б");
        return;
      }
      const order = normalizeOrder({
        id: generateOrderId(),
        title,
        fromAddress,
        toAddress,
        address: toAddress || fromAddress,
        city,
        when,
        budget,
        senderPhone,
        recipientPhone,
        payment,
        category: service || guessCategory(title),
        taskKind,
        urgent: isExpress,
        express: isExpress,
        photo: orderPhoto,
        status: "open",
        stage: "new",
        description: description || "Описание будет уточнено в чате.",
        requirements,
        ownerId: state.account.id,
        ownerName: state.account.name,
        ownerVerified: state.account.verificationStatus === "verified",
        assigneeId: "",
        assigneeName: "",
        finalPrice: budget,
        bids: [],
        chat: [{ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: "Заказ опубликован и ждет откликов.", createdAt: new Date().toISOString() }],
        reviewedBy: [],
        completedAt: "",
        commissionSettled: false
      });

      if (window.FirebaseService) {
        try {
          const saved = await window.FirebaseService.saveOrder(order);
          replaceOrderInState(saved.order || order);
        } catch (error) {
          console.error("Failed to save order:", error);
          showToast("Не удалось опубликовать заказ");
          return;
        }
      } else {
        state.orders.unshift(order);
      }

      state.ui.tab = "home";
      state.ui.homeFilter = "available";
      state.ui.selectedCity = city;
      state.ui.createOrderCity = city;
      state.ui.createOrderFromAddress = "";
      state.ui.createOrderToAddress = "";
      state.ui.createOrderPhotoPreview = "";
      persist();
      render();
      bootstrapAccountOrders();
      showToast("Заказ опубликован");
      return;
    }

    if (formName === "support-ticket") {
      if (!ensureAccountAllowed("Поддержка")) return;
      const topic = String(data.get("topic") || "").trim();
      const message = String(data.get("message") || "").trim();
      if (!topic || !message) {
        showToast("Выберите тему и опишите проблему");
        return;
      }

      const ticket = {
        id: generateId("SUP"),
        type: "support_ticket",
        title: "Новое обращение в поддержку",
        topic,
        message,
        userId: state.account.id,
        userName: state.account.name,
        userPhone: state.account.phone || "",
        status: "open",
        createdAt: new Date().toISOString()
      };

      await sendProblemToSupport(ticket);
      state.ui.modal = null;
      persist();
      render();
      showToast("Обращение отправлено в поддержку");
      return;
    }

    if (formName === "support-account") {
      const name = String(data.get("support_name") || "").trim();
      const city = String(data.get("support_city") || state.account?.city || "Алматы").trim();
      const phone = String(data.get("support_phone") || "").trim();
      const password = String(data.get("support_password") || "").trim();
      const code = String(data.get("support_code") || "").trim();
      if (!name || !phone || password.length < 4 || code !== "1234") {
        showToast("Проверьте имя, телефон, пароль и код 1234");
        return;
      }

      try {
        if (window.FirebaseService?.registerUser) {
          await window.FirebaseService.registerUser(phone, password, name, "support", city, code);
        } else {
          showToast("Firebase не загружен — аккаунт поддержки не сохранен");
          return;
        }
        state.ui.modal = null;
        persist();
        render();
        showToast("Аккаунт поддержки создан");
      } catch (error) {
        console.error("Failed to create support account:", error);
        showToast(error.message || "Не удалось создать поддержку");
      }
      return;
    }

    if (formName === "offer") {
      if (!ensureAccountAllowed("Отклик")) return;
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
      if (order.ownerId === state.account.id) {
        showToast("Нельзя откликнуться на собственный заказ");
        return;
      }
      if (getOpenBidsCount() >= MAX_ACTIVE_BIDS) {
        showToast(`Лимит активных откликов: ${MAX_ACTIVE_BIDS}`);
        return;
      }
      const bid = {
        id: generateId("BID"),
        userId: state.account.id,
        userName: state.account.name,
        userPhone: state.account.phone || "",
        price,
        note,
        createdAt: new Date().toISOString()
      };

      if (window.FirebaseService?.submitBid) {
        try {
          const result = await window.FirebaseService.submitBid(order.id, bid);
          replaceOrderInState(result.order || order);
        } catch (error) {
          console.error("Failed to submit bid:", error);
          showToast(error.message || "Не удалось отправить отклик");
          return;
        }
      } else {
        order.bids.push(bid);
      }

      if (order.ownerId && order.ownerId !== state.account.id) {
        sendNotificationToUser(
          order.ownerId,
          "Новый отклик",
          `${state.account.name} предложил ${formatMoney(price)} по заказу ${order.title}.`,
          { type: "bid_created", orderId: order.id }
        );
      }
      
      // Log to Firebase
      if (window.FirebaseService) {
        window.FirebaseService.logEvent('bid_created', {
          orderId: order.id,
          bidId: bid.id,
          bidAmount: price,
          executorId: state.account.id
        }).catch(err => console.error('Failed to log event:', err));
      }
      
      state.ui.modal = { type: "detail", orderId: order.id };
      persist();
      render();
      showToast("Предложение отправлено");
      return;
    }

    if (formName === "message") {
      if (!ensureAccountAllowed("Сообщение")) return;
      const order = getOrderById(form.dataset.orderId);
      if (!order) return;
      if (!canUseOrderChat(order)) {
        showToast("Чат доступен только после принятия заказа");
        return;
      }
      const text = String(data.get("text") || "").trim();
      if (!text) {
        showToast("Введите сообщение");
        return;
      }
      if (text.length > 500) {
        showToast("Сообщение слишком длинное");
        return;
      }
      const message = { id: generateId("MSG"), senderId: state.account.id, senderName: state.account.name, role: state.account.role, text, createdAt: new Date().toISOString() };
      if (window.FirebaseService?.appendOrderMessage) {
        try {
          const result = await window.FirebaseService.appendOrderMessage(order.id, message);
          replaceOrderInState(result.order || order);
        } catch (error) {
          console.error("Failed to send message:", error);
          showToast("Не удалось отправить сообщение");
          return;
        }
      } else {
        order.chat.push(message);
      }

      const messageRecipientId = order.ownerId === state.account.id ? order.assigneeId : order.ownerId;
      if (messageRecipientId && messageRecipientId !== state.account.id) {
        sendNotificationToUser(
          messageRecipientId,
          "Новое сообщение",
          `${state.account.name}: ${text}`,
          { type: "chat_message", orderId: order.id }
        );
      }
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
      addWalletHistory({
        type: "topup",
        title: "Пополнение баланса",
        text: "Баланс кошелька",
        amount,
        tone: "positive"
      });
      saveCurrentAccount({
        name: "wallet_topup",
        data: {
          accountId: state.account.id,
          amount: amount,
          newBalance: state.account.balance
        }
      });
      
      persist();
      render();
      showToast(`Баланс пополнен на ${formatMoney(amount)}`);
      return;
    }

    if (formName === "promo-code") {
      const code = String(data.get("promo_code") || "").trim();
      applyPromoCode(code);
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
      state.ui.selectedCity = city;
      state.ui.createOrderCity = city;
      updateOwnOrdersMeta();
      saveCurrentAccount({
        name: "profile_updated",
        data: { accountId: state.account.id, name, city }
      });
      persist();
      render();
      showToast("Профиль сохранен");
      return;
    }

    if (formName === "complaint") {
      if (!ensureAccountAllowed("Жалоба")) return;
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
      
      // Log to Firebase and notify support workers
      if (window.FirebaseService) {
        if (window.FirebaseService.updateOrder) {
          window.FirebaseService.updateOrder(order.id, { complaints: order.complaints }).catch((error) => {
            console.error("Failed to save complaint on order:", error);
          });
        }
        window.FirebaseService.logEvent('complaint_filed', {
          orderId: order.id,
          complaintId: complaint.id,
          reason: reason,
          amount: amount
        }).catch(err => console.error('Failed to log event:', err));
      }

      await sendProblemToSupport({
        ...complaint,
        type: "complaint_filed",
        title: "Новая жалоба по заказу",
        topic: reason,
        message: `${order.title}: ${description}`,
        userPhone: state.account.phone || ""
      });
      
      state.ui.modal = { type: "completed", orderId: order.id };
      persist();
      render();
      showToast("Жалоба успешно подана");
      return;
    }

    if (formName === "review") {
      if (!ensureAccountAllowed("Отзыв")) return;
      const order = getOrderById(form.dataset.orderId);
      if (!order) return;
      if (order.reviewedBy.includes(state.account.id)) {
        showToast("Вы уже оставили отзыв");
        return;
      }
      const rating = Number(data.get("rating") || 0);
      const comment = String(data.get("comment") || "").trim();
      if (rating < 1 || rating > 5 || !comment) {
        showToast("Укажите оценку и комментарий");
        return;
      }
      const toUserId = order.ownerId === state.account.id ? order.assigneeId : order.ownerId;
      const toUserName = order.ownerId === state.account.id ? order.assigneeName : order.ownerName;
      if (!toUserId) {
        showToast("Некому оставить отзыв");
        return;
      }
      if (window.FirebaseService?.addReview) {
        window.FirebaseService.addReview({
          orderId: order.id,
          fromUserId: state.account.id,
          fromUserName: state.account.name,
          toUserId,
          toUserName,
          rating,
          comment
        }).catch((error) => console.error("Failed to save review:", error));
      }
      if (window.FirebaseService?.addUserRating) {
        window.FirebaseService.addUserRating(toUserId, rating).catch((error) => console.error("Failed to update rating:", error));
      }
      order.reviewedBy = [...order.reviewedBy, state.account.id];
      if (window.FirebaseService?.updateOrder) {
        window.FirebaseService.updateOrder(order.id, { reviewedBy: order.reviewedBy }).catch((error) => console.error("Failed to update review flag:", error));
      }
      state.ui.modal = { type: "detail", orderId: order.id };
      persist();
      render();
      showToast("Отзыв сохранен");
      return;
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
    if (input.name === "order_from_address") {
      state.ui.createOrderFromAddress = String(input.value || "");
      return;
    }
    if (input.name === "order_to_address") {
      state.ui.createOrderToAddress = String(input.value || "");
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
      if (state.session.isLoggedIn) {
        bootstrapAccountOrders();
      }
      showToast(`Фильтр города изменен на ${input.value}`);
      return;
    }

    if (input.name === "order_city") {
      const nextCity = String(input.value || "").trim() || "Алматы";
      state.ui.createOrderCity = nextCity;
      state.ui.createOrderFromAddress = "";
      state.ui.createOrderToAddress = "";
      persist();
      render();
      return;
    }

    if (input.name === "order_from_address") {
      state.ui.createOrderFromAddress = String(input.value || "").trim();
      persist();
      return;
    }

    if (input.name === "order_to_address") {
      state.ui.createOrderToAddress = String(input.value || "").trim();
      persist();
      return;
    }
    
    if (input.name === "avatar" && input.files && input.files[0]) {
      readFileAsDataUrl(input.files[0]).then((result) => {
        state.account.avatar = result;
        saveCurrentAccount();
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

  function handleFocusIn() {}

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

  function handlePointerDown(event) {
    if (!state.ui.promoViewerOpen) return;
    if (!event.target.closest(".promo-story-shell")) return;
    pausePromoStory();
  }

  function handlePointerUp(event) {
    if (!state.ui.promoViewerOpen) return;
    if (!event.target.closest(".promo-story-shell")) return;
    resumePromoStory();
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
        state.ui.selectedCity = result.account.city || "Алматы";
        persist();
        render();
        showToast("С возвращением!");
        bootstrapAdminContent();
        // Загружаем заказы
        await bootstrapAccountOrders();
        bootstrapNotifications();
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
        pending.name || `Новый ${pending.role}`,
        pending.role,
        pending.city || "Алматы",
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
        state.ui.selectedCity = result.account.city || "Алматы";
        persist();
        render();
        showToast("Аккаунт создан!");
        bootstrapAdminContent();
        // Загружаем заказы
        await bootstrapAccountOrders();
        bootstrapNotifications();
        
        // Показываем welcome модал
        state.ui.modal = { type: "welcome" };
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
      name: pending.name || (pending.role === "customer" ? "Новый заказчик" : "Новый исполнитель"),
      city: pending.city || "Алматы",
      about: "",
      avatar: "",
      verificationStatus: "none",
      balance: 1250,
      debt: 0,
      firstGraceUsed: false,
      jobsDone: 0,
      isBlocked: false,
      usedPromoCodes: [],
      promoHistory: [],
      walletHistory: [],
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
        walletHistory: state.account.walletHistory,
        createdAt: state.account.createdAt
      }).catch(err => console.error('Failed to save account:', err));
      
      window.FirebaseService.logEvent('account_created', {
        accountId: state.account.id,
        role: state.account.role,
        city: state.account.city
      }).catch(err => console.error('Failed to log event:', err));
    }
    
    bootstrapAccountOrders();
    bootstrapNotifications();
    state.ui.modal = { type: "welcome" };
    persist();
    render();
  }

  async function bootstrapAccountOrders() {
    if (!state.account) return;

    const city = state.ui.selectedCity || state.account.city || "Алматы";

    if (!window.FirebaseService) {
      setTimeout(() => {
        if (state.session.isLoggedIn && state.account) {
          bootstrapAccountOrders();
        }
      }, 400);
      return;
    }

    stopOrdersRealtime();

    if (window.FirebaseService.subscribeOrdersByCity) {
      unsubscribeOrdersRealtime = window.FirebaseService.subscribeOrdersByCity(
        city,
        (orders) => {
          if (!state.session.isLoggedIn || !state.account) return;
          state.orders = Array.isArray(orders) ? orders.map((order) => normalizeOrder(order)) : [];
          state.account.demoReady = true;
          persist();
          render();
        },
        (error) => {
          console.error("Ошибка realtime загрузки заказов:", error);
          showToast("Не удалось подключить обновление заказов");
        }
      );
      return;
    }

    try {
      const orders = await window.FirebaseService.getOrdersByCity(city);
      state.orders = Array.isArray(orders) ? orders.map((order) => normalizeOrder(order)) : [];
      state.account.demoReady = true;
      persist();
      render();
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
    
    state.account.demoReady = true;
    persist();
    render();
    showToast(`Загружено ${state.orders.length} реальных заказов`);
  }

  async function takeOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order) return;
    if (!ensureAccountAllowed("Взять заказ")) return;
    if (state.account.role !== "executor") {
      showToast("Этот режим доступен исполнителю");
      return;
    }
    if (order.ownerId === state.account.id) {
      showToast("Нельзя взять собственный заказ");
      return;
    }
    if (!canTakeNextOrder()) {
      state.ui.modal = { type: "wallet" };
      persist();
      render();
      showToast("Сначала оплатите комиссию");
      return;
    }

    try {
      if (window.FirebaseService?.takeOrder) {
        const result = await window.FirebaseService.takeOrder(orderId, {
          id: state.account.id,
          name: state.account.name,
          phone: state.account.phone || ""
        });
        replaceOrderInState(result.order || order);
      } else {
        order.status = "assigned";
        order.stage = "accepted";
        order.assigneeId = state.account.id;
        order.assigneeName = state.account.name;
        order.assigneePhone = state.account.phone || "";
        order.finalPrice = order.finalPrice || order.budget;
        order.chat.push({ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: `${state.account.name} взял заказ в работу.`, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Failed to take order:", error);
      showToast(error.message || "Не удалось взять заказ");
      return;
    }

    if (order.ownerId && order.ownerId !== state.account.id) {
      sendNotificationToUser(
        order.ownerId,
        "Заказ взят в работу",
        `${state.account.name} взял заказ ${order.title}.`,
        { type: "order_taken", orderId: order.id }
      );
    }
    state.ui.modal = { type: "order-accepted", orderId: order.id };

    if (window.FirebaseService) {
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

  async function completeOrder(orderId) {
    const order = getOrderById(orderId);
    if (!order || order.status === "done") return;
    if (!ensureAccountAllowed("Завершение заказа")) return;

    try {
      if (window.FirebaseService?.completeOrder) {
        const result = await window.FirebaseService.completeOrder(orderId);
        replaceOrderInState(result.order || order);
      } else {
        order.status = "done";
        order.completedAt = new Date().toISOString();
        order.chat.push({ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: "Заказ отмечен как выполненный.", createdAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Failed to complete order:", error);
      showToast(error.message || "Не удалось завершить заказ");
      return;
    }

    const updatedOrder = getOrderById(orderId) || order;
    if (state.account.role === "executor" && updatedOrder.assigneeId === state.account.id && !updatedOrder.commissionSettled) {
      const commissionAmount = calculateCommission(updatedOrder.finalPrice || updatedOrder.budget);
      state.account.debt += commissionAmount;
      state.account.jobsDone += 1;
      addWalletHistory({
        type: "commission",
        title: "Комиссия по заказу",
        text: updatedOrder.title,
        amount: -commissionAmount,
        tone: "negative"
      });
      saveCurrentAccount();
    }
    state.ui.modal = { type: "completed", orderId: updatedOrder.id };

    const completionRecipientId = updatedOrder.ownerId === state.account.id ? updatedOrder.assigneeId : updatedOrder.ownerId;
    if (completionRecipientId && completionRecipientId !== state.account.id) {
      sendNotificationToUser(
        completionRecipientId,
        "Заказ завершен",
        `Заказ ${updatedOrder.title} отмечен как выполненный.`,
        { type: "order_completed", orderId: updatedOrder.id }
      );
    }

    if (window.FirebaseService) {
      window.FirebaseService.logEvent('order_completed', {
        orderId: orderId,
        finalPrice: updatedOrder.finalPrice || updatedOrder.budget,
        completedAt: updatedOrder.completedAt
      }).catch(err => console.error('Failed to log event:', err));
    }

    persist();
    render();
    showToast("Заказ завершен");
  }

  async function advanceOrderStage(orderId) {
    const order = getOrderById(orderId);
    if (!order || order.status !== "assigned") return;
    if (!ensureAccountAllowed("Трекинг заказа")) return;

    const nextStage = getNextOrderStage(order.stage);
    if (nextStage === order.stage) return;

    order.stage = nextStage;
    order.chat.push({
      id: generateId("MSG"),
      senderId: "system",
      senderName: "TRAINTUP",
      role: "system",
      text: `Статус обновлен: ${getOrderStageMeta(nextStage, order).title}.`,
      createdAt: new Date().toISOString()
    });

    if (window.FirebaseService?.updateOrder) {
      window.FirebaseService.updateOrder(orderId, {
        stage: nextStage,
        chat: order.chat
      }).catch((error) => console.error("Failed to update order stage:", error));
    }

    const recipientId = order.ownerId === state.account.id ? order.assigneeId : order.ownerId;
    if (recipientId && recipientId !== state.account.id) {
      sendNotificationToUser(
        recipientId,
        "Обновление по заказу",
        `${order.title}: ${getOrderStageMeta(nextStage, order).title}`,
        { type: "order_tracking", orderId: order.id }
      );
    }

    persist();
    render();
    showToast(`Этап: ${getOrderStageMeta(nextStage, order).title}`);
  }

  async function acceptBid(orderId, bidId) {
    const order = getOrderById(orderId);
    if (!order) return;
    if (!ensureAccountAllowed("Выбор исполнителя")) return;
    const bid = order.bids.find((item) => item.id === bidId);
    if (!bid) return;

    try {
      if (window.FirebaseService?.acceptBid) {
        const result = await window.FirebaseService.acceptBid(orderId, bidId);
        replaceOrderInState(result.order || order);
      } else {
        order.status = "assigned";
        order.stage = "accepted";
        order.assigneeId = bid.userId;
        order.assigneeName = bid.userName;
        order.assigneePhone = bid.userPhone || "";
        order.finalPrice = bid.price;
        order.chat.push({ id: generateId("MSG"), senderId: "system", senderName: "TezTap", role: "system", text: `Заказчик принял предложение ${bid.userName} на ${formatMoney(bid.price)}.`, createdAt: new Date().toISOString() });
      }
    } catch (error) {
      console.error("Failed to accept bid:", error);
      showToast(error.message || "Не удалось выбрать исполнителя");
      return;
    }

    if (bid.userId && bid.userId !== state.account.id) {
      sendNotificationToUser(
        bid.userId,
        "Вас выбрали исполнителем",
        `Заказчик принял ваш отклик по заказу ${order.title}.`,
        { type: "bid_accepted", orderId: order.id }
      );
    }
    state.ui.modal = { type: "order-accepted", orderId: order.id };

    if (window.FirebaseService) {
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
    const paidAmount = state.account.debt;
    state.account.balance -= paidAmount;
    state.account.debt = 0;
    addWalletHistory({
      type: "commission",
      title: "Комиссия оплачена",
      text: "Долг закрыт",
      amount: -paidAmount,
      tone: "negative"
    });
    state.orders = state.orders.map((order) => order.assigneeId === state.account.id && order.status === "done" ? { ...order, commissionSettled: true } : order);
    saveCurrentAccount({
      name: "debt_paid",
      data: { accountId: state.account.id }
    });
    state.ui.modal = { type: "wallet" };
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

  function addNotification(title, body, meta = {}) {
    if (window.FirebaseService) {
      return;
    }
    state.notifications.unshift({
      id: generateId("NTF"),
      title,
      body,
      type: meta.type || "general",
      orderId: meta.orderId || "",
      read: false,
      createdAt: new Date().toISOString()
    });
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
    if (role === "support") return "Поддержка";
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

  function getCityCenterLabel(city) {
    return `Центр ${city || "Алматы"}`;
  }
})();
