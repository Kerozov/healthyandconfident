/** Shared by the server page and the interactive tabs. */
export const SUBSCRIBER_TABS = [
  "contacts",
  "groups",
  "sync",
  "add",
  "inactive",
  "statuses",
] as const;

export type SubscriberTab = (typeof SUBSCRIBER_TABS)[number];
