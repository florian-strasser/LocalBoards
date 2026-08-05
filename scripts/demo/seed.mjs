// Seeds the demo database with placeholder data (users, boards, areas, cards,
// comments, an image attachment and notifications). The schema must already
// exist — the app's migrations create it on server startup, which run.sh does
// before calling this. Connection is configured via env (see defaults below).
//
// SAFETY: this TRUNCATEs tables, so it refuses to run against a database whose
// name doesn't look like a throwaway ("demo"/"test") unless DEMO_DB_FORCE=1.
import mysql from "mysql2/promise";
import { readFileSync } from "node:fs";

const cfg = {
  host: process.env.DEMO_DB_HOST ?? "127.0.0.1",
  user: process.env.DEMO_DB_USER ?? "root",
  password: process.env.DEMO_DB_PASS ?? "root1234",
  database: process.env.DEMO_DB_NAME ?? "localboards_demo",
};

if (!/demo|test/i.test(cfg.database) && process.env.DEMO_DB_FORCE !== "1") {
  console.error(
    `Refusing to seed "${cfg.database}" — the name doesn't look like a throwaway ` +
      `database (expected "demo"/"test"). Set DEMO_DB_FORCE=1 to override.`,
  );
  process.exit(1);
}

const db = await mysql.createConnection({ ...cfg, multipleStatements: true });

const mockupB64 = readFileSync(new URL("./mockup.png", import.meta.url)).toString("base64");
const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const days = (n) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

// Clean slate.
await db.query("SET FOREIGN_KEY_CHECKS=0");
for (const t of ["user","session","boards","areas","cards","comments","attachments","invitations","notifications"]) {
  await db.query(`TRUNCATE TABLE \`${t}\``);
}
await db.query("SET FOREIGN_KEY_CHECKS=1");

// --- Users ---
await db.query(
  "INSERT INTO `user` (id,name,email,emailVerified,image,role,onboarded) VALUES ?",
  [[
    ["u-alex","Alex Morgan","alex@demo.local",1,"/images/profile_placeholder_01.png","admin",1],
    ["u-ben","Ben Schmidt","ben@demo.local",1,"/images/profile_placeholder_02.png","user",1],
    ["u-carol","Carol Nguyen","carol@demo.local",1,"/images/profile_placeholder_03.png","user",1],
  ]],
);

// Session for Alex (the account the screenshots are taken as). The token is
// fixed so the screenshot script can authenticate by setting the cookie.
await db.query(
  "INSERT INTO `session` (id,expiresAt,token,userId) VALUES (?,?,?,?)",
  ["demo-sess-alex", future, process.env.DEMO_TOKEN ?? "demo-token-alex", "u-alex"],
);

// --- Boards ---
await db.query(
  "INSERT INTO `boards` (id,user,name,style,status,image) VALUES ?",
  [[
    [1,"u-alex","Product Roadmap","kanban","public","/images/board_placeholder_01.png"],
    [2,"u-alex","Website Relaunch","kanban","private","/images/board_placeholder_04.png"],
    [3,"u-alex","Personal Tasks","todo","private","/images/board_placeholder_06.png"],
    [4,"u-ben","Marketing Ideas","kanban","private","/images/board_placeholder_03.png"],
  ]],
);

// Collaborators / shares.
await db.query(
  "INSERT INTO `invitations` (board,user,permission) VALUES ?",
  [[
    [1,"u-ben","edit"],
    [1,"u-carol","read"],
    [4,"u-alex","edit"], // makes "Marketing Ideas" show under Alex's shared boards
  ]],
);

// --- Areas ---
await db.query(
  "INSERT INTO `areas` (id,board,name,sort) VALUES ?",
  [[
    [1,1,"Backlog",0],
    [2,1,"In Progress",1],
    [3,1,"Done",2],
    [4,2,"Design",0],
    [5,3,"This Week",0],
    [6,4,"Ideas",0],
  ]],
);

const richDesc =
  "Refresh the brand mark for the 2.0 launch. Keep it **simple** and _legible_ at small sizes.\n\n" +
  "### Requirements\n\n" +
  "- Works on light and dark backgrounds\n" +
  "- Scales down to a 16px favicon\n\n" +
  "- [x] Collect references\n" +
  "- [ ] First round of concepts\n" +
  "- [ ] Team review";

// --- Cards ---  [id, area, name, sort, content, status, dueDate, assignee]
await db.query(
  "INSERT INTO `cards` (id,area,name,sort,content,status,dueDate,assignee) VALUES ?",
  [[
    [1,1,"Competitor research",0,"Analyse the top five competitors and summarise their pricing.",0,null,null],
    [2,1,"Redesign the logo",1,richDesc,0,days(5),"u-ben"],
    [3,1,"Draft the pricing page",2,"Three tiers: Free, Pro, Team.",0,days(9),null],
    [4,2,"Build the public API",0,"REST endpoints for boards, cards and comments.",0,days(3),"u-alex"],
    [5,2,"New onboarding flow",1,"A three-step guided tour for first-time users.",0,null,null],
    [6,3,"Set up CI/CD",0,"Automated tests and deploys on every push.",1,null,null],
    [7,3,"Launch the landing page",1,"Ship the marketing site.",1,null,null],
    [8,4,"Website Relaunch: hero section",0,"Bold headline, product screenshot, one clear call to action.",0,null,null],
    [9,5,"Buy groceries",0,"Milk, bread, coffee.",0,null,null],
    [10,5,"Call the dentist",1,"",0,days(1),null],
    [11,5,"Finish the quarterly report",2,"Numbers are in the shared drive.",1,null,null],
    [12,6,"Referral programme",0,"Give a month free for every friend invited.",0,null,null],
    [13,6,"Launch a newsletter",1,"",0,null,null],
  ]],
);

// --- Attachment on the "Redesign the logo" card (image, opens in the lightbox) ---
await db.query(
  "INSERT INTO `attachments` (card,filename,filetype,filesize,filedata) VALUES (?,?,?,?,?)",
  [2,"logo-mockup.png","image/png",mockupB64.length,mockupB64],
);

// --- Comments on the "Redesign the logo" card ---
await db.query(
  "INSERT INTO `comments` (card,user,authorName,content,date) VALUES ?",
  [[
    [2,"u-ben",null,"Looks promising! Could we try a slightly darker blue?",days(-2)],
    [2,"u-alex",null,"Sure — I'll prepare a couple of logo options for the review.",days(-1)],
    [2,null,"Jordan Rivera","Imported from our old Trello board — keep the rounded corners 👍",days(-3)],
  ]],
);

// --- Notifications for Alex (unread → the bell shows a badge) ---
await db.query(
  "INSERT INTO `notifications` (userId,type,boardId,cardId,message,isRead) VALUES ?",
  [[
    ["u-alex","comment",1,2,'Ben Schmidt commented on "Redesign the logo"',0],
    ["u-alex","invitation",4,null,'Ben Schmidt invited you to "Marketing Ideas"',0],
    ["u-alex","card_created",1,3,'A new card "Draft the pricing page" was created',0],
  ]],
);

const [[{ c: users }]] = await db.query("SELECT COUNT(*) c FROM `user`");
const [[{ c: cards }]] = await db.query("SELECT COUNT(*) c FROM `cards`");
console.log(`seeded ${cfg.database}: ${users} users, ${cards} cards, boards 1-4`);
await db.end();
