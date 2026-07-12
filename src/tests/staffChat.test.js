import { describe, it, expect } from "vitest";
import {
  groupStaffThreads,
  threadKey,
  parseMentionedUserIds,
  threadMatchesSearch,
  insertMention,
} from "../lib/staffChatUtils";

describe("staffChatUtils", () => {
  const me = "user-a";
  const team = [
    { user_id: "user-b", full_name: "Rachel Nakkazi", title: "PMHNP-BC" },
    { user_id: "user-c", full_name: "Kenneth Mutegyeki", title: "PMHNP-BC" },
  ];
  const staffById = Object.fromEntries(team.map((m) => [m.user_id, m]));

  it("groups messages into threads", () => {
    const messages = [
      { id: "1", thread_id: null, from_user: me, to_user: null, body: "Team hello", created_at: "2026-01-01T10:00:00Z", read_by_me: true },
      { id: "2", thread_id: "1", from_user: "user-b", to_user: null, body: "Reply", created_at: "2026-01-01T10:05:00Z", read_by_me: false },
    ];
    const threads = groupStaffThreads(messages, me, staffById);
    expect(threads).toHaveLength(1);
    expect(threads[0].messages).toHaveLength(2);
    expect(threads[0].hasUnread).toBe(true);
    expect(threadKey(messages[0])).toBe("1");
  });

  it("separates direct messages from team chat", () => {
    const messages = [
      { id: "d1", thread_id: null, from_user: me, to_user: "user-b", body: "Hi Rachel", created_at: "2026-01-02T10:00:00Z", read_by_me: true },
    ];
    const threads = groupStaffThreads(messages, me, staffById);
    expect(threads[0].isDirect).toBe(true);
    expect(threads[0].isTeam).toBe(false);
  });

  it("parses @mentions from message body", () => {
    const ids = parseMentionedUserIds("@Rachel can you cover my 2pm?", team, me);
    expect(ids).toEqual(["user-b"]);
  });

  it("flags threads that mention the current user", () => {
    const messages = [
      {
        id: "1",
        thread_id: null,
        from_user: "user-c",
        to_user: null,
        body: "@Rachel please review",
        mentioned_user_ids: ["user-b"],
        created_at: "2026-01-01T10:00:00Z",
        read_by_me: false,
      },
    ];
    const threads = groupStaffThreads(messages, "user-b", staffById);
    expect(threads[0].hasMention).toBe(true);
  });

  it("searches thread text and patient context", () => {
    const thread = {
      subject: "Coverage",
      patientContext: "John Smith",
      messages: [{ body: "refill question", from_name: "Kenneth" }],
    };
    expect(threadMatchesSearch(thread, "john")).toBe(true);
    expect(threadMatchesSearch(thread, "refill")).toBe(true);
    expect(threadMatchesSearch(thread, "billing")).toBe(false);
  });

  it("inserts @mention first name", () => {
    expect(insertMention("Hey @Ra", team[0])).toBe("Hey @Rachel ");
  });
});
