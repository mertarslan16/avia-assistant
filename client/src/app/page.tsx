// src/app/page.tsx
import AIVA from '@/components/AIVA';
import ChatBox from '@/components/ChatBox';

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white p-6">
      <h1 className="text-3xl font-bold mb-4">🧠 AIVA: Yapay Zekalı Asistan</h1>
      <AIVA />
      <ChatBox />
    </main>
  );
}
