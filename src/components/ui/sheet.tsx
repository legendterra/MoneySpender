"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion } from "framer-motion";
import { X } from "lucide-react";
import { useTranslations } from "next-intl";

import { IconButton } from "@/components/ui/icon-button";
import { useIsClient, useMediaQuery } from "@/components/ui/use-media-query";
import { cn } from "@/lib/utils";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusableIn(root: HTMLElement) {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.getClientRects().length > 0 && !el.closest("[inert]"),
  );
}

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Keep the title for screen readers but do not show it. */
  hideTitle?: boolean;
  children: React.ReactNode;
  /** Pinned below the scrollable body (e.g. the Save button). */
  footer?: React.ReactNode;
  /** Controls rendered left of the close button; fills the row when `hideTitle` is set. */
  headerAction?: React.ReactNode;
  size?: "sm" | "md" | "lg";
  /** Element to focus on open. Defaults to the dialog itself (no mobile keyboard pop-up). */
  initialFocusRef?: React.RefObject<HTMLElement | null>;
  className?: string;
  bodyClassName?: string;
  /** Render in place without a portal or overlay (UI gallery previews). */
  inline?: boolean;
};

const widths = { sm: "md:max-w-[400px]", md: "md:max-w-[460px]", lg: "md:max-w-[620px]" } as const;

/**
 * Bottom sheet below 768px, centered dialog from 768px. Focus is trapped, Esc and
 * the overlay close it, and on touch the sheet can be swiped down by its handle.
 */
export function Sheet(props: SheetProps) {
  const isClient = useIsClient();
  if (props.inline) return <SheetPanel {...props} />;
  if (!isClient) return null;
  return createPortal(
    <AnimatePresence>{props.open ? <SheetModal key="sheet" {...props} /> : null}</AnimatePresence>,
    document.body,
  );
}

function SheetModal(props: SheetProps) {
  const { onOpenChange } = props;
  const reduceMotion = useReducedMotion();

  React.useEffect(() => {
    const { body, documentElement } = document;
    const previous = body.style.overflow;
    const previousHtml = documentElement.style.overflow;
    body.style.overflow = "hidden";
    documentElement.style.overflow = "hidden";
    return () => {
      body.style.overflow = previous;
      documentElement.style.overflow = previousHtml;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center md:items-center md:p-6">
      <motion.div
        aria-hidden="true"
        className="absolute inset-0 bg-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        onClick={() => onOpenChange(false)}
      />
      <SheetPanel {...props} />
    </div>
  );
}

function SheetPanel({
  open,
  onOpenChange,
  title,
  description,
  hideTitle,
  children,
  footer,
  headerAction,
  size = "md",
  initialFocusRef,
  className,
  bodyClassName,
  inline,
}: SheetProps) {
  const t = useTranslations("ui");
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const reduceMotion = useReducedMotion();
  const dragControls = useDragControls();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();

  React.useEffect(() => {
    if (inline || !open) return;
    // Document-level so Esc works even if focus left the panel. Inner widgets that
    // handle Esc themselves call stopPropagation() and this never sees the event.
    function onEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && !event.defaultPrevented) onOpenChange(false);
    }
    document.addEventListener("keydown", onEscape);
    return () => document.removeEventListener("keydown", onEscape);
  }, [inline, open, onOpenChange]);

  React.useEffect(() => {
    if (inline || !open) return;
    const restoreTo = document.activeElement as HTMLElement | null;
    const frame = window.requestAnimationFrame(() => {
      (initialFocusRef?.current ?? panelRef.current)?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      if (restoreTo && document.contains(restoreTo)) restoreTo.focus({ preventScroll: true });
    };
  }, [inline, open, initialFocusRef]);

  function onKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (inline || event.key !== "Tab" || !panelRef.current) return;
    const items = focusableIn(panelRef.current);
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || active === panelRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  const mobileMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { y: "100%" }, animate: { y: 0 }, exit: { y: "100%" } };
  const desktopMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.97, y: 8 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.98, y: 4 },
      };
  const motionProps = inline ? {} : isDesktop ? desktopMotion : mobileMotion;
  const canDrag = !inline && !isDesktop;

  return (
    <motion.div
      ref={panelRef}
      role="dialog"
      aria-modal={inline ? undefined : true}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      {...motionProps}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { type: "spring", stiffness: 420, damping: 40, mass: 0.9 }
      }
      drag={canDrag ? "y" : false}
      dragControls={dragControls}
      dragListener={false}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0, bottom: 0.65 }}
      onDragEnd={(_, info) => {
        if (info.offset.y > 110 || info.velocity.y > 650) onOpenChange(false);
      }}
      className={cn(
        "relative flex w-full flex-col overflow-hidden border-line bg-surface outline-none",
        inline
          ? "max-h-none rounded-sheet border"
          : "max-h-[calc(100dvh-max(16px,env(safe-area-inset-top)))] rounded-t-[26px] border-t shadow-sheet md:max-h-[min(86dvh,820px)] md:rounded-sheet md:border",
        widths[size],
        className,
      )}
    >
      <div
        className={cn("shrink-0 px-4 pt-2 md:px-6 md:pt-5", canDrag && "touch-none")}
        onPointerDown={canDrag ? (event) => dragControls.start(event) : undefined}
      >
        <div aria-hidden="true" className="mx-auto mb-2 h-1 w-10 rounded-full bg-line-strong md:hidden" />
        <div className="flex min-h-11 items-center gap-2">
          <div className={cn(hideTitle ? "sr-only" : "min-w-0 flex-1")}>
            <h2 id={titleId} className="truncate text-[17px] font-semibold tracking-tight text-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="truncate text-[13px] text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {headerAction ? (
            <div className={cn("flex items-center gap-2", hideTitle && "min-w-0 flex-1")}>{headerAction}</div>
          ) : null}
          {!inline ? (
            <IconButton label={t("close")} onClick={() => onOpenChange(false)} className="-mr-1.5">
              <X aria-hidden="true" />
            </IconButton>
          ) : null}
        </div>
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 md:px-6",
          !footer && "pb-[max(16px,env(safe-area-inset-bottom))] md:pb-6",
          bodyClassName,
        )}
      >
        {children}
      </div>
      {footer ? (
        <div className="shrink-0 border-t border-line bg-surface px-4 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] md:px-6 md:pb-5">
          {footer}
        </div>
      ) : null}
    </motion.div>
  );
}
