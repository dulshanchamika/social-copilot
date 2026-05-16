"use client";

import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Which social media platforms do you support?",
    answer: "We support Instagram, YouTube, TikTok, Facebook, LinkedIn, Pinterest, Discord, X, and Slack. More platforms are being added regularly.",
  },
  {
    question: "How does the AI auto-reply feature work?",
    answer: "Our AI analyzes the context of incoming comments and generates relevant, human-like responses based on your brand voice. You can set rules for when and how the AI should respond.",
  },
  {
    question: "Is there a free trial for the Pro plan?",
    answer: "Yes! You can try all our Pro features for free for 14 days. No credit card is required to start your trial.",
  },
  {
    question: "Can I manage multiple businesses from one account?",
    answer: "Absolutely. Our Business plan is designed for agencies and teams managing multiple brands. You can organize social accounts into 'Workspaces' for easy management.",
  },
  {
    question: "How secure is my social media data?",
    answer: "Security is our top priority. We use OAuth for platform connections, meaning we never see your passwords. All data is encrypted, and we use Clerk for secure authentication.",
  },
  {
    question: "What kind of analytics do you provide?",
    answer: "We provide detailed metrics on post performance, audience demographics, optimal posting times, and engagement rates. Business users also get exportable PDF reports.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 bg-muted/20">
      <div className="container mx-auto max-w-3xl px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked <span className="text-primary">Questions</span>
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Everything you need to know about Social Copilot.
          </p>
        </div>
        
        <Accordion className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-muted/50">
              <AccordionTrigger className="text-left hover:text-primary transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
