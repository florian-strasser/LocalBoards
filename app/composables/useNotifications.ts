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
export const useNotifications = () => {
  const notifications = useState<any[]>("notifications", () => []);
  const userId = useState<string>("notificationsUserId", () => "");

  const unreadCount = computed(
    () => notifications.value.filter((n: any) => !n.isRead).length,
  );

  // Forwards the session cookie when this runs during SSR, and is a plain
  // $fetch in the browser.
  const request = useRequestFetch();

  const refresh = async (id?: string) => {
    if (id) userId.value = id;
    if (!userId.value) return;
    try {
      const res: any = await request(
        `/api/data/notifications?userId=${userId.value}`,
      );
      notifications.value = res?.notifications ?? [];
    } catch (err) {
      console.error("Error fetching notifications:", err);
    }
  };

  return { notifications, unreadCount, refresh };
};
