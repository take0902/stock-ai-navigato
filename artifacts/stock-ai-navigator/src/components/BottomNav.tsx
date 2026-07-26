import { useLocation, Link } from 'wouter';

export function BottomNav() {
  const [location] = useLocation();

  const navItems = [
    { path: '/', label: 'ホーム', icon: '⌂', testid: 'nav-home' },
    { path: '/stock', label: '株式', icon: '株', testid: 'nav-stock' },
    { path: '/screener', label: 'スクリーナー', icon: '⊞', testid: 'nav-screener' },
    { path: '/favorites', label: 'お気に入り', icon: '★', testid: 'nav-favorites' },
    { path: '/portfolio', label: '資産', icon: '¥', testid: 'nav-portfolio' },
  ];

  return (
    <nav className="bottomNav">
      {navItems.map(item => {
        // Active logic: if we are at '/', and search isn't active etc.
        // Simplified based on path since we don't have separate search page anymore
        const isActive = location === item.path || (item.path === '/stock' && location === '/stock');
        
        return (
          <Link 
            key={item.path} 
            href={item.path} 
            className={isActive ? 'active' : ''} 
            data-testid={item.testid}
          >
            <div className="flex flex-col items-center">
              <span>{item.icon}</span>
              {item.label}
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
