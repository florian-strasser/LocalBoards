// Shared count of currently-open modal windows. Lets other UI react to "a
// modal is open" — e.g. the board hides its custom scrollbar and locks its
// scrolling so the page behind the modal can't move.
export function useModalOpen() {
  const count = useState<number>("modalOpenCount", () => 0);
  return {
    isOpen: computed(() => count.value > 0),
    add: () => {
      count.value++;
    },
    remove: () => {
      if (count.value > 0) count.value--;
    },
  };
}
