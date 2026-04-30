import React from 'react';

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper: React.FC<StepperProps> = ({ steps = [], currentStep }) => {
  return (
    <div className="flex items-center w-full justify-between mb-8 px-4">
{ (steps || []).map((step, index) => (        <React.Fragment key={index}>
          {/* Adım Dairesi ve Yazısı */}
          <div className="flex flex-col items-center relative z-10">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
              index <= currentStep 
                ? 'bg-blue-600 border-blue-600 text-white' 
                : 'bg-white border-gray-300 text-gray-400'
            }`}>
              {index < currentStep ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="font-bold">{index + 1}</span>
              )}
            </div>
            <span className={`absolute -bottom-7 whitespace-nowrap text-xs font-semibold uppercase tracking-wider ${
              index <= currentStep ? 'text-blue-600' : 'text-gray-400'
            }`}>
              {step}
            </span>
          </div>

          {/* Adımlar Arasındaki Çizgi (Sadece son adımdan önce görünür) */}
          {index < steps.length - 1 && (
            <div className={`flex-1 h-1 mx-4 rounded-full transition-all duration-500 ${
              index < currentStep ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default Stepper;