import { Sidebar } from "@/components/app/sidebar";
import { BackgroundFX } from "@/components/shared/background-fx";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex">
      <BackgroundFX className="opacity-60" />
      <Sidebar />
      <div className="relative flex-1 min-w-0">{children}</div>
    </div>
  );
}
