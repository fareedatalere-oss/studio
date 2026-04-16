'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * @fileOverview Sofia AI Chat - Terminated Route.
 * FORCE: Redirects to dashboard instantly if accessed.
 */

export default function AiChatPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);

  return null;
}
