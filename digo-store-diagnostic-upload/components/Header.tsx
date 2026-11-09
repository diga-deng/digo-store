"use client";
import { Sun, Bookmark, CalendarDays, ShoppingBag, Search, UserRound } from "lucide-react";
import { useCart } from "./CartProvider";
export function Header() {
  const cart = useCart();
  return <><header className="topbar editorial-topbar world-store-header"><a href="/" className="brand" aria-label="DIGO home">DIGO</a>
    <nav className="nav" aria-label="Shopping"><a href="/#/search" className="header-icon" aria-label="Search"><Search size={20}/></a><button className="header-icon bag-button" onClick={() => cart.setOpen(true)} aria-label={`Open bag, ${cart.count} items`}><ShoppingBag size={21}/><span>{cart.count}</span></button><a href="/#/account" className="header-icon" aria-label="Account"><UserRound size={20}/></a></nav>
  </header><nav className="world-store-lanes journey-store-nav digo-stage-nav" aria-label="Main navigation"><a href="/" aria-label="Discover"><Sun/><span>Discover</span></a><a href="/#/wardrobe" aria-label="Wardrobe"><Bookmark/><span>Wardrobe</span></a><a href="/#/plans" aria-label="Plans"><CalendarDays/><span>Plans</span></a></nav></>;
}
