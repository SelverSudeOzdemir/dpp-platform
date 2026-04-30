    import React from 'react';

interface SkeletonProps {
  className?: string; // Genişlik ve yüksekliği dışarıdan verebilmek için
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return (
    // animate-pulse: o meşhur yanıp sönme efekti
    <div className={`animate-pulse bg-gray-200 rounded-md ${className}`}></div>
  );
};

export default Skeleton;