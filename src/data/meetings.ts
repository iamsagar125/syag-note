export interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: string;
  participants: string[];
  summary: string;
  keyPoints: string[];
  actionItems: { text: string; assignee: string; done: boolean }[];
  transcript?: string;
  tags: string[];
}

export const meetings: Meeting[] = [
  {
    id: "1",
    title: "Q1 Product Roadmap Review",
    date: "Feb 14, 2026",
    time: "10:00 AM",
    duration: "45 min",
    participants: ["Sarah Chen", "Marcus Webb", "Priya Patel", "You"],
    summary: "Discussed the Q1 product roadmap with a focus on AI-powered features. Team aligned on prioritizing the smart summarization engine and real-time collaboration tools. Budget approved for two additional engineers.",
    keyPoints: [
      "AI summarization engine is the top priority for Q1",
      "Real-time collaboration features moved to Q1 from Q2",
      "Budget approved for 2 new senior engineers",
      "Beta launch target: March 15, 2026",
    ],
    actionItems: [
      { text: "Draft technical spec for AI summarization", assignee: "Marcus Webb", done: true },
      { text: "Post job listings for senior engineers", assignee: "Priya Patel", done: false },
      { text: "Schedule design review for collaboration UI", assignee: "Sarah Chen", done: false },
    ],
    tags: ["Product", "Roadmap", "AI"],
  },
  {
    id: "2",
    title: "Design System Workshop",
    date: "Feb 13, 2026",
    time: "2:00 PM",
    duration: "1 hr",
    participants: ["Alex Rivera", "Jordan Kim", "You"],
    summary: "Workshop to align on the new design system tokens and component library. Decided on warm, organic aesthetic with earthy tones. Created initial token definitions and component inventory.",
    keyPoints: [
      "Adopted warm, earthy color palette with sage accents",
      "Playfair Display chosen as display typeface",
      "Component library to be built with Radix primitives",
      "Design tokens finalized for spacing, typography, and color",
    ],
    actionItems: [
      { text: "Implement design tokens in Tailwind config", assignee: "Alex Rivera", done: true },
      { text: "Create Figma component library", assignee: "Jordan Kim", done: false },
    ],
    tags: ["Design", "Workshop"],
  },
  {
    id: "3",
    title: "Weekly Engineering Standup",
    date: "Feb 12, 2026",
    time: "9:30 AM",
    duration: "30 min",
    participants: ["Full Engineering Team", "You"],
    summary: "Standard weekly standup. Backend team resolved the database migration issue. Frontend team completed the new dashboard layout. Mobile team is blocked on API changes.",
    keyPoints: [
      "Database migration issue resolved — no data loss",
      "New dashboard layout shipped to staging",
      "Mobile team blocked on v2 API endpoints",
      "Performance improvements: 40% faster page loads",
    ],
    actionItems: [
      { text: "Prioritize v2 API endpoints for mobile", assignee: "Backend Team", done: false },
      { text: "Run load tests on new dashboard", assignee: "DevOps", done: true },
    ],
    tags: ["Engineering", "Standup"],
  },
  {
    id: "4",
    title: "Investor Update Prep",
    date: "Feb 11, 2026",
    time: "4:00 PM",
    duration: "1 hr 15 min",
    participants: ["CEO", "CFO", "You"],
    summary: "Prepared materials for the upcoming investor update. Reviewed financial metrics, user growth, and product milestones. Agreed on narrative focusing on AI differentiation and market expansion.",
    keyPoints: [
      "MRR grew 28% quarter-over-quarter",
      "User base reached 150K active users",
      "AI features driving 3x higher retention",
      "Series B timeline: Q3 2026",
    ],
    actionItems: [
      { text: "Finalize investor deck by Friday", assignee: "CEO", done: false },
      { text: "Prepare financial appendix", assignee: "CFO", done: false },
    ],
    tags: ["Business", "Investors"],
  },
  {
    id: "5",
    title: "Customer Feedback Review",
    date: "Feb 10, 2026",
    time: "11:00 AM",
    duration: "50 min",
    participants: ["Product Team", "Support Lead", "You"],
    summary: "Reviewed latest batch of customer feedback and NPS scores. Overall sentiment positive with key requests around better search, faster sync, and calendar integrations.",
    keyPoints: [
      "NPS score improved to 72 from 65",
      "Top request: improved search with filters",
      "Calendar integration most requested feature",
      "Enterprise customers want SSO support",
    ],
    actionItems: [
      { text: "Create RFC for advanced search", assignee: "Product Team", done: false },
      { text: "Evaluate calendar API providers", assignee: "You", done: true },
    ],
    tags: ["Product", "Feedback"],
  },
];
