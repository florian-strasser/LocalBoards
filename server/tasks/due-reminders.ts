import { setupDatabase } from "~/lib/databaseSetup";
import { runDueReminders } from "../utils/dueReminders";

export default defineTask({
  meta: {
    name: "due-reminders",
    description: "Create notifications for card due-date reminders",
  },
  async run() {
    logger.debug("Checking for due card reminders");
    try {
      const fired = await runDueReminders(setupDatabase());
      return { result: "Success", fired };
    } catch (error) {
      logger.error("Error processing due-date reminders:", error);
      return { result: "Internal server error" };
    }
  },
});
