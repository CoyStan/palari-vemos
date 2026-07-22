/** Product feedback — separate from privacy@ for Play / research. */
export const FEEDBACK_EMAIL = "hello@palari.io";

export function feedbackMailtoUrl(): string {
  const subject = encodeURIComponent("So, When? feedback");
  const body = encodeURIComponent(
    "What worked, what felt awkward, or what you hoped for:\n\n",
  );
  return `mailto:${FEEDBACK_EMAIL}?subject=${subject}&body=${body}`;
}
