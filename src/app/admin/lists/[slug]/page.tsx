import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AdminLoading } from "@/components/admin/admin-loading";
import { ListEditor } from "@/components/admin/list-editor";
import { getList } from "@/lib/kinks/data";
import { hasRole } from "@/lib/roles";
import { requirePageRole } from "@/lib/session";

export default function EditListPage({ params }: PageProps<"/admin/lists/[slug]">) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <EditList params={params} />
    </Suspense>
  );
}

async function EditList({ params }: Pick<PageProps<"/admin/lists/[slug]">, "params">) {
  const { slug } = await params;
  const user = await requirePageRole("trusted", `/admin/lists/${slug}`);
  const list = await getList(slug);
  if (!list) notFound();
  return <ListEditor list={list} canDeleteList={hasRole(user.role, "admin")} />;
}
