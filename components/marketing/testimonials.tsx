"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Quote } from "lucide-react";

const testimonials = [
  {
    name: "Alex Rivera",
    role: "Digital Marketer",
    quote: "Social Copilot has saved me at least 10 hours a week. The AI auto-replies are a game-changer for engagement.",
    avatar: "https://i.pravatar.cc/150?u=alex",
    initials: "AR",
  },
  {
    name: "Sarah Chen",
    role: "Content Creator",
    quote: "The interface is so clean and intuitive. I can manage all my platforms without feeling overwhelmed.",
    avatar: "https://i.pravatar.cc/150?u=sarah",
    initials: "SC",
  },
  {
    name: "Marcus Thorne",
    role: "E-commerce Owner",
    quote: "The analytics provided insights I never had before. Our conversion rate from social has tripled since we started.",
    avatar: "https://i.pravatar.cc/150?u=marcus",
    initials: "MT",
  },
];

export function Testimonials() {
  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Trusted by <span className="text-primary">thousands</span> of creators
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Don&apos;t just take our word for it. Here&apos;s what our community has to say.
          </p>
        </div>
        
        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial) => (
            <Card key={testimonial.name} className="bg-muted/10 border-muted/50">
              <CardHeader className="relative pb-0">
                <Quote className="absolute right-6 top-6 h-12 w-12 text-primary/10" />
                <div className="flex items-center gap-4">
                  <Avatar className="h-12 w-12 border-2 border-primary/20">
                    <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                    <AvatarFallback>{testimonial.initials}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h4 className="font-bold">{testimonial.name}</h4>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="italic text-muted-foreground">&ldquo;{testimonial.quote}&rdquo;</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
