"use client";

import { useEffect, useState } from "react";
import { listAcademyCourses } from "@/app/(admin)/admin/academy-actions";
import { Field, Select } from "@/components/admin/fields";
import { ACADEMY_ALL_PROGRAMS, ACADEMY_CODES_ENABLED } from "@/lib/academy/product";

type Schools = { slug: string; name: string; courses: { ref: string; title: string }[] }[];

/**
 * Whether a buyer of this product gets a course code from the academy, and for
 * which course. The value is `""` (no code), `"*"` (every program) or what the
 * picked entry sends to the academy: a course's ref or a school's slug. The
 * owner picks a course by name — nothing is typed. The code goes into emails
 * as `{{course_code}}`.
 */
export function AcademyProductField(props: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return ACADEMY_CODES_ENABLED ? <AcademyProductFieldOn {...props} /> : null;
}

function AcademyProductFieldOn({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const on = value.trim() !== "";
  const [schools, setSchools] = useState<Schools | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!on || schools) return;
    let live = true;
    listAcademyCourses()
      .then((res) => {
        if (!live) return;
        if (res.ok) setSchools(res.schools);
        else setError(res.message);
      })
      .catch(() => live && setError("Курсовете не се заредиха. Опитай пак."));
    return () => {
      live = false;
    };
  }, [on, schools]);

  const current = value.trim().toLowerCase();
  const known =
    current === ACADEMY_ALL_PROGRAMS ||
    (schools ?? []).some((s) => s.slug === current || s.courses.some((c) => c.ref === current));

  return (
    <div className="rounded-xl border border-forest-500/20 bg-forest-50/30 p-4 space-y-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-forest-800">
        <input
          type="checkbox"
          checked={on}
          onChange={(e) => onChange(e.target.checked ? ACADEMY_ALL_PROGRAMS : "")}
          disabled={disabled}
        />
        Купувачът получава код за курс от академията
      </label>
      {on ? (
        <>
          <Field label="Кой курс отключва" htmlFor="academy-product">
            <Select
              id="academy-product"
              value={current}
              onChange={(e) => onChange(e.target.value)}
              disabled={disabled}
            >
              <option value={ACADEMY_ALL_PROGRAMS}>Всички програми</option>
              {(schools ?? []).map((school) => (
                <optgroup key={school.slug} label={school.name}>
                  {(schools ?? []).length > 1 ? (
                    <option value={school.slug}>Всички програми в „{school.name}“</option>
                  ) : null}
                  {school.courses.map((course) => (
                    <option key={course.ref} value={course.ref}>
                      {course.title}
                    </option>
                  ))}
                </optgroup>
              ))}
              {!known ? (
                <option value={current}>{schools ? `Избраното досега (${current})` : "Зареждам…"}</option>
              ) : null}
            </Select>
          </Field>
          {!schools && !error ? <p className="text-xs text-ink-soft">Зареждам курсовете от академията…</p> : null}
          {error ? <p className="text-xs text-red-700">{error}</p> : null}
          <p className="text-xs text-ink-soft">
            В имейла на автоматизацията „Покупка“ кодът се слага с {"{{course_code}}"}.
          </p>
        </>
      ) : null}
    </div>
  );
}
