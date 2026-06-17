import React from 'react';

// Base Skeleton Box
export const SkeletonBox = ({ className = '', width = 'w-full', height = 'h-4', rounded = 'rounded' }) => {
  return (
    <div className={`bg-slate-200 animate-pulse ${width} ${height} ${rounded} ${className}`} />
  );
};

// Skeleton Text Lines
export const SkeletonText = ({ lines = 3, className = '', height = 'h-3', gap = 'space-y-2' }) => {
  const widths = ['w-full', 'w-11/12', 'w-3/4', 'w-5/6', 'w-2/3'];
  return (
    <div className={`${gap} ${className}`}>
      {Array.from({ length: lines }).map((_, idx) => (
        <SkeletonBox
          key={idx}
          height={height}
          width={widths[idx % widths.length]}
        />
      ))}
    </div>
  );
};

// Card Skeleton (for client/project card grids)
export const SkeletonCard = ({ className = '' }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-[2rem] p-6 flex flex-col justify-between min-h-[220px] relative overflow-hidden ${className}`}>
      <div className="flex items-start gap-4">
        {/* Logo/Avatar placeholder */}
        <SkeletonBox width="w-14" height="h-14" rounded="rounded-2xl" />
        
        {/* Title and details placeholder */}
        <div className="flex-1 space-y-2 mt-1">
          <SkeletonBox width="w-32" height="h-5" rounded="rounded-md" />
          <SkeletonBox width="w-24" height="h-3" rounded="rounded-md" />
        </div>
      </div>
      
      {/* Footer details */}
      <div className="mt-6 space-y-3">
        <SkeletonBox width="w-48" height="h-3" rounded="rounded-md" />
        <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-2">
          <SkeletonBox width="w-16" height="h-3" rounded="rounded-md" />
          <SkeletonBox width="w-20" height="h-6" rounded="rounded-full" />
        </div>
      </div>
    </div>
  );
};

// Table Row Skeleton
export const SkeletonTableRow = ({ columns = 5, className = '' }) => {
  return (
    <tr className={`border-b border-slate-100 ${className}`}>
      {Array.from({ length: columns }).map((_, idx) => {
        // Varying widths for cells to look natural
        let cellWidth = 'w-16';
        if (idx === 0) cellWidth = 'w-10';
        else if (idx === 1) cellWidth = 'w-48';
        else if (idx === columns - 1) cellWidth = 'w-24';
        
        return (
          <td key={idx} className="p-4">
            <SkeletonBox width={cellWidth} height="h-4" />
          </td>
        );
      })}
    </tr>
  );
};

// Profile Card Skeleton
export const SkeletonProfileCard = ({ className = '' }) => {
  return (
    <div className={`bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm flex flex-col items-center text-center ${className}`}>
      <SkeletonBox width="w-24" height="h-24" rounded="rounded-full" className="mb-4" />
      <SkeletonBox width="w-40" height="h-6" rounded="rounded-md" className="mb-2" />
      <SkeletonBox width="w-28" height="h-4" rounded="rounded-md" className="mb-6" />
      
      <div className="w-full space-y-3 border-t border-slate-100 pt-6">
        <div className="flex justify-between">
          <SkeletonBox width="w-20" height="h-4" />
          <SkeletonBox width="w-28" height="h-4" />
        </div>
        <div className="flex justify-between">
          <SkeletonBox width="w-20" height="h-4" />
          <SkeletonBox width="w-36" height="h-4" />
        </div>
      </div>
    </div>
  );
};

// Calendar Grid Skeleton
export const SkeletonCalendar = ({ className = '' }) => {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center bg-white p-4 border border-slate-200 rounded-2xl">
        <SkeletonBox width="w-40" height="h-6" />
        <div className="flex gap-2">
          <SkeletonBox width="w-8" height="h-8" rounded="rounded-full" />
          <SkeletonBox width="w-8" height="h-8" rounded="rounded-full" />
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2">
        {/* Days of week header */}
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="p-2 text-center">
            <SkeletonBox width="w-8" height="h-3" className="mx-auto" />
          </div>
        ))}
        {/* Calendar days */}
        {Array.from({ length: 35 }).map((_, idx) => (
          <div key={idx} className="bg-white border border-slate-100 rounded-xl p-3 min-h-[90px] flex flex-col justify-between">
            <SkeletonBox width="w-5" height="h-4" />
            <SkeletonBox width="w-full" height="h-6" rounded="rounded-md" className="mt-2 opacity-60" />
          </div>
        ))}
      </div>
    </div>
  );
};

// List Item Skeleton
export const SkeletonListItem = ({ className = '' }) => {
  return (
    <div className={`bg-white border border-slate-150 rounded-xl p-4 flex items-center justify-between gap-4 ${className}`}>
      <div className="flex items-center gap-3">
        <SkeletonBox width="w-10" height="h-10" rounded="rounded-full" />
        <div className="space-y-1">
          <SkeletonBox width="w-32" height="h-4" />
          <SkeletonBox width="w-24" height="h-3" />
        </div>
      </div>
      <SkeletonBox width="w-16" height="h-6" rounded="rounded-full" />
    </div>
  );
};

// Page/Content detail Skeleton (multi-card / details page skeleton layout)
export const PageSkeleton = ({ className = '' }) => {
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Title section skeleton */}
      <div className="flex justify-between items-end pb-4 border-b border-slate-200">
        <div className="space-y-2">
          <SkeletonBox width="w-48" height="h-8" />
          <SkeletonBox width="w-64" height="h-4" />
        </div>
        <SkeletonBox width="w-24" height="h-10" rounded="rounded-xl" />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main large content skeleton */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <SkeletonBox width="w-32" height="h-6" />
            <SkeletonText lines={4} />
          </div>
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <SkeletonBox width="w-40" height="h-6" />
            <div className="space-y-2">
              <SkeletonBox width="w-full" height="h-12" rounded="rounded-xl" />
              <SkeletonBox width="w-full" height="h-12" rounded="rounded-xl" />
              <SkeletonBox width="w-full" height="h-12" rounded="rounded-xl" />
            </div>
          </div>
        </div>
        
        {/* Sidebar panels skeleton */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <SkeletonBox width="w-28" height="h-5" />
            <div className="flex gap-2 items-center">
              <SkeletonBox width="w-10" height="h-10" rounded="rounded-full" />
              <div className="space-y-1 flex-1">
                <SkeletonBox width="w-24" height="h-4" />
                <SkeletonBox width="w-32" height="h-3" />
              </div>
            </div>
          </div>
          
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4">
            <SkeletonBox width="w-36" height="h-5" />
            <SkeletonText lines={3} />
          </div>
        </div>
      </div>
    </div>
  );
};
