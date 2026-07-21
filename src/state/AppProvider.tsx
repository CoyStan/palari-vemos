import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { AppState, BackHandler } from 'react-native';

import {
  addAvailabilityRule,
  completeOnboardingState,
  createPlanState,
  deleteAvailabilityRule,
  lookAroundFirst,
  markInviteSentState,
  markPlanCancelledState,
  markPlanDoneState,
  removeFriend,
  setAvailabilityEnabledState,
  setInviteStatusState,
  skipOccurrenceOnce,
  unskipOccurrence,
  updateAvailabilityRule,
  updateInvitationTextState,
  updateSettings as patchSettings,
  upsertFriend,
  type AvailabilityInput,
  type FriendInput,
} from '../domain/mutations';
import {
  buildInviteText,
  buildTimeline,
  computePlanStatus,
  expandAvailability,
  proposePlanWindow,
  slotConflictsWithPlans,
  sortFriendsForPicker,
} from '../domain/model';
import { formatDateKey, parseDateKey, startOfDay } from '../domain/time';
import type {
  AppData,
  AppSettings,
  AvailabilityRule,
  ConcreteSlot,
  Friend,
  InviteStatus,
  InviteTone,
  Plan,
  PlanStatus,
} from '../domain/types';
import {
  clearAppData,
  createId,
  emptyAppData,
  exportAppDataJson,
  loadAppData,
  saveAppData,
  startFreshStorage,
} from '../persistence/storage';
import { WriteQueue } from '../persistence/writeQueue';
import { cancelAllReminders, rescheduleReminders } from '../services/reminders';
import { clearOwnedMediaDirectory } from '../services/media';
import { shareInviteMessage } from '../services/share';

export type TabId = 'when' | 'friends' | 'settings';
export type WhenMode = 'list' | 'week' | 'day';
export type ScreenId =
  | 'loading'
  | 'welcome'
  | 'onboarding'
  | 'when'
  | 'friends'
  | 'settings'
  | 'addFriend'
  | 'editFriend'
  | 'friendProfile'
  | 'addAvailability'
  | 'editAvailability'
  | 'availability'
  | 'createPlan'
  | 'planDetail'
  | 'moveFriend'
  | 'privacyPolicy'
  | 'recovery';

export type { FriendInput, AvailabilityInput };

type AppContextValue = {
  ready: boolean;
  loadError: string | null;
  saveError: string | null;
  recoveryWarnings: string[];
  data: AppData;
  now: Date;
  screen: ScreenId;
  tab: TabId;
  selectedSlot: ConcreteSlot | null;
  selectedFriendIds: string[];
  activePlanId: string | null;
  activeFriendId: string | null;
  activeAvailabilityId: string | null;
  moveFriendId: string | null;
  whenMode: WhenMode;
  whenFocusDate: Date;
  setWhenMode: (mode: WhenMode) => void;
  setWhenFocusDate: (date: Date) => void;
  timeline: ReturnType<typeof buildTimeline>;
  slots: ConcreteSlot[];
  sortedFriends: Friend[];
  activePlan: Plan | null;
  activeFriend: Friend | null;
  goWhen: () => void;
  goFriends: () => void;
  goSettings: () => void;
  goBack: () => void;
  openAddFriend: () => void;
  openEditFriend: (friendId: string) => void;
  openFriendProfile: (friendId: string) => void;
  openAddAvailability: () => void;
  openEditAvailability: (ruleId: string) => void;
  openAvailability: () => void;
  openPrivacyPolicy: () => void;
  openOnboarding: () => void;
  openCreatePlan: (slot: ConcreteSlot, friendIds?: string[]) => void;
  openPlanDetail: (planId: string) => void;
  toggleFriendSelection: (friendId: string) => void;
  saveFriend: (input: FriendInput, friendId?: string) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;
  addAvailability: (input: AvailabilityInput) => Promise<void>;
  updateAvailability: (ruleId: string, input: AvailabilityInput) => Promise<void>;
  skipOccurrence: (ruleId: string, date: string) => Promise<void>;
  unskipOccurrence: (ruleId: string, date: string) => Promise<void>;
  deleteAvailability: (ruleId: string) => Promise<void>;
  setAvailabilityEnabled: (ruleId: string, enabled: boolean) => Promise<void>;
  savePlanMemory: (note: string, photoUri: string | null) => Promise<void>;
  completeOnboarding: (input: {
    friend?: FriendInput | null;
    availability?: AvailabilityInput | null;
  }) => Promise<void>;
  skipOnboardingExplore: () => Promise<void>;
  createPlan: (input: {
    title: string;
    activity: string;
    place: string;
    note: string;
  }) => Promise<{ ok: boolean; message?: string }>;
  updatePlan: (patch: Partial<Pick<Plan, 'title' | 'activity' | 'place' | 'note' | 'startAt' | 'endAt'>>) => Promise<void>;
  setFriendInviteStatus: (friendId: string, status: InviteStatus) => Promise<void>;
  updateInvitationText: (friendId: string, text: string, customized?: boolean) => Promise<void>;
  resetInvitationSuggested: (friendId: string, tone?: InviteTone) => Promise<void>;
  shareInvite: (friendId: string, message: string) => Promise<boolean>;
  confirmInviteSent: (friendId: string, sent: boolean) => Promise<void>;
  markPlanDone: (attendedFriendIds: string[]) => Promise<void>;
  markPlanStatus: (status: PlanStatus) => Promise<void>;
  openMoveFriend: (friendId: string) => void;
  moveFriendToSlot: (slot: ConcreteSlot) => Promise<{ ok: boolean; message?: string }>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  exportData: () => Promise<string>;
  wipeData: () => Promise<{ ok: boolean; message?: string }>;
  retryLoad: () => Promise<void>;
  retrySave: () => Promise<void>;
  startFresh: () => Promise<void>;
  logCaughtUp: (friendId: string, whenIso: string) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [recoveryWarnings, setRecoveryWarnings] = useState<string[]>([]);
  const [data, setData] = useState<AppData>(emptyAppData);
  const dataRef = useRef(data);
  dataRef.current = data;
  const writeQueue = useRef(new WriteQueue()).current;
  const revisionRef = useRef(0);
  const [stack, setStack] = useState<ScreenId[]>(['loading']);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const [tab, setTab] = useState<TabId>('when');
  const [selectedSlot, setSelectedSlot] = useState<ConcreteSlot | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [activeAvailabilityId, setActiveAvailabilityId] = useState<string | null>(null);
  const [moveFriendId, setMoveFriendId] = useState<string | null>(null);
  const [whenMode, setWhenMode] = useState<WhenMode>('list');
  const [whenFocusDateKey, setWhenFocusDateKey] = useState(() => formatDateKey(startOfDay(new Date())));
  const [nowTick, setNowTick] = useState(() => Date.now());

  const now = useMemo(() => new Date(nowTick), [nowTick]);
  const whenFocusDate = useMemo(
    () => startOfDay(parseDateKey(whenFocusDateKey)),
    [whenFocusDateKey],
  );

  const setWhenFocusDate = useCallback((date: Date) => {
    setWhenFocusDateKey(formatDateKey(startOfDay(date)));
  }, []);

  const screen: ScreenId = stack[stack.length - 1] ?? 'loading';

  const resetTo = useCallback((next: ScreenId) => setStack([next]), []);
  const push = useCallback((next: ScreenId) => setStack((current) => [...current, next]), []);
  const replaceTop = useCallback(
    (next: ScreenId) => setStack((current) => [...current.slice(0, -1), next]),
    [],
  );
  const goBack = useCallback(() => {
    setStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (stackRef.current.length > 1) {
        goBack();
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [goBack]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        setNowTick(Date.now());
        void rescheduleReminders(dataRef.current, revisionRef.current);
      }
    });
    const midnight = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => {
      sub.remove();
      clearInterval(midnight);
    };
  }, []);

  const clearSelectionState = useCallback(() => {
    setSelectedSlot(null);
    setSelectedFriendIds([]);
    setActivePlanId(null);
    setActiveFriendId(null);
    setActiveAvailabilityId(null);
    setMoveFriendId(null);
  }, []);

  const commit = useCallback(async (updater: (current: AppData) => AppData) => {
    const next = updater(dataRef.current);
    dataRef.current = next;
    setData(next);
    const revision = ++revisionRef.current;
    await writeQueue.enqueue(async (generation) => {
      if (generation !== writeQueue.wipeGeneration) return;
      await saveAppData(next);
      if (generation !== writeQueue.wipeGeneration) return;
      await rescheduleReminders(next, revision);
    });
    setSaveError(writeQueue.error);
  }, [writeQueue]);

  const hydrate = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await loadAppData();
      if (!loaded.ok) {
        setLoadError(loaded.message);
        setRecoveryWarnings([]);
        setReady(true);
        resetTo('recovery');
        return;
      }
      dataRef.current = loaded.data;
      setData(loaded.data);
      setRecoveryWarnings(loaded.warnings);
      resetTo(!loaded.data.onboardingComplete ? 'welcome' : 'when');
      setTab('when');
      setReady(true);
      revisionRef.current += 1;
      void rescheduleReminders(loaded.data, revisionRef.current);
      const referenced = [
        ...loaded.data.friends.map((friend) => friend.photoUri),
        ...loaded.data.plans.map((plan) => plan.memoryPhotoUri),
      ];
      void import('../services/media').then(({ garbageCollectOwnedMedia }) => (
        garbageCollectOwnedMedia(referenced)
      ));
    } catch {
      setLoadError('Could not load your plans. Please try again.');
      setReady(true);
      resetTo('recovery');
    }
  }, [resetTo]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const slots = useMemo(
    () => expandAvailability(data.availability, data.skipped, startOfDay(now), 21),
    [data.availability, data.skipped, now],
  );

  const spotlightPlan = useMemo(() => {
    const todayKey = formatDateKey(now);
    return data.plans.find((plan) => (
      plan.status !== 'done'
      && plan.status !== 'cancelled'
      && formatDateKey(new Date(plan.startAt)) === todayKey
      && new Date(plan.endAt).getTime() >= now.getTime()
    )) ?? null;
  }, [data.plans, now]);

  const timeline = useMemo(
    () => buildTimeline(data.friends, data.plans, slots, now, {
      spotlightPlanId: spotlightPlan?.id ?? null,
    }),
    [data.friends, data.plans, slots, now, spotlightPlan],
  );

  const sortedFriends = useMemo(
    () => sortFriendsForPicker(data.friends, data.plans, now),
    [data.friends, data.plans, now],
  );

  const activePlan = useMemo(
    () => data.plans.find((plan) => plan.id === activePlanId) ?? null,
    [activePlanId, data.plans],
  );

  const activeFriend = useMemo(
    () => data.friends.find((friend) => friend.id === activeFriendId) ?? null,
    [activeFriendId, data.friends],
  );

  const goWhen = useCallback(() => {
    setTab('when');
    resetTo('when');
    setSelectedSlot(null);
    setMoveFriendId(null);
  }, [resetTo]);

  const goFriends = useCallback(() => {
    setTab('friends');
    resetTo('friends');
  }, [resetTo]);

  const goSettings = useCallback(() => {
    setTab('settings');
    resetTo('settings');
  }, [resetTo]);

  const openAddFriend = useCallback(() => {
    setActiveFriendId(null);
    push('addFriend');
  }, [push]);

  const openEditFriend = useCallback((friendId: string) => {
    setActiveFriendId(friendId);
    push('editFriend');
  }, [push]);

  const openFriendProfile = useCallback((friendId: string) => {
    setActiveFriendId(friendId);
    push('friendProfile');
  }, [push]);

  const openAddAvailability = useCallback(() => {
    setActiveAvailabilityId(null);
    push('addAvailability');
  }, [push]);

  const openEditAvailability = useCallback((ruleId: string) => {
    setActiveAvailabilityId(ruleId);
    push('editAvailability');
  }, [push]);

  const openAvailability = useCallback(() => push('availability'), [push]);
  const openPrivacyPolicy = useCallback(() => push('privacyPolicy'), [push]);
  const openOnboarding = useCallback(() => push('onboarding'), [push]);

  const openCreatePlan = useCallback((slot: ConcreteSlot, friendIds?: string[]) => {
    const window = proposePlanWindow(
      slot.startAt,
      slot.endAt,
      dataRef.current.settings.defaultDurationMinutes,
    );
    setSelectedSlot({
      ...slot,
      startAt: window.startAt,
      endAt: window.endAt,
      startMinutes: new Date(window.startAt).getHours() * 60 + new Date(window.startAt).getMinutes(),
      endMinutes: new Date(window.endAt).getHours() * 60 + new Date(window.endAt).getMinutes(),
    });
    setSelectedFriendIds(friendIds ?? []);
    push('createPlan');
  }, [push]);

  const openPlanDetail = useCallback((planId: string) => {
    setActivePlanId(planId);
    push('planDetail');
  }, [push]);

  const toggleFriendSelection = useCallback((friendId: string) => {
    setSelectedFriendIds((current) => (
      current.includes(friendId)
        ? current.filter((id) => id !== friendId)
        : [...current, friendId]
    ));
  }, []);

  const saveFriend = useCallback(async (input: FriendInput, friendId?: string) => {
    if (!input.name.trim()) return;
    const fromCreatePlan = stackRef.current.includes('createPlan') && selectedSlot;
    let createdId: string | null = null;
    await commit((current) => {
      const result = upsertFriend(current, input, createId, friendId);
      createdId = result.friend.id;
      return result.data;
    });
    if (friendId) {
      setActiveFriendId(friendId);
      replaceTop('friendProfile');
      return;
    }
    if (fromCreatePlan && createdId && selectedSlot) {
      setSelectedFriendIds((ids) => (ids.includes(createdId!) ? ids : [...ids, createdId!]));
      goBack();
      return;
    }
    if (stackRef.current[stackRef.current.length - 2] === 'friendProfile') {
      goBack();
      return;
    }
    goBack();
  }, [commit, goBack, replaceTop, selectedSlot]);

  const deleteFriend = useCallback(async (friendId: string) => {
    await commit((current) => removeFriend(current, friendId));
    goFriends();
  }, [commit, goFriends]);

  const addAvailability = useCallback(async (input: AvailabilityInput) => {
    await commit((current) => addAvailabilityRule(current, input, createId));
    goBack();
  }, [commit, goBack]);

  const updateAvailability = useCallback(async (ruleId: string, input: AvailabilityInput) => {
    await commit((current) => updateAvailabilityRule(current, ruleId, input));
    goBack();
  }, [commit, goBack]);

  const skipOccurrence = useCallback(async (ruleId: string, date: string) => {
    await commit((current) => skipOccurrenceOnce(current, ruleId, date));
  }, [commit]);

  const unskip = useCallback(async (ruleId: string, date: string) => {
    await commit((current) => unskipOccurrence(current, ruleId, date));
  }, [commit]);

  const deleteAvailability = useCallback(async (ruleId: string) => {
    await commit((current) => deleteAvailabilityRule(current, ruleId));
  }, [commit]);

  const setAvailabilityEnabled = useCallback(async (ruleId: string, enabled: boolean) => {
    await commit((current) => setAvailabilityEnabledState(current, ruleId, enabled));
  }, [commit]);

  const savePlanMemory = useCallback(async (note: string, photoUri: string | null) => {
    if (!activePlanId) return;
    await commit((current) => ({
      ...current,
      plans: current.plans.map((plan) => (
        plan.id === activePlanId
          ? { ...plan, memoryNote: note, memoryPhotoUri: photoUri, updatedAt: new Date().toISOString() }
          : plan
      )),
    }));
  }, [activePlanId, commit]);

  const completeOnboarding = useCallback(async (input: {
    friend?: FriendInput | null;
    availability?: AvailabilityInput | null;
  }) => {
    await commit((current) => completeOnboardingState(current, input, createId));
    resetTo('when');
    setTab('when');
  }, [commit, resetTo]);

  const skipOnboardingExplore = useCallback(async () => {
    await commit((current) => lookAroundFirst(current));
    resetTo('when');
    setTab('when');
  }, [commit, resetTo]);

  const createPlan = useCallback(async (input: {
    title: string;
    activity: string;
    place: string;
    note: string;
  }) => {
    if (!selectedSlot) {
      return { ok: false, message: 'Pick a free time first.' };
    }
    let message: string | undefined;
    let planId: string | null = null;
    await commit((current) => {
      const result = createPlanState(
        current,
        selectedSlot,
        selectedFriendIds,
        input,
        createId,
      );
      if (!result.ok) {
        message = result.message;
        return current;
      }
      planId = result.plan.id;
      return result.data;
    });
    if (!planId) {
      return { ok: false, message: message ?? 'Could not create the plan.' };
    }
    setSelectedSlot(null);
    setSelectedFriendIds([]);
    setActivePlanId(planId);
    replaceTop('planDetail');
    return { ok: true };
  }, [commit, replaceTop, selectedFriendIds, selectedSlot]);

  const updatePlan = useCallback(async (
    patch: Partial<Pick<Plan, 'title' | 'activity' | 'place' | 'note' | 'startAt' | 'endAt'>>,
  ) => {
    if (!activePlanId) return;
    await commit((current) => ({
      ...current,
      plans: current.plans.map((plan) => {
        if (plan.id !== activePlanId) return plan;
        const updated = { ...plan, ...patch, updatedAt: new Date().toISOString() };
        const timeOrPlaceChanged = Boolean(
          patch.startAt || patch.endAt || patch.activity !== undefined || patch.place !== undefined,
        );
        if (timeOrPlaceChanged) {
          updated.friends = updated.friends.map((item) => {
            if (item.invitationCustomized) return item;
            const friend = current.friends.find((entry) => entry.id === item.friendId);
            return {
              ...item,
              invitationText: buildInviteText({
                name: friend?.name ?? item.displayNameSnapshot ?? 'there',
                startAt: updated.startAt,
                endAt: updated.endAt,
                activity: updated.activity,
                place: updated.place,
                timeFormat24h: current.settings.timeFormat24h,
                tone: item.inviteTone,
              }),
            };
          });
        }
        return updated;
      }),
    }));
  }, [activePlanId, commit]);

  const setFriendInviteStatus = useCallback(async (friendId: string, status: InviteStatus) => {
    if (!activePlanId) return;
    await commit((current) => setInviteStatusState(current, activePlanId, friendId, status));
  }, [activePlanId, commit]);

  const updateInvitationText = useCallback(async (
    friendId: string,
    text: string,
    customized = true,
  ) => {
    if (!activePlanId) return;
    await commit((current) => updateInvitationTextState(current, activePlanId, friendId, text, customized));
  }, [activePlanId, commit]);

  const resetInvitationSuggested = useCallback(async (friendId: string, tone: InviteTone = 'warm') => {
    if (!activePlan || !activePlanId) return;
    const friend = dataRef.current.friends.find((item) => item.id === friendId);
    const text = buildInviteText({
      name: friend?.name ?? 'there',
      startAt: activePlan.startAt,
      endAt: activePlan.endAt,
      activity: activePlan.activity,
      place: activePlan.place,
      timeFormat24h: dataRef.current.settings.timeFormat24h,
      tone,
    });
    await commit((current) => ({
      ...updateInvitationTextState(current, activePlanId, friendId, text, false),
      plans: current.plans.map((plan) => (
        plan.id !== activePlanId
          ? plan
          : {
            ...plan,
            friends: plan.friends.map((item) => (
              item.friendId === friendId ? { ...item, inviteTone: tone, invitationText: text, invitationCustomized: false } : item
            )),
          }
      )),
    }));
  }, [activePlan, activePlanId, commit]);

  const shareInvite = useCallback(async (friendId: string, message: string) => {
    if (activePlanId) {
      await commit((current) => updateInvitationTextState(current, activePlanId, friendId, message, true));
    }
    const friend = dataRef.current.friends.find((item) => item.id === friendId);
    return shareInviteMessage({
      message,
      method: friend?.shareMethod ?? 'other',
      phone: friend?.phone,
    });
  }, [activePlanId, commit]);

  const confirmInviteSent = useCallback(async (friendId: string, sent: boolean) => {
    if (!activePlanId) return;
    await commit((current) => markInviteSentState(current, activePlanId, friendId, sent));
  }, [activePlanId, commit]);

  const markPlanDone = useCallback(async (attendedFriendIds: string[]) => {
    if (!activePlanId) return;
    await commit((current) => markPlanDoneState(current, activePlanId, attendedFriendIds));
  }, [activePlanId, commit]);

  const markPlanStatus = useCallback(async (status: PlanStatus) => {
    if (!activePlanId) return;
    if (status === 'cancelled') {
      await commit((current) => markPlanCancelledState(current, activePlanId));
      goWhen();
      return;
    }
    if (status === 'done') {
      return;
    }
    await commit((current) => ({
      ...current,
      plans: current.plans.map((plan) => (
        plan.id === activePlanId
          ? { ...plan, status, updatedAt: new Date().toISOString() }
          : plan
      )),
    }));
    goWhen();
  }, [activePlanId, commit, goWhen]);

  const openMoveFriend = useCallback((friendId: string) => {
    setMoveFriendId(friendId);
    push('moveFriend');
  }, [push]);

  const moveFriendToSlot = useCallback(async (slot: ConcreteSlot) => {
    if (!activePlan || !moveFriendId) {
      return { ok: false, message: 'Nothing to move.' };
    }
    const window = proposePlanWindow(
      slot.startAt,
      slot.endAt,
      dataRef.current.settings.defaultDurationMinutes,
    );
    if (slotConflictsWithPlans(window.startAt, window.endAt, dataRef.current.plans, {
      availabilityKey: slot.key,
      excludePlanId: activePlan.id,
    })) {
      return { ok: false, message: 'That time was just taken. Pick another free slot.' };
    }

    let newPlanId: string | null = null;
    await commit((current) => {
      const friend = current.friends.find((item) => item.id === moveFriendId);
      const nowIso = new Date().toISOString();
      const remaining = activePlan.friends.map((item) => (
        item.friendId === moveFriendId ? { ...item, status: 'moved' as const } : item
      ));
      const newPlan: Plan = {
        id: createId('plan'),
        title: friend ? `Catch up with ${friend.name}` : 'Catch up',
        activity: activePlan.activity,
        place: activePlan.place,
        note: activePlan.note,
        startAt: window.startAt,
        endAt: window.endAt,
        availabilityKey: slot.key,
        friends: [{
          friendId: moveFriendId,
          status: 'not_invited',
          invitationText: buildInviteText({
            name: friend?.name ?? 'there',
            startAt: window.startAt,
            endAt: window.endAt,
            activity: activePlan.activity,
            place: activePlan.place,
            timeFormat24h: current.settings.timeFormat24h,
          }),
          inviteTone: 'warm',
          invitationCustomized: false,
          sentAt: null,
          displayNameSnapshot: friend?.name ?? null,
        }],
        status: 'draft',
        memoryNote: '',
        memoryPhotoUri: null,
        completedAt: null,
        cancelledAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      newPlanId = newPlan.id;
      return {
        ...current,
        plans: [
          newPlan,
          ...current.plans.map((plan) => (
            plan.id === activePlan.id
              ? {
                ...plan,
                friends: remaining,
                status: computePlanStatus(remaining),
                updatedAt: nowIso,
              }
              : plan
          )),
        ],
      };
    });
    setMoveFriendId(null);
    if (newPlanId) {
      setActivePlanId(newPlanId);
      setStack(['when', 'planDetail']);
    }
    return { ok: true };
  }, [activePlan, commit, moveFriendId]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    await commit((current) => patchSettings(current, patch));
  }, [commit]);

  const exportData = useCallback(async () => exportAppDataJson(dataRef.current), []);

  const wipeData = useCallback(async () => {
    writeQueue.invalidate();
    try {
      await cancelAllReminders();
      await clearOwnedMediaDirectory();
      await clearAppData();
      const empty = emptyAppData();
      dataRef.current = empty;
      setData(empty);
      clearSelectionState();
      setSaveError(null);
      resetTo('welcome');
      setTab('when');
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete all data.';
      return { ok: false, message };
    }
  }, [clearSelectionState, resetTo, writeQueue]);

  const retrySave = useCallback(async () => {
    const snapshot = dataRef.current;
    await writeQueue.enqueue(async (generation) => {
      if (generation !== writeQueue.wipeGeneration) return;
      await saveAppData(snapshot);
    });
    setSaveError(writeQueue.error);
  }, [writeQueue]);

  const startFresh = useCallback(async () => {
    writeQueue.invalidate();
    await cancelAllReminders();
    await clearOwnedMediaDirectory();
    const empty = await startFreshStorage();
    dataRef.current = empty;
    setData(empty);
    clearSelectionState();
    setLoadError(null);
    setSaveError(null);
    resetTo('welcome');
  }, [clearSelectionState, resetTo, writeQueue]);

  const logCaughtUp = useCallback(async (friendId: string, whenIso: string) => {
    await commit((current) => ({
      ...current,
      friends: current.friends.map((friend) => (
        friend.id === friendId ? { ...friend, lastMetAt: whenIso } : friend
      )),
    }));
  }, [commit]);

  const value = useMemo<AppContextValue>(() => ({
    ready,
    loadError,
    saveError,
    recoveryWarnings,
    data,
    now,
    screen,
    tab,
    selectedSlot,
    selectedFriendIds,
    activePlanId,
    activeFriendId,
    activeAvailabilityId,
    moveFriendId,
    whenMode,
    whenFocusDate,
    setWhenMode,
    setWhenFocusDate,
    timeline,
    slots,
    sortedFriends,
    activePlan,
    activeFriend,
    goWhen,
    goFriends,
    goSettings,
    goBack,
    openAddFriend,
    openEditFriend,
    openFriendProfile,
    openAddAvailability,
    openEditAvailability,
    openAvailability,
    openPrivacyPolicy,
    openOnboarding,
    openCreatePlan,
    openPlanDetail,
    toggleFriendSelection,
    saveFriend,
    deleteFriend,
    addAvailability,
    updateAvailability,
    skipOccurrence,
    unskipOccurrence: unskip,
    deleteAvailability,
    setAvailabilityEnabled,
    savePlanMemory,
    completeOnboarding,
    skipOnboardingExplore,
    createPlan,
    updatePlan,
    setFriendInviteStatus,
    updateInvitationText,
    resetInvitationSuggested,
    shareInvite,
    confirmInviteSent,
    markPlanDone,
    markPlanStatus,
    openMoveFriend,
    moveFriendToSlot,
    updateSettings,
    exportData,
    wipeData,
    retryLoad: hydrate,
    retrySave,
    startFresh,
    logCaughtUp,
  }), [
    ready, loadError, saveError, recoveryWarnings, data, now, screen, tab,
    selectedSlot, selectedFriendIds, activePlanId, activeFriendId, activeAvailabilityId,
    moveFriendId, whenMode, whenFocusDate, setWhenFocusDate, timeline, slots, sortedFriends,
    activePlan, activeFriend, goWhen, goFriends, goSettings, goBack, openAddFriend,
    openEditFriend, openFriendProfile, openAddAvailability, openEditAvailability,
    openAvailability, openPrivacyPolicy, openOnboarding, openCreatePlan, openPlanDetail,
    toggleFriendSelection, saveFriend, deleteFriend, addAvailability, updateAvailability,
    skipOccurrence, unskip, deleteAvailability, setAvailabilityEnabled, savePlanMemory,
    completeOnboarding, skipOnboardingExplore, createPlan, updatePlan, setFriendInviteStatus,
    updateInvitationText, resetInvitationSuggested, shareInvite, confirmInviteSent,
    markPlanDone, markPlanStatus, openMoveFriend, moveFriendToSlot, updateSettings,
    exportData, wipeData, hydrate, retrySave, startFresh, logCaughtUp,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp must be used within AppProvider');
  }
  return value;
}
