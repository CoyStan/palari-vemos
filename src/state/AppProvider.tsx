import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Share } from 'react-native';

import {
  expandFreeBlocksForWeek,
  invitationsForWeek,
} from '../domain/freeBlocks';
import { sortFriendsForInvite } from '../domain/friends';
import { nextIdea, pickIdea } from '../domain/ideas';
import { buildInvitationText, createInvitationDraft } from '../domain/invitation';
import { addDays, clampPriority, startOfWeek } from '../domain/time';
import type {
  AppData,
  ConcreteSlot,
  ContactMethod,
  FreeBlock,
  Friend,
  Invitation,
  InvitationStatus,
} from '../domain/types';
import {
  createId,
  emptyAppData,
  loadAppData,
  saveAppData,
} from '../persistence/storage';

export type TabId = 'calendar' | 'friends';

export type ScreenId =
  | 'loading'
  | 'welcome'
  | 'addFriend'
  | 'editFriend'
  | 'calendar'
  | 'friends'
  | 'freeTimes'
  | 'inviteDetail'
  | 'pickFriend'
  | 'moveInvite';

type FriendInput = {
  name: string;
  note: string;
  contactMethod: ContactMethod;
  priority: number;
  lastMetAt: string | null;
};

type FreeBlockInput =
  | {
    kind: 'recurring';
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    label: string;
  }
  | {
    kind: 'oneoff';
    date: string;
    startMinutes: number;
    endMinutes: number;
    label: string;
  };

type AppContextValue = {
  ready: boolean;
  loadError: string | null;
  data: AppData;
  screen: ScreenId;
  tab: TabId;
  weekStart: Date;
  editingFriendId: string | null;
  activeInvitationId: string | null;
  selectedSlot: ConcreteSlot | null;
  activeFriend: Friend | null;
  activeInvitation: Invitation | null;
  weekSlots: ConcreteSlot[];
  weekInvitations: Invitation[];
  sortedFriends: Friend[];
  goCalendar: () => void;
  goFriends: () => void;
  shiftWeek: (delta: number) => void;
  openAddFriend: (from?: 'welcome' | 'friends') => void;
  openEditFriend: (friendId: string) => void;
  openFreeTimes: () => void;
  openInviteDetail: (invitationId: string) => void;
  openPickFriend: (slot: ConcreteSlot) => void;
  openMoveInvite: () => void;
  selectSlotForMove: (slot: ConcreteSlot) => Promise<void>;
  saveFriend: (input: FriendInput, friendId?: string) => Promise<void>;
  deleteFriend: (friendId: string) => Promise<void>;
  addFreeBlock: (input: FreeBlockInput) => Promise<void>;
  deleteFreeBlock: (blockId: string) => Promise<void>;
  createInvitationForFriend: (friendId: string) => Promise<void>;
  updateInvitationFields: (
    patch: Partial<Pick<Invitation, 'idea' | 'place' | 'invitationText'>>,
  ) => void;
  tryAnotherIdea: () => void;
  shareInvitation: (message?: string) => Promise<boolean>;
  setInvitationStatus: (status: InvitationStatus) => Promise<void>;
  retryLoad: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(emptyAppData);
  const [screen, setScreen] = useState<ScreenId>('loading');
  const [tab, setTab] = useState<TabId>('calendar');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [editingFriendId, setEditingFriendId] = useState<string | null>(null);
  const [activeInvitationId, setActiveInvitationId] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<ConcreteSlot | null>(null);
  const [addFriendReturn, setAddFriendReturn] = useState<'welcome' | 'friends'>('friends');
  const [movingInvitationId, setMovingInvitationId] = useState<string | null>(null);

  const hydrate = useCallback(async () => {
    setLoadError(null);
    try {
      const loaded = await loadAppData();
      setData(loaded);
      if (!loaded.onboardingComplete || loaded.friends.length === 0) {
        setScreen('welcome');
        setTab('calendar');
      } else {
        setScreen('calendar');
        setTab('calendar');
      }
      setReady(true);
    } catch {
      setLoadError('Something went wrong loading your data. Please try again.');
      setReady(true);
      setScreen('welcome');
    }
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const commit = useCallback(async (next: AppData) => {
    setData(next);
    await saveAppData(next);
  }, []);

  const activeInvitation = useMemo(
    () => data.invitations.find((invite) => invite.id === activeInvitationId) ?? null,
    [activeInvitationId, data.invitations],
  );

  const activeFriend = useMemo(() => {
    if (activeInvitation) {
      return data.friends.find((friend) => friend.id === activeInvitation.friendId) ?? null;
    }
    return null;
  }, [activeInvitation, data.friends]);

  const weekSlots = useMemo(
    () => expandFreeBlocksForWeek(data.freeBlocks, weekStart),
    [data.freeBlocks, weekStart],
  );

  const weekInvitations = useMemo(
    () => invitationsForWeek(data.invitations, weekStart),
    [data.invitations, weekStart],
  );

  const sortedFriends = useMemo(
    () => sortFriendsForInvite(data.friends),
    [data.friends],
  );

  const goCalendar = useCallback(() => {
    setTab('calendar');
    setScreen('calendar');
    setEditingFriendId(null);
    setSelectedSlot(null);
    setMovingInvitationId(null);
  }, []);

  const goFriends = useCallback(() => {
    setTab('friends');
    setScreen('friends');
    setEditingFriendId(null);
    setSelectedSlot(null);
    setMovingInvitationId(null);
  }, []);

  const shiftWeek = useCallback((delta: number) => {
    setWeekStart((current) => startOfWeek(addDays(current, delta * 7)));
  }, []);

  const openAddFriend = useCallback((from: 'welcome' | 'friends' = 'friends') => {
    setAddFriendReturn(from);
    setEditingFriendId(null);
    setScreen('addFriend');
  }, []);

  const openEditFriend = useCallback((friendId: string) => {
    setEditingFriendId(friendId);
    setScreen('editFriend');
  }, []);

  const openFreeTimes = useCallback(() => {
    setScreen('freeTimes');
  }, []);

  const openInviteDetail = useCallback((invitationId: string) => {
    setActiveInvitationId(invitationId);
    setScreen('inviteDetail');
  }, []);

  const openPickFriend = useCallback((slot: ConcreteSlot) => {
    setSelectedSlot(slot);
    setMovingInvitationId(null);
    setScreen('pickFriend');
  }, []);

  const openMoveInvite = useCallback(() => {
    if (!activeInvitationId) {
      return;
    }
    setMovingInvitationId(activeInvitationId);
    setScreen('moveInvite');
  }, [activeInvitationId]);

  const saveFriend = useCallback(async (input: FriendInput, friendId?: string) => {
    const trimmedName = input.name.trim();
    if (!trimmedName) {
      return;
    }
    const now = new Date().toISOString();
    const priority = clampPriority(input.priority);

    if (friendId) {
      const nextFriends = data.friends.map((friend) => (
        friend.id === friendId
          ? {
            ...friend,
            name: trimmedName,
            note: input.note.trim(),
            contactMethod: input.contactMethod,
            priority,
            lastMetAt: input.lastMetAt,
          }
          : friend
      ));
      await commit({ ...data, friends: nextFriends, onboardingComplete: true });
      setEditingFriendId(null);
      goFriends();
      return;
    }

    const friend: Friend = {
      id: createId('friend'),
      name: trimmedName,
      note: input.note.trim(),
      contactMethod: input.contactMethod,
      priority,
      lastMetAt: input.lastMetAt,
      createdAt: now,
    };

    await commit({
      ...data,
      onboardingComplete: true,
      friends: [...data.friends, friend],
    });

    if (addFriendReturn === 'welcome' || data.friends.length === 0) {
      goCalendar();
    } else {
      goFriends();
    }
  }, [addFriendReturn, commit, data, goCalendar, goFriends]);

  const deleteFriend = useCallback(async (friendId: string) => {
    const nextFriends = data.friends.filter((friend) => friend.id !== friendId);
    const nextInvitations = data.invitations.filter((invite) => invite.friendId !== friendId);
    await commit({
      ...data,
      friends: nextFriends,
      invitations: nextInvitations,
      onboardingComplete: nextFriends.length > 0,
    });
    if (nextFriends.length === 0) {
      setScreen('welcome');
      setTab('calendar');
    } else {
      goFriends();
    }
  }, [commit, data, goFriends]);

  const addFreeBlock = useCallback(async (input: FreeBlockInput) => {
    const block: FreeBlock = input.kind === 'recurring'
      ? {
        id: createId('block'),
        kind: 'recurring',
        dayOfWeek: input.dayOfWeek,
        startMinutes: input.startMinutes,
        endMinutes: input.endMinutes,
        label: input.label.trim(),
      }
      : {
        id: createId('block'),
        kind: 'oneoff',
        date: input.date,
        startMinutes: input.startMinutes,
        endMinutes: input.endMinutes,
        label: input.label.trim(),
      };
    await commit({ ...data, freeBlocks: [...data.freeBlocks, block] });
  }, [commit, data]);

  const deleteFreeBlock = useCallback(async (blockId: string) => {
    await commit({
      ...data,
      freeBlocks: data.freeBlocks.filter((block) => block.id !== blockId),
    });
  }, [commit, data]);

  const createInvitationForFriend = useCallback(async (friendId: string) => {
    const friend = data.friends.find((item) => item.id === friendId);
    if (!friend || !selectedSlot) {
      return;
    }

    const idea = pickIdea(`${friend.id}:${selectedSlot.startAt}`);
    const draft = createInvitationDraft({
      friend,
      startAt: selectedSlot.startAt,
      endAt: selectedSlot.endAt,
      idea: idea.idea,
      place: idea.place,
    });
    const now = new Date().toISOString();
    const invitation: Invitation = {
      ...draft,
      id: createId('invite'),
      createdAt: now,
      updatedAt: now,
    };

    await commit({
      ...data,
      invitations: [invitation, ...data.invitations],
    });
    setSelectedSlot(null);
    setActiveInvitationId(invitation.id);
    setScreen('inviteDetail');
  }, [commit, data, selectedSlot]);

  const selectSlotForMove = useCallback(async (slot: ConcreteSlot) => {
    if (!movingInvitationId) {
      return;
    }
    const current = data.invitations.find((invite) => invite.id === movingInvitationId);
    if (!current) {
      return;
    }
    const friend = data.friends.find((item) => item.id === current.friendId);
    if (!friend) {
      return;
    }

    const now = new Date().toISOString();
    const invitationText = buildInvitationText({
      name: friend.name,
      idea: current.idea,
      place: current.place,
      startAt: slot.startAt,
      endAt: slot.endAt,
    });

    const moved: Invitation = {
      ...current,
      id: createId('invite'),
      startAt: slot.startAt,
      endAt: slot.endAt,
      invitationText,
      status: current.status === 'to_send' ? 'to_send' : 'sent',
      movedFromId: current.id,
      createdAt: now,
      updatedAt: now,
    };

    const nextInvitations = data.invitations.map((invite) => (
      invite.id === current.id
        ? { ...invite, status: 'moved' as const, updatedAt: now }
        : invite
    ));

    await commit({
      ...data,
      invitations: [moved, ...nextInvitations],
    });
    setMovingInvitationId(null);
    setActiveInvitationId(moved.id);
    setScreen('inviteDetail');
  }, [commit, data, movingInvitationId]);

  const updateInvitationFields = useCallback((
    patch: Partial<Pick<Invitation, 'idea' | 'place' | 'invitationText'>>,
  ) => {
    if (!activeInvitationId) {
      return;
    }
    setData((current) => ({
      ...current,
      invitations: current.invitations.map((invite) => (
        invite.id === activeInvitationId
          ? { ...invite, ...patch, updatedAt: new Date().toISOString() }
          : invite
      )),
    }));
  }, [activeInvitationId]);

  const tryAnotherIdea = useCallback(() => {
    if (!activeFriend || !activeInvitation) {
      return;
    }
    const idea = nextIdea(activeInvitation.idea);
    updateInvitationFields({
      idea: idea.idea,
      place: idea.place,
      invitationText: buildInvitationText({
        name: activeFriend.name,
        idea: idea.idea,
        place: idea.place,
        startAt: activeInvitation.startAt,
        endAt: activeInvitation.endAt,
      }),
    });
  }, [activeFriend, activeInvitation, updateInvitationFields]);

  const shareInvitation = useCallback(async (message?: string) => {
    if (!activeInvitation || !activeFriend) {
      return false;
    }

    const invitationText = (message ?? activeInvitation.invitationText).trim();
    if (!invitationText) {
      return false;
    }

    const now = new Date().toISOString();
    const nextInvitations = data.invitations.map((invite) => (
      invite.id === activeInvitation.id
        ? {
          ...activeInvitation,
          invitationText,
          status: 'sent' as const,
          updatedAt: now,
        }
        : invite
    ));
    await commit({ ...data, invitations: nextInvitations });

    try {
      const result = await Share.share({ message: invitationText });
      if (result.action === Share.dismissedAction) {
        return false;
      }
      return true;
    } catch {
      return false;
    }
  }, [activeFriend, activeInvitation, commit, data]);

  const setInvitationStatus = useCallback(async (status: InvitationStatus) => {
    if (!activeInvitation) {
      return;
    }
    const now = new Date().toISOString();
    let nextFriends = data.friends;
    if (status === 'accepted') {
      nextFriends = data.friends.map((friend) => (
        friend.id === activeInvitation.friendId
          ? { ...friend, lastMetAt: now }
          : friend
      ));
    }

    const nextInvitations = data.invitations.map((invite) => (
      invite.id === activeInvitation.id
        ? { ...invite, status, updatedAt: now }
        : invite
    ));

    await commit({
      ...data,
      friends: nextFriends,
      invitations: nextInvitations,
    });
    goCalendar();
  }, [activeInvitation, commit, data, goCalendar]);

  const value = useMemo<AppContextValue>(() => ({
    ready,
    loadError,
    data,
    screen,
    tab,
    weekStart,
    editingFriendId,
    activeInvitationId,
    selectedSlot,
    activeFriend,
    activeInvitation,
    weekSlots,
    weekInvitations,
    sortedFriends,
    goCalendar,
    goFriends,
    shiftWeek,
    openAddFriend,
    openEditFriend,
    openFreeTimes,
    openInviteDetail,
    openPickFriend,
    openMoveInvite,
    selectSlotForMove,
    saveFriend,
    deleteFriend,
    addFreeBlock,
    deleteFreeBlock,
    createInvitationForFriend,
    updateInvitationFields,
    tryAnotherIdea,
    shareInvitation,
    setInvitationStatus,
    retryLoad: hydrate,
  }), [
    ready,
    loadError,
    data,
    screen,
    tab,
    weekStart,
    editingFriendId,
    activeInvitationId,
    selectedSlot,
    activeFriend,
    activeInvitation,
    weekSlots,
    weekInvitations,
    sortedFriends,
    goCalendar,
    goFriends,
    shiftWeek,
    openAddFriend,
    openEditFriend,
    openFreeTimes,
    openInviteDetail,
    openPickFriend,
    openMoveInvite,
    selectSlotForMove,
    saveFriend,
    deleteFriend,
    addFreeBlock,
    deleteFreeBlock,
    createInvitationForFriend,
    updateInvitationFields,
    tryAnotherIdea,
    shareInvitation,
    setInvitationStatus,
    hydrate,
  ]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextValue {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp must be used within AppProvider');
  }
  return value;
}
