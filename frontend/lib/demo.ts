import type { EvaluationResult, RoleSummary } from "./types";

function demoRole(
  name: string,
  position_title: string,
  department: string,
  categoryCount: number,
  description: string,
): RoleSummary {
  return {
    name,
    position_title,
    department,
    description,
    source: "community",
    categories: Array.from({ length: categoryCount }, (_, index) => ({
      key: `category_${index}`,
      label: `Category ${index + 1}`,
      max: 20,
      icon: "•",
    })),
    bonus_max: 15,
    max_final_score: 115,
  };
}

/** Rubric catalog shape used by `/demo/rubrics`, mirroring `GET /roles`. */
export const DEMO_ROLES: RoleSummary[] = [
  demoRole(
    "software_engineering_intern",
    "Software Engineering Intern",
    "Engineering",
    4,
    "HackerRank hiring-agent intern rubric: open source, self-projects, production experience, and technical skills.",
  ),
  demoRole(
    "senior_full_stack_engineer",
    "Senior / Full-Stack Software Engineer",
    "Engineering",
    6,
    "Experienced software engineers: production systems, architecture, leadership, and technical breadth.",
  ),
  demoRole(
    "backend_engineer",
    "Backend Engineer",
    "Engineering",
    5,
    "Services, data stores, APIs, and production reliability for backend-focused engineers.",
  ),
  demoRole(
    "frontend_engineer",
    "Frontend Engineer",
    "Engineering",
    5,
    "User interfaces, accessibility, performance, and product-facing engineering.",
  ),
  demoRole(
    "devops_sre",
    "DevOps / Site Reliability Engineer",
    "Engineering",
    5,
    "Infrastructure, delivery, observability, and reliability engineering.",
  ),
  demoRole(
    "engineering_manager",
    "Engineering Manager",
    "Engineering",
    5,
    "Team leadership, delivery, hiring, and technical judgment for engineering managers.",
  ),
  demoRole(
    "machine_learning_engineer",
    "Machine Learning Engineer",
    "Data & ML",
    5,
    "Applied ML: problem framing, models in production, evaluation, and data quality.",
  ),
  demoRole(
    "data_analyst",
    "Data Analyst",
    "Data & ML",
    5,
    "Analysis quality, metrics, stakeholder communication, and decision impact.",
  ),
  demoRole(
    "product_manager",
    "Product Manager",
    "Product",
    5,
    "Problem discovery, product sense, delivery, and measured outcomes for PMs.",
  ),
  demoRole(
    "product_designer",
    "Product Designer",
    "Design",
    5,
    "Product design: research, craft, systems, and shipped UX outcomes.",
  ),
  demoRole(
    "general_professional",
    "General professional",
    "General",
    6,
    "Role-agnostic screening: experience, impact, skills, and communication when no specialist rubric fits.",
  ),
];

/**
 * Fictional result used by `/demo` for screenshots and UI work without a
 * running backend or a real CV. Not shipped in any evaluation path.
 */
export const DEMO_RESULT: EvaluationResult = {
  candidate_name: "Alex Rivera",
  model: "gemma4:31b-mlx",
  runtime: "local",
  github_enriched: true,
  resume: null,
  github: null,
  evaluations: [
    {
      role: "senior_full_stack_engineer",
      position_title: "Senior / Full-Stack Software Engineer",
      total_score: 78,
      total_max: 100,
      bonus_points: 8,
      deductions: 0,
      bonus_breakdown:
        "Maintains a 4k-star open-source CLI with an active release cadence.",
      deduction_reasons: "",
      overall: 86,
      max_final_score: 115,
      categories: [
        {
          key: "production_systems",
          label: "Production Systems",
          icon: "🛠",
          score: 25,
          max: 30,
          evidence:
            "Founding engineer at a Series A analytics company; scaled ingestion from pre-seed to millions of daily events while holding p95 latency under 200ms and 99.9% uptime.",
        },
        {
          key: "architecture",
          label: "Architecture & Design",
          icon: "🏗",
          score: 16,
          max: 20,
          evidence:
            "Led the migration from a monolith to five owned services, with a written RFC covering the queue-versus-stream trade-off and a documented rollback path.",
        },
        {
          key: "leadership",
          label: "Leadership & Impact",
          icon: "🌟",
          score: 11,
          max: 15,
          evidence:
            "Mentored four engineers, two of whom were promoted; introduced the design-review process now used across the platform group.",
        },
        {
          key: "open_source",
          label: "Open Source",
          icon: "⚡",
          score: 13,
          max: 15,
          evidence:
            "Maintainer of a widely used TypeScript CLI (4.1k stars) and merged contributor to two infrastructure projects, including a scheduler fix.",
        },
        {
          key: "self_projects",
          label: "Personal Projects",
          icon: "🚀",
          score: 7,
          max: 10,
          evidence:
            "Self-hosted observability stack with published benchmarks; documented, versioned, and used by others outside the author.",
        },
        {
          key: "breadth",
          label: "Technical Breadth",
          icon: "🧩",
          score: 6,
          max: 10,
          evidence:
            "Strong backend and infrastructure depth. Front-end work is present but mostly internal tooling, with little evidence of user-facing UI ownership.",
        },
      ],
      key_strengths: [
        "Quantified production outcomes: event volume, latency, and uptime are all stated with numbers.",
        "Architecture decisions are documented with trade-offs, not just tool names.",
        "Open-source maintainership on a project with real external adoption.",
      ],
      areas_for_improvement: [
        "Front-end ownership is thin for a full-stack title — no user-facing surface is described end to end.",
        "Cost and capacity work is absent; scaling is described only in throughput terms.",
      ],
    },
    {
      role: "backend_engineer",
      position_title: "Backend Engineer",
      total_score: 72,
      total_max: 100,
      bonus_points: 5,
      deductions: 2,
      bonus_breakdown: "Public write-up of the ingestion redesign.",
      deduction_reasons:
        "Two listed technologies appear only as keywords with no described usage.",
      overall: 75,
      max_final_score: 115,
      categories: [
        {
          key: "systems_apis",
          label: "Systems & APIs",
          icon: "🔌",
          score: 24,
          max: 30,
          evidence:
            "Owned three public APIs including a versioned partner integration; contracts and consumer impact are described.",
        },
        {
          key: "data_storage",
          label: "Data & Storage",
          icon: "🗄",
          score: 15,
          max: 20,
          evidence:
            "Designed the event schema and a partitioning strategy; migrations are mentioned with a stated backfill approach.",
        },
        {
          key: "reliability",
          label: "Reliability & Operations",
          icon: "🛡",
          score: 17,
          max: 20,
          evidence:
            "On-call rotation, defined SLOs, and two postmortems referenced with resulting fixes.",
        },
        {
          key: "quality",
          label: "Quality & Testing",
          icon: "✅",
          score: 9,
          max: 15,
          evidence:
            "Integration tests and CI gates are mentioned; no load or contract testing is described.",
        },
        {
          key: "collaboration",
          label: "Collaboration",
          icon: "🤝",
          score: 12,
          max: 15,
          evidence:
            "Cross-functional work with product and data teams, with a shipped outcome attributed to the collaboration.",
        },
      ],
      key_strengths: [
        "Reliability practice is concrete: SLOs, on-call, and postmortems with follow-through.",
        "API ownership is described at contract level, not as ticket work.",
      ],
      areas_for_improvement: [
        "Testing depth stops at integration; no evidence of load or contract testing for the partner API.",
      ],
    },
  ],
};
