import Link from "next/link";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { VersionList } from "@/components/admin/version-list";
import { getVersions } from "@/lib/admin/queries";
import { requirePageRole } from "@/lib/session";

export default function VersionsPage({ params }: PageProps<"/[locale]/admin/lists/[slug]/versions">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <Versions params={params} />
    </Suspense>
  );
}

async function Versions({ params }: Pick<PageProps<"/[locale]/admin/lists/[slug]/versions">, "params">) {
  const { slug } = await params;
  await requirePageRole("trusted", `/admin/lists/${slug}/versions`);
  const versions = await getVersions(slug);
  return (
    <section>
      <Link href={`/admin/lists/${slug}`} className="text-sm text-muted hover:text-fg">
        Back to editor
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Published versions</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">
        Restoring copies an old version into the draft. Nothing changes for visitors until you publish again.
      </p>
      <VersionList slug={slug} versions={versions.map((v) => ({ ...v, publishedAt: v.publishedAt.toISOString() }))} />
    </section>
  );
}
