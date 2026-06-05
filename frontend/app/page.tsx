import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileCheck2,
  FileText,
  LockKeyhole,
  Network,
  Search,
  ShieldCheck,
  Sparkles,
  UploadCloud,
} from "lucide-react";

import { BrandMark } from "@/components/marketing/BrandMark";

const capabilities = [
  {
    title: "Grounded answers",
    description:
      "Responses are assembled from approved source passages with citations your team can inspect.",
    icon: FileCheck2,
  },
  {
    title: "Hybrid retrieval",
    description:
      "Keyword recall, semantic search, and graph relationships work together for better context.",
    icon: Search,
  },
  {
    title: "Pre-LLM permissions",
    description:
      "Role and sensitivity checks run before document context ever reaches the model.",
    icon: LockKeyhole,
  },
  {
    title: "Document pipeline",
    description:
      "Ingest PDFs, DOCX, text, and Markdown with parsing, chunking, embeddings, and lineage.",
    icon: UploadCloud,
  },
  {
    title: "Knowledge graph",
    description:
      "Extract entities and relationships so teams can reason across people, policies, and projects.",
    icon: Network,
  },
  {
    title: "Audit readiness",
    description:
      "Every query, access decision, upload, and mutation is logged for operational review.",
    icon: ShieldCheck,
  },
];

const workflow = [
  {
    step: "01",
    title: "Register content",
    description: "Upload source material and assign the right sensitivity level.",
  },
  {
    step: "02",
    title: "Build context",
    description: "Parse, chunk, embed, and connect entities in the graph.",
  },
  {
    step: "03",
    title: "Ask safely",
    description: "Retrieve only permitted context before the model sees a token.",
  },
  {
    step: "04",
    title: "Review outcomes",
    description: "Trace citations, quality scores, access checks, and audit events.",
  },
];

const proofPoints = [
  "Citations by default",
  "RBAC before retrieval",
  "Hybrid search stack",
  "Self-hostable architecture",
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-[#05070d] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,#05070d_0%,#090b10_44%,#05070d_100%)]" />
      <div className="premium-grid pointer-events-none fixed inset-0 opacity-60" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[680px] bg-[radial-gradient(90%_80%_at_50%_0%,rgba(20,184,166,0.18),rgba(5,7,13,0)_70%)]" />

      <header className="sticky top-0 z-50 border-b border-white/[0.08] bg-transparent backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-6 lg:px-8">
          <BrandMark />

          <nav className="hidden items-center gap-8 text-sm font-medium text-white/60 md:flex">
            <a className="transition hover:text-white" href="#product">
              Product
            </a>
            <a className="transition hover:text-white" href="#workflow">
              Workflow
            </a>
            <a className="transition hover:text-white" href="#security">
              Security
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm font-medium text-white/[0.64] transition hover:text-white sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-7xl px-5 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-md border border-teal-300/20 bg-teal-300/[0.08] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-teal-100/80">
              <Sparkles className="h-3.5 w-3.5" />
              Secure GraphRAG for serious teams
            </div>

            <h1 className="mt-7 text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
              Turn private knowledge into answers your team can verify.
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-7 text-white/[0.64] sm:text-lg">
              GraphRAG combines hybrid retrieval, knowledge graphs, citations,
              access control, and audit trails so critical documents can be
              queried with confidence.
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/register"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90 sm:w-auto"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="#workflow"
                className="inline-flex h-12 w-full items-center justify-center rounded-md border border-white/[0.12] bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:border-white/[0.22] hover:bg-white/[0.07] sm:w-auto"
              >
                See workflow
              </a>
            </div>

            <div className="mx-auto mt-8 grid max-w-3xl grid-cols-2 gap-2 sm:grid-cols-4">
              {proofPoints.map((point) => (
                <div
                  key={point}
                  className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-xs font-medium text-white/[0.64]"
                >
                  {point}
                </div>
              ))}
            </div>
          </div>

          <ProductPreview />
        </section>

        <section id="product" className="border-y border-white/[0.08] bg-white/[0.025]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/70">
                Product
              </p>
              <h2 className="mt-4 max-w-lg text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                The retrieval layer for teams that need proof, not guesses.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/[0.58] sm:text-base">
                Bring together documents, permissions, graph context, and
                answer quality in one workspace built for repeatable knowledge
                work.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {capabilities.map(({ title, description, icon: Icon }) => (
                <article
                  key={title}
                  className="rounded-lg border border-white/10 bg-black/[0.24] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.2)]"
                >
                  <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md bg-white text-black">
                    <Icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-base font-semibold text-white">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/[0.56]">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="workflow" className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/70">
                Workflow
              </p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                From upload to answer, every step stays traceable.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/[0.58] sm:text-base">
                GraphRAG makes the retrieval process visible enough for product
                teams, operators, and security reviewers to trust the result.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {workflow.map((item) => (
                <div
                  key={item.step}
                  className="rounded-lg border border-white/10 bg-white/[0.035] p-5"
                >
                  <p className="text-xs font-semibold tracking-[0.2em] text-teal-200/70">
                    {item.step}
                  </p>
                  <h3 className="mt-4 text-base font-semibold text-white">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-white/[0.56]">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="security" className="border-y border-white/[0.08] bg-white/[0.025]">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:px-6 lg:grid-cols-[1fr_0.95fr] lg:px-8 lg:py-20">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/70">
                Security
              </p>
              <h2 className="mt-4 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Governance built into the retrieval path.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-white/[0.58] sm:text-base">
                Access checks, sensitivity levels, source lineage, and audit
                events are part of the core flow, not a reporting layer bolted
                on afterward.
              </p>

              <div className="mt-8 grid max-w-xl gap-3">
                {[
                  "Unauthorized content is filtered before prompt construction.",
                  "Teams can inspect citations and source passages behind each answer.",
                  "Admins get a durable log of who asked what and what was used.",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3 text-sm text-white/[0.68]">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-300" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <AuditPreview />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="grid gap-8 border-y border-white/10 py-12 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-200/70">
                Get started
              </p>
              <h2 className="mt-4 max-w-2xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Build a knowledge workspace your team can actually trust.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/[0.58] sm:text-base">
                Upload a document, run the pipeline, and ask the first cited
                question with governance in place from day one.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                href="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-white px-5 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Create account
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex h-12 items-center justify-center rounded-md border border-white/[0.12] px-5 text-sm font-semibold text-white/[0.78] transition hover:border-white/[0.22] hover:bg-white/[0.05] hover:text-white"
              >
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/[0.08]">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-sm text-white/[0.46] sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <BrandMark />
          <p>2026 Enterprise Graph Rag. Secure document intelligence for governed teams.</p>
        </div>
      </footer>
    </div>
  );
}

function ProductPreview() {
  return (
    <div className="mx-auto mt-14 max-w-6xl">
      <div className="rounded-lg border border-white/[0.12] bg-white/[0.055] p-2 shadow-[0_32px_110px_rgba(0,0,0,0.45)] backdrop-blur-xl">
        <div className="overflow-hidden rounded-md border border-white/10 bg-[#080a0f]">
          <div className="flex h-10 items-center justify-between border-b border-white/10 bg-white/[0.035] px-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/[0.14]" />
              <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
            </div>
            <p className="hidden text-xs font-medium uppercase tracking-[0.18em] text-white/[0.38] sm:block">
              Workspace overview
            </p>
            <div className="h-2 w-20 rounded-full bg-white/10" />
          </div>

          <div className="grid min-h-[390px] md:grid-cols-[220px_1fr]">
            <aside className="hidden border-r border-white/10 bg-black/20 p-4 md:block">
              <div className="mb-6 flex items-center gap-3">
                <div className="grid h-8 w-8 place-items-center rounded-md bg-white text-black">
                  <Network className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Enterprise Graph Rag</p>
                  <p className="text-xs text-white/[0.38]">Workspace</p>
                </div>
              </div>
              <div className="space-y-2">
                {["Dashboard", "Documents", "Chat", "Graph", "Analytics"].map((item, index) => (
                  <div
                    key={item}
                    className={`rounded-md px-3 py-2 text-sm ${
                      index === 0
                        ? "bg-white text-black"
                        : "border border-white/[0.08] text-white/[0.46]"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </aside>

            <div className="p-4 sm:p-5 lg:p-6">
              <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-md border border-emerald-300/[0.18] bg-emerald-300/[0.08] px-2.5 py-1 text-xs font-medium text-emerald-200">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Workspace healthy
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                    Knowledge operations
                  </h3>
                  <p className="mt-1 text-sm text-white/[0.46]">
                    Documents, queries, quality, and access posture in one view.
                  </p>
                </div>
                <div className="rounded-md border border-white/10 bg-white/[0.035] px-3 py-2 text-sm text-white/[0.64]">
                  Last 30 days
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <PreviewMetric label="Documents" value="1,284" detail="982 ready" />
                <PreviewMetric label="Queries" value="48k" detail="412ms p95" />
                <PreviewMetric label="Quality" value="0.87" detail="faithfulness" />
              </div>

              <div className="mt-3 grid gap-3 lg:grid-cols-[1fr_0.86fr]">
                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Retrieval signal</p>
                    <BarChart3 className="h-4 w-4 text-white/[0.36]" />
                  </div>
                  <div className="flex h-36 items-end gap-2">
                    {[44, 58, 36, 72, 84, 61, 92, 76, 88, 69, 95, 82].map((height, index) => (
                      <span
                        key={`${height}-${index}`}
                        className="flex-1 rounded-sm bg-gradient-to-t from-teal-400/60 via-cyan-200/70 to-white/90"
                        style={{ height: `${height}%` }}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
                  <div className="mb-4 flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Recent sources</p>
                    <FileText className="h-4 w-4 text-white/[0.36]" />
                  </div>
                  <div className="space-y-3">
                    {[
                      ["Security policy", "Restricted"],
                      ["Support handbook", "Internal"],
                      ["Q2 product plan", "Confidential"],
                    ].map(([title, level]) => (
                      <div key={title} className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-white/[0.82]">{title}</p>
                          <p className="text-xs text-white/[0.38]">Indexed with lineage</p>
                        </div>
                        <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-xs text-white/[0.48]">
                          {level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PreviewMetric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.035] p-4">
      <p className="text-xs font-medium uppercase tracking-[0.16em] text-white/[0.36]">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 truncate text-xs text-white/[0.42]">{detail}</p>
    </div>
  );
}

function AuditPreview() {
  const rows = [
    { actor: "alice@acme.co", action: "Query", status: "Allowed" },
    { actor: "hr-bot", action: "Embed", status: "Allowed" },
    { actor: "guest", action: "Download", status: "Blocked" },
    { actor: "svc-pipeline", action: "Graph", status: "Allowed" },
  ];

  return (
    <div className="rounded-lg border border-white/10 bg-black/[0.24] p-4 shadow-[0_20px_70px_rgba(0,0,0,0.26)]">
      <div className="mb-4 flex items-center justify-between border-b border-white/10 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/[0.38]">
            Access log
          </p>
          <p className="mt-1 text-sm font-semibold text-white">Last 24 hours</p>
        </div>
        <Database className="h-5 w-5 text-white/[0.38]" />
      </div>

      <div className="space-y-2">
        {rows.map((row) => {
          const blocked = row.status === "Blocked";
          return (
            <div
              key={`${row.actor}-${row.action}`}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white/[0.82]">{row.actor}</p>
                <p className="text-xs text-white/[0.38]">{row.action}</p>
              </div>
              <span
                className={`rounded-md px-2 py-1 text-xs font-medium ${
                  blocked
                    ? "bg-amber-300/10 text-amber-200"
                    : "bg-emerald-300/10 text-emerald-200"
                }`}
              >
                {row.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
