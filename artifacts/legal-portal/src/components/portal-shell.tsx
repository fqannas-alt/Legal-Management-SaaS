import {
  Activity,
  Archive,
  Bell,
  BookOpen,
  Building2,
  ChevronLeft,
  CircleHelp,
  ClipboardCheck,
  FileBarChart,
  FileClock,
  FileText,
  Gavel,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  Menu,
  PanelRightClose,
  Search,
  Settings,
  ShieldCheck,
  UsersRound,
  X,
} from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

const primaryNav: NavItem[] = [
  { href: '/', label: 'نظرة عامة', icon: LayoutDashboard },
  { href: '/requests', label: 'الطلبات', icon: ListChecks },
  { href: '/matters', label: 'المسائل القانونية', icon: FileText },
  { href: '/litigation', label: 'التقاضي', icon: Gavel },
  { href: '/sub-clients', label: 'العملاء الفرعيون', icon: Building2 },
  { href: '/parties', label: 'الأطراف', icon: UsersRound },
  { href: '/documents', label: 'المستندات', icon: Archive },
  { href: '/reminders', label: 'التذكيرات', icon: Bell },
  { href: '/reports', label: 'التقارير', icon: FileBarChart },
];

const adminNav: NavItem[] = [
  { href: '/clients', label: 'المنظمات العميلة', icon: Building2 },
  { href: '/users', label: 'المستخدمون', icon: UsersRound },
  { href: '/audit', label: 'سجل التدقيق', icon: FileClock },
  { href: '/settings', label: 'الإعدادات', icon: Settings },
];

export function PortalShell({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => href === '/' ? location === '/' : location.startsWith(href);

  return (
    <div className="portal-shell" dir="rtl">
      <button
        type="button"
        aria-label="فتح القائمة"
        data-testid="button-open-navigation"
        onClick={() => setMobileOpen(true)}
        className="fixed right-4 top-4 z-30 flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-lg md:hidden"
      >
        <Menu size={19} />
      </button>
      {mobileOpen && (
        <button
          type="button"
          aria-label="إغلاق القائمة"
          data-testid="button-close-navigation-overlay"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-40 bg-[#172139]/45 md:hidden"
        />
      )}
      <aside className={`fixed inset-y-0 right-0 z-50 flex w-[278px] flex-col border-l border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 md:translate-x-0 ${mobileOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex h-[82px] items-center justify-between border-b border-sidebar-border px-6">
          <Link href="/" onClick={() => setMobileOpen(false)} data-testid="link-brand" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_20px_rgba(197,138,69,.2)]">
              <ShieldCheck size={21} strokeWidth={2.2} />
            </span>
            <span>
              <span className="block text-[18px] font-bold tracking-[-.04em]">مرسى</span>
              <span className="mt-0.5 block text-[10px] font-medium tracking-[.16em] text-sidebar-foreground/55">LEGAL OPERATIONS</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            data-testid="button-close-navigation"
            className="rounded-md p-2 text-sidebar-foreground/50 hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
          >
            <X size={17} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.17em] text-sidebar-foreground/40">مساحة العمل</p>
          <nav className="space-y-1" aria-label="التنقل الرئيسي">
            {primaryNav.map((item) => <SidebarItem key={item.href} item={item} active={isActive(item.href)} onNavigate={() => setMobileOpen(false)} />)}
          </nav>
          <div className="my-6 h-px bg-sidebar-border" />
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[.17em] text-sidebar-foreground/40">الإدارة والحوكمة</p>
          <nav className="space-y-1" aria-label="إدارة النظام">
            {adminNav.map((item) => <SidebarItem key={item.href} item={item} active={isActive(item.href)} onNavigate={() => setMobileOpen(false)} />)}
          </nav>
        </div>
        <div className="border-t border-sidebar-border p-4">
          <div className="rounded-xl border border-sidebar-border bg-sidebar-accent/50 p-3">
            <div className="flex items-start gap-2.5">
              <LifeBuoy size={16} className="mt-0.5 text-sidebar-primary" />
              <div>
                <p className="text-xs font-semibold">تحتاج إلى مساعدة؟</p>
                <p className="mt-1 text-[11px] leading-5 text-sidebar-foreground/55">فريق الدعم متاح لمراجعة إعدادات مساحة العمل.</p>
                <button type="button" data-testid="button-contact-support" className="mt-2 text-[11px] font-semibold text-sidebar-primary hover:underline">تواصل مع الدعم</button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2.5 px-1">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#d4a56c] text-xs font-bold text-[#25304b]">ع</div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">عبدالله العتيبي</p>
              <p className="truncate text-[10px] text-sidebar-foreground/50">مدير النظام</p>
            </div>
            <button type="button" aria-label="خيارات الحساب" data-testid="button-account-options" className="text-sidebar-foreground/45 hover:text-sidebar-foreground"><PanelRightClose size={16} /></button>
          </div>
        </div>
      </aside>

      <div className="portal-main min-h-[100dvh] md:mr-[278px]">
        <header className="sticky top-0 z-20 flex h-[82px] items-center justify-between border-b border-border/80 bg-background/92 px-5 backdrop-blur-md md:px-9">
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 text-muted-foreground md:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3f897f]" />
              <span className="text-xs">مساحة عمل الرياض</span>
              <ChevronLeft size={14} className="text-muted-foreground/55" />
              <span className="text-xs font-medium text-foreground">{getPageName(location)}</span>
            </div>
            <div className="md:hidden">
              <p className="text-[10px] font-semibold tracking-[.16em] text-muted-foreground">مرسى / WORKSPACE</p>
              <p className="mt-0.5 text-sm font-bold">{getPageName(location)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <button type="button" aria-label="بحث شامل" data-testid="button-global-search" className="hidden h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs text-muted-foreground transition hover:border-primary/30 hover:text-foreground sm:flex">
              <Search size={15} />
              <span>بحث شامل</span>
              <kbd className="mr-2 rounded border border-border bg-muted px-1.5 py-0.5 font-mono-ui text-[9px]">⌘ K</kbd>
            </button>
            <button type="button" aria-label="الإشعارات" data-testid="button-notifications" className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary">
              <Bell size={16} />
              <span className="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-accent ring-2 ring-card" />
            </button>
            <div className="hidden h-7 w-px bg-border sm:block" />
            <span className="hidden text-xs font-medium text-muted-foreground lg:block">آخر مزامنة منذ دقيقتين</span>
          </div>
        </header>
        <main className="px-5 py-7 md:px-9 md:py-9">{children}</main>
      </div>
    </div>
  );
}

function SidebarItem({ item, active, onNavigate }: { item: NavItem; active: boolean; onNavigate: () => void }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-testid={`link-nav-${item.href === '/' ? 'dashboard' : item.href.slice(1)}`}
      className={`sidebar-link group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium ${active ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-[0_8px_18px_rgba(197,138,69,.12)]' : 'text-sidebar-foreground/68 hover:bg-sidebar-accent hover:text-sidebar-foreground'}`}
    >
      <Icon size={17} strokeWidth={active ? 2.15 : 1.8} />
      <span>{item.label}</span>
      {item.href === '/requests' && <span className={`mr-auto rounded-full px-1.5 py-0.5 text-[10px] font-bold ${active ? 'bg-sidebar-primary-foreground/15' : 'bg-sidebar-primary/15 text-sidebar-primary'}`}>6</span>}
    </Link>
  );
}

function getPageName(location: string) {
  const item = [...primaryNav, ...adminNav].find((entry) => entry.href !== '/' && location.startsWith(entry.href));
  return item?.label ?? 'نظرة عامة';
}