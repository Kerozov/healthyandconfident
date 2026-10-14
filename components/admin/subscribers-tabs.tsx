"use client";

import { useState } from "react";
import { UserMinus, Users } from "lucide-react";
import { TabList } from "@/components/admin/ui";
import { InactiveSubscribersPanel } from "@/components/admin/inactive-subscribers-panel";

/** "Всички" keeps the full list screen; "Неактивни" loads its data only when opened. */
export function SubscribersTabs({ children }: { children: React.ReactNode }) {
  const [tab, setTab] = useState<"all" | "inactive">("all");

  return (
    <div className="space-y-6">
      <TabList
        aria-label="Изглед на абонатите"
        active={tab}
        onChange={(id) => setTab(id as "all" | "inactive")}
        contentId="subscribers-tabs-panel"
        tabs={[
          { id: "all", label: "Всички", icon: <Users className="h-4 w-4" aria-hidden /> },
          {
            id: "inactive",
            label: "Неактивни",
            icon: <UserMinus className="h-4 w-4" aria-hidden />,
          },
        ]}
      />
      <div id="subscribers-tabs-panel">
        {tab === "all" ? children : <InactiveSubscribersPanel />}
      </div>
    </div>
  );
}
