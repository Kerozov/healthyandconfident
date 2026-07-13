export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "number"
  | "date"
  | "select"
  | "radio"
  | "checkbox"
  /** @deprecated Use radio with option.segment_key — still accepted & normalized */
  | "health_interest"
  | "heading"
  | "consent";

export type FormFieldOption = {
  value: string;
  label_bg: string;
  label_en: string;
  /** When this answer is chosen, add this segment tag to the subscriber */
  segment_key?: string | null;
};

export type FormField = {
  id: string;
  type: FormFieldType;
  label_bg: string;
  label_en: string;
  placeholder_bg?: string;
  placeholder_en?: string;
  required?: boolean;
  options?: FormFieldOption[];
  help_bg?: string;
  help_en?: string;
};

export type FormTheme = "default" | "warm" | "minimal";

export type FormSettings = {
  theme: FormTheme;
  thank_you_bg: string;
  thank_you_en: string;
  /** @deprecated Prefer tags_on_submit */
  tag_on_submit?: string;
  /** Fixed segment keys applied to the subscriber after submit */
  tags_on_submit?: string[];
};

export type FormTemplateRecord = {
  id: string;
  name: string;
  slug: string;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  fields: FormField[];
  settings: FormSettings;
  email_subject_bg: string;
  email_subject_en: string;
  email_intro_bg: string;
  email_intro_en: string;
  enabled: boolean;
  attachment_path?: string | null;
  attachment_filename?: string | null;
  hero_image_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type FormSubmissionRecord = {
  id: string;
  form_id: string;
  subscriber_id: string | null;
  email: string | null;
  answers: Record<string, string | string[] | boolean>;
  submitted_at: string;
};

export type FormPreset = {
  key: string;
  name: string;
  description: string;
  slug: string;
  title_bg: string;
  title_en: string;
  description_bg: string;
  description_en: string;
  fields: FormField[];
  settings: FormSettings;
  email_subject_bg: string;
  email_subject_en: string;
  email_intro_bg: string;
  email_intro_en: string;
};
