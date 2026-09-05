import { redirect } from "next/navigation";
import { getStock, StockFormPage } from "@/modules/stock";
import { ApiError } from "@/shared/api/api-error";

// 対象の常備食が見つからない場合は一覧へ戻す（他の家族グループが先に削除した等）。
export default async function EditStockPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const stock = await getStock(id);
    return <StockFormPage mode="edit" stock={stock} />;
  } catch (error) {
    if (error instanceof ApiError && error.code === "STOCK_NOT_FOUND") {
      redirect("/");
    }
    throw error;
  }
}
