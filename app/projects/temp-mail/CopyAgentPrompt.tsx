"use client";

import { CheckIcon, RobotIcon } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { track } from "../../lib/analytics";

/** What an agent needs to know, in one paste. */
export const AGENT_PROMPT = `You can get a temporary email address at x45.in. It works with plain HTTP, no key needed.
1. POST https://www.x45.in/api/temp-mail/claim with JSON {"name":"anyname"} -> {name,address,token,expiresAt}
2. GET https://www.x45.in/api/temp-mail/wait?name=NAME&token=TOKEN&since=0&timeout=25 -> waits up to 25s and returns new mails
3. GET https://www.x45.in/api/temp-mail/inbox?name=NAME&token=TOKEN -> all mails, newest first
The address lives 10 minutes. Full docs: https://www.x45.in/api/temp-mail`;

export function CopyAgentPrompt({ from }: { from: "inbox" | "api" }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AGENT_PROMPT);
      setDone(true);
      track("temp_mail_agent_prompt_copied", { from });
      setTimeout(() => setDone(false), 1800);
    } catch {
      /* clipboard blocked; the text is on the API page anyway */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      className="btn-glass inline-flex h-9 items-center gap-2 rounded-full px-4 text-xs"
    >
      {done ? <CheckIcon size={14} weight="bold" /> : <RobotIcon size={14} />}
      {done ? "Copied" : "Copy for your agent"}
    </button>
  );
}
