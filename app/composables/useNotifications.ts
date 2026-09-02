// The header bell's notifications, shared app-wide.
//
// Notifications are read somewhere other than the bell: opening a card or a
// board marks them read on the server (see the PATCH in
// server/api/data/notifications.ts). While the bell kept its own private copy
// of the list, nothing told it about that — so the unread dot kept glowing
// until the next full page load.
//
// Both sides now use this state: the bell renders it, and whoever marks
// something read calls refresh() afterwards.
//
// The list arrives a page at a time. An account that has been in use for a year
// has thousands of notifications, and the bell was sending all of them to the
// browser to show the first handful.
export const useNotifications = () => {
  const notifications = useState<any[]>("notifications", () => []);
  const userId = useState<string>("notificationsUserId", () => "");
  // Counted by the server over everything, not over the page in hand: the dot
  // has to answer for unread notifications further down the list too.
  const unreadCount = useState<number>("notificationsUnread", () => 0);
  const hasMore = useState<boolean>("notificationsHasMore", () => false);
  const loadingMore = useState<boolean>("notificationsLoadingMore", () => false);

  // Enough to fill the panel a few times over without being a page of history.
  const PAGE_SIZE = 25;

  // Forwards the session cookie when this runs during SSR, and is a plain
  // $fetch in the browser.
  const request = useRequestFetch();

  const fetchPage = async (before?: number) => {
    const params = new URLSearchParams({
      userId: userId.value,
      limit: String(PAGE_SIZE),
    });
    if (before) params.set("before", String(before));
    return (await request(`/api/data/notifications?${params}`)) as any;
  };

  // The newest page, replacing whatever was on screen. Also how the unread dot
  // is brought up to date after something is marked read elsewhere.
  const refresh = async (id?: string) => {
    if (id) userId.value = id;
    if (!userId.value) return;
    try {
      const res = await fetchPage();
      notifications.value = res?.notifications ?? [];
      hasMore.value = Boolean(res?.hasMore);
      unreadCount.value = Number(res?.unreadCount ?? 0);
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  // The next page back, appended. Carries on from the oldest row in hand rather
  // than from a count, so notifications arriving in between cannot shift the
  // window under the reader.
  const loadMore = async () => {
    if (!userId.value || !hasMore.value || loadingMore.value) return;
    const oldest = notifications.value[notifications.value.length - 1];
    if (!oldest) return;
    loadingMore.value = true;
    try {
      const res = await fetchPage(Number(oldest.id));
      const older = res?.notifications ?? [];
      // Defensive: a row already in hand should never come back, but appending
      // a duplicate would break `:key` and render it twice.
      const seen = new Set(notifications.value.map((n: any) => n.id));
      notifications.value = [
        ...notifications.value,
        ...older.filter((n: any) => !seen.has(n.id)),
      ];
      hasMore.value = Boolean(res?.hasMore);
      unreadCount.value = Number(res?.unreadCount ?? unreadCount.value);
    } catch (err) {
      console.error("Error fetching older notifications:", err);
    } finally {
      loadingMore.value = false;
    }
  };

  return { notifications, unreadCount, hasMore, loadingMore, refresh, loadMore };
};
