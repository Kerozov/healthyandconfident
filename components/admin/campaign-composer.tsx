"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import type { AudienceInput, Segment, SegmentGroup, SiteProduct } from "@/lib/supabase/types";
import type { FormTemplateRecord } from "@/lib/forms/types";
import {
  sendEmailCampaign,
  sendSmsCampaign,
} from "@/app/(admin)/admin/actions";
import { AudiencePicker, EMPTY_AUDIENCE } from "@/components/admin/audience-picker";
import { EmailTemplatePreview } from "@/components/admin/email-template-preview";
import { EmailEmbedsPanel } from "@/components/admin/email-embeds-panel";
import { EmailBodyEditor } from "@/components/admin/email-body-editor";
import { Field, Input, Textarea } from "@/components/admin/fields";
import { WorkspaceEditor, WorkspacePanel } from "@/components/admin/workspace-editor";
import { datetimeLocalToIso } from "@/lib/datetime";
import { cn } from "@/lib/utils";

export function CampaignComposer({
  segments,
  groups,
  products,
  forms,
  subscriberTags,
  workerConfigured,
  tab,
  onClose,
}: {
  segments: Segment[];
  groups: SegmentGroup[];
  products: SiteProduct[];
  forms: FormTemplateRecord[];
  subscriberTags: string[];
  workerConfigured: boolean;
  tab: "email" | "sms";
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const [email, setEmail] = useState({
    subject: "",
    html: "",
    cta_label: "",
    cta_url: "",
    attachment_path: "",
    attachment_filename: "",
    hero_image_url: "",
    audience: { ...EMPTY_AUDIENCE } as AudienceInput,
    scheduled_at: "",
  });
  const [showButton, setShowButton] = useState(false);
  const [sms, setSms] = useState({
    message: "",
    audience: { ...EMPTY_AUDIENCE } as AudienceInput,
    scheduled_at: "",
  });

  function submitEmail() {
    setResult(null);
    startTransition(async () => {
      const res = await sendEmailCampaign({
        subject: email.subject,
        html: email.html,
        cta_label: email.cta_label || undefined,
        cta_url: email.cta_url || undefined,
        audience: email.audience,
        scheduled_at: email.scheduled_at
          ? datetimeLocalToIso(email.scheduled_at) ?? undefined
          : undefined,
        attachment_path: email.attachment_path || undefined,
        attachment_filename: email.attachment_filename || undefined,
        hero_image_url: email.hero_image_url || undefined,
      });
      setResult(res);
      if (res.ok) {
        setEmail({
          subject: "",
          html: "",
          cta_label: "",
          cta_url: "",
          attachment_path: "",
          attachment_filename: "",
          hero_image_url: "",
          audience: { ...EMPTY_AUDIENCE },
          scheduled_at: "",
        });
        setShowButton(false);
        router.refresh();
        onClose();
      }
    });
  }

  function submitSms() {
    setResult(null);
    startTransition(async () => {
      const res = await sendSmsCampaign({
        message: sms.message,
        audience: sms.audience,
        scheduled_at: sms.scheduled_at
          ? datetimeLocalToIso(sms.scheduled_at) ?? undefined
          : undefined,
      });
      setResult(res);
      if (res.ok) {
        setSms({ message: "", audience: { ...EMPTY_AUDIENCE }, scheduled_at: "" });
        router.refresh();
        onClose();
      }
    });
  }

  const isEmail = tab === "email";
  const emailReady = Boolean(email.subject && email.html) && workerConfigured;
  const smsReady = Boolean(sms.message) && workerConfigured;
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
                <Field label="Тема">
                  <Input
                    value={email.subject}
                    onChange={(e) => setEmail({ ...email, subject: e.target.value })}
                    placeholder="Новото меню за септември е тук"
                  />
                </Field>
                <EmailBodyEditor
                  value={email.html}
                  onChange={(html) => setEmail({ ...email, html })}
                  disabled={pending}
                />
                <EmailEmbedsPanel
                  locale={email.audience.locale === "en" ? "en" : "bg"}
                  html={email.html}
                  onHtmlChange={(html) => setEmail({ ...email, html })}
                  products={products}
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
            <div className="xl:sticky xl:top-4">
              <WorkspacePanel title="Преглед" description="Точно както ще го види абонатът.">
                <EmailTemplatePreview
                  bodyHtml={email.html}
                  ctaLabel={showButton ? email.cta_label : ""}
                  ctaUrl={showButton ? email.cta_url : ""}
                  locale={email.audience.locale === "en" ? "en" : "bg"}
                  products={products}
                  forms={forms}
                  heroImageUrl={email.hero_image_url}
                />
              </WorkspacePanel>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <WorkspacePanel title="Съобщение">
            <Field
              label="Текст"
              hint="Обикновен текст. Отива до абонатите с телефонен номер."
            >
              <Textarea
                rows={6}
                value={sms.message}
                onChange={(e) => setSms({ ...sms, message: e.target.value })}
              />
            </Field>
            <p className="mt-2 text-xs text-ink-soft">
              {sms.message.length} знака ·{" "}
              {Math.max(1, Math.ceil(sms.message.length / 160))} SMS на получател
            </p>
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
