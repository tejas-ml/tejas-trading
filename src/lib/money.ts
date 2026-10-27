import { FEE_RATE } from "./types";

export function feeOn(stakeCents: number): number {
  if (stakeCents <= 0) return 0;
  return Math.max(1, Math.round(stakeCents * FEE_RATE));
}

export function reservationFor(priceCents: number, quantity: number): number {
  const stake = priceCents * quantity;
  return stake + feeOn(stake);
}

export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100);
  const rem = abs % 100;
  return `${sign}$${dollars.toLocaleString("en-US")}.${rem.toString().padStart(2, "0")}`;
}

export function formatCents(priceCents: number): string {
  return `${priceCents}¢`;
}

export function formatProb(priceCents: number): string {
  return `${priceCents}%`;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function randInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

export function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
