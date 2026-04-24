import { ReactNode } from "react";
import Header from "@/components/Header";
import BottomNav from "@/components/BottomNav";

interface LayoutProps {
  children: ReactNode;
  showHeader?: boolean;
}

const Layout = ({ children, showHeader = true }: LayoutProps) => {
  return (
    <div className="min-h-screen gradient-hero">
      {showHeader && <Header />}
      <main className="container mx-auto px-4 py-6 pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default Layout;
