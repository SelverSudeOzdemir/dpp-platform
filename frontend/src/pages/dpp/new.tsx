import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function DppNewRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/batches/new');
  }, [router]);
  return null;
}
