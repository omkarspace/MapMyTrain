"use client";

import React from "react";

interface ComponentProps {
  children: React.ReactNode;
}

export default function AdBlockerWrapper({ children }: ComponentProps) {
  return <>{children}</>;
}
