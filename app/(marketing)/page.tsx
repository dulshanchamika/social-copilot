import React from "react";
import { Hero } from "@/components/marketing/hero";
import { PlatformStrip } from "@/components/marketing/platform-strip";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { PricingSection } from "@/components/marketing/pricing";
import { Testimonials } from "@/components/marketing/testimonials";
import { FAQ } from "@/components/marketing/faq";

export default function MarketingPage() {
  return (
    <div className="flex flex-col">
      <Hero />
      <PlatformStrip />
      <FeaturesGrid />
      <PricingSection />
      <Testimonials />
      <FAQ />
    </div>
  );
}
