"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import type { AudienceInput, Segment, SegmentGroup, SiteGuide, SiteProduct } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import {
  previewAudience,
  sendEmailCampaign,
  sendSmsCampaign,
} from "@/app/(admin)/admin/actions";
import { AudiencePicker, EMPTY_AUDIENCE } from "@/components/admin/audience-picker";
import { EmailTemplatePreview } from "@/components/admin/email-template-preview";
import { EmailBuilder } from "@/components/admin/email-builder";
import { Field, Input } from "@/components/admin/fields";
import { SmsComposeFields } from "@/components/admin/sms-compose-fields";
import { TestEmailSender } from "@/components/admin/test-email-sender";
import { TestSmsSender } from "@/components/admin/test-sms-sender";
import {
  CopyEmailButton,
  PasteEmailButton,
  useCopiedEmail,
} from "@/components/admin/email-clipboard";
import {
  copiedVersion,
  pickCopiedVersion,
  type CopiedEmail,
} from "@/lib/email/content-clipboard";
import { buildSmsBody, checkSmsCompose } from "@/lib/sms/compose-validation";
import { WorkspaceEditor, WorkspacePanel } from "@/components/admin/workspace-editor";
import { cn } from "@/lib/utils";

const EMAIL_DRAFT_KEY = "admin:campaign-draft:email";
const SMS_DRAFT_KEY = "admin:campaign-draft:sms";

type EmailDraft = {
  subject: string;
  html: string;
  cta_label: string;
  cta_url: string;
  attachment_path: string;
  attachment_filename: string;
  hero_image_url: string;
  signature_enabled: boolean;
  audience: AudienceInput;
  scheduled_at: string;
};

type SmsDraft = {
  message: string;
  link: string;
  audience: AudienceInput;
  scheduled_at: string;
};

function emptyEmailDraft(): EmailDraft {
  return {
    subject: "",
    html: "",
    cta_label: "",
    cta_url: "",
    attachment_path: "",
    attachment_filename: "",
    hero_image_url: "",
    signature_enabled: true,
    audience: { ...EMPTY_AUDIENCE },
    scheduled_at: "",
  };
}

function emptySmsDraft(): SmsDraft {
  return { message: "", link: "", audience: { ...EMPTY_AUDIENCE }, scheduled_at: "" };
}

function readDraft<T>(key: string): { value: T; savedAt: string } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: T; savedAt?: string };
    return parsed.value ? { value: parsed.value, savedAt: parsed.savedAt ?? "" } : null;
  } catch {
    return null;
  }
}

function writeDraft(key: string, value: unknown | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else
      window.localStorage.setItem(
        key,
        JSON.stringify({ value, savedAt: new Date().toISOString() }),
      );
  } catch {
    /* storage blocked or full — the editor still works, just without a backup */
  }
}

function draftTime(savedAt: string): string {
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("bg-BG", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CampaignComposer({
  segments,
  groups,
  products,
  guides = [],
  forms,
  subscriberTags,
  workerConfigured,
  tab,
  onClose,
  initialEmail = null,
}: {
  segments: Segment[];
  groups: SegmentGroup[];
  products: SiteProduct[];
  guides?: SiteGuide[];
  forms: FormTemplateRecord[];
  subscriberTags: string[];
  workerConfigured: boolean;
  tab: "email" | "sms";
  onClose: () => void;
  /** Opens the composer already filled with a copied email. */
  initialEmail?: CopiedEmail | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);
  const copiedEmail = useCopiedEmail();

  const [email, setEmail] = useState<EmailDraft>(() => {
    const base = emptyEmailDraft();
    const version = initialEmail ? pickCopiedVersion(initialEmail, "bg") : null;
    return version && initialEmail
      ? { ...base, ...version, signature_enabled: initialEmail.signature_enabled }
      : base;
  });
  const [showButton, setShowButton] = useState(() =>
    Boolean(email.cta_label && email.cta_url),
  );
  const [pasteNote, setPasteNote] = useState<string | null>(() =>
    initialEmail ? `Поставено от ${initialEmail.source || "копие"} „${initialEmail.name}“.` : null,
  );

  /**
   * Fills subject, body (blocks and buttons included), end button, hero image
   * and attachment. Audience and schedule stay as they are — those belong to
   * this campaign, not to the email that was copied.
   */
  function pasteEmail(copied: CopiedEmail, locale?: "bg" | "en") {
    const target = locale ?? (email.audience.locale === "en" ? "en" : "bg");
    const version = pickCopiedVersion(copied, target);
    if (!version) return;
    if (
      (email.html.trim() || email.subject.trim()) &&
      !confirm("Да заменя ли текущата тема и текст с копирания имейл?")
    ) {
      return;
    }
    setEmail({ ...email, ...version, signature_enabled: copied.signature_enabled });
    setShowButton(Boolean(version.cta_label && version.cta_url));
    const which = version === copied.en ? "EN" : "BG";
    setPasteNote(
      `Поставено от ${copied.source || "копие"} „${copied.name}“ (${which} версия).`,
    );
  }
  const [sms, setSms] = useState<SmsDraft>(emptySmsDraft);

  /**
   * Every keystroke is backed up in this browser, so closing the editor, a
   * reload or a crashed tab never loses a half-written campaign. The backup is
   * cleared only once the campaign is actually sent or scheduled.
   */
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const draftsLoaded = useRef(false);
  useEffect(() => {
    const savedEmail = initialEmail ? null : readDraft<EmailDraft>(EMAIL_DRAFT_KEY);
    const savedSms = readDraft<SmsDraft>(SMS_DRAFT_KEY);
    /* eslint-disable react-hooks/set-state-in-effect */
    if (savedEmail && (savedEmail.value.subject || savedEmail.value.html)) {
      const restored = { ...emptyEmailDraft(), ...savedEmail.value };
      setEmail(restored);
      setShowButton(Boolean(restored.cta_label && restored.cta_url));
      if (tab === "email") {
        setDraftNote(`Възстановена чернова от ${draftTime(savedEmail.savedAt)}.`);
      }
    }
    if (savedSms && (savedSms.value.message || savedSms.value.link)) {
      setSms({ ...emptySmsDraft(), ...savedSms.value });
      if (tab === "sms") {
        setDraftNote(`Възстановена чернова от ${draftTime(savedSms.savedAt)}.`);
      }
    }
    /* eslint-enable react-hooks/set-state-in-effect */
    draftsLoaded.current = true;
    // Runs once per opened editor; later prop changes must not overwrite typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!draftsLoaded.current) return;
    const timer = window.setTimeout(() => {
      writeDraft(EMAIL_DRAFT_KEY, email.subject || email.html ? email : null);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [email]);

  useEffect(() => {
    if (!draftsLoaded.current) return;
    const timer = window.setTimeout(() => {
      writeDraft(SMS_DRAFT_KEY, sms.message || sms.link ? sms : null);
    }, 400);
    return () => window.clearTimeout(timer);
  }, [sms]);

  function discardDraft() {
    if (!confirm("Да изчистя ли черновата и да започна наново?")) return;
    if (tab === "email") {
      setEmail(emptyEmailDraft());
      setShowButton(false);
      writeDraft(EMAIL_DRAFT_KEY, null);
    } else {
      setSms(emptySmsDraft());
      writeDraft(SMS_DRAFT_KEY, null);
    }
    setDraftNote(null);
  }

  /** Last look before anything leaves: who gets it and when. */
  async function confirmSend(
    audience: AudienceInput,
    channel: "email" | "sms",
    scheduledAt: string,
  ): Promise<boolean> {
    const preview = await previewAudience(audience);
    if (!preview.ok) {
      setResult({ ok: false, message: preview.message });
      return false;
    }
    const count = channel === "sms" ? preview.phones : preview.emails;
    if (count === 0) {
      setResult({
        ok: false,
        message:
          channel === "sms"
            ? "Никой в тази аудитория няма телефонен номер."
            : "Няма абонати в тази аудитория.",
      });
      return false;
    }
    const what = channel === "sms" ? "SMS-а" : "имейла";
    const who = `${count} ${channel === "sms" ? (count === 1 ? "номер" : "номера") : count === 1 ? "абонат" : "абоната"} (${preview.label})`;
    const when = scheduledAt
      ? `на ${scheduledAt.replace("T", " в ")} (българско време)`
      : "веднага";
    return confirm(`Да изпратя ли ${what} до ${who} ${when}?\n\nСлед изпращане не може да се върне.`);
  }

  function submitEmail() {
    setResult(null);
    startTransition(async () => {
      if (!(await confirmSend(email.audience, "email", email.scheduled_at))) return;
      const res = await sendEmailCampaign({
        subject: email.subject,
        html: email.html,
        cta_label: email.cta_label || undefined,
        cta_url: email.cta_url || undefined,
        audience: email.audience,
        // Sent as the raw datetime-local value on purpose: the server reads it
        // as Europe/Sofia wall clock, which is what the field promises.
        scheduled_at: email.scheduled_at || undefined,
        attachment_path: email.attachment_path || undefined,
        attachment_filename: email.attachment_filename || undefined,
        hero_image_url: email.hero_image_url || undefined,
        signature_enabled: email.signature_enabled,
      });
      setResult(res);
      if (res.ok) {
        writeDraft(EMAIL_DRAFT_KEY, null);
        draftsLoaded.current = false;
        setEmail(emptyEmailDraft());
        setShowButton(false);
        router.refresh();
        onClose();
      }
    });
  }

  function submitSms() {
    const check = checkSmsCompose(sms.message, sms.link, undefined, { allowMergeTags: false });
    if (!check.ok) {
      setResult({ ok: false, message: check.errors[0] });
      return;
    }

    setResult(null);
    startTransition(async () => {
      if (!(await confirmSend(sms.audience, "sms", sms.scheduled_at))) return;
      const res = await sendSmsCampaign({
        message: buildSmsBody(sms.message, sms.link),
        audience: sms.audience,
        scheduled_at: sms.scheduled_at || undefined,
      });
      setResult(res);
      if (res.ok) {
        writeDraft(SMS_DRAFT_KEY, null);
        draftsLoaded.current = false;
        setSms(emptySmsDraft());
        router.refresh();
        onClose();
      }
    });
  }

  const isEmail = tab === "email";
  const emailReady = Boolean(email.subject && email.html) && workerConfigured;
  const smsCheck = checkSmsCompose(sms.message, sms.link, undefined, { allowMergeTags: false });
  const smsReady = smsCheck.ok && workerConfigured;
  const scheduledAt = isEmail ? email.scheduled_at : sms.scheduled_at;

  return (
    <WorkspaceEditor
      title={isEmail ? "Нова имейл кампания" : "Нова SMS кампания"}
      subtitle={
        scheduledAt
          ? "Ще се изпрати по график — часът е български."
          : "Изпраща се веднага след натискане на бутона."
      }
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={isEmail ? submitEmail : submitSms}
            disabled={pending || (isEmail ? !emailReady : !smsReady)}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 text-sm font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {scheduledAt
              ? isEmail
                ? "Планирай кампанията"
                : "Планирай SMS"
              : "Изпрати сега"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-4 text-sm font-medium hover:bg-ink/5"
          >
            Отказ
          </button>
          {isEmail && (
            <CopyEmailButton
              size="md"
              disabled={pending}
              build={() => {
                const locale = email.audience.locale === "en" ? "en" : "bg";
                const version = copiedVersion({
                  ...email,
                  cta_label: showButton ? email.cta_label : "",
                  cta_url: showButton ? email.cta_url : "",
                });
                if (!version) return null;
                return {
                  v: 1,
                  source: "кампания",
                  name: email.subject.trim() || "кампания",
                  copiedAt: new Date().toISOString(),
                  signature_enabled: email.signature_enabled,
                  bg: locale === "bg" ? version : null,
                  en: locale === "en" ? version : null,
                };
              }}
            />
          )}
          {isEmail && (
            <TestEmailSender
              disabled={pending || !workerConfigured}
              content={{
                subject: email.subject,
                html: email.html,
                cta_label: showButton ? email.cta_label : undefined,
                cta_url: showButton ? email.cta_url : undefined,
                locale: email.audience.locale === "en" ? "en" : "bg",
                attachment_path: email.attachment_path || undefined,
                attachment_filename: email.attachment_filename || undefined,
                hero_image_url: email.hero_image_url || undefined,
                signature_enabled: email.signature_enabled,
              }}
            />
          )}
          {!isEmail && (
            <TestSmsSender
              disabled={pending || !workerConfigured}
              message={sms.message}
              link={sms.link}
              allowMergeTags={false}
            />
          )}
          {draftNote && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink-soft">
              {draftNote}
              <button
                type="button"
                onClick={discardDraft}
                disabled={pending}
                className="font-medium text-coral-600 underline-offset-2 hover:underline disabled:opacity-60"
              >
                Започни наново
              </button>
            </p>
          )}
          {result && !result.ok && (
            <p className="text-sm text-coral-600">{result.message}</p>
          )}
          {!workerConfigured && (
            <p className="text-sm text-ink-soft">
              Липсват worker променливите — изпращането е спряно.
            </p>
          )}
        </>
      }
    >
      {isEmail ? (
        <div className="grid min-w-0 gap-5 xl:grid-cols-12">
          <div className="min-w-0 space-y-5 xl:col-span-7">
            <WorkspacePanel title="Съдържание">
              <div className="space-y-4">
                {(copiedEmail || pasteNote) && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-forest-400/60 bg-forest-50/60 px-3 py-2">
                    <PasteEmailButton
                      copied={copiedEmail}
                      onPaste={(copied) => pasteEmail(copied)}
                      disabled={pending}
                    />
                    {copiedEmail?.bg && copiedEmail?.en && (
                      <>
                        <button
                          type="button"
                          onClick={() => pasteEmail(copiedEmail, "bg")}
                          disabled={pending}
                          className="h-8 rounded-full px-2.5 text-xs font-semibold text-forest-800 hover:bg-forest-100 disabled:opacity-50"
                        >
                          BG версия
                        </button>
                        <button
                          type="button"
                          onClick={() => pasteEmail(copiedEmail, "en")}
                          disabled={pending}
                          className="h-8 rounded-full px-2.5 text-xs font-semibold text-forest-800 hover:bg-forest-100 disabled:opacity-50"
                        >
                          EN версия
                        </button>
                      </>
                    )}
                    {pasteNote && (
                      <p className="min-w-0 flex-1 text-xs text-forest-900">{pasteNote}</p>
                    )}
                  </div>
                )}
                <Field label="Тема">
                  <Input
                    value={email.subject}
                    onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                    placeholder="Новото меню за септември е тук"
                  />
                </Field>
                <EmailBuilder
                  value={email.html}
                  onChange={(html) => setEmail({ ...email, html })}
                  locale={email.audience.locale === "en" ? "en" : "bg"}
                  products={products}
                  guides={guides}
                  forms={forms}
                  heroImageUrl={email.hero_image_url}
                  onHeroImageChange={(hero_image_url) =>
                    setEmail({ ...email, hero_image_url })
                  }
                  attachmentPath={email.attachment_path}
                  attachmentFilename={email.attachment_filename}
                  onAttachmentChange={(attachment_path, attachment_filename) =>
                    setEmail({ ...email, attachment_path, attachment_filename })
                  }
                  disabled={pending}
                />
              </div>
            </WorkspacePanel>

            <WorkspacePanel title="Главен бутон в края">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={showButton}
                  onChange={(e) => {
                    const on = e.target.checked;
                    setShowButton(on);
                    if (!on) setEmail({ ...email, cta_label: "", cta_url: "" });
                  }}
                  className="h-4 w-4 rounded border-ink/20 text-coral-500 focus:ring-coral-500"
                />
                <span className="text-sm font-medium text-ink">
                  Добави бутон със следене на кликове
                </span>
              </label>
              {showButton && (
                <div className="mt-4 space-y-4">
                  <p className="text-xs text-ink-soft/80">
                    Показва се под съдържанието. Линкът може да се смени след
                    изпращане от списъка с кампании — без повторно изпращане.
                    Допълнителни бутони добавяй с „Бутон“ над текста.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Текст на бутона">
                      <Input
                        value={email.cta_label}
                        onChange={(e) =>
                          setEmail({ ...email, cta_label: e.target.value })
                        }
                        placeholder="Виж събитията"
                      />
                    </Field>
                    <Field label="Линк (дестинация)">
                      <Input
                        value={email.cta_url}
                        onChange={(e) => setEmail({ ...email, cta_url: e.target.value })}
                        placeholder="/bg#events или https://www.healthyandconfident.co.uk/bg#contact"
                      />
                    </Field>
                  </div>
                </div>
              )}
            </WorkspacePanel>

            <WorkspacePanel title="Подпис">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={email.signature_enabled}
                  onChange={(e) =>
                    setEmail({ ...email, signature_enabled: e.target.checked })
                  }
                  className="h-4 w-4 rounded border-ink/20 text-coral-500 focus:ring-coral-500"
                />
                <span className="text-sm font-medium text-ink">
                  Включи личния подпис в края на имейла
                </span>
              </label>
              <p className="mt-2 text-xs text-ink-soft/80">
                Изключи, ако тази кампания не трябва да показва подписа от
                „Email подпис“ настройките — останалата част от футъра се
                показва както обикновено.
              </p>
            </WorkspacePanel>

            <WorkspacePanel title="Аудитория">
              <AudiencePicker
                segments={segments}
                groups={groups}
                subscriberTags={subscriberTags}
                value={email.audience}
                onChange={(audience) => setEmail({ ...email, audience })}
                channel="email"
              />
            </WorkspacePanel>

            <WorkspacePanel title="График">
              <Field
                label="Изпращане по график (по избор)"
                hint="Българско време. Празно = изпраща се веднага."
              >
                <Input
                  type="datetime-local"
                  value={email.scheduled_at}
                  onChange={(e) => setEmail({ ...email, scheduled_at: e.target.value })}
                />
              </Field>
            </WorkspacePanel>
          </div>

          <div className="min-w-0 xl:col-span-5">
            {/* One screen tall and sticky: the preview stays in view while the builder scrolls. */}
            <div className="xl:sticky xl:top-4 xl:h-[calc(var(--workspace-body-height,100dvh)-2rem)]">
              <WorkspacePanel
                title="Преглед"
                description="Точно както ще го види абонатът."
                className="xl:flex xl:h-full xl:flex-col"
              >
                <EmailTemplatePreview
                  subject={email.subject}
                  bodyHtml={email.html}
                  ctaLabel={showButton ? email.cta_label : ""}
                  ctaUrl={showButton ? email.cta_url : ""}
                  locale={email.audience.locale === "en" ? "en" : "bg"}
                  products={products}
                  guides={guides}
                  forms={forms}
                  heroImageUrl={email.hero_image_url}
                  height="fill"
                  className="h-[40rem] xl:h-auto xl:min-h-0 xl:flex-1"
                />
              </WorkspacePanel>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <WorkspacePanel title="Съобщение">
            <SmsComposeFields
              message={sms.message}
              link={sms.link}
              onMessageChange={(message) => setSms({ ...sms, message })}
              onLinkChange={(link) => setSms({ ...sms, link })}
              messageHint="Обикновен текст. Отива до абонатите с телефонен номер. Черновата се пази автоматично."
              allowMergeTags={false}
            />
          </WorkspacePanel>

          <div className="space-y-5">
            <WorkspacePanel title="Аудитория">
              <AudiencePicker
                segments={segments}
                groups={groups}
                subscriberTags={subscriberTags}
                value={sms.audience}
                onChange={(audience) => setSms({ ...sms, audience })}
                channel="sms"
              />
            </WorkspacePanel>
            <WorkspacePanel title="График">
              <Field
                label="Изпращане по график (по избор)"
                hint="Българско време. Празно = изпраща се веднага."
              >
                <Input
                  type="datetime-local"
                  value={sms.scheduled_at}
                  onChange={(e) => setSms({ ...sms, scheduled_at: e.target.value })}
                />
              </Field>
            </WorkspacePanel>
          </div>
        </div>
      )}

      {result && (
        <p
          className={cn(
            "mt-4 text-sm",
            result.ok ? "text-forest-600" : "text-coral-600",
          )}
        >
          {result.message}
        </p>
      )}
    </WorkspaceEditor>
  );
}
