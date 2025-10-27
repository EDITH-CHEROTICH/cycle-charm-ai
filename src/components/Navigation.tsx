import { Link, useLocation } from "react-router-dom";
import { Home, Calendar, MessageCircle, User } from "lucide-react";

const Navigation = () => {
  const location = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/calendar", icon: Calendar, label: "Calendar" },
    { path: "/chat", icon: MessageCircle, label: "Chat" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-primary/20 shadow-lg z-50">
      <div className="max-w-md mx-auto flex justify-around items-center h-16">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-primary"
              }`}
            >
              <Icon className={`w-6 h-6 ${isActive ? "scale-110" : ""}`} />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;
