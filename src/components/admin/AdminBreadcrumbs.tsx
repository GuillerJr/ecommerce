

'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useState, Fragment } from 'react';
import Link from 'next/link';
import {
  Breadcrumb as BreadcrumbUI,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { getAdminBreadcrumbData } from '@/lib/actions';

type BreadcrumbItemType = {
  label: string;
  href: string;
};

export default function AdminBreadcrumbs() {
  const pathname = usePathname();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItemType[]>([]);

  useEffect(() => {
    if (pathname.startsWith('/admin')) {
      getAdminBreadcrumbData(pathname).then(result => {
        if (result.success && result.breadcrumbs) {
          setBreadcrumbs(result.breadcrumbs);
        }
      });
    }
  }, [pathname]);

  if (breadcrumbs.length === 0) {
    return null;
  }
  
  if (breadcrumbs.length === 1 && breadcrumbs[0].label === 'Admin') {
     return <div className="font-semibold">Dashboard</div>;
  }


  return (
    <BreadcrumbUI>
      <BreadcrumbList>
        {breadcrumbs.map((crumb, index) => (
          <Fragment key={index}>
            <BreadcrumbItem>
              {index === 0 ? (
                 <BreadcrumbPage className="text-sm font-medium text-muted-foreground">{crumb.label}</BreadcrumbPage>
              ) : index < breadcrumbs.length - 1 ? (
                <BreadcrumbLink asChild className="text-sm">
                  <Link href={crumb.href}>{crumb.label}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage className="text-sm font-semibold">{crumb.label}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
            {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </BreadcrumbUI>
  );
}
