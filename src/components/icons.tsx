'use client';

import type { SVGProps } from "react";
import Image from "next/image";
import { useUser } from "@/hooks/use-appwrite";
import { Skeleton } from "./ui/skeleton";

/**
 * @fileOverview I-Pay Master Logo Component.
 * Optimized to prioritize Online Logo from Appwrite to eliminate manual deployment steps.
 */

export function IPayLogo(props: SVGProps<SVGSVGElement>) {
  const { config, loading } = useUser();

  if (loading) {
    return <Skeleton className="h-8 w-8 rounded-md" {...props} />;
  }

  // Priority 1: Use Logo from Appwrite Config (Master Fahad's online logo)
  if (config?.logoUrl) {
    const width = props.width || 24;
    const height = props.height || 24;
    return (
      <Image
        src={config.logoUrl}
        alt="I-Pay Logo"
        width={Number(width)}
        height={Number(height)}
        className={props.className?.toString()}
        unoptimized // Allow external URLs without configuration issues
      />
    );
  }

  // Priority 2: Fallback to a professional placeholder to prevent build errors
  return (
    <div 
        className={props.className?.toString() || "h-8 w-8 bg-primary rounded-md flex items-center justify-center text-white font-bold text-[10px]"}
        style={{ width: props.width, height: props.height }}
    >
        IP
    </div>
  );
}
