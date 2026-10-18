"use client";

import React from "react";
import { CategoryChartData, GSASDashboardChartData } from "@/lib/types";

interface Props {
  data?: GSASDashboardChartData | null;
  loading?: boolean;
}

function RatingBarCard({
  categoryData,
  loading,
}: {
  categoryData?: CategoryChartData;
  loading?: boolean;
}) {

  if (loading || !categoryData) {
    return (
      <div className="card border rounded-4 shadow-sm h-100 p-4 bg-white">
        <div className="text-center mb-3">
          <span className="placeholder col-6 rounded py-2 mb-2 d-inline-block"></span>
          <span className="placeholder col-3 rounded py-3 d-block mx-auto"></span>
        </div>
        <div className="py-5 text-center">
          <span className="spinner-border spinner-border-sm text-secondary" />
        </div>
      </div>
    );
  }

  const { title, ratingLabel, total, items, maxScale, scaleSteps, color } = categoryData;

  const chartHeight = 220;
  const chartWidth  = 320;
  const padLeft     = 32;
  const padRight    = 10;
  const padTop      = 20;
  const padBottom   = 28;
  const plotWidth   = chartWidth - padLeft - padRight;
  const plotHeight  = chartHeight - padTop - padBottom;

  const barCount  = items.length;

  const barWidth  = Math.min(32, Math.max(16, (plotWidth / barCount) * 0.72));
  const slotWidth = plotWidth / barCount;

  return (
    <div className="card border rounded-4 shadow-sm h-100 p-4 bg-white d-flex flex-column">

      <div className="text-center mb-3">
        <div className="fw-bold text-dark text-uppercase tracking-wider" style={{ fontSize: "14px", letterSpacing: "0.5px" }}>
          {title}
        </div>

        <div className="fw-bolder text-dark" style={{ fontSize: "28px", lineHeight: "1.2" }}>
          {total.toLocaleString()}
        </div>
      </div>

      <div className="mb-4">
        <div
          className="d-flex justify-content-between align-items-center text-muted fw-bold pb-2 border-bottom"
          style={{ fontSize: "11px", letterSpacing: "0.5px" }}
        >
          <span>{ratingLabel}</span>
          <span>CERTIFIED PROJECTS</span>
        </div>
        <div className="table-responsive">
          <table className="table table-borderless table-sm mb-0 align-middle">
            <tbody>
              {items.map((it) => (
                <tr key={it.label} className="border-bottom" style={{ borderColor: "#f1f3f5" }}>
                  <td className="py-2 ps-0" style={{ fontSize: "12px" }}>

                    <span
                      className="d-inline-block rounded-circle me-2"
                      style={{ width: "8px", height: "8px", backgroundColor: color, verticalAlign: "middle" }}
                    ></span>
                    <span className="fw-semibold text-dark text-uppercase">{it.label}</span>
                  </td>
                  <td className="py-2 pe-0 text-end fw-bold text-dark" style={{ fontSize: "12px" }}>
                    {it.count}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-auto pt-2">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-100" style={{ overflow: "visible", maxHeight: "240px" }}>

          {}
          {scaleSteps.map((step) => {
            const y = padTop + plotHeight - (step / maxScale) * plotHeight;
            return (
              <g key={step}>
                <line x1={padLeft} y1={y} x2={chartWidth - padRight} y2={y} stroke="#e9ecef" strokeWidth="1" />
                <text x={padLeft - 6} y={y + 3} textAnchor="end" fill="#868e96" fontSize="9" fontFamily="sans-serif">
                  {step}
                </text>
              </g>
            );
          })}

          {}
          {items.map((it, idx) => {
            const barH = (it.count / maxScale) * plotHeight;
            const x    = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
            const y    = padTop + plotHeight - barH;

            return (
              <g key={it.label} className="chart-bar-group">
                {}
                <rect
                  x={x} y={y}
                  width={barWidth}
                  height={Math.max(1, barH)}
                  fill={color} rx="2" ry="2"
                  style={{ transition: "height 0.3s ease, y 0.3s ease" }}
                />

                {}
                <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fill="#212529" fontSize="8.5" fontWeight="bold" fontFamily="sans-serif">
                  {it.count}
                </text>

                {}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - padBottom + 14}
                  textAnchor="middle"
                  fill="#495057"
                  fontSize={items.length > 5 ? "7.5" : "8"}
                  fontWeight="500"
                  fontFamily="sans-serif"
                >
                  {it.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function GSASCertifiedRatingsChart({ data, loading }: Props) {
  return (
    <div className="mb-4">
      {}
      <div className="row g-4 mb-3">
        <div className="col-12 col-lg-4">
          <RatingBarCard categoryData={data?.db} loading={loading} />
        </div>
        <div className="col-12 col-lg-4">
          <RatingBarCard categoryData={data?.cm} loading={loading} />
        </div>
        <div className="col-12 col-lg-4">
          <RatingBarCard categoryData={data?.op} loading={loading} />
        </div>
      </div>

      {}
      <div className="text-center text-muted fst-italic px-3 mt-3" style={{ fontSize: "13px" }}>
        Note: Several plaques and certificates for certified projects from previous years were not collected due to pending of Request Form from the clients.
      </div>
    </div>
  );
}
