"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, MessageSquare, Send } from "lucide-react";
import type { Segment } from "@/lib/supabase/types";
import {
  sendEmailCampaign,
  sendSmsCampaign,
} from "@/app/(admin)/admin/actions";
import { Field, Input, Textarea, Select, Card } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

export function CampaignComposer({
  segments,
  smsConfigured,
}: {
  segments: Segment[];
  smsConfigured: boolean;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"email" | "sms">("email");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message?: string } | null>(null);

  const [email, setEmail] = useState({
    subject: "",
    html: "",
    segment_tag: "all",
    locale: "" as "" | "bg" | "en",
    scheduled_at: "",
  });
  const [sms, setSms] = useState({
    message: "",
    segment_tag: "all",
    locale: "" as "" | "bg" | "en",
  });

  function submitEmail() {
    setResult(null);
    startTransition(async () => {
      const res = await sendEmailCampaign(email);
      setResult(res);
      if (res.ok) {
        setEmail({ subject: "", html: "", segment_tag: "all", locale: "", scheduled_at: "" });
        router.refresh();
      }
    });
  }

  function submitSms() {
    setResult(null);
    startTransition(async () => {
      const res = await sendSmsCampaign(sms);
      setResult(res);
      if (res.ok) {
        setSms({ message: "", segment_tag: "all", locale: "" });
        router.refresh();
      }
    });
  }

  return (
    <Card>
      <div className="mb-5 inline-flex rounded-full border border-ink/10 p-1">
        <button
          onClick={() => setTab("email")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
            tab === "email" ? "bg-forest-600 text-cream" : "text-ink-soft",
          )}
        >
          <Mail className="h-4 w-4" /> Email
        </button>
        <button
          onClick={() => setTab("sms")}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold",
            tab === "sms" ? "bg-forest-600 text-cream" : "text-ink-soft",
          )}
        >
          <MessageSquare className="h-4 w-4" /> SMS
        </button>
      </div>

      {tab === "email" ? (
        <div className="space-y-4">
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
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Segment">
              <Select
                value={email.segment_tag}
                onChange={(e) => setEmail({ ...email, segment_tag: e.target.value })}
              >
                {segments.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language">
              <Select
                value={email.locale}
                onChange={(e) =>
                  setEmail({ ...email, locale: e.target.value as "" | "bg" | "en" })
                }
              >
                <option value="">All languages</option>
                <option value="bg">BG only</option>
                <option value="en">EN only</option>
              </Select>
            </Field>
            <Field label="Schedule (optional)">
              <Input
                type="datetime-local"
                value={email.scheduled_at}
                onChange={(e) => setEmail({ ...email, scheduled_at: e.target.value })}
              />
            </Field>
          </div>
          <button
            onClick={submitEmail}
            disabled={pending || !email.subject || !email.html}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {email.scheduled_at ? "Schedule campaign" : "Send now"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {!smsConfigured && (
            <p className="rounded-xl bg-gold-400/15 px-4 py-3 text-sm text-ink-soft">
              SMS notifier is not configured yet. Set <code>SMS_NOTIFIER_URL</code> and{" "}
              <code>SMS_NOTIFIER_API_KEY</code> to enable sending. You can still draft here.
            </p>
          )}
          <Field label="Message" hint="Plain text. Sent to subscribers with a phone number.">
            <Textarea
              rows={4}
              value={sms.message}
              onChange={(e) => setSms({ ...sms, message: e.target.value })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Segment">
              <Select
                value={sms.segment_tag}
                onChange={(e) => setSms({ ...sms, segment_tag: e.target.value })}
              >
                {segments.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Language">
              <Select
                value={sms.locale}
                onChange={(e) =>
                  setSms({ ...sms, locale: e.target.value as "" | "bg" | "en" })
                }
              >
                <option value="">All languages</option>
                <option value="bg">BG only</option>
                <option value="en">EN only</option>
              </Select>
            </Field>
          </div>
          <button
            onClick={submitSms}
            disabled={pending || !sms.message}
            className="inline-flex h-11 items-center gap-2 rounded-full bg-coral-500 px-6 font-semibold text-white hover:bg-coral-600 disabled:opacity-60"
          >
            <Send className="h-4 w-4" /> Send SMS
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
