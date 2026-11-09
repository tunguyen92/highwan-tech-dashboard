import Decimal from "decimal.js";

import type { VoucherRemarkUnit } from "@/lib/wms/constants";
import { formatQty } from "@/lib/wms/format";
import type { ItemDTO } from "@/lib/wms/types";

export type VoucherDocumentLine = {
  key: number;
  itemId: string | null;
  quantity: string;
  normQuantity?: string;
  remarkQuantity: string;
  remarkUnit: VoucherRemarkUnit;
  note: string;
};

type PaperLine = {
  item: ItemDTO | undefined;
  quantity: string;
  remarkQuantity: string;
  remarkUnit: VoucherRemarkUnit;
  note: string;
};

export function formatVoucherRemark(line: Pick<VoucherDocumentLine, "remarkQuantity" | "remarkUnit" | "note">) {
  return line.remarkQuantity ? `${formatQty(line.remarkQuantity)} ${line.remarkUnit}` : line.note;
}

export function VoucherPaper({
  direction,
  documentNumber,
  date,
  lines,
  previewZoom,
}: {
  direction: "IN" | "OUT";
  documentNumber: string;
  date: string;
  lines: PaperLine[];
  previewZoom?: number;
}) {
  const units = [...new Set(lines.map((line) => line.item?.unit).filter((unit): unit is string => Boolean(unit)))];
  const unitLabel = units.length === 1 ? units[0] : "PCS/MET";
  const total =
    units.length > 1
      ? ""
      : lines
          .reduce((sum, line) => {
            if (!/^\d+(\.\d*)?$/.test(line.quantity)) return sum;
            return sum.plus(line.quantity);
          }, new Decimal(0))
          .toString();
  const dateLabel = formatVoucherDate(date);

  return (
    <article
      data-print-paper
      style={previewZoom ? { zoom: previewZoom } : undefined}
      className="voucher-paper mx-auto flex min-h-[560px] w-full min-w-[700px] flex-col bg-white p-[1.5cm] text-black"
    >
      <header className="mb-4 text-center">
        <h2 className="text-xl font-bold tracking-wide">{direction === "OUT" ? "DELIVERY NOTE" : "GOODS RECEIPT"}</h2>
        <p className="mt-2 text-sm">Số: {documentNumber}</p>
      </header>

      {direction === "OUT" ? (
        <table className="mb-4 w-full table-fixed border-collapse text-left text-xs leading-relaxed">
          <tbody>
            <tr>
              <th className="w-[26%] border border-black p-1.5">Bộ phận sản xuất</th>
              <th colSpan={2} className="border border-black p-1.5">
                CÔNG TY TNHH HIGHWAN TECH VIETNAM
              </th>
            </tr>
            <tr>
              <th className="border border-black p-1.5">Địa chỉ nhận hàng /ATTN</th>
              <td className="w-[55%] border border-black p-1.5">
                Company: DK SUNGSHIN
                <br />
                Add: No 04, Nhon Trach 3 IZ, Hiep Phuoc town, Nhon Trach District, Dong Nai Prov.
              </td>
              <td className="w-[19%] border border-black p-1.5">
                Tel: Ms. Giang
                <br />
                0933935878
              </td>
            </tr>
            <tr>
              <th className="border border-black p-1.5">Lý do xuất kho:</th>
              <td colSpan={2} className="border border-black p-1.5 text-center">
                Giao hàng gia công
              </td>
            </tr>
          </tbody>
        </table>
      ) : (
        <table className="mb-4 w-full table-fixed border-collapse text-left text-xs leading-relaxed">
          <tbody>
            <tr>
              <th className="w-[26%] border border-black p-1.5">Đơn vị nhận hàng</th>
              <th className="border border-black p-1.5">CÔNG TY TNHH HIGHWAN TECH VIETNAM</th>
            </tr>
            <tr>
              <th className="border border-black p-1.5">Đơn vị giao hàng</th>
              <td className="border border-black p-1.5">
                ............................................................
              </td>
            </tr>
            <tr>
              <th className="border border-black p-1.5">Lý do nhập kho:</th>
              <td className="border border-black p-1.5">Nhập hàng</td>
            </tr>
          </tbody>
        </table>
      )}

      <table className="w-full table-fixed border-collapse text-center text-xs">
        <thead>
          {direction === "OUT" ? (
            <>
              <tr className="font-bold">
                <th rowSpan={2} className="w-[7%] border border-black p-2">
                  No.
                </th>
                <th rowSpan={2} className="w-[18%] border border-black p-2">
                  CODE
                </th>
                <th rowSpan={2} className="w-[32%] border border-black p-2">
                  PART NAME
                </th>
                <th className="w-[23%] border border-black p-2">QUANTITY</th>
                <th rowSpan={2} className="w-[20%] border border-black p-2">
                  REMARK
                  <br />
                  (BOX / BAG)
                </th>
              </tr>
              <tr className="font-bold">
                <th className="border border-black p-1.5">{unitLabel}</th>
              </tr>
            </>
          ) : (
            <tr className="font-bold">
              <th className="w-[7%] border border-black p-2">No.</th>
              <th className="w-[18%] border border-black p-2">CODE</th>
              <th className="w-[30%] border border-black p-2">ITEM NAME</th>
              <th className="w-[18%] border border-black p-2">QUANTITY</th>
              <th className="w-[10%] border border-black p-2">UNIT</th>
              <th className="w-[17%] border border-black p-2">REMARK</th>
            </tr>
          )}
        </thead>
        <tbody>
          {lines.map((line, index) => (
            <tr key={`${line.item?._id ?? "empty"}-${index}`}>
              <td className="border border-black p-2">{index + 1}</td>
              <td className="border border-black p-2">{line.item?.code}</td>
              <td className="border border-black p-2">{line.item?.name}</td>
              <td className="border border-black p-2 text-right">
                {formatQty(line.quantity)}
                {direction === "OUT" && units.length > 1 && line.item?.unit ? ` ${line.item.unit}` : ""}
              </td>
              {direction === "IN" ? <td className="border border-black p-2">{line.item?.unit}</td> : null}
              <td className="border border-black p-2">{formatVoucherRemark(line)}</td>
            </tr>
          ))}
          <tr className="font-bold">
            {direction === "OUT" ? (
              <>
                <td colSpan={2} className="border border-black p-2">
                  TOTAL
                </td>
                <td className="border border-black p-2" />
                <td className="border border-black p-2 text-right">{formatQty(total)}</td>
                <td className="border border-black p-2" />
              </>
            ) : (
              <>
                <td colSpan={3} className="border border-black p-2">
                  TOTAL
                </td>
                <td className="border border-black p-2 text-right">{formatQty(total)}</td>
                <td colSpan={2} className="border border-black p-2" />
              </>
            )}
          </tr>
        </tbody>
      </table>

      <p className="mt-4 text-right text-xs">{dateLabel}</p>
      <footer className="mt-2 grid min-h-28 grid-cols-4 gap-3 text-center text-xs leading-relaxed">
        <p>
          Người lập phiếu
          <br />
          (Prepared by)
        </p>
        <p>
          Thủ kho
          <br />
          (Store keeper)
        </p>
        <p>
          {direction === "OUT" ? "Quản lý sản xuất" : "Người giao hàng"}
          <br />
          {direction === "OUT" ? "(Production Manager)" : "(Delivered by)"}
        </p>
        <p>
          Người nhận
          <br />
          (Receiver)
        </p>
      </footer>
    </article>
  );
}

function formatVoucherDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return "";
  return `Ngày ${day} Tháng ${month} Năm ${year}`;
}
