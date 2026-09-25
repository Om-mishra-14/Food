import SidePanel from "@/components/servd/SidePanel";

// Every signed-in screen: the page on the left, pantry / shopping panel on the right.
const MainLayout = ({ children }) => {
  return (
    <div className="sv-body-row">
      <main className="sv-main">{children}</main>
      <SidePanel />
    </div>
  );
};

export default MainLayout;
