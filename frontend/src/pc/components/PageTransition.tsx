import type { JSX } from "solid-js";
import { onMount } from "solid-js";

interface Props {
  children: JSX.Element;
}

export function PageTransition(props: Props) {
  let ref: HTMLDivElement | undefined;
  onMount(() => {
    if (!ref) return;
    ref.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 220, easing: "ease-out", fill: "forwards" }
    );
  });
  return <div ref={ref}>{props.children}</div>;
}
