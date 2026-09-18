import { Menu } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Container } from '@/components/common/Container'
import { Logo } from '@/components/common/Logo'
import { downloadHref } from '@/constants/site'
import { navLinks } from './navLinks'

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-transparent bg-white/70 backdrop-blur-md supports-[backdrop-filter]:bg-white/55">
      <Container className="flex h-18 items-center justify-between gap-6">
        <div className="flex items-center gap-10">
          <Logo />
          <nav aria-label="Main" className="hidden items-center gap-7 lg:flex">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-[0.95rem] font-medium text-ink transition-colors hover:text-green-deep"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-3 sm:flex">
          <Button asChild variant="outline" size="lg">
            <a href={downloadHref}>Download App</a>
          </Button>
          <Button asChild size="lg">
            <Link to="/login">Login</Link>
          </Button>
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="sm:hidden" aria-label="Open menu">
              <Menu className="size-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[82%] max-w-sm bg-bg p-6">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <Logo />
            <nav aria-label="Mobile" className="mt-8 flex flex-col gap-1">
              {navLinks.map((link) => (
                <SheetClose asChild key={link.href}>
                  <a
                    href={link.href}
                    className="rounded-md px-3 py-3 text-lg font-semibold text-ink hover:bg-mint-pale"
                  >
                    {link.label}
                  </a>
                </SheetClose>
              ))}
            </nav>
            <div className="mt-auto flex flex-col gap-3 pt-8">
              <Button asChild size="xl">
                <Link to="/login">Login</Link>
              </Button>
              <SheetClose asChild>
                <Button asChild variant="outline" size="xl">
                  <a href={downloadHref}>Download App</a>
                </Button>
              </SheetClose>
            </div>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  )
}
