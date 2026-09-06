"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "../lib/analytics";

type Props = Record<string, string | number | boolean | null | undefined>;

/** An <a> that sends one PostHog event when clicked. */
export function TrackedAnchor({
  event,
  props,
  onClick,
  ...rest
}: ComponentProps<"a"> & { event: string; props?: Props }) {
  return (
    <a
      {...rest}
      onClick={(e) => {
        track(event, props);
        onClick?.(e);
      }}
    />
  );
}

/** A next/link that sends one PostHog event when clicked. */
export function TrackedLink({
  event,
  props,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { event: string; props?: Props }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, props);
        onClick?.(e);
      }}
    />
  );
}
