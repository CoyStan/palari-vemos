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
import { BackHandler, Share } from 'react-native';

import {
  buildInviteText,
  buildTimeline,
  computePlanStatus,
  expandAvailability,
  sortFriendsForPicker,
} from '../domain/model';
import { startOfDay, formatDateKey, parseDateKey } from '../domain/time';
import type {
  AppData,
  AppSettings,
  AvailabilityRule,
  CatchUpRhythm,
  ConcreteSlot,
  Friend,
  InviteStatus,
  Plan,
  PlanStatus,
  ShareMethod,
} from '../domain/types';
import {
  clearAppData,
  createId,
  emptyAppData,
  exportAppDataJson,
  loadAppData,
  saveAppData,
} from '../persistence/storage';
import { rescheduleReminders } from '../services/reminders';
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
  | 'availability'
  | 'createPlan'
  | 'planDetail'
  | 'moveFriend'
  | 'privacyPolicy';

type FriendInput = {
  name: string;
  photoUri: string | null;
  phone: string;
  shareMethod: ShareMethod;
  rhythm: CatchUpRhythm;
  customDays: number;
  lastMetAt: string | null;
};

type AvailabilityInput = Omit<AvailabilityRule, 'id' | 'createdAt'>;

type AppContextValue = {
  ready: boolean;
  loadError: string | null;
  data: AppData;
  screen: ScreenId;
  tab: TabId;
  selectedSlot: ConcreteSlot | null;
  selectedFriendIds: string[];
  activePlanId: string | null;
  activeFriendId: string | null;
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
  openAvailability: () => void;
  openPrivacyPolicy: () => void;
  openOnboarding: () => void;
  openCreatePlan: (slot: ConcreteSlot, friendIds?: string[]) => void;
  openPlanDetail: (planId: string) => void;
  toggleFriendSelection: (friendId: string) => void;
  saveFriend: (input: FriendInput, friendId?: string) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;
  addAvailability: (input: AvailabilityInput) => Promise<void>;
  skipOccurrence: (ruleId: string, date: string) => Promise<void>;
  deleteAvailability: (ruleId: string) => Promise<void>;
  setAvailabilityEnabled: (ruleId: string, enabled: boolean) => Promise<void>;
  savePlanMemory: (note: string, photoUri: string | null) => Promise<void>;
  completeOnboarding: (
    name: string,
    availability: AvailabilityInput,
  ) => Promise<{ friend: Friend; rule: AvailabilityRule }>;
  createPlan: (input: {
    title: string;
    activity: string;
    place: string;
    note: string;
  }) => Promise<void>;
  updatePlan: (patch: Partial<Pick<Plan, 'title' | 'activity' | 'place' | 'note' | 'startAt' | 'endAt'>>) => Promise<void>;
  setFriendInviteStatus: (friendId: string, status: InviteStatus) => Promise<void>;
  shareInvite: (friendId: string, message: string) => Promise<boolean>;
  markPlanStatus: (status: PlanStatus) => Promise<void>;
  openMoveFriend: (friendId: string) => void;
  moveFriendToSlot: (slot: ConcreteSlot) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  exportData: () => Promise<string>;
  wipeData: () => Promise<void>;
  retryLoad: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(emptyAppData);
  const [stack, setStack] = useState<ScreenId[]>(['loading']);
  const stackRef = useRef(stack);
  stackRef.current = stack;
  const [tab, setTab] = useState<TabId>('when');
  const [selectedSlot, setSelectedSlot] = useState<ConcreteSlot | null>(null);
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [activeFriendId, setActiveFriendId] = useState<string | null>(null);
  const [moveFriendId, setMoveFriendId] = useState<string | null>(null);
  const [whenMode, setWhenMode] = useState<WhenMode>('list');
  const [whenFocusDateKey, setWhenFocusDateKey] = useState(() => formatDateKey(startOfDay(new Date())));

  const whenFocusDate = useMemo(
    () => startOfDay(parseDateKey(whenFocusDateKey)),
    [whenFocusDateKey],
  );

  const setWhenFocusDate = useCallback((date: Date) => {
    setWhenFocusDateKey(formatDateKey(startOfDay(date)));
  }, []);

  const screen: ScreenId = stack[stack.length - 1] ?? 'loading';

  const resetTo = useCallback(
    (next: ScreenId) => setStack([next]),
    [],
  );

  const push = useCallback(
    (next: ScreenId) => setStack((current) => [...current, next]),
    [],
  );

  const replaceTop = useCallback(
    (next: ScreenId) =>
      setStack((current) => [...current.slice(0, -1), next]),
    [],
  );

  const goBack = useCallback(() => {
    setStack((current) =>
      current.length > 1 ? current.slice(0, -1) : current,
    );
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

  const hydrate = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await loadAppData();
      setData(loaded);
      resetTo(!loaded.onboardingComplete && loaded.friends.length === 0 ? 'welcome' : 'when');
      setTab('when');
      setReady(true);
      void rescheduleReminders(loaded);
    } catch {
      setLoadError('Could not load your plans. Please try again.');
      setReady(true);
      resetTo('welcome');
    }
  }, [resetTo]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const commit = useCallback(async (next: AppData) => {
    setData(next);
    await saveAppData(next);
    void rescheduleReminders(next);
  }, []);

  const slots = useMemo(
    () => expandAvailability(data.availability, data.skipped, startOfDay(new Date()), 21),
    [data.availability, data.skipped],
  );

  const timeline = useMemo(
    () => buildTimeline(data.friends, data.plans, slots),
    [data.friends, data.plans, slots],
  );

  const sortedFriends = useMemo(
    () => sortFriendsForPicker(data.friends, data.plans),
    [data.friends, data.plans],
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
    push('addAvailability');
  }, [push]);

  const openAvailability = useCallback(() => {
    push('availability');
  }, [push]);

  const openPrivacyPolicy = useCallback(() => {
    push('privacyPolicy');
  }, [push]);

  const openOnboarding = useCallback(() => {
    push('onboarding');
  }, [push]);

  const openCreatePlan = useCallback((slot: ConcreteSlot, friendIds?: string[]) => {
    setSelectedSlot(slot);
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
    const name = input.name.trim();
    if (!name) {
      return;
    }
    const now = new Date().toISOString();
    if (friendId) {
      await commit({
        ...data,
        friends: data.friends.map((friend) => (
          friend.id === friendId
            ? {
              ...friend,
              name,
              photoUri: input.photoUri,
              phone: input.phone.trim(),
              shareMethod: input.shareMethod,
              rhythm: input.rhythm,
              customDays: input.customDays,
              lastMetAt: input.lastMetAt,
            }
            : friend
        )),
      });
      setActiveFriendId(friendId);
      replaceTop('friendProfile');
      return;
    }

    const friend: Friend = {
      id: createId('friend'),
      name,
      photoUri: input.photoUri,
      phone: input.phone.trim(),
      shareMethod: input.shareMethod,
      rhythm: input.rhythm,
      customDays: input.customDays,
      lastMetAt: input.lastMetAt,
      createdAt: now,
    };
    await commit({
      ...data,
      onboardingComplete: true,
      friends: [...data.friends, friend],
    });
    goFriends();
  }, [commit, data, goFriends, replaceTop]);

  const deleteFriend = useCallback(async (friendId: string) => {
    await commit({
      ...data,
      friends: data.friends.filter((friend) => friend.id !== friendId),
      plans: data.plans.map((plan) => ({
        ...plan,
        friends: plan.friends.filter((item) => item.friendId !== friendId),
      })),
    });
    goFriends();
  }, [commit, data, goFriends]);

  const addAvailability = useCallback(async (input: AvailabilityInput) => {
    const rule: AvailabilityRule = {
      ...input,
      id: createId('avail'),
      createdAt: new Date().toISOString(),
    };
    await commit({
      ...data,
      availability: [...data.availability, rule],
    });
    goWhen();
  }, [commit, data, goWhen]);

  const skipOccurrence = useCallback(async (ruleId: string, date: string) => {
    await commit({
      ...data,
      skipped: [...data.skipped, { ruleId, date }],
    });
  }, [commit, data]);

  const deleteAvailability = useCallback(async (ruleId: string) => {
    await commit({
      ...data,
      availability: data.availability.filter((rule) => rule.id !== ruleId),
      skipped: data.skipped.filter((item) => item.ruleId !== ruleId),
    });
  }, [commit, data]);

  const setAvailabilityEnabled = useCallback(async (ruleId: string, enabled: boolean) => {
    await commit({
      ...data,
      availability: data.availability.map((rule) => (
        rule.id === ruleId ? { ...rule, enabled } : rule
      )),
    });
  }, [commit, data]);

  const savePlanMemory = useCallback(async (note: string, photoUri: string | null) => {
    if (!activePlan) {
      return;
    }
    await commit({
      ...data,
      plans: data.plans.map((plan) => (
        plan.id === activePlan.id
          ? { ...plan, memoryNote: note, memoryPhotoUri: photoUri, updatedAt: new Date().toISOString() }
          : plan
      )),
    });
  }, [activePlan, commit, data]);

  const completeOnboarding = useCallback(async (
    name: string,
    availability: AvailabilityInput,
  ) => {
    const now = new Date().toISOString();
    const friend: Friend = {
      id: createId('friend'),
      name: name.trim(),
      photoUri: null,
      phone: '',
      shareMethod: 'whatsapp',
      rhythm: 'monthly',
      customDays: 45,
      lastMetAt: null,
      createdAt: now,
    };
    const rule: AvailabilityRule = {
      ...availability,
      id: createId('avail'),
      createdAt: now,
    };
    await commit({
      ...data,
      onboardingComplete: true,
      friends: [...data.friends, friend],
      availability: [...data.availability, rule],
    });
    return { friend, rule };
  }, [commit, data]);

  const createPlan = useCallback(async (input: {
    title: string;
    activity: string;
    place: string;
    note: string;
  }) => {
    if (!selectedSlot || selectedFriendIds.length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const names = selectedFriendIds
      .map((id) => data.friends.find((friend) => friend.id === id)?.name)
      .filter(Boolean);
    const title = input.title.trim()
      || (names.length === 1
        ? `Catch up with ${names[0]}`
        : `Catch up with ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

    const planFriends = selectedFriendIds.map((friendId) => {
      const friend = data.friends.find((item) => item.id === friendId);
      return {
        friendId,
        status: 'not_invited' as const,
        invitationText: buildInviteText({
          name: friend?.name ?? 'there',
          startAt: selectedSlot.startAt,
          activity: input.activity,
          place: input.place,
          timeFormat24h: data.settings.timeFormat24h,
        }),
      };
    });

    const plan: Plan = {
      id: createId('plan'),
      title,
      activity: input.activity.trim(),
      place: input.place.trim(),
      note: input.note.trim(),
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      availabilityKey: selectedSlot.key,
      friends: planFriends,
      status: 'draft',
      memoryNote: '',
      memoryPhotoUri: null,
      createdAt: now,
      updatedAt: now,
    };

    await commit({
      ...data,
      plans: [plan, ...data.plans],
    });
    setSelectedSlot(null);
    setSelectedFriendIds([]);
    setActivePlanId(plan.id);
    replaceTop('planDetail');
  }, [commit, data, selectedFriendIds, selectedSlot, replaceTop]);

  const updatePlan = useCallback(async (
    patch: Partial<Pick<Plan, 'title' | 'activity' | 'place' | 'note' | 'startAt' | 'endAt'>>,
  ) => {
    if (!activePlan) {
      return;
    }
    const nextPlans = data.plans.map((plan) => {
      if (plan.id !== activePlan.id) {
        return plan;
      }
      const updated = {
        ...plan,
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      updated.friends = updated.friends.map((item) => {
        const friend = data.friends.find((entry) => entry.id === item.friendId);
        return {
          ...item,
          invitationText: buildInviteText({
            name: friend?.name ?? 'there',
            startAt: updated.startAt,
            activity: updated.activity,
            place: updated.place,
            timeFormat24h: data.settings.timeFormat24h,
          }),
        };
      });
      return updated;
    });
    await commit({ ...data, plans: nextPlans });
  }, [activePlan, commit, data]);

  const setFriendInviteStatus = useCallback(async (friendId: string, status: InviteStatus) => {
    if (!activePlan) {
      return;
    }
    const nextFriends = activePlan.friends.map((item) => (
      item.friendId === friendId ? { ...item, status } : item
    ));
    const nextStatus = computePlanStatus(nextFriends);
    const nextPlans = data.plans.map((plan) => (
      plan.id === activePlan.id
        ? {
          ...plan,
          friends: nextFriends,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        }
        : plan
    ));
    await commit({ ...data, plans: nextPlans });
  }, [activePlan, commit, data]);

  const shareInvite = useCallback(async (friendId: string, message: string) => {
    const friend = data.friends.find((item) => item.id === friendId);
    return shareInviteMessage({
      message,
      method: friend?.shareMethod ?? 'other',
      phone: friend?.phone,
    });
  }, [data.friends]);

  const markPlanStatus = useCallback(async (status: PlanStatus) => {
    if (!activePlan) {
      return;
    }
    const now = new Date().toISOString();
    let nextFriends = data.friends;
    if (status === 'done') {
      const confirmed = new Set(
        activePlan.friends
          .filter((item) => item.status === 'yes')
          .map((item) => item.friendId),
      );
      nextFriends = data.friends.map((friend) => (
        confirmed.has(friend.id) ? { ...friend, lastMetAt: now } : friend
      ));
    }
    await commit({
      ...data,
      friends: nextFriends,
      plans: data.plans.map((plan) => (
        plan.id === activePlan.id
          ? { ...plan, status, updatedAt: now }
          : plan
      )),
    });
    // Done stays on the plan so the after-moment capture can open;
    // anything else returns to When.
    if (status !== 'done') {
      goWhen();
    }
  }, [activePlan, commit, data, goWhen]);

  const openMoveFriend = useCallback((friendId: string) => {
    setMoveFriendId(friendId);
    push('moveFriend');
  }, [push]);

  const moveFriendToSlot = useCallback(async (slot: ConcreteSlot) => {
    if (!activePlan || !moveFriendId) {
      return;
    }
    const friend = data.friends.find((item) => item.id === moveFriendId);
    const now = new Date().toISOString();
    const remaining = activePlan.friends.map((item) => (
      item.friendId === moveFriendId ? { ...item, status: 'moved' as const } : item
    ));
    const newPlan: Plan = {
      id: createId('plan'),
      title: friend ? `Catch up with ${friend.name}` : 'Catch up',
      activity: activePlan.activity,
      place: activePlan.place,
      note: activePlan.note,
      startAt: slot.startAt,
      endAt: slot.endAt,
      availabilityKey: slot.key,
      friends: [{
        friendId: moveFriendId,
        status: 'not_invited',
        invitationText: buildInviteText({
          name: friend?.name ?? 'there',
          startAt: slot.startAt,
          activity: activePlan.activity,
          place: activePlan.place,
          timeFormat24h: data.settings.timeFormat24h,
        }),
      }],
      status: 'draft',
      memoryNote: '',
      memoryPhotoUri: null,
      createdAt: now,
      updatedAt: now,
    };

    await commit({
      ...data,
      plans: [
        newPlan,
        ...data.plans.map((plan) => (
          plan.id === activePlan.id
            ? {
              ...plan,
              friends: remaining,
              status: computePlanStatus(remaining),
              updatedAt: now,
            }
            : plan
        )),
      ],
    });
    setMoveFriendId(null);
    setActivePlanId(newPlan.id);
    replaceTop('planDetail');
  }, [activePlan, commit, data, moveFriendId, replaceTop]);

  const updateSettings = useCallback(async (patch: Partial<AppSettings>) => {
    await commit({
      ...data,
      settings: { ...data.settings, ...patch },
    });
  }, [commit, data]);

  const exportData = useCallback(async () => exportAppDataJson(data), [data]);

  const wipeData = useCallback(async () => {
    await clearAppData();
    setData(emptyAppData());
    resetTo('welcome');
    setTab('when');
  }, [resetTo]);

  const value = useMemo<AppContextValue>(() => ({
    ready,
    loadError,
    data,
    screen,
    tab,
    selectedSlot,
    selectedFriendIds,
    activePlanId,
    activeFriendId,
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
    openAvailability,
    openPrivacyPolicy,
    openOnboarding,
    openCreatePlan,
    openPlanDetail,
    toggleFriendSelection,
    saveFriend,
    deleteFriend,
    addAvailability,
    skipOccurrence,
    deleteAvailability,
    setAvailabilityEnabled,
    savePlanMemory,
    completeOnboarding,
    createPlan,
    updatePlan,
    setFriendInviteStatus,
    shareInvite,
    markPlanStatus,
    openMoveFriend,
    moveFriendToSlot,
    updateSettings,
    exportData,
    wipeData,
    retryLoad: hydrate,
  }), [
    ready, loadError, data, screen, tab, selectedSlot, selectedFriendIds,
    activePlanId, activeFriendId, moveFriendId, whenMode, whenFocusDate,
    setWhenFocusDate, timeline, slots, sortedFriends,
    activePlan, activeFriend, goWhen, goFriends, goSettings, goBack, openAddFriend,
    openEditFriend, openFriendProfile, openAddAvailability, openAvailability,
    openPrivacyPolicy, openOnboarding, openCreatePlan,
    openPlanDetail, toggleFriendSelection, saveFriend, deleteFriend,
    addAvailability, skipOccurrence, deleteAvailability, setAvailabilityEnabled,
    savePlanMemory, completeOnboarding, createPlan, updatePlan,
    setFriendInviteStatus, shareInvite, markPlanStatus, openMoveFriend,
    moveFriendToSlot, updateSettings, exportData, wipeData, hydrate,
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
