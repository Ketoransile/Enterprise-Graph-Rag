import Link from "next/link";

/* ──────────────────────────────────────────────────────────
   GraphRAG — Premium Landing Page
   ────────────────────────────────────────────────────────── */

const features = [
  {
    title: "Document Intelligence",
    desc: "Upload PDFs, DOCX, TXT, and Markdown. We extract, chunk semantically, and embed — preserving full provenance so every answer traces to its source.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
    ),
    gradient: "from-indigo-500 to-cyan-400",
  },
  {
    title: "Hybrid Retrieval",
    desc: "BM25 keyword search + vector embeddings + knowledge graph traversal — combined with reranking for precision and recall on every question.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
    ),
    gradient: "from-violet-500 to-pink-400",
  },
  {
    title: "Pre-LLM Guardrails",
    desc: "RBAC and document sensitivity checks execute before context ever reaches the model. Unauthorized content never enters the prompt window.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
    ),
    gradient: "from-emerald-500 to-teal-400",
  },
  {
    title: "Knowledge Graph",
    desc: "Automatically extract entities and relationships from documents. Explore connections between people, projects, policies, and technologies.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><circle cx="19" cy="5" r="2"/><circle cx="5" cy="5" r="2"/><circle cx="5" cy="19" r="2"/><circle cx="19" cy="19" r="2"/><line x1="14.5" y1="10" x2="17.5" y2="6.5"/><line x1="9.5" y1="10" x2="6.5" y2="6.5"/><line x1="9.5" y1="14" x2="6.5" y2="17.5"/><line x1="14.5" y1="14" x2="17.5" y2="17.5"/></svg>
    ),
    gradient: "from-amber-500 to-orange-400",
  },
  {
    title: "Streaming Chat",
    desc: "Ask questions in natural language. Get real-time streamed answers with inline citations that link back to specific source passages.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
    ),
    gradient: "from-blue-500 to-indigo-400",
  },
  {
    title: "Audit & Compliance",
    desc: "Every query, access attempt, and mutation is logged with user identity, timestamps, and status. Full accountability for enterprise compliance.",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
    ),
    gradient: "from-rose-500 to-pink-400",
  },
];

const pipeline = [
  { step: "Upload", desc: "Drag & drop files", num: "01" },
  { step: "Extract", desc: "Parse raw text", num: "02" },
  { step: "Chunk", desc: "Semantic splitting", num: "03" },
  { step: "Embed", desc: "Vector encoding", num: "04" },
  { step: "Graph", desc: "Entity extraction", num: "05" },
  { step: "Answer", desc: "Grounded output", num: "06" },
];

const auditRows = [
  { user: "alice@acme.co", action: "QUERY", status: "ALLOWED", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { user: "hr-bot", action: "EMBED", status: "ALLOWED", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { user: "guest", action: "QUERY", status: "BLOCKED", color: "text-amber-400", bg: "bg-amber-400/10" },
  { user: "svc-pipeline", action: "GRAPH", status: "ALLOWED", color: "text-emerald-400", bg: "bg-emerald-400/10" },
  { user: "external", action: "DOWNLOAD", status: "DENIED", color: "text-red-400", bg: "bg-red-400/10" },
];

const stats = [
  { label: "Latency p95", value: "412ms", sub: "end-to-end" },
  { label: "Guardrail pass", value: "99.2%", sub: "all queries" },
  { label: "Faithfulness", value: "≥ 0.85", sub: "target score" },
  { label: "Context recall", value: "≥ 0.75", sub: "target score" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0e1a] text-white overflow-hidden relative">
      {/* ── Animated background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
        <div className="orb orb-4" />
        <div className="orb orb-5" />
      </div>

      {/* ── Subtle grid overlay ── */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* ── Navigation ── */}
      <header className="sticky top-0 z-50 glass-strong" id="nav-header">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="19" cy="5" r="2"/>
                <circle cx="5" cy="19" r="2"/>
                <line x1="14.5" y1="10" x2="17.5" y2="6.5"/>
                <line x1="9.5" y1="14" x2="6.5" y2="17.5"/>
              </svg>
            </div>
            <Link href="/" className="text-lg font-bold tracking-tight">
              GraphRAG
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-300">
            <Link href="#features" className="hover:text-white transition-colors duration-200">Features</Link>
            <Link href="#pipeline" className="hover:text-white transition-colors duration-200">Pipeline</Link>
            <Link href="#security" className="hover:text-white transition-colors duration-200">Security</Link>
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <Link
              href="/login"
              className="text-slate-300 hover:text-white transition-colors duration-200 hidden sm:inline-flex"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="btn-primary !py-2 !px-5 text-sm !rounded-lg inline-flex items-center gap-2"
            >
              Get started
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        {/* ════════════════════════════════════════════════
            HERO SECTION
           ════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pt-20 pb-24 lg:pt-32 lg:pb-32">
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-16 items-center">
            {/* Left: Copy */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="animate-fade-in-up inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-1.5 text-xs font-medium text-indigo-200 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-400 dot-pulse" />
                Enterprise-ready · Graph-native · Audit-first
              </div>

              {/* Headline */}
              <div className="space-y-5 animate-fade-in-up animate-delay-100">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight">
                  Ask your docs.{" "}
                  <span className="gradient-text">
                    Trust the answer.
                  </span>
                </h1>
                <p className="text-lg lg:text-xl text-slate-300/90 max-w-xl leading-relaxed font-light">
                  GraphRAG unifies vector search, keyword matching, and knowledge graph traversal into one secure retrieval layer — with citations, RBAC, and full audit trails.
                </p>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4 animate-fade-in-up animate-delay-200">
                <Link
                  href="/login"
                  className="btn-primary text-sm inline-flex items-center gap-2"
                >
                  Start now — free
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </Link>
                <Link
                  href="#pipeline"
                  className="btn-secondary text-sm inline-flex items-center gap-2"
                >
                  See how it works
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-fade-in-up animate-delay-300">
                {["RBAC before LLM", "Full audit trail", "Hybrid search", "Graph lineage"].map((item) => (
                  <div key={item} className="glass-card rounded-lg px-3 py-2.5 text-center text-xs text-slate-300 font-medium">
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Live dashboard card */}
            <div className="animate-fade-in-up animate-delay-300">
              <div className="glass-card rounded-2xl p-6 lg:p-8 animate-pulse-glow">
                {/* Header */}
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-medium text-slate-300">System posture</span>
                  <span className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 dot-pulse" />
                    All systems healthy
                  </span>
                </div>

                {/* Pipeline stages */}
                <div className="space-y-2.5">
                  {["Ingestion", "Chunking", "Embeddings", "Graph Extract", "Search", "Answering"].map((stage, i) => (
                    <div key={stage} className="flex items-center gap-3 rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-all duration-300 hover:bg-white/[0.04] hover:border-white/[0.08]">
                      <div className={`h-2.5 w-2.5 rounded-full ${i % 2 === 0 ? "bg-emerald-400 dot-pulse" : "bg-slate-500"}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{stage}</p>
                        <p className="text-xs text-slate-500">{i % 2 === 0 ? "Active" : "Standby"}</p>
                      </div>
                      <span className={`text-xs font-semibold ${i % 2 === 0 ? "text-emerald-400" : "text-slate-500"}`}>
                        {i % 2 === 0 ? "OK" : "IDLE"}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Stats */}
                <div className="mt-5 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-slate-500 mb-1">Latency p95</p>
                    <p className="text-xl font-bold gradient-text">412ms</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3">
                    <p className="text-xs text-slate-500 mb-1">Guardrail pass</p>
                    <p className="text-xl font-bold text-emerald-400">99.2%</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Social proof bar ── */}
        <section className="mx-auto max-w-7xl px-6 pb-16">
          <div className="glass-card rounded-2xl px-8 py-5 flex flex-wrap items-center justify-center gap-6 text-sm animate-fade-in-up animate-delay-400">
            <span className="uppercase tracking-[0.2em] text-xs text-slate-500 font-medium">Built for teams who care about</span>
            {["Compliance", "Latency", "Traceability", "LLM Safety"].map((w) => (
              <span key={w} className="font-semibold text-white/90">{w}</span>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            FEATURES SECTION
           ════════════════════════════════════════════════ */}
        <section id="features" className="mx-auto max-w-7xl px-6 pb-28">
          <div className="text-center mb-16 animate-fade-in-up">
            <p className="text-sm uppercase tracking-[0.25em] text-indigo-300/70 font-medium mb-4">Capabilities</p>
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-5">
              Everything you need.{" "}
              <span className="gradient-text">Nothing you don&apos;t.</span>
            </h2>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto font-light">
              A complete graph-augmented retrieval stack — from document ingestion to cited answers, with enterprise security at every layer.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, idx) => (
              <div
                key={f.title}
                className={`glass-card rounded-2xl p-7 group animate-fade-in-up animate-delay-${(idx + 1) * 100}`}
              >
                <div className={`mb-5 h-12 w-12 rounded-xl bg-gradient-to-br ${f.gradient} flex items-center justify-center text-white shadow-lg transition-transform duration-300 group-hover:scale-110`}>
                  {f.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            PIPELINE SECTION
           ════════════════════════════════════════════════ */}
        <section id="pipeline" className="mx-auto max-w-7xl px-6 pb-28">
          <div className="glass-card rounded-3xl p-8 md:p-12 animate-fade-in-up">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-indigo-300/70 font-medium mb-3">Pipeline</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
                  From upload to answer.{" "}
                  <span className="gradient-text">Fully audited.</span>
                </h2>
                <p className="text-slate-400 mt-3 max-w-2xl font-light">
                  Every stage emits structured events with full provenance — so you always know exactly why an answer was produced.
                </p>
              </div>
              <Link href="/login" className="btn-secondary text-sm whitespace-nowrap inline-flex items-center gap-2">
                Try it now
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
            </div>

            {/* Pipeline steps */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {pipeline.map((p, idx) => (
                <div key={p.step} className="group relative">
                  <div className="rounded-2xl border border-white/[0.04] bg-white/[0.02] p-5 text-center transition-all duration-300 hover:bg-white/[0.05] hover:border-indigo-500/20 hover:shadow-lg hover:shadow-indigo-500/5">
                    <div className="text-xs font-bold text-indigo-400/60 mb-2">{p.num}</div>
                    <div className="mx-auto mb-3 h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 border border-indigo-500/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                      <div className="h-2.5 w-2.5 rounded-full bg-indigo-400 dot-pulse" />
                    </div>
                    <p className="text-sm font-semibold text-white">{p.step}</p>
                    <p className="text-xs text-slate-500 mt-1">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Stats row */}
            <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="rounded-xl border border-white/[0.04] bg-white/[0.02] px-5 py-4 text-center">
                  <p className="text-xs text-slate-500 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold gradient-text">{s.value}</p>
                  <p className="text-xs text-slate-600 mt-1">{s.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            SECURITY SECTION
           ════════════════════════════════════════════════ */}
        <section id="security" className="mx-auto max-w-7xl px-6 pb-28">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left: Copy */}
            <div className="space-y-6 animate-fade-in-up">
              <div>
                <p className="text-sm uppercase tracking-[0.25em] text-indigo-300/70 font-medium mb-3">Security</p>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
                  Zero-trust by default.{" "}
                  <span className="gradient-text">Not an afterthought.</span>
                </h2>
                <p className="text-slate-400 max-w-xl font-light leading-relaxed">
                  Every access attempt is validated against user identity, role membership, and document classification — all before the LLM sees a single token.
                </p>
              </div>

              <ul className="space-y-4">
                {[
                  { title: "Pre-LLM Access Control", desc: "RBAC and sensitivity filtering runs before context reaches the model." },
                  { title: "Complete Audit Trail", desc: "Every query, mutation, and access attempt is permanently logged." },
                  { title: "Data Classification", desc: "Four-tier system: Public, Internal, Confidential, Restricted." },
                  { title: "Self-hosted", desc: "Keep everything inside your infrastructure. No data leaves your perimeter." },
                ].map((item) => (
                  <li key={item.title} className="flex items-start gap-3">
                    <span className="mt-1.5 h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-sm text-slate-400">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: Audit log card */}
            <div className="animate-fade-in-up animate-delay-200">
              <div className="glass-card rounded-2xl p-6 animate-pulse-glow">
                <div className="flex items-center justify-between text-xs mb-5">
                  <span className="text-slate-400 font-medium">Access log</span>
                  <span className="text-slate-500">Last 24 hours</span>
                </div>
                <div className="space-y-2">
                  {auditRows.map((row) => (
                    <div
                      key={row.user + row.action}
                      className="flex items-center justify-between rounded-xl border border-white/[0.04] bg-white/[0.02] px-4 py-3 transition-all duration-300 hover:bg-white/[0.04]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xs font-bold text-white/60">
                          {row.user.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{row.user}</p>
                          <p className="text-xs text-slate-500">{row.action}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${row.bg} ${row.color}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ════════════════════════════════════════════════
            CTA SECTION
           ════════════════════════════════════════════════ */}
        <section className="mx-auto max-w-7xl px-6 pb-28">
          <div className="relative rounded-3xl overflow-hidden animate-fade-in-up">
            {/* Gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/30 via-purple-600/20 to-cyan-600/20" />
            <div className="absolute inset-0 bg-[#0a0e1a]/60" />
            {/* Animated border glow */}
            <div className="absolute inset-0 rounded-3xl border border-indigo-500/20" />

            <div className="relative px-8 py-16 md:px-16 md:py-20">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
                <div className="space-y-4 max-w-xl">
                  <p className="text-sm uppercase tracking-[0.25em] text-indigo-300/80 font-medium">Get started</p>
                  <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                    Spin up your workspace today.
                  </h2>
                  <p className="text-slate-300/80 font-light leading-relaxed">
                    Upload a document, watch the pipeline run, and ask your first question in minutes. Enterprise security from day one.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link
                    href="/login"
                    className="btn-primary text-sm inline-flex items-center justify-center gap-2"
                  >
                    Create account
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                  </Link>
                  <Link
                    href="/login"
                    className="btn-secondary text-sm inline-flex items-center justify-center gap-2"
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-white/[0.04]">
        <div className="mx-auto max-w-7xl px-6 py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-400 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <circle cx="19" cy="5" r="2"/>
                  <circle cx="5" cy="19" r="2"/>
                  <line x1="14.5" y1="10" x2="17.5" y2="6.5"/>
                  <line x1="9.5" y1="14" x2="6.5" y2="17.5"/>
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white">GraphRAG</p>
                <p className="text-xs text-slate-500">Enterprise document intelligence</p>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-500">
              <Link href="/login" className="hover:text-white transition-colors duration-200">Sign in</Link>
              <Link href="#features" className="hover:text-white transition-colors duration-200">Features</Link>
              <Link href="#pipeline" className="hover:text-white transition-colors duration-200">Pipeline</Link>
              <Link href="#security" className="hover:text-white transition-colors duration-200">Security</Link>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.04] text-xs text-slate-600">
            © {new Date().getFullYear()} GraphRAG. Built for secure, graph-powered document intelligence.
          </div>
        </div>
      </footer>
    </div>
  );
}
