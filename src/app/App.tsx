/**
 * The app root: theme stamping, the ambient i18n bridge, and the view switch.
 *
 * There is no router. This is a demo people click through, and a state-switched
 * view keeps the whole app one bundle with no history to get out of step with
 * the dock's persona segment.
 */

import { useEffect } from "react";

import { DemoDock } from "../components/DemoDock.tsx";
import { Overlays, Toasts } from "../components/Overlays.tsx";
import { ScreenSkeleton } from "../components/Primitives.tsx";
import { MakerShell, ShopperShell } from "../components/Shell.tsx";
import { setAmbient } from "../i18n/ambient.ts";
import { useI18n } from "../i18n/index.tsx";
import { AddOnRouteScreen } from "../screens/AddOnRoute.tsx";
import { AddOnsScreen } from "../screens/AddOns.tsx";
import { BasketScreen, CheckoutScreen, ConfirmScreen } from "../screens/Basket.tsx";
import { BatchScreen, CutListScreen, TodayScreen } from "../screens/Bench.tsx";
import {
  AskScreen,
  CareScreen,
  NotFoundScreen,
  PostageScreen,
  ReorderScreen,
  SearchScreen,
  WrongScreen,
} from "../screens/Extras.tsx";
import { MachinesScreen, MaterialsScreen, StockCountScreen } from "../screens/Materials.tsx";
import {
  CustomersScreen,
  MakerOrderScreen,
  OrdersScreen,
  PostRunScreen,
  ProofsScreen,
} from "../screens/MakerOrder.tsx";
import { AboutScreen, OrderScreen } from "../screens/Order.tsx";
import { PieceScreen, PiecesScreen } from "../screens/Pieces.tsx";
import { ProductScreen, ShopScreen } from "../screens/Shop.tsx";
import { personaFor, useStore } from "../state/store.ts";

export default function App() {
  const { locale, t, money, number } = useI18n();
  const view = useStore((s) => s.view);
  const theme = useStore((s) => s.theme);
  const loading = useStore((s) => s.loading);

  // Keep the pure modules — the store, the seed, both engines — formatting in
  // whatever locale the tree is rendering.
  setAmbient(locale, t, money, number);

  /*
   * `null` means "follow the OS", which is what tokens.css does by default.
   * Stamping the attribute only once a choice exists is what lets the media
   * query work until the visitor overrides it, and the override win after.
   */
  useEffect(() => {
    const root = document.documentElement;
    if (theme === null) root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", theme);
  }, [theme]);

  const persona = personaFor(view);
  const body = loading ? <ScreenSkeleton /> : <Screen />;

  return (
    <div className="br-app">
      {persona === "shopper" ? (
        <ShopperShell>{body}</ShopperShell>
      ) : (
        <MakerShell>{body}</MakerShell>
      )}
      <DemoDock />
      <Overlays />
      <Toasts />
    </div>
  );
}

function Screen() {
  const view = useStore((s) => s.view);

  switch (view) {
    // The shop
    case "shop":
      return <ShopScreen />;
    case "product":
      return <ProductScreen />;
    case "basket":
      return <BasketScreen />;
    case "checkout":
      return <CheckoutScreen />;
    case "confirm":
      return <ConfirmScreen />;
    case "order":
      return <OrderScreen />;
    case "about":
      return <AboutScreen />;
    case "search":
      return <SearchScreen />;
    case "postage":
      return <PostageScreen />;
    case "care":
      return <CareScreen />;
    case "ask":
      return <AskScreen />;
    case "reorder":
      return <ReorderScreen />;
    case "wrong":
      return <WrongScreen />;

    // The bench
    case "today":
      return <TodayScreen />;
    case "batch":
      return <BatchScreen />;
    case "cutlist":
      return <CutListScreen />;
    case "makerorder":
      return <MakerOrderScreen />;
    case "orders":
      return <OrdersScreen />;
    case "proofs":
      return <ProofsScreen />;
    case "post":
      return <PostRunScreen />;
    case "customers":
      return <CustomersScreen />;
    case "pieces":
      return <PiecesScreen />;
    case "makerpiece":
      return <PieceScreen />;
    case "materials":
      return <MaterialsScreen />;
    case "machines":
      return <MachinesScreen />;
    case "stockcount":
      return <StockCountScreen />;
    case "addons":
      return <AddOnsScreen />;
    case "addonroute":
      return <AddOnRouteScreen />;

    default:
      return <NotFoundScreen />;
  }
}
