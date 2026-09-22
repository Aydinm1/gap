'use client';

import { useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';

export function SignInButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" className="w-full py-3" disabled={pending} aria-busy={pending}>
      <span aria-live="polite">{pending ? 'Connecting…' : 'Continue with Google'}</span>
    </Button>
  );
}
