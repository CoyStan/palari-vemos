/**
 * Invitation draft / share helpers — pure so PlanDetail and shareInvite stay aligned.
 */

/** Persisted text is source of truth unless a local edit draft is active. */
export function visibleInvitationText(
  persisted: string,
  isEditing: boolean,
  draft: string | undefined,
): string {
  return isEditing ? (draft ?? persisted) : persisted;
}

/** Dirty draft while editing — tone/time updates must not clobber it. */
export function invitationDraftIsDirty(
  isEditing: boolean,
  draft: string | undefined,
  persisted: string,
): boolean {
  return isEditing && draft !== undefined && draft !== persisted;
}

/**
 * Sharing the exact current non-custom text must not flip invitationCustomized.
 * Sharing a different string (or already-custom text) keeps/marks customized.
 */
export function invitationCustomizedAfterShare(
  existing:
    { invitationText: string; invitationCustomized: boolean } | undefined,
  message: string,
): boolean {
  if (!existing) {
    return message.trim().length > 0;
  }
  if (existing.invitationCustomized) {
    return true;
  }
  return existing.invitationText !== message;
}

export type AddFriendForPlanOrigin = "inviteSheet" | "createPlan";

/** Where to land after saving a friend created mid-plan flow. */
export function navigationAfterAddFriendForPlan(
  origin: AddFriendForPlanOrigin,
): "goBack" | "replaceCreatePlan" {
  return origin === "createPlan" ? "goBack" : "replaceCreatePlan";
}

/** Real block geometry — never inflate visual height for touch targets. */
export function calendarBlockVisualHeight(
  durationMinutes: number,
  hourHeight: number,
): number {
  return Math.max((durationMinutes / 60) * hourHeight - 3, 1);
}

export function calendarBlockHitPad(
  visualHeight: number,
  minTouch = 44,
): number {
  return Math.max(0, Math.ceil((minTouch - visualHeight) / 2));
}
