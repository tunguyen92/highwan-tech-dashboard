import { inventory } from "./_components/data";
import { Inventory } from "./_components/inventory";

export default function Page() {
  return <Inventory inventory={inventory} />;
}
