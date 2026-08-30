"use client";

import { Field, Input, Textarea } from "@/components/admin/fields";
import {
  checkSmsCompose,
  containsCyrillic,
  type SmsComposeCheck,
} from "@/lib/sms/compose-validation";
import { cn } from "@/lib/utils";

type SmsComposeFieldsProps = {
  message: string;
  link: string;
  onMessageChange: (value: string) => void;
  onLinkChange: (value: string) => void;
  templateVars?: Record<string, string>;
  messageLabel?: string;
  messageHint?: string;
  linkLabel?: string;
  linkHint?: string;
  showPreview?: boolean;
};

export function SmsComposeFields({
  message,
  link,
  onMessageChange,
  onLinkChange,
  templateVars,
  messageLabel = "Текст",
  messageHint = "Обикновен текст. {{name}} и {{email}} се заменят при изпращане.",
  linkLabel = "Tracked link",
  linkHint = "Пълен https:// адрес — worker-ът го съкращава автоматично (~24 символа).",
  showPreview = true,
}: SmsComposeFieldsProps) {
  const check = checkSmsCompose(message, link, templateVars);

  return (
    <div className="space-y-4">
      <Field label={messageLabel} hint={messageHint}>
        <Textarea
          rows={6}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          aria-invalid={!check.ok}
        />
      </Field>

      <Field label={linkLabel} hint={linkHint}>
        <Input
          type="url"
          inputMode="url"
          placeholder="https://example.com/page"
          value={link}
          onChange={(e) => onLinkChange(e.target.value)}
          aria-invalid={Boolean(link.trim() && !check.hasLink && check.errors.length > 0)}
        />
      </Field>

      <SmsComposeSummary check={check} showPreview={showPreview} />
    </div>
  );
}

export function SmsComposeSummary({
  check,
  showPreview = true,
}: {
  check: SmsComposeCheck;
  showPreview?: boolean;
}) {
  const counterTone =
    check.remaining < 0
      ? "text-red-700"
      : check.remaining <= 10
        ? "text-amber-700"
        : "text-ink-soft";

  return (
    <div className="space-y-2 rounded-xl border border-ink/10 bg-ink/[0.02] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
        <span className={cn("font-medium", counterTone)}>
          {check.length}/{check.limit} символа (след shorten)
        </span>
        <span className="text-ink-soft">
          {containsCyrillic(check.preparedForSend) ? "кирилица · лимит 70" : "латиница · лимит 160"}
        </span>
        {check.hasLink ? (
          <span className="rounded-full bg-forest-100 px-2 py-0.5 text-forest-800">
            ✓ линк
          </span>
        ) : (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">
            без линк
          </span>
        )}
      </div>

      {check.errors.map((error) => (
        <p key={error} className="text-xs text-red-700">
          {error}
        </p>
      ))}

      {check.warnings.map((warning) => (
        <p key={warning} className="text-xs text-amber-800">
          {warning}
        </p>
      ))}

      {showPreview && check.preparedForSend ? (
        <details className="text-xs text-ink-soft">
          <summary className="cursor-pointer select-none">Преглед след shorten</summary>
          <p className="mt-2 whitespace-pre-wrap rounded-lg bg-white px-3 py-2 text-ink">
            {previewWithShortUrls(check.preparedForSend)}
          </p>
        </details>
      ) : null}
    </div>
  );
}

function previewWithShortUrls(text: string): string {
  return text.replace(/https?:\/\/[^\s<>"']+/gi, "https://ntf.io/xxxxxxxx");
}

export function smsComposeErrorMessage(check: SmsComposeCheck): string | null {
  if (check.ok) {
    return null;
  }
  return check.errors[0] ?? "SMS-ът не минава валидацията.";
}
