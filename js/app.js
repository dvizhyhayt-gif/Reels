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
  let yandexMapsReadyPromise = null;
  let yandexMapsBlocked = window.location.protocol === "file:";
  let yandexSuggestBlocked = window.location.protocol === "file:";

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
  const DEFAULT_CITY_ADDRESS_TEMPLATES = [
    "ул. Абая",
    "ул. Ауэзова",
    "пр. Назарбаева",
    "пр. Республики",
    "ул. Тауелсиздик",
    "Центральный рынок",
    "ЖД вокзал",
    "Автовокзал",
    "ЦОН",
    "Центральный парк"
  ];
  const ORDER_ADDRESS_OPTIONS = {
    "Алматы": ["Mega Alma-Ata", "Арбат, Жибек Жолы", "Абая - Байтурсынова", "Dostyk Plaza", "Сайран автовокзал"],
    "Астана": ["Хан Шатыр", "Байтерек", "MEGA Silk Way", "Вокзал Нурлы Жол", "Триумф Астаны"],
    "Нур-Султан": ["Хан Шатыр", "Байтерек", "MEGA Silk Way", "Вокзал Нурлы Жол", "Триумф Астаны"],
    "Кокшетау": ["ул. Абая, 138", "ул. Ауэзова, 230", "Абылай хана, центр", "Автовокзал", "Набережная Копы", "ТЦ Rio", "ЖД вокзал"],
    "Шымкент": ["Shymkent Plaza", "Арбат Шымкент", "Центральный парк", "Автовокзал Самал", "Mega Planet"],
    "Актау": ["Актау Молл", "Набережная 15 мкр", "ТРК Актау", "Автовокзал", "Площадь Ынтымак"],
    "Уральск": ["City Center", "Центральный рынок", "Парк Кирова", "ЖД вокзал", "ТРЦ Галактика"],
    "Актобе": ["Keruen City", "Центральный стадион", "Автовокзал Сапар", "Парк Первого Президента", "Mega Aktobe"],
    "Атырау": ["ТРЦ Baizaar", "Набережная Урала", "Центральный рынок", "ЖД вокзал", "пр. Сатпаева"],
    "Караганда": ["City Mall", "ЦУМ", "Автовокзал", "Таир", "Парк Победы"],
    "Конаев": ["Центральная площадь", "Городской пляж", "Автовокзал", "пр. Д. Кунаева", "ЦОН"],
    "Костанай": ["Mart", "Центральный рынок", "ЖД вокзал", "пр. Аль-Фараби", "ЦУМ"],
    "Кызылорда": ["Старый базар", "ЖД вокзал", "пр. Абая", "Центральная площадь", "ТРЦ Aray City Mall"],
    "Петропавловск": ["ЦУМ", "ЖД вокзал", "Центральный рынок", "ул. Конституции Казахстана", "Сити Молл"],
    "Семей": ["Центральный рынок", "Арбат Семей", "ЖД вокзал", "ТЦ Казына", "Парк Абая"],
    "Павлодар": ["Batyr Mall", "Набережная", "ЖД вокзал", "ЦУМ Павлодар", "Greenwich"],
    "Талдыкорган": ["City Plus", "ЖД вокзал", "Центральный рынок", "ул. Кабанбай батыра", "ЦОН"],
    "Тараз": ["Mart", "ЖД вокзал", "Центральный рынок", "Арбат", "Парк Первого Президента"],
    "Туркестан": ["Керуен Сарай", "Мавзолей Ходжи Ахмеда Ясави", "Автовокзал", "ЖД вокзал", "Центральный рынок"],
    "Усть-Каменогорск": ["ADK River", "ЖД вокзал", "Центральный рынок", "пр. Назарбаева", "ЦОН"],
    "Жезказган": ["Центральная площадь", "ЖД вокзал", "Центральный рынок", "пр. Алашахана", "ЦОН"],
    "Рудный": ["ТЦ Ажар", "Автовокзал", "ул. Ленина", "Центральный рынок", "ЦОН"],
    "Экибастуз": ["Maxi Mall", "Автовокзал", "ул. Ауэзова", "Центральный рынок", "ЖД вокзал"],
    "Темиртау": ["Alem", "Автовокзал", "пр. Металлургов", "Центральный парк", "ЖД вокзал"],
    "Кентау": ["Центральный рынок", "Автовокзал", "пр. Кунаева", "ЦОН", "Парк Победы"],
    "Жанаозен": ["ТРЦ Zhanaozen Mall", "Автовокзал", "мкр Шанырак", "Центральная площадь", "ЦОН"],
    "Каскелен": ["Алтын ауыл", "Автовокзал", "ул. Абылай хана", "ЦОН", "Центральный рынок"],
    "Щучинск": ["Бурабай молл", "ЖД вокзал", "Автовокзал", "Центральный рынок", "ул. Абылай хана"],
    "Байконыр": ["7 микрорайон", "Автовокзал", "Центральный рынок", "ул. Абая", "площадь Ленина"],
    "Аркалык": ["Центральный рынок", "Автовокзал", "ул. Ауэзова", "ЦОН", "Центральная площадь"],
    "Балхаш": ["Центральная набережная", "Автовокзал", "ул. Агыбай батыра", "ЦОН", "Центральный рынок"],
    "Жаркент": ["Центральный рынок", "Автовокзал", "ул. Головацкого", "ЦОН", "Парк Жаркент"],
    "Арыс": ["ЖД вокзал", "Центральный рынок", "ул. Абая", "Автовокзал", "ЦОН"],
    "Шу": ["ЖД вокзал", "Центральный рынок", "ул. Сатпаева", "Автовокзал", "ЦОН"],
    "Сатпаев": ["Центральный рынок", "Автовокзал", "пр. Независимости", "ЦОН", "Площадь"],
    "Степногорск": ["Центральный рынок", "Автовокзал", "1 микрорайон", "ЦОН", "ТЦ Казахстан"],
    "Риддер": ["Центральный рынок", "Автовокзал", "ул. Гагарина", "ЦОН", "Парк"]
  };
  const ORDER_ADDRESS_COORDINATES = {
    "Алматы": {
      "Mega Alma-Ata": { lat: 43.202429, lng: 76.892772 },
      "Арбат, Жибек Жолы": { lat: 43.262196, lng: 76.945774 },
      "Абая - Байтурсынова": { lat: 43.238208, lng: 76.928831 },
      "Dostyk Plaza": { lat: 43.233221, lng: 76.955820 },
      "Сайран автовокзал": { lat: 43.240985, lng: 76.867971 }
    },
    "Астана": {
      "Хан Шатыр": { lat: 51.132243, lng: 71.403451 },
      "Байтерек": { lat: 51.128276, lng: 71.430610 },
      "MEGA Silk Way": { lat: 51.090498, lng: 71.403882 },
      "Вокзал Нурлы Жол": { lat: 51.149716, lng: 71.422302 },
      "Триумф Астаны": { lat: 51.140215, lng: 71.429119 }
    },
    "Нур-Султан": {
      "Хан Шатыр": { lat: 51.132243, lng: 71.403451 },
      "Байтерек": { lat: 51.128276, lng: 71.430610 },
      "MEGA Silk Way": { lat: 51.090498, lng: 71.403882 },
      "Вокзал Нурлы Жол": { lat: 51.149716, lng: 71.422302 },
      "Триумф Астаны": { lat: 51.140215, lng: 71.429119 }
    },
    "Кокшетау": {
      "ул. Абая, 138": { lat: 53.287020, lng: 69.397950 },
      "ул. Ауэзова, 230": { lat: 53.284700, lng: 69.401850 },
      "Центральный рынок": { lat: 53.283489, lng: 69.388104 },
      "ТЦ Rio": { lat: 53.282014, lng: 69.395480 },
      "Абылай хана, центр": { lat: 53.286094, lng: 69.404153 },
      "Автовокзал": { lat: 53.287881, lng: 69.378219 },
      "Набережная Копы": { lat: 53.297528, lng: 69.385620 }
    },
    "Шымкент": {
      "Shymkent Plaza": { lat: 42.318318, lng: 69.591084 },
      "Арбат Шымкент": { lat: 42.317530, lng: 69.595425 },
      "Центральный парк": { lat: 42.314411, lng: 69.588603 },
      "Автовокзал Самал": { lat: 42.296962, lng: 69.599226 },
      "Mega Planet": { lat: 42.339615, lng: 69.596377 }
    },
    "Актау": {
      "Актау Молл": { lat: 43.652872, lng: 51.152183 },
      "Набережная 15 мкр": { lat: 43.660115, lng: 51.159448 },
      "ТРК Актау": { lat: 43.650428, lng: 51.171052 },
      "Автовокзал": { lat: 43.642258, lng: 51.174385 },
      "Площадь Ынтымак": { lat: 43.652069, lng: 51.160770 }
    },
    "Уральск": {
      "City Center": { lat: 51.230762, lng: 51.368561 },
      "Центральный рынок": { lat: 51.226091, lng: 51.373221 },
      "Парк Кирова": { lat: 51.230148, lng: 51.360311 },
      "ЖД вокзал": { lat: 51.209154, lng: 51.385676 },
      "ТРЦ Галактика": { lat: 51.234609, lng: 51.377283 }
    },
    "Актобе": {
      "Keruen City": { lat: 50.291241, lng: 57.151856 },
      "Центральный стадион": { lat: 50.282990, lng: 57.172094 },
      "Автовокзал Сапар": { lat: 50.270842, lng: 57.215340 },
      "Парк Первого Президента": { lat: 50.299247, lng: 57.157747 },
      "Mega Aktobe": { lat: 50.296781, lng: 57.154241 }
    },
    "Караганда": {
      "City Mall": { lat: 49.803658, lng: 73.087081 },
      "ЦУМ": { lat: 49.806424, lng: 73.102498 },
      "Автовокзал": { lat: 49.799508, lng: 73.095635 },
      "Таир": { lat: 49.807781, lng: 73.125892 },
      "Парк Победы": { lat: 49.819260, lng: 73.094614 }
    },
    "Семей": {
      "Центральный рынок": { lat: 50.414620, lng: 80.249680 },
      "Арбат Семей": { lat: 50.411096, lng: 80.227146 },
      "ЖД вокзал": { lat: 50.397939, lng: 80.255175 },
      "ТЦ Казына": { lat: 50.412225, lng: 80.234720 },
      "Парк Абая": { lat: 50.414025, lng: 80.223903 }
    },
    "Павлодар": {
      "Batyr Mall": { lat: 52.301530, lng: 76.953703 },
      "Набережная": { lat: 52.287265, lng: 76.973437 },
      "ЖД вокзал": { lat: 52.271714, lng: 76.940843 },
      "ЦУМ Павлодар": { lat: 52.284938, lng: 76.967198 },
      "Greenwich": { lat: 52.290667, lng: 76.950582 }
    }
  };
  const ORDER_SERVICE_OPTIONS = ["Курьерская доставка", "Документы", "Покупка в магазине", "Личные вещи", "Посылка", "Цветы и подарок"];
  const ORDER_TIME_OPTIONS = ["Как можно скорее", "В течение часа", "Сегодня до вечера", "Сегодня к точному времени", "Завтра утром"];
  const CITY_COORDINATES = {
    "Астана": { lat: 51.128207, lng: 71.430420 },
    "Алматы": { lat: 43.238949, lng: 76.889709 },
    "Нур-Султан": { lat: 51.128207, lng: 71.430420 },
    "Кокшетау": { lat: 53.287338, lng: 69.404587 },
    "Шымкент": { lat: 42.341686, lng: 69.590101 },
    "Актау": { lat: 43.653205, lng: 51.197497 },
    "Уральск": { lat: 51.227821, lng: 51.386543 },
    "Актобе": { lat: 50.283933, lng: 57.166978 },
    "Атырау": { lat: 47.094495, lng: 51.923837 },
    "Караганда": { lat: 49.806015, lng: 73.085274 },
    "Конаев": { lat: 43.866821, lng: 77.063391 },
    "Костанай": { lat: 53.214580, lng: 63.624630 },
    "Кызылорда": { lat: 44.848830, lng: 65.482268 },
    "Петропавловск": { lat: 54.872791, lng: 69.143006 },
    "Семей": { lat: 50.411424, lng: 80.227853 },
    "Павлодар": { lat: 52.287054, lng: 76.967396 },
    "Талдыкорган": { lat: 45.015556, lng: 78.373889 },
    "Тараз": { lat: 42.900393, lng: 71.364512 },
    "Туркестан": { lat: 43.297333, lng: 68.251750 },
    "Усть-Каменогорск": { lat: 49.948333, lng: 82.627500 },
    "Жезказган": { lat: 47.803611, lng: 67.714444 },
    "Рудный": { lat: 52.972900, lng: 63.116800 },
    "Экибастуз": { lat: 51.723710, lng: 75.322870 },
    "Темиртау": { lat: 50.054940, lng: 72.959470 },
    "Кентау": { lat: 43.516720, lng: 68.510830 },
    "Жанаозен": { lat: 43.341160, lng: 52.861920 },
    "Каскелен": { lat: 43.200350, lng: 76.635000 },
    "Щучинск": { lat: 52.938500, lng: 70.186200 },
    "Байконыр": { lat: 45.616670, lng: 63.316670 },
    "Аркалык": { lat: 50.249150, lng: 66.920270 },
    "Балхаш": { lat: 46.848060, lng: 74.995000 },
    "Жаркент": { lat: 44.162780, lng: 80.001110 },
    "Арыс": { lat: 42.429170, lng: 68.803060 },
    "Шу": { lat: 43.598330, lng: 73.761390 },
    "Сатпаев": { lat: 47.902220, lng: 67.537780 },
    "Степногорск": { lat: 52.350620, lng: 71.881610 },
    "Риддер": { lat: 50.344130, lng: 83.512870 }
  };
  const PROMO_CODE_LIBRARY = {
    START500: { amount: 500, label: "Стартовый бонус" },
    BONUS1000: { amount: 1000, label: "Бонус на баланс" },
    EXPRESS300: { amount: 300, label: "Express бонус" }
  };
  const MAPS_CONFIG = {
    yandexApiKey: String(window.APP_MAPS_CONFIG?.yandexApiKey || "").trim(),
    yandexSuggestApiKey: String(window.APP_MAPS_CONFIG?.yandexSuggestApiKey || "").trim(),
    yandexLang: String(window.APP_MAPS_CONFIG?.yandexLang || "ru_RU").trim() || "ru_RU"
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
  const addressGeoCache = new Map();
  let activePromoStories = PROMO_STORIES.slice();
  let activePromoCodeLibrary = { ...PROMO_CODE_LIBRARY };
  const ORDER_STAGE_META = {
    new: { title: "Новый", text: "Заказ создан и ждет исполнителя." },
    accepted: { title: "Принят", text: "Исполнитель подтвердил заказ." },
    to_pickup: { title: "Едет к точке A", text: "Исполнитель направляется к точке отправления." },
    picked_up: { title: "Забрал заказ", text: "Точка A пройдена, заказ на руках у исполнителя." },
    to_dropoff: { title: "Едет к точке B", text: "Исполнитель движется к точке назначения." },
    delivered: { title: "Доставлено", text: "Маршрут завершен, можно подтверждать и оставлять отзыв." }
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
      session: { isLoggedIn: false, step: "onboard", mode: "register", pending: null },
      ui: {
        tab: "home",
        homeFilter: "available",
        search: "",
        modal: null,
        selectedCity: "Алматы",
        cityMenuOpen: false,
        createOrderCity: "Алматы",
        createOrderFromAddress: "",
        createOrderToAddress: "",
        addressSuggestionsFrom: [],
        addressSuggestionsTo: [],
        activeAddressField: "",
        createOrderPhotoPreview: "",
        promoViewerOpen: false,
        promoIndex: 0
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
      createOrderFromAddress: state.ui?.createOrderFromAddress || "",
      createOrderToAddress: state.ui?.createOrderToAddress || "",
      addressSuggestionsFrom: Array.isArray(state.ui?.addressSuggestionsFrom) ? state.ui.addressSuggestionsFrom : [],
      addressSuggestionsTo: Array.isArray(state.ui?.addressSuggestionsTo) ? state.ui.addressSuggestionsTo : [],
      activeAddressField: "",
      createOrderPhotoPreview: state.ui?.createOrderPhotoPreview || "",
      promoViewerOpen: false,
      promoIndex: 0
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
        createdAt: state.account.createdAt || new Date().toISOString(),
        updatedAt: state.account.updatedAt || new Date().toISOString()
      };
    }

    // Экземпляры карт не сериализуем в localStorage
    state.map = null;
    state.detailMap = null;

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
      map: null,
      detailMap: null
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
            createdAt: stateToSave.account.createdAt,
            updatedAt: stateToSave.account.updatedAt
          } : null,
          orders: [],
          notifications: [],
          map: null,
          detailMap: null
        }));
      } catch (fallbackError) {
        console.warn("Не удалось сохранить даже облегчённое состояние:", fallbackError);
      }
    }
  }

  function normalizeOrder(order = {}) {
    return {
      ...order,
      id: String(order.id || ""),
      city: order.city || state.account?.city || state.ui.selectedCity || "Алматы",
      fromAddress: order.fromAddress || order.pickupAddress || getCityCenterLabel(order.city || state.account?.city || "Алматы"),
      toAddress: order.toAddress || order.address || order.dropoffAddress || "",
      address: order.toAddress || order.address || order.dropoffAddress || "",
      status: order.status || "open",
      stage: order.stage || (order.status === "done" ? "delivered" : order.status === "assigned" ? "accepted" : "new"),
      budget: Number(order.budget ?? 0),
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
      addNotification(title, body);
      persist();
      render();
    }
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

  function getPromoSummary() {
    const history = Array.isArray(state.account?.promoHistory) ? state.account.promoHistory : [];
    return {
      usedCount: history.length,
      totalAmount: history.reduce((sum, item) => sum + Number(item.amount || 0), 0)
    };
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

  function getOrderStageMeta(stage) {
    return ORDER_STAGE_META[stage] || ORDER_STAGE_META.new;
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

  async function searchAddressSuggestions(city, query) {
    const cleanQuery = String(query || "").trim();
    if (cleanQuery.length < 3) {
      return [];
    }

    const localMatches = getPresetAddresses(city).filter((item) =>
      item.toLowerCase().includes(cleanQuery.toLowerCase())
    );

    if (!hasYandexSuggestKey() || window.location.protocol === "file:") {
      return localMatches.slice(0, 6);
    }

    try {
      const ymaps = await ensureYandexMaps();
      if (typeof ymaps.suggest !== "function") {
        return localMatches.slice(0, 6);
      }

      const bounds = getCityBounds(city);
      const results = await ymaps.suggest(`${cleanQuery}, ${city}`, {
        boundedBy: bounds,
        results: 5,
        provider: "yandex#map"
      });

      const remoteMatches = Array.isArray(results)
        ? results.map((item) => {
            const value = String(item.value || item.displayName || "").trim();
            const title = String(item.displayName || "").trim();
            const label = value || title;
            const cityTail = new RegExp(`,?\\s*${escapeRegExp(city)}$`, "i");
            return label
              .replace(/,?\s*Казахстан$/i, "")
              .replace(cityTail, "")
              .trim();
          }).filter(Boolean)
        : [];

      return Array.from(new Set([...localMatches, ...remoteMatches])).slice(0, 6);
    } catch (error) {
      yandexSuggestBlocked = true;
      console.warn("Не удалось загрузить адресные подсказки через Яндекс:", error);
      return localMatches.slice(0, 6);
    }
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
    destroyMapInstances();
    root.innerHTML = `
      <div class="app-shell">
        ${state.session.isLoggedIn ? renderAppHeader() : renderGuestHeader()}
        <main class="shell-content">
          ${state.session.isLoggedIn ? renderLoggedInView() : renderAuthView()}
        </main>
        ${state.session.isLoggedIn ? renderBottomNav() : ""}
      </div>
      ${renderModal()}
      ${renderPromoStoryViewer()}
    `;

    if (state.session.isLoggedIn && state.ui.tab === "map") {
      initMap();
    }

    // Инициализируем карту маршрута если открыта модаль "detail"
    if (state.ui.modal && state.ui.modal.type === "detail" && state.ui.modal.orderId) {
      const order = getOrderById(state.ui.modal.orderId);
      if (order) {
        initDetailMapRoute(order);
      }
    }

    if (hasPromoViewer) {
      schedulePromoStoryTimer();
    } else {
      clearPromoStoryTimer();
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
          </div>

          <div class="onboard-hero-panel">
            <div class="onboard-copy-stack">
              <div class="onboard-copy">
                <p class="eyebrow">TRAINTUP</p>
                <h1 class="onboard-title">Быстрые заказы рядом <span>с вами</span></h1>
                <p class="onboard-subtitle">Открывайте срочные поручения, выбирайте удобный маршрут и работайте без лишнего шума.</p>
              </div>
              <div class="onboard-feature-row">
                <span class="onboard-feature-chip">Заказы по городу</span>
                <span class="onboard-feature-chip">Отклики в реальном времени</span>
                <span class="onboard-feature-chip">Понятный трекинг</span>
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
      <section class="screen stack role-screen">
        <div class="role-screen-shell">
          <div class="role-screen-head">
            <button class="back-button" data-action="go-step" data-step="onboard" aria-label="Назад">${ICONS.chevron}</button>
            <div class="section-copy"><p class="eyebrow">02 Выбор роли</p><h2 class="section-title">Кем вы будете?</h2><span class="helper">Выберите подходящую роль, чтобы мы сразу открыли правильный сценарий внутри сервиса.</span></div>
          </div>
          <article class="role-intro-card">
            <strong>Выберите подходящую роль</strong>
            <span>Позже ее можно будет поменять в профиле без потери данных.</span>
          </article>
          <div class="role-choice-list">
            <article class="role-choice-card ${role === "executor" ? "active" : ""}">
              <button class="role-choice-card-hit" type="button" data-action="pick-role" data-role="executor" aria-label="Выбрать роль Исполнитель"></button>
              <div class="role-choice-preview executor">
                <div class="role-choice-preview-badge">Исполнитель</div>
                <div class="role-choice-preview-figure executor"></div>
              </div>
              <div class="role-choice-content">
                <div class="role-choice-top">
                  <span class="role-choice-media executor">A</span>
                  <span class="role-choice-copy">
                    <strong>Исполнитель</strong>
                    <span>Хочу временно подработать</span>
                  </span>
                </div>
                <ul class="role-choice-benefits">
                  <li>Выбирайте заказы рядом</li>
                  <li>Гибкий график</li>
                  <li>Получайте оплату сразу</li>
                </ul>
                <button class="btn ${role === "executor" ? "btn-primary" : "btn-ghost"} btn-block role-select-btn" type="button" data-action="pick-role" data-role="executor">${role === "executor" ? "Выбрано" : "Выбрать"}</button>
              </div>
            </article>
            <article class="role-choice-card ${role === "customer" ? "active" : ""}">
              <button class="role-choice-card-hit" type="button" data-action="pick-role" data-role="customer" aria-label="Выбрать роль Заказчик"></button>
              <div class="role-choice-preview customer">
                <div class="role-choice-preview-badge">Заказчик</div>
                <div class="role-choice-preview-figure customer"></div>
              </div>
              <div class="role-choice-content">
                <div class="role-choice-top">
                  <span class="role-choice-media customer">B</span>
                  <span class="role-choice-copy">
                    <strong>Заказчик</strong>
                    <span>Размещаю заказы, ищу исполнителей</span>
                  </span>
                </div>
                <ul class="role-choice-benefits">
                  <li>Рейтинги и отзывы исполнителей</li>
                  <li>Быстрый отклик</li>
                  <li>Оплата после выполнения</li>
                </ul>
                <button class="btn ${role === "customer" ? "btn-primary" : "btn-ghost"} btn-block role-select-btn" type="button" data-action="pick-role" data-role="customer">${role === "customer" ? "Выбрано" : "Выбрать"}</button>
              </div>
            </article>
          </div>
          <button class="btn btn-primary btn-block role-continue-btn" type="button" data-action="continue-role">Продолжить</button>
        </div>
      </section>
    `;
  }

  function renderRegisterStep() {
    const mode = state.session.mode;
    const role = getPendingRole();
    return `
      <section class="screen stack auth-flow-screen">
        <div class="auth-step-shell">
          <div class="section-head auth-step-head">
            <button class="back-button" data-action="go-step" data-step="role" aria-label="Назад">${ICONS.chevron}</button>
            <div class="section-copy"><p class="eyebrow">03 ${mode === "register" ? "Регистрация" : "Вход"}</p><h2 class="section-title">${mode === "register" ? "Создание аккаунта" : "Вход в аккаунт"}</h2><span class="helper">Введите телефон и пароль. Для демо подтверждение идет кодом 1234.</span></div>
          </div>
          <div class="mode-switch" role="tablist" aria-label="Режим авторизации">
            <button type="button" class="${mode === "register" ? "active" : ""}" data-action="set-auth-mode" data-mode="register">Регистрация</button>
            <button type="button" class="${mode === "login" ? "active" : ""}" data-action="set-auth-mode" data-mode="login">Вход</button>
          </div>
          <form class="form" data-form="auth">
            <article class="auth-step-card">
              <div class="auth-step-copy">
                <strong>${mode === "register" ? "Аккаунт создается за пару шагов" : "С возвращением"}</strong>
                <span>${mode === "register" ? `Роль: ${getRoleLabel(role)}` : "Если аккаунт уже есть, подтверждение повторно не понадобится."}</span>
              </div>
              ${mode === "register" && role === "executor" ? `
              <div class="field">
                <span class="field-title">Способ доставки</span>
                <div class="radio-group auth-radio-group">
                  <label class="radio-item">
                    <input type="radio" name="delivery_type" value="foot" ${!state.session.pending?.delivery_type || state.session.pending?.delivery_type === "foot" ? "checked" : ""}>
                    <span>Пешком</span>
                  </label>
                  <label class="radio-item">
                    <input type="radio" name="delivery_type" value="bike" ${state.session.pending?.delivery_type === "bike" ? "checked" : ""}>
                    <span>Велосипед</span>
                  </label>
                  <label class="radio-item">
                    <input type="radio" name="delivery_type" value="car" ${state.session.pending?.delivery_type === "car" ? "checked" : ""}>
                    <span>Машина</span>
                  </label>
                </div>
              </div>
              ` : ""}
              <div class="field"><span class="field-title">Телефон</span><input type="tel" name="phone" placeholder="+7 777 123 45 67" value="${escapeHtml(state.session.pending?.phone || state.account?.phone || "")}" required></div>
              <div class="field"><span class="field-title">Пароль</span><input type="password" name="password" placeholder="Минимум 4 символа" value="${escapeHtml(state.session.pending?.password || "")}" required></div>
              <p class="form-hint">${mode === "register" ? "Сразу после этого откроется экран подтверждения телефона." : "Введите те же данные, с которыми регистрировались."}</p>
              <button class="btn btn-primary btn-block" type="submit">${mode === "register" ? "Продолжить" : "Войти"}</button>
            </article>
          </form>
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
            <button class="back-button" data-action="go-step" data-step="register" aria-label="Назад">${ICONS.chevron}</button>
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
      case "notifications": return renderNotificationsView();
      case "profile": return renderProfileView();
      default: return renderHomeView();
    }
  }

  function getPresetAddresses(city) {
    const cityName = String(city || "Алматы").trim() || "Алматы";
    const baseList = ORDER_ADDRESS_OPTIONS[cityName] || ORDER_ADDRESS_OPTIONS["Алматы"] || [];
    const generated = DEFAULT_CITY_ADDRESS_TEMPLATES.map((item) => {
      if (/рынок|вокзал|парк|цон/i.test(item)) {
        return `${item}, ${cityName}`;
      }
      return `${item}, ${cityName}`;
    });
    return Array.from(new Set([...baseList, ...generated]));
  }

  function restoreNamedInputFocus(name, value = "") {
    requestAnimationFrame(() => {
      const restored = root.querySelector(`[name="${name}"]`);
      if (!restored) return;
      restored.focus();
      const caret = Math.min(String(value || "").length, restored.value.length);
      if (typeof restored.setSelectionRange === "function") {
        restored.setSelectionRange(caret, caret);
      }
    });
  }

  function renderAddressAutocomplete({ name, fieldKey, title, value, suggestions, placeholder }) {
    const isActive = state.ui.activeAddressField === fieldKey;
    const uniqueSuggestions = Array.from(new Set((suggestions || []).filter(Boolean))).slice(0, 6);
    const pinClass = fieldKey === "from" ? "pickup" : "dropoff";
    const showSuggestions = isActive && (String(value || "").trim().length >= 3 || uniqueSuggestions.length);

    return `
      <div class="address-autocomplete ${isActive ? "open" : ""}">
        <div class="address-input-shell">
          <span class="address-point-badge ${pinClass}" aria-hidden="true"></span>
          <div class="address-input-copy">
            <input
              type="text"
              name="${name}"
              value="${escapeHtml(value)}"
              placeholder="${escapeHtml(placeholder)}"
              autocomplete="off"
              data-address-field="${fieldKey}"
            >
          </div>
        </div>
        ${showSuggestions ? `
          <div class="address-suggestions" role="listbox">
            ${uniqueSuggestions.length ? uniqueSuggestions.map((address) => `
              <button
                class="address-suggestion"
                type="button"
                data-action="select-address-suggestion"
                data-field="${fieldKey}"
                data-value="${escapeHtml(address)}"
              >
                <span class="address-suggestion-marker">${fieldKey === "from" ? "A" : "B"}</span>
                <span class="address-suggestion-copy">
                  <strong>${escapeHtml(address)}</strong>
                  <small>${escapeHtml(state.ui.createOrderCity || state.account?.city || "Алматы")}</small>
                </span>
              </button>
            `).join("") : `
              <div class="address-suggestion-empty">
                <strong>Ничего не найдено</strong>
                <small>Введите улицу и дом, чтобы найти точный адрес.</small>
              </div>
            `}
          </div>
        ` : ""}
      </div>
    `;
  }

  function renderHomeView() {
    if (state.account.role === "executor" && !state.account.isOnline) {
      return `
        <section class="view stack home-screen">
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
    
    const orders = getVisibleOrders();
    const labels = state.account.role === "executor" ? { available: "Доступные", work: "В работе", done: "Завершенные" } : { available: "Активные", work: "В работе", done: "Завершенные" };
    
    return `
      <section class="view stack home-screen">
        <div class="home-banner home-panel">
          <div class="banner-content">
            <div class="banner-top">
              <p class="banner-label">${state.account.role === "executor" ? "Исполнитель" : "Заказчик"}</p>
              ${state.account.role === "executor" ? `<button class="btn btn-sm btn-ghost" data-action="deactivate-online">Отдыхаю</button>` : ""}
            </div>
            <h1 class="banner-title">${state.account.role === "executor" ? "Заказы рядом с вами" : "Управляйте заказами"}</h1>
            <p class="banner-subtitle">${state.account.role === "executor" ? "Смотрите новые поручения, быстро открывайте детали и забирайте подходящие задачи." : "Следите за откликами, исполнителем и прогрессом заказа в одной ленте."}</p>
            <div class="home-banner-stats">
              <div class="home-banner-stat">
                <span>Город</span>
                <strong>${escapeHtml(state.ui.selectedCity)}</strong>
              </div>
              <div class="home-banner-stat">
                <span>В ленте</span>
                <strong>${orders.length}</strong>
              </div>
            </div>
          </div>
        </div>

        <div class="search-section">
          <label class="search-box"><span class="inline-icon">${ICONS.search}</span><input type="search" name="search" placeholder="Найти задачу или адрес" value="${escapeHtml(state.ui.search)}"></label>
        </div>

        <div class="filters-section">
          <div class="filter-label">Показывать</div>
          <div class="filter-chips">
            ${Object.entries(labels).map(([key, label]) => `<button class="chip ${state.ui.homeFilter === key ? "chip-active" : ""}" data-action="set-filter" data-filter="${key}">${escapeHtml(label)}</button>`).join("")}
          </div>
        </div>

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
    const suggestionFrom = Array.isArray(state.ui.addressSuggestionsFrom) ? state.ui.addressSuggestionsFrom : [];
    const suggestionTo = Array.isArray(state.ui.addressSuggestionsTo) ? state.ui.addressSuggestionsTo : [];
    const selectedFromAddress = state.ui.createOrderFromAddress || "";
    const selectedToAddress = state.ui.createOrderToAddress || "";
    const photoPreview = state.ui.createOrderPhotoPreview;
    return `
      <section class="view stack">
        <div class="section-copy"><p class="eyebrow">Создание заказа</p><h2 class="section-title">Новое задание</h2><span class="helper">Заполните маршрут и коротко опишите, что нужно сделать.</span></div>
        <form class="form" data-form="create-order">
          <article class="card stack create-order-card">
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

            <div class="field">
              <span class="field-title">Город</span>
              <select name="order_city">
                ${ORDER_CITY_OPTIONS.map((city) => `<option value="${escapeHtml(city)}" ${selectedCity === city ? "selected" : ""}>${escapeHtml(city)}</option>`).join("")}
              </select>
            </div>

            <div class="field">
              <span class="field-title">Маршрут</span>
              <div class="route-address-card">
                <div class="route-address-divider" aria-hidden="true"></div>
                ${renderAddressAutocomplete({
                  name: "order_from_address",
                  fieldKey: "from",
                  title: "Ваш адрес",
                  value: selectedFromAddress,
                  suggestions: suggestionFrom,
                  placeholder: "Укажите ваш адрес..."
                })}
                ${renderAddressAutocomplete({
                  name: "order_to_address",
                  fieldKey: "to",
                  title: "Адрес получателя",
                  value: selectedToAddress,
                  suggestions: suggestionTo,
                  placeholder: "Адрес получателя..."
                })}
              </div>
            </div>

            <div class="field">
              <span class="field-title">Бюджет</span>
              <input type="number" name="budget" min="500" step="100" placeholder="2000" required>
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
    const promoSummary = getPromoSummary();
    const promoHistory = Array.isArray(state.account.promoHistory) ? state.account.promoHistory.slice(0, 3) : [];
    return `
      <section class="view stack profile-main">
        <article class="profile-hero">
          <div class="profile-hero-content">
            <div class="profile-avatar-large">${renderAvatar(state.account.avatar, state.account.name, 80)}</div>
            <div class="profile-hero-info">
              <h1 class="profile-hero-name">${escapeHtml(state.account.name)}</h1>
              <p class="profile-hero-role">${escapeHtml(getRoleLabel(state.account.role))}</p>
              <p class="profile-hero-id">ID: ${escapeHtml(formatAccountId(state.account.id))}</p>
              <span class="profile-verification-badge ${escapeHtml(state.account.verificationStatus)}">${escapeHtml(verificationMap[state.account.verificationStatus] || verificationMap.none)}</span>
              ${state.account.about ? `<p class="profile-hero-about">${escapeHtml(state.account.about)}</p>` : '<p class="profile-hero-about">Добавьте короткое описание, чтобы профиль выглядел живее и понятнее.</p>'}
            </div>
          </div>
          <div class="profile-actions-top">
            <button class="btn btn-primary" data-action="open-edit-profile">Изменить профиль</button>
            <button class="btn btn-secondary" data-action="open-verification">Верификация</button>
          </div>
        </article>

        <div class="stats-row">
          <article class="stat-card">
            <span class="stat-label">Заказов выполнено</span>
            <strong class="stat-value">${state.account.jobsDone}</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Рейтинг</span>
            <strong class="stat-value">${Number(state.account.rating || 0).toFixed(1)}⭐</strong>
          </article>
          <article class="stat-card">
            <span class="stat-label">Отклики</span>
            <strong class="stat-value">${state.notifications.length}</strong>
          </article>
        </div>

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

        <article class="profile-promo-card">
          <div class="wallet-header">
            <div>
              <h2 class="section-title">Промокоды</h2>
              <p class="promo-helper">Активируйте код и получите бонус на баланс.</p>
            </div>
          </div>
          <form class="promo-form" data-form="promo-code">
            <input type="text" name="promo_code" placeholder="Введите промокод" autocomplete="off">
            <button class="btn btn-primary btn-sm" type="submit">Активировать</button>
          </form>
          <div class="promo-demo-codes">
            ${Object.entries(getPromoCodeLibrary()).map(([code, promo]) => `<span class="promo-demo-chip">${escapeHtml(code)} • +${formatMoney(promo.amount)}</span>`).join("")}
          </div>
          <div class="wallet-grid-2">
            <div class="wallet-item">
              <span class="wallet-label">Активировано</span>
              <strong class="wallet-value">${promoSummary.usedCount}</strong>
            </div>
            <div class="wallet-item">
              <span class="wallet-label">Получено</span>
              <strong class="wallet-value">${formatMoney(promoSummary.totalAmount)}</strong>
            </div>
          </div>
          <div class="promo-history">
            ${promoHistory.length ? promoHistory.map((item) => `
              <div class="promo-history-item">
                <div>
                  <strong>${escapeHtml(item.code)}</strong>
                  <span>${escapeHtml(item.label || "Промобонус")}</span>
                </div>
                <div class="promo-history-amount">+${formatMoney(item.amount)}</div>
              </div>
            `).join("") : `<p class="helper">Пока ни один промокод не активирован.</p>`}
          </div>
        </article>

        <article class="profile-options">
          <h3 class="section-title">Опции</h3>
          <button class="option-item" data-action="switch-role">
            <span class="option-icon">Роль</span>
            <div class="option-content">
              <span class="option-title">Сменить роль</span>
              <span class="option-desc">Переключитесь между исполнителем и заказчиком</span>
            </div>
          </button>
          <button class="option-item" data-action="open-settings">
            <span class="option-icon">App</span>
            <div class="option-content">
              <span class="option-title">Настройки приложения</span>
              <span class="option-desc">Язык, тема, уведомления</span>
            </div>
          </button>
          <button class="option-item" data-action="logout">
            <span class="option-icon">Exit</span>
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
              <span class="meta-label">📍 Маршрут</span>
              <span class="meta-value">${escapeHtml(order.fromAddress || getCityCenterLabel(order.city))} → ${escapeHtml(order.toAddress || order.address)}</span>
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
          <div class="detail-stat"><span class="detail-label">Точка A</span><strong class="detail-value">${escapeHtml(order.fromAddress || getCityCenterLabel(order.city))}</strong></div>
          <div class="detail-stat"><span class="detail-label">Точка B</span><strong class="detail-value">${escapeHtml(order.toAddress || order.address)}</strong></div>
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
    const stageMeta = getOrderStageMeta(order.stage);
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
    const canReview = order.status === "done" && !order.reviewedBy.includes(state.account.id);
    if (canReview) return `<button class="btn btn-primary btn-block" data-action="open-review" data-order-id="${order.id}">Оставить отзыв</button>`;
    if (order.status === "done") return '<button class="btn btn-success btn-block" type="button">Завершено</button>';
    if (isOwner && order.status === "assigned") return `<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="${order.id}">Завершить заказ</button>`;
    if (isAssignee && order.status === "assigned") {
      if (order.stage !== "delivered") {
        return `<button class="btn btn-primary btn-block" data-action="advance-stage" data-order-id="${order.id}">Следующий этап: ${escapeHtml(getOrderStageMeta(getNextOrderStage(order.stage)).title)}</button>`;
      }
      return `<button class="btn btn-primary btn-block" data-action="complete-order" data-order-id="${order.id}">Подтвердить выполнение</button>`;
    }
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
    const promoSummary = getPromoSummary();
    return `
      <div class="stack">
        <div class="stats-grid"><div class="summary-card"><span class="summary-label">Текущий баланс</span><strong class="summary-value">${formatMoney(state.account.balance)}</strong></div><div class="summary-card"><span class="summary-label">Комиссия</span><strong class="summary-value">${formatMoney(state.account.debt)}</strong></div></div>
        <div class="stats-grid"><div class="summary-card"><span class="summary-label">Промокодов активировано</span><strong class="summary-value">${promoSummary.usedCount}</strong></div><div class="summary-card"><span class="summary-label">Получено бонусов</span><strong class="summary-value">${formatMoney(promoSummary.totalAmount)}</strong></div></div>
        <article class="status-card ${state.account.debt > 0 ? "warning" : "success"}"><div class="stack"><strong>${state.account.debt > 0 ? "Комиссия ожидает оплаты" : "Комиссия погашена"}</strong><p>${state.account.debt > 0 ? "Пока комиссия не погашена, следующий заказ взять нельзя." : "Можно брать следующие заказы без ограничений."}</p></div></article>
        <form class="form" data-form="promo-code"><article class="card stack"><div class="field"><span class="field-title">Промокод</span><input type="text" name="promo_code" placeholder="Например: START500"></div><button class="btn btn-secondary btn-block" type="submit">Активировать промокод</button></article></form>
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
      <div class="stack">
        <article class="status-card warning stack"><strong>Комиссия к оплате</strong><p>После завершения заказа комиссия автоматически добавлена в ваш долг.</p></article>
        <div class="stats-grid"><div class="summary-card"><span class="summary-label">Заказ</span><strong class="summary-value">${formatMoney(order.finalPrice || order.budget)}</strong></div><div class="summary-card"><span class="summary-label">Комиссия 10%</span><strong class="summary-value">${formatMoney(commission)}</strong></div></div>
        <button class="btn btn-warning btn-block" data-action="pay-debt">Оплатить сейчас</button>
        <button class="btn btn-ghost btn-block" data-action="open-wallet">Открыть кошелек</button>
      </div>
    `;
  }

  function renderReviewModal(order) {
    const targetName = order.ownerId === state.account.id ? order.assigneeName : order.ownerName;
    return `
      <form class="form" data-form="review" data-order-id="${order.id}">
        <article class="card stack">
          <div class="field">
            <span class="field-title">Кому отзыв</span>
            <input type="text" value="${escapeHtml(targetName || "Пользователь")}" disabled>
          </div>
          <div class="field">
            <span class="field-title">Оценка</span>
            <select name="rating" required>
              <option value="5">5 - Отлично</option>
              <option value="4">4 - Хорошо</option>
              <option value="3">3 - Нормально</option>
              <option value="2">2 - Плохо</option>
              <option value="1">1 - Очень плохо</option>
            </select>
          </div>
          <div class="field">
            <span class="field-title">Комментарий</span>
            <textarea name="comment" maxlength="250" placeholder="Коротко опишите опыт работы" required></textarea>
          </div>
        </article>
        <button class="btn btn-primary btn-block" type="submit">Отправить отзыв</button>
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
        const haystack = `${order.title} ${order.fromAddress || ""} ${order.toAddress || order.address} ${order.city} ${order.description}`.toLowerCase();
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
      const hadCityMenu = state.ui.cityMenuOpen;
      const hadAddressDropdown = Boolean(state.ui.activeAddressField);
      if (state.ui.cityMenuOpen && !event.target.closest(".city-dropdown")) {
        state.ui.cityMenuOpen = false;
      }
      if (state.ui.activeAddressField && !event.target.closest(".address-autocomplete")) {
        state.ui.activeAddressField = "";
      }
      if ((hadCityMenu && !state.ui.cityMenuOpen) || (hadAddressDropdown && !state.ui.activeAddressField)) {
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
    if (action === "select-address-suggestion") {
      const fieldKey = target.dataset.field === "from" ? "from" : "to";
      const value = String(target.dataset.value || "").trim();
      const city = state.ui.createOrderCity || state.account?.city || "Алматы";
      if (!value) return;
      if (fieldKey === "from") {
        state.ui.createOrderFromAddress = value;
        state.ui.addressSuggestionsFrom = [value, ...getPresetAddresses(city)];
      } else {
        state.ui.createOrderToAddress = value;
        state.ui.addressSuggestionsTo = [value, ...getPresetAddresses(city)];
      }
      state.ui.activeAddressField = "";
      persist();
      render();
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
      persist();
      render();
      return;
    }
    if (action === "continue-role") {
      state.session.pending = { ...(state.session.pending || {}), role: getPendingRole() };
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
      state.ui.modal = null;
      state.ui.cityMenuOpen = false;
      state.ui.activeAddressField = "";
      if (state.ui.tab === "notifications") {
        markAllNotificationsRead();
        return;
      }
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
      if (!ensureAccountAllowed("Создание заказа")) return;
      const service = String(data.get("service") || ORDER_SERVICE_OPTIONS[0]).trim();
      const city = String(data.get("order_city") || state.ui.createOrderCity || state.account.city || "Алматы").trim();
      const fromAddress = String(data.get("order_from_address") || state.ui.createOrderFromAddress || "").trim();
      const toAddress = String(data.get("order_to_address") || state.ui.createOrderToAddress || "").trim();
      const title = String(data.get("title") || "").trim();
      const when = "По договоренности";
      const description = String(data.get("description") || "").trim();
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

      if (!title || !fromAddress || !toAddress || !when || budget <= 0) {
        showToast("Заполните обязательные поля заказа");
        return;
      }
      const order = normalizeOrder({
        id: generateOrderId(),
        title,
        fromAddress,
        toAddress,
        address: toAddress,
        city,
        when,
        budget,
        payment,
        category: service || guessCategory(title),
        urgent: isExpress,
        express: isExpress,
        photo: orderPhoto,
        status: "open",
        stage: "new",
        description: description || "Описание будет уточнено в чате.",
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
      state.ui.addressSuggestionsFrom = [];
      state.ui.addressSuggestionsTo = [];
      state.ui.createOrderPhotoPreview = "";
      persist();
      render();
      bootstrapAccountOrders();
      showToast("Заказ опубликован");
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
      const bid = { id: generateId("BID"), userId: state.account.id, userName: state.account.name, price, note, createdAt: new Date().toISOString() };

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
        order.chat.push({ id: generateId("MSG"), senderId: state.account.id, senderName: state.account.name, role: "executor", text: note ? `Предлагаю ${formatMoney(price)}. ${note}` : `Предлагаю ${formatMoney(price)}.`, createdAt: new Date().toISOString() });
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
      
      persist();
      render();
      showToast("Предложение отправлено");
      return;
    }

    if (formName === "message") {
      if (!ensureAccountAllowed("Сообщение")) return;
      const order = getOrderById(form.dataset.orderId);
      if (!order) return;
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
      updateOwnOrdersMeta();
      saveCurrentAccount({
        name: "profile_updated",
        data: { accountId: state.account.id, name, city }
      });
      persist();
      render();
      showToast("Профиль сохранен");
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
      
      // Log to Firebase
      if (window.FirebaseService) {
        window.FirebaseService.logEvent('complaint_filed', {
          orderId: order.id,
          complaintId: complaint.id,
          reason: reason,
          amount: amount
        }).catch(err => console.error('Failed to log event:', err));
      }
      
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
      saveCurrentAccount({
        name: "profile_updated",
        data: { accountId: state.account.id, name, city }
      });
      
      persist();
      render();
      showToast("Профиль обновлен");
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
    if (input.name === "order_from_address" || input.name === "order_to_address") {
      const field = input.name === "order_from_address" ? "addressSuggestionsFrom" : "addressSuggestionsTo";
      const stateField = input.name === "order_from_address" ? "createOrderFromAddress" : "createOrderToAddress";
      const activeField = input.name === "order_from_address" ? "from" : "to";
      const city = state.ui.createOrderCity || state.account?.city || "Алматы";
      const value = String(input.value || "").trim();
      state.ui[stateField] = value;
      state.ui.activeAddressField = activeField;
      searchAddressSuggestions(city, value).then((items) => {
        if (state.ui[stateField] !== value) return;
        state.ui[field] = items;
        persist();
        render();
        restoreNamedInputFocus(input.name, value);
      });
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
      state.ui.addressSuggestionsFrom = [];
      state.ui.addressSuggestionsTo = [];
      state.ui.activeAddressField = "";
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

  function handleFocusIn(event) {
    const target = event.target;
    if (target.name !== "order_from_address" && target.name !== "order_to_address") {
      return;
    }

    const isFrom = target.name === "order_from_address";
    const stateField = isFrom ? "createOrderFromAddress" : "createOrderToAddress";
    const suggestionField = isFrom ? "addressSuggestionsFrom" : "addressSuggestionsTo";
    const activeField = isFrom ? "from" : "to";
    const value = String(target.value || state.ui[stateField] || "").trim();

    if (state.ui.activeAddressField === activeField) {
      state.ui[stateField] = value;
      return;
    }

    state.ui[stateField] = value;
    state.ui[suggestionField] = Array.isArray(state.ui[suggestionField]) ? state.ui[suggestionField] : [];
    state.ui.activeAddressField = activeField;
    persist();
    render();
    restoreNamedInputFocus(target.name, value);
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
    if (event.key === "Escape" && state.ui.activeAddressField) {
      state.ui.activeAddressField = "";
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
      name: pending.role === "customer" ? "Новый заказчик" : "Новый исполнитель",
      city: "Алматы",
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
          name: state.account.name
        });
        replaceOrderInState(result.order || order);
      } else {
        order.status = "assigned";
        order.stage = "accepted";
        order.assigneeId = state.account.id;
        order.assigneeName = state.account.name;
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
    state.ui.modal = { type: "detail", orderId: order.id };

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
      state.account.debt += calculateCommission(updatedOrder.finalPrice || updatedOrder.budget);
      state.account.jobsDone += 1;
      saveCurrentAccount();
      state.ui.modal = { type: "commission", orderId: updatedOrder.id };
    } else {
      state.ui.modal = { type: "detail", orderId: updatedOrder.id };
    }

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
      text: `Статус доставки обновлен: ${getOrderStageMeta(nextStage).title}.`,
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
        `${order.title}: ${getOrderStageMeta(nextStage).title}`,
        { type: "order_tracking", orderId: order.id }
      );
    }

    persist();
    render();
    showToast(`Этап: ${getOrderStageMeta(nextStage).title}`);
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
    state.ui.modal = { type: "detail", orderId: order.id };

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
    state.account.balance -= state.account.debt;
    state.account.debt = 0;
    state.orders = state.orders.map((order) => order.assigneeId === state.account.id && order.status === "done" ? { ...order, commissionSettled: true } : order);
    saveCurrentAccount({
      name: "debt_paid",
      data: { accountId: state.account.id }
    });
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
    if (window.FirebaseService) {
      return;
    }
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
  function hasYandexMapsKey() {
    return Boolean(MAPS_CONFIG.yandexApiKey) && !yandexMapsBlocked;
  }

  function getCityCenter(city) {
    return CITY_COORDINATES[city] || CITY_COORDINATES["Алматы"];
  }

  function getCityBounds(city) {
    const center = getCityCenter(city);
    return [
      [center.lat - 0.2, center.lng - 0.28],
      [center.lat + 0.2, center.lng + 0.28]
    ];
  }

  function getCityCenterLabel(city) {
    return `Центр ${city || "Алматы"}`;
  }

  function getAddressSeed(text) {
    return String(text || "").split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
  }

  function escapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  function getApproxOrderPoint(city, address) {
    const base = getCityCenter(city);
    const hash = getAddressSeed(`${city}:${address}`);
    const offsetLat = (seededRandom(hash) - 0.5) * 0.03;
    const offsetLng = (seededRandom(hash * 2) - 0.5) * 0.04;
    return {
      lat: base.lat + offsetLat,
      lng: base.lng + offsetLng
    };
  }

  function destroyMapInstance(instance) {
    if (!instance || typeof instance.destroy !== "function") return;
    try {
      instance.destroy();
    } catch (error) {
      console.warn("Не удалось корректно уничтожить экземпляр карты:", error);
    }
  }

  function destroyMapInstances() {
    destroyMapInstance(state.map);
    destroyMapInstance(state.detailMap);
    state.map = null;
    state.detailMap = null;
  }

  function setMapMessage(container, message, className = "route-map-loading") {
    if (!container) return;
    container.innerHTML = `<div class="${className}">${escapeHtml(message)}</div>`;
  }

  function getMapBootstrapMessage() {
    if (window.location.protocol === "file:") {
      return "Маршрут работает в локальном режиме. Для Яндекс Карт откройте проект через http://localhost.";
    }
    return hasYandexMapsKey()
      ? "Загружаем Яндекс Карты..."
      : "Добавьте корректный API key Яндекс Карт в `js/firebase-config.js`, чтобы включить карту и маршруты.";
  }

  function hasYandexSuggestKey() {
    return Boolean(MAPS_CONFIG.yandexSuggestApiKey || MAPS_CONFIG.yandexApiKey) && !yandexSuggestBlocked;
  }

  async function ensureYandexMaps() {
    if (window.ymaps?.Map) {
      return new Promise((resolve) => {
        window.ymaps.ready(() => resolve(window.ymaps));
      });
    }

    if (window.location.protocol === "file:") {
      throw new Error("yandex_file_origin_blocked");
    }

    if (!hasYandexMapsKey()) {
      throw new Error("yandex_api_key_missing");
    }

    if (!yandexMapsReadyPromise) {
      yandexMapsReadyPromise = new Promise((resolve, reject) => {
        const scriptId = "yandex-maps-api";
        let script = document.getElementById(scriptId);

        const handleReady = () => {
          if (!window.ymaps?.ready) {
            yandexMapsBlocked = true;
            reject(new Error("yandex_api_unavailable"));
            return;
          }
          window.ymaps.ready(() => resolve(window.ymaps));
        };

        if (!script) {
          script = document.createElement("script");
          script.id = scriptId;
          script.async = true;
          const scriptParams = new URLSearchParams({
            lang: MAPS_CONFIG.yandexLang,
            apikey: MAPS_CONFIG.yandexApiKey
          });
          if (hasYandexSuggestKey()) {
            scriptParams.set("suggest_apikey", MAPS_CONFIG.yandexSuggestApiKey || MAPS_CONFIG.yandexApiKey);
          }
          script.src = `https://api-maps.yandex.ru/2.1/?${scriptParams.toString()}`;
          script.addEventListener("load", handleReady, { once: true });
          script.addEventListener("error", () => {
            yandexMapsBlocked = true;
            reject(new Error("yandex_api_load_failed"));
          }, { once: true });
          document.head.appendChild(script);
          return;
        }

        if (window.ymaps?.Map) {
          handleReady();
          return;
        }

        script.addEventListener("load", handleReady, { once: true });
        script.addEventListener("error", () => {
          yandexMapsBlocked = true;
          reject(new Error("yandex_api_load_failed"));
        }, { once: true });
      });
    }

    return yandexMapsReadyPromise;
  }

  async function geocodeWithYandex(city, address) {
    const ymaps = await ensureYandexMaps();
    const result = await ymaps.geocode(`${address}, ${city}, Казахстан`, {
      results: 1,
      boundedBy: getCityBounds(city),
      strictBounds: false
    });
    const geoObject = result?.geoObjects?.get(0);
    const coords = geoObject?.geometry?.getCoordinates?.();
    if (Array.isArray(coords) && coords.length >= 2) {
      return {
        lat: Number(coords[0]),
        lng: Number(coords[1])
      };
    }
    return null;
  }

  async function resolveAddressCoordinates(city, address) {
    const cleanAddress = String(address || "").trim();
    if (!cleanAddress) {
      return getCityCenter(city);
    }

    const cacheKey = `${city}::${cleanAddress}`;
    if (addressGeoCache.has(cacheKey)) {
      return addressGeoCache.get(cacheKey);
    }

    if (cleanAddress === getCityCenterLabel(city)) {
      const centerPoint = getCityCenter(city);
      addressGeoCache.set(cacheKey, centerPoint);
      return centerPoint;
    }

    const presetPoint = ORDER_ADDRESS_COORDINATES[city]?.[cleanAddress];
    if (presetPoint) {
      addressGeoCache.set(cacheKey, presetPoint);
      return presetPoint;
    }

    const fallbackPoint = getApproxOrderPoint(city, cleanAddress);

    if (!hasYandexMapsKey()) {
      addressGeoCache.set(cacheKey, fallbackPoint);
      return fallbackPoint;
    }

    try {
      const coords = await geocodeWithYandex(city, cleanAddress);
      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        addressGeoCache.set(cacheKey, coords);
        return coords;
      }
    } catch (error) {
      console.warn("Не удалось геокодировать адрес через Яндекс Карты, используем fallback:", cleanAddress, error);
    }

    addressGeoCache.set(cacheKey, fallbackPoint);
    return fallbackPoint;
  }

  function getOrderStageProgress(stage) {
    const progressMap = {
      new: 0.02,
      accepted: 0.12,
      to_pickup: 0.28,
      picked_up: 0.48,
      to_dropoff: 0.76,
      delivered: 0.98
    };
    return progressMap[stage] ?? progressMap.new;
  }

  function getPointAtProgress(points, progress) {
    if (!Array.isArray(points) || !points.length) return null;
    if (points.length === 1) {
      const [lat, lng] = points[0];
      return { lat, lng };
    }

    const normalized = Math.min(1, Math.max(0, Number(progress) || 0));
    const segments = [];
    let totalDistance = 0;

    for (let index = 1; index < points.length; index += 1) {
      const start = points[index - 1];
      const end = points[index];
      const distance = Math.hypot(end[0] - start[0], end[1] - start[1]);
      segments.push({ start, end, distance });
      totalDistance += distance;
    }

    if (!totalDistance) {
      const [lat, lng] = points[0];
      return { lat, lng };
    }

    let passed = 0;
    const targetDistance = totalDistance * normalized;

    for (const segment of segments) {
      if (passed + segment.distance >= targetDistance) {
        const ratio = segment.distance ? (targetDistance - passed) / segment.distance : 0;
        return {
          lat: segment.start[0] + (segment.end[0] - segment.start[0]) * ratio,
          lng: segment.start[1] + (segment.end[1] - segment.start[1]) * ratio
        };
      }
      passed += segment.distance;
    }

    const [lat, lng] = points[points.length - 1];
    return { lat, lng };
  }

  function getDistanceKmBetween(startPoint, endPoint) {
    const dx = (endPoint.lng - startPoint.lng) * 111 * Math.cos(((startPoint.lat + endPoint.lat) / 2) * Math.PI / 180);
    const dy = (endPoint.lat - startPoint.lat) * 111;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function projectPointToMiniMap(point, city) {
    const center = getCityCenter(city);
    const dx = (point.lng - center.lng) * Math.cos(center.lat * Math.PI / 180);
    const dy = point.lat - center.lat;
    const x = 50 + dx * 1800;
    const y = 50 - dy * 1800;
    return {
      x: Math.max(10, Math.min(90, x)),
      y: Math.max(12, Math.min(88, y))
    };
  }

  function renderFallbackRouteMap(order, mapElement, startPoint, endPoint, city, startLabel, endLabel) {
    const stageMeta = getOrderStageMeta(order.stage);
    const trackingEnabled = Boolean(order.assigneeId || order.assigneeName);
    const routeGeometry = [
      [startPoint.lat, startPoint.lng],
      [endPoint.lat, endPoint.lng]
    ];
    const trackerPoint = trackingEnabled ? getPointAtProgress(routeGeometry, getOrderStageProgress(order.stage)) : null;
    const startPos = projectPointToMiniMap(startPoint, city);
    const endPos = projectPointToMiniMap(endPoint, city);
    const trackerPos = trackerPoint ? projectPointToMiniMap(trackerPoint, city) : null;
    const controlX = ((startPos.x + endPos.x) / 2) + (startPos.y < endPos.y ? -8 : 8);
    const controlY = ((startPos.y + endPos.y) / 2) - 12;
    const distanceKm = getDistanceKmBetween(startPoint, endPoint);
    const durationMin = Math.max(8, Math.round(distanceKm * 3.5));

    mapElement.innerHTML = `
      <div class="route-fallback-map">
        <div class="route-fallback-grid" aria-hidden="true"></div>
        <svg class="route-fallback-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <path d="M ${startPos.x} ${startPos.y} Q ${controlX} ${controlY} ${endPos.x} ${endPos.y}" class="route-fallback-line-shadow"></path>
          <path d="M ${startPos.x} ${startPos.y} Q ${controlX} ${controlY} ${endPos.x} ${endPos.y}" class="route-fallback-line"></path>
        </svg>
        <div class="route-fallback-pin start" style="left:${startPos.x}%;top:${startPos.y}%;">A</div>
        <div class="route-fallback-pin end" style="left:${endPos.x}%;top:${endPos.y}%;">B</div>
        ${trackerPos ? `<div class="route-fallback-courier" style="left:${trackerPos.x}%;top:${trackerPos.y}%;"></div>` : ""}
      </div>
    `;

    appendRouteMapInfo(mapElement, {
      city,
      startLabel,
      endLabel,
      distanceText: `${distanceKm.toFixed(1)} км`,
      durationText: `${durationMin} мин`,
      trackingEnabled,
      assigneeName: order.assigneeName,
      stageTitle: stageMeta.title
    });
  }

  function extractRouteGeometry(activeRoute) {
    const geometry = [];
    const paths = activeRoute?.getPaths?.();
    if (!paths?.each) return geometry;

    paths.each((path) => {
      const coords = path?.geometry?.getCoordinates?.();
      if (!Array.isArray(coords)) return;
      coords.forEach((point) => {
        if (Array.isArray(point) && point.length >= 2) {
          geometry.push(point);
        }
      });
    });

    return geometry;
  }

  function appendRouteMapInfo(container, payload) {
    if (!container) return;
    container.querySelector(".route-map-info")?.remove();
    const infoText = document.createElement("div");
    infoText.className = "route-map-info";
    infoText.innerHTML = `
      <div class="route-map-summary">
        <strong>${escapeHtml(payload.city)}</strong>
        <span>${escapeHtml(payload.startLabel)} → ${escapeHtml(payload.endLabel)}</span>
      </div>
      <div class="route-map-meta">
        <small>${escapeHtml(payload.distanceText)} • ${escapeHtml(payload.durationText)}</small>
        <div class="route-map-stage ${payload.trackingEnabled ? "" : "idle"}">
          <em>${escapeHtml(payload.trackingEnabled ? (payload.assigneeName || "Исполнитель") : "Трекинг")}</em>
          <b>${escapeHtml(payload.trackingEnabled ? payload.stageTitle : "Ждет исполнителя")}</b>
        </div>
      </div>
    `;
    container.appendChild(infoText);
  }

  async function initDetailMapRoute(order) {
    setTimeout(async () => {
      const mapElement = document.getElementById("detailMapRoute");
      if (!mapElement) return;
      const city = order.city || state.ui.selectedCity || "Алматы";
      const startLabel = order.fromAddress || getCityCenterLabel(city);
      const endLabel = order.toAddress || order.address || getCityCenterLabel(city);
      const [startPoint, endPoint] = await Promise.all([
        resolveAddressCoordinates(city, startLabel),
        resolveAddressCoordinates(city, endLabel)
      ]);

      if (!hasYandexMapsKey() || window.location.protocol === "file:") {
        renderFallbackRouteMap(order, mapElement, startPoint, endPoint, city, startLabel, endLabel);
        return;
      }

      setMapMessage(mapElement, "Строим маршрут через Яндекс Карты...");

      try {
        const ymaps = await ensureYandexMaps();
        if (!document.getElementById("detailMapRoute")) return;

        destroyMapInstance(state.detailMap);
        state.detailMap = null;

        const stageMeta = getOrderStageMeta(order.stage);
        const trackingEnabled = Boolean(order.assigneeId || order.assigneeName);

        if (!document.getElementById("detailMapRoute")) return;

        mapElement.innerHTML = "";
        state.detailMap = new ymaps.Map("detailMapRoute", {
          center: [startPoint.lat, startPoint.lng],
          zoom: 12,
          controls: []
        }, {
          suppressMapOpenBlock: true
        });

        const startPlacemark = new ymaps.Placemark([startPoint.lat, startPoint.lng], {
          balloonContentHeader: "Точка A",
          balloonContentBody: escapeHtml(startLabel)
        }, {
          preset: "islands#greenIcon"
        });

        const endPlacemark = new ymaps.Placemark([endPoint.lat, endPoint.lng], {
          balloonContentHeader: "Точка B",
          balloonContentBody: escapeHtml(endLabel)
        }, {
          preset: "islands#redIcon"
        });

        state.detailMap.geoObjects.add(startPlacemark);
        state.detailMap.geoObjects.add(endPlacemark);

        const multiRoute = new ymaps.multiRouter.MultiRoute({
          referencePoints: [
            [startPoint.lat, startPoint.lng],
            [endPoint.lat, endPoint.lng]
          ],
          params: {
            routingMode: "auto",
            results: 1
          }
        }, {
          boundsAutoApply: true,
          wayPointVisible: false,
          viaPointVisible: false,
          routeActiveStrokeColor: "#2563eb",
          routeActiveStrokeWidth: 6,
          routeActiveStrokeOpacity: 0.95
        });

        state.detailMap.geoObjects.add(multiRoute);

        multiRoute.model.events.add("requestsuccess", () => {
          const activeRoute = multiRoute.getActiveRoute();
          const distanceText = activeRoute?.properties?.get("distance")?.text || "Маршрут готов";
          const durationText = activeRoute?.properties?.get("duration")?.text || "Время уточняется";
          const geometry = extractRouteGeometry(activeRoute);

          if (trackingEnabled) {
            const trackerPoint = getPointAtProgress(
              geometry.length ? geometry : [
                [startPoint.lat, startPoint.lng],
                [endPoint.lat, endPoint.lng]
              ],
              getOrderStageProgress(order.stage)
            );

            if (trackerPoint) {
              const courierPlacemark = new ymaps.Placemark([trackerPoint.lat, trackerPoint.lng], {
                balloonContentHeader: escapeHtml(order.assigneeName || "Исполнитель"),
                balloonContentBody: escapeHtml(stageMeta.title)
              }, {
                preset: "islands#blueCircleDotIcon"
              });
              state.detailMap.geoObjects.add(courierPlacemark);
            }
          }

          appendRouteMapInfo(mapElement, {
            city,
            startLabel,
            endLabel,
            distanceText,
            durationText,
            trackingEnabled,
            assigneeName: order.assigneeName,
            stageTitle: stageMeta.title
          });
        });

        multiRoute.model.events.add("requestfail", () => {
          renderFallbackRouteMap(order, mapElement, startPoint, endPoint, city, startLabel, endLabel);
        });
      } catch (error) {
        yandexMapsBlocked = true;
        console.error("Не удалось инициализировать маршрут Яндекс Карт:", error);
        renderFallbackRouteMap(order, mapElement, startPoint, endPoint, city, startLabel, endLabel);
      }
    }, 120);
  }

  function buildOrderBalloon(order) {
    return `
      <div class="map-popup">
        <strong>${escapeHtml(order.title)}</strong>
        <small>${escapeHtml(order.category)}</small>
        <small>${formatMoney(order.finalPrice || order.budget)}</small>
      </div>
    `;
  }

  function getOrderMarkerPreset(order) {
    if (order.status === "done") return "islands#grayCircleDotIcon";
    if (order.ownerId === state.account.id) return "islands#blueCircleDotIcon";
    return "islands#greenCircleDotIcon";
  }

  function initMap() {
    setTimeout(async () => {
      const mapElement = document.getElementById("mapView");
      if (!mapElement) return;

      if (!hasYandexMapsKey()) {
        setMapMessage(mapElement, getMapBootstrapMessage());
        return;
      }

      setMapMessage(mapElement, "Загружаем Яндекс Карты...");

      try {
        const ymaps = await ensureYandexMaps();
        if (!document.getElementById("mapView")) return;

        destroyMapInstance(state.map);
        state.map = null;

        const city = state.ui.selectedCity || "Алматы";
        const cityCenter = getCityCenter(city);
        const center = [cityCenter.lat, cityCenter.lng];
        const orders = getVisibleOrders();

        mapElement.innerHTML = "";
        state.map = new ymaps.Map("mapView", {
          center,
          zoom: 12,
          controls: ["zoomControl"]
        }, {
          suppressMapOpenBlock: true
        });

        const collection = new ymaps.GeoObjectCollection();

        const orderGeoObjects = await Promise.all(orders.map(async (order) => {
          const coords = await resolveAddressCoordinates(order.city || city, order.toAddress || order.address);
          const placemark = new ymaps.Placemark([coords.lat, coords.lng], {
            balloonContentHeader: escapeHtml(order.title),
            balloonContentBody: buildOrderBalloon(order)
          }, {
            preset: getOrderMarkerPreset(order)
          });

          placemark.events.add("click", () => {
            state.ui.modal = { type: "detail", orderId: order.id };
            persist();
            render();
          });

          return placemark;
        }));

        orderGeoObjects.forEach((geoObject) => collection.add(geoObject));

        const userPlacemark = new ymaps.Placemark(center, {
          balloonContentHeader: "Ваш город",
          balloonContentBody: escapeHtml(city)
        }, {
          preset: "islands#orangeCircleDotIcon"
        });

        collection.add(userPlacemark);
        state.map.geoObjects.add(collection);

        const bounds = collection.getBounds?.();
        if (bounds) {
          state.map.setBounds(bounds, {
            checkZoomRange: true
          });
        } else {
          state.map.setCenter(center, 12);
        }
      } catch (error) {
        console.error("Не удалось инициализировать Яндекс Карты:", error);
        setMapMessage(mapElement, "Не удалось загрузить Яндекс Карты.");
      }
    }, 100);
  }
})();
