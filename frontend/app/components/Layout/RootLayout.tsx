import { Link } from "@remix-run/react";

interface RootLayoutProps {
  children: React.ReactNode;
}

export function RootLayout({ children }: RootLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link 
            to="/"
            className="text-xl font-semibold hover:text-primary transition-colors"
          >
            Interview Platform
          </Link>
        </div>
      </header>

      <main className="min-h-[calc(100vh-4rem-8rem)]">
        {children}
      </main>

      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Interview Platform. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}