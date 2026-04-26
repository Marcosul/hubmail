import { getAllPosts } from "@/lib/blog";
import { FaqSection } from "@/components/home/faq-section";
import { HomeBlogSection } from "@/components/home/home-blog-section";
import { HomeCtaSection } from "@/components/home/home-cta-section";
import { HomeProductTabsSection } from "@/components/home/home-product-tabs-section";
import { HomeFooter } from "@/components/home/home-footer";
import { HomeHeader } from "@/components/home/home-header";
import { HomeHero } from "@/components/home/home-hero";
import { HomePricingSection } from "@/components/home/home-pricing-section";
import { UseCasesSection } from "@/components/home/use-cases-section";

export default async function HomePage() {
  const blogPosts = getAllPosts();

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      <HomeHeader />

      <main>
        <HomeHero />
        <HomeBlogSection posts={blogPosts} />
        <HomeProductTabsSection />
        <UseCasesSection />
        <HomePricingSection />
        <FaqSection />
        <HomeCtaSection />
      </main>

      <HomeFooter />
    </div>
  );
}
