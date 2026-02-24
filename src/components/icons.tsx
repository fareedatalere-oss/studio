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

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M8 12h2" />
      <path d="M10 8v8" />
      <path d="M14 14v-2a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
      <path d="M14 8h-2" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}
