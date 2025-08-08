import { NavLink } from "react-router-dom";
import { Home, Package, Calendar, Book, ShoppingCart } from "lucide-react";

const Item = ({to, icon:Icon, label}) => (
  <NavLink
    to={to}
    className="flex flex-col items-center gap-1 px-3 pt-2 pb-1 text-xs"
    style={({isActive}) => ({ opacity: isActive ? 1 : 0.6 })}
  >
    <Icon size={22} />
    <span>{label}</span>
  </NavLink>
);

export default function BottomNav(){
  return (
    <nav className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur border-t z-50">
      <div className="mx-auto max-w-screen-sm grid grid-cols-5 h-16">
        <Item to="/"           icon={Home}           label="Home" />
        <Item to="/inventory"  icon={Package}        label="Inventory" />
        <Item to="/planner"    icon={Calendar}       label="Planner" />
        <Item to="/recipes"    icon={Book}           label="Recipes" />
        <Item to="/shopping"   icon={ShoppingCart}   label="Shop" />
      </div>
    </nav>
  );
}
