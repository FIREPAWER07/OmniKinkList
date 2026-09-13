import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { ListEditor } from "@/components/admin/list-editor";
import { getEditorList, getVersions } from "@/lib/admin/queries";
import { hasRole } from "@/lib/roles";
import { requirePageRole } from "@/lib/session";

export default function EditListPage({ params }: PageProps<"/[locale]/admin/lists/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditList params={params} />
    </Suspense>
  );
}

async function EditList({ params }: Pick<PageProps<"/[locale]/admin/lists/[slug]">, "params">) {
  const { slug } = await params;
  const user = await requirePageRole("trusted", `/admin/lists/${slug}`);
  const [data, versions] = await Promise.all([getEditorList(slug), getVersions(slug)]);
  if (!data) notFound();
  return (
    <ListEditor
      key={slug}
      draft={data.draft}
      changes={data.changes}
      neverPublished={versions.length === 0}
      allCategories={data.allCategories}
      canDeleteList={hasRole(user.role, "admin")}
    />
  );
}
