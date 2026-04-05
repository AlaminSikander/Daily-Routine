"use client";

import { useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Return false to keep the modal open (e.g. request failed). */
  onConfirm: () => void | Promise<boolean | void>;
  danger?: boolean;
};

export function ConfirmModal({
  open,
  onClose,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  danger = true,
}: Props) {
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  if (!open) return null;

  async function handleConfirm() {
    setBusy(true);
    try {
      const result = await onConfirm();
      if (result !== false) onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
      >
        <h2
          id="confirm-modal-title"
          className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
        >
          {title}
        </h2>
        <p
          id="confirm-modal-desc"
          className="mt-2 text-sm text-zinc-600 dark:text-zinc-300"
        >
          {description}
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-600 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleConfirm()}
            className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${
              danger
                ? "bg-red-600 hover:bg-red-500"
                : "bg-indigo-600 hover:bg-indigo-500"
            }`}
          >
            {busy ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
