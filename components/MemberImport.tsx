"use client";

import { useState } from "react";
import { importMembersAction } from "@/app/(protected)/import/actions";

type ImportRow = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string;
  ministry: string;
  joined_date: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text.charAt(index);
    const next = text.charAt(index + 1);

    if (character === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(field.trim());
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && next === "\n") index += 1;
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replaceAll(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function mapRows(table: string[][]): ImportRow[] {
  const headerRow = table[0];
  if (!headerRow || table.length < 2) return [];

  const headers = headerRow.map(normalizeHeader);
  const aliases: Record<keyof ImportRow, string[]> = {
    first_name: ["first_name", "firstname", "first"],
    last_name: ["last_name", "lastname", "last", "surname"],
    email: ["email", "email_address"],
    phone: ["phone", "phone_number", "telephone"],
    address: ["address", "street_address"],
    ministry: ["ministry", "department"],
    joined_date: ["joined_date", "date_joined", "join_date"]
  };

  const column = (key: keyof ImportRow): number => headers.findIndex((header) => aliases[key].includes(header));
  const indexes = {
    first_name: column("first_name"),
    last_name: column("last_name"),
    email: column("email"),
    phone: column("phone"),
    address: column("address"),
    ministry: column("ministry"),
    joined_date: column("joined_date")
  };

  if (indexes.first_name < 0 || indexes.last_name < 0) return [];
  const value = (cells: string[], index: number): string => index >= 0 ? (cells[index] ?? "").trim() : "";

  return table
    .slice(1, 501)
    .map((cells) => ({
      first_name: value(cells, indexes.first_name),
      last_name: value(cells, indexes.last_name),
      email: value(cells, indexes.email),
      phone: value(cells, indexes.phone),
      address: value(cells, indexes.address),
      ministry: value(cells, indexes.ministry),
      joined_date: value(cells, indexes.joined_date)
    }))
    .filter((item) => item.first_name !== "" || item.last_name !== "");
}

export function MemberImport() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [message, setMessage] = useState("");

  async function choose(file: File) {
    if (file.size > 2_000_000) {
      setRows([]);
      setMessage("The CSV file must be 2 MB or smaller.");
      return;
    }

    const mapped = mapRows(parseCsv(await file.text()));
    if (mapped.length === 0) {
      setRows([]);
      setMessage("No valid rows were found. Include First Name and Last Name columns.");
      return;
    }

    setRows(mapped);
    setMessage(`${mapped.length} member rows are ready for review.`);
  }

  return (
    <section className="card import-card">
      <div className="metric-symbol" style={{ margin: "0 auto" }} aria-hidden="true">⇩</div>
      <h2>Import member database</h2>
      <p className="muted">
        Upload a CSV exported from Excel or Google Sheets. Supported columns are First Name, Last Name, Email, Phone, Address, Ministry and Date Joined.
      </p>

      <label className="import-drop">
        <strong>Choose CSV file</strong>
        <span className="muted small">Maximum 500 rows and 2 MB per import.</span>
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void choose(file);
          }}
        />
      </label>

      {message ? <div className={`notice ${rows.length > 0 ? "notice-info" : "notice-error"}`}>{message}</div> : null}

      {rows.length > 0 ? (
        <form action={importMembersAction} className="import-preview">
          <input type="hidden" name="rowsJson" value={JSON.stringify(rows)} />
          <div className="import-summary">
            <strong>{rows.length} rows ready</strong>
            <button type="button" className="button button-secondary button-small" onClick={() => { setRows([]); setMessage(""); }}>Clear</button>
          </div>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Ministry</th><th>Joined</th></tr></thead>
              <tbody>
                {rows.slice(0, 15).map((row, index) => (
                  <tr key={`${row.first_name}-${row.last_name}-${index}`}>
                    <td>{row.first_name} {row.last_name}</td>
                    <td>{row.email || "—"}</td>
                    <td>{row.phone || "—"}</td>
                    <td>{row.ministry || "—"}</td>
                    <td>{row.joined_date || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {rows.length > 15 ? <p className="muted small">Previewing the first 15 rows.</p> : null}
          <button className="button button-primary button-full" type="submit">Import {rows.length} members</button>
        </form>
      ) : null}
    </section>
  );
}
