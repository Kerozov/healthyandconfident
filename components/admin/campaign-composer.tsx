"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import type { AudienceInput, Segment } from "@/lib/supabase/types";
import {
  sendEmailCampaign,
  sendSmsCampaign,
} from "@/app/(admin)/admin/actions";
import { AudiencePicker, EMPTY_AUDIENCE } from "@/components/admin/audience-picker";
import { Field, Input, Textarea, Card } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

export function CampaignComposer({
  segments,
  subscriberTags,
  workerConfigured,
  tab,
}: {
  segments: Segment[];
  subscriberTags: string[];
  workerConfigured: boolean;
  tab: "email" | "sms";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const [email, setEmail] = useState({
    subject: "",
    html: "",
    audience: { ...EMPTY_AUDIENCE } as AudienceInput,
    scheduled_at: "",
  });
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
        audience: email.audience,
        scheduled_at: email.scheduled_at || undefined,
      });
      setResult(res);
      if (res.ok) {
        setEmail({
          subject: "",
          html: "",
          audience: { ...EMPTY_AUDIENCE },
          scheduled_at: "",
        });
        router.refresh();
      }
    });
  }

  function submitSms() {
    setResult(null);
    startTransition(async () => {
      const res = await sendSmsCampaign({
        message: sms.message,
        audience: sms.audience,
        scheduled_at: sms.scheduled_at || undefined,
      });
      setResult(res);
      if (res.ok) {
        setSms({ message: "", audience: { ...EMPTY_AUDIENCE }, scheduled_at: "" });
        router.refresh();
      }
    });
  }

  return (
    <Card>
      {tab === "email" ? (
        <div className="space-y-4">
          {!workerConfigured && (
            <p className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
              Set <code>NOTIFICATION_WORKER_URL</code>,{" "}
              <code>NOTIFICATION_WORKER_API_KEY</code> and{" "}
              <code>NOTIFICATION_WORKER_FROM</code> in .env
            </p>
          )}
          <Field label="Subject">
            <Input
              value={email.subject}
              onChange={(e) => setEmail({ ...email, subject: e.target.value })}
            />
          </Field>
          <Field label="HTML body" hint="Full HTML. Open tracking is automatic.">
            <Textarea
              rows={10}
              value={email.html}
              onChange={(e) => setEmail({ ...email, html: e.target.value })}
              className="font-mono text-[13px]"
              placeholder="<h1>Hi!</h1><p>...</p>"
            />
          </Field>
          <AudiencePicker
            segments={segments}
            subscriberTags={subscriberTags}
            value={email.audience}
            onChange={(audience) => setEmail({ ...email, audience })}
            channel="email"
          />
          <Field label="Schedule (optional)">
            <Input
              type="datetime-local"
              value={email.scheduled_at}
              onChange={(e) => setEmail({ ...email, scheduled_at: e.target.value })}
            />
          </Field>
          <button
            onClick={submitEmail}
            disabled={pending || !email.subject || !email.html || !workerConfigured}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {email.scheduled_at ? "Schedule campaign" : "Send now"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!workerConfigured && (
            <p className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
              Same worker env vars as email. SMS Notifier key is in notification-worker
              tenant seed.
            </p>
          )}
          <Field label="Message" hint="Plain text. Sent to subscribers with a phone number.">
            <Textarea
              rows={4}
              value={sms.message}
              onChange={(e) => setSms({ ...sms, message: e.target.value })}
            />
          </Field>
          <AudiencePicker
            segments={segments}
            subscriberTags={subscriberTags}
            value={sms.audience}
            onChange={(audience) => setSms({ ...sms, audience })}
            channel="sms"
          />
          <Field label="Schedule (optional)" hint="Leave empty to send immediately.">
            <Input
              type="datetime-local"
              value={sms.scheduled_at}
              onChange={(e) => setSms({ ...sms, scheduled_at: e.target.value })}
            />
          </Field>
          <button
            onClick={submitSms}
            disabled={pending || !sms.message || !workerConfigured}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {sms.scheduled_at ? "Schedule SMS" : "Send now"}
          </button>
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
    </Card>
  );
}
