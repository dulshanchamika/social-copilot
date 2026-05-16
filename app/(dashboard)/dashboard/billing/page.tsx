import React from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { CreditCard } from "lucide-react";

export default function BillingPage() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Billing & Plans</h2>
        <p className="text-muted-foreground">
          Manage your subscription, payment methods, and invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Plan</CardTitle>
          <CardDescription>
            You are currently on the Free plan. Upgrade to unlock more features.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-[450px] shrink-0 items-center justify-center rounded-md border border-dashed">
            <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
              <CreditCard className="size-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-semibold">Billing System Coming Soon</h3>
              <p className="mb-4 mt-2 text-sm text-muted-foreground">
                The billing and subscription management system is currently under development.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
