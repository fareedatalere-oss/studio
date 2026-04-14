
'use client';

import type { SVGProps } from "react";
import Image from "next/image";
import { useUser } from "@/hooks/use-user";
import { Skeleton } from "./ui/skeleton";

/**
 * @fileOverview I-Pay Master Logo Component.
 * SYNCED: Uses Admin defined logo from database globally.
 */

export function IPayLogo(props: SVGProps<SVGSVGElement>) {
  const { config, loading } = useUser();

  if (loading) {
    return <Skeleton className="h-10 w-10 rounded-xl" {...props} />;
  }

  if (config?.logoUrl) {
    const width = props.width || 40;
    const height = props.height || 40;
    return (
      <Image
        src={config.logoUrl}
        alt="I-Pay Logo"
        width={Number(width)}
        height={Number(height)}
        className={props.className?.toString() || "rounded-xl shadow-md object-contain bg-white p-1"}
        unoptimized 
      />
    );
  }

  // Visual implementation matching the branding image
  return (
    <div 
        className={props.className?.toString() || "h-12 w-12 rounded-2xl flex items-center justify-center text-white font-bold relative overflow-hidden shadow-2xl"}
        style={{ 
            width: props.width, 
            height: props.height,
            background: 'linear-gradient(45deg, #facc15, #22c55e, #3b82f6, #a855f7, #ec4899)',
            padding: '3px'
        }}
    >
        <div className="bg-[#001f3f] w-full h-full rounded-[11px] flex items-center justify-center flex-col leading-[0.8] p-1">
            <span className="text-[12px] font-black tracking-tight">I-pay</span>
            <span className="text-[4px] uppercase opacity-80 font-bold mt-1 text-center leading-tight">new world<br/>of online</span>
        </div>
    </div>
  );
}
