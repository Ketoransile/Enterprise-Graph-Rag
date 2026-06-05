import Link from "next/link";
import { Network } from "lucide-react";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex items-center gap-3 ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/15 bg-white text-black shadow-[0_16px_40px_rgba(255,255,255,0.08)]">
        <Network className="h-4 w-4" strokeWidth={2.4} />
      </span>
      <span className="text-base font-semibold tracking-tight text-white">
        Enterprise Graph Rag
      </span>
    </Link>
  );
}
