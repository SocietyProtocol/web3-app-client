import { fetchBadge } from "@/data/badges/utils";
import { BadgePageLayout } from "./BadgePageLayout";
import { Metadata } from "next";
import { notFound } from "next/navigation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Badge #${id}`,
    description: `View details and manage Badge #${id} on Society Protocol.`,
  };
}

export default async function BadgePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;

  let badgeExists = false;
  try {
    const data = await fetchBadge(id);
    badgeExists = !!data?.badge;
  } catch (error) {
    console.error("Error prefetching badge:", error);
  }

  if (!badgeExists) {
    notFound();
  }

  return (
    <BadgePageLayout id={id} initiallyEditing={edit === "true"} />
  );
}
