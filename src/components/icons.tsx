'use client';

import type { SVGProps } from "react";
import Image from "next/image";
import { useUser } from "@/hooks/use-appwrite";
import { Skeleton } from "./ui/skeleton";

/**
 * @fileOverview I-Pay Master Logo Component.
 * Optimized to prioritize the new colorful logo from Appwrite or a high-quality fallback.
 */

export function IPayLogo(props: SVGProps<SVGSVGElement>) {
  const { config, loading } = useUser();

  if (loading) {
    return <Skeleton className="h-8 w-8 rounded-md" {...props} />;
  }

  // Priority 1: Use Logo from Appwrite Config (Master Fahad's online logo)
  if (config?.logoUrl) {
    const width = props.width || 32;
    const height = props.height || 32;
    return (
      <Image
        src={config.logoUrl}
        alt="I-Pay Logo"
        width={Number(width)}
        height={Number(height)}
        className={props.className?.toString() || "rounded-lg shadow-sm"}
        unoptimized 
      />
    );
  }

  // Priority 2: Fallback to a high-quality placeholder representing the new logo
  return (
    <div 
        className={props.className?.toString() || "h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold relative overflow-hidden"}
        style={{ 
            width: props.width, 
            height: props.height,
            background: 'linear-gradient(45deg, #f06, #4a90e2, #9b59b6, #f1c40f)',
            padding: '2px'
        }}
    >
        <div className="bg-[#001f3f] w-full h-full rounded-[9px] flex items-center justify-center flex-col leading-none">
            <span className="text-[10px] font-black tracking-tighter">I-pay</span>
            <span className="text-[4px] uppercase opacity-70">online</span>
        </div>
    </div>
  );
}
