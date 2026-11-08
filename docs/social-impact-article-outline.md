# Social Impact Tour — Article Writing Guide (write it in YOUR words)

This is a scaffold, NOT text to paste. The form bans AI-written articles and asks for
YOUR journey, so write each section yourself. Use the prompts to get going and the
"Facts you can cite" so nothing you say about the tech is wrong.

**Format rules for the submission box:**
- Plain text only — no `#`, no `**`, no Markdown. Just paragraphs with a blank line between them.
- Don't put image links in the text. Upload the photos in the separate "additional photos" field.
- Aim for ~600–900 words. Write like you talk.

---

## Suggested flow (4 short sections)

### Opening (3–5 sentences)
Hook the reader with a scene you have actually seen. Prompts:
- What does waste/flooding look like in Molyko when the rains come? Describe one real moment.
- Why did it bother YOU enough to build something? One honest sentence.
- End the opening by naming the project: EcoPulse, and what it is in one line.

### 1. The problem and why it matters (1 paragraph)
Prompts:
- How is waste collection handled now (paper rounds, phone calls, no way for residents to report)?
- Who is affected, and how? (markets, student areas, blocked drains, flooding)
- Name your goals: which SDGs and UNAI principle, and what you personally set out to achieve this Fellowship.

### 2. What you built (1–2 paragraphs)
Walk through it in your own words — don't list specs, tell what each part lets a real person do.
Prompts:
- The dashboard: what can a city official now see and do that they couldn't before?
- Report assignment: tell the story of a report going from a resident to the nearest collector.
- The proof step: why did you add photo + GPS proof, and what does it stop?
- The resident app: what does an ordinary person do with it?

### 3. Leadership reflections (1–2 paragraphs)
This is the part they most want — your growth, not your code.
Prompts:
- The inclusion decision: you let residents join with just a name + phone (no email) so market
  traders and less tech-savvy people aren't shut out. Why did that matter to you? How did empathy
  change a technical choice?
- Designing for low data/cost (compressing photos, free OpenStreetMap, no sensors) — what did that
  teach you about building for your context, not Silicon Valley's?
- How did you keep yourself on track (your SMART milestones, testing on a real phone)?

### 4. Key learnings and advice (3–4 short points or a closing paragraph)
Prompts:
- One thing you got wrong or underestimated, and what you learned.
- Your advice to another young change-maker about building for proximity / data gaps / open-source.
- A closing line about what EcoPulse means to you and Buea.

---

## Facts you can cite (these are accurate — don't overstate)

- Covers four Buea zones: Molyko, Great Soppo, Bonduma, Buea Town.
- Backend: Node.js + Express + MongoDB. Admin dashboard: React. Both mobile apps: Expo (Android).
- Residents sign up with only a name and phone number — NO email — and are tied to their device.
- Collectors sign in with an email and password (an admin can issue a temporary one). (It is NOT a PIN.)
- Proof of collection: the collector photographs the cleaned spot; the server checks the phone's GPS
  location against the bin using the Haversine (great-circle) distance before an admin approves it.
- Reports are assigned to collectors, with collectors in the same zone suggested first.
- Bilingual: English and French throughout the apps.
- No bin sensors and no paid map keys — maps use OpenStreetMap. Photos are compressed on the phone.
- Alignment: SDG 11 (Sustainable Cities and Communities), SDG 9 (Industry, Innovation and
  Infrastructure), UNAI Principle 9 (promoting sustainability).

## Terminology
- Write "Millennium Fellowship" and "Millennium Fellow". Do not put "UN" or "MCN" before "Fellowship".

---

When you've written your draft, paste it back to me and I'll help tighten the grammar, flow and
length — editing your own words is fine under the rules.
