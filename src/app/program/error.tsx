"use client";

import { Button } from "@/components/ui/button";
import { PageContainer } from "@/components/ui/container";
import { StateMessage } from "@/components/ui/state-message";

export default function ProgramError({ reset }: { reset: () => void }) {
  return (
    <main>
      <PageContainer className="py-12 sm:py-16">
        <StateMessage
          title="We could not load your program"
          tone="error"
          action={<Button onClick={reset}>Try again</Button>}
        >
          Check your connection and retry. Your work has not been changed.
        </StateMessage>
      </PageContainer>
    </main>
  );
}
