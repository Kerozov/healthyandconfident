"use client";

import { useId } from "react";
import { Field, Input } from "@/components/admin/fields";
import type { ThankYouButton } from "@/lib/site/thank-you-button";

export function ThankYouButtonFields({
  value,
  onChange,
}: {
  value?: ThankYouButton | null;
  onChange: (value: ThankYouButton) => void;
}) {
  const id = useId();
  return (
    <div className="space-y-3">
      <Field label="Текст на бутона" htmlFor={`${id}-label`}>
        <Input
          id={`${id}-label`}
          value={value?.label ?? ""}
          onChange={(e) => onChange({ href: value?.href ?? "", label: e.target.value })}
          placeholder="Например: Виж програмите"
        />
      </Field>
      <Field
        label="Линк на бутона"
        htmlFor={`${id}-href`}
        hint="Външен адрес (https://…) или страница от сайта (/bg/… или /en/…). Изчисти и двете полета, за да премахнеш бутона."
      >
        <Input
          id={`${id}-href`}
          value={value?.href ?? ""}
          onChange={(e) => onChange({ label: value?.label ?? "", href: e.target.value })}
          placeholder="https://… или /bg/programs"
        />
      </Field>
    </div>
  );
}
