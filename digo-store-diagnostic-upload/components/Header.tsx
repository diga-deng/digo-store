"use client";
import { Sun, Grid2X2, Globe2, ShoppingCart, ShoppingBag, Search, UserRound } from "lucide-react";
import { useCart } from "./CartProvider";
export function Header() {
  const cart = useCart();
  return <><header className="topbar editorial-topbar world-store-header"><a href="/" className="brand" aria-label="DIGO home">DIGO</a>
    <nav className="nav" aria-label="Shopping"><a href="/shop" className="header-icon" aria-label="Search pieces"><Search size={20}/></a><button className="header-icon bag-button" onClick={() => cart.setOpen(true)} aria-label={`Open bag, ${cart.count} items`}><ShoppingCart size={21}/><span>{cart.count}</span></button><a href="/#/taste" className="header-icon" aria-label="Profile"><UserRound size={20}/></a></nav>
  </header><nav className="world-store-lanes" aria-label="Your world"><a href="/" aria-label="Discover"><Sun/></a><a href="/#/interests" aria-label="Interested scenes"><Grid2X2/></a><a href="/#/recent" aria-label="Viewed pieces"><ShoppingBag/></a><a href="/#/world" aria-label="My World"><Globe2/></a></nav></>;
}
