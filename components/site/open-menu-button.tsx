"use client";

import type { ComponentProps } from "react";
import { Button } from "@/components/ui/button";
import { useMenuPopup } from "@/components/site/menu-popup";
import { cn } from "@/lib/utils";

type ButtonProps = ComponentProps<typeof Button>;

export function OpenMenuButton({
  source = "menu-button",
  className,
  children,
  onClick,
  ...props
}: Omit<ButtonProps, "href" | "onClick"> & {
  source?: string;
  onClick?: () => void;
}) {
  const { openMenuPopup } = useMenuPopup();

  return (
    <Button
      type="button"
      className={cn(className)}
      onClick={() => {
        openMenuPopup(source);
        onClick?.();
      }}
      {...props}
    >
      {children}
    </Button>
  );
}
