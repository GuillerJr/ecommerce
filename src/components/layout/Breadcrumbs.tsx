
'use client';

import { usePathname, useSearchParams } from 'next/navigation';
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
import { getBreadcrumbData } from '@/lib/actions';

type BreadcrumbItemType = {
  label: string;
  href: string;
};

export default function Breadcrumbs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItemType[]>([]);

  useEffect(() => {
    if (pathname) {
      getBreadcrumbData(pathname, searchParams.toString()).then(result => {
        if (result.success && result.breadcrumbs) {
          setBreadcrumbs(result.breadcrumbs);
        }
      });
    }
  }, [pathname, searchParams]);

  if (breadcrumbs.length <= 1 || pathname === '/') {
    return null;
  }

  return (
    <div className="border-b bg-secondary/50">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <BreadcrumbUI>
            <BreadcrumbList>
              {breadcrumbs.map((crumb, index) => (
                <Fragment key={index}>
                  <BreadcrumbItem>
                    {index < breadcrumbs.length - 1 ? (
                      <BreadcrumbLink asChild>
                        <Link href={crumb.href}>{crumb.label}</Link>
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                  {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
                </Fragment>
              ))}
            </BreadcrumbList>
          </BreadcrumbUI>
        </div>
    </div>
  );
}
