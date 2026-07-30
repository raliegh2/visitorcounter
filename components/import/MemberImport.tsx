"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { importMembersAction } from "@/app/(protected)/import/actions";

type ImportRow = { firstName: string; lastName: string; email: string; phone: string; address: string; membershipStatus: "active" | "inactive" | "prospective"; lastContactAt: string };

const aliases: Record<keyof ImportRow, string[]> = {
  firstName: ["first name", "firstname", "given name"],
  lastName: ["last name", "lastname", "surname", "family name"],
  email: ["email", "email address"],
  phone: ["phone", "phone number", "mobile"],
  address: ["address", "street address"],
  membershipStatus: ["membership status", "status", "member status"],
  lastContactAt: ["last contact", "last contact date", "last visited", "last visit"]
};

function normalizeHeader(value: string): string { return value.trim().toLowerCase().replaceAll("_", " ").replace(/\s+/g, " "); }
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let value = ""; let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted && char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (!quoted && char === ",") { row.push(value); value = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) { if (char === "\r" && text[i + 1] === "\n") i += 1; row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); row = []; value = ""; }
    else value += char;
  }
  row.push(value); if (row.some((cell) => cell.trim())) rows.push(row); return rows;
}

function findEocd(view: DataView): number {
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i -= 1) if (view.getUint32(i, true) === 0x06054b50) return i;
  throw new Error("This Excel file is not a valid XLSX archive.");
}

async function unzipEntries(buffer: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const view = new DataView(buffer); const eocd = findEocd(view); const total = view.getUint16(eocd + 10, true); let offset = view.getUint32(eocd + 16, true); const decoder = new TextDecoder(); const entries = new Map<string, Uint8Array>();
  for (let index = 0; index < total; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error("The XLSX directory is damaged.");
    const method = view.getUint16(offset + 10, true); const compressedSize = view.getUint32(offset + 20, true); const nameLength = view.getUint16(offset + 28, true); const extraLength = view.getUint16(offset + 30, true); const commentLength = view.getUint16(offset + 32, true); const localOffset = view.getUint32(offset + 42, true); const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    const localNameLength = view.getUint16(localOffset + 26, true); const localExtraLength = view.getUint16(localOffset + 28, true); const dataOffset = localOffset + 30 + localNameLength + localExtraLength; const compressed = new Uint8Array(buffer, dataOffset, compressedSize);
    let bytes: Uint8Array;
    if (method === 0) bytes = new Uint8Array(compressed);
    else if (method === 8) {
      const copy = compressed.slice(); const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw")); bytes = new Uint8Array(await new Response(stream).arrayBuffer());
    } else throw new Error(`Unsupported XLSX compression method ${method}.`);
    entries.set(name, bytes); offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

function columnNumber(reference: string): number { let result = 0; for (const char of reference.match(/[A-Z]+/i)?.[0] ?? "") result = result * 26 + char.toUpperCase().charCodeAt(0) - 64; return result - 1; }
function xmlText(bytes: Uint8Array): Document { const xml = new TextDecoder().decode(bytes); const document = new DOMParser().parseFromString(xml, "application/xml"); if (document.querySelector("parsererror")) throw new Error("The XLSX worksheet could not be read."); return document; }

async function parseXlsx(buffer: ArrayBuffer): Promise<string[][]> {
  const entries = await unzipEntries(buffer); const sharedEntry = entries.get("xl/sharedStrings.xml"); const shared = sharedEntry ? Array.from(xmlText(sharedEntry).getElementsByTagName("si")).map((node) => node.textContent ?? "") : [];
  const sheetName = Array.from(entries.keys()).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name)).sort()[0]; if (!sheetName) throw new Error("No worksheet was found in the XLSX file.");
  const sheet = xmlText(entries.get(sheetName)!); const output: string[][] = [];
  for (const rowNode of Array.from(sheet.getElementsByTagName("row"))) {
    const row: string[] = [];
    for (const cell of Array.from(rowNode.getElementsByTagName("c"))) {
      const index = columnNumber(cell.getAttribute("r") ?? "A1"); const type = cell.getAttribute("t"); const raw = cell.getElementsByTagName("v")[0]?.textContent ?? cell.getElementsByTagName("is")[0]?.textContent ?? ""; row[index] = type === "s" ? shared[Number(raw)] ?? "" : raw;
    }
    output.push(row.map((value) => value ?? ""));
  }
  return output;
}

function excelDate(value: string): string {
  const numeric = Number(value); if (!Number.isFinite(numeric) || numeric < 20000 || numeric > 80000) return value.trim();
  const date = new Date(Date.UTC(1899, 11, 30) + numeric * 86400000); return date.toISOString().slice(0, 10);
}

function toImportRows(matrix: string[][]): ImportRow[] {
  if (matrix.length < 2) throw new Error("The file must contain a header row and at least one member row.");
  const headers = matrix[0].map(normalizeHeader); const index = {} as Record<keyof ImportRow, number>;
  for (const key of Object.keys(aliases) as Array<keyof ImportRow>) index[key] = headers.findIndex((header) => aliases[key].includes(header));
  if (index.firstName < 0 || index.lastName < 0) throw new Error('Required columns: "First Name" and "Last Name".');
  return matrix.slice(1).filter((row) => row.some((cell) => cell?.trim())).slice(0, 500).map((row, rowIndex) => {
    const value = (key: keyof ImportRow) => index[key] >= 0 ? String(row[index[key]] ?? "").trim() : "";
    const statusValue = value("membershipStatus").toLowerCase(); const membershipStatus = statusValue === "inactive" || statusValue === "prospective" ? statusValue : "active";
    const firstName = value("firstName"); const lastName = value("lastName"); if (!firstName || !lastName) throw new Error(`Row ${rowIndex + 2} is missing a first or last name.`);
    return { firstName, lastName, email: value("email"), phone: value("phone"), address: value("address"), membershipStatus, lastContactAt: excelDate(value("lastContactAt")) };
  });
}

export function MemberImport() {
  const [rows, setRows] = useState<ImportRow[]>([]); const [error, setError] = useState(""); const [fileName, setFileName] = useState("");
  async function chooseFile(file: File | undefined) {
    setRows([]); setError(""); setFileName(file?.name ?? ""); if (!file) return; if (file.size > 2_000_000) { setError("The import file must be 2 MB or smaller."); return; }
    try { const matrix = file.name.toLowerCase().endsWith(".xlsx") ? await parseXlsx(await file.arrayBuffer()) : parseCsv(await file.text()); const parsed = toImportRows(matrix); if (!parsed.length) throw new Error("No member rows were found."); setRows(parsed); } catch (cause) { setError(cause instanceof Error ? cause.message : "The file could not be read."); }
  }
  return <div className="stack"><div className="field"><label htmlFor="memberFile">Excel or CSV file</label><input id="memberFile" type="file" accept=".xlsx,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => void chooseFile(event.target.files?.[0])} /></div>{error ? <div className="notice notice-error">{error}</div> : null}{rows.length ? <><div className="notice notice-success">Ready to import {rows.length} members from {fileName}.</div><div className="table-wrap import-preview"><table><thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Last contact</th></tr></thead><tbody>{rows.slice(0, 20).map((row, index) => <tr key={`${row.firstName}-${row.lastName}-${index}`}><td>{row.firstName} {row.lastName}</td><td>{row.email || "—"}</td><td>{row.phone || "—"}</td><td>{row.membershipStatus}</td><td>{row.lastContactAt || "—"}</td></tr>)}</tbody></table></div>{rows.length > 20 ? <p className="muted small">Showing the first 20 of {rows.length} rows.</p> : null}<form action={importMembersAction}><input type="hidden" name="rowsJson" value={JSON.stringify(rows)} /><SubmitButton className="button button-primary button-full" pendingLabel="Importing…">Import {rows.length} members</SubmitButton></form></> : null}</div>;
}
