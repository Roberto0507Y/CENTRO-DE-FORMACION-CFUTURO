import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { Hero } from "../../components/landing/Hero";
import { lazyNamed } from "../../utils/lazyNamed";
import "../../styles/public-sections.css";

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
  variant,
}: {
  variant: "about" | "featured" | "why" | "testimonials";
}) {
  return (
    <div className={`cf-public-placeholder cf-public-placeholder--${variant}`}>
      <div className="cf-public-placeholder-chip" />
      <div className="cf-public-placeholder-title" />
      <div className="cf-public-placeholder-line cf-public-placeholder-line--full" />
      <div className="cf-public-placeholder-line cf-public-placeholder-line--wide" />
      <div className="cf-public-placeholder-grid">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="cf-public-placeholder-card" />
        ))}
      </div>
    </div>
  );
}

function DeferredSection({
  children,
  variant,
}: {
  children: ReactNode;
  variant: "about" | "featured" | "why" | "testimonials";
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
    <div ref={ref} className="cf-public-deferred">
      {shouldRender ? (
        <Suspense fallback={<SectionPlaceholder variant={variant} />}>
          {children}
        </Suspense>
      ) : (
        <SectionPlaceholder variant={variant} />
      )}
    </div>
  );
}

export function HomePage() {
  return (
    <div className="space-y-16">
      <Hero />

      <DeferredSection variant="about">
        <AboutSection />
      </DeferredSection>

      <DeferredSection variant="featured">
        <FeaturedCoursesSection />
      </DeferredSection>

      <DeferredSection variant="why">
        <WhyChoose />
      </DeferredSection>

      <DeferredSection variant="testimonials">
        <TestimonialsSection />
      </DeferredSection>
    </div>
  );
}
