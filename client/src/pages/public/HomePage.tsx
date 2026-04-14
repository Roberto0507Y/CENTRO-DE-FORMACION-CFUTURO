import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Hero } from "../../components/landing/Hero";
import { lazyNamed } from "../../utils/lazyNamed";

const AboutSection = lazyNamed(() => import("../../components/landing/AboutSection"), "AboutSection");
const FeaturedCoursesSection = lazyNamed(
  () => import("../../components/landing/FeaturedCoursesSection"),
  "FeaturedCoursesSection",
);
const WhyChoose = lazyNamed(() => import("../../components/landing/WhyChoose"), "WhyChoose");
const TestimonialsSection = lazyNamed(
  () => import("../../components/landing/TestimonialsSection"),
  "TestimonialsSection",
);

function SectionPlaceholder({
  minHeightClassName,
}: {
  minHeightClassName: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-sm shadow-slate-900/5 dark:border-slate-800/80 dark:bg-slate-950/80 ${minHeightClassName}`}
    >
      <div className="h-4 w-32 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="mt-4 h-9 w-3/4 animate-pulse rounded-full bg-slate-200/80 dark:bg-slate-800/80" />
      <div className="mt-3 h-4 w-full animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded-full bg-slate-200/70 dark:bg-slate-800/70" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl bg-slate-100/90 dark:bg-slate-900/80"
          />
        ))}
      </div>
    </div>
  );
}

function DeferredSection({
  children,
  minHeightClassName,
}: {
  children: ReactNode;
  minHeightClassName: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (shouldRender) return;
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setShouldRender(true);
          observer.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldRender]);

  return (
    <div ref={ref} className="[content-visibility:auto]">
      {shouldRender ? (
        <Suspense fallback={<SectionPlaceholder minHeightClassName={minHeightClassName} />}>
          {children}
        </Suspense>
      ) : (
        <SectionPlaceholder minHeightClassName={minHeightClassName} />
      )}
    </div>
  );
}

export function HomePage() {
  return (
    <div className="space-y-16">
      <Hero />

      <DeferredSection minHeightClassName="min-h-[42rem] md:min-h-[34rem]">
        <AboutSection />
      </DeferredSection>

      <DeferredSection minHeightClassName="min-h-[38rem] md:min-h-[30rem]">
        <FeaturedCoursesSection />
      </DeferredSection>

      <DeferredSection minHeightClassName="min-h-[28rem] md:min-h-[22rem]">
        <WhyChoose />
      </DeferredSection>

      <DeferredSection minHeightClassName="min-h-[32rem] md:min-h-[24rem]">
        <TestimonialsSection />
      </DeferredSection>
    </div>
  );
}
