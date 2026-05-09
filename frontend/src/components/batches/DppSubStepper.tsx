import { DPP_SUBSTEPS } from '../../constants/batchConstants';

export function DppSubStepper({ current, onGoTo }: { current: number; onGoTo: (i: number) => void }) {
  return (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {DPP_SUBSTEPS.map((s, i) => {
        const Icon = s.icon;
        return (
          <button key={i} type="button" onClick={() => onGoTo(i)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer
              ${i === current ? 'bg-[#e30613] text-white shadow-sm' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'}`}>
            <Icon size={12} />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
