import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Contact } from "@/lib/contacts/types";

/** Ensure a contact row exists for a subscriber (contact.id === subscriber.id). */
export async function ensureContactForSubscriber(input: {
  subscriberId: string;
  email: string;
  name?: string | null;
}): Promise<Contact> {
  const supabase = getAdminClient();
  const email = input.email.trim().toLowerCase();

  const { data: existing } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", input.subscriberId)
    .maybeSingle();

  if (existing) {
    return existing as Contact;
  }

  const { data: inserted, error } = await supabase
    .from("contacts")
    .insert({
      id: input.subscriberId,
      email,
      name: input.name?.trim() || null,
    })
    .select("*")
    .single();

  if (error) {
    const { data: retry } = await supabase
      .from("contacts")
      .select("*")
      .eq("id", input.subscriberId)
      .maybeSingle();
    if (retry) return retry as Contact;
    throw new Error(error.message);
  }

  return inserted as Contact;
}

export async function getContactById(contactId: string): Promise<Contact | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", contactId)
    .maybeSingle();
  return (data as Contact | null) ?? null;
}

export async function getContactByEmail(email: string): Promise<Contact | null> {
  const supabase = getAdminClient();
  const { data } = await supabase
    .from("contacts")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return (data as Contact | null) ?? null;
}
