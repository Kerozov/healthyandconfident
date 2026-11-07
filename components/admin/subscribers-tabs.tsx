"use client";

import { useState } from "react";
import { BadgeCheck, FolderTree, RefreshCw, UserMinus, UserPlus, Users } from "lucide-react";
import { TabList } from "@/components/admin/ui";
import { InactiveSubscribersPanel } from "@/components/admin/inactive-subscribers-panel";

export const SUBSCRIBER_TABS = [
  "contacts",
  "groups",
  "sync",
  "add",
  "inactive",
  "statuses",
] as const;

export type SubscriberTab = (typeof SUBSCRIBER_TABS)[number];

/**
 * One screen, one job per tab. The contacts table opens first; groups, the
 * Launchify sync, adding/importing and the statuses each get their own tab
 * instead of stacking above the list.
 */
export function SubscribersTabs({
  initialTab,
  isOwner,
  contactCount,
  contacts,
  groups,
  sync,
  add,
  statuses,
}: {
  initialTab: SubscriberTab;
  isOwner: boolean;
  contactCount: number;
  contacts: React.ReactNode;
  groups: React.ReactNode;
  sync: React.ReactNode;
  add: React.ReactNode;
  statuses: React.ReactNode;
}) {
  const [tab, setTab] = useState<SubscriberTab>(
    initialTab === "statuses" && !isOwner ? "contacts" : initialTab,
  );

  function change(id: string) {
    const next = id as SubscriberTab;
    setTab(next);
    const params = new URLSearchParams(window.location.search);
    if (next === "contacts") params.delete("tab");
    else params.set("tab", next);
    const qs = params.toString();
    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
  }

  const tabs = [
    {
      id: "contacts",
      label: "Контакти",
      icon: <Users className="h-4 w-4" aria-hidden />,
      count: contactCount,
    },
    { id: "groups", label: "Групи", icon: <FolderTree className="h-4 w-4" aria-hidden /> },
    { id: "sync", label: "Launchify", icon: <RefreshCw className="h-4 w-4" aria-hidden /> },
    { id: "add", label: "Добави / импорт", icon: <UserPlus className="h-4 w-4" aria-hidden /> },
    { id: "inactive", label: "Неактивни", icon: <UserMinus className="h-4 w-4" aria-hidden /> },
    ...(isOwner
      ? [{ id: "statuses", label: "Статуси", icon: <BadgeCheck className="h-4 w-4" aria-hidden /> }]
      : []),
  ];

  return (
    <div className="space-y-6">
      <TabList
        aria-label="Раздели на абонатите"
        active={tab}
        onChange={change}
        contentId="subscribers-tabs-panel"
        tabs={tabs}
      />
      <div id="subscribers-tabs-panel" className="scroll-mt-20">
        {/* Kept mounted so filters and the page survive a trip to another tab. */}
        <div hidden={tab !== "contacts"}>{contacts}</div>
        <div hidden={tab !== "groups"}>{groups}</div>
        <div hidden={tab !== "sync"}>{sync}</div>
        <div hidden={tab !== "add"}>{add}</div>
        {tab === "inactive" && <InactiveSubscribersPanel />}
        {isOwner && <div hidden={tab !== "statuses"}>{statuses}</div>}
      </div>
    </div>
  );
}
