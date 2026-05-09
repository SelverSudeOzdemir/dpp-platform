import { CheckCircle2 } from 'lucide-react';
import { MAIN_STEPS } from '../../constants/batchConstants';

export function MainStepper({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {MAIN_STEPS.map((label, i) => (
        <div key={i} className="flex items-center">
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black transition-all
              ${i < current ? 'bg-blue-600 text-white' : i === current ? 'bg-blue-600 text-white ring-4 ring-blue-100' : 'bg-gray-100 text-gray-400'}`}>
              {i < current ? <CheckCircle2 size={18} /> : i + 1}
            </div>
            <span className={`text-[11px] font-bold mt-1.5 whitespace-nowrap ${i === current ? 'text-blue-600' : 'text-gray-400'}`}>{label}</span>
          </div>
          {i < MAIN_STEPS.length - 1 && (
            <div className={`w-16 h-0.5 mb-5 mx-1 ${i < current ? 'bg-blue-600' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
