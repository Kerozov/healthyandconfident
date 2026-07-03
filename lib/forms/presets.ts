import type { FormPreset } from "@/lib/forms/types";

function fid(key: string): string {
  return `f_${key}`;
}

export const FORM_PRESETS: FormPreset[] = [
  {
    key: "health-intake",
    name: "Здравен въпросник",
    description: "Anamnesis — цели, здраве, навици",
    slug: "health-intake",
    title_bg: "Здравен въпросник",
    title_en: "Health questionnaire",
    description_bg:
      "Попълни кратко, за да подготвим персонален план за теб. Отнема около 5 минути.",
    description_en:
      "Fill in briefly so we can prepare a personal plan for you. Takes about 5 minutes.",
    email_subject_bg: "Моля, попълни здравния въпросник",
    email_subject_en: "Please complete your health questionnaire",
    email_intro_bg:
      "<p>Здравей, {{name}}!</p><p>Благодарим ти, че си част от нашата общност. Моля, отдели няколко минути да попълниш въпросника — така ще можем да ти помогнем по-точно.</p>",
    email_intro_en:
      "<p>Hi {{name}}!</p><p>Thank you for being part of our community. Please take a few minutes to complete the questionnaire so we can support you better.</p>",
    settings: {
      theme: "default",
      thank_you_bg: "Благодарим! Отговорите са записани. Ще се свържем с теб скоро.",
      thank_you_en: "Thank you! Your answers have been saved. We will be in touch soon.",
      tag_on_submit: "questionnaire-done",
    },
    fields: [
      {
        id: fid("h1"),
        type: "heading",
        label_bg: "Основна информация",
        label_en: "Basic information",
      },
      {
        id: fid("name"),
        type: "text",
        label_bg: "Име",
        label_en: "Name",
        required: true,
      },
      {
        id: fid("email"),
        type: "email",
        label_bg: "Имейл",
        label_en: "Email",
        required: true,
      },
      {
        id: fid("age"),
        type: "number",
        label_bg: "Възраст",
        label_en: "Age",
        required: true,
      },
      {
        id: fid("goal"),
        type: "select",
        label_bg: "Основна цел",
        label_en: "Main goal",
        required: true,
        options: [
          { value: "weight", label_bg: "Отслабване", label_en: "Weight loss" },
          { value: "energy", label_bg: "Повече енергия", label_en: "More energy" },
          { value: "habits", label_bg: "По-добри навици", label_en: "Better habits" },
          { value: "other", label_bg: "Друго", label_en: "Other" },
        ],
      },
      {
        id: fid("notes"),
        type: "textarea",
        label_bg: "Допълнителна информация",
        label_en: "Additional notes",
        placeholder_bg: "Алергии, ограничения, въпроси…",
        placeholder_en: "Allergies, restrictions, questions…",
      },
      {
        id: fid("consent"),
        type: "consent",
        label_bg: "Съгласен/на съм данните да се използват за консултация",
        label_en: "I agree my data may be used for consultation",
        required: true,
      },
    ],
  },
  {
    key: "feedback",
    name: "Обратна връзка",
    description: "Кратка анкета след програма или събитие",
    slug: "feedback",
    title_bg: "Как беше за теб?",
    title_en: "How was it for you?",
    description_bg: "Твоето мнение ни помага да подобряваме програмите.",
    description_en: "Your feedback helps us improve our programs.",
    email_subject_bg: "Сподели обратна връзка",
    email_subject_en: "Share your feedback",
    email_intro_bg:
      "<p>Здравей!</p><p>Ще се радваме да чуем как мина за теб — попълни кратката форма по-долу.</p>",
    email_intro_en:
      "<p>Hi!</p><p>We would love to hear how it went for you — please fill in the short form below.</p>",
    settings: {
      theme: "warm",
      thank_you_bg: "Благодарим за обратната връзка!",
      thank_you_en: "Thank you for your feedback!",
    },
    fields: [
      {
        id: fid("rating"),
        type: "radio",
        label_bg: "Обща оценка",
        label_en: "Overall rating",
        required: true,
        options: [
          { value: "5", label_bg: "Отлично", label_en: "Excellent" },
          { value: "4", label_bg: "Добре", label_en: "Good" },
          { value: "3", label_bg: "Средно", label_en: "Average" },
          { value: "2", label_bg: "Слабо", label_en: "Poor" },
        ],
      },
      {
        id: fid("best"),
        type: "textarea",
        label_bg: "Какво ти хареса най-много?",
        label_en: "What did you like most?",
      },
      {
        id: fid("improve"),
        type: "textarea",
        label_bg: "Какво можем да подобрим?",
        label_en: "What can we improve?",
      },
    ],
  },
  {
    key: "event-signup",
    name: "Записване за събитие",
    description: "Регистрация за уебinar или live събитие",
    slug: "event-signup",
    title_bg: "Запиши се за събитието",
    title_en: "Register for the event",
    description_bg: "Попълни формата и ще получиш детайли по имейл.",
    description_en: "Fill in the form and you will receive details by email.",
    email_subject_bg: "Запиши се — линк към формата",
    email_subject_en: "Register — form link",
    email_intro_bg:
      "<p>Здравей, {{name}}!</p><p>Радваме се, че искаш да участваш. Попълни формата за записване:</p>",
    email_intro_en:
      "<p>Hi {{name}}!</p><p>We are glad you want to join. Please complete the registration form:</p>",
    settings: {
      theme: "minimal",
      thank_you_bg: "Записана си! Очаквай имейл с детайли.",
      thank_you_en: "You are registered! Expect an email with details.",
      tag_on_submit: "event-registered",
    },
    fields: [
      {
        id: fid("name"),
        type: "text",
        label_bg: "Име и фамилия",
        label_en: "Full name",
        required: true,
      },
      {
        id: fid("email"),
        type: "email",
        label_bg: "Имейл",
        label_en: "Email",
        required: true,
      },
      {
        id: fid("phone"),
        type: "phone",
        label_bg: "Телефон (по избор)",
        label_en: "Phone (optional)",
      },
      {
        id: fid("experience"),
        type: "select",
        label_bg: "Опит с подобни програми",
        label_en: "Experience with similar programs",
        options: [
          { value: "none", label_bg: "Няма", label_en: "None" },
          { value: "some", label_bg: "Имам малко", label_en: "Some" },
          { value: "lots", label_bg: "Имам опит", label_en: "Experienced" },
        ],
      },
    ],
  },
  {
    key: "blank",
    name: "Празна форма",
    description: "Започни от нулата с име и имейл",
    slug: "new-form",
    title_bg: "Нова форма",
    title_en: "New form",
    description_bg: "Опиши формата тук.",
    description_en: "Describe your form here.",
    email_subject_bg: "Моля, попълни формата",
    email_subject_en: "Please complete the form",
    email_intro_bg: "<p>Здравей, {{name}}!</p><p>Моля, попълни формата по линка по-долу.</p>",
    email_intro_en: "<p>Hi {{name}}!</p><p>Please complete the form using the link below.</p>",
    settings: {
      theme: "default",
      thank_you_bg: "Благодарим!",
      thank_you_en: "Thank you!",
    },
    fields: [
      {
        id: fid("email"),
        type: "email",
        label_bg: "Имейл",
        label_en: "Email",
        required: true,
      },
      {
        id: fid("message"),
        type: "textarea",
        label_bg: "Съобщение",
        label_en: "Message",
        required: true,
      },
    ],
  },
];

export function getFormPreset(key: string): FormPreset | undefined {
  return FORM_PRESETS.find((p) => p.key === key);
}
