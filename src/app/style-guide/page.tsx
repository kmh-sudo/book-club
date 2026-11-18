import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Search, Sparkles } from "lucide-react";

export const metadata = {
  title: "Style Guide — BookClub",
  description:
    "The BookClub design system: palette, typography scale and core components derived from the brand mark.",
};

const palette = [
  { name: "Deep Teal", hex: "#263B3F", role: "Primary text & CTAs", className: "bg-teal" },
  { name: "Cream", hex: "#F6EFE3", role: "Page canvas", className: "bg-canvas" },
  { name: "Parchment", hex: "#FCF7EE", role: "Cards & panels", className: "bg-card" },
  { name: "Sand", hex: "#EEDCC4", role: "Secondary surfaces", className: "bg-sand" },
  { name: "Gold", hex: "#D4A373", role: "Accent & progress", className: "bg-gold" },
  { name: "Bronze", hex: "#8A5A2E", role: "Accent text & links", className: "bg-gold-ink" },
  { name: "Sage", hex: "#4F6B52", role: "Completed states", className: "bg-sage" },
];

export default function StyleGuidePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 md:py-14 space-y-12">
      {/* Header */}
      <header className="space-y-4">
        <p className="type-label text-gold-ink">Brand Style Tile</p>
        <h1 className="type-display max-w-2xl text-ink">
          A calmer place to <em className="italic text-gold-ink">read together.</em>
        </h1>
        <p className="type-body text-muted-ink max-w-xl">
          The visual system is drawn from the BookClub mark: deep teal for focus,
          warm cream and sand for comfort, and a soft gold for moments of
          progress. Rounded shapes echo the circular emblem.
        </p>
      </header>

      {/* Palette */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 className="type-h2 text-ink">Color</h2>
          <span className="type-label text-muted-ink">Logo-derived palette</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {palette.map((c) => (
            <div
              key={c.hex}
              className="rounded-2xl border border-line bg-card overflow-hidden"
            >
              <div className={`h-20 ${c.className}`} />
              <div className="p-3 space-y-0.5">
                <p className="text-xs font-semibold text-ink">{c.name}</p>
                <p className="font-mono text-[10px] uppercase text-muted-ink">{c.hex}</p>
                <p className="text-[11px] text-muted-ink/80">{c.role}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="type-small text-muted-ink max-w-2xl">
          Text never uses pure black and cards never use pure white. Teal on cream
          clears WCAG AA for body copy; gold is reserved for fills, dividers and
          progress where it is paired with dark text.
        </p>
      </section>

      {/* Typography */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 className="type-h2 text-ink">Typography</h2>
          <span className="type-label text-muted-ink">Fraunces · Inter</span>
        </div>
        <Card className="p-6 sm:p-8 space-y-6">
          <div className="grid gap-5 sm:grid-cols-[180px_1fr] sm:items-baseline">
            <div>
              <p className="type-label text-muted-ink">Display / 56</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Fraunces 600 · 1.05
              </p>
            </div>
            <p className="type-display text-ink">Read together.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-baseline border-t border-line pt-5">
            <div>
              <p className="type-label text-muted-ink">Heading 1 / 40</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Fraunces 600 · 1.12
              </p>
            </div>
            <p className="type-h1 text-ink">Chapter by chapter</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-baseline border-t border-line pt-5">
            <div>
              <p className="type-label text-muted-ink">Heading 2 / 28</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Fraunces 600 · 1.25
              </p>
            </div>
            <p className="type-h2 text-ink">Reading sessions</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-baseline border-t border-line pt-5">
            <div>
              <p className="type-label text-muted-ink">Heading 3 / 20</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Fraunces 600 · 1.4
              </p>
            </div>
            <p className="type-h3 text-ink">Track every chapter</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-baseline border-t border-line pt-5">
            <div>
              <p className="type-label text-muted-ink">Body / 16</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Inter 400 · 1.65
              </p>
            </div>
            <p className="type-body text-ink max-w-xl">
              Create or join a reading session, sync your progress with friends,
              and talk about each chapter as you go.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-baseline border-t border-line pt-5">
            <div>
              <p className="type-label text-muted-ink">Small / 13</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Inter 400 · 1.6
              </p>
            </div>
            <p className="type-small text-muted-ink">
              Supporting copy, metadata and helper text.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_1fr] sm:items-baseline border-t border-line pt-5">
            <div>
              <p className="type-label text-muted-ink">Label / 11</p>
              <p className="text-[11px] font-mono text-muted-ink/70 mt-1">
                Inter 600 · 0.14em
              </p>
            </div>
            <p className="type-label text-gold-ink">Currently reading</p>
          </div>
        </Card>
      </section>

      {/* Buttons & fields */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 className="type-h2 text-ink">Actions & inputs</h2>
          <span className="type-label text-muted-ink">Components</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          <Card className="p-6 sm:p-7 space-y-5">
            <div>
              <p className="type-label text-muted-ink mb-3">Buttons</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button>
                  <Sparkles className="w-4 h-4" />
                  Join a circle
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
              </div>
            </div>
            <div className="pt-4 border-t border-line">
              <p className="type-label text-muted-ink mb-3">Sizes</p>
              <div className="flex flex-wrap items-center gap-2.5">
                <Button size="sm">Small</Button>
                <Button>Default</Button>
                <Button size="lg">Large</Button>
              </div>
            </div>
            <div className="pt-4 border-t border-line space-y-2.5">
              <p className="type-label text-muted-ink">Badges</p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge>Active</Badge>
                <Badge variant="secondary">Chapter 4</Badge>
                <Badge variant="success">Completed</Badge>
                <Badge variant="outline">Host</Badge>
              </div>
            </div>
            <div className="pt-4 border-t border-line space-y-2.5">
              <div className="flex justify-between type-label text-muted-ink">
                <span>Reading progress</span>
                <span className="text-ink">Chapter 12 / 20</span>
              </div>
              <Progress value={62} />
            </div>
          </Card>

          <Card className="p-6 sm:p-7 space-y-4">
            <p className="type-label text-muted-ink">Form fields</p>
            <div>
              <label className="block type-label text-muted-ink mb-1.5">
                Email address
              </label>
              <Input type="email" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block type-label text-muted-ink mb-1.5">
                Search
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-muted-ink absolute left-3.5 top-1/2 -translate-y-1/2" />
                <Input placeholder="Search title, author…" className="pl-10" />
              </div>
            </div>
            <div>
              <label className="block type-label text-muted-ink mb-1.5">
                Focus state
              </label>
              <Input
                defaultValue="Focused with a gold ring"
                className="border-gold ring-2 ring-gold/30"
              />
            </div>
            <div>
              <label className="block type-label text-muted-ink mb-1.5">
                Note to the circle
              </label>
              <Textarea
                rows={3}
                placeholder="Share a thought…"
                className="resize-none"
              />
            </div>
          </Card>
        </div>
      </section>

      {/* Card anatomy */}
      <section className="space-y-5">
        <div className="flex items-baseline justify-between gap-4 border-b border-line pb-3">
          <h2 className="type-h2 text-ink">Card anatomy</h2>
          <span className="type-label text-muted-ink">Radius 24 · warm border</span>
        </div>
        <Card className="p-5 max-w-md">
          <div className="flex items-start gap-4">
            <div className="w-14 h-20 rounded-lg bg-linear-to-br from-cream-deep via-sand to-[#dcc5a4] ring-1 ring-line flex flex-col items-center justify-center text-teal flex-shrink-0">
              <BookOpen className="w-5 h-5 mb-1" />
              <span className="text-[9px] font-bold uppercase">12 Ch</span>
            </div>
            <div className="min-w-0">
              <Badge variant="success" className="type-label text-[9px]">
                Active
              </Badge>
              <h3 className="type-h3 text-[18px] text-ink mt-1.5 line-clamp-1">
                The Midnight Library
              </h3>
              <p className="type-small text-muted-ink">by Matt Haig</p>
              <p className="type-small text-muted-ink/80 mt-2 line-clamp-2">
                A quiet reading circle for late-night chapters and gentle
                discussion.
              </p>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-line/70 flex items-center justify-between">
            <span className="type-small text-muted-ink">4 readers</span>
            <span className="type-small font-semibold text-gold-ink">
              Join circle
            </span>
          </div>
        </Card>
        <p className="type-small text-muted-ink max-w-2xl">
          Cards use parchment on cream, a 1px warm border, a 24px radius and a
          very soft teal-tinted shadow. Hover lifts the card by 2px and warms the
          border to gold instead of changing color drastically.
        </p>
      </section>
    </div>
  );
}
