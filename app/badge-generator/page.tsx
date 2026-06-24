import type { Metadata } from 'next';
import Generator from '../components/Generator';

export const metadata: Metadata = {
  title: 'Badge Generator | CommitPulse',
  description: 'Generate your GitHub contribution badge.',
};

export default function BadgeGeneratorPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <main className="max-w-[1440px] mx-auto pt-24 pb-12">
        <h1 className="text-4xl font-bold text-center mb-8">Badge Generator</h1>
        <Generator />
      </main>
    </div>
  );
}
