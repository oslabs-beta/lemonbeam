# Needle-in-the-Haystack Test — Summary for the Team

**What we wanted to know:** ChatGPT is a black box — you ask it something about a codebase, and you get a confident-sounding answer back with no way to see how it got there. We wanted to open that box a little: hand it a real GitHub repo and see whether its answers actually come from reading the code, or just from guessing convincingly. We ran 8 tests against the real `lodash/lodash` repo to find out.

**How:** Gave ChatGPT just the repo URL (no file uploads), asked about real facts buried at different depths — from a value in the root `package.json` to one line inside a 27,000-line file — then pushed for the exact file/line as proof.

## What we found

1. **It really can find deeply buried facts.** It correctly pulled out an exact, obscure value from the very last lines of a 27,246-line file, and a highly specific fact (down to matching a real GitHub issue number) from 400+ lines into a nested test file. The content itself was accurate, word-for-word, in almost every test.

2. **But it can't reliably show its work.** Every single time we asked "which exact line was that on?" — 4 out of 4 times — the line number it gave was wrong. Sometimes wrong by a little, sometimes citing a line number that didn't even exist in the file. The answer was right; the receipt was fake.

3. **Sometimes it just invents things.** We asked about a plausible-sounding detail that doesn't actually exist, twice. Once, it confidently made up a specific, convincing answer (with a fake but real-sounding name attached) instead of saying "I don't see that." The other time, it correctly said the detail wasn't there. So it's not consistent — but it can and does fabricate.

4. **It only catches its own mistakes when pushed.** The one time it fabricated an answer, it only admitted the error after we directly asked it to prove the exact source — it didn't self-check on its own. The black box doesn't open itself; you have to pry it open with the right follow-up.

## Bottom line

ChatGPT getting an answer *right* doesn't mean it's *trustworthy* — the correctness of the content and the correctness of the citation are two separate things, and the citation failed every time we checked it closely. That's what it means for it to be a black box: it hands you an answer, not the work behind it. LemonBeam is intended to close this gap by generating guides from repository evidence and requiring source citations; whether each citation is verified is a separate implementation concern.

All raw prompts, responses, and verification notes are in this folder (`test-runs/needle-haystack-chatgpt/`) for anyone who wants to check the checking.
