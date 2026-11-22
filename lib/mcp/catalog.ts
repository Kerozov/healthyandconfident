/**
 * Какво може Claude през конектора — целият админ, по раздели.
 *
 * Всяко действие е съществуваща функция на админа: същите проверки, същият
 * одит, същите лимити като бутоните в панела. Тук няма SQL и няма свободно
 * извикване — само изброените функции. Параметрите им се извеждат от типовете
 * с `bun run mcp:catalog` в `catalog.generated.ts`.
 *
 * `effect` бележи действията, които излизат навън или не се връщат: те искат
 * `confirmed: true`, т.е. изрично указание от собственика в чата.
 */

export const MCP_SOURCES = {
  actions: "app/(admin)/admin/actions.ts",
  blackFridayActions: "app/(admin)/admin/black-friday-actions.ts",
  contactActions: "app/(admin)/admin/contact-actions.ts",
  integrationActions: "app/(admin)/admin/integration-actions.ts",
  questionnaireActions: "app/(admin)/admin/questionnaire-actions.ts",
  teamActions: "app/(admin)/admin/team-actions.ts",
  academyActions: "app/(admin)/admin/academy-actions.ts",
  data: "lib/admin/data.ts",
  automationsData: "lib/admin/automations-data.ts",
  contactsData: "lib/admin/contacts-data.ts",
  formsData: "lib/admin/forms-data.ts",
  dashboard: "lib/admin/dashboard-overview.ts",
  emailStats: "lib/admin/email-stats.ts",
  paymentStats: "lib/admin/payment-stats.ts",
  visitStats: "lib/admin/visit-stats.ts",
  zoomStats: "lib/admin/zoom-stats.ts",
  team: "lib/admin/team.ts",
  audit: "lib/admin/audit.ts",
  contactStatuses: "lib/admin/contact-statuses.ts",
  personProfile: "lib/admin/person-profile.ts",
  emailHistory: "lib/admin/email-history.ts",
  engagement: "lib/admin/engagement.ts",
  personFacts: "lib/admin/person-facts.ts",
  questionnaireReport: "lib/admin/questionnaire-report.ts",
  freeMenu: "lib/admin/free-menu.ts",
  metaData: "lib/admin/meta-data.ts",
  blackFriday: "lib/black-friday/admin.ts",
  siteContent: "lib/site/content.ts",
  contactConfig: "lib/site/contact-config.ts",
  questionnaireCta: "lib/site/questionnaire-cta-data.ts",
  zoomLive: "lib/zoom/live.ts",
  funnelBrand: "lib/integrations/funnel-brand-sync.ts",
  emailBlocks: "lib/email/blocks.ts",
} as const;

export type McpSource = keyof typeof MCP_SOURCES;
export type McpEffect = "send" | "delete" | "publish" | "bulk";

export type McpActionEntry = {
  source: McpSource;
  fn: string;
  /** Кратко какво прави; ако липсва, се взима одитното описание от кода. */
  note?: string;
  effect?: McpEffect;
};

export type McpArea = { title: string; about: string; actions: Record<string, McpActionEntry> };

const a = (source: McpSource, fn: string, note?: string, effect?: McpEffect): McpActionEntry => ({
  source,
  fn,
  ...(note ? { note } : {}),
  ...(effect ? { effect } : {}),
});

export const MCP_CATALOG = {
  overview: {
    title: "Табло и статистика",
    about: "Общата картина: табло, имейли, плащания, посещения, последните промени в админа.",
    actions: {
      dashboard: a("dashboard", "getDashboardOverview", "Таблото за период (7, 30, 90 или 365 дни)."),
      email_stats: a("emailStats", "getEmailStats", "Статистика на имейлите за период."),
      payment_stats: a("paymentStats", "getPaymentStats", "Плащания и поръчки за период."),
      visit_stats: a("visitStats", "getVisitStats", "Посещения на сайта за период."),
      recent_changes: a("audit", "listRecentAdminAudit", "Последните промени в админа — кой, какво, кога."),
    },
  },
  subscribers: {
    title: "Абонати, групи и статуси",
    about: "Хората в списъка, техните тагове, групи (сегменти), CRM статуси, профил и история.",
    actions: {
      list: a("data", "getSubscribers", "Всички абонати (до 10 000). Ползвай search/fields/limit в run_action."),
      tags: a("data", "getSubscriberTags", "Всички тагове, които имат абонатите."),
      groups: a("data", "getSegmentGroups", "Групите (родители на сегментите)."),
      segments: a("data", "getSegments", "Сегментите, към които може да се добави човек."),
      profile: a("personProfile", "getPersonProfile", "Пълен профил на човек по имейл."),
      email_history: a("emailHistory", "getPersonEmailHistory", "Кои имейли е получил човекът."),
      engagement: a("engagement", "getSubscriberEngagementDetail", "Отваряния и кликове на човек по имейл."),
      engagement_report: a("actions", "getSubscriberEngagementReport", "Отчет за отварянията и кликовете на абонати."),
      engagement_summaries: a("actions", "getSubscribersEngagementSummaries", "Кратка ангажираност за списък абонати."),
      facts: a("personFacts", "getSubscriberFacts", "Фактите в профила (отговори от импорт и Launchify)."),
      history: a("contactStatuses", "getSubscriberHistory", "Историята на статуса и таговете на човек."),
      statuses: a("contactStatuses", "getContactStatuses", "CRM статусите."),
      add: a("actions", "addSubscriber"),
      import: a("actions", "importSubscribers", "Импорт на редове (до няколко хиляди наведнъж).", "bulk"),
      update: a("actions", "updateSubscriber"),
      preview_automations: a("actions", "previewSubscriberAutomations", "Кои автоматизации ще тръгнат, ако човекът получи тези тагове."),
      delete: a("actions", "deleteSubscribers", "Изтрива абонати по id.", "delete"),
      inactive: a("actions", "getInactiveSubscribers", "Неактивни от N месеца."),
      unsubscribe_inactive: a("actions", "unsubscribeInactiveSubscribers", undefined, "bulk"),
      create_group: a("actions", "createSegmentGroup"),
      update_group: a("actions", "updateSegmentGroup"),
      delete_group: a("actions", "deleteSegmentGroup", undefined, "delete"),
      create_segment: a("actions", "createSegment"),
      update_segment: a("actions", "updateSegment"),
      delete_segment: a("actions", "deleteSegment", undefined, "delete"),
      create_status: a("contactActions", "createContactStatus", "Нов CRM статус."),
      update_status: a("contactActions", "updateContactStatus", "Преименува или оцветява CRM статус."),
      delete_status: a("contactActions", "deleteContactStatus", "Изтрива CRM статус.", "delete"),
      reorder_statuses: a("contactActions", "reorderContactStatuses", "Подрежда CRM статусите."),
      set_status: a("contactActions", "setSubscribersStatus", "Слага CRM статус на един или много хора."),
    },
  },
  contacts: {
    title: "Контакти (Zoom и задачи)",
    about: "Контактите от записванията за срещи, техните задачи в worker-а и ангажираност.",
    actions: {
      list: a("contactsData", "getContacts", "Контактите със филтри."),
      detail: a("contactsData", "getContactDetail", "Един контакт с неговите задачи и събития."),
      job_engagement: a("contactsData", "getContactJobEngagement", "Отваряния и кликове по задачите на контакт."),
      cancel_job: a("actions", "cancelContactJobAction", "Отменя насрочено писмо/напомняне на контакт."),
    },
  },
  campaigns: {
    title: "Имейл и СМС кампании",
    about: "Кампании по аудитория (група, сегмент, тагове), тестове, отчети, повторно към неотворили, подпис и футър. Текстът се пише като блокове (email_blocks_to_html) или HTML.",
    actions: {
      list_email: a("data", "getEmailCampaigns", "Имейл кампаниите, най-новите първо."),
      list_sms: a("data", "getSmsCampaigns", "СМС кампаниите, най-новите първо."),
      preview_audience: a("actions", "previewAudience", "Брои имейлите и телефоните в аудиторията. Винаги преди изпращане."),
      email_blocks_to_html: a("emailBlocks", "serializeEmailBlocks", "Блокове → HTML за тялото на имейл, както го прави редакторът."),
      email_html_to_blocks: a("emailBlocks", "parseEmailBlocks", "HTML от кампания/автоматизация → блокове за редакция."),
      test_email: a("actions", "sendTestEmail", "Тестов имейл до един адрес.", "send"),
      send_email: a("actions", "sendEmailCampaign", "Изпраща или насрочва имейл кампания.", "send"),
      update_cta: a("actions", "updateEmailCampaignCta"),
      recipients: a("actions", "getCampaignRecipientReport", "Получателите и доставката на кампания."),
      stats: a("actions", "getCampaignStatsDetail", "Подробна статистика на кампания: отваряния, кликове, линкове."),
      sync_email: a("actions", "syncEmailCampaign", "Дърпа статуса на доставката от worker-а."),
      sync_all_email: a("actions", "syncAllEmailCampaigns"),
      resend_non_openers: a("actions", "resendToNonOpeners", undefined, "send"),
      cancel_email: a("actions", "cancelEmailCampaign"),
      delete_email: a("actions", "deleteEmailCampaign", undefined, "delete"),
      test_sms: a("actions", "sendTestSms", "Тестов СМС до един номер.", "send"),
      send_sms: a("actions", "sendSmsCampaign", "Изпраща или насрочва СМС кампания.", "send"),
      sync_sms: a("actions", "syncSmsCampaign"),
      sync_all_sms: a("actions", "syncAllSmsCampaigns"),
      cancel_sms: a("actions", "cancelSmsCampaign"),
      delete_sms: a("actions", "deleteSmsCampaign", undefined, "delete"),
      delivery_issues: a("actions", "getDeliveryIssuesReport", "Неуспешни доставки за последните N дни."),
      set_delivery_issues_ignored: a("actions", "setDeliveryIssuesIgnored"),
      email_footers: a("data", "getEmailFooters", "Подписът и футърът на имейлите (BG/EN)."),
      save_email_footer: a("actions", "saveEmailFooter"),
      attachment_upload: a("actions", "createEmailAttachmentUpload", "Подписан адрес за качване на прикачен файл."),
    },
  },
  automations: {
    title: "Автоматизации",
    about: "Поредици от имейли/СМС по събитие (записване, форма, покупка, таг), отчети и ръчно пускане.",
    actions: {
      list: a("automationsData", "getAutomations"),
      stats: a("actions", "getAutomationStatsMap"),
      deliveries: a("automationsData", "getAutomationDeliveries", "Всички доставки на една автоматизация."),
      report: a("actions", "getAutomationDeliveriesReport"),
      legacy_emails: a("data", "getAutomatedEmails", "Старите автоматични имейли (преди автоматизациите)."),
      create: a("actions", "createAutomation", "Нова автоматизация. Записвай я изключена, включването е отделно."),
      update: a("actions", "updateAutomation"),
      duplicate: a("actions", "duplicateAutomation"),
      toggle: a("actions", "toggleAutomationEnabled", "Включва/изключва. Включването пуска писма към нови хора.", "send"),
      delete: a("actions", "deleteAutomation", undefined, "delete"),
      sync: a("actions", "syncAutomation"),
      sync_all: a("actions", "syncAllAutomations"),
      catch_up_now: a("actions", "runAutomationCatchUpNow", "Навакса пропуснатите стъпки сега.", "send"),
      diagnose_for_email: a("actions", "diagnoseAutomationsForEmail", "Защо човек е/не е получил автоматизация."),
      resend_non_openers: a("actions", "resendAutomationToNonOpeners", undefined, "send"),
      preview_send_now: a("actions", "previewAutomationSendNow", "Брои на кого ще тръгне ръчното пускане."),
      send_now: a("actions", "sendAutomationNow", "Пуска стъпката сега към избраните.", "send"),
    },
  },
  forms: {
    title: "Форми и въпросници",
    about: "Формите на сайта, отговорите, въпросниците с отчет и безплатното меню.",
    actions: {
      list: a("formsData", "getFormTemplates", "Всички форми с броя отговори."),
      get: a("formsData", "getFormTemplateById", "Една форма с полетата."),
      submissions: a("formsData", "getFormSubmissions", "Отговорите на форма."),
      submissions_report: a("actions", "getFormSubmissionsReport", "Отчет на отговорите на форма."),
      create_from_preset: a("actions", "createFormFromPreset"),
      save: a("actions", "saveFormTemplate"),
      set_enabled: a("actions", "setFormEnabled"),
      delete: a("actions", "deleteFormTemplate", undefined, "delete"),
      send_by_email: a("actions", "sendFormByEmail", "Праща формата по имейл на аудитория.", "send"),
      questionnaires: a("questionnaireReport", "getQuestionnaireForms", "Формите-въпросници."),
      questionnaire_report: a("questionnaireReport", "getQuestionnaireReport", "Отчет на въпросник по форма."),
      questionnaire_cta: a("questionnaireCta", "getAdminQuestionnaireCta", "Бутонът след въпросника."),
      save_questionnaire_cta: a("questionnaireActions", "saveQuestionnaireCta"),
      free_menu_report: a("freeMenu", "getFreeMenuReport"),
    },
  },
  blog: {
    title: "Блог",
    about: "Статии на BG и EN: чернова, публикуване, изтриване.",
    actions: {
      list: a("data", "getPosts", "Всички статии (BG и EN), най-новите първо."),
      get: a("data", "getPost", "Една статия по id."),
      save: a("actions", "savePost", "Записва статия (чернова, ако не е публикувана)."),
      publish: a("actions", "publishPost", undefined, "publish"),
      delete: a("actions", "deletePost", undefined, "delete"),
    },
  },
  site: {
    title: "Съдържание на сайта",
    about: "Секции, събития, видеа, ръководства, продукти, програми, CTA бутони, попъп, контакти и снимки.",
    actions: {
      content: a("siteContent", "getAdminSiteContent", "Цялото съдържание на сайта, както го вижда админът."),
      cta_placements: a("siteContent", "getCtaPlacements", "Бутоните и офертите по местата на сайта."),
      products: a("data", "getSiteProducts", "Продуктите на сайта (true = и скритите)."),
      guides: a("data", "getSiteGuides", "Ръководствата на сайта (true = и скритите)."),
      events: a("siteContent", "getSiteEvents", "Събитията на сайта (true = и скритите)."),
      videos: a("siteContent", "getSiteVideos", "Видеата на сайта (true = и скритите)."),
      program_cards: a("siteContent", "getSiteProgramCards", "Картичките в „Програми“ (true = и скритите)."),
      save_section: a("actions", "saveSiteSection"),
      save_event: a("actions", "saveSiteEvent"),
      delete_event: a("actions", "deleteSiteEvent", undefined, "delete"),
      save_video: a("actions", "saveSiteVideo"),
      delete_video: a("actions", "deleteSiteVideo", undefined, "delete"),
      save_guide: a("actions", "saveSiteGuide"),
      delete_guide: a("actions", "deleteSiteGuide", undefined, "delete"),
      reorder_guides: a("actions", "reorderSiteGuides"),
      save_product: a("actions", "saveSiteProduct"),
      delete_product: a("actions", "deleteSiteProduct", undefined, "delete"),
      reorder_products: a("actions", "reorderSiteProducts"),
      save_program_card: a("actions", "saveSiteProgramCard"),
      delete_program_card: a("actions", "deleteSiteProgramCard", undefined, "delete"),
      reorder_program_cards: a("actions", "reorderSiteProgramCards"),
      clear_program_card_button: a("actions", "clearProgramCardButtonOverride"),
      save_cta_placement: a("actions", "saveCtaPlacement"),
      popups: a("data", "getPopups", "Попъпът за BG и EN."),
      save_popup: a("actions", "savePopup"),
      contact_config: a("contactConfig", "getAdminSiteContactConfig", "Контактите на сайта: Messenger, имейл, телефон."),
      save_contact_config: a("actions", "saveSiteContactConfig"),
      image_upload: a("actions", "createSiteImageUpload", "Подписан адрес за качване на снимка."),
      stripe_catalog: a("actions", "fetchStripeCatalog", "Продуктите и цените в Stripe."),
      import_stripe_product: a("actions", "importStripeProduct"),
      sync_product_from_stripe: a("actions", "syncSiteProductFromStripe"),
    },
  },
  black_friday: {
    title: "Black Friday",
    about: "Настройките на кампанията, отстъпките и пакетите.",
    actions: {
      data: a("blackFriday", "getBlackFridayAdminData", "Всичко за Black Friday: настройки, отстъпки, пакети."),
      save_config: a("blackFridayActions", "saveBlackFridayConfig", "Записва настройките на Black Friday."),
      save_discount: a("blackFridayActions", "saveBlackFridayDiscount", "Създава или сменя отстъпка за Black Friday."),
      delete_discount: a("blackFridayActions", "deleteBlackFridayDiscount", "Изтрива отстъпка за Black Friday.", "delete"),
      save_bundle: a("blackFridayActions", "saveBlackFridayBundle", "Създава или сменя пакет за Black Friday."),
      delete_bundle: a("blackFridayActions", "deleteBlackFridayBundle", "Изтрива пакет за Black Friday.", "delete"),
    },
  },
  integrations: {
    title: "Launchify, Meta, Zoom и академията",
    about: "Синхронизация на контактите от Launchify, Meta пиксел, Zoom на живо и отчети, курсовете в академията.",
    actions: {
      launchify_status: a("funnelBrand", "getFunnelBrandSyncStatus", "Кога и какво е синхронизирано от Launchify."),
      launchify_funnels: a("integrationActions", "listFunnelBrandFunnelsAction", "Фуниите в Launchify."),
      launchify_test: a("integrationActions", "testFunnelBrandAction", "Проверява ключа към Launchify."),
      launchify_preview_sync: a("integrationActions", "previewFunnelBrandSyncAction"),
      launchify_sync: a("integrationActions", "syncFunnelBrandAction", "Дърпа новите контакти от Launchify.", "bulk"),
      launchify_save_settings: a("integrationActions", "saveFunnelBrandSettingsAction"),
      meta: a("metaData", "getMetaPixelAdminData", "Meta пикселът и последните събития."),
      save_meta_pixel: a("actions", "saveMetaPixelConfig"),
      meta_test_event: a("actions", "sendMetaTestEvent"),
      zoom_live: a("zoomLive", "getZoomLiveConfig", "Настройките на Zoom на живо."),
      save_zoom_live: a("actions", "saveZoomLiveConfig"),
      zoom_report: a("zoomStats", "getZoomReport"),
      zoom_overview: a("zoomStats", "getZoomOverview"),
      zoom_meetings: a("zoomStats", "getZoomMeetingOptions", "Zoom срещите за избор."),
      zoom_meeting_sessions: a("zoomStats", "getZoomSessionsForMeeting", "Кой е влизал в Zoom среща."),
      zoom_contact_sessions: a("zoomStats", "getZoomSessionsForContact", "В кои Zoom срещи е влизал контакт."),
      academy_courses: a("academyActions", "listAcademyCourses"),
    },
  },
  team: {
    title: "Екип и достъпи",
    about: "Профилите в админа, екраните им и известията.",
    actions: {
      overview: a("team", "getTeamOverview", "Профилите в админа, екраните им и последната им активност."),
      create_profile: a("teamActions", "createAdminProfile", "Нов профил в админа."),
      update_profile: a("teamActions", "updateAdminProfile", "Сменя профил: име, екрани, парола, известия."),
      delete_profile: a("teamActions", "deleteAdminProfile", "Изтрива профил от админа.", "delete"),
    },
  },
} satisfies Record<string, McpArea>;

export type McpAreaKey = keyof typeof MCP_CATALOG;

export const signatureKey = (entry: Pick<McpActionEntry, "source" | "fn">) => `${entry.source}:${entry.fn}`;
