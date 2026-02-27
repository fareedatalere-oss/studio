'use client';

import type { SVGProps } from "react";
import Image from "next/image";
import { useUser } from "@/hooks/use-appwrite";
import { Skeleton } from "./ui/skeleton";

export function IPayLogo(props: SVGProps<SVGSVGElement>) {
  const { config, loading } = useUser();

  if (loading) {
    return <Skeleton className="h-8 w-8 rounded-md" {...props} />;
  }

  // Priority 1: Use Logo from Appwrite Config
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
      />
    );
  }

  // Priority 2: Use Local logo.png if it exists in public folder
  const width = props.width || 24;
  const height = props.height || 24;
  return (
    <Image
      src="/logo.png"
      alt="I-Pay Logo"
      width={Number(width)}
      height={Number(height)}
      className={props.className?.toString()}
      onError={(e) => {
          // Priority 3: Fallback to SVG icon if both images fail
          const target = e.target as HTMLElement;
          target.style.display = 'none';
      }}
    />
  );
}