# Medium figure captions

Drag each PNG into the spot marked in the draft, then paste the caption into
Medium's caption field (it appears under the image once you click it).

All six are 1916px wide at 2x, so they stay sharp on retina. Medium's content
column is ~700px, so they'll be downscaled and look crisp.

Run `node medium/render.mjs` to rebuild every PNG from the site's own figure
components and CSS.

---

**1-why-it-grows.png** — after "None of it comes back out of that list until the source is finished."

> Why it grows. The model on the right starts blank on every call, so the message list on the left has to carry the whole history forward. A tool result appended on turn 2 is still being re-sent on turn 25.

---

**2-the-climb.png** — after "so none of this is an estimate."

> The climb. Once the agent settles into writing and filing, each turn adds under 200 tokens, but it never gets any of the early bulk back either.

---

**3-the-anatomy.png** — after "because three quarters of it was work the job had already finished."

> The anatomy. Only the two leftmost blocks are things the model still needs at this point; the rest of it records work that had already finished.

---

**4-the-split.png** — after "none of which knows the others exist."

> The split. Planning hands forward about 150 tokens, being a list of page names with one line of intent each, and that list is what replaces re-reading the pages themselves.

---

**5-same-scale.png** — after "plus one more to write the log entry."

> The same work, drawn to the same scale. The left panel climbs because every result stays in the conversation, while the right panel stays flat because each conversation ends before anything can pile up.

---

**6-stat-row.png** — after "plus one more to write the log entry.", below 5-same-scale.png

> No caption. It is the stat strip, so the numbers speak for themselves.

If you would rather keep it as text, Medium has no four-box strip, so use a
short bulleted list instead:

- Peak window used: 84% → 27%
- Context warnings: 33 → 0
- Lint findings vs baseline: 9 → 8
- Tests passing: 286

## The "Four times slower" callout

Medium's blockquote (⌘⇧5 for the large pull-quote style) is the closest match.
Use the heading as the first line, or drop the heading and let the two
paragraphs sit inside a normal blockquote.
