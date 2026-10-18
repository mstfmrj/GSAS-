import React from "react";
import { GSAS_LOGO_DATA_URI } from "./gsasLogoDataUri";

interface GordLogoProps {

  size?: number;

  className?: string;
}

export default function GordLogo({ size = 36, className = "" }: GordLogoProps) {
  return (
    <span
      className={`d-inline-flex align-items-center justify-content-center flex-shrink-0 ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <img
        src={GSAS_LOGO_DATA_URI}
        alt="GSAS — Global Sustainability Assessment System"
        width={size}
        height={size}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          display: "block",
        }}
      />
    </span>
  );
}
