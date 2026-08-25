"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

// Shared renderer for journal thesis/risk-plan/outcome text: GitHub-flavored
// markdown (tables, strikethrough, task lists) plus math via $$...$$ LaTeX
// (remark-math -> rehype-katex). Used both for read-only view mode and as
// the live-preview renderer inside the @uiw/react-md-editor instances in
// edit mode, so what you see while writing matches what renders afterward.
//
// singleDollarTextMath: false is deliberate -- this content is financial
// writing full of single "$" currency amounts ("$62,800"). remark-math's
// default single-$ inline-math trigger reads everything between two
// unrelated dollar amounts as one math expression (a real bug we hit:
// "$62,800 -> a fresh high near $81,000" rendered as garbled italic math).
// Disabling it makes single "$" always literal text; math requires "$$"
// (both inline and block), the standard fix for this exact ambiguity.
const REMARK_MATH_OPTIONS = { singleDollarTextMath: false };

export function JournalMarkdown({ children }: { children: string }) {
    return (
        <div className="journal-markdown prose prose-sm max-w-none text-gray-800">
            <ReactMarkdown
                remarkPlugins={[remarkGfm, [remarkMath, REMARK_MATH_OPTIONS]]}
                rehypePlugins={[rehypeKatex]}
            >
                {children}
            </ReactMarkdown>
        </div>
    );
}
