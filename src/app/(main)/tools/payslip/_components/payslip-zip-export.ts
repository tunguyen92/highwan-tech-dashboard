import ExcelJS from "exceljs";
import JSZip from "jszip";

export interface PayslipData {
  STT: number;
  "Họ và tên": string;
  "Giới tính": string;
  "Chức vụ": string;
  "Ngày sinh": string;
  "Căn cước/CMND": number;
  SĐT: string;
  "STK SACOMBANK": string;
  "Lương cơ bản": number;
  "Hỗ trợ tiền điện thoại": number;
  "Tăng ca 150%/ OT 150%": number;
  "Tăng ca 200%/ OT 200%": number;
  "Tăng ca 300%/ OT 300%": number;
  "Tăng ca 210%/ OT 210%": number;
  "Tăng ca 270%/ OT 270%": number;
  "Tăng ca 390%/ OT 390%": number;
  "Hỗ trợ xăng xe, nhà ở": number;
  "Tiền cơm trưa": number;
  "Tiền cơm Tăng ca/2 tiếng": number;
  "Tiền cơm Tăng ca/3 tiếng": number;
  "BHXH 8%": number;
  "BHYT 1.5%": number;
  "BHTN 1%": number;
  "Công đoàn": number | null;
  "Thuế TNCN": number;
  "Số ngày làm việc trong tháng": number;
  "Số ngày làm việc thực tế (ngày)": number;
  "Số ngày tăng ca/2 tiếng": number;
  "Số ngày tăng ca/3, 4 tiếng": number;
  "Nghỉ lễ, kết hôn, tang chế": number;
  "Nghỉ ốm, Thai sản": number;
  "Nghỉ không lương": number;
  "Nghỉ phép năm": number;
  "Số ngày cơm trưa": number;
  "Tổng tiền cơm trưa": number;
  "Tổng tiền tăng ca (Normal day 150%)": number;
  "Tổng tiền tăng ca (Sunday 200%)": number;
  "Tổng tiền tăng ca (Holiday 300%)": number;
  "Tổng tiền cơm tăng ca": number;
  "Tiền điện thoại": number;
  "National Holiday Fee": number;
  "Monthly Off Fee": number;
  "Processing Fee": number;
  "Bù lương": number;
  "Thưởng Tết": number;
  "Support 50%": number;
  "Tổng lương CB+PC": number;
  "TỔNG THU NHẬP": number;
  "BẢN THÂN VÀ NGƯỜI PHỤ THUỘC (4.400.000/1 NGƯỜI)": number;
  "THU NHẬP CHỊU THUẾ": number;
  "THU NHẬP TÍNH THUẾ": number;
  "THUẾ TNCN": number;
  "Tổng BHXH": number;
  "Tổng lương thực lãnh": number;
  month: string;
  year: string;
}

const PAYSLIP_COLUMNS = [
  "STT",
  "Họ và tên",
  "Giới tính",
  "Chức vụ",
  "Ngày sinh",
  "Căn cước/CMND",
  "SĐT",
  "STK SACOMBANK",
  "Lương cơ bản",
  "Hỗ trợ tiền điện thoại",
  "Tăng ca 150%/ OT 150%",
  "Tăng ca 200%/ OT 200%",
  "Tăng ca 300%/ OT 300%",
  "Tăng ca 210%/ OT 210%",
  "Tăng ca 270%/ OT 270%",
  "Tăng ca 390%/ OT 390%",
  "Hỗ trợ xăng xe, nhà ở",
  "Tiền cơm trưa",
  "Tiền cơm Tăng ca/2 tiếng",
  "Tiền cơm Tăng ca/3 tiếng",
  "BHXH 8%",
  "BHYT 1.5%",
  "BHTN 1%",
  "Công đoàn",
  "Thuế TNCN",
  "Số ngày làm việc trong tháng",
  "Số ngày làm việc thực tế (ngày)",
  "Số ngày tăng ca/2 tiếng",
  "Số ngày tăng ca/3, 4 tiếng",
  "Nghỉ lễ, kết hôn, tang chế",
  "Nghỉ ốm, Thai sản",
  "Nghỉ không lương",
  "Nghỉ phép năm",
  "Số ngày cơm trưa",
  "Tổng tiền cơm trưa",
  "Tổng tiền tăng ca (Normal day 150%)",
  "Tổng tiền tăng ca (Sunday 200%)",
  "Tổng tiền tăng ca (Holiday 300%)",
  "Tổng tiền cơm tăng ca",
  "Tiền điện thoại",
  "National Holiday Fee",
  "Monthly Off Fee",
  "Processing Fee",
  "Bù lương",
  "Thưởng Tết",
  "Support 50%",
  "Tổng lương CB+PC",
  "TỔNG THU NHẬP",
  "BẢN THÂN VÀ NGƯỜI PHỤ THUỘC (4.400.000/1 NGƯỜI)",
  "THU NHẬP CHỊU THUẾ",
  "THU NHẬP TÍNH THUẾ",
  "THUẾ TNCN",
  "Tổng BHXH",
  "Tổng lương thực lãnh",
  "month",
  "year",
] as const satisfies readonly (keyof PayslipData)[];

const REQUIRED_COLUMNS: readonly (keyof PayslipData)[] = [
  "STT",
  "Họ và tên",
  "Chức vụ",
  "Ngày sinh",
  "Lương cơ bản",
  "Hỗ trợ xăng xe, nhà ở",
  "Số ngày làm việc trong tháng",
  "Số ngày làm việc thực tế (ngày)",
  "Nghỉ lễ, kết hôn, tang chế",
  "Nghỉ phép năm",
  "Nghỉ ốm, Thai sản",
  "Nghỉ không lương",
  "Tăng ca 150%/ OT 150%",
  "Tăng ca 200%/ OT 200%",
  "Tăng ca 300%/ OT 300%",
  "Tăng ca 210%/ OT 210%",
  "Tăng ca 270%/ OT 270%",
  "Tăng ca 390%/ OT 390%",
  "Tiền điện thoại",
  "Tổng tiền cơm trưa",
  "Tổng tiền tăng ca (Normal day 150%)",
  "Tổng tiền tăng ca (Sunday 200%)",
  "Tổng tiền tăng ca (Holiday 300%)",
  "Tổng tiền cơm tăng ca",
  "Monthly Off Fee",
  "National Holiday Fee",
  "Processing Fee",
  "Bù lương",
  "Thưởng Tết",
  "Support 50%",
  "Công đoàn",
  "THUẾ TNCN",
  "Tổng BHXH",
  "Tổng lương thực lãnh",
  "month",
  "year",
];

const TEXT_COLUMNS = new Set<keyof PayslipData>([
  "Họ và tên",
  "Giới tính",
  "Chức vụ",
  "Ngày sinh",
  "SĐT",
  "STK SACOMBANK",
  "month",
  "year",
]);

const SALARY_ROWS: ReadonlyArray<{
  col: string;
  value: keyof PayslipData | ((employee: PayslipData) => number);
}> = [
  { col: "E", value: "Số ngày làm việc trong tháng" },
  { col: "E", value: "Nghỉ lễ, kết hôn, tang chế" },
  { col: "E", value: "Nghỉ phép năm" },
  { col: "E", value: "Nghỉ ốm, Thai sản" },
  { col: "E", value: "Nghỉ không lương" },
  { col: "E", value: "Số ngày làm việc thực tế (ngày)" },
  { col: "E", value: "Tăng ca 150%/ OT 150%" },
  { col: "E", value: "Tăng ca 200%/ OT 200%" },
  { col: "E", value: "Tăng ca 300%/ OT 300%" },
  { col: "E", value: "Tăng ca 210%/ OT 210%" },
  { col: "E", value: "Tăng ca 270%/ OT 270%" },
  { col: "E", value: "Tăng ca 390%/ OT 390%" },
  { col: "E", value: "Lương cơ bản" },
  { col: "E", value: "Hỗ trợ xăng xe, nhà ở" },
  {
    col: "E",
    value: (employee) => {
      const workingDays = employee["Số ngày làm việc trong tháng"];
      if (workingDays === 0) return 0;
      return (
        ((employee["Lương cơ bản"] + employee["Hỗ trợ xăng xe, nhà ở"]) * employee["Số ngày làm việc thực tế (ngày)"]) /
        workingDays
      );
    },
  },
];

const ALLOWANCE_ROWS: ReadonlyArray<{
  col: string;
  value: keyof PayslipData | ((employee: PayslipData) => number);
}> = [
  { col: "E", value: "Tiền điện thoại" },
  { col: "E", value: "Tổng tiền cơm trưa" },
  { col: "E", value: "Tổng tiền tăng ca (Normal day 150%)" },
  { col: "E", value: "Tổng tiền tăng ca (Sunday 200%)" },
  { col: "E", value: "Tổng tiền tăng ca (Holiday 300%)" },
  { col: "E", value: "Tổng tiền cơm tăng ca" },
  { col: "E", value: "Monthly Off Fee" },
  { col: "E", value: "National Holiday Fee" },
  { col: "E", value: "Processing Fee" },
  { col: "E", value: "Bù lương" },
  { col: "E", value: "Thưởng Tết" },
  { col: "E", value: "Support 50%" },
  {
    col: "E",
    value: (employee) =>
      employee["Tiền điện thoại"] +
      employee["Tổng tiền cơm trưa"] +
      employee["Tổng tiền tăng ca (Normal day 150%)"] +
      employee["Tổng tiền tăng ca (Sunday 200%)"] +
      employee["Tổng tiền tăng ca (Holiday 300%)"] +
      employee["Tổng tiền cơm tăng ca"] +
      employee["Monthly Off Fee"] +
      employee["National Holiday Fee"] +
      employee["Processing Fee"] +
      employee["Bù lương"] +
      employee["Thưởng Tết"] +
      employee["Support 50%"],
  },
];

const DEDUCTION_ROWS: ReadonlyArray<{
  col: string;
  value: keyof PayslipData | ((employee: PayslipData) => number);
}> = [
  { col: "E", value: "Tổng BHXH" },
  { col: "E", value: "Công đoàn" },
  { col: "E", value: "THUẾ TNCN" },
  {
    col: "E",
    value: (employee) => employee["Tổng BHXH"] + employee["THUẾ TNCN"],
  },
  { col: "E", value: "Tổng lương thực lãnh" },
];

function getCellValue(value: unknown): unknown {
  if (value === null || value === undefined || value instanceof Date || typeof value !== "object") return value;
  if ("result" in value) return value.result;
  if ("richText" in value && Array.isArray(value.richText)) {
    return value.richText
      .map((part) => (typeof part === "object" && part !== null && "text" in part ? String(part.text) : ""))
      .join("");
  }
  if ("text" in value) return value.text;
  return null;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toLocaleDateString("vi-VN");
  return String(value).trim();
}

function asNumber(value: unknown, column: string, rowNumber: number): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  if (!Number.isFinite(parsed)) {
    throw new Error(`Row ${rowNumber}: "${column}" must contain a number.`);
  }
  return parsed;
}

function isPayslipData(values: Partial<PayslipData>): values is PayslipData {
  return PAYSLIP_COLUMNS.every((column) => {
    const value = values[column];
    if (TEXT_COLUMNS.has(column)) return typeof value === "string";
    return typeof value === "number" || (column === "Công đoàn" && value === null);
  });
}

export async function readPayslipRows(file: ArrayBuffer): Promise<PayslipData[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(file);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("The workbook does not contain a worksheet.");

  const headers = new Map<string, number>();
  worksheet.getRow(1).eachCell((cell, columnNumber) => {
    const header = cell.text.trim();
    if (header) headers.set(header, columnNumber);
  });

  const missingColumns = REQUIRED_COLUMNS.filter((column) => !headers.has(column));
  if (missingColumns.length > 0) {
    throw new Error(`The salary workbook is missing required columns: ${missingColumns.join(", ")}.`);
  }

  const employees: PayslipData[] = [];
  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
    const row = worksheet.getRow(rowNumber);
    const rowHasData = [...headers.values()].some((columnNumber) => {
      const value = getCellValue(row.getCell(columnNumber).value);
      return value !== null && value !== undefined && value !== "";
    });
    if (!rowHasData) continue;

    const values: Partial<PayslipData> = {};
    for (const column of PAYSLIP_COLUMNS) {
      const columnNumber = headers.get(column);
      const value = columnNumber ? getCellValue(row.getCell(columnNumber).value) : null;
      Object.assign(values, {
        [column]: TEXT_COLUMNS.has(column) ? asText(value) : asNumber(value, column, rowNumber),
      });
    }

    if (!isPayslipData(values)) {
      throw new Error(`Row ${rowNumber}: could not read salary data.`);
    }
    const employee = values;
    if (!employee["Họ và tên"]) {
      continue;
    }
    const month = Number(employee.month);
    const year = Number(employee.year);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1) {
      throw new Error(`Row ${rowNumber}: month and year must be valid numbers.`);
    }
    employees.push(employee);
  }

  if (employees.length === 0) throw new Error("No employee rows were found in the salary workbook.");
  return employees;
}

function fillSection(
  worksheet: ExcelJS.Worksheet,
  employee: PayslipData,
  startRow: number,
  rows: ReadonlyArray<{
    col: string;
    value: keyof PayslipData | ((employee: PayslipData) => number);
  }>,
) {
  rows.forEach(({ col, value }, index) => {
    worksheet.getCell(`${col}${startRow + index}`).value =
      typeof value === "function" ? value(employee) : employee[value];
  });
}

async function exportSalarySlip(
  employee: PayslipData,
  template: ArrayBuffer,
): Promise<{ buffer: ArrayBuffer | Uint8Array; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(template.slice(0));

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) throw new Error("Worksheet missing from payslip template.");

  const month = Number(employee.month);
  const year = Number(employee.year);
  const previousMonth = month === 1 ? 12 : month - 1;
  const previousYear = month === 1 ? year - 1 : year;
  const formatMonth = (value: number) => String(value).padStart(2, "0");

  worksheet.getCell("C2").value = `BẢNG LƯƠNG CÁ NHÂN THÁNG ${formatMonth(month)}/${year}`;
  worksheet.getCell("C3").value =
    `Từ 26/${formatMonth(previousMonth)}/${previousYear} đến 25/${formatMonth(month)}/${year}`;
  worksheet.getCell("D4").value = employee["Họ và tên"];
  worksheet.getCell("D5").value = employee["Ngày sinh"];
  worksheet.getCell("D6").value = employee["Chức vụ"];
  worksheet.getCell("D7").value = employee.STT;

  fillSection(worksheet, employee, 10, SALARY_ROWS);
  fillSection(worksheet, employee, 26, ALLOWANCE_ROWS);
  fillSection(worksheet, employee, 40, DEDUCTION_ROWS);
  worksheet.getCell("E50").value = employee["Họ và tên"];

  const buffer = await workbook.xlsx.writeBuffer();
  const safeName = `Phiếu lương ${employee["Họ và tên"]}_${employee.month}-${employee.year}.xlsx`.replace(
    /[\\/:*?"<>|]/g,
    "-",
  );

  return { buffer, fileName: safeName };
}

function uniqueFileName(fileName: string, existing: Set<string>): string {
  const extensionIndex = fileName.lastIndexOf(".");
  const base = extensionIndex > 0 ? fileName.slice(0, extensionIndex) : fileName;
  const extension = extensionIndex > 0 ? fileName.slice(extensionIndex) : "";
  let candidate = fileName;
  let suffix = 2;

  while (existing.has(candidate)) {
    candidate = `${base} (${suffix})${extension}`;
    suffix += 1;
  }

  existing.add(candidate);
  return candidate;
}

export async function createPayslipZip(
  employees: PayslipData[],
  onProgress?: (completed: number, total: number) => void,
): Promise<Blob> {
  if (employees.length === 0) throw new Error("No employee rows were found in the salary workbook.");

  const response = await fetch("/documents/payslip-template.xlsx");
  if (!response.ok) throw new Error("The payslip template could not be loaded.");
  const template = await response.arrayBuffer();
  const zip = new JSZip();
  const fileNames = new Set<string>();

  for (const [index, employee] of employees.entries()) {
    const result = await exportSalarySlip(employee, template);
    zip.file(uniqueFileName(result.fileName, fileNames), result.buffer, {
      binary: true,
    });
    onProgress?.(index + 1, employees.length);
  }

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
}
