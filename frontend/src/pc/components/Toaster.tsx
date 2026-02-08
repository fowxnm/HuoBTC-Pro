import { createSignal } from "solid-js";
import { Show } from "solid-js";

const [toast, setToast] = createSignal<{ text: string; type: "info" | "error" } | null>(null);

export function Toaster() {
  return (
    <Show when={toast()}>
      {(t) => (
        <div
          class="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 rounded-lg shadow-lg text-sm animate-[fadeIn_0.2s_ease-out]"
          classList={{
            "bg-[#00f0ff]/20 text-[#00f0ff] border border-[#00f0ff]/40": t().type === "info",
            "bg-[#FF4834]/20 text-[#FF4834] border border-[#FF4834]/40": t().type === "error",
          }}
        >
          {t().text}
        </div>
      )}
    </Show>
  );
}

export function showToast(text: string, type: "info" | "error" = "info") {
  setToast({ text, type });
  setTimeout(() => setToast(null), 3000);
}
