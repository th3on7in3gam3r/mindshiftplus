import { describe, it, expect } from "vitest";
import { groupStaffThreads, threadKey } from "../lib/staffChatUtils";

describe("staffChatUtils", () => {
  const me = "user-a";
  const staffById = {
    "user-b": { full_name: "Rachel Nakkazi" },
  };

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
});
