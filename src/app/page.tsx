'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/login'); // 🔹 reindirizza alla pagina login
  }, [router]);

  return null;
}
