import { createSignal, For, Show } from "solid-js";
import { locale, setLocale, localeLabels, localeList, type Locale } from "../shared/i18n";

export function LanguageSwitcher(props: { compact?: boolean }) {
  const [open, setOpen] = createSignal(false);

  const currentLabel = () => {
    const l = locale();
    return props.compact ? l.toUpperCase().slice(0, 2) : localeLabels[l];
  };

  let ref: HTMLDivElement | undefined;

  function handleClickOutside(e: MouseEvent) {
    if (ref && !ref.contains(e.target as Node)) setOpen(false);
  }

  function toggle() {
    const willOpen = !open();
    setOpen(willOpen);
    if (willOpen) {
      document.addEventListener("click", handleClickOutside, { once: true });
    }
  }

  function select(l: Locale) {
    setLocale(l);
    setOpen(false);
  }

  return (
    <div ref={ref} class="relative">
      <button
        type="button"
        class="flex items-center gap-1 px-2 py-1.5 rounded-md text-xs transition-colors hover:bg-white/10"
        classList={{
          "text-[#8b949e] hover:text-[#e6edf3]": !props.compact,
          "text-[#8b949e]": props.compact,
        }}
        onClick={(e) => { e.stopPropagation(); toggle(); }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
        </svg>
        <span>{currentLabel()}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
      </button>

      <Show when={open()}>
        <div class="absolute right-0 top-full mt-1 bg-[#161b22] border border-[#30363d] rounded-lg shadow-xl z-[100] min-w-[130px] py-1 overflow-hidden">
          <For each={localeList}>
            {(l) => (
              <button
                type="button"
                class="w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between"
                classList={{
                  "bg-[#00f0ff]/10 text-[#00f0ff]": locale() === l,
                  "text-[#e6edf3] hover:bg-white/5": locale() !== l,
                }}
                onClick={() => select(l)}
              >
                <span>{localeLabels[l]}</span>
                <Show when={locale() === l}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                </Show>
              </button>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}
