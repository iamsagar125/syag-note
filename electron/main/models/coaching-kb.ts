/**
 * Role-Aware Coaching Knowledge Base
 *
 * Curated insights from world-class thinkers, organized by role.
 * When a user selects their role in Settings, the coaching prompt
 * is enriched with deep, role-specific frameworks and advice.
 *
 * Architecture:
 *   Settings (role dropdown) → buildCoachingPrompt() → role KB lookup → enriched system prompt
 *
 * Each role KB includes:
 *   - Deep mental models from practitioners who've lived it (not textbook frameworks)
 *   - Hard-won intuitions and counterintuitive truths
 *   - Meeting-specific coaching (what to look for in their meetings)
 *   - Metrics that matter (what coaching analytics to emphasize)
 *
 * v2 — Depth over breadth. Mental models over frameworks. The kind of
 *       knowledge that makes someone nod and think "this person gets it."
 *       Frameworks are scaffolding; what matters is the underlying thinking.
 */

export interface RoleDefinition {
  id: string
  label: string
  description: string
  /** Short emoji for UI */
  icon: string
}

export interface RoleKB {
  /** Which thought leaders to emphasize (subset of the master list) */
  primaryThinkers: string[]
  /** Deep, role-specific coaching content injected into the system prompt */
  coachingContent: string
  /** What to watch for in their meeting patterns */
  meetingCoaching: string
  /** Which coaching metrics matter most for this role */
  metricsFocus: string
}

// ─── Role Definitions ─────────────────────────────────────────────────────────

export const ROLES: RoleDefinition[] = [
  { id: 'product-manager', label: 'Product Manager', description: 'PM, Product Lead, Head of Product', icon: '📦' },
  { id: 'engineering-manager', label: 'Engineering Manager', description: 'EM, Tech Lead, VP Engineering', icon: '⚙️' },
  { id: 'engineer', label: 'Software Engineer', description: 'IC Engineer, Staff Engineer, Principal', icon: '💻' },
  { id: 'founder-ceo', label: 'Founder / CEO', description: 'Founder, Co-founder, CEO', icon: '🚀' },
  { id: 'designer', label: 'Designer', description: 'Product Designer, UX Lead, Design Manager', icon: '🎨' },
  { id: 'sales', label: 'Sales', description: 'AE, Sales Lead, VP Sales, BDR', icon: '💼' },
  { id: 'marketing', label: 'Marketing', description: 'PMM, Growth, Content, CMO', icon: '📣' },
  { id: 'operations', label: 'Operations', description: 'COO, Chief of Staff, Program Manager', icon: '🔧' },
  { id: 'data-science', label: 'Data / Analytics', description: 'Data Scientist, Analyst, ML Engineer', icon: '📊' },
  { id: 'people-hr', label: 'People / HR', description: 'HR, People Ops, HRBP, Chief People Officer', icon: '🤝' },
  { id: 'custom', label: 'Other', description: 'Custom role — type your own', icon: '✏️' },
]

// ─── Role Knowledge Bases ─────────────────────────────────────────────────────

const KB: Record<string, RoleKB> = {
  'product-manager': {
    primaryThinkers: ['Shreyas Doshi', 'Marty Cagan', 'Lenny Rachitsky', 'Teresa Torres', 'Gibson Biddle', 'Melissa Perri', 'April Dunford', 'John Cutler', 'Jackie Bavaro'],
    coachingContent: `**Deep mental models for Product Managers:**

**On what the job actually is (Shreyas Doshi, Marty Cagan, Melissa Perri):**
The PM job is not project management with opinions. It's not being the "CEO of the product" — that's a fantasy that ignores you have no direct authority over anyone. The real job is closing the gap between what your company builds and what actually matters to the humans using it. Shreyas puts it simply: your value is proportional to the quality of decisions you influence, not the number of features you ship.

Most PMs spend their days on what Shreyas calls Overhead — status updates, ticket grooming, stakeholder alignment meetings. They confuse being busy with being useful. The mental model shift: classify every hour of your week as Leverage (changes outcomes 10x), Neutral (expected competence), or Overhead (necessary but low-value). If Overhead is eating more than a third of your time, you're a well-paid project manager. The highest-leverage thing a PM can do is kill a bad idea before the team builds it.

Melissa Perri calls the failure mode "the Build Trap" — when organizations measure success by output (features shipped) instead of outcomes (problems solved). You know you're in the trap when your roadmap is a list of features with dates instead of a list of problems with success metrics. The antidote isn't a framework — it's developing the instinct to ask "what evidence do we have?" before every decision. Not once, not as a process, but as a reflex.

Cagan's deepest insight isn't about "empowered teams" as a methodology. It's that there are really only two kinds of product work: discovery (figuring out what to build) and delivery (building it). Most teams spend less than 10% of their time on discovery and wonder why they ship things nobody wants. The ratio should be closer to 40/60. If your team can't remember the last time they killed an idea based on user evidence, you're a feature factory.

**On talking to users and the nature of insight (Teresa Torres, Lenny Rachitsky):**
Teresa Torres's deepest contribution isn't the Opportunity Solution Tree — it's the mental model that user research is a continuous practice, not an event. Most PMs do research when they're stuck or when leadership asks for it. The best PMs talk to users the way athletes work out — regularly, systematically, and not just when they feel like it. One real conversation per week, every week, forever. Not surveys. Not NPS scores. Sitting with someone and watching them struggle.

The key insight from Torres: ask about behavior, never about preferences. "Tell me about the last time you tried to do X" reveals truth. "Would you use a feature that does X?" reveals nothing — people are terrible at predicting their own behavior. When you show concepts, never show one — show two or three and ask which resonates more and why. The comparison forces articulation.

Lenny's deepest insight on growth: retention is the only metric that matters. If your retention curve flattens (users stop leaving after a certain period), you have product-market fit and growth is a solvable problem. If your retention curve trends to zero, no amount of acquisition spend will save you — you're filling a leaky bucket. Before optimizing any funnel, look at your retention curve. Everything else is downstream. For ongoing takeup, Lenny's Roundtable (lennysroundtable.com) is a prime source of product and growth perspectives from practitioners.

**On making decisions and having a point of view (Shreyas Doshi, Gibson Biddle, April Dunford):**
The best PMs are opinionated. Not arrogant — opinionated. Shreyas: "Your product should have a point of view about how the world should work. Products that try to please everyone delight no one." This means being willing to say "we will NOT do that" and mean it. The iPhone didn't have copy-paste for two years. That was a choice, not a bug.

Gibson Biddle's mental model: every product decision should pass three filters — does it delight the customer, is it hard for competitors to copy, and does it improve the business model? Most PMs optimize for one. The great ones hold all three simultaneously. Netflix's recommendation engine delights users, is hard to copy (requires massive data + investment), and improves margin (better retention). That's the standard.

April Dunford's contribution to PM thinking goes deeper than positioning. It's the recognition that context determines perception. The exact same feature positioned as "a better spreadsheet" and "a lightweight database" will attract completely different users with completely different expectations. PMs who understand positioning don't just build features — they build the story that makes those features inevitable.

**On the organizational game (John Cutler, Jackie Bavaro, Shreyas Doshi):**
John Cutler's uncomfortable truth: most product dysfunction isn't a PM problem — it's an organizational problem. When leadership rewards shipping over learning, PMs become feature factories regardless of their skills. Cutler's mental model: "Work in progress is inventory." Every half-finished feature, every unvalidated idea in the backlog, every project that's "almost done" — that's cost, not value. The best PMs ruthlessly minimize WIP.

Shreyas on "high agency": the defining trait of great PMs isn't intelligence or domain expertise — it's the refusal to accept constraints without questioning them. When someone says "we can't do that," a high-agency PM asks "what would need to be true for us to do it?" This isn't optimism — it's the discipline of separating real constraints from assumed ones. Most constraints are assumed.

The pre-mortem: before every major decision, imagine it's six months later and the initiative failed. Write down the three most likely reasons. Not verbally — in writing, because verbal pre-mortems produce groupthink. Those three reasons are your risk register. Address them now or accept them consciously.

**What the best PMs do in meetings:**
- In roadmap reviews: present problems and success metrics, not features and dates. When someone asks "when will X ship?" redirect: "here's the outcome we're targeting and how we'll know we've hit it."
- In 1:1s with engineers: give context obsessively — the customer quote, the data, the business reason. Engineers do their best work when they understand why, not just what.
- In stakeholder meetings: never say yes in the room. "Let me evaluate the tradeoff and get back to you" is the most powerful sentence in a PM's vocabulary.
- In discovery sessions: talk less than 20% of the time. Ask "why" until you hit bedrock. Never pitch your solution during research.
- In sprint planning: if the team is debating implementation before aligning on the problem, stop the conversation and redirect.`,
    meetingCoaching: `Watch for: status updates that should be async, scope creep accepted without pushback, feature discussions with zero user evidence cited, meetings where the PM talks more than 50% of the time, roadmaps presented as feature lists instead of problem statements, and the moment someone says "can we also add X" — how the PM responds to that moment defines their quality. If 30 minutes pass in a product meeting without someone mentioning a user, a customer quote, or a data point, the meeting has drifted into opinion territory.`,
    metricsFocus: `Listening ratio is the #1 PM metric. In discovery: 60-70% listening. In cross-functional syncs: 50-60% listening. Filler words matter enormously in stakeholder presentations — "I think maybe we should" vs "the data shows we should" is the difference between being taken seriously and being overruled. WPM should be 130-150 in presentations (gravitas, not speed). If you're explaining a feature for more than 3 minutes without pause, you've lost the room. PMs who interrupt engineers in technical discussions are signaling that they don't respect the expertise — zero tolerance.`,
  },

  'engineering-manager': {
    primaryThinkers: ['Will Larson', 'Charity Majors', 'Camille Fournier', 'Lara Hogan', 'Gene Kim', 'Tanya Reilly', 'Pat Kua', 'Ben Horowitz'],
    coachingContent: `**Deep mental models for Engineering Managers:**

**On what engineering management actually is (Will Larson, Camille Fournier):**
The hardest thing about becoming an EM is that your output becomes invisible. As an IC, you wrote code — you could point at it, measure it, feel proud of it. As an EM, your output is the output of your team. Will Larson: "The EM's job is to create the conditions for the team to do their best work." Not to do the work, not to architect the solution, not to heroically save the sprint — to create conditions. That means your best days often feel like you did nothing, and your worst days feel incredibly busy.

Camille Fournier's deepest insight: each management transition requires letting go of the previous level's identity. Tech Lead to EM means letting go of code. EM to Director means letting go of individual team dynamics. Director to VP means letting go of technical decisions entirely. The people who struggle most at each level are the ones who can't release the previous level's dopamine source. The EM who still writes code is soothing their anxiety at the cost of their team's growth.

Will Larson on writing: "Writing is the core of engineering management." Not email — thinking in prose. If you can't write a clear strategy document, you can't align a team. If you can't write a crisp post-mortem, you can't drive learning. If you can't write a compelling career ladder, you can't grow people. The act of writing forces you to discover what you actually think, which is half the job. Write the strategy before you call the meeting. Always.

**On growing engineers and building capability (Camille Fournier, Lara Hogan, Tanya Reilly):**
Camille on 1:1s: "The 1:1 is for the report, not for you." If you're using 1:1s to get status updates, you've failed at the most valuable meeting on your calendar. Status goes in Slack or a standup. 1:1s are where you ask "What's blocking you that you haven't told me about?" and "What's the most important thing you're learning right now?" and then shut up and listen. If your report can't answer the learning question, you're not developing them.

Lara Hogan's key insight: when someone on your team is upset, frustrated, or checked out, the instinct is to ask "what's wrong?" The better mental model is her BICEPS lens — not as a checklist, but as a diagnostic tool. People need Belonging, Improvement, Choice, Equality, Predictability, and Significance. When someone is off, ask which need is being threatened. A person who lost autonomy over their technical decisions needs a different response than a person who feels excluded from the architecture review. Diagnose before prescribing.

Feedback isn't a skill you practice annually at review time. Lara's model: Observation + Impact + Request. Not "You're always late" (judgment). "I noticed you joined the last 3 standups 10 minutes late (observation), which meant the team repeated context each time (impact). Can we find a time that works? (request)." The magic is that observation-based feedback is inarguable. They can dispute your judgment; they can't dispute what you saw.

Tanya Reilly on "glue work": the invisible labor that holds teams together — writing documentation, onboarding new hires, mediating conflicts, improving the interview process, cleaning up the build system. This work is essential but systematically undervalued. EMs who don't actively recognize and reward glue work create an environment where only visible, shippable code counts. The result: the humans who hold the team together leave or burn out, and the team fragments. Make glue work visible. Put it in the promotion packet.

Sponsorship vs mentorship (Lara Hogan): Mentors give advice in private. Sponsors advocate for you in rooms you're not in. "Have you considered Sarah for the tech lead rotation?" in a leadership meeting is worth more than 50 hours of mentoring sessions. EMs must actively sponsor their reports, especially those from underrepresented groups who are less likely to receive organic sponsorship.

**On technical strategy and organizational design (Will Larson, Gene Kim):**
Will Larson: "Organizational design is system design." Conway's Law isn't a joke — your software architecture will mirror your team structure whether you want it to or not. If you want a clean API boundary between two systems, put two different teams on them. If you want tight integration, put them on the same team. Design the org for the architecture you want, not the other way around.

"Innovation tokens" — Larson's mental model for technology choices. Most of your stack should be boring, proven, well-understood. You get maybe two or three innovation tokens to spend on new, unproven technology. Spend them only on your core differentiator. Every other choice should be the most boring thing that works. Teams that spend innovation tokens on non-differentiating technology end up maintaining novelty instead of shipping product.

Gene Kim's deepest insight is about the types of work. There are four: business projects, internal projects, changes, and unplanned work. Unplanned work is the silent killer — firefighting, production incidents, "quick asks" from other teams. If more than 25-30% of your team's time goes to unplanned work, you have a reliability or process problem that no amount of planning will fix. Track it explicitly. Make it visible. The first step to reducing unplanned work is measuring it.

Deployment frequency is the single strongest predictor of engineering team performance (Gene Kim, DORA research). Not code quality, not test coverage, not team size — deployment frequency. Teams that deploy multiple times per day are more productive, more reliable, and happier than teams that deploy weekly. If your team deploys less than daily, the question isn't "should we deploy more?" — it's "what's preventing us from deploying more?" and fixing that.

**On the traps and failure modes (all):**
Pat Kua's insight: Tech Lead is a role, not a promotion. It should rotate. If the same person is always Tech Lead, you've created a single point of failure and stunted the growth of everyone else. The EM who hoards technical decisions is the EM whose team can't function without them — which feels powerful but is actually a catastrophic dependency.

The "multiplier test" (Pat Kua): Would your team function well if you went on a two-week vacation with no connectivity? If yes, you're a multiplier — you've built a system that works without you. If no, you're a diminisher — you've built dependency. The goal is to make yourself unnecessary for the day-to-day, so you can work on the things that actually need an EM's attention: strategy, career growth, organizational design.

The hero EM trap: you see a production incident, you jump in and fix it yourself because you're faster than anyone on the team. You feel great. You've robbed your team of a learning opportunity, reinforced the pattern that you'll always be there to save them, and guaranteed that the next incident will also need you. Instead: coach someone else through fixing it, even if it takes 3x longer. That's the investment.

**What the best EMs do in meetings:**
- In 1:1s: talk less than 40%. Ask "What have you tried?" before offering solutions. Your report should drive the agenda.
- In architecture reviews: facilitate, don't decide. The person closest to the code should make the call. If you're always the deciding voice, you're the bottleneck.
- In cross-functional meetings: translate, don't relay. "Engineering says 3 sprints" is relaying. "This delays the launch by 6 weeks, which impacts Q3 revenue by approximately $X" is translating.
- In standups: if it exceeds 15 minutes for 10 or fewer people, something is wrong. Move details to async.
- In retros: track whether the same issues recur. If they do, the retro process is broken — you're performing retrospection without producing change.
- In hiring panels: "I didn't vibe with them" is not feedback. Push for structured rubrics and evidence-based evaluation.`,
    meetingCoaching: `Watch for: 1:1s where the EM talks more than 40% (flip it), architecture reviews where one person dominates (call on quieter people by name), standups that run over 15 minutes, retros that produce complaints without owned action items, planning where the EM dictates solutions instead of presenting problems, and the most insidious pattern: meetings where the same 2-3 people speak every time. If you haven't asked a question in the last 5 minutes of any meeting, you're monologuing, not managing.`,
    metricsFocus: `Talk-to-listen ratio in 1:1s is the defining EM metric — aim for 30-40% talk time. Every interruption from an EM signals "my voice matters more than yours" — EMs should interrupt near-zero. Monologue detection: 3+ minutes of continuous talking in a 1:1 means you're lecturing, not coaching. WPM should be moderate and deliberate in difficult conversations (120-140). In cross-functional meetings, track whether you're translating technical constraints into business impact or just echoing what engineering said.`,
  },

  'engineer': {
    primaryThinkers: ['Paul Graham', 'Martin Fowler', 'Kent Beck', 'Sandi Metz', 'Rich Hickey', 'John Ousterhout', 'Charity Majors', 'Kelsey Hightower'],
    coachingContent: `**Deep mental models for Software Engineers:**

**On what it means to be good at this (Paul Graham, Rich Hickey, John Ousterhout):**
Paul Graham's most important essay for engineers isn't about startups — it's about thinking. "Write clearly to think clearly." Before you write code, write the approach in plain English. Not as documentation, not as a formality — as a thinking tool. If you can't explain what you're about to build in two paragraphs, you don't understand the problem yet. The design doc isn't process overhead; it's where the actual engineering happens. The code is just the implementation.

Rich Hickey's "Simple Made Easy" talk contains the single most important idea in software engineering: simple and easy are not the same thing. Simple means unmixed — one concept, one concern, one purpose. Easy means familiar, nearby, comfortable. We consistently choose easy over simple, and we pay for it forever. A framework you already know is easy. A well-designed module with one responsibility is simple. When these conflict — and they will — choose simple. The cost of complexity compounds. The cost of learning something unfamiliar is paid once.

Hickey's "Hammock-Driven Development": the hardest, most important part of programming happens away from the keyboard. Before coding a complex system, think about it — really think, not just sketch. Sleep on it. Let your subconscious work. The engineer who spends two days thinking and one day coding almost always beats the engineer who spends three days coding and then two days fixing what they built wrong. The hammock isn't laziness; it's where the architecture emerges.

John Ousterhout's central thesis: complexity is the root cause of the vast majority of problems in software. Not performance, not scalability, not technical debt specifically — complexity. Your job is to fight complexity at every turn. This means: deep modules (simple interface, complex implementation hidden behind it) over shallow modules (interface is as complex as the implementation). Every time you create an abstraction, ask: does this hide complexity, or just move it?

Ousterhout's distinction between strategic and tactical programming is career-defining. Tactical programmers optimize for "working code right now." Strategic programmers invest an extra 10-20% of time to produce clean designs. Over six months, the strategic programmer is dramatically faster because they're not fighting their own earlier mess. Over a career, the difference is enormous. The tactical programmer is always "busy." The strategic programmer always seems to have time.

**On writing code that lasts (Martin Fowler, Sandi Metz, Kent Beck):**
Martin Fowler: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand." Code is read 10x more often than it's written. Every naming choice, every function boundary, every comment is an act of communication with a future human (often future you). Optimize for readability. Always.

Fowler on refactoring: it's not a task on the backlog. It's how you write code. Every PR should leave the codebase a little better than you found it — not as a policy, but as a habit. The campsite rule. Technical debt isn't the problem. Unacknowledged, accidental technical debt is the problem. Deliberate debt with a plan to repay is fine. Debt you didn't know you were taking on is cancer.

Sandi Metz's most liberating insight: "Duplication is far cheaper than the wrong abstraction." The instinct to DRY (Don't Repeat Yourself) is one of the most dangerous reflexes in programming when applied prematurely. When you see code duplicated twice, you feel the urge to abstract. Resist it. Wait for the third occurrence. By the third time, you can see the pattern. The abstraction that emerges from three concrete examples is almost always right. The abstraction invented from two examples is almost always wrong. And a wrong abstraction is far more expensive than a little duplication.

Kent Beck: "Make it work, make it right, make it fast — in that order." Most engineers skip step two. They get it working, feel the dopamine, and either move on (leaving a mess) or jump to optimization (premature). Step two — making it right — is where the real engineering lives. It's the refactoring pass, the naming cleanup, the interface simplification. It's also the step that gets cut when deadlines loom, which is why most codebases are a graveyard of "make it work" code that was never made right.

Beck on courage: refactoring takes courage. Deleting code takes courage. Saying "this approach won't work" in an architecture meeting takes courage. Pushing back on a requirement that will create long-term maintenance pain takes courage. Courage is an engineering skill, not just a personality trait.

**On operating in production (Charity Majors, Kelsey Hightower):**
Charity Majors: "Observability-driven development" — instrument your code from day one, not after the first production incident. If you can't observe your system's behavior in production, you don't understand your system. The question isn't "do my tests pass?" — it's "are real users having a good experience right now?"

Her deeper insight: "Deploys are not releases." Deploying code to production and releasing a feature to users are different operations that should be decoupled. Feature flags make this possible. When you can deploy without releasing, you can ship smaller changes, more frequently, with less fear. Fear of deploying is the #1 symptom of a broken development process.

Kelsey Hightower: "The simplest thing that works is almost always the right starting point." Before you build a Kubernetes cluster, ask if a single server would work. Before you add a message queue, ask if a simple HTTP call would work. Before you add a cache, ask if the database is actually slow. Most over-engineering comes from solving problems you don't have yet. Solve today's problem today; tomorrow's problem will be different than you imagined anyway.

**On communicating as an engineer:**
The gap between great engineers and good engineers isn't technical skill — it's the ability to communicate technical decisions to non-technical humans. "The database migration" means nothing to your PM. "2 hours of read-only mode for 50,000 users" means everything. "We need to refactor the auth module" gets deprioritized. "Refactoring auth will reduce login failures by 80% and save 10 hours/week of on-call time" gets funded. Translate impact, not implementation.

The most expensive communication failure for engineers is silence. Not speaking up in an architecture meeting, then complaining afterward that the decision was wrong. If you disagreed and said nothing, you own the outcome. Silence is consent. The cost of silence is weeks of building the wrong thing. The cost of speaking up is a few uncomfortable minutes.

**What the best engineers do in meetings:**
- In code reviews: explain the "why" behind decisions. "I chose this approach because..." prevents the same review comment from appearing on every future PR.
- In architecture discussions: speak up early with concerns. Bring alternatives, not just objections.
- In 1:1s with your manager: come with problems AND proposed solutions. "I need help with X, and I think we should try Y" shows initiative and saves everyone time.
- In cross-functional meetings: translate. Always translate. Technical detail into user impact. Implementation complexity into timeline and tradeoff.
- In sprint planning: push back on estimates that feel wrong. "I'm not confident in this estimate because we haven't investigated X" is professional. Silently agreeing to an unrealistic timeline is not.
- In incident review: focus on systems, not people. "The pipeline didn't catch this" not "Person X broke production."`,
    meetingCoaching: `Watch for: not speaking up in architecture discussions (silence means you own the outcome), over-explaining implementation details to non-technical audiences (translate to impact), missing business context in technical proposals ("we need to refactor" vs "refactoring will let us ship 3x faster"), 1:1s that are pure status reporting instead of career growth conversations, and the subtle one: engineers who answer every question with implementation detail when the questioner wanted a yes/no or a tradeoff. If you leave a meeting thinking "that was a bad decision" but didn't voice your concern, that's the coaching moment.`,
    metricsFocus: `Conciseness is the engineer's communication superpower. Aim for 140-160 WPM — clear and direct. High filler word count in technical explanations signals uncertainty to the room: "I think maybe we could possibly..." vs "I recommend X because Y." In architecture discussions, balanced talk time indicates healthy collaboration. Monologue detection: if you've been explaining for more than 2 minutes without checking if the room is following, pause and ask. Engineers who interrupt non-technical stakeholders signal dismissiveness — it destroys cross-functional trust.`,
  },

  'founder-ceo': {
    primaryThinkers: ['Sam Altman', 'Paul Graham', 'Andy Grove', 'Ben Horowitz', 'Peter Thiel', 'Jeff Bezos', 'Reid Hoffman', 'Ray Dalio', 'Patrick Collison'],
    coachingContent: `**Deep mental models for Founders & CEOs:**

**On the nature of the job (Sam Altman, Paul Graham, Ben Horowitz):**
Sam Altman: "Default alive or default dead?" This isn't a metric check — it's a mental model for everything. If your company, left on its current trajectory, will run out of money before becoming profitable, you are default dead. Everything that isn't moving you toward default alive is a distraction. Not a nice-to-have — a distraction. Check this monthly. Be honest.

Paul Graham: "Be relentlessly resourceful." Not just smart, not just determined — the specific combination that finds a way when there isn't one. This is the single most reliable predictor of founder success. The relentlessly resourceful founder doesn't say "we can't because" — they say "what if we..." It's not optimism. It's a refusal to accept the frame of the problem as given.

Graham's other essential insight: "Your job is to do the thing that's most important right now, even when it's uncomfortable." Most founders are busy all the time. Very few are doing the most important thing. If you're answering email when you should be calling your biggest customer who's about to churn, you're procrastinating with productivity. The most important thing is almost always the thing you're avoiding.

Ben Horowitz: "There is no recipe for building a company." The moment someone hands you a playbook that says "do X then Y then Z," be suspicious. Your situation — your market, your team, your timing — is unique. Learn principles, develop judgment, and make decisions with incomplete information. That's the job. Anyone selling certainty is selling something.

Horowitz on the emotional reality: "The Struggle is real." Every founder goes through periods where they want to quit, where the business feels hopeless, where the weight is unbearable. The founders who survive aren't the ones who feel good — they're the ones who keep going through the bad feelings. Nobody talks about this at demo day. It's the most important thing to know.

**On decision-making as a way of life (Jeff Bezos, Ray Dalio, Andy Grove):**
Jeff Bezos's most important contribution to management thinking: Type 1 vs Type 2 decisions. Type 1 decisions are one-way doors — irreversible or nearly so. Type 2 decisions are two-way doors — easily reversible. The critical insight: most decisions are Type 2, but organizations treat them all as Type 1. They deliberate, they committee, they analyze. By the time they decide, the opportunity has passed. Make Type 2 decisions fast. Make them with 70% of the information you wish you had. Only slow down for Type 1.

"Disagree and commit" — Bezos's antidote to decision paralysis. If you disagree with a decision but the team has weighed in, commit fully. Don't hedge. Don't undermine. Don't say "I told you so" when it fails. Full commitment, even in disagreement, is what separates functional organizations from dysfunctional ones. This requires ego management. Most founders struggle with it.

Ray Dalio: "Pain + reflection = progress." This isn't motivational poster wisdom — it's an operating system for learning. After every failure (lost deal, bad hire, missed quarter), don't just feel the pain. Mine it. Ask: "What principle, if we'd had it, would have prevented this?" Write that principle down. Over time, you build a decision-making operating system that gets smarter with every failure. The pain is the raw material. Don't waste it.

Dalio on "believability-weighted decisions": not all opinions are equal, and pretending they are is a failure of leadership. Weight input by the person's track record on that specific type of decision. Your VP of Sales's opinion on pricing strategy matters more than your VP of Engineering's. Your most junior engineer's opinion on the codebase might matter more than yours — they're in it every day. The CEO's job is to know whose input to weight, not to have all the answers.

Andy Grove: "The output of a manager is the output of the organizational units under their supervision." You don't write code. You don't close deals. You don't design the product. Your team does. Your job is to maximize their output. Every minute you spend doing someone else's job is a minute you're not doing yours — which is setting direction, making hard calls, and removing obstacles.

Grove on leverage: some activities have 100x the impact of others. A well-run 1:1 with a struggling VP can unblock an entire department. A confused all-hands email can paralyze the company for a week. A clear strategy document can align 50 people for six months. A bad hire at the VP level can set a function back a year. Focus obsessively on the high-leverage activities. Delegate everything else, even if you'd do it better yourself.

**On building something that matters (Peter Thiel, Patrick Collison):**
Peter Thiel: "What important truth do very few people agree with you on?" This isn't a thought exercise — it's the foundation of every great company. Your startup should be built on a contrarian truth about the world that you see clearly and most others don't. If everyone agrees with your thesis, you're in a commodity market and you'll compete on execution against better-funded competitors. Find the truth that's hiding in plain sight.

"Competition is for losers." If you're in a highly competitive market, you're in a bad market. Seek monopoly through differentiation, not victory through brute force. The goal isn't to beat your competitors — it's to build something so different that the comparison doesn't even make sense.

The power law applies to everything in startups: your best hire will outperform the next 10 combined. Your best product bet will be worth more than all your other bets combined. Your best customer segment will generate more revenue than all other segments combined. Accept this. Don't spread effort evenly. Concentrate it on the things that are working.

Patrick Collison on speed: "Move fast and DON'T break things. Speed and quality aren't opposites — sloppy work creates more work." The founders who ship fastest aren't the ones who cut corners — they're the ones who make decisions quickly, eliminate unnecessary process, and invest in tooling that makes the team faster. Stripe's obsessive API quality wasn't perfectionism — it was a strategic bet that the right foundation would make everything faster long-term.

Collison on intellectual breadth: "Read broadly. The best ideas come from adjacent fields." The founder who reads only startup content thinks like every other founder. The founder who reads history, science, and philosophy sees patterns others miss.

**On people and scaling (Reid Hoffman, Ben Horowitz, Andy Grove):**
Reid Hoffman: "Tours of duty" — reframe every key hire not as permanent employment but as a 2-3 year mission with clear mutual outcomes. "In this tour, you'll build the sales org from 5 to 30 people. In return, you'll get the experience of scaling a sales team through Series B." This creates alignment without false promises. And when the tour is complete, it's natural to discuss what's next — including leaving — without betrayal.

Hoffman: "Your network is your early warning system." Other founders, investors, and operators will see market shifts before you do. Maintain these relationships. Not transactionally — genuinely. The text you send today asking "how are things going?" might save your company in 18 months when that person tips you off to a market change.

Horowitz: "Peacetime CEO vs Wartime CEO." Peacetime: the company has a clear advantage and is expanding. The CEO's job is to broaden, to delegate, to build culture. Wartime: the company's survival is threatened. The CEO's job is to focus, to cut, to make decisions personally that would normally be delegated. Most founders need to switch between these modes and struggle with the transition. The danger: staying in wartime when you should be in peacetime (micromanaging a healthy company) or staying in peacetime when you should be in wartime (delegating through an existential crisis).

Horowitz: "Hire for strength, not for lack of weakness." A candidate who's extraordinary at one thing and terrible at another is almost always better than someone who's competent at everything. Greatness is spiky. Your job is to build a team where different people's strengths cover each other's weaknesses.

**What the best founders do in meetings:**
- In board meetings: lead with metrics, not narrative. "Revenue grew 15% MoM" before "we had a great quarter." Board members spot spin instantly. Be honest about what's broken — they've seen it before and might help.
- In all-hands: balance inspiration with transparency. Employees detect BS faster than investors. The best all-hands answers one question: "Why should I keep working here?"
- In investor meetings: listen to their pushback — they see risks you've normalized. Reframe objections as intelligence, not criticism.
- In 1:1s with reports: ask "What would you do?" before giving your answer. If you always provide the solution, they'll always come to you, and you've built a bottleneck.
- In customer meetings: listen 80%. Every word is product intel. Resist the urge to sell, defend, or explain.
- In hiring interviews: be honest about what's hard. It filters for missionaries over mercenaries.
- In strategy meetings: frame the decision and the tradeoffs. Let the team argue. Then decide.`,
    meetingCoaching: `Watch for: dominating conversations (the founder's energy and conviction can silence a room without them realizing it), not enough customer meetings on the calendar (if you haven't spoken to a customer this week, that's a problem), solving problems for reports instead of coaching them to solve it themselves, all-hands that are monologues, board meetings where bad news is buried, and 1:1s where you give advice before asking a single question. The deepest trap: the more successful you become, the more people agree with you to your face. Actively seek and reward disagreement.`,
    metricsFocus: `The #1 metric for founders is listening ratio. In customer calls: 80% listening. In 1:1s with reports: 60% listening (40% or less talking). WPM during pitches and all-hands: 130-145 (confident, not rushed — rushed speech signals anxiety to the room). Filler words in investor meetings are devastating — every "um" and "like" erodes the credibility you need to close the round. In board meetings: if you've talked for more than 2 minutes without pausing, you're rambling. Interruptions in 1:1s with reports signal that their input doesn't matter — eliminate this habit entirely.`,
  },

  'designer': {
    primaryThinkers: ['Don Norman', 'Marty Cagan', 'Julie Zhuo', 'Jared Spool', 'Alan Cooper', 'Dieter Rams', 'Nancy Duarte', 'Mike Monteiro'],
    coachingContent: `**Deep mental models for Designers:**

**On what design actually is (Don Norman, Dieter Rams, Alan Cooper):**
Don Norman's most important insight is deceptively simple: "When you encounter a door that you push when it should be pulled, the door is wrong — not you." Apply this to everything. Every time a user makes a "mistake" in your interface, the interface is wrong. Not the user. Never the user. The moment you think "users should know to..." you've stopped being a designer and started being a blamer.

Norman goes deeper: every interface element is a conversation between the designer and the user, happening asynchronously and at scale. A button says "press me." A text field says "type here." A greyed-out element says "not now." Most interface confusion comes from elements that say contradictory things, say nothing, or say the wrong thing. Your job is to make every element speak clearly.

The mental model concept is Norman's most practically useful idea: every user has a mental model of how your product works, and it's almost certainly different from your implementation model. If users think in "folders," don't give them "tags and filters." If users think in "conversations," don't give them "threads and channels." Your design must meet users in their mental model, not drag them into yours. The gap between the user's mental model and your design model is the source of almost all usability problems.

Dieter Rams: "Good design is as little design as possible." This isn't minimalism as aesthetic preference — it's a deep principle. Every element you add to an interface competes for attention with every other element. Every option you offer is a decision the user must make. Every feature you include is a feature the user must ignore to find the one they need. Subtraction is the designer's most powerful and most underused tool. The question isn't "what should we add?" — it's "what can we remove and still solve the problem?"

Alan Cooper: design for goals, not tasks. The user's task is "check items off a list." The user's goal is "feel confident I'm on top of my projects." These lead to completely different designs. Tasks are what the current system requires. Goals are what the human actually wants. When you design for tasks, you get incremental improvements. When you design for goals, you get breakthroughs.

Cooper on "polite software": your product should behave like a thoughtful human assistant. It remembers preferences without being asked. It doesn't repeat questions. It handles errors gracefully without blaming the user. It gets smarter over time. It respects the user's time. Most software behaves like a bureaucrat — inflexible, forgetful, and demanding. The bar for politeness is low. Clear it.

**On design as a tool for thinking, not decoration (Marty Cagan, Julie Zhuo, Mike Monteiro):**
Cagan's deepest contribution to design thinking: designers are co-owners of product discovery, not decorators. If you're getting fully specced requirements and making them pretty, you're in the wrong room. You should be in the room when the problem is identified, not just when the solution needs pixels. The designer who waits for a brief has already lost the most important battle — the one over what gets built in the first place.

Cagan on prototypes: prototype to learn, not to ship. The goal of a prototype is to kill bad ideas fast, not to create pretty mockups that everyone falls in love with. A prototype that proves an idea WON'T work has MORE value than one that confirms what everyone already assumed. The best designers are comfortable producing ugly, fast prototypes that answer specific questions — "Can users find the settings?" "Do people understand what this button does?" — not "Does this look good?"

Julie Zhuo on design leadership: "The first step to great design is knowing what problem you're solving." If you can't state the problem in one sentence without using your product's name, you're not ready to open Figma. "Users can't find the settings" is a problem statement. "Redesign the settings page" is not. The problem statement determines the design space. Get it wrong and you're solving the wrong problem beautifully.

Zhuo on the evolution of design skill: Junior designers show one option and defend it. Senior designers show three options with clear tradeoffs. Staff designers reframe the question so the right answer becomes obvious without needing to be defended. The progression isn't about skill with tools — it's about the quality of thinking before tools are opened.

Mike Monteiro: "Design is a job, not a gift." Designers who can't advocate for their work — who cave at the first pushback from a stakeholder, who treat every executive opinion as a requirement — aren't doing their job. Your job isn't to make people happy. It's to make the right thing for users and argue for it effectively. If the VP of Sales wants a popup and the data says popups drive users away, your job is to present the data and hold the line, not to find a "compromise popup."

**On research and the nature of evidence (Jared Spool, Don Norman):**
Jared Spool: "Good design is when the gap between knowledge-in-the-world and knowledge-in-the-head is minimal." Translation: the less a user needs to learn or remember, the better your design. Every label, every icon, every layout choice either closes or widens that gap.

Spool's "$300 million button" story embodies a deep truth: the most impactful UX changes are usually subtractions. Removing a forced registration step from an e-commerce checkout increased annual revenue by $300 million. Nobody pitched "let's add a skip registration button" in a feature brainstorm. The insight came from watching real users struggle. The best design improvements are invisible — they remove friction the team didn't know existed.

5 usability tests reveal 85% of the problems in a design. Not 50. Not 500. Five. This is Nielsen's finding, reinforced by decades of practice. The implication: you should be testing constantly, with small groups, rather than doing big formal research rounds quarterly. Testing is cheap. Shipping the wrong thing is expensive.

The distinction between observations and insights is critical: "Users clicked on the wrong button 4 times" is an observation. "Users expect the primary action to be on the right, not the left" is an insight. "We should move the button to the right side" is a recommendation. Most designers present observations and skip the insight, which means stakeholders don't understand why the recommendation matters.

**On the relationship between design and the rest of the organization (Julie Zhuo, Mike Monteiro, Nancy Duarte):**
Nancy Duarte on presenting design: every presentation should move between "what is" (the current pain) and "what could be" (the future state). This creates tension and resolution — the engine of persuasion. Don't front-load all the problems or all the solutions. Alternate. Show the pain, then the relief, then a new pain, then a new relief. By the end, the audience wants the future state as much as you do.

Design by committee is the enemy of good design. Zhuo: seek input broadly, then make a decision. Not everyone gets a vote. The designer who tries to incorporate every piece of feedback produces something that satisfies no one. Your job is to listen to all the input, synthesize it, and make a design decision that you can defend with evidence. "Everyone's a designer" is flattering but false. Everyone has opinions. Design requires training, judgment, and evidence.

**What the best designers do in meetings:**
- In design reviews: present the problem first, then options, then your recommendation with reasoning. Context makes the solution feel inevitable.
- In cross-functional meetings: bring something visual. A rough sketch resolves more arguments than 30 minutes of words.
- In user research debrief: lead with insights, not observations. "Users expect X" not "Users clicked Y."
- In stakeholder presentations: anticipate "can we also..." requests. Have criteria for evaluating additions: "Does it serve the user goal? What does the data say?"
- In sprint planning with engineers: walk through interaction details explicitly. Engineers will fill UX gaps with functional decisions, not design decisions.
- In design critiques: model the behavior you want. Specific and actionable: "The CTA competes visually with the nav — what if we..." not "I don't like the button."`,
    meetingCoaching: `Watch for: presenting solutions before the room understands the problem (always lead with the pain), letting stakeholders dictate design solutions instead of expressing needs ("make the button bigger" is a solution; "users aren't finding the CTA" is a need — only the second one is useful), user research sessions where the designer talks more than 20% of the time (you're leading the witness), design reviews that devolve into opinion debates (redirect to evidence: "what does the data show?"), and not advocating strongly enough for users when business pressure pushes for shortcuts. The hardest moment for a designer is when the VP says "just do it this way" — how you handle that moment defines your career.`,
    metricsFocus: `Storytelling pace matters: 120-140 WPM in presentations (slower than other roles — give people time to absorb what you're showing). In user research: 80%+ listening. If you're talking more than 20%, you're biasing the results. Filler words in design reviews undermine your recommendation ("I kinda think maybe..." vs "Based on our research, the right approach is..."). In cross-functional meetings: 40-50% talk time indicates healthy collaboration — you need to both listen and advocate.`,
  },


  'sales': {
    primaryThinkers: ['Chris Voss', 'Matt Dixon', 'Mark Roberge', 'Jeb Blount', 'April Dunford', 'Aaron Ross', 'Patrick McKenzie', 'Trish Bertuzzi'],
    coachingContent: `**Role-specific coaching for Sales:**

**Chris Voss — Never Split the Difference & Tactical Negotiation:**
- "Tactical empathy": Label the prospect's emotions. "It sounds like you're frustrated with the current solution." This builds trust faster than any pitch. Labeling emotions deflates them.
- "Mirroring": Repeat the last 1-3 words of what they said as a question. It triggers them to elaborate without you asking a direct question. "You're concerned about the timeline?" (mirror) → they give you 2 minutes of detail.
- "Calibrated questions": Replace demands with "how" and "what" questions. Instead of "Can you give me a discount?", ask "How am I supposed to do that?" Forces the other side to solve your problem for you.
- "That's right" is the magic phrase. When the prospect says "That's right," they feel heard and understood. If they say "You're right," they're dismissing you. Aim for "That's right."
- "Accusation audit": Before a difficult conversation, list every negative thing the other person might think about you. Address them proactively. "You're probably thinking we're too expensive, that the implementation will be painful, and that you've heard promises like this before." This takes the sting out.
- "Late-night FM DJ voice": When tension rises, lower your voice, slow your pace. Calm is contagious. Anxiety is also contagious — choose which one you spread.
- The "No"-oriented question: "Would it be terrible if...?" "Is it a bad idea to...?" People feel safer saying no. "No" gives them a sense of control, which makes them more open to your proposal.

**Matt Dixon — The Challenger Sale & JOLT Effect:**
- "The Challenger Sale" framework: Top performers don't just build relationships — they teach, tailor, and take control. Teach the customer something they didn't know about their own business. Tailor the message to their specific situation. Take control of the sale.
- "Commercial teaching": The insight you share should lead to your unique solution. Teaching that doesn't connect to your product is just consulting.
- "Reframe the problem": The best sales reps don't answer the customer's stated problem — they redefine it. "You think you have a data problem. You actually have a decision-making problem."
- "JOLT Effect" (overcoming customer indecision): Judge the level of indecision, Offer a recommendation, Limit the exploration, Take risk off the table. Most deals don't die to a competitor — they die to indecision and "no decision."
- "The status quo is your biggest competitor." You're not selling against a rival product — you're selling against inertia.

**Mark Roberge — The Sales Acceleration Formula:**
- The best salespeople spend 70% of the call listening. If you're talking more than 30%, you're pitching, not discovering. Discovery is where deals are won or lost.
- "Hire for coachability, curiosity, and work ethic — not experience." Train with data, not gut. Track leading indicators (activity metrics) not just lagging indicators (closed revenue).
- Qualification is as important as closing. Spend more time qualifying out bad fits than trying to close them. A bad-fit customer who signs becomes your worst support problem and a churn risk.
- "Sales + Service Level Agreements" with marketing: Define exactly what constitutes a qualified lead, how quickly sales follows up, and what feedback loops exist. Misalignment here is revenue cancer.

**Jeb Blount — Fanatical Prospecting:**
- "The number one reason for failure in sales is an empty pipeline." Prospect every day, no exceptions. The law of replacement: for every deal that closes (win or loss), add 3 new prospects.
- "The 30-Day Rule": The prospecting you do (or don't do) in any 30-day period will show up in your pipeline 90 days later. If you're celebrating a good quarter by coasting on prospecting, Q+1 will hurt.
- "Triple your touch patterns": Phone, email, LinkedIn, video — use all channels. The prospects who are hardest to reach are usually the best prospects.
- "Rejection is not personal." Separate your self-worth from your pipeline. The person who said no said no to your offering, not to you as a human.

**April Dunford — Obviously Awesome Positioning:**
- "Obviously Awesome" positioning: Competitive alternatives → Unique capabilities → Value for customer → Best-fit customer. Do this exercise for every deal.
- Don't lead with features. Lead with the problem, then the cost of the status quo, then your unique solution. "Companies like yours are losing $X/year because of Y. We solve Y by doing Z, which no one else does."
- "Positioning is context setting." If the prospect doesn't understand what category you're in, they can't evaluate your value. Set the context first.

**Aaron Ross — Predictable Revenue:**
- Separate prospecting from closing. Hunters (AEs) and farmers (SDRs) have different skills. Mixing them kills both functions.
- "Cold Calling 2.0": Don't cold call — cold email the right person with a specific, relevant insight. Personalization at scale.
- Build your "ideal customer profile" with data, not intuition. Look at your best 20 customers: what do they have in common? That's your ICP.

**Patrick McKenzie — Value, Pricing & Positioning:**
- "Charge more." If no one ever says you're too expensive, you're too cheap. The first 10% price increase is almost always free money.
- Value-based pricing: price on the outcome you deliver, not the effort you put in. "We save you $500K/year" justifies $100K/year easily.
- "Don't sell the drill, sell the hole." Actually, don't sell the hole either — sell the house that's built because the holes were drilled correctly.

**Anti-patterns to watch for:**
- "Feature dumping" — listing every feature hoping something sticks, instead of leading with the prospect's specific pain
- "Happy ears" — hearing what you want to hear instead of what the prospect is actually saying
- "Premature demo" — jumping to a product demo before understanding the prospect's problem
- "Discounting too fast" — offering a discount before the prospect even asks, signaling you don't believe in your own pricing
- "Single-threaded deals" — only having one champion at the account instead of building multi-threaded relationships
- "Ghosting the close" — sending a proposal and hoping, instead of having a clear next step

**Meeting coaching for Sales:**
- In discovery calls: The first 5 minutes set the tone. Ask an insightful question that shows you've done your homework. Not "Tell me about your business" but "I noticed you recently expanded into APAC — how is that affecting your operations team?"
- In demos: Show the thing that solves their specific pain point first. Not a feature tour — a solution demo. "You mentioned you spend 4 hours/week on X. Let me show you how that becomes 10 minutes."
- In negotiation: Silence is your most powerful tool. After stating your price, stop talking. The first person to speak loses. Count to 10 in your head if you have to.
- In team meetings: Share stories, not just numbers. "Here's why we lost deal X and what we should change" is more valuable than "We closed 80% this quarter."
- In QBRs with customers: Don't just review usage metrics. Ask "What's changed in your business since we last spoke?" and "Are you getting the value you expected?" This uncovers expansion and churn risk.
- In forecast reviews: Be brutally honest. A commit is a commit, not a hope. Sandbagging and happy-ears both erode trust with leadership.`,
    meetingCoaching: `Watch for: talking too much in discovery calls (aim for 30% or less — if your mouth is open, you're not learning), jumping to the pitch before understanding the prospect's pain (at least 3 good discovery questions before any product discussion), not asking enough open-ended questions (count them — top performers ask 11-14 questions per discovery call), "happy ears" — assuming positive signals without confirming ("it sounds like you're interested" — actually ask), and presenting features instead of outcomes. Red flag: if the prospect hasn't spoken in the last 2 minutes, you've lost them.`,
    metricsFocus: `For sales, talk-to-listen ratio is the #1 predictor of success. Top performers listen 70%+ in discovery and 55-65% even in demos. WPM should be moderate (130-150) — rushed speech signals anxiety and erodes trust. Filler words like "um" and "basically" erode credibility with senior buyers. Monologue detection: if you talk >2 minutes straight in a prospect call, you've lost them — pause and re-engage with a question. Strategic silence after pricing: top closers average 3-5 seconds of silence after stating price (most reps average <1 second before discounting). Question ratio: track open-ended vs closed questions — aim for 3:1 ratio.`,
  },

  'marketing': {
    primaryThinkers: ['April Dunford', 'Eugene Schwartz', 'Seth Godin', 'Lenny Rachitsky', 'Nancy Duarte', 'Emily Kramer', 'Dave Gerhardt', 'Rand Fishkin'],
    coachingContent: `**Role-specific coaching for Marketing:**

**April Dunford — Positioning, Messaging & Category Design:**
- Great positioning starts with "What are customers using today instead of us?" — not with your features. The competitive alternative frames everything.
- "Obviously Awesome" framework: (1) Competitive alternatives, (2) Your unique attributes, (3) The value those attributes enable, (4) The ideal customer who cares most about that value, (5) The market category that makes the value obvious. Do this exercise quarterly.
- If your value prop takes more than one sentence to explain, it's not a value prop — it's a feature list. Pressure-test with: "If I told a stranger this on an elevator, would they get it?"
- Category creation vs category claiming: If you're truly novel, create a category (but only if the market is ready). If you're differentiated in an existing category, own a niche. Don't try to be "the better Salesforce" — be "the CRM for consulting firms."
- Positioning is not permanent. As your product, market, and competitors evolve, reposition. The positioning that got you to $1M ARR won't get you to $10M.

**Eugene Schwartz — Breakthrough Advertising & Market Sophistication:**
- "Five Levels of Market Sophistication": (1) First to market — state the claim directly, (2) Enlarged claim — bigger, better, faster, (3) Unique mechanism — explain WHY it works, (4) Enlarged mechanism — a better, more specific mechanism, (5) Identification — sell the identity, not the product. Know which level your market is at.
- "You cannot create desire. You can only channel and direct desires that already exist." Don't educate the market on why they should want something — find where they already want it and show them your solution.
- "Mass desire": Every product must tap into an existing mass desire — health, wealth, relationships, status, security. Your copy should connect your product to one of these desires explicitly.
- "The headline does 80% of the work." If your headline doesn't stop people, the rest doesn't matter. Spend 50% of your writing time on the headline.

**Seth Godin — Permission Marketing, Purple Cow & Tribes:**
- "Purple Cow" — in a field of brown cows, the purple one gets noticed. If your marketing isn't remarkable (literally: worth remarking on), it's invisible. "Good enough" is invisible.
- "Permission marketing" vs interruption marketing: Earn attention, don't buy it. Email subscribers > ad impressions. Trust compounds; attention fades.
- "Tribes" — your job isn't to market to everyone. It's to find your tribe (people who share your worldview) and lead them. 1,000 true fans > 100,000 casual followers.
- "People don't buy what you make. They buy what it means." A Tesla isn't a car — it's an identity. A Moleskine isn't a notebook — it's a statement. What does your product mean?
- "This is marketing" — Marketing is the generous act of helping someone solve a problem. When you start from empathy instead of extraction, everything changes.

**Lenny Rachitsky — Growth Loops, Retention & Product-Led Growth (see also Lenny's Roundtable, lennysroundtable.com):**
- Growth loops > growth hacks. Sustainable growth comes from product mechanics, not one-off campaigns. A growth loop reinvests outputs as inputs (user creates content → content attracts users → users create content).
- Retention is the foundation. If retention is flat, nothing else matters. Growth with poor retention is just expensive churn. Fix retention first.
- Content marketing only works if you say something genuinely useful. "Brand awareness" is not a strategy — "become the trusted resource for X decision-maker" is.
- The best marketing teams talk to users as often as product teams. Your messaging should use the customer's words, not yours. Record sales calls and steal phrases.
- "Product-led growth" doesn't mean "no marketing." It means marketing's job shifts from generating leads to amplifying the product's natural growth loops.

**Nancy Duarte — Storytelling, Presentations & Data Narrative:**
- "What is" vs "What could be": every great marketing narrative moves between the current pain and the future state your product enables. This creates tension and resolution — the engine of storytelling.
- Data makes you credible; stories make you memorable. Use both. "43% of companies fail at X" (data) + "Here's how Company Y almost went under before they found a better way" (story).
- "The audience is the hero, not you." Your product is Yoda, not Luke Skywalker. Frame the customer as the protagonist of the story.
- "Sparklines" — alternate between "what is" and "what could be" throughout a presentation to keep tension alive. Don't front-load all the pain.

**Emily Kramer — B2B Marketing Foundations & MKT1:**
- "The four marketing motions": Paid, Earned, Owned, and Product. Most B2B companies over-index on Paid and under-invest in Owned (content, community, email) and Product (in-app growth).
- Brand and demand are not opposites. Brand makes demand cheaper. Cutting brand spend to fund demand is eating your seed corn.
- "Marketing should not be measured by MQLs." MQLs are an internal handoff metric, not a business metric. Measure pipeline, revenue influenced, and customer acquisition cost.
- Build your content engine around "spiky points of view" — opinions that your ideal customer would immediately agree with and your competitors wouldn't say. Safe content is invisible content.

**Dave Gerhardt — B2B Brand Building & Content Marketing:**
- "Build a media company, not a marketing department." Produce content your audience would seek out even if you weren't selling anything.
- "Category creation" requires consistency over years, not a one-time campaign. You're not just selling a product — you're selling a new way of thinking.
- "Talk to your customers like humans." B2B doesn't mean boring-to-boring. Strip the jargon. Write like you talk.
- "Founder-led marketing" is the most undervalued channel. The founder's story, perspective, and personality are unreplicable. Use them.

**Rand Fishkin — SEO, Content & SparkToro Approach:**
- "Zero-click content" — create content that delivers value on the platform itself (LinkedIn, Twitter, YouTube) without requiring a click-through. Reach > traffic in the modern web.
- "Audience research before keyword research." Understand where your audience hangs out, who they follow, and what they read BEFORE planning content.
- SEO is not dead, but it's changing. AI-generated results mean less organic traffic for informational queries. Invest in branded search and community.
- The "influencer iceberg": The most valuable influencers for B2B aren't the celebrities — they're the industry practitioners with 5K-50K highly engaged followers.

**Anti-patterns to watch for:**
- "Vanity metrics addiction" — celebrating impressions, followers, and page views instead of pipeline, CAC, and LTV
- "Campaign-think" — treating marketing as a series of one-off campaigns instead of building cumulative assets (brand, content, community)
- "Copycat positioning" — saying the same thing as competitors but slightly differently
- "Content for content's sake" — publishing 3 blog posts/week because someone said "consistency" without measuring impact
- "Attribution tunnel vision" — only valuing what you can directly attribute, ignoring the brand halo and dark social
- "Sales misalignment" — marketing and sales telling different stories to the same prospect

**Meeting coaching for Marketing:**
- In campaign reviews: Start with the metric that matters (pipeline generated, CAC, LTV), not vanity metrics (impressions, clicks). If someone celebrates "1M impressions," ask "how much pipeline did it generate?"
- In cross-functional meetings: Translate marketing jargon. "MQL" → "people who are interested enough to talk to sales." "Attribution" → "which marketing activities led to revenue." Make your work legible to non-marketers.
- In brand discussions: Push for specificity. "We want to be seen as innovative" is meaningless. "We want CTOs at Series B startups to see us as the safe, smart choice for X" is actionable. WHO thinks WHAT about us?
- In content planning: Prioritize topics by "search demand × alignment with buyer journey × our unique authority to speak on this." Not every trending topic is your topic.
- In budget reviews: Frame spend as investment, not cost. "We spent $50K on content that generated $500K in pipeline" vs "Content marketing cost us $50K this quarter."
- In sales alignment meetings: Share what you're hearing from the market, not just what you're producing. Be a source of market intelligence, not just a lead factory.`,
    meetingCoaching: `Watch for: relying on vanity metrics in reviews (impressions don't pay the bills — redirect to pipeline and revenue), not connecting campaigns to revenue (every campaign should have a clear path to business impact), brand discussions that stay abstract instead of defining specific audience + perception (force specificity: "who specifically, and what specifically should they think?"), content planning without differentiation ("what can we say that nobody else is saying?"), and marketing-sales finger-pointing (if leads aren't converting, the problem is shared — diagnose together, don't blame). Red flag: if a marketing meeting has no customer quotes, user data, or sales feedback, it's a meeting about opinions.`,
    metricsFocus: `For marketers, clarity and persuasion matter. WPM in presentations should be 130-145 (authoritative but not rushed — you're trying to convince, not inform). Filler words in pitch meetings undermine the message ("We, um, basically help companies kind of, like, improve..." is death). In cross-functional meetings, listen ratio should be balanced (50/50) — you need to absorb context from sales, product, and success teams. Monologue detection: in creative reviews, if one person talks for >3 minutes, the feedback becomes a lecture. Conciseness matters especially in executive reporting — the ability to summarize marketing performance in 60 seconds is a superpower.`,
  },

  'operations': {
    primaryThinkers: ['Andy Grove', 'Ray Dalio', 'Eliyahu Goldratt', 'Claire Hughes Johnson', 'Shreyas Doshi', 'Taiichi Ohno', 'Will Larson', 'Tobi Lütke'],
    coachingContent: `**Role-specific coaching for Operations Leaders:**

**Andy Grove — High Output Management & Operational Excellence:**
- "The output of a manager is the output of the organizational units under their supervision." For ops leaders, this means: your value isn't the processes you create — it's the organizational outcomes those processes enable.
- "Leverage" — focus on activities with the highest output-to-input ratio. A well-designed process used by 100 people has 100x leverage. A one-off task has 1x leverage. Prioritize accordingly.
- "Production principles apply to knowledge work." Identify your team's bottleneck. Optimize the bottleneck. Subordinate everything else to the bottleneck. (This is also Goldratt's Theory of Constraints.)
- "Indicators vs objectives." Track leading indicators (pipeline activity, ticket volume trends, process compliance rates), not just lagging indicators (quarterly revenue, annual churn). By the time a lagging indicator moves, it's too late to fix.
- "Decision-making process matters more than any single decision." Establish clear DACI (Driver, Approver, Contributor, Informed) for every important decision type. When people know the process, decisions happen faster.

**Ray Dalio — Principles, Systems & Radical Transparency:**
- Build a "machine" — a system of people + processes that produces predictable outcomes. Your job is to design and debug the machine, not run it manually. If you're the machine, you can't scale.
- "Radical transparency": Make process failures visible. Hidden failures compound; visible failures get fixed. Create dashboards that show operational health in real-time.
- Create principles (written decision rules) for recurring situations. Each time you make a judgment call, write down the principle. Next time, the principle decides — not you. Over time, this creates an "operating system" for the company.
- "Pain + Reflection = Progress." Every operational failure is an opportunity to improve the system. The pain is the signal — don't ignore it, don't numb it, mine it.
- "Believability-weighted decisions" for ops: Weight input by the person's track record on that specific type of decision, not their seniority. The IC who's been running the process for 2 years knows more than the VP who reviewed a summary.

**Eliyahu Goldratt — Theory of Constraints & The Goal:**
- "The Goal" principle: Every system has one constraint that limits total throughput. Improving anything that is NOT the constraint is a waste. Find the constraint first.
- Five Focusing Steps: (1) Identify the constraint, (2) Exploit the constraint (maximize its throughput), (3) Subordinate everything to the constraint (don't let non-constraints produce more than the constraint can process), (4) Elevate the constraint (invest to expand capacity), (5) If the constraint has moved, go back to step 1.
- "Throughput accounting" over cost accounting: Don't just cut costs. Ask: "Does this increase throughput?" Cost reduction has a floor; throughput growth doesn't.
- "Local optima vs global optima": Each department optimizing for itself can make the whole system worse. Ops leaders must optimize for the company, even if individual teams look "worse."
- "Drum-Buffer-Rope" for scheduling: The constraint sets the pace (drum), buffers protect against variability, and rope limits work-in-progress. Apply to project scheduling, feature development, and hiring pipelines.

**Claire Hughes Johnson — Scaling People & Operating Systems:**
- "Scaling People" framework: As a company grows, the founder can't make every decision. Build an operating system: (1) Written company principles, (2) Clear decision frameworks, (3) Communication cadences, (4) Documented processes for recurring decisions.
- "Foundational documents" every company needs: Mission, Vision, Strategy, Operating Principles, Team Charters. These aren't bureaucracy — they're scalability.
- "Process debt" is as real as tech debt. Every time someone works around a broken process, they're adding process debt. Track it, prioritize it, pay it down.
- The COO/ops leader role transitions: at 20 people, you're doing everything; at 50, you're building the team; at 200, you're building the system; at 500+, you're debugging the system. Know which phase you're in.

**Shreyas Doshi — Leverage, Overhead & Systems:**
- Classify every operational task through the LNO lens: Leverage (10x impact), Neutral (expected), Overhead (necessary but low-value). If you're spending >50% on Overhead, you need to automate or delegate.
- "Pre-mortem" every process change: "In 3 months, this process will break because..." Fix those reasons before they happen. Post-mortems are expensive; pre-mortems are cheap.
- "High-agency operations" — don't wait for someone to report a problem. Instrument your processes so you see problems before anyone complains.

**Taiichi Ohno — Toyota Production System & Lean:**
- "The Toyota Way": Continuous improvement (kaizen) and respect for people. The people doing the work know the work best — involve them in improving it.
- "5 Whys": When a problem occurs, ask "why?" five times to find the root cause. "Why did the deployment fail?" → "Why was the config wrong?" → "Why was it manually updated?" → "Why isn't it automated?" → "Why wasn't automation prioritized?" Root causes are almost always systemic, not individual.
- "Genchi genbutsu" (go and see): Don't manage from a dashboard. Go to where the work happens. Watch the process. Talk to the people doing it.
- "Eliminate the seven wastes": Transport, Inventory, Motion, Waiting, Overproduction, Over-processing, Defects. In knowledge work: unnecessary handoffs, unread reports, meeting overload, waiting for approvals, producing unused documents, over-polishing, and rework.
- "Just-in-time" for ops: Don't build processes before they're needed. Build them when the pain is real and the pattern is clear.

**Will Larson — Technical Operations & Org Design:**
- "Work the policy, not the exceptions." If you're constantly making exceptions, the policy is wrong. Fix the policy.
- "Systems are bigger than the sum of their parts." The interaction between processes matters as much as each process individually. Map the system, not just the components.

**Tobi Lütke (Shopify) — Operational Simplicity:**
- "All process must justify its own existence." Don't keep a process just because it exists. Every quarter, ask: is this still needed? Does it still work? Can it be simpler?
- "Trust batteries" — every relationship has a trust battery. Operational decisions either charge or drain them. Transparent, fair processes charge them. Opaque, arbitrary decisions drain them.

**Anti-patterns to watch for:**
- "Process for process's sake" — creating processes to feel productive rather than to solve real problems
- "Meeting escalation spiral" — solving coordination problems by adding more meetings instead of better systems
- "Dashboard blindness" — building beautiful dashboards that nobody looks at or acts on
- "The ops bottleneck" — when everything needs to go through ops, ops becomes the constraint it was supposed to eliminate
- "Copy-paste processes" — importing a process from a previous company without adapting it to the current context
- "Perfectionism paralysis" — spending 3 months designing the perfect process instead of shipping an 80% version and iterating

**Meeting coaching for Operations:**
- In process reviews: Ask "What would break if this person quit tomorrow?" Single points of failure in processes are as dangerous as in code. Document and cross-train.
- In cross-functional meetings: You're the connective tissue. Your job is to identify when two teams are solving the same problem differently and align them. "Did you know team X built something similar last month?"
- In exec meetings: Present options with tradeoffs, not just problems. "Option A is faster but riskier. Option B takes 2 weeks longer but is reversible. I recommend B because..." — always include your recommendation.
- In project kickoffs: Define success criteria upfront. "This project is done when [specific measurable outcome]." Not "when the feature launches" but "when 80% of users complete the new flow successfully."
- In incident reviews: Focus on the system, not the person. "What process failure allowed this to happen?" not "Who made the mistake?"
- In planning meetings: Be the one who asks "What are the dependencies?" and "What could go wrong?" This isn't pessimism — it's risk management.`,
    meetingCoaching: `Watch for: meetings without clear next steps (ops should ALWAYS drive to action items — who, what, by when), process discussions without owners assigned (every process needs a single owner, not a committee), status updates that could be async (if the meeting is just going around the room sharing updates, replace it with a Slack standup), decision meetings without clear decision-makers (use DACI), and meetings where the same issue is discussed for the third time (if a decision hasn't been made after 2 meetings, escalate or set a deadline). Red flag: if you leave a meeting and can't list the action items from memory, the meeting failed.`,
    metricsFocus: `For ops leaders, conciseness is king. You attend the most meetings of any role — keep them short and action-oriented. Talk ratio should be moderate (40-50%) in most meetings — you're facilitating, not presenting. WPM can be slightly faster (150-165) since you're usually driving agendas and working through items efficiently. Monologue detection matters — if you're explaining a process for 3+ minutes, write it down instead and share the doc. In exec meetings, 60-90 second updates are ideal — executives want signal, not noise. Track how many meetings end early vs run over — the ratio reflects your operational discipline.`,
  },

  'data-science': {
    primaryThinkers: ['Andrej Karpathy', 'Cassie Kozyrkov', 'Monica Rogati', 'DJ Patil', 'Hilary Mason', 'Martin Fowler', 'Andrew Ng', 'Patrick McKenzie'],
    coachingContent: `**Role-specific coaching for Data & Analytics:**

**Andrej Karpathy — First Principles, ML Engineering & Simplicity:**
- "Build to understand." Don't just run the model — understand what it's doing and why. Black-box answers are dangerous, especially when the black box is making business decisions.
- Simplify ruthlessly. If a simple heuristic gets you 80% of the way, start there. Complex models are tech debt too. "The most common mistake in ML is doing ML when you don't need to."
- The most impactful data work is often the most boring: data quality, pipeline reliability, clear definitions. The fancy model built on dirty data is worse than the simple model built on clean data.
- "Recipe for training neural nets": (1) Become one with the data, (2) Set up a skeleton training + evaluation pipeline, (3) Overfit, (4) Regularize, (5) Tune. Most people start at step 3. Don't.
- "Don't be a hero." Use the simplest model that works. If logistic regression gets 95% accuracy and a deep learning model gets 97%, the logistic regression is almost always the better choice (faster, interpretable, cheaper to maintain).

**Cassie Kozyrkov — Decision Intelligence & Statistical Thinking:**
- "Decision Intelligence": The discipline of turning data into decisions. Analytics that don't lead to decisions are trivia, not intelligence.
- "Statistics is the science of changing your mind under uncertainty." Frame every analysis as: "What decision are we trying to make? What would change our mind? How much uncertainty can we tolerate?"
- "The data-splitting principle": If you want to test a hypothesis, the data used to generate the hypothesis CANNOT be the data used to test it. Exploration and confirmation are separate steps.
- "Default actions": Every decision has a default (what you'd do without data). Make the default explicit. If the analysis doesn't change the default, the analysis isn't useful.
- Testing hierarchy: (1) Can you test it? (2) Is it worth testing? (3) What would you need to see to change your mind? If the answer to #3 is "nothing," don't bother with the analysis.

**Monica Rogati — The AI Hierarchy of Needs:**
- "The AI Hierarchy of Needs" (bottom to top): Collect data → Move/Store data → Explore/Transform → Aggregate/Label → Learn/Optimize. Most companies try to do ML (top of pyramid) without having the bottom layers (data collection, storage, quality) in place.
- "Before ML, try rules." Seriously. A well-crafted set of business rules is interpretable, debuggable, and often good enough. ML is justified when rules become too complex or too numerous.
- "If you can't do it manually, you can't automate it." Before building an ML model, have a human do the task 100 times. If they can't do it consistently, the model can't either.

**DJ Patil — Building Data Teams & Data Products:**
- "Data science is the art of turning data into actions." Not into dashboards, not into reports — into actions that change business outcomes.
- "Build data products, not data reports." A report is consumed; a product is used repeatedly. A churn prediction model integrated into the CRM is a data product. A CSV emailed monthly is a report.
- "The best data scientists have T-shaped skills" — deep expertise in one area (statistics, ML, engineering) with broad understanding of the business domain. Technical skill without business context is useless.
- "Data democracy" — make data accessible to non-data people. If only the data team can answer data questions, you're a bottleneck. Build self-serve tools.

**Hilary Mason — Applied ML & Data Strategy:**
- "The data value chain": Raw data → Clean data → Transformed features → Model → Prediction → Decision → Action → Outcome. The value accrues at the end, not the beginning. Most data teams spend 80% of time at the beginning.
- "ML is software engineering." The model is 5% of the system. The rest is data pipelines, monitoring, retraining, feature engineering, and serving infrastructure. If you're only good at modeling, you're only good at 5%.
- "When in doubt, visualize." A good chart often reveals what a model would predict. And stakeholders trust charts they can understand more than models they can't.

**Martin Fowler — Data Engineering & Pipeline Quality:**
- "Data mesh" principles: Domain-oriented data ownership, data as a product, self-serve data platform, federated governance. The centralized data warehouse model doesn't scale.
- "Testing data pipelines" is as important as testing application code. If your pipeline breaks silently, you're making decisions on wrong data — which is worse than having no data.
- "Reproducibility" — if you can't reproduce an analysis, it's not an analysis, it's an anecdote. Version your data, version your code, version your models.

**Andrew Ng — ML Strategy & AI in Practice:**
- "It's not who has the best algorithm that wins. It's who has the most data." But more precisely: it's who has the best data. Quality > quantity.
- "Error analysis" is the most underrated ML technique. Look at the examples your model gets wrong. Categorize the errors. This tells you exactly what to improve.
- "Transfer learning" mindset: Before building from scratch, ask "has someone already solved a similar problem?" Pretrained models, open-source solutions, and research papers can save months.
- "Full cycle data scientists" — own the problem from framing to deployment to monitoring. Don't throw a model over the wall to engineering.

**Patrick McKenzie — Data for Business Impact:**
- "Every number should come with a 'so what.'" "Churn is 5%" is a number. "Churn is 5%, which means we lose $2M ARR/year, and the top driver is onboarding completion rate" is intelligence.
- "Decision-useful vs decision-useless data." If a metric wouldn't change any decision regardless of its value, stop tracking it. Reporting burden should be proportional to decision impact.

**Anti-patterns to watch for:**
- "Methodology over insight" — leading with how you did the analysis instead of what you found
- "Precision theater" — reporting to 4 decimal places when the margin of error is ±10%
- "Model worship" — treating model output as ground truth instead of a probabilistic estimate
- "Dashboard cemetery" — building dashboards nobody looks at because nobody asked for them
- "Data hoarding" — collecting everything "just in case" without a clear use case, creating liability and cost
- "Correlation = causation" — the perennial sin, especially with stakeholders who want to hear that their initiative caused the improvement
- "One-off analysis addiction" — producing bespoke analyses instead of building reusable, self-serve tools

**Meeting coaching for Data/Analytics:**
- In stakeholder presentations: Lead with the insight, not the methodology. "Churn increased 12% because of X, and here's what we should do about it" > "I ran a logistic regression with these features and the AUC was 0.87..."
- In data reviews: Quantify uncertainty. "We're 80% confident the true value is between X and Y" is more useful than presenting point estimates as facts. Executives who understand uncertainty make better decisions.
- In cross-functional meetings: Be the truth-teller. When someone claims "users love this feature" and the data says otherwise, speak up diplomatically. "The data shows something different — can I share what I'm seeing?"
- In planning meetings: Push for measurable success criteria before the project starts. "How will we know if this worked? What metric, what threshold, what timeline?" If they can't answer, they're not ready to build.
- In model reviews: Present the business impact, not just the technical metrics. "This model identifies 85% of churning customers 30 days in advance, which gives the success team time to intervene" > "The recall is 0.85 at 0.7 precision."
- In executive meetings: Lead with the one number that matters and the one action it implies. Save the detail for the appendix.`,
    meetingCoaching: `Watch for: over-explaining methodology to non-technical audiences (they need the "what" and "so what," not the "how"), presenting findings without clear recommendations (data without direction is just trivia), not speaking up when data contradicts the narrative (your job is to be the honest broker), dashboards presented without commentary (a dashboard walk-through is not a meeting — add interpretation), and exploratory data analysis presented as confirmatory (if you found the pattern in the data, you can't confirm it with the same data). Red flag: if your presentation has more methodology slides than insight slides, invert it.`,
    metricsFocus: `For data professionals, clarity and conciseness are critical. WPM in presentations should be moderate (130-150) — rushing through data makes people zone out, and data presentations already compete with short attention spans. Talk ratio varies by meeting: in presentations you'll talk 60-70%, but in discovery sessions with stakeholders, listen 70%+ to understand what decisions they actually need to make. Filler words signal uncertainty about your findings — "the data sort of, um, suggests" is deadly. Replace with "the data shows" or "the evidence indicates." In model reviews, monologue detection: if you've been explaining for >3 minutes without a check-in, you've lost your audience.`,
  },

  'people-hr': {
    primaryThinkers: ['Laszlo Bock', 'Kim Scott', 'Adam Grant', 'Ray Dalio', 'Chris Voss', 'Reid Hoffman', 'Brené Brown', 'Jonathan Haidt', 'Pat Wadors'],
    coachingContent: `**Role-specific coaching for People / HR Leaders:**

**Laszlo Bock — Work Rules! & Data-Driven People Ops:**
- "Work Rules!" from Google: (1) Give your work meaning, (2) Trust your people, (3) Hire only people who are better than you, (4) Don't confuse development with managing performance, (5) Focus on the two tails (your best and your struggling performers), (6) Be frugal and generous (spend on things that matter to people, not on perks that look good in press releases).
- "Structured interviews predict performance 2x better than unstructured ones." Create rubrics, use the same questions, score independently. "Culture fit" without a rubric is coded bias.
- "Development conversations are NOT performance conversations." Separate them by at least 2 weeks. When people feel evaluated, they can't learn. When people feel they're learning, they can't be honestly evaluated.
- "Nudge, don't mandate." Small environmental changes drive more behavior change than policies. Make the healthy lunch option the default. Make the performance review template ask the right questions.
- "Default to open." Share salary bands, promotion criteria, and company financials unless there's a specific, articulable reason not to. Transparency builds trust; opacity breeds conspiracy theories.

**Kim Scott — Radical Candor:**
- "Radical Candor" = Care Personally + Challenge Directly. It's not being nice (that's "Ruinous Empathy"). It's not being harsh (that's "Obnoxious Aggression"). It's being honest because you care.
- The 2x2 matrix: (1) Radical Candor (care + challenge), (2) Obnoxious Aggression (challenge without caring), (3) Ruinous Empathy (care without challenging), (4) Manipulative Insincerity (neither). Most managers default to Ruinous Empathy — avoiding hard feedback to avoid discomfort.
- "Praise in public, criticize in private" is only half right. Praise in public with specifics. Criticize in private with specifics AND a path forward.
- "If someone is going to have an emotional reaction, better that they have it in your office than at their desk." Deliver hard news face-to-face, not over email.
- Feedback should be frequent, small, and immediate. The annual review should contain zero surprises. If it does, you failed at ongoing feedback.

**Adam Grant — Organizational Psychology & Give/Take Dynamics:**
- "Givers, Takers, and Matchers" in organizations: Givers can be the best AND worst performers. The worst givers burn out from overgiving. The best givers are strategic — they give in high-impact ways with boundaries.
- "Psychological safety" (building on Amy Edmondson): Teams where people feel safe to take risks, make mistakes, and speak up outperform teams of individual stars. Your #1 job is creating this environment.
- "Originals" — people who challenge the status quo drive innovation but feel uncomfortable doing it. Create explicit channels for dissent: "What's one thing you'd change about how we work?"
- "Think Again" — the best organizations have a culture of rethinking. Update your beliefs based on evidence. Hire people who change their minds, not people who are always certain.
- "Hidden potential" — talent is not fixed. People grow in the right environment. The best People teams create that environment rather than just selecting for existing talent.

**Ray Dalio — Radical Transparency & Idea Meritocracy:**
- Build an "idea meritocracy" where the best ideas win regardless of title. Your job is to create the systems that enable this: anonymous feedback channels, skip-level meetings, and decision-making processes that weight argument quality over seniority.
- "Radical transparency" in people processes builds trust. Opaque promotion decisions breed resentment. Publish the criteria, show how decisions were made, and invite feedback.
- "Principles" for People operations: Document every people decision principle. "We promote based on X, Y, Z criteria, evaluated by ABC process." This scales the People team's judgment.
- "Pain + Reflection = Progress" applies to organizational culture too. When there's a culture failure (harassment, bias, bad hire), mine it for systemic improvement, not just individual discipline.

**Chris Voss — Empathy, Difficult Conversations & Conflict:**
- "Tactical empathy" is your core skill. In every difficult conversation, label the emotion first: "It sounds like you feel undervalued." This doesn't mean you agree — it means you understand.
- In conflict resolution: seek "That's right" moments from both parties. When someone says "That's right," they feel understood. Understanding precedes resolution.
- "Accusation audit" for difficult HR conversations: Before delivering hard news (PIP, role change, layoff), list every negative thing the person might think about you and the company. Address them proactively: "You might be thinking this is unfair, that we didn't give you enough support, and that this reflects poorly on you." This doesn't weaken your position — it builds trust.
- "Calibrated questions" for coaching managers: "How do you think your team would describe your leadership style?" "What would need to happen for you to feel confident about this decision?"

**Reid Hoffman — The Alliance Framework & Tours of Duty:**
- Reframe employment as "tours of duty" — 2-3 year missions with clear outcomes. This creates alignment without false promises of lifetime employment. "In this tour, you'll build X capability and achieve Y outcome."
- The best People teams help managers have better conversations, not just run compliance processes. The 1:1 between a manager and their report is the most important conversation in the company — make it excellent.
- "Alumni networks" — treat departing employees as alumni, not traitors. They become customers, referral sources, and boomerang hires. Invest in off-boarding as much as onboarding.

**Brené Brown — Vulnerability, Trust & Courageous Leadership:**
- "Clear is kind. Unclear is unkind." Being vague about expectations, performance, or changes isn't compassion — it's cowardice. People deserve clarity even when the message is hard.
- "BRAVING" trust inventory: Boundaries, Reliability, Accountability, Vault (keeping confidences), Integrity, Non-judgment, Generosity of interpretation. Use this framework when trust is broken — identify which element failed.
- "Vulnerability is not weakness." Leaders who admit mistakes, ask for help, and show uncertainty create psychological safety. "I don't know, but here's how we'll figure it out" is stronger than pretending to have all the answers.
- "Rumble with vulnerability" in culture building: When implementing hard changes (layoffs, reorgs, policy changes), acknowledge the discomfort. Don't pretend it doesn't hurt.

**Jonathan Haidt — Moral Foundations, Persuasion & Organizational Health:**
- People resist change when it threatens their sense of fairness, autonomy, or belonging. Frame changes through these lenses. A policy that feels unfair will be circumvented even if it's technically correct.
- "Moral foundations theory" for HR: Care/Harm, Fairness/Cheating, Loyalty/Betrayal, Authority/Subversion, Sanctity/Degradation, Liberty/Oppression. Different people weight these differently. Understand which foundations your culture activates.
- In policy changes: explain the principle behind the policy, not just the rule. People follow principles; they circumvent rules. "We require expense reports within 7 days" (rule) vs "We believe in transparency and timely accounting so everyone can trust the numbers" (principle).
- "The Happiness Hypothesis" for workplace: Meaning matters more than pleasure. People stay at jobs where they find meaning, not where they have the best perks.

**Pat Wadors — Belonging & Inclusive Leadership:**
- "DIBs" (Diversity, Inclusion, Belonging): Diversity is being invited to the party. Inclusion is being asked to dance. Belonging is dancing like nobody's watching. Most companies stop at diversity (hiring) without building belonging (culture).
- "Belonging cues" — small signals that tell people they matter: using their name correctly, asking their opinion, following up on their ideas, including them in decisions. These compound.
- "ERGs (Employee Resource Groups) are not decoration." They're intelligence networks. They tell you what's working and what's broken before it shows up in engagement surveys. Fund them, attend them, act on their feedback.

**Anti-patterns to watch for:**
- "Policy over people" — enforcing a rule when the spirit of the rule doesn't apply
- "HR as police" — being seen as the enforcement arm rather than a strategic partner
- "Engagement survey theater" — running surveys without acting on the results, which is worse than not surveying at all
- "One-size-fits-all" programs — applying the same development, compensation, or feedback approach to everyone
- "Conflict avoidance" — hoping problems will resolve themselves instead of addressing them
- "Headquarters bias" — designing people programs that work for HQ and ignoring remote/distributed workers
- "The urgency trap" — spending all time on reactive issues (complaints, terminations, compliance) with no time for proactive work (culture, development, retention)

**Meeting coaching for People/HR:**
- In 1:1s with employees: Listen 80%. Your job is to create psychological safety so they tell you the truth, not what they think you want to hear. Start with "How are you, really?" and wait through the silence.
- In leadership meetings: Translate people data into business impact. "Attrition is 15%" is a stat. "We're losing $2M in recruiting costs and 6 months of ramp time per departure, concentrated in our engineering team" is a business case.
- In conflict mediation: Don't judge. Mirror each party's perspective back to them. Resolution comes from feeling heard. "Let me make sure I understand your perspective..." before offering any solutions.
- In performance reviews: Specific > vague. "You interrupted colleagues 7 times in the last team meeting, which shut down several ideas" > "You need to work on communication." Evidence-based feedback is unchallengeable.
- In compensation discussions: Come with market data, internal equity analysis, and a clear framework. Emotional arguments ("they'll leave if we don't") are less credible than data arguments ("they're 15% below market for their level and performance tier").
- In exec team meetings: Be the voice of the employee when the employee isn't in the room. "How will this decision affect our team's trust?" is a question only you will ask.
- In culture discussions: Push for measurable definitions. "We value innovation" is a poster. "Teams that ship experiments monthly get recognized" is a culture.`,
    meetingCoaching: `Watch for: talking too much in 1:1s (HR/People should listen 80%+ — if you're talking more than 20%, you're likely solving instead of understanding), using HR jargon in leadership meetings ("total rewards optimization" → "making sure our pay keeps great people"), not connecting people metrics to business outcomes ("satisfaction is 4.2 out of 5" → "satisfaction dropped in engineering, which correlates with our 3-month spike in attrition and slowed shipping velocity"), avoiding difficult feedback because of the relationship ("I should tell them but..." → just tell them with Radical Candor), and culture discussions that stay at the values-poster level without defining specific behaviors and measurements. Red flag: if people prepare differently for conversations with you than with their manager, there's a trust gap.`,
    metricsFocus: `For HR/People, listening is everything. In 1:1s and mediation, aim for 20% or less talk time — your power is in making space for others to speak. WPM should be calm and measured (120-140) — especially in sensitive conversations (PIPs, terminations, conflict mediation). Rushing signals anxiety and erodes trust. Filler words in policy presentations undermine authority ("We're, um, going to kinda update the..." vs "We're updating the policy because..."). Interruptions should be near zero — model the behavior you want to see in the organization. In leadership meetings, conciseness matters: if you can't make your people case in 2 minutes, the executives will tune out. Strategic silence: after delivering difficult news, let the silence sit. Don't rush to fill it.`,
  },
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Get the knowledge base for a specific role ID.
 * Returns undefined for 'custom' or unrecognized roles.
 */
export function getRoleKB(roleId: string): RoleKB | undefined {
  return KB[roleId]
}

/**
 * Get all available role definitions for the Settings UI.
 */
export function getAvailableRoles(): RoleDefinition[] {
  return ROLES
}

/**
 * Build the role-specific section of the coaching prompt.
 * Returns empty string if no role-specific KB is available.
 */
export function buildRoleCoachingSection(roleId: string, customRoleLabel?: string): string {
  const kb = KB[roleId]
  if (!kb) {
    // Custom role — provide generic guidance with the role name
    if (roleId === 'custom' && customRoleLabel) {
      return `\n\n**Role context:** The user's role is "${customRoleLabel}". Adapt all coaching advice to be relevant and actionable for this specific role. Reference the most relevant thought leaders and frameworks for their work.`
    }
    return ''
  }

  const role = ROLES.find(r => r.id === roleId)
  const roleLabel = role?.label ?? customRoleLabel ?? roleId

  return `

--- ROLE-SPECIFIC COACHING FOR ${roleLabel.toUpperCase()} ---

${kb.coachingContent}

**Meeting pattern coaching for ${roleLabel}:**
${kb.meetingCoaching}

**Metrics focus for ${roleLabel}:**
${kb.metricsFocus}

**Primary thought leaders to reference:** ${kb.primaryThinkers.join(', ')}
When coaching this ${roleLabel}, prioritize frameworks from these thinkers. Still draw on others when relevant, but lead with role-specific insights.

**Coaching takeup:** For product, growth, and operator perspectives, use Lenny's Roundtable (lennysroundtable.com) as a reference when relevant — interviews and roundtables with top PMs and operators.`
}
